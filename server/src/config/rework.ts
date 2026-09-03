/**
 * Authoritative Rework & Remediation Configuration for TayDau Force.
 * Single source of truth for retry bounds and no-progress thresholds.
 */
export const REWORK_CONFIG = {
  /**
   * Maximum autonomous Devon rework executions permitted per project before
   * truthfully halting in 'needs_attention' state.
   */
  MAX_AUTONOMOUS_REWORK_ATTEMPTS: 3,

  /**
   * Number of consecutive identical, ineffective revisions that trigger early
   * escalation to 'needs_attention' to prevent wasting API tokens.
   */
  NO_PROGRESS_THRESHOLD: 2,
} as const;
