import { z } from 'zod';

export const QuotaScopeSchema = z.enum([
  'ORGANIZATION',
  'PROJECT',
  'ACCOUNT',
  'CREDENTIAL',
  'MODEL',
  'LOCAL_CAPACITY',
]);
export type QuotaScope = z.infer<typeof QuotaScopeSchema>;

export const QuotaDimensionSchema = z.enum([
  'TPM',
  'RPM',
  'TPD',
  'RPD',
  'CONCURRENCY',
]);
export type QuotaDimension = z.infer<typeof QuotaDimensionSchema>;

export const QuotaWindowTypeSchema = z.enum([
  'SLIDING_MINUTE',
  'FIXED_MINUTE',
  'FIXED_RESET_WINDOW',
  'PROVIDER_REPORTED_RESET',
  'DAILY_CALENDAR',
  'CONCURRENT_IN_FLIGHT',
]);
export type QuotaWindowType = z.infer<typeof QuotaWindowTypeSchema>;

export const QuotaSourceSchema = z.enum([
  'LIVE_RESPONSE_HEADER',
  'PROVIDER_ERROR_SIGNAL',
  'PROVIDER_QUOTA_API',
  'TRUSTED_ACCOUNT_CONFIG',
  'STATIC_FALLBACK',
  'POLICY_ADMISSION_CAP',
  'UNKNOWN',
]);
export type QuotaSource = z.infer<typeof QuotaSourceSchema>;

export const ReservationStateSchema = z.enum([
  'RESERVED',
  'COMMITTED',
  'RECONCILED',
  'RELEASED',
  'EXPIRED',
]);
export type ReservationState = z.infer<typeof ReservationStateSchema>;

/**
 * Generic Quota Constraint model.
 * A single route can be constrained by multiple simultaneous constraints
 * (e.g. Org Daily TPD + Org RPM + Model TPM).
 */
export interface QuotaConstraint {
  scope: QuotaScope;
  scopeId: string; // e.g. "org:groq-primary", "model:groq/openai/gpt-oss-120b", "local:default"
  dimension: QuotaDimension;
  limit: number;
  remaining: number;
  windowType: QuotaWindowType;
  resetAt: number; // Unix timestamp in milliseconds
  source: QuotaSource;
  observedAt: number; // Unix timestamp in milliseconds
  isPolicyCap?: boolean; // true if this represents a conservative TayDau internal policy cap rather than verified provider capacity
}

/**
 * Normalized discrete quota signal for a specific scope and dimension.
 * Allows a single provider response to communicate multiple independent constraints simultaneously
 * (e.g. Organization TPD + Organization RPM + Model TPM).
 */
export interface NormalizedQuotaSignal {
  provider?: string;
  scope: QuotaScope;
  scopeId: string;
  dimension: QuotaDimension;
  limit?: number;
  remaining?: number;
  resetAt?: number;
  resetInSeconds?: number;
  source: QuotaSource;
  observedAt?: number;
  rawHeaders?: Record<string, string>;
  isPolicyCap?: boolean;
}

/**
 * Estimated token and execution resource demand for a specialist task.
 */
export interface TaskQuotaDemand {
  estimatedInputTokens: number;
  reservedOutputTokens: number;
  totalTokens: number; // estimatedInputTokens + reservedOutputTokens
  requests: number; // typically 1
  concurrencyUnits: number; // typically 1
  timeoutMs?: number; // bounded invocation timeout for dynamic TTL calculation
}

/**
 * Active in-flight token / request reservation.
 */
export interface QuotaReservation {
  reservationId: string;
  routeKey: string;
  provider: string;
  modelId: string;
  demand: TaskQuotaDemand;
  state: ReservationState;
  createdAt: number;
  expiresAt: number; // dynamic TTL: createdAt + (timeoutMs || 60_000) + safetyGrace
  allocatedConstraints: {
    constraintKey: string;
    tokensReserved: number;
    requestsReserved: number;
    concurrencyReserved: number;
  }[];
  workflowRunId?: string;
  stepRunId?: string;
  invocationId?: string;
  attempt?: number;
}

/**
 * Outcome of an atomic tryReserve operation.
 */
export interface ReservationResult {
  success: boolean;
  reservation?: QuotaReservation;
  rejectionReason?: string;
  violatingConstraint?: QuotaConstraint;
  cooldownRemainingMs?: number;
}

/**
 * Live quota feedback signal extracted from provider response headers,
 * 429/413 error payloads, or quota introspection endpoints.
 */
export interface QuotaSignal {
  provider: string;
  modelId?: string;
  source: QuotaSource;
  observedAt: number;
  constraints: Partial<Record<QuotaDimension, {
    limit?: number;
    remaining?: number;
    resetAt?: number;
    resetInSeconds?: number;
  }>>;
  rawHeaders?: Record<string, string>;
  isRateLimit?: boolean;
  isDailyLimit?: boolean;
  isAuthError?: boolean;
  isBillingError?: boolean;
  unknownConsumption?: boolean;
}

/**
 * Advisory evaluation for admission inspection without reservation side-effects.
 */
export interface RouteAdmissionEvaluation {
  eligible: boolean;
  rejectionReasons: string[];
  constraints: {
    constraintKey: string;
    scope: QuotaScope;
    dimension: QuotaDimension;
    limit: number;
    remaining: number;
    activeReservations: number;
    availableCapacity: number;
    demand: number;
    safetyMargin: number;
    passed: boolean;
    reason?: string;
  }[];
  reservationTTLMs: number;
}
