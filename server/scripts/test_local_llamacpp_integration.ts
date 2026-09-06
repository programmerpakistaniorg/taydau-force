import { z } from 'zod';
import { config } from '../src/config.js';
import { dynamicRouter } from '../src/gateway/dynamic-model-router.js';
import { providerAdapters } from '../src/gateway/providers/provider-registry.js';
import { localLlamaCppAdapter } from '../src/gateway/providers/local-llamacpp-adapter.js';
import {
  MODEL_REGISTRY,
  providerHealth,
  QUALITY_FLOOR_POLICIES,
  inferTaskProfile,
} from '../src/gateway/routing-registry.js';
import type { TaskProfile } from '../src/schemas/routing.js';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition: boolean, description: string): void {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`);
  }
}

async function runLocalLlamaCppIntegrationSuite(): Promise<boolean> {
  console.log('============================================================');
  console.log('TAYDAU FORCE — LOCAL LLAMA.CPP INTEGRATION & CONTRACT SUITE');
  console.log('============================================================\n');

  // ── 1. REGISTRY & METADATA CONTRACTS ──────────────────────────────────────
  console.log('--- 1. Registry & Metadata Verification ---');

  const registeredAdapter = providerAdapters.get('local_llamacpp');
  assert(Boolean(registeredAdapter), 'local_llamacpp adapter registered in ProviderRegistry');
  assert(registeredAdapter?.providerId === 'local_llamacpp', 'Adapter providerId is strictly local_llamacpp');
  assert(registeredAdapter?.trustLevel === 'LOCAL_TRUSTED', 'Adapter trustLevel is LOCAL_TRUSTED');
  assert(registeredAdapter?.defaultBilling === 'LOCAL', 'Adapter defaultBilling is LOCAL');

  const qwenModel = MODEL_REGISTRY.find((m) => m.modelId === 'local/qwen3.5-9b');
  assert(Boolean(qwenModel), 'local/qwen3.5-9b present in MODEL_REGISTRY');
  assert(qwenModel?.provider === 'local_llamacpp', 'Qwen provider is local_llamacpp');
  assert(qwenModel?.trustLevel === 'LOCAL_TRUSTED', 'Qwen trustLevel is LOCAL_TRUSTED');
  assert(qwenModel?.billingClassification === 'LOCAL', 'Qwen billingClassification is LOCAL');
  assert(qwenModel?.pricingProvenance === 'LOCAL_COMPUTE', 'Qwen pricingProvenance is LOCAL_COMPUTE');
  assert(qwenModel?.expectedBillableCostPer1M === 0, 'Qwen expectedBillableCostPer1M is strictly 0');
  assert(qwenModel?.dataPolicy === 'LOCAL_ISOLATED', 'Qwen dataPolicy is LOCAL_ISOLATED');
  assert(qwenModel?.routingContextLimit === 4096, 'Qwen routing context limit is conservative (4096 tokens)');

  const glmModel = MODEL_REGISTRY.find((m) => m.modelId === 'local/glm-4.1v-9b-thinking');
  assert(Boolean(glmModel), 'local/glm-4.1v-9b-thinking present in MODEL_REGISTRY');
  assert(glmModel?.provider === 'local_llamacpp', 'GLM provider is local_llamacpp');

  // Short alias checks
  const qwenAlias = MODEL_REGISTRY.find((m) => m.modelId === 'qwen3.5-9b');
  const glmAlias = MODEL_REGISTRY.find((m) => m.modelId === 'glm-4.1v-9b-thinking');
  assert(Boolean(qwenAlias), 'qwen3.5-9b short alias registered');
  assert(Boolean(glmAlias), 'glm-4.1v-9b-thinking short alias registered');

  // ── 2. SECURITY & BOUNDARY CHECKS ─────────────────────────────────────────
  console.log('\n--- 2. Security Boundaries & Path Sanitization ---');

  // Loopback assertion
  const loopbackCheck = await localLlamaCppAdapter.validateConnection('qwen3.5-9b');
  assert(
    config.localLlamacpp.qwen.baseUrl.startsWith('http://127.0.0.1:'),
    'Qwen endpoint binds strictly to loopback 127.0.0.1'
  );
  assert(
    config.localLlamacpp.glm.baseUrl.startsWith('http://127.0.0.1:'),
    'GLM endpoint binds strictly to loopback 127.0.0.1'
  );

  // Error parsing and sanitization
  const testError = new Error('Failed to load C:\\Users\\fxsip\\.cache\\huggingface\\hub\\models--unsloth--Qwen3.5-9B-GGUF\\file.gguf: Connection refused');
  const parsedErr = localLlamaCppAdapter.parseError(testError);
  assert(!parsedErr.message.includes('fxsip'), 'Sensitive Windows username redacted from error message');
  assert(!parsedErr.message.includes('models--unsloth'), 'HuggingFace cache internal repository hash redacted');
  assert(parsedErr.isTransient === true, 'Offline/Connection error classified as transient');
  assert(parsedErr.quotaState === 'PROVIDER_UNAVAILABLE', 'Offline local server classifies quotaState as PROVIDER_UNAVAILABLE');

  // ── 3. QUALITY FLOOR & TASK QUALIFICATION ─────────────────────────────────
  console.log('\n--- 3. Quality Floors & Task Eligibility ---');

  assert(qwenModel!.reasoningTier >= QUALITY_FLOOR_POLICIES.requirements_synthesis.minReasoningTier, 'Qwen satisfies BA requirements reasoning floor');
  assert(qwenModel!.codeTier >= QUALITY_FLOOR_POLICIES.fullstack_code_generation.minCodeTier, 'Qwen satisfies Engineer code generation floor');
  assert(qwenModel!.reasoningTier >= QUALITY_FLOOR_POLICIES.code_review.minReasoningTier, 'Qwen satisfies Reviewer reasoning floor');
  assert(qwenModel!.codeTier >= QUALITY_FLOOR_POLICIES.qa_test_generation.minCodeTier, 'Qwen satisfies QA test generation floor');

  // ── 4. FREE_ONLY BILLING MODE INTEGRATION ─────────────────────────────────
  console.log('\n--- 4. FREE_ONLY Billing Mode Policy Verification ---');

  assert(config.inferenceBillingMode === 'FREE_ONLY', 'System inference billing mode is strictly FREE_ONLY');

  // ── 5. ROUTING & FAILOVER SIMULATION ──────────────────────────────────────
  console.log('\n--- 5. Dynamic Routing & Failover Tiering Simulation ---');

  const taskProfile: TaskProfile = {
    agentRole: 'engineer',
    taskType: 'fullstack_code_generation',
    complexity: 'high',
    riskLevel: 'critical',
    structuredOutputRequired: true,
    reasoningRequirement: 'high',
    codeGenerationRequirement: 'high',
    contextSizeEstimate: 3000,
    latencySensitivity: 'medium',
    verificationCriticality: 'critical',
    confidentiality: 'PUBLIC_OR_SYNTHETIC',
  };

  // 5a. Normal operation: healthy cloud providers available -> Cloud route selected
  const normalRoute = dynamicRouter.routeTask(taskProfile);
  assert(
    normalRoute.provider !== 'local' && normalRoute.provider !== 'local_llamacpp',
    `Normal route selects cloud provider (${normalRoute.provider}/${normalRoute.modelId})`
  );
  assert(normalRoute.degradedMode === false, 'Normal cloud route is not degraded');

  // 5b. Cloud Pool Exhaustion -> Local Semantic Fallback
  // Temporarily block all cloud providers
  const cloudProviders = ['groq', 'gemini', 'nvidia', 'mistral', 'openrouter', 'experiential'];
  for (const cp of cloudProviders) {
    providerHealth.recordRateLimit(cp, 600_000, 'Simulated cloud outage for unit test');
  }

  const localFallbackRoute = dynamicRouter.routeTask(taskProfile);
  assert(
    localFallbackRoute.provider === 'local_llamacpp',
    `Cloud outage triggers local semantic fallback -> ${localFallbackRoute.provider}/${localFallbackRoute.modelId}`
  );
  assert(
    localFallbackRoute.reason === 'CLOUD_POOL_UNAVAILABLE_LOCAL_SEMANTIC_FALLBACK',
    'Local fallback route assigned CLOUD_POOL_UNAVAILABLE_LOCAL_SEMANTIC_FALLBACK reason code'
  );
  assert(
    localFallbackRoute.degradedMode === false,
    'Local semantic fallback is NOT degraded (real semantic model with quality floor met)'
  );
  assert(
    localFallbackRoute.billingClassification === 'LOCAL',
    'Local fallback route has billingClassification LOCAL'
  );

  // 5c. Cloud + Local Pool Exhaustion -> Deterministic Generator Fallback (Degraded Mode)
  providerHealth.recordRateLimit('local_llamacpp', 600_000, 'Simulated local server offline');
  providerHealth.recordRateLimit('local/qwen3.5-9b', 600_000, 'Simulated local server offline');
  providerHealth.recordRateLimit('qwen3.5-9b', 600_000, 'Simulated local server offline');
  providerHealth.recordRateLimit('local/glm-4.1v-9b-thinking', 600_000, 'Simulated local server offline');
  providerHealth.recordRateLimit('glm-4.1v-9b-thinking', 600_000, 'Simulated local server offline');

  const deterministicRoute = dynamicRouter.routeTask(taskProfile);
  assert(
    deterministicRoute.provider === 'local' && deterministicRoute.modelId === 'deterministic-generator',
    'Total outage falls back to local deterministic generator'
  );
  assert(
    deterministicRoute.reason === 'FREE_ONLY_NO_ELIGIBLE_ROUTE',
    'Deterministic fallback assigned FREE_ONLY_NO_ELIGIBLE_ROUTE reason code'
  );
  assert(
    deterministicRoute.degradedMode === true,
    'Deterministic fallback marked degradedMode: true (Release Ready blocked)'
  );

  // Clean up health tracker states
  for (const cp of cloudProviders) {
    providerHealth.recordSuccess(cp);
  }
  providerHealth.recordSuccess('local_llamacpp');
  providerHealth.recordSuccess('local/qwen3.5-9b');
  providerHealth.recordSuccess('qwen3.5-9b');
  providerHealth.recordSuccess('local/glm-4.1v-9b-thinking');
  providerHealth.recordSuccess('glm-4.1v-9b-thinking');

  // Verify health restored
  const restoredRoute = dynamicRouter.routeTask(taskProfile);
  assert(
    restoredRoute.provider !== 'local' && !restoredRoute.degradedMode,
    `Health tracker restored -> routes back to cloud provider (${restoredRoute.provider}/${restoredRoute.modelId})`
  );

  // ── 6. SUMMARY REPORT ─────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`RESULTS: ${passedChecks}/${totalChecks} PASSED`);
  console.log('============================================================\n');

  return passedChecks === totalChecks;
}

runLocalLlamaCppIntegrationSuite().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((err) => {
  console.error('Fatal error running local llama.cpp integration suite:', err);
  process.exit(1);
});
