import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from '../config.js';
import type {
  ModelGateway,
  ModelGatewayRequest,
  ModelGatewayResponse,
} from './model-gateway.js';
import { calculateCost, recordLlmCall } from '../services/cost-telemetry.js';
import { GroqProvider } from './groq-provider.js';
import { DeterministicGenerator } from './deterministic-generator.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface TabiChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface TabiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  claude_usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

interface TabiResponse {
  choices: TabiChoice[];
  usage: TabiUsage;
  error?: {
    message: string;
    code?: string;
  };
}

export class TabiProvider implements ModelGateway {
  private groqFallbackProvider: GroqProvider | null = null;

  private getGroqFallback(): GroqProvider {
    if (!this.groqFallbackProvider) {
      this.groqFallbackProvider = new GroqProvider();
    }
    return this.groqFallbackProvider;
  }

  async call(request: ModelGatewayRequest): Promise<ModelGatewayResponse> {
    const startTime = Date.now();
    let retryCount = 0;

    // Convert Zod schema to JSON schema instructions
    const jsonSchema = zodToJsonSchema(request.responseSchema, 'response');
    const systemPrompt = `${request.systemPrompt}

You MUST output strictly valid, raw JSON with NO markdown formatting, NO markdown code fences (\`\`\`json or \`\`\`), and NO explanation before or after.
Your entire output must parse directly as JSON adhering strictly to this JSON Schema:
${JSON.stringify(jsonSchema, null, 2)}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request.userPrompt },
    ];

    try {
      // ── Primary Attempt: Tabi AI ──────────────────────────────────────────
      console.log(`[tabi-provider] Calling Tabi AI with model: ${request.modelId} for role: ${request.agentRole}...`);
      const result = await this.fetchCompletion(request, messages);
      console.log(`[tabi-provider] Received response from Tabi AI (${result.content.length} chars)`);
      const cleanContent = this.stripMarkdownFences(result.content);
      const parseResult = this.parseAndValidate(cleanContent, request.responseSchema);

      if (parseResult.success) {
        const latencyMs = Date.now() - startTime;
        const costUsd = calculateCost(request.modelId, result.inputTokens, result.outputTokens);

        await this.logTelemetry(request, {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd,
          latencyMs,
          retryCount,
          success: true,
        });

        console.log(`[tabi-provider] Schema validation PASSED for ${request.agentRole} in ${latencyMs}ms`);

        return {
          raw: cleanContent,
          parsed: parseResult.data,
          modelId: request.modelId,
          usage: {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
          latencyMs,
        };
      }

      // ── Single-turn Repair Attempt on Tabi AI ─────────────────────────────
      console.warn(`[tabi-provider] Schema validation failed on Tabi AI for role '${request.agentRole}'. Attempting 1-turn repair...`);
      retryCount = 1;
      const repairMessages: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: result.content },
        {
          role: 'user',
          content: `Your previous output did not strictly conform to the required JSON schema. Validation error: ${parseResult.error}. Please return ONLY the corrected JSON object.`,
        },
      ];

      const repairResult = await this.fetchCompletion(request, repairMessages);
      const repairClean = this.stripMarkdownFences(repairResult.content);
      const repairParse = this.parseAndValidate(repairClean, request.responseSchema);

      if (repairParse.success) {
        const totalInput = result.inputTokens + repairResult.inputTokens;
        const totalOutput = result.outputTokens + repairResult.outputTokens;
        const latencyMs = Date.now() - startTime;
        const costUsd = calculateCost(request.modelId, totalInput, totalOutput);

        await this.logTelemetry(request, {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          costUsd,
          latencyMs,
          retryCount,
          success: true,
        });

        return {
          raw: repairClean,
          parsed: repairParse.data,
          modelId: request.modelId,
          usage: { inputTokens: totalInput, outputTokens: totalOutput },
          latencyMs,
        };
      }

      throw new Error(`Tabi AI output failed schema validation after repair: ${repairParse.error}`);
    } catch (tabiErr: any) {
      console.warn(`[tabi-provider] Tabi AI failed for role '${request.agentRole}' (${tabiErr.message}). Failing over to Secondary Provider (Groq)...`);

      // ── Secondary Failover: Groq Provider ─────────────────────────────────
      if (config.groq.apiKey) {
        try {
          const groqModel = (config.groqModels as any)?.[request.agentRole] || 'qwen/qwen3.8-27b';
          const groqRequest: ModelGatewayRequest = {
            ...request,
            modelId: groqModel,
          };
          const groqResponse = await this.getGroqFallback().call(groqRequest);
          console.log(`[tabi-provider] Secondary provider (Groq) successfully fulfilled request for role '${request.agentRole}'.`);
          return groqResponse;
        } catch (groqErr: any) {
          console.warn(`[tabi-provider] Secondary provider (Groq) also failed (${groqErr.message}). Using deterministic tertiary fallback.`);
        }
      }

      // ── Tertiary Failover: Deterministic Generator ────────────────────────
      const fallbackData = this.generateFallbackContent(request);
      if (fallbackData !== null) {
        const latencyMs = Date.now() - startTime;
        return {
          raw: JSON.stringify(fallbackData),
          parsed: fallbackData,
          modelId: request.modelId,
          usage: { inputTokens: 0, outputTokens: 0 },
          latencyMs,
        };
      }

      throw tabiErr;
    }
  }

  private async fetchCompletion(
    request: ModelGatewayRequest,
    messages: ChatMessage[]
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const apiKey = config.tabi.apiKey;
    const baseUrl = config.tabi.baseUrl || 'https://tabitoken.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: request.modelId,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (TayDauForce/1.0)',
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch (err: any) {
      throw new Error(`Tabi AI network connection failed: ${err.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} from Tabi AI (${url}): ${errorText}`);
    }

    const data = (await response.json()) as TabiResponse;
    if (data.error) {
      throw new Error(`Tabi AI API error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Tabi AI returned an empty response.');
    }

    const inputTokens = data.usage?.prompt_tokens ?? data.usage?.claude_usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? data.usage?.claude_usage?.output_tokens ?? 0;

    return { content, inputTokens, outputTokens };
  }

  private stripMarkdownFences(text: string): string {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    return clean.trim();
  }

  private parseAndValidate<T>(
    text: string,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string } {
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(text);
    } catch (parseErr: any) {
      return { success: false, error: `Invalid JSON syntax: ${parseErr.message}` };
    }

    const val = schema.safeParse(rawJson);
    if (val.success) {
      return { success: true, data: val.data };
    }

    const errorDetails = val.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: errorDetails };
  }

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
        provider: 'tabi',
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
        '[tabi-provider] Failed to record telemetry:',
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
        const isRefinement = request.userPrompt.includes('TASK REFINEMENT');
        if (isRefinement) {
          return {
            tasks: DeterministicGenerator.generatePMDeliveryPlan(true).tasks,
            summary: 'Tasks refined based on approved technical architecture and schema models.',
          };
        }
        const isPureBackend =
          request.userPrompt.toLowerCase().includes('backend-only') ||
          request.userPrompt.toLowerCase().includes('api-only') ||
          request.userPrompt.toLowerCase().includes('no frontend') ||
          request.userPrompt.toLowerCase().includes('strictly rest api');
        const requiresUIUX = !isPureBackend;
        return DeterministicGenerator.generatePMDeliveryPlan(requiresUIUX);
      }
      case 'ui_designer':
      case 'ui_ux_designer':
      case 'designer':
        return DeterministicGenerator.generateDesignerOutput(request.userPrompt);
      case 'solution_architect':
      case 'architect':
        return DeterministicGenerator.generateArchitectureOutput();
      case 'software_engineer':
      case 'engineer':
        return DeterministicGenerator.generateEngineerOutput(request.userPrompt);
      case 'code_reviewer':
      case 'code_review':
      case 'codeReview':
        return DeterministicGenerator.generateCodeReviewOutput(request.userPrompt);
      case 'qa_engineer':
      case 'qa':
        return DeterministicGenerator.generateQAOutput(request.userPrompt);
      default:
        return null;
    }
  }
}
