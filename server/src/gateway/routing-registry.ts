import { config } from '../config.js';
import type { ModelCapability, TaskProfile, TaskType } from '../schemas/routing.js';

export const ROUTING_POLICY_VERSION = 'v1.0.0';

/**
 * Verified Model Capability Registry for configured models.
 * Pricing is configured in USD per 1M tokens.
 */
export const MODEL_REGISTRY: ModelCapability[] = [
  // ── High/Elite Reasoning & Code Models ──────────────────────────────────────
  {
    provider: 'tabi',
    modelId: 'qwen-max',
    displayName: 'Qwen Max (Tabi AI)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 4,
    structuredOutputTier: 4,
    maxContextTokens: 32768,
    inputCostPer1M: 1.60,
    outputCostPer1M: 6.40,
    enabled: true,
    latencyProfileMs: 1400,
  },
  {
    provider: 'tabi',
    modelId: 'qwen-plus',
    displayName: 'Qwen Plus (Tabi AI)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    maxContextTokens: 32768,
    inputCostPer1M: 0.40,
    outputCostPer1M: 1.20,
    enabled: true,
    latencyProfileMs: 900,
  },
  {
    provider: 'groq',
    modelId: 'qwen/qwen3.8-27b',
    displayName: 'Qwen 3.8 27B (Groq)',
    capabilityTier: 3,
    codeTier: 3,
    reasoningTier: 3,
    structuredOutputTier: 4,
    maxContextTokens: 32768,
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
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
    maxContextTokens: 32768,
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
    enabled: true,
    latencyProfileMs: 700,
  },
  {
    provider: 'groq',
    modelId: 'deepseek-r1-distill-llama-70b',
    displayName: 'DeepSeek R1 Distill 70B (Groq Reasoning)',
    capabilityTier: 4,
    codeTier: 4,
    reasoningTier: 4,
    structuredOutputTier: 4,
    maxContextTokens: 32768,
    inputCostPer1M: 0.75,
    outputCostPer1M: 0.99,
    enabled: true,
    latencyProfileMs: 1200,
  },

  // ── Fast/Cost-Optimized Models ─────────────────────────────────────────────
  {
    provider: 'tabi',
    modelId: 'qwen-turbo',
    displayName: 'Qwen Turbo (Tabi AI Fast)',
    capabilityTier: 2,
    codeTier: 2,
    reasoningTier: 2,
    structuredOutputTier: 3,
    maxContextTokens: 16384,
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.20,
    enabled: true,
    allowedTaskTypes: [
      'requirements_synthesis',
      'project_planning',
      'ui_ux_design',
      'summarization_or_formatting',
    ],
    latencyProfileMs: 400,
  },
  {
    provider: 'groq',
    modelId: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant (Groq Fast)',
    capabilityTier: 2,
    codeTier: 2,
    reasoningTier: 2,
    structuredOutputTier: 3,
    maxContextTokens: 8192,
    inputCostPer1M: 0.05,
    outputCostPer1M: 0.08,
    enabled: true,
    allowedTaskTypes: [
      'requirements_synthesis',
      'project_planning',
      'ui_ux_design',
      'summarization_or_formatting',
    ],
    latencyProfileMs: 250,
  },

  // ── Deterministic Safe Fallback ────────────────────────────────────────────
  {
    provider: 'local',
    modelId: 'deterministic-generator',
    displayName: 'Deterministic Safe Generator',
    capabilityTier: 1,
    codeTier: 1,
    reasoningTier: 1,
    structuredOutputTier: 4,
    maxContextTokens: 100000,
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    enabled: true,
    latencyProfileMs: 10,
  }
];

/**
 * Mandatory Quality Floors per Task Type.
 * CORE RULE: QUALITY FLOOR FIRST. COST OPTIMIZATION SECOND.
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
  };
}

/**
 * Provider Health & Circuit Breaker Tracking
 */
class ProviderHealthTracker {
  private failureCounts: Map<string, { count: number; lastFailureTime: number }> = new Map();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly RECOVERY_TIME_MS = 60000; // 1 minute cooldown

  recordFailure(providerOrModel: string): void {
    const now = Date.now();
    const entry = this.failureCounts.get(providerOrModel) || { count: 0, lastFailureTime: 0 };
    entry.count += 1;
    entry.lastFailureTime = now;
    this.failureCounts.set(providerOrModel, entry);
    console.warn(`[ProviderHealthTracker] Recorded failure for ${providerOrModel} (failure count: ${entry.count})`);
  }

  recordSuccess(providerOrModel: string): void {
    if (this.failureCounts.has(providerOrModel)) {
      this.failureCounts.delete(providerOrModel);
    }
  }

  isHealthy(providerOrModel: string): boolean {
    const entry = this.failureCounts.get(providerOrModel);
    if (!entry) return true;
    const now = Date.now();
    if (now - entry.lastFailureTime > this.RECOVERY_TIME_MS) {
      // Cooldown expired, half-open
      this.failureCounts.delete(providerOrModel);
      return true;
    }
    return entry.count < this.FAILURE_THRESHOLD;
  }
}

export const providerHealth = new ProviderHealthTracker();
