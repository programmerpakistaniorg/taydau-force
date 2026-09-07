import crypto from 'crypto';
import type { ModelCapability } from '../schemas/routing.js';
import type {
  QuotaConstraint,
  QuotaDimension,
  QuotaScope,
  QuotaSource,
  QuotaWindowType,
  TaskQuotaDemand,
  QuotaReservation,
  ReservationResult,
  ReservationState,
  QuotaSignal,
  NormalizedQuotaSignal,
  RouteAdmissionEvaluation,
} from '../schemas/quota.js';

const SOURCE_PRECEDENCE: Record<QuotaSource, number> = {
  LIVE_RESPONSE_HEADER: 7,
  PROVIDER_ERROR_SIGNAL: 6,
  PROVIDER_QUOTA_API: 5,
  TRUSTED_ACCOUNT_CONFIG: 4,
  STATIC_FALLBACK: 3,
  POLICY_ADMISSION_CAP: 2,
  UNKNOWN: 1,
};

export class QuotaGovernor {
  private static instance: QuotaGovernor;

  // Generic constraint map keyed by "scope:scopeId:dimension"
  private constraints = new Map<string, QuotaConstraint>();

  // Active reservations keyed by reservationId
  private reservations = new Map<string, QuotaReservation>();

  // Safety buffer configuration
  private safetyMarginPercent = 0.05; // 5% token safety buffer
  private minTokenMargin = 100; // minimum tokens safety margin
  private minRequestMargin = 0; // request buffer

  private constructor() {
    this.initializeDefaultConstraints();
  }

  static getInstance(): QuotaGovernor {
    if (!this.instance) {
      this.instance = new QuotaGovernor();
    }
    return this.instance;
  }

  /**
   * Builds a normalized constraint key.
   */
  public getConstraintKey(scope: QuotaScope, scopeId: string, dimension: QuotaDimension): string {
    return `${scope}:${scopeId}:${dimension}`;
  }

  /**
   * Initializes default constraints based on provider documentation and tier configs.
   */
  private initializeDefaultConstraints(): void {
    const now = Date.now();

    // ── Groq Organization & Model Defaults ─────────────────────────────────
    // Groq Organization Daily TPD
    this.setConstraint({
      scope: 'ORGANIZATION',
      scopeId: 'org:groq',
      dimension: 'TPD',
      limit: 200_000,
      remaining: 200_000,
      windowType: 'DAILY_CALENDAR',
      resetAt: this.getNextMidnightUtc(now),
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // Groq Organization RPM
    this.setConstraint({
      scope: 'ORGANIZATION',
      scopeId: 'org:groq',
      dimension: 'RPM',
      limit: 30,
      remaining: 30,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // Groq GPT-OSS 120B Model TPM
    this.setConstraint({
      scope: 'MODEL',
      scopeId: 'model:groq/openai/gpt-oss-120b',
      dimension: 'TPM',
      limit: 8_000,
      remaining: 8_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // Groq GPT-OSS 20B Model TPM
    this.setConstraint({
      scope: 'MODEL',
      scopeId: 'model:groq/openai/gpt-oss-20b',
      dimension: 'TPM',
      limit: 8_000,
      remaining: 8_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // Groq Qwen 3.8 27B Model TPM
    this.setConstraint({
      scope: 'MODEL',
      scopeId: 'model:groq/qwen/qwen3.8-27b',
      dimension: 'TPM',
      limit: 8_000,
      remaining: 8_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // Groq Llama 3.3 70B Model TPM
    this.setConstraint({
      scope: 'MODEL',
      scopeId: 'model:groq/llama-3.3-70b-versatile',
      dimension: 'TPM',
      limit: 8_000,
      remaining: 8_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // ── Google AI Studio / Gemini Project Defaults ────────────────────────
    this.setConstraint({
      scope: 'PROJECT',
      scopeId: 'project:gemini',
      dimension: 'RPM',
      limit: 15,
      remaining: 15,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });
    this.setConstraint({
      scope: 'PROJECT',
      scopeId: 'project:gemini',
      dimension: 'RPD',
      limit: 1500,
      remaining: 1500,
      windowType: 'DAILY_CALENDAR',
      resetAt: this.getNextMidnightUtc(now),
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });
    this.setConstraint({
      scope: 'PROJECT',
      scopeId: 'project:gemini',
      dimension: 'TPM',
      limit: 1_000_000,
      remaining: 1_000_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // ── Mistral Account Defaults ──────────────────────────────────────────
    this.setConstraint({
      scope: 'ACCOUNT',
      scopeId: 'account:mistral',
      dimension: 'RPM',
      limit: 10,
      remaining: 10,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // ── Experiential Account Defaults ─────────────────────────────────────
    this.setConstraint({
      scope: 'ACCOUNT',
      scopeId: 'account:experiential',
      dimension: 'RPM',
      limit: 20,
      remaining: 20,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });
    this.setConstraint({
      scope: 'ACCOUNT',
      scopeId: 'account:experiential',
      dimension: 'TPM',
      limit: 40_000,
      remaining: 40_000,
      windowType: 'SLIDING_MINUTE',
      resetAt: now + 60_000,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });

    // ── Local llama.cpp Capacity Default ──────────────────────────────────
    this.setConstraint({
      scope: 'LOCAL_CAPACITY',
      scopeId: 'local:llamacpp',
      dimension: 'CONCURRENCY',
      limit: 1, // Single GPU / CPU process serialization
      remaining: 1,
      windowType: 'CONCURRENT_IN_FLIGHT',
      resetAt: Infinity,
      source: 'STATIC_FALLBACK',
      observedAt: now,
    });
  }

  private getNextMidnightUtc(fromMs: number): number {
    const d = new Date(fromMs);
    d.setUTCHours(24, 0, 0, 0);
    return d.getTime();
  }

  public setConstraint(constraint: QuotaConstraint): void {
    const key = this.getConstraintKey(constraint.scope, constraint.scopeId, constraint.dimension);
    this.constraints.set(key, constraint);
  }

  public getConstraint(scope: QuotaScope, scopeId: string, dimension: QuotaDimension): QuotaConstraint | undefined {
    const key = this.getConstraintKey(scope, scopeId, dimension);
    return this.constraints.get(key);
  }

  public getAllConstraints(): QuotaConstraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Maps a ModelCapability to all applicable QuotaConstraints.
   */
  public getApplicableConstraints(route: ModelCapability): QuotaConstraint[] {
    const applicable: QuotaConstraint[] = [];
    const now = Date.now();

    if (route.provider === 'groq') {
      // Org TPD + Org RPM + Model TPM
      const orgTpd = this.getOrCreateConstraint('ORGANIZATION', 'org:groq', 'TPD', 200_000, 'DAILY_CALENDAR', this.getNextMidnightUtc(now));
      const orgRpm = this.getOrCreateConstraint('ORGANIZATION', 'org:groq', 'RPM', 30, 'SLIDING_MINUTE', now + 60_000);
      const modelTpm = this.getOrCreateConstraint(
        'MODEL',
        `model:groq/${route.modelId}`,
        'TPM',
        route.accountTpmLimit || 8_000,
        'SLIDING_MINUTE',
        now + 60_000
      );
      applicable.push(orgTpd, orgRpm, modelTpm);
    } else if (route.provider === 'gemini') {
      const projRpm = this.getOrCreateConstraint('PROJECT', 'project:gemini', 'RPM', 15, 'SLIDING_MINUTE', now + 60_000);
      const projRpd = this.getOrCreateConstraint('PROJECT', 'project:gemini', 'RPD', 1500, 'DAILY_CALENDAR', this.getNextMidnightUtc(now));
      const projTpm = this.getOrCreateConstraint('PROJECT', 'project:gemini', 'TPM', 1_000_000, 'SLIDING_MINUTE', now + 60_000);
      applicable.push(projRpm, projRpd, projTpm);
    } else if (route.provider === 'nvidia') {
      const acctRpm = this.getOrCreateConstraint('ACCOUNT', 'account:nvidia', 'RPM', 10, 'SLIDING_MINUTE', now + 60_000);
      const modelTpm = this.getOrCreateConstraint(
        'MODEL',
        `model:nvidia/${route.modelId}`,
        'TPM',
        route.accountTpmLimit || 10_000,
        'SLIDING_MINUTE',
        now + 60_000
      );
      applicable.push(acctRpm, modelTpm);
    } else if (route.provider === 'mistral') {
      const acctRpm = this.getOrCreateConstraint('ACCOUNT', 'account:mistral', 'RPM', 10, 'SLIDING_MINUTE', now + 60_000);
      applicable.push(acctRpm);
    } else if (route.provider === 'openrouter') {
      const acctRpm = this.getOrCreateConstraint('ACCOUNT', 'account:openrouter', 'RPM', 20, 'SLIDING_MINUTE', now + 60_000);
      const acctRpd = this.getOrCreateConstraint('ACCOUNT', 'account:openrouter', 'RPD', 200, 'DAILY_CALENDAR', this.getNextMidnightUtc(now));
      applicable.push(acctRpm, acctRpd);
    } else if (route.provider === 'experiential') {
      const acctRpm = this.getOrCreateConstraint('ACCOUNT', 'account:experiential', 'RPM', 20, 'SLIDING_MINUTE', now + 60_000);
      const acctTpm = this.getOrCreateConstraint('ACCOUNT', 'account:experiential', 'TPM', 40_000, 'SLIDING_MINUTE', now + 60_000);
      applicable.push(acctRpm, acctTpm);
    } else if (route.provider === 'local_llamacpp') {
      const localConc = this.getOrCreateConstraint('LOCAL_CAPACITY', 'local:llamacpp', 'CONCURRENCY', 1, 'CONCURRENT_IN_FLIGHT', Infinity);
      applicable.push(localConc);
    } else {
      // Explicit conservative policy for unlisted/unknown provider routes (never universal assumption)
      if (route.accountTpmLimit) {
        const modelTpm = this.getOrCreateConstraint(
          'MODEL',
          `model:${route.provider}/${route.modelId}`,
          'TPM',
          route.accountTpmLimit,
          'FIXED_RESET_WINDOW',
          now + 60_000,
          'TRUSTED_ACCOUNT_CONFIG'
        );
        applicable.push(modelTpm);
      } else {
        const fallbackRpm = this.getOrCreateConstraint(
          'ACCOUNT',
          `account:${route.provider}`,
          'RPM',
          5,
          'FIXED_RESET_WINDOW',
          now + 60_000,
          'POLICY_ADMISSION_CAP',
          true
        );
        const fallbackTpm = this.getOrCreateConstraint(
          'MODEL',
          `model:${route.provider}/${route.modelId}`,
          'TPM',
          3_000,
          'FIXED_RESET_WINDOW',
          now + 60_000,
          'POLICY_ADMISSION_CAP',
          true
        );
        applicable.push(fallbackRpm, fallbackTpm);
      }
    }

    return applicable;
  }

  private getOrCreateConstraint(
    scope: QuotaScope,
    scopeId: string,
    dimension: QuotaDimension,
    defaultLimit: number,
    windowType: QuotaWindowType,
    defaultResetAt: number,
    source: QuotaSource = 'STATIC_FALLBACK',
    isPolicyCap?: boolean
  ): QuotaConstraint {
    const key = this.getConstraintKey(scope, scopeId, dimension);
    let constraint = this.constraints.get(key);
    if (!constraint) {
      const now = Date.now();
      constraint = {
        scope,
        scopeId,
        dimension,
        limit: defaultLimit,
        remaining: defaultLimit,
        windowType,
        resetAt: defaultResetAt,
        source,
        observedAt: now,
        isPolicyCap,
      };
      this.constraints.set(key, constraint);
    }
    return constraint;
  }

  /**
   * Refreshes / refills a constraint if its reset window has expired.
   */
  private refreshConstraintIfExpired(constraint: QuotaConstraint, now: number): void {
    if (constraint.windowType === 'CONCURRENT_IN_FLIGHT') {
      return; // Concurrency does not auto-refill on time; it is managed by active in-flight count
    }

    if (now >= constraint.resetAt) {
      // Replenish full quota
      constraint.remaining = constraint.limit;
      if (
        constraint.windowType === 'SLIDING_MINUTE' ||
        constraint.windowType === 'FIXED_MINUTE' ||
        constraint.windowType === 'FIXED_RESET_WINDOW' ||
        constraint.windowType === 'PROVIDER_REPORTED_RESET'
      ) {
        constraint.resetAt = now + 60_000;
      } else if (constraint.windowType === 'DAILY_CALENDAR') {
        constraint.resetAt = this.getNextMidnightUtc(now);
      }
      constraint.observedAt = now;
    }
  }

  /**
   * Computes current active reservations on a specific constraint.
   */
  public getActiveReservationDemand(constraintKey: string, dimension: QuotaDimension): number {
    this.reapExpiredReservations();
    let totalReserved = 0;

    for (const res of this.reservations.values()) {
      if (res.state !== 'RESERVED' && res.state !== 'COMMITTED') {
        continue;
      }

      const match = res.allocatedConstraints.find((c) => c.constraintKey === constraintKey);
      if (match) {
        if (dimension === 'TPM' || dimension === 'TPD') {
          totalReserved += match.tokensReserved;
        } else if (dimension === 'RPM' || dimension === 'RPD') {
          totalReserved += match.requestsReserved;
        } else if (dimension === 'CONCURRENCY') {
          totalReserved += match.concurrencyReserved;
        }
      }
    }

    return totalReserved;
  }

  /**
   * Evaluates admission eligibility for a route without making reservations (Advisory).
   */
  public checkEligibility(route: ModelCapability, demand: TaskQuotaDemand): RouteAdmissionEvaluation {
    const now = Date.now();
    this.reapExpiredReservations();
    const applicable = this.getApplicableConstraints(route);
    const rejectionReasons: string[] = [];
    const constraintEvals: RouteAdmissionEvaluation['constraints'] = [];

    const dynamicTtlMs = (demand.timeoutMs || 60_000) + 30_000;

    for (const c of applicable) {
      this.refreshConstraintIfExpired(c, now);
      const constraintKey = this.getConstraintKey(c.scope, c.scopeId, c.dimension);
      const activeReserved = this.getActiveReservationDemand(constraintKey, c.dimension);

      let demandValue = 0;
      let safetyMargin = 0;

      if (c.dimension === 'TPM' || c.dimension === 'TPD') {
        demandValue = demand.totalTokens;
        safetyMargin = Math.max(this.minTokenMargin, Math.round(c.limit * this.safetyMarginPercent));
      } else if (c.dimension === 'RPM' || c.dimension === 'RPD') {
        demandValue = demand.requests || 1;
        safetyMargin = this.minRequestMargin;
      } else if (c.dimension === 'CONCURRENCY') {
        demandValue = demand.concurrencyUnits || 1;
        safetyMargin = 0;
      }

      const availableCapacity = c.remaining - activeReserved - safetyMargin;
      const passed = availableCapacity >= demandValue;

      let failureReason: string | undefined;
      if (!passed) {
        const cooldownSec = Math.max(1, Math.round((c.resetAt - now) / 1000));
        failureReason = `QUOTA_EXCEEDED on ${constraintKey} (req: ${demandValue}, available: ${availableCapacity}/${c.limit}, resetIn: ${cooldownSec}s)`;
        rejectionReasons.push(failureReason);
      }

      constraintEvals.push({
        constraintKey,
        scope: c.scope,
        dimension: c.dimension,
        limit: c.limit,
        remaining: c.remaining,
        activeReservations: activeReserved,
        availableCapacity,
        demand: demandValue,
        safetyMargin,
        passed,
        reason: failureReason,
      });
    }

    return {
      eligible: rejectionReasons.length === 0,
      rejectionReasons,
      constraints: constraintEvals,
      reservationTTLMs: dynamicTtlMs,
    };
  }

  /**
   * Synchronously and atomically checks all applicable constraints and creates a reservation.
   * ALL-OR-NOTHING: If any constraint fails, zero reservations remain.
   */
  public tryReserve(
    route: ModelCapability,
    demand: TaskQuotaDemand,
    context?: {
      workflowRunId?: string;
      stepRunId?: string;
      invocationId?: string;
      attempt?: number;
    }
  ): ReservationResult {
    const now = Date.now();
    this.reapExpiredReservations();
    const applicable = this.getApplicableConstraints(route);

    if (applicable.length === 0) {
      // Unconstrained route (e.g. mock or untracked)
      const reservationId = crypto.randomUUID();
      const reservation: QuotaReservation = {
        reservationId,
        routeKey: `${route.provider}:${route.modelId}`,
        provider: route.provider,
        modelId: route.modelId,
        demand,
        state: 'RESERVED',
        createdAt: now,
        expiresAt: now + (demand.timeoutMs || 60_000) + 30_000,
        allocatedConstraints: [],
        workflowRunId: context?.workflowRunId,
        stepRunId: context?.stepRunId,
        invocationId: context?.invocationId,
        attempt: context?.attempt,
      };
      this.reservations.set(reservationId, reservation);
      return { success: true, reservation };
    }

    const plannedAllocations: QuotaReservation['allocatedConstraints'] = [];

    // Check every constraint in atomic sequence
    for (const c of applicable) {
      this.refreshConstraintIfExpired(c, now);
      const constraintKey = this.getConstraintKey(c.scope, c.scopeId, c.dimension);
      const activeReserved = this.getActiveReservationDemand(constraintKey, c.dimension);

      let demandValue = 0;
      let safetyMargin = 0;

      if (c.dimension === 'TPM' || c.dimension === 'TPD') {
        demandValue = demand.totalTokens;
        safetyMargin = Math.max(this.minTokenMargin, Math.round(c.limit * this.safetyMarginPercent));
      } else if (c.dimension === 'RPM' || c.dimension === 'RPD') {
        demandValue = demand.requests || 1;
        safetyMargin = this.minRequestMargin;
      } else if (c.dimension === 'CONCURRENCY') {
        demandValue = demand.concurrencyUnits || 1;
        safetyMargin = 0;
      }

      const availableCapacity = c.remaining - activeReserved - safetyMargin;

      if (availableCapacity < demandValue) {
        // ALL-OR-NOTHING ABORT: No partial reservations committed
        const cooldownRemainingMs = Math.max(0, c.resetAt - now);
        return {
          success: false,
          rejectionReason: `QUOTA_EXCEEDED: ${constraintKey} requires ${demandValue} but available capacity is ${availableCapacity} (limit: ${c.limit}, remaining: ${c.remaining}, activeReserved: ${activeReserved}, safetyMargin: ${safetyMargin})`,
          violatingConstraint: c,
          cooldownRemainingMs,
        };
      }

      plannedAllocations.push({
        constraintKey,
        tokensReserved: c.dimension === 'TPM' || c.dimension === 'TPD' ? demandValue : 0,
        requestsReserved: c.dimension === 'RPM' || c.dimension === 'RPD' ? demandValue : 0,
        concurrencyReserved: c.dimension === 'CONCURRENCY' ? demandValue : 0,
      });
    }

    // Dynamic TTL tied to invocation timeout + safety grace (e.g. 30s)
    const timeoutGraceMs = (demand.timeoutMs || 60_000) + 30_000;
    const reservationId = crypto.randomUUID();

    const reservation: QuotaReservation = {
      reservationId,
      routeKey: `${route.provider}:${route.modelId}`,
      provider: route.provider,
      modelId: route.modelId,
      demand,
      state: 'RESERVED',
      createdAt: now,
      expiresAt: now + timeoutGraceMs,
      allocatedConstraints: plannedAllocations,
      workflowRunId: context?.workflowRunId,
      stepRunId: context?.stepRunId,
      invocationId: context?.invocationId,
      attempt: context?.attempt,
    };

    this.reservations.set(reservationId, reservation);

    return {
      success: true,
      reservation,
    };
  }

  /**
   * Commits an active reservation when request dispatch begins.
   */
  public commitReservation(reservationId: string): boolean {
    const res = this.reservations.get(reservationId);
    if (!res || res.state !== 'RESERVED') return false;
    res.state = 'COMMITTED';
    return true;
  }

  /**
   * Reconciles a completed request:
   * - Releases active reservation ownership
   * - If authoritative header signal exists, synchronizes matching constraint state with precedence
   * - Otherwise updates local remaining estimate using actual token usage
   */
  public reconcileReservation(
    reservationId: string,
    actualUsage: { inputTokens: number; outputTokens: number },
    signal?: QuotaSignal | NormalizedQuotaSignal | NormalizedQuotaSignal[]
  ): void {
    const res = this.reservations.get(reservationId);
    if (res) {
      res.state = 'RECONCILED';
      this.reservations.delete(reservationId);
    }

    const now = Date.now();
    const actualTotalTokens = actualUsage.inputTokens + actualUsage.outputTokens;

    if (signal) {
      this.recordSignal(signal);
    } else if (res) {
      // Apply local estimate reduction to allocated constraints
      for (const alloc of res.allocatedConstraints) {
        const constraint = this.constraints.get(alloc.constraintKey);
        if (constraint) {
          if (constraint.dimension === 'TPM' || constraint.dimension === 'TPD') {
            constraint.remaining = Math.max(0, constraint.remaining - actualTotalTokens);
          } else if (constraint.dimension === 'RPM' || constraint.dimension === 'RPD') {
            constraint.remaining = Math.max(0, constraint.remaining - 1);
          }
          constraint.observedAt = now;
        }
      }
    }
  }

  /**
   * Releases an active reservation on error, abort, or timeout.
   * If unknownConsumption is true (e.g. client timeout), does not restore provider token estimate.
   */
  public releaseReservation(
    reservationId: string,
    reason: 'error' | 'timeout' | 'aborted',
    options?: { unknownConsumption?: boolean }
  ): void {
    const res = this.reservations.get(reservationId);
    if (!res) return;

    res.state = 'RELEASED';
    this.reservations.delete(reservationId);

    const now = Date.now();

    if (options?.unknownConsumption) {
      // Conservative: assume provider may have consumed tokens / request on timeout
      for (const alloc of res.allocatedConstraints) {
        const constraint = this.constraints.get(alloc.constraintKey);
        if (constraint) {
          if (constraint.dimension === 'TPM' || constraint.dimension === 'TPD') {
            constraint.remaining = Math.max(0, constraint.remaining - res.demand.totalTokens);
            constraint.observedAt = now;
          } else if (constraint.dimension === 'RPM' || constraint.dimension === 'RPD') {
            constraint.remaining = Math.max(0, constraint.remaining - (res.demand.requests || 1));
            constraint.observedAt = now;
          }
        }
      }
    }
  }

  /**
   * Ingests a single discrete normalized quota signal for a specific scope and dimension.
   */
  public recordNormalizedSignal(sig: NormalizedQuotaSignal): void {
    const key = this.getConstraintKey(sig.scope, sig.scopeId, sig.dimension);
    let existing = this.constraints.get(key);
    const now = sig.observedAt || Date.now();
    const incomingRank = SOURCE_PRECEDENCE[sig.source] || 1;

    if (existing) {
      const existingRank = SOURCE_PRECEDENCE[existing.source] || 1;
      if (incomingRank > existingRank || (incomingRank === existingRank && now >= existing.observedAt)) {
        if (sig.limit !== undefined) existing.limit = sig.limit;
        if (sig.remaining !== undefined) existing.remaining = sig.remaining;
        if (sig.resetAt !== undefined) {
          existing.resetAt = sig.resetAt;
        } else if (sig.resetInSeconds !== undefined) {
          existing.resetAt = now + sig.resetInSeconds * 1000;
        }
        existing.source = sig.source;
        existing.observedAt = now;
      }
    } else {
      existing = {
        scope: sig.scope,
        scopeId: sig.scopeId,
        dimension: sig.dimension,
        limit: sig.limit ?? 1000,
        remaining: sig.remaining ?? 1000,
        windowType: sig.dimension === 'TPD' || sig.dimension === 'RPD' ? 'DAILY_CALENDAR' : 'SLIDING_MINUTE',
        resetAt: sig.resetAt ?? (sig.resetInSeconds ? now + sig.resetInSeconds * 1000 : now + 60_000),
        source: sig.source,
        observedAt: now,
      };
      this.constraints.set(key, existing);
    }
  }

  /**
   * Ingests authoritative quota signal(s) with per-dimension precedence and freshness rules.
   */
  public recordSignal(signal: QuotaSignal | NormalizedQuotaSignal | NormalizedQuotaSignal[]): void {
    if (Array.isArray(signal)) {
      for (const s of signal) {
        this.recordNormalizedSignal(s);
      }
      return;
    }

    if ('scope' in signal && 'scopeId' in signal) {
      this.recordNormalizedSignal(signal as NormalizedQuotaSignal);
      return;
    }

    const legacySignal = signal as QuotaSignal;
    const now = legacySignal.observedAt || Date.now();

    for (const [dimKey, dimData] of Object.entries(legacySignal.constraints)) {
      const dimension = dimKey as QuotaDimension;
      if (!dimData) continue;

      // Find matching constraints for this provider / model / dimension
      for (const [key, existing] of this.constraints.entries()) {
        const matchesProvider =
          (existing.scope === 'ORGANIZATION' && existing.scopeId === `org:${legacySignal.provider}`) ||
          (existing.scope === 'PROJECT' && existing.scopeId === `project:${legacySignal.provider}`) ||
          (existing.scope === 'ACCOUNT' && existing.scopeId === `account:${legacySignal.provider}`);

        const matchesModel =
          legacySignal.modelId &&
          existing.scope === 'MODEL' &&
          existing.scopeId === `model:${legacySignal.provider}/${legacySignal.modelId}`;

        if ((matchesProvider || matchesModel) && existing.dimension === dimension) {
          const incomingRank = SOURCE_PRECEDENCE[legacySignal.source] || 1;
          const existingRank = SOURCE_PRECEDENCE[existing.source] || 1;

          // Precedence rule: higher rank wins, or same rank with fresher timestamp
          if (incomingRank > existingRank || (incomingRank === existingRank && now >= existing.observedAt)) {
            if (dimData.limit !== undefined) {
              existing.limit = dimData.limit;
            }
            if (dimData.remaining !== undefined) {
              existing.remaining = dimData.remaining;
            }
            if (dimData.resetAt !== undefined) {
              existing.resetAt = dimData.resetAt;
            } else if (dimData.resetInSeconds !== undefined) {
              existing.resetAt = now + dimData.resetInSeconds * 1000;
            }
            existing.source = legacySignal.source;
            existing.observedAt = now;
          }
        }
      }
    }

    // Rate limit signal handling (429 or 413 TPM)
    if (legacySignal.isRateLimit || legacySignal.isDailyLimit) {
      for (const [key, existing] of this.constraints.entries()) {
        const matchesProvider =
          (existing.scope === 'ORGANIZATION' && existing.scopeId === `org:${legacySignal.provider}`) ||
          (existing.scope === 'PROJECT' && existing.scopeId === `project:${legacySignal.provider}`) ||
          (existing.scope === 'ACCOUNT' && existing.scopeId === `account:${legacySignal.provider}`);

        const matchesModel =
          legacySignal.modelId &&
          existing.scope === 'MODEL' &&
          existing.scopeId === `model:${legacySignal.provider}/${legacySignal.modelId}`;

        if (matchesProvider || matchesModel) {
          if (legacySignal.isDailyLimit && existing.dimension === 'TPD') {
            existing.remaining = 0;
            existing.source = legacySignal.source;
            existing.observedAt = now;
          } else if (legacySignal.isRateLimit && (existing.dimension === 'TPM' || existing.dimension === 'RPM')) {
            existing.remaining = 0;
            existing.source = legacySignal.source;
            existing.observedAt = now;
          }
        }
      }
    }
  }

  /**
   * Reaps expired reservations to prevent leaks on worker abort or unexpected failure.
   */
  public reapExpiredReservations(): number {
    const now = Date.now();
    let reapedCount = 0;

    for (const [id, res] of this.reservations.entries()) {
      if (now > res.expiresAt) {
        res.state = 'EXPIRED';
        this.reservations.delete(id);
        reapedCount++;
      }
    }

    return reapedCount;
  }

  /**
   * Diagnostic snapshot of all constraints, active reservations, and capacity metrics.
   */
  public getSnapshot(): {
    constraints: QuotaConstraint[];
    activeReservations: QuotaReservation[];
    reapedCount: number;
  } {
    const reaped = this.reapExpiredReservations();
    return {
      constraints: this.getAllConstraints(),
      activeReservations: Array.from(this.reservations.values()),
      reapedCount: reaped,
    };
  }

  /**
   * Sanitized diagnostic snapshot safe for administrative/dev inspection.
   * Guarantees zero leakage of API keys, raw authorization headers, secrets, or prompts.
   */
  public getSanitizedSnapshot(): {
    constraints: {
      scope: QuotaScope;
      scopeId: string;
      dimension: QuotaDimension;
      limit: number;
      remaining: number;
      windowType: QuotaWindowType;
      resetAt: number;
      source: QuotaSource;
      observedAt: number;
    }[];
    activeReservations: {
      reservationId: string;
      routeKey: string;
      provider: string;
      modelId: string;
      state: ReservationState;
      createdAt: number;
      expiresAt: number;
      allocatedConstraints: QuotaReservation['allocatedConstraints'];
      workflowRunId?: string;
      stepRunId?: string;
      invocationId?: string;
      attempt?: number;
    }[];
    reapedCount: number;
  } {
    const reaped = this.reapExpiredReservations();
    return {
      constraints: this.getAllConstraints().map((c) => ({
        scope: c.scope,
        scopeId: c.scopeId,
        dimension: c.dimension,
        limit: c.limit,
        remaining: c.remaining,
        windowType: c.windowType,
        resetAt: c.resetAt,
        source: c.source,
        observedAt: c.observedAt,
      })),
      activeReservations: Array.from(this.reservations.values()).map((r) => ({
        reservationId: r.reservationId,
        routeKey: r.routeKey,
        provider: r.provider,
        modelId: r.modelId,
        state: r.state,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        allocatedConstraints: r.allocatedConstraints,
        workflowRunId: r.workflowRunId,
        stepRunId: r.stepRunId,
        invocationId: r.invocationId,
        attempt: r.attempt,
      })),
      reapedCount: reaped,
    };
  }

  /**
   * Resets all constraints to clean initial state (used for testing and restart simulations).
   */
  public resetToCleanState(): void {
    this.constraints.clear();
    this.reservations.clear();
    this.initializeDefaultConstraints();
  }
}

export const quotaGovernor = QuotaGovernor.getInstance();
