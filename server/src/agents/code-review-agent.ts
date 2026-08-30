import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { CodeReviewOutputSchema, type CodeReviewOutput } from '../schemas/code-review.js';
import type { RequirementContext } from './pm-agent.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';

const CODE_REVIEW_SYSTEM_PROMPT = `You are a Principal Code Reviewer & Quality Auditor Agent for TayDau Force.

Your mission: conduct an independent, evidence-backed architectural, security, and quality review of the Engineer's generated implementation.

GOVERNANCE RULES:
1. ADVISORY ROLE ONLY: You provide expert judgement, code quality evaluation, and architectural compliance findings. You CANNOT directly modify source code, overwrite requirements, or alter test suites.
2. EVIDENCE-BASED: Every finding must reference specific file paths, code constructs, and linked requirements where applicable.
3. PRAGMATIC STANDARD: Focus on real technical risks, maintainability concerns, missing edge cases, resource cleanup, or architectural drift. Do not nitpick purely cosmetic preferences.
4. ARCHITECTURE COMPLIANCE: Verify whether the implementation adheres to the chosen tech stack, file structure, database choice, and HTTP contracts.
5. SEVERITY VS. BLOCKING STATUS POLICY:
   - "isBlocking: true" MUST be reserved strictly for fatal architectural violations, active data corruption risks, or critical security vulnerabilities that prevent release.
   - "isBlocking: false" MUST be used for advisory, quality, stylistic, maintainability, or minor structural deviations (e.g. String vs native UUID in SQLite, missing auxiliary modules, or non-critical error formatting) that do not break the functional MVP contract.

Return your evaluation strictly formatted as JSON matching the schema.`;

export interface CodeReviewContext {
  clientBrief: string;
  requirements: RequirementContext[];
  architecture: ArchitectureOutput;
  implementationFiles: Array<{ path: string; content: string }>;
  qaSummary: string;
}

export async function runCodeReviewAgent(
  gateway: ModelGateway,
  ctx: CodeReviewContext,
  projectId: string
): Promise<CodeReviewOutput> {
  const reqDetails = ctx.requirements
    .map(
      (r) =>
        `### Requirement ${r.code}: ${r.title}\n- Type: ${r.type} | Priority: ${r.priority}\n- Acceptance Criteria:\n${r.acceptanceCriteria.map((c) => `  * ${c}`).join('\n')}`
    )
    .join('\n\n');

  const filesDetails = ctx.implementationFiles
    .map((f) => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const reviewPrompt = `
# Project Code Review Task

## Client Brief
${ctx.clientBrief}

## Validated Requirements
${reqDetails}

## Approved Architecture Specification
- Framework: ${ctx.architecture.techStack.framework}
- Database: ${ctx.architecture.techStack.database}
- Spec: ${ctx.architecture.implementationSpec}

## Deterministic QA Evidence Summary
${ctx.qaSummary}

## Engineer Generated Source Code (${ctx.implementationFiles.length} files)
${filesDetails}

Please conduct a thorough code review evaluating:
1. Architecture compliance and API contract fidelity
2. Input validation and error handling robustness
3. Resource management and database session safety
4. Code structure, type safety, and maintainability
`.trim();

  // Use GPT-OSS 120B (or architect model) for deep review capability
  const reviewModel = config.models.architect || 'openai/gpt-oss-120b';

  const { result } = await callAgent(
    gateway,
    reviewModel,
    CODE_REVIEW_SYSTEM_PROMPT,
    reviewPrompt,
    CodeReviewOutputSchema,
    {
      projectId,
      agentRole: 'code_reviewer',
      purpose: 'Independent code review and architectural quality audit',
      reasoningEffort: 'medium',
      maxTokens: 3500,
      temperature: 0.1,
    }
  );

  return result;
}
