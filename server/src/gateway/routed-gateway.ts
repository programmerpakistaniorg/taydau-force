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
import { providerAdapters } from './providers/provider-registry.js';
import type { TaskProfile, RoutingDecision } from '../schemas/routing.js';
import type { ChatMessage } from './providers/provider-adapter.interface.js';

export class RoutedModelGateway implements ModelGateway {


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
        validationStatus,
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
      console.warn(`[RoutedModelGateway] Primary route ${selectedProvider}/${selectedModel} failed: ${primaryErr.message}`);

      // Parse provider error and update health/quota state
      const adapter = providerAdapters.get(selectedProvider);
      if (adapter) {
        const parsed = adapter.parseError(primaryErr, primaryErr.quotaHeaders);
        if (parsed.isRateLimit) {
          providerHealth.recordRateLimit(selectedModel, parsed.retryAfterMs, parsed.message);
          providerHealth.recordRateLimit(selectedProvider, parsed.retryAfterMs, parsed.message);
        } else if (parsed.isAuthError) {
          providerHealth.recordAuthFailure(selectedProvider, parsed.message);
        } else if (parsed.isBillingError) {
          providerHealth.recordBillingRequired(selectedModel, parsed.message);
        } else {
          providerHealth.recordFailure(selectedModel);
          providerHealth.recordFailure(selectedProvider);
        }
      } else {
        providerHealth.recordFailure(selectedModel);
        providerHealth.recordFailure(selectedProvider);
      }

      fallbackCount++;

      // ── Secondary Fallback: Re-route to next eligible semantic provider ─────
      const nextDecision = dynamicRouter.routeTask(taskProfile, {
        previousProvider: selectedProvider,
      });

      if (!nextDecision.degradedMode && nextDecision.modelId !== 'deterministic-generator') {
        try {
          console.log(
            `[RoutedModelGateway] Attempting dynamic multi-provider failover -> ${nextDecision.provider}/${nextDecision.modelId}...`
          );

          const fallbackCompletion = await this.executeProviderCall(
            nextDecision.provider,
            nextDecision.modelId,
            messages,
            request
          );

          const cleanFallback = this.stripMarkdownFences(fallbackCompletion.content);
          const parseFallback = this.parseAndValidate(cleanFallback, request.responseSchema);

          if (parseFallback.success) {
            const latencyMs = Date.now() - startTime;
            actualCostUsd = calculateCost(
              nextDecision.modelId,
              fallbackCompletion.inputTokens,
              fallbackCompletion.outputTokens
            );

            providerHealth.recordSuccess(nextDecision.modelId);
            providerHealth.recordSuccess(nextDecision.provider);

            await recordLlmCall({
              projectId: request.projectId,
              agentRole: request.agentRole,
              modelId: nextDecision.modelId,
              provider: nextDecision.provider,
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
              candidateModels: nextDecision.candidateModels,
              rejectedCandidates: nextDecision.rejectedCandidates,
              selectedProvider: nextDecision.provider,
              selectedModel: nextDecision.modelId,
              routingReason: 'PROVIDER_RATE_LIMITED',
              routingMode: (process.env.ROUTING_MODE as any) || 'active',
              shadowSelection: nextDecision.shadowSelection,
              estimatedCostUsd: nextDecision.estimatedCostUsd,
              actualCostUsd,
              latencyMs,
              fallbackCount,
              degradedMode: false,
              validationStatus: 'passed',
            });

            return {
              raw: cleanFallback,
              parsed: parseFallback.data,
              modelId: nextDecision.modelId,
              provider: nextDecision.provider,
              degradedMode: false,
              routingDecision: nextDecision,
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
      console.warn(`[RoutedModelGateway] All semantic model providers failed or rate limited. Activating deterministic generator in DEGRADED MODE.`);
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
        routingReason: 'FREE_ONLY_NO_ELIGIBLE_ROUTE',
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
  ): Promise<{ content: string; inputTokens: number; outputTokens: number; quotaHeaders?: Record<string, string> }> {
    const adapter = providerAdapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported or unconfigured provider adapter: '${provider}'`);
    }

    return adapter.execute(modelId, messages, {
      temperature: request.temperature ?? 0.2,
      maxTokens: request.maxTokens ?? 4096,
      responseFormatJson: true,
    });
  }

  private stripMarkdownFences(content: string): string {
    let clean = content.trim();
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

  private parseAndValidate<T>(jsonStr: string, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; error: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const valResult = schema.safeParse(parsed);
      if (valResult.success) {
        return { success: true, data: valResult.data };
      }
      return { success: false, error: JSON.stringify(valResult.error.issues) };
    } catch (e: any) {
      return { success: false, error: `Invalid JSON syntax: ${e.message}` };
    }
  }

  private generateFallbackContent(request: ModelGatewayRequest): any {
    const role = request.agentRole.toLowerCase();

    if (role.includes('ba') || role.includes('analyst')) {
      return DeterministicGenerator.generateBAOutput(request.userPrompt);
    }
    if (role.includes('pm') || role.includes('planner')) {
      return DeterministicGenerator.generatePMDeliveryPlan();
    }
    if (role.includes('designer') || role.includes('ui') || role.includes('ux')) {
      return DeterministicGenerator.generateDesignerOutput(request.userPrompt);
    }
    if (role.includes('architect')) {
      return DeterministicGenerator.generateArchitectureOutput();
    }
    if (role.includes('engineer') || role.includes('coder')) {
      return DeterministicGenerator.generateEngineerOutput();
    }
    if (role.includes('review')) {
      return DeterministicGenerator.generateCodeReviewOutput();
    }
    if (role.includes('qa') || role.includes('tester')) {
      return DeterministicGenerator.generateQAOutput();
    }

    return null;
  }
}


