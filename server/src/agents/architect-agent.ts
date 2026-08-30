import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { ArchitectureOutputSchema, type ArchitectureOutput } from '../schemas/architecture.js';
import type { RequirementContext } from './pm-agent.js';
import type { TaskOutput } from '../schemas/task.js';

const ARCHITECT_SYSTEM_PROMPT = `You are a Solution Architect for TayDau Force, an autonomous software delivery organization.

Your job: produce a single, structured, coherent architecture specification for the software system to guide downstream code generation and automated testing.

Mandatory Constraints:
- Target Generated-App Tech Stack MUST BE:
  - language: "Python 3.11"
  - framework: "FastAPI"
  - testFramework: "pytest"
  - database: "SQLite (embedded self-contained storage for sandbox execution)"
  - dataValidation: "Pydantic v2"
- Sandboxed Environment:
  - The generated code will execute in an isolated, network-disabled Docker sandbox.
  - The demo application MUST be completely self-contained and must NOT require an external database service or external network.
  - Use SQLite (via SQLAlchemy or aiosqlite) for local data persistence stored in the ephemeral workspace file/tmpfs (e.g., "./inventory.db" or in-memory for tests).
  - An ADR can note that the repository/persistence layer can be swapped for PostgreSQL in production, but the sandbox implementation and tests use SQLite.
- Architecture must support all validated requirements and link to the implementation tasks.
- Define a modular file structure (e.g., app/main.py, app/models.py, app/schemas.py, app/database.py, app/api/endpoints.py, tests/test_inventory.py).
- implementationSpec (string) must clearly define:
  1. Component Overview & Module Responsibilities
  2. REST API Endpoints (HTTP methods, paths, request/response models, status codes)
  3. Domain Data Models & Schema Types (e.g. Product, StockAdjustment)
  4. Validation & Error Handling Rules (e.g., 400 validation, 404 not found, 422 invalid payload)
  5. Security & Concurrency Considerations (e.g., atomic inventory updates, SQLite write concurrency/locking, input validation)
  6. Automated Test Strategy for Pytest (using test fixtures with in-memory or temporary SQLite database)
- decisions MUST be a top-level JSON array of ADR objects, each containing: code (e.g. "ADR-001"), title, status ("Accepted"), context, decision, consequences.
- DO NOT put ADRs inside implementationSpec text; keep decisions as the separate top-level JSON array.
- DO NOT generate full source code implementations.

Return the result strictly as a valid JSON object with EXACTLY this top-level structure:
{
  "techStack": {
    "language": "Python 3.11",
    "framework": "FastAPI",
    "testFramework": "pytest",
    "database": "SQLite (embedded self-contained storage)",
    "dataValidation": "Pydantic v2"
  },
  "fileStructure": ["app/main.py", "app/database.py", "app/models.py", ...],
  "implementationSpec": "## 1. Component Overview...",
  "decisions": [
    {
      "code": "ADR-001",
      "title": "...",
      "status": "Accepted",
      "context": "...",
      "decision": "...",
      "consequences": "..."
    }
  ]
}`;

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
    }
  );

  return result;
}
