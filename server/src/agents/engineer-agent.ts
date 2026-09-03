import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { EngineerOutputSchema, type EngineerOutput } from '../schemas/code-artifact.js';
import type { RequirementContext } from './pm-agent.js';
import type { TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';
import type { DesignSpec } from '../schemas/design-spec.js';
import { ManifestService } from '../services/manifest-service.js';

const ENGINEER_SYSTEM_PROMPT = `You are an Implementation Software Engineer for TayDau Force, an autonomous software delivery organization.

Your job: generate complete, runnable full-stack software project source code files strictly implementing the approved architecture specification, design contract, implementation tasks, and requirements.

Mandatory Implementation Rules:
- Architecture Contract Compliance:
  - If applicationType is "fullstack_web":
    - Generate real React 18 + TypeScript + Vite frontend code (frontend/src/App.tsx, frontend/src/services/api.ts, frontend/src/types/index.ts, frontend/package.json, frontend/vite.config.ts, frontend/index.html).
    - Generate real FastAPI backend code (backend/app/main.py, backend/app/models/domain.py, backend/app/schemas/dto.py, backend/app/database.py, backend/requirements.txt).
    - Generate database migration artifacts (database/alembic.ini, database/alembic/env.py, database/alembic/versions/001_initial.py).
    - Generate configuration and deployment artifacts (.env.example with ZERO credentials, Dockerfile.frontend, Dockerfile.backend, docker-compose.yml, .github/workflows/ci.yml, README.md, API.md).
  - If applicationType is "api_service" (API-Only):
    - Do NOT generate frontend files.
    - Generate FastAPI backend code under app/ (app/main.py, app/models/domain.py, app/schemas/dto.py, app/database.py, requirements.txt).
    - Generate database migration artifacts (alembic.ini, alembic/versions/001_initial.py).
    - Generate deployment artifacts (Dockerfile.backend, docker-compose.yml, .env.example, README.md, API.md).
- Design-to-Code Contract:
  - If a Design Specification is provided, implement real React components matching the approved screens, layout, and design tokens (colors, typography, component hierarchies).
- Code Quality & Security:
  - Every file must contain complete, functional, production-grade code.
  - Never use placeholders, ellipses (...), or unimplemented stubs (# TODO).
  - Strict input validation via Pydantic v2 in backend and TypeScript interfaces in frontend.
  - Frontend API client routes in frontend/src/services/api.ts MUST match backend FastAPI route endpoints.
  - NEVER output API keys, passwords, or credentials in .env.example (use placeholder variable names only).
  - DO NOT generate test files (tests/* or qa/*). Independent QA will write tests separately.
- Traceability:
  - Every file must specify which TASK-XXX codes it implements in relatedTaskCodes.

Return strictly a valid JSON object matching the EngineerOutputSchema.`;

export async function runEngineerAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  tasks: TaskOutput[],
  architecture: ArchitectureOutput,
  projectId: string,
  designSpec?: DesignSpec | null
): Promise<EngineerOutput> {
  const reqSummary = requirements
    .map(
      (r) =>
        `- ${r.code}: ${r.title}\n  Criteria: ${r.acceptanceCriteria.join('; ')}`
    )
    .join('\n');

  const taskSummary = tasks
    .map(
      (t) =>
        `- ${t.code} [${t.priority}]: ${t.title} (Links to: ${t.requirementCode})\n  Description: ${t.description}\n  Acceptance Intent: ${t.acceptanceIntent}`
    )
    .join('\n');

  const archSummary = [
    `Application Type: ${architecture.contract?.applicationType || 'fullstack_web'}`,
    `Database: ${architecture.techStack.database}`,
    `Backend Framework: ${architecture.techStack.framework}`,
    `Frontend Framework: ${architecture.contract?.frontendFramework || 'React 18 + TypeScript + Vite'}`,
    `Planned Files: ${architecture.fileStructure.join(', ')}`,
    `Implementation Spec Summary:\n${architecture.implementationSpec.slice(0, 1500)}`,
  ].join('\n');

  const designSummary = designSpec
    ? [
        `\nApproved Design Specification:`,
        `Design System: ${designSpec.designSystem?.styleDirection || 'Modern'}`,
        `Screens (${(designSpec.screens || []).length}):`,
        ...(designSpec.screens || []).map((s: any) => `  - Screen: ${s.name} (${s.route}): ${(s.wireframeElements || []).join(', ')}`),
      ].join('\n')
    : '\nNo UI Design Specification (API-only mode).';

  const userPrompt = [
    `Client Brief:\n${clientBrief}`,
    `\nValidated Requirements:\n${reqSummary}`,
    `\nAssigned Implementation Tasks:\n${taskSummary}`,
    `\nApproved Architecture:\n${archSummary}`,
    designSummary,
    `\nPlease generate the full coherent implementation project files.`,
  ].join('\n');

  const { result } = await callAgent(
    gateway,
    config.models.engineer,
    ENGINEER_SYSTEM_PROMPT,
    userPrompt,
    EngineerOutputSchema,
    {
      projectId,
      agentRole: 'engineer',
      purpose: 'Generate implementation code artifacts',
      reasoningEffort: 'medium',
      maxTokens: 8000,
      temperature: 0.1,
    }
  );

  const validTaskCodes = new Set(tasks.map((t) => t.code));
  const defaultTaskCode = tasks[0]?.code || 'TASK-001';
  for (const file of result.files) {
    file.fileType = file.fileType || ManifestService.inferFileType(file.path);
    file.relatedTaskCodes = (file.relatedTaskCodes || [])
      .filter((tc) => validTaskCodes.has(tc));
    if (file.relatedTaskCodes.length === 0) {
      file.relatedTaskCodes = [defaultTaskCode];
    }
  }
  if (result.taskCoverage) {
    result.taskCoverage = result.taskCoverage.filter((tc) => validTaskCodes.has(tc.taskCode));
  }

  return result;
}

