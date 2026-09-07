import crypto from 'crypto';
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
import { quotaGovernor } from './quota-governor.js';
import { DeterministicGenerator } from './deterministic-generator.js';
import { providerAdapters } from './providers/provider-registry.js';
import type { TaskProfile, RoutingDecision, TaskType, ModelCapability } from '../schemas/routing.js';
import type { TaskQuotaDemand, QuotaReservation } from '../schemas/quota.js';
import type { ChatMessage, ProviderExecutionResult } from './providers/provider-adapter.interface.js';

export class RoutedModelGateway implements ModelGateway {
  async call(request: ModelGatewayRequest): Promise<ModelGatewayResponse> {
    const startTime = Date.now();
    const taskProfile: TaskProfile =
      request.taskProfile || inferTaskProfile(request.agentRole, request.purpose);

    const taskType = (taskProfile.taskType || 'ui_ux_design') as TaskType;
    const reservedOutput = taskProfile.reservedOutputTokens ?? 1500;
    const totalTokens = taskProfile.contextSizeEstimate + reservedOutput;

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

      // ── Primary Route Execution with Predictive Quota Reservation ──────────
      const primaryCap = MODEL_REGISTRY.find(
        (m) => m.provider === selectedProvider && m.modelId === selectedModel
      ) || MODEL_REGISTRY.find((m) => m.modelId === selectedModel);

      const timeoutMs = this.getBoundedTimeoutMs(
        selectedProvider,
        taskType,
        reservedOutput,
        request.maxTokens
      );

      const demand: TaskQuotaDemand = {
        estimatedInputTokens: Math.round(taskProfile.contextSizeEstimate * 0.75),
        reservedOutputTokens: reservedOutput,
        totalTokens,
        requests: 1,
        concurrencyUnits: 1,
        timeoutMs,
      };

      let activeReservation: QuotaReservation | undefined;

      if (primaryCap) {
        const reserveRes = quotaGovernor.tryReserve(primaryCap, demand, {
          workflowRunId: request.workflowRunId,
          stepRunId: request.stepRunId,
          invocationId: request.invocationId,
          attempt: request.attempt,
        });

        if (!reserveRes.success) {
          throw new Error(
            `PREFLIGHT_ADMISSION_REJECTED: ${reserveRes.rejectionReason || 'Quota constraints exceeded'}`
          );
        }

        activeReservation = reserveRes.reservation;
        if (activeReservation) {
          quotaGovernor.commitReservation(activeReservation.reservationId);
        }
      }

      console.log(
        `[RoutedModelGateway] Executing task [${taskProfile.taskType}] for ${request.agentRole} via ${selectedProvider}/${selectedModel} (${routingDecision.reason})...`
      );

      let completion: ProviderExecutionResult;
      try {
        completion = await this.executeProviderCall(
          selectedProvider,
          selectedModel,
          messages,
          request
        );

        if (activeReservation) {
          quotaGovernor.reconcileReservation(
            activeReservation.reservationId,
            { inputTokens: completion.inputTokens, outputTokens: completion.outputTokens },
            completion.quotaSignal
          );
        }
      } catch (execErr: any) {
        if (activeReservation) {
          const isTimeout =
            execErr.name === 'TimeoutError' ||
            execErr.name === 'AbortError' ||
            execErr.message?.toLowerCase().includes('timeout');

          quotaGovernor.releaseReservation(
            activeReservation.reservationId,
            isTimeout ? 'timeout' : 'error',
            { unknownConsumption: isTimeout }
          );

          if (execErr.quotaSignal) {
            quotaGovernor.recordSignal(execErr.quotaSignal);
          }
        }
        throw execErr;
      }

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

      // Record successful decision & telemetry (non-blocking / resilient to DB errors)
      providerHealth.recordSuccess(selectedModel);
      providerHealth.recordSuccess(selectedProvider);

      try {
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
        }).catch(() => {});

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
        }).catch(() => {});
      } catch {}

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
        if (parsed.quotaSignal) {
          quotaGovernor.recordSignal(parsed.quotaSignal);
        }

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

          const secCap = MODEL_REGISTRY.find(
            (m) => m.provider === nextDecision.provider && m.modelId === nextDecision.modelId
          ) || MODEL_REGISTRY.find((m) => m.modelId === nextDecision.modelId);

          const secTimeoutMs = this.getBoundedTimeoutMs(
            nextDecision.provider,
            taskType,
            reservedOutput,
            request.maxTokens
          );

          const secDemand: TaskQuotaDemand = {
            estimatedInputTokens: Math.round(taskProfile.contextSizeEstimate * 0.75),
            reservedOutputTokens: reservedOutput,
            totalTokens,
            requests: 1,
            concurrencyUnits: 1,
            timeoutMs: secTimeoutMs,
          };

          let secReservation: QuotaReservation | undefined;
          if (secCap) {
            const secReserveRes = quotaGovernor.tryReserve(secCap, secDemand, {
              workflowRunId: request.workflowRunId,
              stepRunId: request.stepRunId,
              invocationId: request.invocationId,
              attempt: request.attempt,
            });

            if (!secReserveRes.success) {
              throw new Error(
                `SECONDARY_ADMISSION_REJECTED: ${secReserveRes.rejectionReason || 'Quota constraints exceeded'}`
              );
            }

            secReservation = secReserveRes.reservation;
            if (secReservation) {
              quotaGovernor.commitReservation(secReservation.reservationId);
            }
          }

          let fallbackCompletion: ProviderExecutionResult;
          try {
            fallbackCompletion = await this.executeProviderCall(
              nextDecision.provider,
              nextDecision.modelId,
              messages,
              request
            );

            if (secReservation) {
              quotaGovernor.reconcileReservation(
                secReservation.reservationId,
                { inputTokens: fallbackCompletion.inputTokens, outputTokens: fallbackCompletion.outputTokens },
                fallbackCompletion.quotaSignal
              );
            }
          } catch (secExecErr: any) {
            if (secReservation) {
              const isTimeout =
                secExecErr.name === 'TimeoutError' ||
                secExecErr.name === 'AbortError' ||
                secExecErr.message?.toLowerCase().includes('timeout');

              quotaGovernor.releaseReservation(
                secReservation.reservationId,
                isTimeout ? 'timeout' : 'error',
                { unknownConsumption: isTimeout }
              );

              if (secExecErr.quotaSignal) {
                quotaGovernor.recordSignal(secExecErr.quotaSignal);
              }
            }
            throw secExecErr;
          }

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

            try {
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
              }).catch(() => {});

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
              }).catch(() => {});
            } catch {}

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
      console.warn(
        `[RoutedModelGateway] All semantic model providers failed or rate limited. Activating deterministic generator in DEGRADED MODE.`
      );
      isDegraded = true;
      const fallbackData = this.generateFallbackContent(request);
      const latencyMs = Date.now() - startTime;

      try {
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
        }).catch(() => {});
      } catch {}

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

  private getBoundedTimeoutMs(
    provider: string,
    taskType: TaskType,
    reservedOutputTokens?: number,
    maxTokens?: number
  ): number {
    const isDesignOrCode = taskType === 'ui_ux_design' || taskType === 'fullstack_code_generation';
    if (provider === 'local_llamacpp' || provider === 'local') {
      // Measured local Qwen3.5-9B-GGUF throughput is approximately 2.4–2.5 tokens/sec.
      // Compute bounded adaptive timeout based on expected output token budget + prompt eval overhead.
      const expectedOutputTokens = reservedOutputTokens || maxTokens || (isDesignOrCode ? 2048 : 1024);
      const estimatedGenerationSec = Math.ceil(expectedOutputTokens / 2.4);
      const promptEvalOverheadSec = 25;
      const adaptiveSec = estimatedGenerationSec + promptEvalOverheadSec;
      const floorSec = isDesignOrCode ? 180 : 90;
      const hardCapSec = 600; // 10-minute maximum bounded limit
      return Math.min(Math.max(adaptiveSec, floorSec), hardCapSec) * 1000;
    }
    if (provider === 'experiential') {
      return isDesignOrCode ? 45_000 : 40_000;
    }
    // Cloud providers (Groq, Google AI Studio, Mistral, OpenRouter, NVIDIA)
    return isDesignOrCode ? 90_000 : 45_000;
  }

  private async executeProviderCall(
    provider: string,
    modelId: string,
    messages: ChatMessage[],
    request: ModelGatewayRequest
  ): Promise<ProviderExecutionResult> {
    const adapter = providerAdapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported or unconfigured provider adapter: '${provider}'`);
    }

    if (!request.projectId) {
      throw new Error(
        `Execution error: ModelGatewayRequest requires a valid projectId for governed execution and idempotency tracking.`
      );
    }

    const attempt = request.attempt ?? (request as any).attempt ?? 1;
    const executionRunId = request.workflowRunId || request.stepRunId || request.invocationId || '';
    const stepId = request.taskCode || request.purpose || request.agentRole;
    const promptHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(messages))
      .digest('hex')
      .slice(0, 12);
    const runSegment = executionRunId ? `:${executionRunId}` : '';
    const idempotencyKey = `taydau:${request.projectId}${runSegment}:${request.agentRole}:${stepId}:${promptHash}:${attempt}`;

    const taskType = (request.taskProfile?.taskType || 'ui_ux_design') as TaskType;
    const timeoutMs = this.getBoundedTimeoutMs(
      provider,
      taskType,
      request.taskProfile?.reservedOutputTokens,
      request.maxTokens
    );

    return adapter.execute(modelId, messages, {
      temperature: request.temperature ?? 0.2,
      maxTokens: request.maxTokens ?? 4096,
      responseFormatJson: true,
      idempotencyKey,
      timeoutMs,
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

  private parseAndValidate<T>(
    jsonStr: string,
    schema: z.ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      const valResult = schema.safeParse(parsed);
      if (valResult.success) {
        return { success: true, data: valResult.data };
      }
      return { success: false, error: JSON.stringify(valResult.error.issues) };
    } catch (e: any) {
      // Try extracting embedded JSON object from anywhere in the output (e.g. after thinking text)
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1) {
        for (let i = 0; i < lastBrace; i++) {
          if (jsonStr[i] === '{') {
            const candidate = jsonStr.substring(i, lastBrace + 1);
            try {
              const candidateParsed = JSON.parse(candidate);
              const valResult = schema.safeParse(candidateParsed);
              if (valResult.success) {
                return { success: true, data: valResult.data };
              }
            } catch {}
          }
        }
      }
      return { success: false, error: `Invalid JSON syntax: ${e.message}` };
    }
  }

  private generateFallbackContent(request: ModelGatewayRequest): any {
    const role = request.agentRole.toLowerCase();

    if (role.includes('ba') || role.includes('analyst') || role.includes('business')) {
      return DeterministicGenerator.generateBAOutput(
        request.userPrompt,
        request.projectId || 'default-project'
      );
    }
    if (role.includes('pm') || role.includes('planner') || role.includes('project') || role.includes('manager')) {
      return DeterministicGenerator.generatePMDeliveryPlan();
    }
    if (role.includes('designer') || role.includes('ui') || role.includes('ux') || role.includes('design')) {
      return DeterministicGenerator.generateDesignerOutput(request.userPrompt);
    }
    if (role.includes('architect') || role.includes('architecture') || role.includes('solution')) {
      return DeterministicGenerator.generateArchitectureOutput();
    }
    if (role.includes('engineer') || role.includes('coder') || role.includes('developer') || role.includes('code')) {
      return DeterministicGenerator.generateEngineerOutput(request.userPrompt);
    }
    if (role.includes('review') || role.includes('reviewer')) {
      return DeterministicGenerator.generateCodeReviewOutput(request.userPrompt);
    }
    if (role.includes('qa') || role.includes('tester') || role.includes('test') || role.includes('quality')) {
      return DeterministicGenerator.generateQAOutput(request.userPrompt);
    }

    return null;
  }
}
