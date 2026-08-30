import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { PMOutputSchema, type PMOutput } from '../schemas/task.js';

export interface RequirementContext {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  acceptanceCriteria: string[];
}

const PM_SYSTEM_PROMPT = `You are a Project Manager Agent for TayDau Force, an autonomous software delivery organization.

Your job: decompose validated software requirements into an executable implementation task plan for software engineers.

Rules:
- Produce 2-6 concrete implementation tasks.
- Every task MUST link directly to an existing requirement code via requirementCode (e.g. REQ-001).
- Every validated requirement must be covered by at least one task. No orphan requirements or orphan tasks.
- Each task must have:
  - code: "TASK-001" sequential format
  - title: concise action title (e.g., "Implement Create Product Endpoint")
  - description: clear technical description of what needs to be built
  - requirementCode: matching REQ-XXX code
  - assignedRole: "Full-Stack Engineer" or "Backend Engineer"
  - priority: "Critical" | "High" | "Medium" | "Low"
  - dependencies: array of prior TASK-XXX codes that must complete first, or empty array []
  - acceptanceIntent: specific criteria for when the task is considered done
- Order tasks logically with proper dependencies (e.g., data structures / models before endpoint logic).
- Include an overall project execution summary.

Return the result strictly in JSON format matching the schema. Do not include any text outside the JSON.`;

export async function runPMAgent(
  gateway: ModelGateway,
  requirements: RequirementContext[],
  projectId: string
): Promise<PMOutput> {
  const reqSummary = requirements
    .map(
      (r) =>
        `- ${r.code}: ${r.title} [Type: ${r.type}, Priority: ${r.priority}]\n  Acceptance Criteria:\n${r.acceptanceCriteria.map((c) => `    * ${c}`).join('\n')}`
    )
    .join('\n\n');

  const userPrompt = `Validated Requirements:\n\n${reqSummary}\n\nPlease generate the implementation task plan.`;

  const { result } = await callAgent(
    gateway,
    config.models.pm,
    PM_SYSTEM_PROMPT,
    userPrompt,
    PMOutputSchema,
    {
      projectId,
      agentRole: 'project_manager',
      purpose: 'Decompose requirements into implementation tasks',
      reasoningEffort: 'low',
    }

  );

  return result;
}
