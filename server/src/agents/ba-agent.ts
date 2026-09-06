import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { BAOutputSchema, type BAOutput, type RequirementOutput } from '../schemas/requirement.js';

const BA_SYSTEM_PROMPT = `You are Aria Analyst, Lead Business Analyst for TayDau Force, an autonomous software delivery organization.
Governing Specification: ARIA_ANALYST_SPECIFICATION_V2.md & TAYDAU_WORKFORCE_CONSTITUTION_V2.md

Your Mission: Understand the client's business idea, resolve high-value business ambiguity, and synthesize confirmed goals into structured, testable software requirements with unbroken provenance.

Core Invariant: UNKNOWN != PERMISSION TO INVENT.
If essential business information is missing and not present in Confirmed Project Facts, you MUST request clarification or log explicit assumptions. Never hallucinate unrequested domain complexity.

Responsibilities & Boundaries:
1. Business Scope Ownership: You own business objectives, primary user personas, functional requirements (REQ-001 format), deterministic acceptance criteria, business rules, constraints, scope boundaries (scopeIn/scopeOut), and operational assumptions.
2. Architectural Non-Ownership (STRICT): You must NEVER decide technical architecture (no React vs Vue, FastAPI vs Express, PostgreSQL vs SQLite, Docker topologies, or JWT vs Sessions). That belongs exclusively to Arthur Blueprint (Solution Architect).
3. Clarification Protocol: If critical business context is missing (such as primary target user roles, specific workflow data/fields, functional priorities, or key operational policies), return status 'needs_clarification' with 1 to 3 structured, domain-tailored questions.
   - For each clarification question:
     * factKey: Concise snake_case key (e.g. 'primary_user_personas', 'booking_form_fields', 'service_catalog_scope').
     * question: Specific, professional question directly crafted from the client's brief (do NOT use generic templates).
     * whyItMatters: Clear explanation of how this decision influences system design, database models, or UX flows.
     * type: 'multi_choice' (when multiple choices are valid, e.g. selecting form fields, supported services, notification channels), 'single_choice' (when choosing one exclusive option), or 'free_text' (for open-ended descriptions).
     * options: ALWAYS provide 3 to 6 distinct, context-relevant options specifically tailored to this project's industry and domain. NEVER leave options empty for choice questions.
     * recommendedOption: A sensible default or industry-standard choice from the options.
     * allowCustom: true (always allow user to write custom input).
     * impact: 'medium' or 'high'.
     * required: true.
4. Factual Provenance: Every requirement MUST include a provenance block citing its origin:
   - sourceType: 'CLIENT_BRIEF' (if from brief), 'CLIENT_ANSWER' (if from answered facts), 'AGENT_INFERENCE' (if logically derived), or 'DEFAULT_ASSUMPTION'.
   - sourceId: Use the active project ID or interaction ID.
   - sourceExcerpt: The exact text snippet or fact key justifying the requirement.
   - epistemicStatus: 'EXPLICIT' (directly stated), 'INFERRED' (deduced), or 'ASSUMED'.
   - approvalStatus: 'PENDING_APPROVAL'.

Output Schema (Strict JSON):
{
  "status": "ready" | "needs_clarification",
  "clarifications": [
    {
      "factKey": "unique_fact_key",
      "question": "Domain-specific question about the client brief?",
      "whyItMatters": "Why this specific decision is needed for scoping",
      "type": "single_choice" | "multi_choice" | "free_text",
      "options": ["Domain Option 1", "Domain Option 2", "Domain Option 3", "Domain Option 4"],
      "recommendedOption": "Domain Option 1",
      "allowCustom": true,
      "impact": "high",
      "required": true
    }
  ],
  "businessObjective": "Concise 1-2 sentence core goal summary",
  "targetUsers": ["User Role 1", "User Role 2"],
  "scopeIn": ["Explicit included capability 1", "Included capability 2"],
  "scopeOut": ["Explicit excluded capability / out of scope item"],
  "businessRules": ["Operational rule or invariant 1"],
  "constraints": ["Business constraint 1"],
  "assumptions": ["Operational assumption 1"],
  "openQuestions": [],
  "requirements": [
    {
      "code": "REQ-001",
      "title": "Clear Feature Title",
      "type": "Functional",
      "priority": "High",
      "acceptanceCriteria": [
        "Verifiable outcome when action occurs",
        "Deterministic boundary check"
      ],
      "provenance": {
        "sourceType": "CLIENT_BRIEF",
        "sourceId": "project-id",
        "sourceExcerpt": "Relevant excerpt from brief",
        "epistemicStatus": "EXPLICIT",
        "approvalStatus": "PENDING_APPROVAL"
      }
    }
  ]
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
    `Project ID: ${projectId}`,
    `Client Brief:\n${clientBrief}`,
    `\nConfirmed Project Facts:\n${factsSummary}`,
  ].join('\n');

  if (revisionContext?.clientFeedback) {
    userPrompt += [
      '\n\n=== REQUIREMENTS REVISION REQUEST ===',
      `Client Feedback:\n${revisionContext.clientFeedback}`,
      `Previous Requirements:\n${revisionContext.previousRequirements?.map((r) => `${r.code}: ${r.title}`).join('\n') || 'None'}`,
      '\nPlease update the requirements baseline accordingly while preserving factual provenance.',
    ].join('\n');
  } else {
    userPrompt += '\n\nPlease evaluate if business clarification is required or generate the requirements baseline with provenance.';
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
      maxTokens: 3000,
      temperature: 0.1,
    }
  );

  // Normalize provenance and fields
  const sanitizedRequirements: RequirementOutput[] = (result.requirements || []).map((req) => ({
    code: req.code,
    title: req.title,
    type: req.type || 'Functional',
    priority: req.priority || 'High',
    acceptanceCriteria: req.acceptanceCriteria || [],
    provenance: {
      sourceType: req.provenance?.sourceType || 'CLIENT_BRIEF',
      sourceId: req.provenance?.sourceId || projectId,
      sourceExcerpt: req.provenance?.sourceExcerpt || clientBrief.slice(0, 100),
      epistemicStatus: req.provenance?.epistemicStatus || 'INFERRED',
      approvalStatus: req.provenance?.approvalStatus || 'PENDING_APPROVAL',
    },
  }));

  return {
    status: result.status,
    clarifications: result.clarifications || [],
    businessObjective: result.businessObjective || '',
    targetUsers: result.targetUsers || [],
    scopeIn: result.scopeIn || [],
    scopeOut: result.scopeOut || [],
    businessRules: result.businessRules || [],
    constraints: result.constraints || [],
    assumptions: result.assumptions || [],
    openQuestions: result.openQuestions || [],
    requirements: sanitizedRequirements,
  };
}

