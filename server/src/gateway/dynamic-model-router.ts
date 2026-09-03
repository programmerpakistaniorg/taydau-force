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
} from '../schemas/routing.js';
import {
  MODEL_REGISTRY,
  QUALITY_FLOOR_POLICIES,
  ROUTING_POLICY_VERSION,
  providerHealth,
  inferTaskProfile,
} from './routing-registry.js';

export class DynamicModelRouter {
  private static instance: DynamicModelRouter;

  static getInstance(): DynamicModelRouter {
    if (!this.instance) {
      this.instance = new DynamicModelRouter();
    }
    return this.instance;
  }

  /**
   * Evaluates the best route for a given TaskProfile according to policy.
   */
  routeTask(
    taskProfile: TaskProfile,
    options?: {
      overrideMode?: 'static' | 'shadow' | 'active';
      staticModelId?: string;
      engineerModelId?: string;
    }
  ): RoutingDecision {
    const mode = options?.overrideMode || (process.env.ROUTING_MODE as any) || 'active';
    const policy = QUALITY_FLOOR_POLICIES[taskProfile.taskType] || QUALITY_FLOOR_POLICIES.summarization_or_formatting;

    const candidateModels: string[] = [];
    const rejectedCandidates: { modelId: string; reason: string }[] = [];

    // 1. Evaluate all registry candidates
    const eligible: { model: ModelCapability; estimatedCost: number; score: number; reason: RoutingReasonCode }[] = [];

    for (const model of MODEL_REGISTRY) {
      if (!model.enabled) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'MODEL_DISABLED' });
        continue;
      }

      if (model.modelId === 'deterministic-generator' || model.provider === 'local') {
        continue; // Reserved as fallback
      }

      // Check allowed task types if defined
      if (model.allowedTaskTypes && !model.allowedTaskTypes.includes(taskProfile.taskType)) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'TASK_TYPE_NOT_ALLOWED' });
        continue;
      }

      // Check routing context token limit
      const contextLimit = model.routingContextLimit || model.maxContextTokens;
      if (contextLimit < taskProfile.contextSizeEstimate) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'CONTEXT_LIMIT_EXCEEDED' });
        continue;
      }

      // Check Quality Floor: Reasoning Tier
      if (model.reasoningTier < policy.minReasoningTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `REASONING_BELOW_FLOOR (required: ${policy.minReasoningTier}, got: ${model.reasoningTier})`,
        });
        continue;
      }

      // Check Quality Floor: Code Tier
      if (model.codeTier < policy.minCodeTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `CODE_BELOW_FLOOR (required: ${policy.minCodeTier}, got: ${model.codeTier})`,
        });
        continue;
      }

      // Check Quality Floor: Structured Output Tier
      if (model.structuredOutputTier < policy.minStructuredTier) {
        rejectedCandidates.push({
          modelId: model.modelId,
          reason: `STRUCTURED_BELOW_FLOOR (required: ${policy.minStructuredTier}, got: ${model.structuredOutputTier})`,
        });
        continue;
      }

      // Check provider health
      if (!providerHealth.isHealthy(model.modelId) || !providerHealth.isHealthy(model.provider)) {
        rejectedCandidates.push({ modelId: model.modelId, reason: 'PROVIDER_UNHEALTHY' });
        continue;
      }

      // Candidate is eligible
      candidateModels.push(model.modelId);

      const isPriceUnknown =
        model.inputCostPer1M === null ||
        model.outputCostPer1M === null ||
        model.pricingProvenance === 'UNKNOWN';

      const estimatedInputTokens = Math.round(taskProfile.contextSizeEstimate * 0.75);
      const estimatedOutputTokens = Math.round(taskProfile.contextSizeEstimate * 0.25);
      const estimatedCost = isPriceUnknown
        ? 0
        : (estimatedInputTokens / 1_000_000) * (model.inputCostPer1M || 0) +
          (estimatedOutputTokens / 1_000_000) * (model.outputCostPer1M || 0);

      // Penalize unknown price models in cost scoring so they never falsely win CHEAPEST_MODEL over priced models
      let score = isPriceUnknown ? 5 : 100 - estimatedCost * 10;

      // Verifier Diversity Preference (without violating quality floor)
      let reason: RoutingReasonCode = 'LOWER_COST_ELIGIBLE';
      if (
        (taskProfile.taskType === 'code_review' || taskProfile.taskType === 'qa_test_generation') &&
        options?.engineerModelId &&
        model.modelId !== options.engineerModelId &&
        model.capabilityTier >= 3
      ) {
        score += 20; // boost diversity score for verifiers
        reason = 'ROLE_DIVERSITY';
      }

      if (policy.criticalForRelease) {
        reason = 'CAPABILITY_FLOOR';
      }

      eligible.push({
        model,
        estimatedCost,
        score,
        reason,
      });
    }

    // 2. Sort eligible candidates by score (highest score / lowest cost meeting quality floor)
    eligible.sort((a, b) => b.score - a.score || a.estimatedCost - b.estimatedCost);

    // Fallback to deterministic generator if no model qualifies
    if (eligible.length === 0) {
      const deterministicModel = MODEL_REGISTRY.find((m) => m.modelId === 'deterministic-generator')!;
      return {
        provider: 'local',
        modelId: deterministicModel.modelId,
        reason: 'DEGRADED_FALLBACK',
        degradedMode: true,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: 0,
      };
    }

    const selected = eligible[0];

    // 3. Handle Shadow Mode
    if (mode === 'shadow') {
      const staticModel = options?.staticModelId || (config.models as any)?.[taskProfile.agentRole] || 'qwen-max';
      const staticCap = MODEL_REGISTRY.find((m) => m.modelId === staticModel) || selected.model;
      const inCost = staticCap.inputCostPer1M ?? 0;
      const outCost = staticCap.outputCostPer1M ?? 0;
      const staticCost =
        (taskProfile.contextSizeEstimate * 0.75 / 1_000_000) * inCost +
        (taskProfile.contextSizeEstimate * 0.25 / 1_000_000) * outCost;

      return {
        provider: staticCap.provider,
        modelId: staticCap.modelId,
        reason: 'SHADOW_EVALUATION',
        degradedMode: false,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: staticCost,
        shadowSelection: {
          provider: selected.model.provider,
          modelId: selected.model.modelId,
          reason: selected.reason,
          estimatedCostUsd: selected.estimatedCost,
        },
      };
    }

    // 4. Handle Static Mode
    if (mode === 'static') {
      const staticModel = options?.staticModelId || (config.models as any)?.[taskProfile.agentRole] || 'qwen-max';
      const staticCap = MODEL_REGISTRY.find((m) => m.modelId === staticModel) || selected.model;
      return {
        provider: staticCap.provider,
        modelId: staticCap.modelId,
        reason: 'STATIC_PINNED',
        degradedMode: false,
        candidateModels,
        rejectedCandidates,
        estimatedCostUsd: selected.estimatedCost,
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
    };
  }

  /**
   * Escalates route to a higher capability tier upon repeated schema validation failure.
   */
  escalateRoute(taskProfile: TaskProfile, currentModelId: string): RoutingDecision {
    const currentCap = MODEL_REGISTRY.find((m) => m.modelId === currentModelId);
    const minTier = (currentCap?.capabilityTier || 2) + 1;

    const higherCandidates = MODEL_REGISTRY.filter(
      (m) => m.enabled && m.capabilityTier >= minTier && m.modelId !== currentModelId && m.modelId !== 'deterministic-generator'
    );

    if (higherCandidates.length > 0) {
      higherCandidates.sort((a, b) => (a.inputCostPer1M ?? 999) - (b.inputCostPer1M ?? 999));
      const chosen = higherCandidates[0];
      const inCost = chosen.inputCostPer1M ?? 0;
      return {
        provider: chosen.provider,
        modelId: chosen.modelId,
        reason: 'SCHEMA_FAILURE_ESCALATION',
        degradedMode: false,
        candidateModels: higherCandidates.map((c) => c.modelId),
        rejectedCandidates: [{ modelId: currentModelId, reason: 'SCHEMA_VALIDATION_FAILED' }],
        estimatedCostUsd: (taskProfile.contextSizeEstimate / 1_000_000) * inCost,
      };
    }

    // If already at max tier, retain max tier
    return this.routeTask(taskProfile);
  }

  /**
   * Persists a routing decision to the database and emits an SSE event.
   */
  async recordDecision(record: ModelRoutingRecord): Promise<string | null> {
    try {
      const res = await query(
        `INSERT INTO model_routing_decisions (
          project_id, agent_role, task_type, task_profile,
          routing_policy_version, candidate_models, rejected_candidates,
          selected_provider, selected_model, routing_reason, routing_mode,
          shadow_selection, estimated_cost_usd, actual_cost_usd,
          latency_ms, fallback_count, degraded_mode, validation_status,
          error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id`,
        [
          record.projectId,
          record.agentRole,
          record.taskType,
          JSON.stringify(record.taskProfile),
          record.routingPolicyVersion || ROUTING_POLICY_VERSION,
          JSON.stringify(record.candidateModels || []),
          JSON.stringify(record.rejectedCandidates || []),
          record.selectedProvider,
          record.selectedModel,
          record.routingReason,
          record.routingMode || 'active',
          record.shadowSelection ? JSON.stringify(record.shadowSelection) : null,
          record.estimatedCostUsd || 0,
          record.actualCostUsd || null,
          record.latencyMs || null,
          record.fallbackCount || 0,
          record.degradedMode || false,
          record.validationStatus || 'passed',
          record.errorMessage || null,
        ]
      );

      const decisionId = res.rows[0]?.id;

      // Emit real-time event
      let eventType: 'model.routing.selected' | 'model.routing.fallback' | 'model.routing.degraded' = 'model.routing.selected';
      if (record.degradedMode) {
        eventType = 'model.routing.degraded';
      } else if (record.fallbackCount > 0) {
        eventType = 'model.routing.fallback';
      }

      await EventEmitterService.emit({
        projectId: record.projectId,
        eventType,
        stage: 'routing',
        actorRole: record.agentRole,
        summary: `Model route [${record.selectedProvider}/${record.selectedModel}] selected for ${record.agentRole} (${record.routingReason})`,
        payload: {
          decisionId,
          agentRole: record.agentRole,
          taskType: record.taskType,
          selectedProvider: record.selectedProvider,
          selectedModel: record.selectedModel,
          routingReason: record.routingReason,
          degradedMode: record.degradedMode,
          fallbackCount: record.fallbackCount,
          estimatedCostUsd: record.estimatedCostUsd,
          actualCostUsd: record.actualCostUsd,
        },
      }).catch((e) => console.warn('[DynamicModelRouter] Event emit warning:', e));

      return decisionId;
    } catch (err: any) {
      console.error('[DynamicModelRouter] Failed to persist routing decision:', err);
      return null;
    }
  }
}

export const dynamicRouter = DynamicModelRouter.getInstance();
