import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { BAOutputSchema, type BAOutput, type RequirementOutput } from '../schemas/requirement.js';

const BA_SYSTEM_PROMPT = `You are Aria Analyst, Lead Business Analyst for TayDau Force, an autonomous software delivery organization.

Your job: Understand the client's business idea, resolve genuine high-value business ambiguity, and turn confirmed goals into structured, testable software requirements.

Responsibilities:
1. Clarification Analysis: If the client brief lacks critical business information (e.g. primary user groups, core operational pain point, or legacy process) and these are NOT already answered in Confirmed Project Facts, return status 'needs_clarification' with 1 to 3 targeted multiple-choice questions.
2. Requirements Derivation: When information is clear or confirmed facts exist, return status 'ready' with 2-4 concrete, testable requirements (REQ-001 format).
3. Acceptance Criteria: Every requirement must have 1-3 crisp, deterministic acceptance criteria suitable for automated testing.
4. Boundary Rules: You own business needs. NEVER ask technical architecture questions (such as React vs Vue, PostgreSQL vs MongoDB, or Docker).
5. Completeness: Once the client has answered clarification questions in Confirmed Project Facts, do NOT ask further questions; return status 'ready' with requirements populated.

Output Format:
Return strictly a valid JSON object matching this schema:
{
  "status": "ready" | "needs_clarification",
  "clarifications": [
    {
      "factKey": "users.primary_groups",
      "question": "Who will primarily use this application?",
      "whyItMatters": "Determines the role-based workflows and access permissions TayDau designs.",
      "type": "single_choice",
      "options": ["Business Team & Customers", "Internal Staff Only", "Customers Only"],
      "recommendedOption": "Business Team & Customers",
      "allowCustom": true,
      "impact": "high",
      "required": true
    }
  ],
  "businessObjective": "Clear 1-2 sentence business goal summary",
  "targetUsers": ["Business Owner", "Customers"],
  "requirements": [
    {
      "code": "REQ-001",
      "title": "Customer Appointment Booking",
      "type": "Functional",
      "priority": "High",
      "acceptanceCriteria": ["User can select service and schedule an appointment.", "System prevents double booking for the same time slot."]
    }
  ],
  "assumptions": ["Standard web browser access"]
}`;

export async function runBAAgent(
  gateway: ModelGateway,
  clientBrief: string,
  projectId: string,
  confirmedFacts: Record<string, any> = {},
  revisionContext?: {
    clientFeedback?: string;
    previousRequirements?: RequirementOutput[];
  }
): Promise<BAOutput> {
  const factsSummary = Object.entries(confirmedFacts)
    .map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n') || 'None recorded yet';

  let userPrompt = [
    `Client Brief:\n${clientBrief}`,
    `\nConfirmed Project Facts:\n${factsSummary}`,
  ].join('\n');

  if (revisionContext?.clientFeedback) {
    userPrompt += [
      '\n\n=== REQUIREMENTS REVISION REQUEST ===',
      `Client Feedback:\n${revisionContext.clientFeedback}`,
      `Previous Requirements:\n${revisionContext.previousRequirements?.map((r) => `${r.code}: ${r.title}`).join('\n') || 'None'}`,
      '\nPlease update the requirements baseline accordingly.',
    ].join('\n');
  } else {
    userPrompt += '\n\nPlease evaluate if business clarification is required or generate the requirements baseline.';
  }

  const { result } = await callAgent(
    gateway,
    config.models.ba,
    BA_SYSTEM_PROMPT,
    userPrompt,
    BAOutputSchema,
    {
      projectId,
      agentRole: 'business_analyst',
      purpose: revisionContext ? 'Revise requirements baseline' : 'Decompose client brief & evaluate clarifications',
      reasoningEffort: 'none',
      maxTokens: 2500,
      temperature: 0.1,
    }
  );

  return result;
}
