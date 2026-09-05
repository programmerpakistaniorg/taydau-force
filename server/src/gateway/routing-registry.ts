import { config } from '../config.js';
import type {
  ModelCapability,
  TaskProfile,
  TaskType,
  QuotaState,
  ProviderTrust,
  BillingClassification,
  DataPolicy,
  InferenceBillingMode,
} from '../schemas/routing.js';

export const ROUTING_POLICY_VERSION = 'v2.0.0-free-resilience';

/**
 * Verified Model Capability Registry.
 * In FREE_ONLY mode, expectedBillableCost is strictly $0.00 for FREE_TIER / FREE_CREDITS.
 * Reference pricing is preserved for economic benchmarking.
 */
export const MODEL_REGISTRY: ModelCapability[] = [
  // ── Groq Cloud (VERIFIED_INFERENCE_PLATFORM / FREE_TIER) ──────────────────
  {
    provider: 'groq',
    modelId: 'openai/gpt-oss-120b',
    displayName: 'GPT-OSS 120B (Groq Enterprise Tier)',
    capabilityTier: 4, // TayDau internal routing policy classification
    codeTier: 4,
    reasoningTier: 4,
    structuredOutputTier: 4,
    providerContextLimit: 131072,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.60, output: 1.20 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 300,
  },
  {
    provider: 'groq',
    modelId: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B (Groq Fast Tier)',
    capabilityTier: 2,
    codeTier: 2,
    reasoningTier: 2,
    structuredOutputTier: 4,
    providerContextLimit: 131072,
    routingContextLimit: 16384,
    maxContextTokens: 16384,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.15, output: 0.30 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 200,
  },
  {
    provider: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    displayName: 'Qwen 3.8 27B (Groq)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 131042,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.80, output: 4.00 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 650,
  },
  {
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B Versatile (Groq)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 131072,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.59, output: 0.79 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 600,
  },
  {
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant (Groq Fast)',
    capabilityTier: 2,
    codeTier: 2,
    reasoningTier: 2,
    structuredOutputTier: 3,
    providerContextLimit: 131072,
    routingContextLimit: 8192,
    maxContextTokens: 8192,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.05, output: 0.08 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    allowedTaskTypes: [
      'requirements_synthesis',
      'project_planning',
      'ui_ux_design',
      'summarization_or_formatting',
    ],
    latencyProfileMs: 250,
  },

  // ── Google AI Studio (FIRST_PARTY / FREE_TIER) ─────────────────────────────
  {
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash (Google AI Studio)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 4,
    structuredOutputTier: 4,
    providerContextLimit: 1048576, // 1M token context
    routingContextLimit: 65536,
    maxContextTokens: 65536,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.10, output: 0.40 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'FIRST_PARTY',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 800,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash (Google AI Studio)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 1048576,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.075, output: 0.30 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'FIRST_PARTY',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 650,
  },

  // ── NVIDIA NIM (VERIFIED_INFERENCE_PLATFORM / FREE_CREDITS) ───────────────
  {
    provider: 'nvidia',
    modelId: 'meta/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B Instruct (NVIDIA NIM)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 131072,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.59, output: 0.79 },
    pricingProvenance: 'ACCOUNT_FREE_CREDITS',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_CREDITS',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 700,
  },

  // ── Mistral AI (FIRST_PARTY / FREE_TIER) ──────────────────────────────────
  {
    provider: 'mistral',
    modelId: 'codestral-latest',
    displayName: 'Codestral (Mistral AI Coding Elite)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 32768,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.30, output: 0.90 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'FIRST_PARTY',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 750,
  },
  {
    provider: 'mistral',
    modelId: 'mistral-small-latest',
    displayName: 'Mistral Small (Mistral AI)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 3,
    providerContextLimit: 32768,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.20, output: 0.60 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'FIRST_PARTY',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 500,
  },

  // ── OpenRouter (VERIFIED_INFERENCE_PLATFORM / FREE_TIER) ──────────────────
  {
    provider: 'openrouter',
    modelId: 'qwen/qwen-2.5-coder-32b-instruct:free',
    displayName: 'Qwen 2.5 Coder 32B Free (OpenRouter)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 32768,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.20, output: 0.40 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 900,
  },
  {
    provider: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    displayName: 'Llama 3.3 70B Instruct Free (OpenRouter)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 3,
    providerContextLimit: 32768,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.30, output: 0.60 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 950,
  },
  {
    provider: 'openrouter',
    modelId: 'z-ai/glm-5.3-flash:free',
    displayName: 'GLM 5.3 Flash Free (Z.ai via OpenRouter)',
    capabilityTier: 4, // Assigned from qualification: Coding Index 71.5 + hybrid sparse attention
    codeTier: 4,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 1310720, // 1.31M token context
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.075, output: 0.25 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 700,
  },
  {
    provider: 'openrouter',
    modelId: 'z-ai/glm-5.3-flash',
    displayName: 'GLM 5.3 Flash (Z.ai via OpenRouter)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 1310720,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    expectedBillableCostPer1M: 0.00,
    referenceCostPer1M: { input: 0.075, output: 0.25 },
    pricingProvenance: 'FREE_TIER_QUOTA',
    trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 700,
  },

  // ── Historical Legacy Tabi AI (DISABLED / UNROUTABLE) ─────────────────────
  {
    provider: 'tabi',
    modelId: 'qwen-max',
    displayName: 'Qwen Max (Tabi AI Legacy - DISABLED)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 4,
    structuredOutputTier: 4,
    providerContextLimit: 32768,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 1.60,
    outputCostPer1M: 6.40,
    pricingProvenance: 'ACCOUNT_CONFIGURED_PRICE',
    trustLevel: 'DISABLED',
    billingClassification: 'PAID',
    dataPolicy: 'UNKNOWN',
    enabled: false, // EXPLICITLY DISABLED
  },
  {
    provider: 'tabi',
    modelId: 'qwen-plus',
    displayName: 'Qwen Plus (Tabi AI Legacy - DISABLED)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    providerContextLimit: 131072,
    routingContextLimit: 32768,
    maxContextTokens: 32768,
    inputCostPer1M: 0.40,
    outputCostPer1M: 1.20,
    pricingProvenance: 'ACCOUNT_CONFIGURED_PRICE',
    trustLevel: 'DISABLED',
    billingClassification: 'PAID',
    dataPolicy: 'UNKNOWN',
    enabled: false, // EXPLICITLY DISABLED
  },
  {
    provider: 'tabi',
    modelId: 'qwen-turbo',
    displayName: 'Qwen Turbo (Tabi AI Legacy - DISABLED)',
    capabilityTier: 2,
    codeTier: 2,
    reasoningTier: 2,
    structuredOutputTier: 3,
    providerContextLimit: 131072,
    routingContextLimit: 16384,
    maxContextTokens: 16384,
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.20,
    pricingProvenance: 'ACCOUNT_CONFIGURED_PRICE',
    trustLevel: 'DISABLED',
    billingClassification: 'PAID',
    dataPolicy: 'UNKNOWN',
    enabled: false, // EXPLICITLY DISABLED
  },

  // ── Deterministic Safe Fallback (Degraded Mode Only) ───────────────────────
  {
    provider: 'local',
    modelId: 'deterministic-generator',
    displayName: 'Deterministic Safe Generator',
    capabilityTier: 1,
    codeTier: 1,
    reasoningTier: 1,
    structuredOutputTier: 4,
    providerContextLimit: 100000,
    routingContextLimit: 100000,
    maxContextTokens: 100000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    expectedBillableCostPer1M: 0,
    referenceCostPer1M: { input: 0, output: 0 },
    pricingProvenance: 'ADAPTER_CONFIGURED_PRICE',
    trustLevel: 'FIRST_PARTY',
    billingClassification: 'FREE_TIER',
    dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
    enabled: true,
    latencyProfileMs: 10,
  },
];

/**
 * Mandatory Quality Floors per Task Type.
 * CORE INVARIANT: QUALITY FLOOR FIRST. COST OPTIMIZATION SECOND.
 */
export interface QualityFloorPolicy {
  minReasoningTier: number;
  minCodeTier: number;
  minStructuredTier: number;
  criticalForRelease: boolean;
  allowDegradedRelease: boolean;
}

export const QUALITY_FLOOR_POLICIES: Record<TaskType, QualityFloorPolicy> = {
  architecture_design: {
    minReasoningTier: 3,
    minCodeTier: 2,
    minStructuredTier: 3,
    criticalForRelease: true,
    allowDegradedRelease: false,
  },
  fullstack_code_generation: {
    minReasoningTier: 3,
    minCodeTier: 3,
    minStructuredTier: 3,
    criticalForRelease: true,
    allowDegradedRelease: false,
  },
  defect_rework: {
    minReasoningTier: 3,
    minCodeTier: 3,
    minStructuredTier: 3,
    criticalForRelease: true,
    allowDegradedRelease: false,
  },
  code_review: {
    minReasoningTier: 3,
    minCodeTier: 2,
    minStructuredTier: 3,
    criticalForRelease: true,
    allowDegradedRelease: false,
  },
  qa_test_generation: {
    minReasoningTier: 3,
    minCodeTier: 3,
    minStructuredTier: 3,
    criticalForRelease: true,
    allowDegradedRelease: false,
  },
  requirements_synthesis: {
    minReasoningTier: 2,
    minCodeTier: 1,
    minStructuredTier: 2,
    criticalForRelease: false,
    allowDegradedRelease: false,
  },
  project_planning: {
    minReasoningTier: 2,
    minCodeTier: 1,
    minStructuredTier: 2,
    criticalForRelease: false,
    allowDegradedRelease: false,
  },
  ui_ux_design: {
    minReasoningTier: 2,
    minCodeTier: 1,
    minStructuredTier: 2,
    criticalForRelease: false,
    allowDegradedRelease: false,
  },
  summarization_or_formatting: {
    minReasoningTier: 1,
    minCodeTier: 1,
    minStructuredTier: 1,
    criticalForRelease: false,
    allowDegradedRelease: true,
  },
};

/**
 * Infer default TaskProfile from AgentRole and Purpose if not explicitly provided.
 */
export function inferTaskProfile(agentRole: string, purpose?: string): TaskProfile {
  let taskType: TaskType = 'summarization_or_formatting';
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let reasoningRequirement: 'none' | 'low' | 'medium' | 'high' = 'medium';
  let codeGenerationRequirement: 'none' | 'low' | 'medium' | 'high' = 'none';
  let verificationCriticality: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  const role = agentRole.toLowerCase();

  if (role.includes('architect')) {
    taskType = 'architecture_design';
    complexity = 'high';
    riskLevel = 'critical';
    reasoningRequirement = 'high';
    verificationCriticality = 'high';
  } else if (role.includes('rework')) {
    taskType = 'defect_rework';
    complexity = 'high';
    riskLevel = 'critical';
    reasoningRequirement = 'high';
    codeGenerationRequirement = 'high';
    verificationCriticality = 'critical';
  } else if (role.includes('engineer') || role.includes('coder')) {
    taskType = 'fullstack_code_generation';
    complexity = 'high';
    riskLevel = 'critical';
    reasoningRequirement = 'high';
    codeGenerationRequirement = 'high';
    verificationCriticality = 'critical';
  } else if (role.includes('review')) {
    taskType = 'code_review';
    complexity = 'medium';
    riskLevel = 'high';
    reasoningRequirement = 'high';
    verificationCriticality = 'critical';
  } else if (role.includes('qa')) {
    taskType = 'qa_test_generation';
    complexity = 'medium';
    riskLevel = 'high';
    reasoningRequirement = 'high';
    codeGenerationRequirement = 'high';
    verificationCriticality = 'critical';
  } else if (role.includes('ba') || role.includes('analyst')) {
    taskType = 'requirements_synthesis';
    complexity = 'medium';
    riskLevel = 'medium';
    reasoningRequirement = 'medium';
  } else if (role.includes('pm') || role.includes('planner')) {
    taskType = 'project_planning';
    complexity = 'low';
    riskLevel = 'medium';
    reasoningRequirement = 'medium';
  } else if (role.includes('designer') || role.includes('ui') || role.includes('ux')) {
    taskType = 'ui_ux_design';
    complexity = 'medium';
    riskLevel = 'medium';
    reasoningRequirement = 'medium';
  }

  return {
    agentRole,
    taskType,
    complexity,
    riskLevel,
    structuredOutputRequired: true,
    reasoningRequirement,
    codeGenerationRequirement,
    contextSizeEstimate: 4000,
    latencySensitivity: 'medium',
    verificationCriticality,
    confidentiality: 'PUBLIC_OR_SYNTHETIC',
  };
}

/**
 * Provider Health, Quota & Error Classification Tracker
 */
class ProviderHealthTracker {
  private quotaStates: Map<string, { state: QuotaState; cooldownUntil: number; reason?: string }> = new Map();
  private failureCounts: Map<string, { count: number; lastFailureTime: number }> = new Map();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly DEFAULT_COOLDOWN_MS = 60_000;

  recordSuccess(providerOrModel: string): void {
    this.failureCounts.delete(providerOrModel);
    const entry = this.quotaStates.get(providerOrModel);
    if (entry && (entry.state === 'RATE_LIMITED' || entry.state === 'UNKNOWN')) {
      this.quotaStates.delete(providerOrModel);
    }
  }

  recordFailure(providerOrModel: string): void {
    const now = Date.now();
    const entry = this.failureCounts.get(providerOrModel) || { count: 0, lastFailureTime: 0 };
    entry.count += 1;
    entry.lastFailureTime = now;
    this.failureCounts.set(providerOrModel, entry);
    console.warn(`[ProviderHealthTracker] Failure recorded for ${providerOrModel} (count: ${entry.count})`);
  }

  recordRateLimit(providerOrModel: string, retryAfterMs?: number, reason?: string): void {
    const cooldown = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : this.DEFAULT_COOLDOWN_MS;
    const cooldownUntil = Date.now() + cooldown;
    this.quotaStates.set(providerOrModel, { state: 'RATE_LIMITED', cooldownUntil, reason });
    console.warn(`[ProviderHealthTracker] Rate limit recorded for ${providerOrModel}. Cooldown for ${cooldown}ms.`);
  }

  recordAuthFailure(providerOrModel: string, reason?: string): void {
    // 24-hour disable for auth failure
    this.quotaStates.set(providerOrModel, {
      state: 'AUTH_FAILED',
      cooldownUntil: Date.now() + 86_400_000,
      reason: reason || 'Authentication failed',
    });
    console.error(`[ProviderHealthTracker] AUTH FAILURE for ${providerOrModel}. Disabled until key fixed.`);
  }

  recordDailyQuotaExhausted(providerOrModel: string, reason?: string): void {
    // Daily quota exhausted -> 12 hour cooldown
    this.quotaStates.set(providerOrModel, {
      state: 'DAILY_QUOTA_EXHAUSTED',
      cooldownUntil: Date.now() + 43_200_000,
      reason: reason || 'Daily quota exhausted',
    });
  }

  recordBillingRequired(providerOrModel: string, reason?: string): void {
    this.quotaStates.set(providerOrModel, {
      state: 'BILLING_REQUIRED',
      cooldownUntil: Date.now() + 86_400_000,
      reason: reason || 'Billing payment required',
    });
  }

  getQuotaState(providerOrModel: string): QuotaState {
    const entry = this.quotaStates.get(providerOrModel);
    if (!entry) return 'AVAILABLE';
    if (Date.now() > entry.cooldownUntil) {
      this.quotaStates.delete(providerOrModel);
      return 'AVAILABLE';
    }
    return entry.state;
  }

  isHealthy(providerOrModel: string): boolean {
    const state = this.getQuotaState(providerOrModel);
    if (state !== 'AVAILABLE') return false;

    const entry = this.failureCounts.get(providerOrModel);
    if (!entry) return true;
    if (Date.now() - entry.lastFailureTime > this.DEFAULT_COOLDOWN_MS) {
      this.failureCounts.delete(providerOrModel);
      return true;
    }
    return entry.count < this.FAILURE_THRESHOLD;
  }

  getAllQuotaStates(): Record<string, { state: QuotaState; cooldownRemainingSec: number; reason?: string }> {
    const out: Record<string, { state: QuotaState; cooldownRemainingSec: number; reason?: string }> = {};
    const now = Date.now();
    for (const [key, val] of this.quotaStates.entries()) {
      const remainingSec = Math.max(0, Math.round((val.cooldownUntil - now) / 1000));
      out[key] = { state: val.state, cooldownRemainingSec: remainingSec, reason: val.reason };
    }
    return out;
  }
}

export const providerHealth = new ProviderHealthTracker();
