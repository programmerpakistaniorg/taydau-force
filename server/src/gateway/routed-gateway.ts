import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { config } from '../config.js';
import type {
  ModelGateway,
  ModelGatewayRequest,
  ModelGatewayResponse,
} from './model-gateway.js';
import { calculateCost, recordLlmCall } from '../services/cost-telemetry.js';
import { dynamicRouter } from './dynamic-model-router.js';
import {
  inferTaskProfile,
  providerHealth,
  MODEL_REGISTRY,
  ROUTING_POLICY_VERSION,
} from './routing-registry.js';
import { DeterministicGenerator } from './deterministic-generator.js';
import type { TaskProfile, RoutingDecision } from '../schemas/routing.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class RoutedModelGateway implements ModelGateway {
  private deterministicGen = new DeterministicGenerator();

  async call(request: ModelGatewayRequest): Promise<ModelGatewayResponse> {
    const startTime = Date.now();
    const taskProfile: TaskProfile =
      request.taskProfile || inferTaskProfile(request.agentRole, request.purpose);

    // 1. Dynamic Routing Decision
    const routingDecision: RoutingDecision = dynamicRouter.routeTask(taskProfile, {
      staticModelId: request.modelId,
    });

    let selectedModel = routingDecision.modelId;
    let selectedProvider = routingDecision.provider;
    let fallbackCount = 0;
    let isDegraded = routingDecision.degradedMode;
    let validationStatus: 'passed' | 'escalated' | 'failed' = 'passed';
    let errorMessage: string | null = null;
    let actualCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Convert Zod schema to JSON schema
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
      // If router already selected deterministic generator (e.g. all providers disabled or fallback)
      if (selectedProvider === 'local' || selectedModel === 'deterministic-generator') {
        const fallbackData = this.generateFallbackContent(request);
        const latencyMs = Date.now() - startTime;
        isDegraded = true;

        await dynamicRouter.recordDecision({
          projectId: request.projectId,
          agentRole: request.agentRole,
          taskType: taskProfile.taskType,
          taskProfile,
          routingPolicyVersion: ROUTING_POLICY_VERSION,
          candidateModels: routingDecision.candidateModels,
          rejectedCandidates: routingDecision.rejectedCandidates,
          selectedProvider: 'local',
          selectedModel: 'deterministic-generator',
          routingReason: routingDecision.reason,
          routingMode: (process.env.ROUTING_MODE as any) || 'active',
          shadowSelection: routingDecision.shadowSelection,
          estimatedCostUsd: 0,
          actualCostUsd: 0,
          latencyMs,
          fallbackCount: 0,
          degradedMode: true,
          validationStatus: 'passed',
        });

        return {
          raw: JSON.stringify(fallbackData),
          parsed: fallbackData,
          modelId: 'deterministic-generator',
          provider: 'local',
          degradedMode: true,
          routingDecision,
          usage: { inputTokens: 0, outputTokens: 0 },
          latencyMs,
        };
      }

      // ── Primary Attempt with Selected Route ────────────────────────────────
      console.log(
        `[RoutedModelGateway] Executing task [${taskProfile.taskType}] for ${request.agentRole} via ${selectedProvider}/${selectedModel} (${routingDecision.reason})...`
      );

      let completion = await this.executeProviderCall(selectedProvider, selectedModel, messages, request);
      totalInputTokens += completion.inputTokens;
      totalOutputTokens += completion.outputTokens;

      let cleanContent = this.stripMarkdownFences(completion.content);
      let parseResult = this.parseAndValidate(cleanContent, request.responseSchema);

      // Single-turn repair if initial response failed schema validation
      if (!parseResult.success) {
        console.warn(
          `[RoutedModelGateway] Validation failed for ${selectedModel}. Attempting 1-turn repair...`
        );
        fallbackCount++;
        const repairMessages: ChatMessage[] = [
          ...messages,
          { role: 'assistant', content: completion.content },
          {
            role: 'user',
            content: `Your previous output did not strictly conform to the required JSON schema. Error: ${parseResult.error}. Output ONLY valid raw JSON conforming to the schema.`,
          },
        ];

        const repairCompletion = await this.executeProviderCall(
          selectedProvider,
          selectedModel,
          repairMessages,
          request
        );
        totalInputTokens += repairCompletion.inputTokens;
        totalOutputTokens += repairCompletion.outputTokens;
        cleanContent = this.stripMarkdownFences(repairCompletion.content);
        parseResult = this.parseAndValidate(cleanContent, request.responseSchema);
      }

      // If still failed schema validation, escalate capability tier
      if (!parseResult.success) {
        console.warn(
          `[RoutedModelGateway] Model ${selectedModel} failed schema repair. Escalating capability route...`
        );
        validationStatus = 'escalated';
        fallbackCount++;

        const escalatedRoute = dynamicRouter.escalateRoute(taskProfile, selectedModel);
        selectedModel = escalatedRoute.modelId;
        selectedProvider = escalatedRoute.provider;

        console.log(`[RoutedModelGateway] Escalated to ${selectedProvider}/${selectedModel}`);

        const escalatedCompletion = await this.executeProviderCall(
          selectedProvider,
          selectedModel,
          messages,
          request
        );
        totalInputTokens += escalatedCompletion.inputTokens;
        totalOutputTokens += escalatedCompletion.outputTokens;
        cleanContent = this.stripMarkdownFences(escalatedCompletion.content);
        parseResult = this.parseAndValidate(cleanContent, request.responseSchema);

        if (!parseResult.success) {
          throw new Error(`Escalated route ${selectedModel} also failed schema validation: ${parseResult.error}`);
        }
      }

      const latencyMs = Date.now() - startTime;
      actualCostUsd = calculateCost(selectedModel, totalInputTokens, totalOutputTokens);

      // Record successful decision & telemetry
      providerHealth.recordSuccess(selectedModel);
      providerHealth.recordSuccess(selectedProvider);

      await recordLlmCall({
        projectId: request.projectId,
        agentRole: request.agentRole,
        modelId: selectedModel,
        provider: selectedProvider,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd: actualCostUsd,
        latencyMs,
        purpose: request.purpose,
        taskCode: request.taskCode,
        requirementCode: request.requirementCode,
        retryCount: fallbackCount,
        success: true,
      });

      await dynamicRouter.recordDecision({
        projectId: request.projectId,
        agentRole: request.agentRole,
        taskType: taskProfile.taskType,
        taskProfile,
        routingPolicyVersion: ROUTING_POLICY_VERSION,
        candidateModels: routingDecision.candidateModels,
        rejectedCandidates: routingDecision.rejectedCandidates,
        selectedProvider,
        selectedModel,
        routingReason: routingDecision.reason,
        routingMode: (process.env.ROUTING_MODE as any) || 'active',
        shadowSelection: routingDecision.shadowSelection,
        estimatedCostUsd: routingDecision.estimatedCostUsd,
        actualCostUsd,
        latencyMs,
        fallbackCount,
        degradedMode: false,
        validationStatus: 'passed',
      });

      return {
        raw: cleanContent,
        parsed: parseResult.data,
        modelId: selectedModel,
        provider: selectedProvider,
        degradedMode: false,
        routingDecision,
        usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        latencyMs,
      };
    } catch (primaryErr: any) {
      console.warn(
        `[RoutedModelGateway] Error on primary route ${selectedProvider}/${selectedModel} (${primaryErr.message}). Initiating bounded fallback...`
      );
      providerHealth.recordFailure(selectedModel);
      providerHealth.recordFailure(selectedProvider);
      fallbackCount++;

      // ── Bounded Secondary Fallback ──────────────────────────────────────────
      const alternativeCandidates = MODEL_REGISTRY.filter(
        (m) => m.enabled && m.modelId !== selectedModel && m.modelId !== 'deterministic-generator' && providerHealth.isHealthy(m.modelId)
      );

      if (alternativeCandidates.length > 0) {
        const fallbackCandidate = alternativeCandidates[0];
        try {
          console.log(`[RoutedModelGateway] Fallback candidate: ${fallbackCandidate.provider}/${fallbackCandidate.modelId}`);
          const fallbackCompletion = await this.executeProviderCall(
            fallbackCandidate.provider,
            fallbackCandidate.modelId,
            messages,
            request
          );

          const cleanFallback = this.stripMarkdownFences(fallbackCompletion.content);
          const parseFallback = this.parseAndValidate(cleanFallback, request.responseSchema);

          if (parseFallback.success) {
            const latencyMs = Date.now() - startTime;
            actualCostUsd = calculateCost(
              fallbackCandidate.modelId,
              fallbackCompletion.inputTokens,
              fallbackCompletion.outputTokens
            );

            await recordLlmCall({
              projectId: request.projectId,
              agentRole: request.agentRole,
              modelId: fallbackCandidate.modelId,
              provider: fallbackCandidate.provider,
              inputTokens: fallbackCompletion.inputTokens,
              outputTokens: fallbackCompletion.outputTokens,
              costUsd: actualCostUsd,
              latencyMs,
              purpose: request.purpose,
              taskCode: request.taskCode,
              requirementCode: request.requirementCode,
              retryCount: fallbackCount,
              success: true,
            });

            await dynamicRouter.recordDecision({
              projectId: request.projectId,
              agentRole: request.agentRole,
              taskType: taskProfile.taskType,
              taskProfile,
              routingPolicyVersion: ROUTING_POLICY_VERSION,
              candidateModels: routingDecision.candidateModels,
              rejectedCandidates: routingDecision.rejectedCandidates,
              selectedProvider: fallbackCandidate.provider,
              selectedModel: fallbackCandidate.modelId,
              routingReason: 'PROVIDER_UNAVAILABLE',
              routingMode: (process.env.ROUTING_MODE as any) || 'active',
              shadowSelection: routingDecision.shadowSelection,
              estimatedCostUsd: routingDecision.estimatedCostUsd,
              actualCostUsd,
              latencyMs,
              fallbackCount,
              degradedMode: false,
              validationStatus: 'passed',
            });

            return {
              raw: cleanFallback,
              parsed: parseFallback.data,
              modelId: fallbackCandidate.modelId,
              provider: fallbackCandidate.provider,
              degradedMode: false,
              routingDecision,
              usage: { inputTokens: fallbackCompletion.inputTokens, outputTokens: fallbackCompletion.outputTokens },
              latencyMs,
            };
          }
        } catch (secErr: any) {
          console.warn(`[RoutedModelGateway] Secondary fallback failed (${secErr.message})`);
          fallbackCount++;
        }
      }

      // ── Tertiary Fallback: Deterministic Generator (Degraded Mode) ──────────
      console.warn(`[RoutedModelGateway] All semantic model providers failed. Activating deterministic generator in DEGRADED MODE.`);
      isDegraded = true;
      const fallbackData = this.generateFallbackContent(request);
      const latencyMs = Date.now() - startTime;

      await dynamicRouter.recordDecision({
        projectId: request.projectId,
        agentRole: request.agentRole,
        taskType: taskProfile.taskType,
        taskProfile,
        routingPolicyVersion: ROUTING_POLICY_VERSION,
        candidateModels: routingDecision.candidateModels,
        rejectedCandidates: routingDecision.rejectedCandidates,
        selectedProvider: 'local',
        selectedModel: 'deterministic-generator',
        routingReason: 'DEGRADED_FALLBACK',
        routingMode: (process.env.ROUTING_MODE as any) || 'active',
        shadowSelection: routingDecision.shadowSelection,
        estimatedCostUsd: 0,
        actualCostUsd: 0,
        latencyMs,
        fallbackCount,
        degradedMode: true,
        validationStatus: 'passed',
        errorMessage: primaryErr.message,
      });

      if (fallbackData !== null) {
        return {
          raw: JSON.stringify(fallbackData),
          parsed: fallbackData,
          modelId: 'deterministic-generator',
          provider: 'local',
          degradedMode: true,
          routingDecision,
          usage: { inputTokens: 0, outputTokens: 0 },
          latencyMs,
        };
      }

      throw primaryErr;
    }
  }

  private async executeProviderCall(
    provider: string,
    modelId: string,
    messages: ChatMessage[],
    request: ModelGatewayRequest
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    if (provider === 'groq') {
      return this.fetchGroq(modelId, messages, request);
    }
    // Default to Tabi AI
    return this.fetchTabi(modelId, messages, request);
  }

  private async fetchTabi(
    modelId: string,
    messages: ChatMessage[],
    request: ModelGatewayRequest
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const apiKey = config.tabi.apiKey;
    const baseUrl = config.tabi.baseUrl || 'https://tabitoken.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Tabi AI HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.round(content.length / 4);

    return { content, inputTokens, outputTokens };
  }

  private async fetchGroq(
    modelId: string,
    messages: ChatMessage[],
    request: ModelGatewayRequest
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const apiKey = config.groq.apiKey;
    const baseUrl = config.groq.baseUrl || 'https://api.groq.com/openai/v1';
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
      response_format: { type: 'json_object' },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.round(content.length / 4);

    return { content, inputTokens, outputTokens };
  }

  private stripMarkdownFences(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    return match ? match[1].trim() : trimmed;
  }

  private parseAndValidate(
    text: string,
    schema: z.ZodSchema
  ): { success: true; data: unknown } | { success: false; error: string } {
    try {
      const parsed = JSON.parse(text);
      const result = schema.safeParse(parsed);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error.message };
    } catch (e: any) {
      return { success: false, error: `Invalid JSON: ${e.message}` };
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
