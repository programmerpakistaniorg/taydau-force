import { z } from 'zod';

export const TaskTypeSchema = z.enum([
  'requirements_synthesis',
  'project_planning',
  'ui_ux_design',
  'architecture_design',
  'fullstack_code_generation',
  'code_review',
  'qa_test_generation',
  'defect_rework',
  'summarization_or_formatting',
]);

export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskComplexitySchema = z.enum(['low', 'medium', 'high']);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const CapabilityLevelSchema = z.enum(['none', 'low', 'medium', 'high', 'elite']);
export type CapabilityLevel = z.infer<typeof CapabilityLevelSchema>;

export const RoutingReasonCodeSchema = z.enum([
  'CAPABILITY_FLOOR',
  'LOWER_COST_ELIGIBLE',
  'PROVIDER_UNAVAILABLE',
  'CONTEXT_LIMIT',
  'SCHEMA_FAILURE_ESCALATION',
  'VERIFICATION_CRITICAL',
  'BUDGET_PRESSURE',
  'DEGRADED_FALLBACK',
  'SHADOW_EVALUATION',
  'STATIC_PINNED',
  'ROLE_DIVERSITY',
]);

export type RoutingReasonCode = z.infer<typeof RoutingReasonCodeSchema>;

export interface TaskProfile {
  agentRole: string;
  taskType: TaskType;
  complexity: TaskComplexity;
  riskLevel: RiskLevel;
  structuredOutputRequired: boolean;
  reasoningRequirement: 'none' | 'low' | 'medium' | 'high';
  codeGenerationRequirement: 'none' | 'low' | 'medium' | 'high';
  contextSizeEstimate: number;
  latencySensitivity: 'low' | 'medium' | 'high';
  verificationCriticality: 'low' | 'medium' | 'high' | 'critical';
  reworkContext?: {
    defectSeverity?: string;
    attemptCount?: number;
    previousFailureReason?: string;
  };
  budgetContext?: {
    remainingBudgetUsd?: number;
    hardLimitUsd?: number;
  };
}

export type PricingProvenance =
  | 'PUBLIC_PROVIDER_PRICE'
  | 'ACCOUNT_CONFIGURED_PRICE'
  | 'ADAPTER_CONFIGURED_PRICE'
  | 'UNKNOWN';

export interface ModelCapability {
  provider: 'tabi' | 'groq' | 'local' | 'mock';
  modelId: string;
  displayName: string;
  capabilityTier: number; // 1 (basic) to 4 (elite) - TayDau internal routing policy classification
  codeTier: number; // 1 to 4 - TayDau internal routing policy classification
  reasoningTier: number; // 1 to 4 - TayDau internal routing policy classification
  structuredOutputTier: number; // 1 to 4
  providerContextLimit: number; // Actual configured/provider capability
  routingContextLimit: number; // Conservative TayDau policy routing cap
  maxContextTokens: number; // Backwards compatible alias to routingContextLimit
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  pricingProvenance: PricingProvenance;
  enabled: boolean;
  allowedTaskTypes?: TaskType[];
  latencyProfileMs?: number;
}

export interface CandidateEvaluation {
  modelId: string;
  provider: string;
  eligible: boolean;
  rejectionReasons: string[];
  estimatedCostUsd: number;
  score: number;
}

export interface RoutingDecision {
  provider: string;
  modelId: string;
  reason: RoutingReasonCode;
  degradedMode: boolean;
  candidateModels: string[];
  rejectedCandidates: { modelId: string; reason: string }[];
  estimatedCostUsd: number;
  shadowSelection?: {
    provider: string;
    modelId: string;
    reason: RoutingReasonCode;
    estimatedCostUsd: number;
  };
}

export interface ModelRoutingRecord {
  id?: string;
  projectId: string;
  agentRole: string;
  taskType: TaskType;
  taskProfile: TaskProfile;
  routingPolicyVersion: string;
  candidateModels: string[];
  rejectedCandidates: { modelId: string; reason: string }[];
  selectedProvider: string;
  selectedModel: string;
  routingReason: RoutingReasonCode;
  routingMode: 'static' | 'shadow' | 'active';
  shadowSelection?: Record<string, any> | null;
  estimatedCostUsd: number;
  actualCostUsd?: number | null;
  latencyMs?: number | null;
  fallbackCount: number;
  degradedMode: boolean;
  validationStatus: 'pending' | 'passed' | 'escalated' | 'failed';
  errorMessage?: string | null;
  createdAt?: string;
}
