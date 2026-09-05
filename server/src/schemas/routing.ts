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

export const ProviderTrustSchema = z.enum([
  'FIRST_PARTY',
  'VERIFIED_INFERENCE_PLATFORM',
  'EXPERIMENTAL',
  'DISABLED',
]);
export type ProviderTrust = z.infer<typeof ProviderTrustSchema>;

export const BillingClassificationSchema = z.enum([
  'FREE_TIER',
  'FREE_CREDITS',
  'PAID',
  'UNKNOWN',
]);
export type BillingClassification = z.infer<typeof BillingClassificationSchema>;

export const DataPolicySchema = z.enum([
  'PUBLIC_OR_SYNTHETIC_ONLY',
  'STANDARD',
  'UNKNOWN',
]);
export type DataPolicy = z.infer<typeof DataPolicySchema>;

export const InferenceBillingModeSchema = z.enum(['FREE_ONLY', 'STANDARD']);
export type InferenceBillingMode = z.infer<typeof InferenceBillingModeSchema>;

export const QuotaStateSchema = z.enum([
  'AVAILABLE',
  'RATE_LIMITED',
  'DAILY_QUOTA_EXHAUSTED',
  'AUTH_FAILED',
  'MODEL_UNAVAILABLE',
  'PROVIDER_UNAVAILABLE',
  'BILLING_REQUIRED',
  'UNKNOWN',
]);
export type QuotaState = z.infer<typeof QuotaStateSchema>;

export const RoutingReasonCodeSchema = z.enum([
  'CAPABILITY_FLOOR',
  'LOWER_COST_ELIGIBLE',
  'FREE_TIER_SELECTED',
  'FREE_CREDITS_SELECTED',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_RATE_LIMITED',
  'QUOTA_EXHAUSTED',
  'AUTH_FAILED',
  'BILLING_REQUIRED',
  'CONTEXT_LIMIT',
  'SCHEMA_FAILURE_ESCALATION',
  'VERIFICATION_CRITICAL',
  'BUDGET_PRESSURE',
  'FREE_ONLY_NO_ELIGIBLE_ROUTE',
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
  confidentiality?: 'PUBLIC_OR_SYNTHETIC' | 'INTERNAL' | 'RESTRICTED';
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
  | 'FREE_TIER_QUOTA'
  | 'ACCOUNT_FREE_CREDITS'
  | 'UNKNOWN';

export interface ModelCapability {
  provider: 'gemini' | 'groq' | 'nvidia' | 'mistral' | 'openrouter' | 'tabi' | 'local' | 'mock';
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
  expectedBillableCostPer1M?: number; // 0 for FREE_TIER / FREE_CREDITS
  referenceCostPer1M?: { input: number; output: number }; // Reference economic rate
  pricingProvenance: PricingProvenance;
  trustLevel: ProviderTrust;
  billingClassification: BillingClassification;
  dataPolicy: DataPolicy;
  quotaState?: QuotaState;
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
  expectedBillableCostUsd: number;
  referenceInferenceCostUsd?: number;
  billingMode?: InferenceBillingMode;
  trustLevel?: ProviderTrust;
  billingClassification?: BillingClassification;
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

