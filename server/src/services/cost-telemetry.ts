import { query } from '../db/pool.js';
import { config } from '../config.js';
import { MODEL_REGISTRY } from '../gateway/routing-registry.js';

/**
 * Cost telemetry service.
 * Records every LLM invocation to the llm_calls table and exposes
 * aggregation helpers for the Cost Governor and dashboards.
 */

export interface CostRecord {
  projectId: string;
  agentRole: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  purpose?: string;
  taskCode?: string;
  requirementCode?: string;
  retryCount: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Persist a single LLM call record.
 * Uses a parameterized query — never concatenate values into the SQL string.
 */
export async function recordLlmCall(record: CostRecord): Promise<void> {
  await query(
    `INSERT INTO llm_calls (
      project_id, agent_role, model_id, provider,
      input_tokens, output_tokens, cost_usd, latency_ms,
      purpose, task_code, requirement_code,
      retry_count, success, error_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      record.projectId,
      record.agentRole,
      record.modelId,
      record.provider,
      record.inputTokens,
      record.outputTokens,
      record.costUsd,
      record.latencyMs,
      record.purpose || null,
      record.taskCode || null,
      record.requirementCode || null,
      record.retryCount,
      record.success,
      record.errorMessage || null,
    ]
  );
}

/**
 * Compute the actual expected billable USD cost for a single call.
 * In FREE_ONLY mode, returns 0.00 for FREE_TIER and FREE_CREDITS models.
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (modelId === 'deterministic-generator' || modelId === 'local' || modelId === 'mock') {
    return 0;
  }

  const normalizedId = modelId.replace(/[\/\.]/g, '-');
  const regModel = MODEL_REGISTRY.find(
    (m) => m.modelId === modelId || m.modelId.replace(/[\/\.]/g, '-') === normalizedId
  );

  if (config.inferenceBillingMode === 'FREE_ONLY') {
    if (regModel && (regModel.billingClassification === 'FREE_TIER' || regModel.billingClassification === 'FREE_CREDITS')) {
      return 0.00;
    }
  }

  const pricing = config.pricing[modelId] ?? config.pricing[normalizedId];
  if (pricing) {
    return (
      (inputTokens / 1_000_000) * pricing.inputPer1M +
      (outputTokens / 1_000_000) * pricing.outputPer1M
    );
  }

  if (
    regModel &&
    regModel.inputCostPer1M !== null &&
    regModel.outputCostPer1M !== null &&
    regModel.pricingProvenance !== 'UNKNOWN'
  ) {
    return (
      (inputTokens / 1_000_000) * regModel.inputCostPer1M +
      (outputTokens / 1_000_000) * regModel.outputCostPer1M
    );
  }

  return 0.00;
}

/**
 * Compute reference economic value of tokens based on list pricing.
 */
export function calculateReferenceCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (modelId === 'deterministic-generator' || modelId === 'local' || modelId === 'mock') {
    return 0;
  }

  const normalizedId = modelId.replace(/[\/\.]/g, '-');
  const regModel = MODEL_REGISTRY.find(
    (m) => m.modelId === modelId || m.modelId.replace(/[\/\.]/g, '-') === normalizedId
  );

  if (regModel?.referenceCostPer1M) {
    return (
      (inputTokens / 1_000_000) * regModel.referenceCostPer1M.input +
      (outputTokens / 1_000_000) * regModel.referenceCostPer1M.output
    );
  }

  if (normalizedId.includes('120b')) {
    return (inputTokens / 1_000_000) * 0.60 + (outputTokens / 1_000_000) * 1.20;
  }
  if (normalizedId.includes('20b')) {
    return (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.30;
  }
  if (normalizedId.includes('27b')) {
    return (inputTokens / 1_000_000) * 0.80 + (outputTokens / 1_000_000) * 4.00;
  }
  if (normalizedId.includes('flash')) {
    return (inputTokens / 1_000_000) * 0.10 + (outputTokens / 1_000_000) * 0.40;
  }

  return (inputTokens / 1_000_000) * 0.30 + (outputTokens / 1_000_000) * 0.60;
}


/**
 * Returns the remaining budget (USD) for a project before the hard limit is hit.
 */
export async function getRemainingBudget(projectId: string): Promise<number> {
  const result = await query(
    'SELECT COALESCE(SUM(cost_usd), 0) AS total_cost FROM llm_calls WHERE project_id = $1',
    [projectId]
  );
  const totalCost = parseFloat(result.rows[0].total_cost as string);
  return config.budget.hardLimitUsd - totalCost;
}

/**
 * Aggregate cost summary for a project — shape mirrors the frontend CostSummary type.
 */
export async function getProjectCostSummary(projectId: string) {
  const summaryResult = await query(
    `SELECT
       COUNT(*)                                                     AS total_calls,
       COALESCE(SUM(cost_usd), 0)                                  AS total_cost,
       COALESCE(SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END), 0) AS retries
     FROM llm_calls
     WHERE project_id = $1`,
    [projectId]
  );

  const breakdownResult = await query(
    `SELECT
       agent_role,
       model_id,
       COUNT(*)                                    AS calls,
       COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
       COALESCE(SUM(cost_usd), 0)                 AS cost_usd
     FROM llm_calls
     WHERE project_id = $1
     GROUP BY agent_role, model_id
     ORDER BY agent_role`,
    [projectId]
  );

  const summary = summaryResult.rows[0];
  return {
    totalModelCalls: parseInt(summary.total_calls as string, 10),
    totalCostUsed: parseFloat(summary.total_cost as string),
    retriesCount: parseInt(summary.retries as string, 10),
    breakdown: breakdownResult.rows.map((row) => ({
      agentRole: row.agent_role as string,
      model: row.model_id as string,
      calls: parseInt(row.calls as string, 10),
      tokens: parseInt(row.total_tokens as string, 10).toLocaleString(),
      costUsd: parseFloat(row.cost_usd as string),
    })),
  };
}
