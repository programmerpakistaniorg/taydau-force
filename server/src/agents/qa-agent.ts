import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { QAOutputSchema, type QAOutput } from '../schemas/qa-artifact.js';
import type { RequirementContext } from './pm-agent.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';

const QA_SYSTEM_PROMPT = `You are a Principal QA Engineer Agent for TayDau Force, an autonomous software delivery organization.

Your mission: independently derive and author rigorous, deterministic Python pytest acceptance test suites based STRICTLY on validated requirements, acceptance criteria, and approved architecture contracts.

STRICT BLACK-BOX PUBLIC EXECUTION CONTRACT:
1. PUBLIC ENTRYPOINT ONLY:
   - The application is a FastAPI application instance exported as \`app\` in \`app.main\`.
   - The ONLY application import permitted in your test suite is: \`from app.main import app\`.
   - DO NOT import application internals such as \`app.database\`, \`app.models\`, \`app.schemas\`, \`app.api\`, \`app.crud\`, \`Base\`, \`SessionLocal\`, \`get_db\`, or specific ORM classes.
2. HTTP-BASED BLACK-BOX ACCEPTANCE TESTING:
   - Author acceptance tests that exercise the service exclusively through HTTP requests against \`app\` using \`from fastapi.testclient import TestClient\`.
   - Standard fixture pattern in \`tests/conftest.py\`:
     \`\`\`python
     import pytest
     from fastapi.testclient import TestClient
     from app.main import app

     @pytest.fixture
     def client():
         with TestClient(app) as c:
             yield c
     \`\`\`
   - Perform all setup, state creation, validation checks, and state assertions via HTTP endpoints (e.g. POST, GET, PUT/PATCH, DELETE).
   - Never assume internal database schema names or private helper functions.

GOVERNANCE RULES:
1. INDEPENDENCE: You derive expected behavior from specifications and acceptance criteria alone. You do NOT see Engineer source code.
2. AUTHORITY: Deterministic test results are authoritative. You cannot fabricate test outcomes.
3. STRUCTURE:
   - Output must contain standalone, executable pytest test files placed in the 'tests/' directory (e.g., 'tests/conftest.py', 'tests/test_products.py').
4. COVERAGE:
   - Every requirement code (REQ-XXX) must be mapped in relatedRequirementCodes and covered with thorough positive and negative test cases.
   - Positive cases: valid payloads, correct HTTP status codes (200/201), expected response structures.
   - Negative cases: invalid validation inputs, missing fields, non-existent entity IDs (404/400), error payload checks.
5. CONSTRAINTS:
   - DO NOT make external network calls or use cloud SDKs.
   - DO NOT run subprocesses or execute shell commands.
   - Keep file paths strictly inside 'tests/'.

Return your output strictly formatted as JSON conforming to the schema.`;

export async function runQAAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  architecture: ArchitectureOutput,
  projectId: string
): Promise<QAOutput> {
  const reqDetails = requirements
    .map(
      (r) =>
        `### Requirement ${r.code}: ${r.title}\n- Type: ${r.type} | Priority: ${r.priority}\n- Acceptance Criteria:\n${r.acceptanceCriteria.map((c) => `  * ${c}`).join('\n')}`
    )
    .join('\n\n');

  const archDetails = `
### Tech Stack
- Language: ${architecture.techStack.language}
- Framework: ${architecture.techStack.framework}
- Test Framework: ${architecture.techStack.testFramework}
- Database: ${architecture.techStack.database}
- Validation: ${architecture.techStack.dataValidation}

### Target File Structure
${JSON.stringify(architecture.fileStructure, null, 2)}

### Architecture Specification & API Contracts
${architecture.implementationSpec}
`.trim();

  const userPrompt = `
# Client Project Brief
${clientBrief}

# Validated Requirements & Acceptance Criteria
${reqDetails}

# Approved Architecture Specification & API Contract
${archDetails}

Please independently derive and author the complete pytest acceptance test suite covering all requirements following the strict black-box public execution contract (importing ONLY 'from app.main import app' and testing via HTTP TestClient).
`.trim();

  const { result } = await callAgent(
    gateway,
    config.models.qa,
    QA_SYSTEM_PROMPT,
    userPrompt,
    QAOutputSchema,
    {
      projectId,
      agentRole: 'qa_engineer',
      purpose: 'Independently derive acceptance test suite from requirements and contracts',
      reasoningEffort: 'medium',
      maxTokens: 3500,
      temperature: 0.1,
    }
  );

  return result;
}

/**
 * Bounded QA Self-Repair Agent: repairs malformed or invalid QA test artifacts
 * based on deterministic error feedback without seeing Engineer source code.
 */
export async function runQARepairAgent(
  gateway: ModelGateway,
  clientBrief: string,
  requirements: RequirementContext[],
  architecture: ArchitectureOutput,
  previousQAOutput: QAOutput,
  errorFeedback: string,
  projectId: string
): Promise<QAOutput> {
  const reqDetails = requirements
    .map(
      (r) =>
        `### Requirement ${r.code}: ${r.title}\n- Type: ${r.type} | Priority: ${r.priority}\n- Acceptance Criteria:\n${r.acceptanceCriteria.map((c) => `  * ${c}`).join('\n')}`
    )
    .join('\n\n');

  const repairPrompt = `
# QA Test Suite Self-Repair Task

Your previous test suite generation encountered deterministic validation or execution errors:

## Deterministic Error Feedback
${errorFeedback}

## Previous Generated Test Files
${JSON.stringify(previousQAOutput.testFiles, null, 2)}

## Validated Requirements & Acceptance Criteria
${reqDetails}

## Approved Architecture Specification
${architecture.implementationSpec}

## Mandatory Contract Rules:
1. The ONLY application import permitted in tests is: \`from app.main import app\`.
2. Do NOT import \`app.database\`, \`app.models\`, \`app.schemas\`, \`app.api\`, or any internal ORM symbols.
3. Use \`from fastapi.testclient import TestClient\` with \`TestClient(app)\` in \`tests/conftest.py\` and test purely via HTTP.
4. Correct all syntax, import, or coverage errors.

Please produce the corrected, complete pytest acceptance test suite.
`.trim();

  const { result } = await callAgent(
    gateway,
    config.models.qa,
    QA_SYSTEM_PROMPT,
    repairPrompt,
    QAOutputSchema,
    {
      projectId,
      agentRole: 'qa_engineer',
      purpose: 'Repair QA acceptance test artifacts based on error feedback',
      reasoningEffort: 'medium',
      maxTokens: 3500,
      temperature: 0.1,
    }
  );

  return result;
}
