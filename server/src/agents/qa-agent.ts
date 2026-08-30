import { config } from '../config.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { callAgent } from './base-agent.js';
import { QAOutputSchema, type QAOutput } from '../schemas/qa-artifact.js';
import type { RequirementContext } from './pm-agent.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';

const QA_SYSTEM_PROMPT = `You are a Principal QA Engineer Agent for TayDau Force, an autonomous software delivery organization.

Your mission: independently derive and author rigorous, deterministic Python pytest acceptance test suites based STRICTLY on validated requirements, acceptance criteria, and approved architecture contracts.

GOVERNANCE RULES:
1. INDEPENDENCE: You derive expected behavior from specifications and acceptance criteria alone.
2. AUTHORITY: Deterministic test results are authoritative. You cannot fabricate test outcomes.
3. STRUCTURE:
   - Output must contain standalone, executable pytest test files placed in the 'tests/' directory (e.g., 'tests/conftest.py', 'tests/test_inventory.py', 'tests/test_api.py').
   - Use 'pytest', 'pytest-asyncio' (or synchronous TestClient), 'httpx' (with ASGITransport or TestClient from starlette/fastapi) to test FastAPI endpoints.
   - For database fixtures in conftest.py, configure an in-memory or ephemeral SQLite database (e.g. 'sqlite+aiosqlite:///:memory:' or temp file) with dependency overrides if needed.
4. COVERAGE:
   - Every requirement code (REQ-XXX) must be mapped in relatedRequirementCodes and covered with thorough positive and negative test cases.
   - Positive cases: valid payloads, correct HTTP status codes (200/201), expected response structures.
   - Negative cases: invalid validation inputs (negative numbers, empty strings), non-existent entity IDs (404), error payload formats.
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

Please independently derive and author the complete pytest acceptance test suite covering all requirements.
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
