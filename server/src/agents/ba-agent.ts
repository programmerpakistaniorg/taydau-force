import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent, type AgentCallContext } from './base-agent.js';
import { BAOutputSchema, type BAOutput } from '../schemas/requirement.js';

const BA_SYSTEM_PROMPT = `You are a Business Analyst for TayDau Force, an autonomous software delivery organization.

Your job: decompose a client brief into clear, testable software requirements.

Rules:
- Produce 2-4 requirements maximum
- Each requirement must have: code (REQ-001 format), title, type, priority, and 1-3 acceptance criteria
- Acceptance criteria must be specific enough for automated pytest testing
- Keep each requirement small — implementable by a single engineer in one task
- Focus on the core functionality requested
- Include a businessObjective summarizing the overall goal

Return the result strictly in JSON format. Do not include any text outside the JSON.
Return ONLY a valid JSON object with this exact structure:
{
  "requirements": [
    {
      "code": "REQ-001",
      "title": "...",
      "type": "Functional|Security|Integration|Non-Functional",
      "priority": "Critical|High|Medium|Low",
      "acceptanceCriteria": ["criterion 1", "criterion 2"]
    }
  ],
  "businessObjective": "..."
}`;

export async function runBAAgent(
  gateway: ModelGateway,
  clientBrief: string,
  projectId: string
): Promise<BAOutput> {
  const { result } = await callAgent(
    gateway,
    config.models.ba,
    BA_SYSTEM_PROMPT,
    `Client Brief:\n\n${clientBrief}`,
    BAOutputSchema,
    {
      projectId,
      agentRole: 'business_analyst',
      purpose: 'Decompose client brief into requirements',
      reasoningEffort: 'none',
      maxTokens: 2048,
    }
  );
  return result;
}
