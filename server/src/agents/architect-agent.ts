import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { ArchitectureOutputSchema, type ArchitectureOutput } from '../schemas/architecture.js';
import type { RequirementContext } from './pm-agent.js';
import type { TaskOutput } from '../schemas/task.js';

const ARCHITECT_SYSTEM_PROMPT = `You are a Solution Architect for TayDau Force, an autonomous software delivery organization.

Your job: produce a single, structured, coherent architecture specification and technical contract for the software system to guide downstream code generation and automated testing.

Mandatory Constraints:
- Application Type & Stack Selection:
  - If the client brief or requirements specify/imply a web UI or user-facing interface, set applicationType: "fullstack_web", frontendFramework: "React 18 + TypeScript + Vite".
  - If the client brief explicitly states "no UI", "API only", "backend only", or "REST API only", set applicationType: "api_service", frontendFramework: "none".
  - Backend: "Python 3.11 + FastAPI" with "Pydantic v2" validation.
  - Database: "PostgreSQL 16 (production) / SQLite (sandbox dev)".
  - Migration Tool: "Alembic".
- Architecture Contract:
  - Define "contract" object specifying applicationType, frontendFramework, backendFramework, database, apiStyle ("REST"), authenticationModel, frontendRoutes (if UI), backendModules, databaseEntities, integrationBoundaries, environmentVariables, deploymentTopology, qualityConstraints.
- File Structure:
  - For fullstack_web: define modular paths under frontend/ (src/components/, src/pages/, src/services/api.ts, package.json, vite.config.ts), backend/ (app/main.py, app/models/, app/schemas/, app/routes/, app/database.py, requirements.txt), database/ (alembic.ini, alembic/versions/), docs/ (README.md, API.md), and root deployment (Dockerfile.frontend, Dockerfile.backend, docker-compose.yml, .env.example).
  - For api_service: define modular paths under backend/ (app/main.py, app/models/, app/schemas/, app/routes/, app/database.py, requirements.txt), database/ (alembic.ini, alembic/versions/), docs/ (README.md, API.md), and root deployment (Dockerfile.backend, docker-compose.yml, .env.example).
- implementationSpec (string) must clearly define:
  1. Component Overview & Module Responsibilities
  2. REST API Endpoints (HTTP methods, paths, request/response models, status codes)
  3. Domain Data Models & Schema Types (e.g. entities, relations, constraints)
  4. Validation & Error Handling Rules (e.g., 400 validation, 404 not found, 422 invalid payload)
  5. Security & Concurrency Considerations (e.g., zero hardcoded secrets, input validation, atomic DB operations)
  6. Automated Test Strategy for Pytest and frontend validation
- decisions MUST be a top-level JSON array of ADR objects (code, title, status, context, decision, consequences).
- DO NOT generate full source code implementations.

Return the result strictly as a valid JSON object matching the ArchitectureOutputSchema.`;


export async function runArchitectAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  tasks: TaskOutput[],
  projectId: string
): Promise<ArchitectureOutput> {
  const reqSummary = requirements
    .map(
      (r) =>
        `- ${r.code}: ${r.title}\n  Criteria: ${r.acceptanceCriteria.join('; ')}`
    )
    .join('\n');

  const taskSummary = tasks
    .map(
      (t) =>
        `- ${t.code} [${t.priority}]: ${t.title} (Links to: ${t.requirementCode}, Assigned: ${t.assignedRole})\n  Intent: ${t.acceptanceIntent}`
    )
    .join('\n');

  const userPrompt = [
    `Client Brief:\n${clientBrief}`,
    `\nValidated Requirements:\n${reqSummary}`,
    `\nImplementation Tasks:\n${taskSummary}`,
    `\nPlease produce the architecture specification.`,
  ].join('\n');

  const { result } = await callAgent(
    gateway,
    config.models.architect,
    ARCHITECT_SYSTEM_PROMPT,
    userPrompt,
    ArchitectureOutputSchema,
    {
      projectId,
      agentRole: 'solution_architect',
      purpose: 'Produce system architecture specification',
      reasoningEffort: 'low',
    }

  );

  return result;
}
