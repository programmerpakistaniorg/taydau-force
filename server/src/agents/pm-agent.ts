import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { PMDeliveryPlanSchema, PMOutputSchema, type PMDeliveryPlan, type PMOutput, type TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';
import type { DesignSpec } from '../schemas/design-spec.js';

export interface RequirementContext {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  acceptanceCriteria: string[];
}

const PM_DELIVERY_PLAN_PROMPT = `You are Marcus Planner, Senior Delivery Manager for TayDau Force, an autonomous software delivery organization.

Your mission: Turn approved requirements into a structured Delivery Plan, evaluate delivery priorities, and determine the specialist workforce requirements.

Responsibilities:
1. Delivery Clarification: If delivery timeframe or MVP priority preference is genuinely needed and not in Confirmed Facts, return status 'needs_clarification' with 1 to 2 questions.
2. Workforce Determination: Set requiresUIUX: true if the project involves user interactions, web pages, or portals. Set requiresUIUX: false ONLY if it is a pure backend API / CLI.
3. Milestone Sequencing: Define 2 to 3 delivery milestones.
4. Provisional Implementation Tasks: Create 3 to 5 provisional build tasks linking to REQ-XXX codes.

Output Format:
Return strictly a valid JSON object matching the PMDeliveryPlan schema.`;

export async function runPMDeliveryPlanAgent(
  gateway: ModelGateway,
  requirements: RequirementContext[],
  confirmedFacts: Record<string, any>,
  projectId: string,
  clientBrief?: string
): Promise<PMDeliveryPlan> {
  const reqSummary = requirements
    .map((r) => `- ${r.code}: ${r.title} [Priority: ${r.priority}]\n  Criteria: ${r.acceptanceCriteria.join('; ')}`)
    .join('\n');

  const factsSummary = Object.entries(confirmedFacts)
    .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n') || 'None recorded yet';

  const userPrompt = [
    clientBrief ? `Client Brief:\n${clientBrief}\n` : '',
    `Approved Requirements:\n${reqSummary}`,
    `\nConfirmed Delivery Facts:\n${factsSummary}`,
    '\nPlease produce the Delivery Plan and specialist workforce allocation. If the project is an API-only / backend-only system with no UI, set requiresUIUX to false.',
  ].filter(Boolean).join('\n');

  const { result } = await callAgent(
    gateway,
    config.models.pm,
    PM_DELIVERY_PLAN_PROMPT,
    userPrompt,
    PMDeliveryPlanSchema,
    {
      projectId,
      agentRole: 'project_manager',
      purpose: 'Generate delivery plan & specialist allocation',
      reasoningEffort: 'low',
      maxTokens: 3000,
      temperature: 0.1,
    }
  );

  return result;
}

const PM_TASK_REFINEMENT_PROMPT = `You are Marcus Planner, Senior Delivery Manager for TayDau Force.

Your mission: Reconcile and finalize the executable implementation task list for Software Engineers based on the approved Solution Architecture and UI/UX Design.

Rules:
- Produce 3 to 5 concrete implementation tasks for Software Engineers.
- Every task must link to a valid requirementCode (e.g. REQ-001).
- Tasks must align with planned files in the Solution Architecture.
- NO test authoring tasks for Engineers (QA handles testing independently).

Return strictly JSON matching PMOutputSchema.`;

export async function runPMTaskRefinementAgent(
  gateway: ModelGateway,
  requirements: RequirementContext[],
  architecture: ArchitectureOutput,
  designSpec: DesignSpec | null,
  projectId: string
): Promise<PMOutput> {
  const reqSummary = requirements
    .map((r) => `- ${r.code}: ${r.title}`) 
    .join('\n');

  const archSummary = [
    `Tech Stack: ${architecture.techStack.framework} / ${architecture.techStack.database}`,
    `Planned Files: ${architecture.fileStructure.join(', ')}`,
    `Implementation Spec: ${architecture.implementationSpec.slice(0, 1000)}`,
  ].join('\n');

  const designSummary = designSpec
    ? `Screens: ${designSpec.screens.map((s) => s.name).join(', ')}\nFlows: ${designSpec.userFlows.map((f) => f.name).join(', ')}`
    : 'No UI Spec (Backend/API Only)';

  const userPrompt = [
    `Approved Requirements:\n${reqSummary}`,
    `\nApproved Architecture:\n${archSummary}`,
    `\nApproved Design Spec:\n${designSummary}`,
    '\nPlease produce the finalized Engineer implementation tasks.',
  ].join('\n');

  const { result } = await callAgent(
    gateway,
    config.models.pm,
    PM_TASK_REFINEMENT_PROMPT,
    userPrompt,
    PMOutputSchema,
    {
      projectId,
      agentRole: 'project_manager',
      purpose: 'Finalize implementation task decomposition',
      reasoningEffort: 'low',
      maxTokens: 2500,
      temperature: 0.1,
    }
  );

  return result;
}
