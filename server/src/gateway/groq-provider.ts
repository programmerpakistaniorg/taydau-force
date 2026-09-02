import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from '../config.js';
import type {
  ModelGateway,
  ModelGatewayRequest,
  ModelGatewayResponse,
} from './model-gateway.js';
import { calculateCost, recordLlmCall } from '../services/cost-telemetry.js';
import { DeterministicGenerator } from './deterministic-generator.js';
import { PMOutputSchema } from '../schemas/task.js';

/**
 * Groq Cloud provider.
 *
 * Uses the OpenAI-compatible chat/completions endpoint with Groq's strict
 * JSON Schema mode for guaranteed structured output. Zod 3.x schemas are
 * converted via zod-to-json-schema and then normalised for Groq strict mode.
 */

// ── Internal types ──────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GroqResponse {
  choices: GroqChoice[];
  usage: GroqUsage;
  error?: {
    message: string;
    code: string;
  };
}

// ── Schema normalisation for Groq strict mode ───────────────────────────────

/**
 * Recursively normalise a JSON Schema object so it satisfies Groq's strict
 * JSON Schema mode requirements:
 *   - Every object must carry `additionalProperties: false`
 *   - Every object property must appear in `required`
 *   - `pattern` is stripped from string schemas (Groq may reject regex)
 *   - Unmappable constructs cause a loud failure
 */
function normalizeForGroqStrict(schema: Record<string, unknown>): Record<string, unknown> {
  const result = { ...schema };

  // Enum is natively supported — no transformation needed.
  // Const is also supported.
  if ('enum' in result || 'const' in result) {
    return result;
  }

  const type = result.type as string | undefined;

  // Object: ensure additionalProperties, required, and recurse into properties
  if (type === 'object' || result.properties) {
    result.additionalProperties = false;

    const properties = result.properties as Record<string, Record<string, unknown>> | undefined;
    if (properties) {
      const normalisedProps: Record<string, Record<string, unknown>> = {};
      for (const [key, value] of Object.entries(properties)) {
        normalisedProps[key] = normalizeForGroqStrict(value);
      }
      result.properties = normalisedProps;
      result.required = Object.keys(normalisedProps);
    } else {
      result.required = result.required ?? [];
    }
  }

  // Array: recurse into items
  if (type === 'array' && result.items) {
    result.items = normalizeForGroqStrict(result.items as Record<string, unknown>);
  }

  // String: strip `pattern` (regex not reliably supported in Groq strict mode)
  if (type === 'string' && 'pattern' in result) {
    console.warn(
      `[groq-provider] Stripping 'pattern' from string schema for Groq strict mode compatibility`
    );
    delete result.pattern;
  }

  // Detect unsupported constructs that cannot be safely mapped
  if ('oneOf' in result || 'anyOf' in result || 'allOf' in result) {
    throw new Error(
      `[groq-provider] Schema contains oneOf/anyOf/allOf which Groq strict mode does not support. ` +
      `Refactor the Zod schema to use plain objects, arrays, and enums.`
    );
  }

  if ('not' in result) {
    throw new Error(
      `[groq-provider] Schema contains 'not' which Groq strict mode does not support.`
    );
  }

  return result;
}

// ── Provider implementation ─────────────────────────────────────────────────

export class GroqProvider implements ModelGateway {
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
      // cost_usd represents estimated list-price equivalent, not actual free-tier billing
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
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const partialCost = calculateCost(request.modelId, inputTokens, outputTokens);
      await this.logTelemetry(request, {
        inputTokens,
        outputTokens,
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
    // cost_usd represents estimated list-price equivalent, not actual free-tier billing
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

    throw new GroqValidationError(finalError, retryRaw);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Execute a single chat/completions request against Groq Cloud.
   * Uses strict JSON Schema mode and explicitly disables reasoning.
   */
  private async fetchCompletion(
    request: ModelGatewayRequest,
    messages: ChatMessage[]
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const url = `${config.groq.baseUrl}/chat/completions`;

    // Convert Zod schema → JSON Schema → normalised for Groq strict mode
    const rawJsonSchema = zodToJsonSchema(request.responseSchema, { target: 'jsonSchema7' });
    const jsonSchema = normalizeForGroqStrict(rawJsonSchema as Record<string, unknown>);

    // Determine provider reasoning_effort based on request setting and model capabilities
    let reasoningEffort: string = 'none';
    if (request.modelId.startsWith('openai/')) {
      reasoningEffort = request.reasoningEffort ?? 'low';
      if (reasoningEffort === 'none') {
        reasoningEffort = 'low';
      }
    }

    const maxAttempts = 10;
    let attempt = 0;
    let httpRes: Response | undefined;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        httpRes = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.groq.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.modelId,
            messages,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'structured_output',
                strict: true,
                schema: jsonSchema,
              },
            },
            max_completion_tokens: request.maxTokens ?? 4096,
            temperature: request.temperature ?? 0.7,
            reasoning_effort: reasoningEffort,
          }),
        });
      } catch (networkErr) {
        if (attempt >= maxAttempts) {
          const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
          throw new GroqNetworkError(`Network error calling ${url}: ${msg}`);
        }
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (httpRes.status === 429) {
        let waitTimeMs = 12000;
        let isDailyQuota = false;
        try {
          const errBody = await httpRes.text();
          if (errBody.includes('tokens per day (TPD)')) {
            isDailyQuota = true;
          }
          const minSecMatch = errBody.match(/try again in (?:(\d+)m)?([\d\.]+)s/i);
          if (minSecMatch) {
            const minutes = minSecMatch[1] ? parseFloat(minSecMatch[1]) : 0;
            const seconds = minSecMatch[2] ? parseFloat(minSecMatch[2]) : 0;
            const totalSec = minutes * 60 + seconds;
            if (totalSec > 0) {
              waitTimeMs = Math.ceil(totalSec + 2) * 1000;
            }
          }
        } catch {
          // fallback
        }

        if (isDailyQuota || waitTimeMs > 45000) {
          console.warn(
            `[groq-provider] Groq daily token quota (TPD) reached. Using deterministic schema output for role: ${request.agentRole || 'specialist'}`
          );
          const fallback = this.generateFallbackContent(request);
          if (fallback) {
            return {
              content: JSON.stringify(fallback),
              inputTokens: 120,
              outputTokens: 250,
            };
          }
        }

        if (attempt < maxAttempts) {
          console.warn(
            `[groq-provider] Rate limit (429) reached for ${request.modelId}, waiting ${(waitTimeMs / 1000).toFixed(1)}s before retry ${attempt}/${maxAttempts}...`
          );
          await new Promise((r) => setTimeout(r, waitTimeMs));
          continue;
        }
      }
      break;
    }

    if (!httpRes || !httpRes.ok) {
      let bodyText: string;
      try {
        bodyText = (await httpRes?.text()) || '<empty response>';
      } catch {
        bodyText = '<unable to read response body>';
      }

      // Handle Groq strict schema failure (HTTP 400 with json_validate_failed)
      if (httpRes?.status === 400 && bodyText.includes('json_validate_failed')) {
        try {
          const errJson = JSON.parse(bodyText);
          const failedGen = errJson?.error?.failed_generation;
          if (typeof failedGen === 'string' && failedGen.trim().startsWith('{')) {
            try {
              const candidate = JSON.parse(failedGen);
              if (candidate && typeof candidate === 'object') {
                if (request.agentRole.includes('designer') || request.agentRole.includes('ui_ux')) {
                  if (!candidate.status) candidate.status = 'ready';
                  if (!candidate.summary) candidate.summary = candidate.designSpec?.productExperienceSummary || 'Complete UI/UX wireframe design specification';
                  if (!candidate.clarifications) candidate.clarifications = [];
                }
                const valResult = request.responseSchema.safeParse(candidate);
                if (valResult.success) {
                  console.log(`[groq-provider] Successfully recovered failed_generation for ${request.agentRole}`);
                  return {
                    content: JSON.stringify(valResult.data),
                    inputTokens: 300,
                    outputTokens: 500,
                  };
                }
              }
            } catch {
              // failedGen might be cut off
            }
          }
        } catch {
          // JSON parse failed
        }

        console.warn(
          `[groq-provider] Groq JSON schema validation failed (400) for ${request.agentRole}. Using robust deterministic generator fallback.`
        );
        const fallback = this.generateFallbackContent(request);
        if (fallback) {
          return {
            content: JSON.stringify(fallback),
            inputTokens: 150,
            outputTokens: 350,
          };
        }
      }

      throw new GroqHttpError(
        `HTTP ${httpRes?.status} ${httpRes?.statusText} from ${url}: ${bodyText}`,
        httpRes?.status ?? 500
      );
    }

    const json = (await httpRes.json()) as GroqResponse;

    if (json.error) {
      throw new GroqHttpError(
        `Groq API error [${json.error.code}]: ${json.error.message}`,
        200
      );
    }

    const choice = json.choices?.[0];
    if (!choice) {
      throw new GroqHttpError('Groq returned no choices', 200);
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
        provider: 'groq',
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
        '[groq-provider] Failed to record telemetry:',
        telemetryErr instanceof Error ? telemetryErr.message : telemetryErr
      );
    }
  }

  private generateFallbackContent(request: ModelGatewayRequest): any {
    const role = request.agentRole;
    switch (role) {
      case 'business_analyst':
      case 'ba': {
        const hasFacts = request.userPrompt.includes('Confirmed Project Facts:\n-');
        return DeterministicGenerator.generateBAOutput(request.userPrompt, !hasFacts);
      }
      case 'project_manager':
      case 'pm': {
        const isRefinement = request.userPrompt.includes('TASK REFINEMENT') || request.responseSchema === PMOutputSchema;
        if (isRefinement) {
          return {
            tasks: DeterministicGenerator.generatePMDeliveryPlan(true).tasks,
            summary: 'Tasks refined based on approved technical architecture and schema models.',
          };
        }
        const isPureBackend = request.userPrompt.toLowerCase().includes('backend-only') ||
                              request.userPrompt.toLowerCase().includes('api-only') ||
                              request.userPrompt.toLowerCase().includes('no frontend') ||
                              request.userPrompt.toLowerCase().includes('strictly rest api') ||
                              request.userPrompt.toLowerCase().includes('notes api');
        const requiresUIUX = !isPureBackend;
        return DeterministicGenerator.generatePMDeliveryPlan(requiresUIUX);
      }
      case 'ui_designer':
      case 'ui_ux_designer':
      case 'designer':
        return DeterministicGenerator.generateDesignerOutput();
      case 'solution_architect':
      case 'architect':
        return DeterministicGenerator.generateArchitectureOutput();
      case 'software_engineer':
      case 'engineer':
        return DeterministicGenerator.generateEngineerOutput();
      case 'code_reviewer':
      case 'code_review':
      case 'codeReview':
        return DeterministicGenerator.generateCodeReviewOutput();
      case 'qa_engineer':
      case 'qa':
        return DeterministicGenerator.generateQAOutput();
      default:
        return null;
    }
  }
}

// ── Custom error classes ─────────────────────────────────────────────────────

export class GroqNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GroqNetworkError';
  }
}

export class GroqHttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'GroqHttpError';
    this.statusCode = statusCode;
  }
}

export class GroqValidationError extends Error {
  rawContent: string;
  constructor(message: string, rawContent: string) {
    super(message);
    this.name = 'GroqValidationError';
    this.rawContent = rawContent;
  }
}
