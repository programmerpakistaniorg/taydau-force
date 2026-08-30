import { z } from 'zod';

/**
 * Abstract Model Gateway contract.
 * All LLM providers must implement this interface so that agent orchestration
 * can remain provider-agnostic while cost telemetry is captured uniformly.
 */

export interface ModelGatewayRequest {
  /** Model identifier used by the provider (e.g. "qwen-plus", "qwen-max") */
  modelId: string;
  /** System / role prompt establishing the agent persona */
  systemPrompt: string;
  /** User / task prompt with the actual instruction */
  userPrompt: string;
  /** Zod schema the response must satisfy */
  responseSchema: z.ZodSchema;
  /** Max tokens for the completion (provider default if omitted) */
  maxTokens?: number;
  /** Sampling temperature; defaults to 0.7 */
  temperature?: number;

  // ── Cost telemetry context ──────────────────────────────────────────────
  /** Project this call belongs to */
  projectId: string;
  /** Agent role that initiated the call (ba, pm, architect, engineer, qa…) */
  agentRole: string;
  /** Free-text purpose for observability dashboards */
  purpose?: string;
  /** Optional task code for traceability */
  taskCode?: string;
  /** Optional requirement code for traceability */
  requirementCode?: string;
}

export interface ModelGatewayResponse {
  /** Zod-validated parsed object */
  parsed: unknown;
  /** Raw text content returned by the model */
  raw: string;
  /** Token usage counters */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** End-to-end wall-clock latency in milliseconds */
  latencyMs: number;
  /** Echo of the modelId that was actually called */
  modelId: string;
}

export interface ModelGateway {
  call(request: ModelGatewayRequest): Promise<ModelGatewayResponse>;
}
