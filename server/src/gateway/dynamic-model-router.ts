import { query } from '../db/pool.js';
import { config } from '../config.js';
import { EventEmitterService } from '../services/event-emitter.js';
import {
  type TaskProfile,
  type TaskType,
  type ModelCapability,
  type RoutingDecision,
  type RoutingReasonCode,
  type ModelRoutingRecord,
  type InferenceBillingMode,
} from '../schemas/routing.js';
import type { TaskQuotaDemand } from '../schemas/quota.js';
import { quotaGovernor } from './quota-governor.js';
import {
  MODEL_REGISTRY,
  QUALITY_FLOOR_POLICIES,
  ROUTING_POLICY_VERSION,
  providerHealth,
  inferTaskProfile,
} from './routing-registry.js';
import { providerAdapters } from './providers/provider-registry.js';

export class DynamicModelRouter {
  private static instance: DynamicModelRouter;

  static getInstance(): DynamicModelRouter {
    if (!this.instance) {
      this.instance = new DynamicModelRouter();
    }
    return this.instance;
  }

  /**
   * Evaluates the best route for a given TaskProfile according to policy,
   * quality floors, and predictive quota admission control.
   */
  routeTask(
    taskProfile: TaskProfile,
    options?: {
      overrideMode?: 'static' | 'shadow' | 'active';
      staticModelId?: string;
      engineerModelId?: string;
      previousProvider?: string;
    }
  ): RoutingDecision {
    const billingMode: InferenceBillingMode = config.inferenceBillingMode || 'FREE_ONLY';
    const routingMode = options?.overrideMode || (process.env.ROUTING_MODE as any) || 'active';
    const policy = QUALITY_FLOOR_POLICIES[taskProfile.taskType] || QUALITY_FLOOR_POLICIES.summarization_or_formatting;

    const candidateModels: string[] = [];
    const rejectedCandidates: { modelId: string; reason: string }[] = [];

    const reservedOutput = taskProfile.reservedOutputTokens ?? 1500;
    const totalTokenBudget = taskProfile.contextSizeEstimate + reservedOutput;
    const demand: TaskQuotaDemand = {
      estimatedInputTokens: Math.round(taskProfile.contextSizeEstimate * 0.75),
      reservedOutputTokens: reservedOutput,
      totalTokens: totalTokenBudget,
      requests: 1,
      concurrencyUnits: 1,
    };

    // 1. Evaluate all registry candidates
    const eligible: {
      model: ModelCapability;
      estimatedCost: number;
      expectedBillableCost: number;
      referenceCost: number;
      score: number;
      reason: RoutingReasonCode;
    }[] = [];

    for (const model of MODEL_REGISTRY) {
      // Check if disabled in registry
      if (!model.enabled || model.trustLevel === 'DISABLED') {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'MODEL_DISABLED_OR_UNTRUSTED' });
        continue;
      }

      // Exclude local deterministic generator from normal evaluation (reserved for fallback)
      if (model.modelId === 'deterministic-generator' || model.provider === 'local') {
        continue;
      }

      // Check provider configuration
      const adapter = providerAdapters.get(model.provider);
      if (!adapter || !adapter.isConfigured()) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'PROVIDER_API_KEY_NOT_CONFIGURED' });
        continue;
      }

      // ── BILLING ELIGIBILITY CHECK ──────────────────────────────────────────
      if (billingMode === 'FREE_ONLY') {
        if (model.billingClassification === 'PAID') {
          rejectedCandidates.push({ modelId: model.modelId, reason: 'BILLING_REQUIRED_INELIGIBLE_IN_FREE_ONLY' });
          continue;
        }
        if (model.billingClassification === 'UNKNOWN') {
          rejectedCandidates.push({ modelId: model.modelId, reason: 'BILLING_STATUS_UNKNOWN' });
          continue;
        }
      }

      // ── TRUST POLICY CHECK ────────────────────────────────────────────────
      if (policy.criticalForRelease && model.trustLevel === 'EXPERIMENTAL') {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'EXPERIMENTAL_PROVIDER_NOT_ALLOWED_FOR_CRITICAL_TASK' });
        continue;
      }

      // ── DATA POLICY CHECK ─────────────────────────────────────────────────
      const taskConfidentiality = taskProfile.confidentiality || 'PUBLIC_OR_SYNTHETIC';
      if (taskConfidentiality !== 'PUBLIC_OR_SYNTHETIC' && model.dataPolicy === 'PUBLIC_OR_SYNTHETIC_ONLY') {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'DATA_POLICY_MISMATCH' });
        continue;
      }

      // ── TASK TYPE CONSTRAINTS ─────────────────────────────────────────────
      if (model.allowedTaskTypes && !model.allowedTaskTypes.includes(taskProfile.taskType)) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'TASK_TYPE_NOT_ALLOWED' });
        continue;
      }

      // ── CONTEXT LIMIT & TPM PREFLIGHT PRECHECK ────────────────────────────
      const contextLimit = model.routingContextLimit || model.maxContextTokens;
      if (contextLimit < taskProfile.contextSizeEstimate) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'CONTEXT_LIMIT_EXCEEDED' });
        continue;
      }

      if (model.accountTpmLimit && totalTokenBudget > model.accountTpmLimit) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `REQUEST_TOO_LARGE_FOR_ROUTE (budget: ${totalTokenBudget} > account TPM limit: ${model.accountTpmLimit})`,
        });
        continue;
      }

      // ── QUALITY FLOOR CHECKS ──────────────────────────────────────────────
      if (model.reasoningTier < policy.minReasoningTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `REASONING_BELOW_FLOOR (required: ${policy.minReasoningTier}, got: ${model.reasoningTier})`,
        });
        continue;
      }

      if (model.codeTier < policy.minCodeTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `CODE_BELOW_FLOOR (required: ${policy.minCodeTier}, got: ${model.codeTier})`,
        });
        continue;
      }

      if (model.structuredOutputTier < policy.minStructuredTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `STRUCTURED_BELOW_FLOOR (required: ${policy.minStructuredTier}, got: ${model.structuredOutputTier})`,
        });
        continue;
      }

      // ── HEALTH & CIRCUIT BREAKER CHECKS ───────────────────────────────────
      if (!providerHealth.isHealthy(model.modelId) || !providerHealth.isHealthy(model.provider)) {
        const quotaState = providerHealth.getQuotaState(model.modelId) !== 'AVAILABLE'
          ? providerHealth.getQuotaState(model.modelId)
          : providerHealth.getQuotaState(model.provider);
        rejectedCandidates.push({ modelId: model.modelId, reason: `QUOTA_OR_HEALTH_BLOCKED (${quotaState})` });
        continue;
      }

      // ── PREDICTIVE QUOTA ADMISSION CONTROL (QuotaGovernor) ────────────────
      const quotaEval = quotaGovernor.checkEligibility(model, demand);
      if (!quotaEval.eligible) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: quotaEval.rejectionReasons[0] || 'QUOTA_GOVERNOR_PREFLIGHT_REJECTED',
        });
        continue;
      }

      // ── CANDIDATE QUALIFIED ───────────────────────────────────────────────
      candidateModels.push(model.modelId);

      const estimatedInputTokens = Math.round(taskProfile.contextSizeEstimate * 0.75);
      const estimatedOutputTokens = Math.round(taskProfile.contextSizeEstimate * 0.25);

      const expectedBillableCost = billingMode === 'FREE_ONLY' || model.billingClassification === 'FREE_TIER' || model.billingClassification === 'FREE_CREDITS'
        ? 0
        : (estimatedInputTokens / 1_000_000) * (model.inputCostPer1M || 0) +
          (estimatedOutputTokens / 1_000_000) * (model.outputCostPer1M || 0);

      const refInputRate = model.referenceCostPer1M?.input ?? model.inputCostPer1M ?? 0;
      const refOutputRate = model.referenceCostPer1M?.output ?? model.outputCostPer1M ?? 0;
      const referenceCost =
        (estimatedInputTokens / 1_000_000) * refInputRate +
        (estimatedOutputTokens / 1_000_000) * refOutputRate;

      // Quality-Floor First Scoring
      let score = 50 + model.capabilityTier * 10 + model.structuredOutputTier * 5;

      // Latency penalty
      if (model.latencyProfileMs) {
        score -= Math.min(20, model.latencyProfileMs / 100);
      }

      // Verifier Diversity Preference (without violating quality floor)
      let reason: RoutingReasonCode = model.billingClassification === 'FREE_TIER' ? 'FREE_TIER_SELECTED' : 'FREE_CREDITS_SELECTED';

      if (
        (taskProfile.taskType === 'code_review' || taskProfile.taskType === 'qa_test_generation') &&
        options?.engineerModelId &&
        model.modelId !== options.engineerModelId &&
        model.capabilityTier >= 3
      ) {
        score += 25; // boost diversity score for verifiers
        reason = 'ROLE_DIVERSITY';
      }

      // Provider balancing boost (spread RPM across different free providers)
      if (options?.previousProvider && model.provider !== options.previousProvider) {
        score += 10;
      }

      if (policy.criticalForRelease && reason !== 'ROLE_DIVERSITY') {
        reason = 'CAPABILITY_FLOOR';
      }

      eligible.push({
        model,
        estimatedCost: expectedBillableCost,
        expectedBillableCost,
        referenceCost,
        score,
        reason,
      });
    }

    // 2. Separate eligible candidates into Cloud Semantic and Local Semantic
    const cloudEligible: typeof eligible = [];
    const localEligible: typeof eligible = [];

    for (const item of eligible) {
      if (item.model.provider === 'local_llamacpp') {
        localEligible.push(item);
      } else {
        cloudEligible.push(item);
      }
    }

    // Sort candidates by score (highest score meeting quality floor)
    cloudEligible.sort((a, b) => b.score - a.score || a.estimatedCost - b.estimatedCost);
    localEligible.sort((a, b) => b.score - a.score || a.estimatedCost - b.estimatedCost);

    let selected: typeof eligible[0] | null = null;

    if (cloudEligible.length > 0) {
      selected = cloudEligible[0];
    } else if (localEligible.length > 0) {
      selected = localEligible[0];
      selected.reason = 'CLOUD_POOL_UNAVAILABLE_LOCAL_SEMANTIC_FALLBACK';
    }

    // Fallback to deterministic generator if no semantic model qualifies
    if (!selected) {
      const deterministicModel = MODEL_REGISTRY.find((m) => m.modelId === 'deterministic-generator')!;
      return {
        provider: 'local',
        modelId: deterministicModel.modelId,
        reason: 'FREE_ONLY_NO_ELIGIBLE_ROUTE',
        degradedMode: true,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: 0,
        expectedBillableCostUsd: 0,
        referenceInferenceCostUsd: 0,
        billingMode,
        trustLevel: 'FIRST_PARTY',
        billingClassification: 'FREE_TIER',
      };
    }

    // 3. Handle Shadow Mode
    if (routingMode === 'shadow') {
      const staticModel = options?.staticModelId || (config.models as any)?.[taskProfile.agentRole] || 'openai/gpt-oss-120b';
      const staticCap = MODEL_REGISTRY.find((m) => m.modelId === staticModel) || selected.model;

      return {
        provider: staticCap.provider,
        modelId: staticCap.modelId,
        reason: 'SHADOW_EVALUATION',
        degradedMode: false,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: 0,
        expectedBillableCostUsd: 0,
        referenceInferenceCostUsd: selected.referenceCost,
        billingMode,
        trustLevel: staticCap.trustLevel,
        billingClassification: staticCap.billingClassification,
        shadowSelection: {
          provider: selected.model.provider,
          modelId: selected.model.modelId,
          reason: selected.reason,
          estimatedCostUsd: selected.estimatedCost,
        },
      };
    }

    // 4. Handle Static Mode
    if (routingMode === 'static') {
      const staticModel = options?.staticModelId || (config.models as any)?.[taskProfile.agentRole] || 'openai/gpt-oss-120b';
      const staticCap = MODEL_REGISTRY.find((m) => m.modelId === staticModel) || selected.model;
      return {
        provider: staticCap.provider,
        modelId: staticCap.modelId,
        reason: 'STATIC_PINNED',
        degradedMode: false,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: 0,
        expectedBillableCostUsd: 0,
        referenceInferenceCostUsd: selected.referenceCost,
        billingMode,
        trustLevel: staticCap.trustLevel,
        billingClassification: staticCap.billingClassification,
      };
    }

    return {
      provider: selected.model.provider,
      modelId: selected.model.modelId,
      reason: selected.reason,
      degradedMode: false,
      candidateModels,
      rejectedCandidates,
      estimatedCostUsd: selected.estimatedCost,
      expectedBillableCostUsd: selected.expectedBillableCost,
      referenceInferenceCostUsd: selected.referenceCost,
      billingMode,
      trustLevel: selected.model.trustLevel,
      billingClassification: selected.model.billingClassification,
    };
  }

  /**
   * Escalates route to a higher capability tier upon repeated schema validation failure.
   */
  escalateRoute(taskProfile: TaskProfile, currentModelId: string): RoutingDecision {
    const currentCap = MODEL_REGISTRY.find((m) => m.modelId === currentModelId);
    const minTier = (currentCap?.capabilityTier || 2) + 1;

    const reservedOutput = taskProfile.reservedOutputTokens ?? 1500;
    const totalTokenBudget = taskProfile.contextSizeEstimate + reservedOutput;
    const demand: TaskQuotaDemand = {
      estimatedInputTokens: Math.round(taskProfile.contextSizeEstimate * 0.75),
      reservedOutputTokens: reservedOutput,
      totalTokens: totalTokenBudget,
      requests: 1,
      concurrencyUnits: 1,
    };

    const higherCandidates = MODEL_REGISTRY.filter((m) => {
      if (!m.enabled || m.trustLevel === 'DISABLED' || m.modelId === currentModelId || m.modelId === 'deterministic-generator') {
        return false;
      }
      const adapter = providerAdapters.get(m.provider);
      if (!adapter || !adapter.isConfigured()) return false;
      if (!providerHealth.isHealthy(m.modelId) || !providerHealth.isHealthy(m.provider)) return false;
      const quotaEval = quotaGovernor.checkEligibility(m, demand);
      if (!quotaEval.eligible) return false;
      return m.capabilityTier >= minTier;
    });

    if (higherCandidates.length > 0) {
      higherCandidates.sort((a, b) => b.capabilityTier - a.capabilityTier);
      const chosen = higherCandidates[0];
      return {
        provider: chosen.provider,
        modelId: chosen.modelId,
        reason: 'SCHEMA_FAILURE_ESCALATION',
        degradedMode: false,
        candidateModels: higherCandidates.map((c) => c.modelId),
        rejectedCandidates: [{ modelId: currentModelId, reason: 'SCHEMA_VALIDATION_FAILED' }],
        estimatedCostUsd: 0,
        expectedBillableCostUsd: 0,
        billingMode: config.inferenceBillingMode,
        trustLevel: chosen.trustLevel,
        billingClassification: chosen.billingClassification,
      };
    }

    // If already at max tier, fallback to normal route
    return this.routeTask(taskProfile);
  }

  /**
   * Records a routing decision event and persists to PostgreSQL model_routing_decisions table.
   */
  async recordDecision(record: ModelRoutingRecord): Promise<string | null> {
    try {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.projectId);
      if (!isValidUUID) {
        // Skip DB persistence for non-UUID test IDs while preserving event emission
        return null;
      }

      const res = await query(
        `INSERT INTO model_routing_decisions (
          project_id, agent_role, task_type, task_profile, routing_policy_version,
          candidate_models, rejected_candidates, selected_provider, selected_model,
          routing_reason, routing_mode, shadow_selection, estimated_cost_usd,
          actual_cost_usd, latency_ms, fallback_count, degraded_mode,
          validation_status, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
        RETURNING id`,
        [
          record.projectId,
          record.agentRole,
          record.taskType,
          JSON.stringify(record.taskProfile),
          record.routingPolicyVersion,
          JSON.stringify(record.candidateModels),
          JSON.stringify(record.rejectedCandidates),
          record.selectedProvider,
          record.selectedModel,
          record.routingReason,
          record.routingMode,
          record.shadowSelection ? JSON.stringify(record.shadowSelection) : null,
          record.estimatedCostUsd,
          record.actualCostUsd ?? null,
          record.latencyMs ?? null,
          record.fallbackCount,
          record.degradedMode,
          record.validationStatus,
          record.errorMessage ?? null,
        ]
      );

      // Emit Phase 4 Event via EventEmitterService
      await EventEmitterService.emit({
        projectId: record.projectId,
        eventType: record.degradedMode ? 'model.routing.degraded' : 'model.routing.selected',
        stage: record.taskType,
        actorRole: record.agentRole,
        actorName: record.agentRole,
        summary: `Model routing decision: ${record.selectedProvider}/${record.selectedModel} (${record.routingReason})`,
        payload: {
          taskType: record.taskType,
          selectedProvider: record.selectedProvider,
          selectedModel: record.selectedModel,
          routingReason: record.routingReason,
          degradedMode: record.degradedMode,
          fallbackCount: record.fallbackCount,
          latencyMs: record.latencyMs,
          estimatedCostUsd: record.estimatedCostUsd,
        },
      });

      return res.rows[0]?.id || null;
    } catch (err: any) {
      console.error('[DynamicModelRouter] Failed to record routing decision:', err.message);
      return null;
    }
  }

  /**
   * Helper to verify that a persisted decision row returns native parsed JSON objects/arrays on read-back.
   */
  async verifyPersistedDecision(decisionId: string): Promise<{
    success: boolean;
    isNativeJson: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const res = await query(
        `SELECT id, project_id, task_profile, candidate_models, rejected_candidates, shadow_selection
         FROM model_routing_decisions WHERE id = $1`,
        [decisionId]
      );
      if (res.rows.length === 0) {
        return { success: false, isNativeJson: false, error: 'Record not found' };
      }
      const row = res.rows[0];
      const isNativeArray = Array.isArray(row.candidate_models);
      const isNativeTaskProfile = typeof row.task_profile === 'object' && row.task_profile !== null;
      return {
        success: true,
        isNativeJson: isNativeArray && isNativeTaskProfile,
        data: row,
      };
    } catch (err: any) {
      return { success: false, isNativeJson: false, error: err.message };
    }
  }
}

export const dynamicRouter = DynamicModelRouter.getInstance();
