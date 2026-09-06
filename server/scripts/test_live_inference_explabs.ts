import { ExperientialAdapter } from '../src/gateway/providers/experiential-adapter.js';
import { providerAdapters } from '../src/gateway/providers/provider-registry.js';
import { syncExperientialCatalogStatus, MODEL_REGISTRY } from '../src/gateway/routing-registry.js';
import { config } from '../src/config.js';

async function main() {
  console.log('======================================================================');
  console.log('TAYDAU FORCE — EXPERIENTIAL FINAL MODEL QUALIFICATION CLOSURE SUITE');
  console.log('======================================================================');
  console.log('[Target Provider]: experiential');
  console.log('[API Key Configured]:', config.experiential.apiKey ? 'YES' : 'NO');

  const adapter = new ExperientialAdapter();

  // 1. Authenticated Connection & Discovery
  console.log('\n--- 1. AUTHENTICATED DISCOVERY & PREFLIGHT ---');
  const preflightList = await providerAdapters.getProviderPreflightReport();
  const expPreflight = preflightList.find(p => p.providerId === 'experiential');
  console.log('[Preflight Connection]:', expPreflight?.connection);
  console.log('[Models Callable to Key]:', expPreflight?.callableModelsCount);

  if (!expPreflight || expPreflight.connection !== 'VERIFIED') {
    throw new Error('Experiential connection is not verified.');
  }

  // 2. Dynamic Live Catalog Metadata & Billing Source Sync
  console.log('\n--- 2. DYNAMIC LIVE CATALOG & BILLING TRUTH SOURCE SYNC ---');
  const catalog = await adapter.fetchLiveCatalog();
  const catalogCount = Object.keys(catalog).length;
  console.log('[Catalog Models Discovered]:', catalogCount);

  const syncResult = syncExperientialCatalogStatus(expPreflight.models, catalog);
  console.log('[Active Synced Models]:', syncResult.activeModels.length);
  console.log('[Free Eligible Models]:', syncResult.freeEligibleCount);

  // 3. Live Structured Output Qualification
  console.log('\n--- 3. LIVE STRUCTURED OUTPUT QUALIFICATION ---');
  const candidateModels = ['gpt-6-astra', 'gpt-5.6-luna', 'qwen3.8-27b'];

  for (const modelId of candidateModels) {
    console.log('\nTesting Live Structured Output: ' + modelId + '...');
    const res = await adapter.execute(
      modelId,
      [
        {
          role: 'system',
          content: 'You are an autonomous AI software engineer at TayDau Force. You must output strictly valid JSON conforming to this schema: {\"architecture\": {\"pattern\": string, \"components\": string[]}, \"verified\": boolean}. Do not include markdown ticks or conversational text.'
        },
        {
          role: 'user',
          content: 'Synthesize architecture for a real-time autonomous project dashboard.'
        }
      ],
      {
        maxTokens: 1500,
        responseFormatJson: true,
        idempotencyKey: 'idemp-struct-' + modelId + '-' + Date.now()
      }
    );

    const raw = res.content.trim().replace(/`json\n?|\n?`/g, '').trim();
    const parsed = JSON.parse(raw);
    if (!parsed.architecture || !Array.isArray(parsed.architecture.components) || typeof parsed.verified !== 'boolean') {
      throw new Error('Structured output schema validation failed for ' + modelId);
    }
    console.log('  [PASS] ' + modelId + ' returned valid schema (Tokens In=' + res.inputTokens + ' Out=' + res.outputTokens + ')');
  }

  // 4. Role-Capability Qualification Evaluations
  console.log('\n--- 4. ROLE-CAPABILITY QUALIFICATION EVALUATIONS ---');
  
  // A. Architecture Reasoning (Arthur)
  console.log('Evaluating Architecture Reasoning (Arthur Pendelton)...');
  const archRes = await adapter.execute(
    'gpt-5.6-luna',
    [
      {
        role: 'system',
        content: 'You are Arthur Pendelton, Solution Architect at TayDau Force. Respond in strictly valid JSON: {\"pattern\": string, \"components\": string[], \"deterministicGates\": boolean}.'
      },
      {
        role: 'user',
        content: 'Specify architecture for durable SSE event replay with PostgreSQL outbox and Docker sandboxed runner.'
      }
    ],
    { maxTokens: 1500, responseFormatJson: true }
  );
  const archParsed = JSON.parse(archRes.content.replace(/`json\n?|\n?`/g, '').trim());
  if (!archParsed.pattern || !Array.isArray(archParsed.components) || archParsed.components.length < 3) {
    throw new Error('Arthur Architecture reasoning evaluation failed.');
  }
  console.log('  [PASS] Arthur Architecture Reasoning: Verified (' + archParsed.components.length + ' components)');

  // B. Code Generation (Devon)
  console.log('Evaluating Code Generation (Devon Vance)...');
  const codeRes = await adapter.execute(
    'gpt-6-astra',
    [
      {
        role: 'system',
        content: 'You are Devon Vance, Lead Software Engineer. Implement a TypeScript sanitizeError function that replaces Bearer tokens and xpl_ keys with [REDACTED]. Return valid JSON: {\"code\": string, \"hasRegex\": boolean}.'
      },
      {
        role: 'user',
        content: 'Write the TypeScript function sanitizeError(msg: string): string'
      }
    ],
    { maxTokens: 1500, responseFormatJson: true }
  );
  const codeParsed = JSON.parse(codeRes.content.replace(/`json\n?|\n?`/g, '').trim());
  if (!codeParsed.code || !codeParsed.code.includes('replace') || codeParsed.hasRegex !== true) {
    throw new Error('Devon Code Generation evaluation failed.');
  }
  console.log('  [PASS] Devon Code Generation: Verified');

  // C. Code Review / Defect Detection (Dr. Evelyn Reed)
  console.log('Evaluating Code Review / Defect Detection (Dr. Evelyn Reed)...');
  const reviewRes = await adapter.execute(
    'qwen3.8-27b',
    [
      {
        role: 'system',
        content: 'You are Dr. Evelyn Reed, Principal Code Reviewer. Audit this snippet for security flaws. Respond in JSON: {\"vulnerabilities\": string[], \"severity\": string, \"sqlInjectionDetected\": boolean}.'
      },
      {
        role: 'user',
        content: 'Review: const query = \"SELECT * FROM users WHERE id = \" + req.query.id; db.query(query);'
      }
    ],
    { maxTokens: 1500, responseFormatJson: true, temperature: 0.2 }
  );
  const reviewParsed = JSON.parse(reviewRes.content.replace(/`json\n?|\n?`/g, '').trim());
  if (reviewParsed.sqlInjectionDetected !== true) {
    throw new Error('Dr. Evelyn Reed Defect Detection evaluation failed.');
  }
  console.log('  [PASS] Dr. Evelyn Reed Defect Detection: Verified (Severity: ' + reviewParsed.severity + ')');

  // D. QA Test Derivation (Quinn Vance)
  console.log('Evaluating QA Test Derivation (Quinn Vance)...');
  const qaRes = await adapter.execute(
    'gpt-5.6-luna',
    [
      {
        role: 'system',
        content: 'You are Quinn Vance, QA Test Engineer. Derive edge cases for token budget allocation. Respond in JSON: {\"testCases\": [{\"name\": string, \"type\": string}], \"boundaryTestsIncluded\": boolean}.'
      },
      {
        role: 'user',
        content: 'Derive tests for: Budget .00 limit, max 32k context, and rate-limit retry headers.'
      }
    ],
    { maxTokens: 1500, responseFormatJson: true }
  );
  const qaParsed = JSON.parse(qaRes.content.replace(/`json\n?|\n?`/g, '').trim());
  if (!Array.isArray(qaParsed.testCases) || qaParsed.testCases.length < 3 || qaParsed.boundaryTestsIncluded !== true) {
    throw new Error('Quinn Vance QA evaluation failed.');
  }
  console.log('  [PASS] Quinn Vance QA Test Derivation: Verified (' + qaParsed.testCases.length + ' test cases)');

  console.log('\n======================================================================');
  console.log('EXPERIENTIAL MODEL QUALIFICATION SUITE: 100% PASSED');
  console.log('======================================================================');
}

main().catch(err => {
  console.error('Fatal qualification error:', err.message);
  process.exit(1);
});
