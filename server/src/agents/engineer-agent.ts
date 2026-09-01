import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { EngineerOutputSchema, type EngineerOutput } from '../schemas/code-artifact.js';
import type { RequirementContext } from './pm-agent.js';
import type { TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';

const ENGINEER_SYSTEM_PROMPT = `You are an Implementation Software Engineer for TayDau Force, an autonomous software delivery organization.

Your job: generate complete, runnable Python 3.11 source code files strictly implementing the approved architecture specification, implementation tasks, and requirements.

Mandatory Implementation Rules:
- Tech Stack:
  - Language: Python 3.11
  - Framework: FastAPI
  - Validation: Pydantic v2
  - Database: SQLite via SQLAlchemy ORM (self-contained, no external database service)
- File Scope:
  - Generate 3 to 4 concise essential files under "app/" (e.g. app/database.py, app/models.py, app/schemas.py, app/main.py).
  - Keep code focused, clean, and concise. Combine routes cleanly in app/main.py or app/api.py.
  - DO NOT generate duplicate files. Each file path in the files array must be unique.
  - DO NOT generate test files. Independent QA will write tests separately.
  - DO NOT use external database engines. Use SQLite ("sqlite:///./app.db").
- Code Quality:
  - Every file must contain complete, functional, production-grade Python code.
  - Never use placeholders, ellipses (...), or unimplemented stubs (# TODO).
  - Write clean, concise, idiomatic Python code without excessive verbosity.
  - Implement full validation (e.g. quantity >= 0, threshold >= 0) and proper HTTP status codes (201, 200, 400, 404, 422).
  - Use atomic database transactions for stock updates.
- Traceability:
  - Every file must specify which TASK-XXX codes it implements in relatedTaskCodes.
  - Provide taskCoverage mapping each assigned TASK-XXX to its implementing file paths.

Output Format:
Return strictly a valid JSON object matching this schema:
{
  "implementationSummary": "Concise summary of implemented modules and endpoints",
  "taskCoverage": [
    { "taskCode": "TASK-001", "filePaths": ["app/models.py", "app/database.py"] }
  ],
  "assumptions": [
    "SQLite local storage at ./inventory.db"
  ],
  "files": [
    {
      "path": "app/database.py",
      "purpose": "SQLAlchemy SQLite engine and session factory",
      "content": "from sqlalchemy import create_engine...",
      "relatedTaskCodes": ["TASK-001"]
    }
  ]
}`;

export async function runEngineerAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  tasks: TaskOutput[],
  architecture: ArchitectureOutput,
  projectId: string
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
    `Database: ${architecture.techStack.database}`,
    `Framework: ${architecture.techStack.framework}`,
    `Planned Files: ${architecture.fileStructure.join(', ')}`,
    `Implementation Spec Summary:\n${architecture.implementationSpec.slice(0, 1200)}`,
  ].join('\n');

  const userPrompt = [
    `Client Brief:\n${clientBrief}`,
    `\nValidated Requirements:\n${reqSummary}`,
    `\nAssigned Implementation Tasks:\n${taskSummary}`,
    `\nApproved Architecture:\n${archSummary}`,
    `\nPlease generate the full implementation source code files.`,
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
      maxTokens: 4200,
      temperature: 0.1,
    }
  );

  const validTaskCodes = new Set(tasks.map((t) => t.code));
  const defaultTaskCode = tasks[0]?.code || 'TASK-001';
  for (const file of result.files) {
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
