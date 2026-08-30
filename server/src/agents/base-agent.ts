import { z } from 'zod';
import type { ModelGateway } from '../gateway/model-gateway.js';

export interface AgentCallContext {
  projectId: string;
  agentRole: string;
  purpose?: string;
  taskCode?: string;
  requirementCode?: string;
}

export async function callAgent<T>(
  gateway: ModelGateway,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  responseSchema: z.ZodSchema<T>,
  context: AgentCallContext
): Promise<{ result: T; raw: string; usage: { inputTokens: number; outputTokens: number }; latencyMs: number }> {
  const response = await gateway.call({
    modelId,
    systemPrompt,
    userPrompt,
    responseSchema,
    projectId: context.projectId,
    agentRole: context.agentRole,
    purpose: context.purpose,
    taskCode: context.taskCode,
    requirementCode: context.requirementCode,
  });

  return {
    result: response.parsed as T,
    raw: response.raw,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}
