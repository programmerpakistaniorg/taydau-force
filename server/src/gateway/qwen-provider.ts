import { z } from 'zod';
import { config } from '../config.js';
import type {
  ModelGateway,
  ModelGatewayRequest,
  ModelGatewayResponse,
} from './model-gateway.js';
import { calculateCost, recordLlmCall } from '../services/cost-telemetry.js';

/**
 * Qwen / Alibaba Cloud DashScope provider.
 *
 * Uses the OpenAI-compatible chat/completions endpoint exposed by DashScope.
 * Enforces JSON output via response_format, validates with Zod, and retries
 * once with a repair prompt when validation fails.
 */

// ── Internal types ──────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DashScopeChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface DashScopeUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface DashScopeResponse {
  choices: DashScopeChoice[];
  usage: DashScopeUsage;
  error?: {
    message: string;
    code: string;
  };
}

// ── Provider implementation ─────────────────────────────────────────────────

export class QwenProvider implements ModelGateway {
  /**
   * Execute a model call with full telemetry, validation, and single-retry repair.
   */
  async call(request: ModelGatewayRequest): Promise<ModelGatewayResponse> {
    const startTime = Date.now();
    let retryCount = 0;

    // ── First attempt ──────────────────────────────────────────────────────
    const messages: ChatMessage[] = [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ];

    let rawContent: string;
    let inputTokens: number;
    let outputTokens: number;

    try {
      const result = await this.fetchCompletion(request, messages);
      rawContent = result.content;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.logTelemetry(request, {
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        latencyMs,
        retryCount: 0,
        success: false,
        errorMessage: errorMsg,
      });
      throw err;
    }

    // ── Parse + validate ───────────────────────────────────────────────────
    const parseResult = this.tryParseAndValidate(rawContent, request.responseSchema);

    if (parseResult.ok) {
      const latencyMs = Date.now() - startTime;
      const costUsd = calculateCost(request.modelId, inputTokens, outputTokens);
      await this.logTelemetry(request, {
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
        retryCount,
        success: true,
      });
      return {
        parsed: parseResult.value,
        raw: rawContent,
        usage: { inputTokens, outputTokens },
        latencyMs,
        modelId: request.modelId,
      };
    }

    // ── Retry with repair prompt ───────────────────────────────────────────
    retryCount = 1;
    const zodError = parseResult.error;
    const repairMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: rawContent,
      },
      {
        role: 'user',
        content: [
          'Your previous response failed schema validation.',
          `Validation error: ${zodError}`,
          'Please regenerate a corrected JSON response that strictly satisfies the schema.',
          'Return ONLY valid JSON — no commentary.',
        ].join('\n'),
      },
    ];

    let retryRaw: string;
    let retryInputTokens: number;
    let retryOutputTokens: number;

    try {
      const retryResult = await this.fetchCompletion(request, repairMessages);
      retryRaw = retryResult.content;
      retryInputTokens = retryResult.inputTokens;
      retryOutputTokens = retryResult.outputTokens;
    } catch (err) {
      // Log the retry attempt failure and surface the network error
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const partialCost = calculateCost(request.modelId, inputTokens, outputTokens);
      await this.logTelemetry(request, {
        inputTokens: inputTokens + 0,
        outputTokens: outputTokens + 0,
        costUsd: partialCost,
        latencyMs,
        retryCount,
        success: false,
        errorMessage: `Retry failed: ${errorMsg} | Original Zod error: ${zodError}`,
      });
      throw err;
    }

    // Accumulate tokens across both attempts
    inputTokens += retryInputTokens;
    outputTokens += retryOutputTokens;
    const latencyMs = Date.now() - startTime;
    const costUsd = calculateCost(request.modelId, inputTokens, outputTokens);

    const retryParseResult = this.tryParseAndValidate(retryRaw, request.responseSchema);

    if (retryParseResult.ok) {
      await this.logTelemetry(request, {
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
        retryCount,
        success: true,
      });
      return {
        parsed: retryParseResult.value,
        raw: retryRaw,
        usage: { inputTokens, outputTokens },
        latencyMs,
        modelId: request.modelId,
      };
    }

    // ── Both attempts failed ───────────────────────────────────────────────
    const finalError = [
      `Zod validation failed after ${retryCount} retry.`,
      `Original error: ${zodError}`,
      `Retry error: ${retryParseResult.error}`,
    ].join('\n');

    await this.logTelemetry(request, {
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      retryCount,
      success: false,
      errorMessage: finalError,
    });

    throw new QwenValidationError(finalError, retryRaw);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Execute a single chat/completions request against DashScope.
   * The base URL is always read from config — never hardcoded.
   */
  private async fetchCompletion(
    request: ModelGatewayRequest,
    messages: ChatMessage[]
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const url = `${config.alibaba.baseUrl}/chat/completions`;

    let httpRes: Response;
    try {
      httpRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.alibaba.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.modelId,
          messages,
          response_format: { type: 'json_object' },
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
          enable_thinking: false,  // disable thinking for structured JSON
        }),
      });
    } catch (networkErr) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new QwenNetworkError(`Network error calling ${url}: ${msg}`);
    }

    if (!httpRes.ok) {
      let bodyText: string;
      try {
        bodyText = await httpRes.text();
      } catch {
        bodyText = '<unable to read response body>';
      }
      throw new QwenHttpError(
        `HTTP ${httpRes.status} ${httpRes.statusText} from ${url}: ${bodyText}`,
        httpRes.status
      );
    }

    const json = (await httpRes.json()) as DashScopeResponse;

    if (json.error) {
      throw new QwenHttpError(
        `DashScope API error [${json.error.code}]: ${json.error.message}`,
        200
      );
    }

    const choice = json.choices?.[0];
    if (!choice) {
      throw new QwenHttpError('DashScope returned no choices', 200);
    }

    const content = choice.message?.content ?? '';
    return {
      content,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  }

  /**
   * Attempt JSON.parse + Zod validation.
   * Returns a discriminated result instead of throwing.
   */
  private tryParseAndValidate(
    raw: string,
    schema: z.ZodSchema
  ): { ok: true; value: unknown } | { ok: false; error: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const snippet = raw.slice(0, 300);
      return {
        ok: false,
        error: `JSON parse failure: ${e instanceof Error ? e.message : String(e)} | snippet: "${snippet}"`,
      };
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      return { ok: true, value: result.data };
    }

    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `Zod validation failed: ${issues}` };
  }

  /**
   * Fire-and-forget telemetry log. Swallows DB errors so they never
   * shadow the primary call result.
   */
  private async logTelemetry(
    request: ModelGatewayRequest,
    meta: {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      latencyMs: number;
      retryCount: number;
      success: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      await recordLlmCall({
        projectId: request.projectId,
        agentRole: request.agentRole,
        modelId: request.modelId,
        provider: 'qwen-dashscope',
        inputTokens: meta.inputTokens,
        outputTokens: meta.outputTokens,
        costUsd: meta.costUsd,
        latencyMs: meta.latencyMs,
        purpose: request.purpose,
        taskCode: request.taskCode,
        requirementCode: request.requirementCode,
        retryCount: meta.retryCount,
        success: meta.success,
        errorMessage: meta.errorMessage,
      });
    } catch (telemetryErr) {
      console.error(
        '[qwen-provider] Failed to record telemetry:',
        telemetryErr instanceof Error ? telemetryErr.message : telemetryErr
      );
    }
  }
}

// ── Custom error classes ─────────────────────────────────────────────────────

export class QwenNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QwenNetworkError';
  }
}

export class QwenHttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'QwenHttpError';
    this.statusCode = statusCode;
  }
}

export class QwenValidationError extends Error {
  rawContent: string;
  constructor(message: string, rawContent: string) {
    super(message);
    this.name = 'QwenValidationError';
    this.rawContent = rawContent;
  }
}
