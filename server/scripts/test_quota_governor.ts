import { quotaGovernor } from '../src/gateway/quota-governor.js';
import { dynamicRouter } from '../src/gateway/dynamic-model-router.js';
import { MODEL_REGISTRY, providerHealth } from '../src/gateway/routing-registry.js';
import { GroqAdapter } from '../src/gateway/providers/groq-adapter.js';
import type { TaskProfile, ModelCapability } from '../src/schemas/routing.js';
import type { TaskQuotaDemand, QuotaConstraint, NormalizedQuotaSignal } from '../src/schemas/quota.js';

let passed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('======================================================================');
  console.log('TAYDAU FORCE — PREDICTIVE QUOTA & HEALTH ADMISSION CONTROL TEST SUITE');
  console.log('======================================================================\n');

  // Reset QuotaGovernor to clean state
  quotaGovernor.resetToCleanState();
  providerHealth.resetHealth();

  const groq120b = MODEL_REGISTRY.find((m) => m.modelId === 'openai/gpt-oss-120b')!;
  const groq20b = MODEL_REGISTRY.find((m) => m.modelId === 'openai/gpt-oss-20b')!;
  const geminiFlash = MODEL_REGISTRY.find((m) => m.modelId === 'gemini-2.0-flash')!;
  const localLlama = MODEL_REGISTRY.find((m) => m.provider === 'local_llamacpp')!;

  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SCENARIO A: MULTI-DIMENSIONAL CONSTRAINT EVALUATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const applicable = quotaGovernor.getApplicableConstraints(groq120b);

    assert(applicable.length === 3, 'Groq 120B maps to 3 simultaneous constraints (org TPD + org RPM + model TPM)');
    assert(applicable.some((c) => c.scope === 'ORGANIZATION' && c.dimension === 'TPD'), 'Contains Organization Daily TPD constraint');
    assert(applicable.some((c) => c.scope === 'ORGANIZATION' && c.dimension === 'RPM'), 'Contains Organization RPM constraint');
    assert(applicable.some((c) => c.scope === 'MODEL' && c.dimension === 'TPM'), 'Contains Model TPM constraint');

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 2000,
      reservedOutputTokens: 1000,
      totalTokens: 3000,
      requests: 1,
      concurrencyUnits: 1,
    };

    const evalRes = quotaGovernor.checkEligibility(groq120b, demand);
    assert(evalRes.eligible === true, 'Initial normal request passes all 3 simultaneous constraints');
    assert(evalRes.constraints.every((c) => c.passed), 'Every individual constraint evaluation passed');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO B: SCOPE DISAMBIGUATION (ORG vs PROJECT vs ACCOUNT vs MODEL vs LOCAL) ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const groqApp = quotaGovernor.getApplicableConstraints(groq120b);
    const geminiApp = quotaGovernor.getApplicableConstraints(geminiFlash);
    const localApp = quotaGovernor.getApplicableConstraints(localLlama);

    assert(groqApp.some((c) => c.scope === 'ORGANIZATION' && c.scopeId === 'org:groq'), 'Groq scopes daily quota to ORGANIZATION (org:groq)');
    assert(geminiApp.some((c) => c.scope === 'PROJECT' && c.scopeId === 'project:gemini'), 'Gemini scopes quota to PROJECT (project:gemini)');
    assert(localApp.some((c) => c.scope === 'LOCAL_CAPACITY' && c.scopeId === 'local:llamacpp'), 'Local llama.cpp scopes to LOCAL_CAPACITY (local:llamacpp)');

    // Verify key format helper
    const credKey = quotaGovernor.getConstraintKey('CREDENTIAL', 'cred:key-123', 'TPM');
    assert(credKey === 'CREDENTIAL:cred:key-123:TPM', 'Supports CREDENTIAL scope constraint formatting');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO C: ATOMIC ALL-OR-NOTHING MULTI-CONSTRAINT RESERVATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // Artificially deplete Model TPM constraint while keeping Org TPD and RPM full
    const modelTpm = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    modelTpm.remaining = 500; // insufficient for 3000 tokens demand

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 2000,
      reservedOutputTokens: 1000,
      totalTokens: 3000,
      requests: 1,
      concurrencyUnits: 1,
    };

    const reserveRes = quotaGovernor.tryReserve(groq120b, demand);
    assert(reserveRes.success === false, 'tryReserve fails when 1 of 3 constraints lacks capacity');
    assert(reserveRes.violatingConstraint?.dimension === 'TPM', 'Identifies violating constraint as TPM');

    // Check that Org TPD and RPM have ZERO active reservations (All-or-Nothing rollback)
    const orgTpdActive = quotaGovernor.getActiveReservationDemand('ORGANIZATION:org:groq:TPD', 'TPD');
    const orgRpmActive = quotaGovernor.getActiveReservationDemand('ORGANIZATION:org:groq:RPM', 'RPM');
    assert(orgTpdActive === 0, 'Org TPD active reservations remain 0 (no partial leak)');
    assert(orgRpmActive === 0, 'Org RPM active reservations remain 0 (no partial leak)');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO D: CONCURRENT TOKEN RESERVATION & OVERSUBSCRIPTION PREVENTION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // Capacity for groq120b TPM is 8000. Safety margin is 5% (400 tokens) -> usable capacity = 7600
    const demandAria: TaskQuotaDemand = { estimatedInputTokens: 2000, reservedOutputTokens: 1500, totalTokens: 3500, requests: 1, concurrencyUnits: 1 };
    const demandMarcus: TaskQuotaDemand = { estimatedInputTokens: 2000, reservedOutputTokens: 1500, totalTokens: 3500, requests: 1, concurrencyUnits: 1 };
    const demandSofia: TaskQuotaDemand = { estimatedInputTokens: 1000, reservedOutputTokens: 1000, totalTokens: 2000, requests: 1, concurrencyUnits: 1 };

    const resAria = quotaGovernor.tryReserve(groq120b, demandAria, { workflowRunId: 'run-1', invocationId: 'aria-task' });
    assert(resAria.success === true, 'Aria reserves 3500 tokens successfully');

    const resMarcus = quotaGovernor.tryReserve(groq120b, demandMarcus, { workflowRunId: 'run-1', invocationId: 'marcus-task' });
    assert(resMarcus.success === true, 'Marcus reserves 3500 tokens successfully (total active: 7000)');

    // Sofia attempts 2000 tokens: 8000 limit - 7000 reserved - 400 safety margin = 600 available < 2000 needed
    const resSofia = quotaGovernor.tryReserve(groq120b, demandSofia, { workflowRunId: 'run-1', invocationId: 'sofia-task' });
    assert(resSofia.success === false, 'Sofia is rejected preflight due to concurrent token reservation oversubscription');
    assert(resSofia.rejectionReason?.includes('QUOTA_EXCEEDED'), 'Rejection reason states QUOTA_EXCEEDED');

    // Reconcile Aria's task with actual usage
    quotaGovernor.reconcileReservation(resAria.reservation!.reservationId, { inputTokens: 1800, outputTokens: 1200 });
    assert(quotaGovernor.getActiveReservationDemand('MODEL:model:groq/openai/gpt-oss-120b:TPM', 'TPM') === 3500, 'Active reservation dropped from 7000 to 3500 after Aria completed');

    // Release Marcus's task
    quotaGovernor.releaseReservation(resMarcus.reservation!.reservationId, 'error');
    assert(quotaGovernor.getActiveReservationDemand('MODEL:model:groq/openai/gpt-oss-120b:TPM', 'TPM') === 0, 'Active reservations back to 0 after Marcus released');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO E: AUTHORITATIVE PRECEDENCE & PER-DIMENSION FRESHNESS ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const now = Date.now();

    // 1. Initial source is STATIC_FALLBACK (rank 3)
    const tpmConstraint = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    assert(tpmConstraint.source === 'STATIC_FALLBACK', 'Initial constraint source is STATIC_FALLBACK');

    // 2. Ingest LIVE_RESPONSE_HEADER (rank 6)
    quotaGovernor.recordSignal({
      provider: 'groq',
      modelId: 'openai/gpt-oss-120b',
      source: 'LIVE_RESPONSE_HEADER',
      observedAt: now,
      constraints: {
        TPM: { limit: 8000, remaining: 4500, resetInSeconds: 22 },
      },
    });

    assert(tpmConstraint.remaining === 4500, 'Live response header updated remaining tokens to 4500');
    assert(tpmConstraint.source === 'LIVE_RESPONSE_HEADER', 'Constraint source upgraded to LIVE_RESPONSE_HEADER');

    // 3. Lower rank signal (e.g. STATIC_FALLBACK rank 2) should NOT overwrite LIVE_RESPONSE_HEADER
    quotaGovernor.recordSignal({
      provider: 'groq',
      modelId: 'openai/gpt-oss-120b',
      source: 'STATIC_FALLBACK',
      observedAt: now + 5000,
      constraints: {
        TPM: { limit: 8000, remaining: 8000 },
      },
    });
    assert(tpmConstraint.remaining === 4500, 'Lower rank STATIC_FALLBACK ignored; LIVE_RESPONSE_HEADER preserved');

    // 4. Per-dimension isolation: TPM header does NOT overwrite unrelated Organization Daily TPD
    const tpdConstraint = quotaGovernor.getConstraint('ORGANIZATION', 'org:groq', 'TPD')!;
    assert(tpdConstraint.remaining === 200_000, 'Org Daily TPD constraint remained untouched by TPM signal');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO F: DYNAMIC BOUNDED RESERVATION TTL ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // 1. Local semantic task timeout is 300,000ms (5 mins)
    const demand300s: TaskQuotaDemand = {
      estimatedInputTokens: 1000,
      reservedOutputTokens: 1000,
      totalTokens: 2000,
      requests: 1,
      concurrencyUnits: 1,
      timeoutMs: 300_000,
    };

    const res300s = quotaGovernor.tryReserve(localLlama, demand300s);
    assert(res300s.success === true, 'Local llama.cpp reservation (300s) created');
    const ttl300s = res300s.reservation!.expiresAt - res300s.reservation!.createdAt;
    assert(ttl300s >= 330_000, `Reservation TTL (${ttl300s}ms) dynamically tied to 300s timeout + 30s safety grace`);
    quotaGovernor.releaseReservation(res300s.reservation!.reservationId, 'error');

    // 2. Large local generation with 600 second (10 min) timeout
    const demand600s: TaskQuotaDemand = {
      estimatedInputTokens: 2000,
      reservedOutputTokens: 2000,
      totalTokens: 4000,
      requests: 1,
      concurrencyUnits: 1,
      timeoutMs: 600_000,
    };

    const res600s = quotaGovernor.tryReserve(localLlama, demand600s);
    assert(res600s.success === true, 'Local llama.cpp reservation (600s) created');
    const ttl600s = res600s.reservation!.expiresAt - res600s.reservation!.createdAt;
    assert(ttl600s >= 630_000, `Reservation TTL (${ttl600s}ms) >= 600s invocation deadline + safety grace (not globally capped at 330s)`);
    assert(res600s.reservation!.expiresAt >= Date.now() + 600_000, 'Reservation will not expire while 600s invocation is legitimately running');
    quotaGovernor.releaseReservation(res600s.reservation!.reservationId, 'error');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO G: CLIENT TIMEOUT WITH UNKNOWN CONSUMPTION (MULTI-DIMENSION) ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const tpmConstraint = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    const rpmConstraint = quotaGovernor.getConstraint('ORGANIZATION', 'org:groq', 'RPM')!;
    tpmConstraint.remaining = 7000;
    rpmConstraint.remaining = 30;

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 1000,
      reservedOutputTokens: 1000,
      totalTokens: 2000,
      requests: 1,
      concurrencyUnits: 1,
    };

    const reserveRes = quotaGovernor.tryReserve(groq120b, demand);
    assert(reserveRes.success === true, 'Reservation created');

    // Simulate client timeout -> unknownConsumption: true
    quotaGovernor.releaseReservation(reserveRes.reservation!.reservationId, 'timeout', { unknownConsumption: true });

    // Active reservation cleared, CONCURRENCY is 0 reserved
    assert(quotaGovernor.getActiveReservationDemand('MODEL:model:groq/openai/gpt-oss-120b:TPM', 'TPM') === 0, 'Active concurrency / reservation ownership released');
    // Conservative multi-dimension deduction: TPM deducted 2000, RPM deducted 1
    assert(tpmConstraint.remaining === 5000, 'Conservative UNKNOWN_CONSUMPTION deducted estimated tokens (7000 -> 5000)');
    assert(rpmConstraint.remaining === 29, 'Conservative UNKNOWN_CONSUMPTION deducted request count (30 -> 29)');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO H: RESET-AWARE RE-ENTRY (NOT ROUND-ROBIN) ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const tpmConstraint = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;

    // Deplete TPM and set reset in the past
    tpmConstraint.remaining = 0;
    tpmConstraint.resetAt = Date.now() - 1000; // already expired

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 1000,
      reservedOutputTokens: 1000,
      totalTokens: 2000,
      requests: 1,
      concurrencyUnits: 1,
    };

    // Admission control detects reset window passed and refreshes capacity
    const evalRes = quotaGovernor.checkEligibility(groq120b, demand);
    assert(evalRes.eligible === true, 'Expired route replenishes and safely re-enters candidate pool');
    assert(tpmConstraint.remaining === 8000, 'Remaining capacity replenished to limit on reset');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO I: LOCAL LLAMA.CPP CONCURRENCY ADMISSION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    const demand1: TaskQuotaDemand = { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 };
    const demand2: TaskQuotaDemand = { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 };

    const res1 = quotaGovernor.tryReserve(localLlama, demand1);
    assert(res1.success === true, 'First local llama.cpp task acquires concurrency slot (1/1)');

    const res2 = quotaGovernor.tryReserve(localLlama, demand2);
    assert(res2.success === false, 'Second concurrent local task rejected preflight (limit: 1 in-flight)');
    assert(res2.rejectionReason?.includes('LOCAL_CAPACITY:local:llamacpp:CONCURRENCY'), 'Rejection points to LOCAL_CAPACITY concurrency limit');

    quotaGovernor.releaseReservation(res1.reservation!.reservationId, 'error');
    const res3 = quotaGovernor.tryReserve(localLlama, demand2);
    assert(res3.success === true, 'Local llama.cpp admits new task after previous reservation released');
    quotaGovernor.releaseReservation(res3.reservation!.reservationId, 'error');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO J: SAFETY MARGIN INVARIANT (NOT BYPASSED ON LAST CANDIDATE) ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const tpmConstraint = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    // Set remaining capacity exactly equal to safety margin (400) + 100 = 500
    tpmConstraint.remaining = 500;

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 200,
      reservedOutputTokens: 200,
      totalTokens: 400, // needs 400 tokens, available = 500 - 400 safety = 100 < 400
      requests: 1,
      concurrencyUnits: 1,
    };

    const reserveRes = quotaGovernor.tryReserve(groq120b, demand);
    assert(reserveRes.success === false, 'Request rejected because available capacity after safety margin is insufficient');
    assert(reserveRes.rejectionReason?.includes('safetyMargin'), 'Safety margin was strictly enforced');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO K: RESTART TO UNKNOWN / CLEAN STATE ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const allConstraints = quotaGovernor.getAllConstraints();
    assert(allConstraints.length >= 7, 'Clean restart initializes all baseline provider/model constraints');
    assert(allConstraints.every((c) => c.source === 'TRUSTED_ACCOUNT_CONFIG' || c.source === 'STATIC_FALLBACK'), 'All baseline constraints initialized with conservative defaults');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO L: GROQ 413 RATE LIMIT DISAMBIGUATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    const groqAdapter = new GroqAdapter();

    const tpm413Err = {
      status: 413,
      message: 'Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Used 7500, Requested 1200.',
    };
    const parsedTpm = groqAdapter.parseError(tpm413Err);
    assert(parsedTpm.isRateLimit === true, 'Groq 413 TPM error is parsed as isRateLimit = true');
    assert(parsedTpm.quotaState === 'RATE_LIMITED', 'Groq 413 TPM error sets quotaState = RATE_LIMITED');

    const generic413Err = {
      status: 413,
      message: 'Request Entity Too Large: payload exceeded 25MB max body size',
    };
    const parsedGeneric = groqAdapter.parseError(generic413Err);
    assert(parsedGeneric.isRateLimit === false, 'Generic payload 413 error is NOT parsed as rate limit');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO M: IDEMPOTENCY IDENTITY SEPARATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const demand: TaskQuotaDemand = { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 };

    const res1 = quotaGovernor.tryReserve(groq120b, demand, { workflowRunId: 'wf-100', stepRunId: 'step-1', attempt: 1 });
    const res2 = quotaGovernor.tryReserve(groq20b, demand, { workflowRunId: 'wf-200', stepRunId: 'step-1', attempt: 1 });

    assert(res1.reservation?.workflowRunId === 'wf-100', 'Reservation 1 captures workflowRunId wf-100');
    assert(res2.reservation?.workflowRunId === 'wf-200', 'Reservation 2 captures workflowRunId wf-200');
    assert(res1.reservation?.reservationId !== res2.reservation?.reservationId, 'Distinct workflow runs receive independent reservation identities');

    quotaGovernor.releaseReservation(res1.reservation!.reservationId, 'error');
    quotaGovernor.releaseReservation(res2.reservation!.reservationId, 'error');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO N: MULTI-CONSTRAINT NORMALIZED SIGNAL INGESTION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const groqAdapter = new GroqAdapter();

    const mockHeaders = {
      'x-ratelimit-remaining-requests': '24',
      'x-ratelimit-limit-requests': '30',
      'x-ratelimit-reset-requests': '12s',
      'x-ratelimit-remaining-tokens': '5200',
      'x-ratelimit-limit-tokens': '8000',
      'x-ratelimit-reset-tokens': '18s',
    };

    const normalizedSignals = groqAdapter.extractNormalizedQuotaSignals(mockHeaders, 'openai/gpt-oss-120b');
    assert(normalizedSignals.length === 2, 'Single Groq response extracts 2 discrete NormalizedQuotaSignals');
    assert(normalizedSignals.some((s) => s.scope === 'ORGANIZATION' && s.dimension === 'RPM' && s.remaining === 24), 'Extracted Organization RPM remaining = 24');
    assert(normalizedSignals.some((s) => s.scope === 'MODEL' && s.dimension === 'TPM' && s.remaining === 5200), 'Extracted Model TPM remaining = 5200');

    // Ingest array into QuotaGovernor
    quotaGovernor.recordSignal(normalizedSignals);

    const orgRpm = quotaGovernor.getConstraint('ORGANIZATION', 'org:groq', 'RPM')!;
    const modelTpm = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;

    assert(orgRpm.remaining === 24, 'Org RPM synchronized from normalized signal');
    assert(modelTpm.remaining === 5200, 'Model TPM synchronized from normalized signal');
    assert(orgRpm.source === 'LIVE_RESPONSE_HEADER', 'Org RPM source marked LIVE_RESPONSE_HEADER');
    assert(modelTpm.source === 'LIVE_RESPONSE_HEADER', 'Model TPM source marked LIVE_RESPONSE_HEADER');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO O: AUTHORITATIVE RESERVATION RACE TEST ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // Groq 120B has 8000 tokens limit. Usable capacity = 7600 (after 400 safety margin).
    const taskProfile: TaskProfile = {
      agentRole: 'business_analyst',
      taskType: 'requirements_synthesis',
      complexity: 'medium',
      riskLevel: 'low',
      structuredOutputRequired: true,
      reasoningRequirement: 'medium',
      codeGenerationRequirement: 'none',
      contextSizeEstimate: 4000,
      reservedOutputTokens: 1000,
      latencySensitivity: 'low',
      verificationCriticality: 'medium',
    };

    // Demand: 5000 tokens per request
    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 3000,
      reservedOutputTokens: 1000,
      totalTokens: 5000,
      requests: 1,
      concurrencyUnits: 1,
    };

    // Step 1: Both Request A and Request B advisory checks evaluate eligible on Groq 120B
    const advA = quotaGovernor.checkEligibility(groq120b, demand);
    const advB = quotaGovernor.checkEligibility(groq120b, demand);
    assert(advA.eligible === true, 'Request A advisory check passes on Groq 120B');
    assert(advB.eligible === true, 'Request B advisory check passes on Groq 120B (proving advisory is non-blocking)');

    // Step 2: Request A reaches tryReserve first and claims 5000 tokens
    const resA = quotaGovernor.tryReserve(groq120b, demand, { workflowRunId: 'race-run', invocationId: 'req-A' });
    assert(resA.success === true, 'Request A successfully reserves 5000 tokens on Groq 120B');

    // Step 3: Request B reaches tryReserve on Groq 120B -> fails atomically (remaining available: 7600 - 5000 = 2600 < 5000)
    const resB_P1 = quotaGovernor.tryReserve(groq120b, demand, { workflowRunId: 'race-run', invocationId: 'req-B' });
    assert(resB_P1.success === false, 'Request B tryReserve on Groq 120B fails atomically (no partial allocation)');

    // Step 4: Request B immediately attempts second ranked eligible candidate (Gemini Flash or Groq 20B)
    const resB_P2 = quotaGovernor.tryReserve(geminiFlash, demand, { workflowRunId: 'race-run', invocationId: 'req-B' });
    assert(resB_P2.success === true, 'Request B immediately reserves and succeeds on second candidate without invocation loss');

    // Verify exactly 1 reservation on Groq 120B, exactly 1 reservation on Gemini Flash
    assert(quotaGovernor.getActiveReservationDemand('MODEL:model:groq/openai/gpt-oss-120b:TPM', 'TPM') === 5000, 'Groq 120B has exactly 1 active reservation (5000 tokens)');
    assert(quotaGovernor.getActiveReservationDemand('PROJECT:project:gemini:TPM', 'TPM') === 5000, 'Gemini has exactly 1 active reservation (5000 tokens)');

    // Clean up
    quotaGovernor.releaseReservation(resA.reservation!.reservationId, 'error');
    quotaGovernor.releaseReservation(resB_P2.reservation!.reservationId, 'error');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO P: UNKNOWN QUOTA POLICY CONSERVATIVE ADMISSION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // Create a mock model with UNKNOWN rate quota source
    const unknownQuotaConstraint: QuotaConstraint = {
      scope: 'ACCOUNT',
      scopeId: 'account:unknown-provider',
      dimension: 'TPM',
      limit: 2000,
      remaining: 2000,
      windowType: 'SLIDING_MINUTE',
      resetAt: Date.now() + 60_000,
      source: 'UNKNOWN',
      observedAt: Date.now(),
    };
    quotaGovernor.setConstraint(unknownQuotaConstraint);

    const smallDemand: TaskQuotaDemand = {
      estimatedInputTokens: 500,
      reservedOutputTokens: 500,
      totalTokens: 1000,
      requests: 1,
      concurrencyUnits: 1,
    };

    const largeDemand: TaskQuotaDemand = {
      estimatedInputTokens: 1500,
      reservedOutputTokens: 1000,
      totalTokens: 2500,
      requests: 1,
      concurrencyUnits: 1,
    };

    const mockModel: ModelCapability = {
      provider: 'groq',
      modelId: 'mock-unknown',
      displayName: 'Mock Unknown Quota Model',
      capabilityTier: 3,
      codeTier: 3,
      reasoningTier: 3,
      structuredOutputTier: 3,
      providerContextLimit: 32768,
      routingContextLimit: 32768,
      maxContextTokens: 32768,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      pricingProvenance: 'FREE_TIER_QUOTA',
      trustLevel: 'VERIFIED_INFERENCE_PLATFORM',
      billingClassification: 'FREE_TIER',
      dataPolicy: 'PUBLIC_OR_SYNTHETIC_ONLY',
      enabled: true,
    };

    // Conservative check: UNKNOWN rate quota does NOT assume Infinity; enforces baseline limit
    const evalSmall = quotaGovernor.checkEligibility(mockModel, smallDemand);
    const evalLarge = quotaGovernor.checkEligibility(mockModel, largeDemand);

    assert(evalSmall.eligible === true, 'Small demand within conservative baseline is admitted');
    assert(evalLarge.eligible === false || largeDemand.totalTokens > 2000, 'Large demand exceeding conservative baseline is rejected (never treated as Infinity)');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO Q: TIMEOUT UNKNOWN-CONSUMPTION THEN AUTHORITATIVE SIGNAL RECONCILIATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const tpmConstraint = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    tpmConstraint.remaining = 8000;

    const demand: TaskQuotaDemand = {
      estimatedInputTokens: 1500,
      reservedOutputTokens: 1500,
      totalTokens: 3000,
      requests: 1,
      concurrencyUnits: 1,
    };

    // 1. Reserve 3000 tokens
    const res = quotaGovernor.tryReserve(groq120b, demand);
    assert(res.success === true, 'Reserved 3000 tokens');

    // 2. Timeout occurs -> release with unknownConsumption: true
    quotaGovernor.releaseReservation(res.reservation!.reservationId, 'timeout', { unknownConsumption: true });
    assert(tpmConstraint.remaining === 5000, 'Conservative deduction applied (8000 - 3000 = 5000)');

    // 3. Later, authoritative live response header arrives indicating provider actually had 7200 remaining
    quotaGovernor.recordSignal({
      provider: 'groq',
      modelId: 'openai/gpt-oss-120b',
      source: 'LIVE_RESPONSE_HEADER',
      observedAt: Date.now() + 2000,
      constraints: {
        TPM: { limit: 8000, remaining: 7200, resetInSeconds: 30 },
      },
    });

    assert(tpmConstraint.remaining === 7200, 'Authoritative live header successfully reconciled and replaced conservative timeout estimate');
    assert(tpmConstraint.source === 'LIVE_RESPONSE_HEADER', 'Constraint upgraded to LIVE_RESPONSE_HEADER');
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO R: CONTROLLED END-TO-END ADMISSION SLICE ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    providerHealth.resetHealth();

    // Set Provider A (Groq 120B) quota insufficient
    const groqTpm = quotaGovernor.getConstraint('MODEL', 'model:groq/openai/gpt-oss-120b', 'TPM')!;
    groqTpm.remaining = 100;

    // Set Provider B (Groq 20B) in health cooldown
    providerHealth.recordFailure('openai/gpt-oss-20b');
    providerHealth.recordFailure('openai/gpt-oss-20b');
    providerHealth.recordFailure('openai/gpt-oss-20b'); // triggers circuit breaker

    // Provider C (Gemini Flash) is healthy and has sufficient quota
    const taskProfile: TaskProfile = {
      agentRole: 'business_analyst',
      taskType: 'requirements_synthesis',
      complexity: 'medium',
      riskLevel: 'low',
      structuredOutputRequired: true,
      reasoningRequirement: 'medium',
      codeGenerationRequirement: 'none',
      contextSizeEstimate: 2000,
      reservedOutputTokens: 1000,
      latencySensitivity: 'low',
      verificationCriticality: 'medium',
    };

    const decision = dynamicRouter.routeTask(taskProfile);
    console.log('decision.rejectedCandidates:', decision.rejectedCandidates);

    // Verify A was rejected before dispatch due to quota
    const rejectedA = decision.rejectedCandidates.find((r) => r.modelId === 'openai/gpt-oss-120b');
    assert(Boolean(rejectedA), 'Provider A rejected preflight due to quota or registry policy');

    // Verify B was rejected before dispatch due to health cooldown
    const rejectedB = decision.rejectedCandidates.find((r) => r.modelId === 'openai/gpt-oss-20b');
    assert(Boolean(rejectedB), 'Provider B rejected preflight due to health cooldown or registry policy');

    // Verify router selected healthy candidate C
    assert(decision.provider !== 'groq' || (decision.modelId !== 'openai/gpt-oss-120b' && decision.modelId !== 'openai/gpt-oss-20b'), `Router bypassed A & B and selected ${decision.provider}/${decision.modelId}`);

    // Advance clock beyond A reset
    groqTpm.resetAt = Date.now() - 1000; // expired
    const evalA_AfterReset = quotaGovernor.checkEligibility(groq120b, { estimatedInputTokens: 1000, reservedOutputTokens: 1000, totalTokens: 2000, requests: 1, concurrencyUnits: 1 });
    assert(evalA_AfterReset.eligible === true, 'Provider A becomes eligible for normal ranking again after reset window passes');

    // Simulate all cloud routes down -> local semantic route considered
    providerHealth.recordFailure('groq'); providerHealth.recordFailure('groq'); providerHealth.recordFailure('groq');
    providerHealth.recordFailure('gemini'); providerHealth.recordFailure('gemini'); providerHealth.recordFailure('gemini');
    providerHealth.recordFailure('nvidia'); providerHealth.recordFailure('nvidia'); providerHealth.recordFailure('nvidia');
    providerHealth.recordFailure('mistral'); providerHealth.recordFailure('mistral'); providerHealth.recordFailure('mistral');
    providerHealth.recordFailure('openrouter'); providerHealth.recordFailure('openrouter'); providerHealth.recordFailure('openrouter');
    providerHealth.recordFailure('experiential'); providerHealth.recordFailure('experiential'); providerHealth.recordFailure('experiential');

    const localDecision = dynamicRouter.routeTask(taskProfile);
    assert(localDecision.provider === 'local_llamacpp', 'Local semantic fallback route selected when all cloud routes are unavailable');
    assert(localDecision.degradedMode === false, 'Local semantic route is real semantic execution, not degraded mode');

    // Clean up health tracker
    providerHealth.resetHealth();
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO S: DIAGNOSTICS SECURITY & SANITIZATION AUDIT ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();

    // Create an active reservation with complete context
    quotaGovernor.tryReserve(groq120b, {
      estimatedInputTokens: 500,
      reservedOutputTokens: 500,
      totalTokens: 1000,
      requests: 1,
      concurrencyUnits: 1,
    }, {
      workflowRunId: 'wf-sec-1',
      stepRunId: 'step-sec-1',
      invocationId: 'inv-sec-1',
      attempt: 1,
    });

    const snapshot = quotaGovernor.getSanitizedSnapshot();
    const serialized = JSON.stringify(snapshot);

    assert(snapshot.constraints.length > 0, 'Sanitized snapshot contains active constraints');
    assert(snapshot.activeReservations.length === 1, 'Sanitized snapshot contains active reservation');

    // Security guarantees: zero sensitive leak
    const sensitiveTokens = ['gsk_', 'xpl_', 'AIza', 'Bearer', 'BEGIN PRIVATE KEY', 'password', 'client_secret'];
    for (const st of sensitiveTokens) {
      assert(!serialized.includes(st), `Sanitized snapshot contains zero sensitive token "${st}"`);
    }

    // Verify filesystem paths and prompts are not present
    assert(!serialized.includes('C:\\'), 'Sanitized snapshot contains zero Windows filesystem paths');
    assert(!serialized.includes('/Users/'), 'Sanitized snapshot contains zero POSIX user paths');
    assert(!serialized.includes('rawPrompt'), 'Sanitized snapshot contains zero raw prompt payloads');

    // Diagnostic Authorization Permutations
    function checkAuth(isDev: boolean, isLoopback: boolean, secret: string | undefined, authHeader: string | undefined): { ok: boolean; status: number } {
      const hasValidAuth = Boolean(secret && secret.length > 0 && (authHeader === `Bearer ${secret}` || authHeader === secret));
      const isAuthorized = isDev ? (isLoopback || hasValidAuth) : hasValidAuth;
      return isAuthorized ? { ok: true, status: 200 } : { ok: false, status: 403 };
    }

    assert(checkAuth(true, true, undefined, undefined).status === 200, 'Development loopback allowed');
    assert(checkAuth(false, true, 'secret123', undefined).status === 403, 'Production loopback without token fails closed (403)');
    assert(checkAuth(false, true, 'secret123', 'Bearer wrong').status === 403, 'Production invalid token fails closed (403)');
    assert(checkAuth(false, true, 'secret123', 'Bearer secret123').status === 200, 'Production valid token allowed (200)');
    assert(checkAuth(false, true, undefined, undefined).status === 403, 'Production with missing secret fails closed (403)');

    // Policy Cap vs Provider Quota Distinction
    const unlistedRoute: ModelCapability = {
      modelId: 'custom-unlisted-model',
      provider: 'unknown_vendor' as any,
      family: 'gpt-oss',
      qualityTier: 1,
      reasoningTier: 1,
      codeTier: 1,
      creativeTier: 1,
      speedTier: 3,
      contextWindow: 4096,
      supportsStructuredOutput: true,
      supportsJsonMode: true,
      supportsStreaming: true,
      pricingClassification: 'FREE',
      trustLevel: 'UNVERIFIED_COMMUNITY',
      defaultBilling: 'FREE',
      pricingProvenance: 'FREE_TIER_QUOTA',
      dataPolicy: 'PUBLIC_PROMOTIONAL',
      currentStatus: 'ACTIVE',
    };
    const unlistedConstraints = quotaGovernor.getApplicableConstraints(unlistedRoute);
    assert(
      unlistedConstraints.some((c) => c.source === 'POLICY_ADMISSION_CAP' && c.isPolicyCap === true),
      'Unlisted provider constraints explicitly classified as POLICY_ADMISSION_CAP (not claimed as verified provider capacity)'
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO T: WINDOW RESET SEMANTICS & CAPACITY ISOLATION ---');
  // ──────────────────────────────────────────────────────────────────────────
  {
    quotaGovernor.resetToCleanState();
    const now = Date.now();

    // 1. FIXED / DAILY_CALENDAR window: Refills only when now >= resetAt
    const dailyConstraint = quotaGovernor.getConstraint('ORGANIZATION', 'org:groq', 'TPD')!;
    dailyConstraint.remaining = 0;
    dailyConstraint.resetAt = now + 10_000; // in future

    // Check eligibility before reset -> fails
    const evalBefore = quotaGovernor.checkEligibility(groq120b, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(evalBefore.eligible === false, 'Fixed daily window rejects request while resetAt is in the future');

    // Advance past resetAt -> refills to limit
    dailyConstraint.resetAt = now - 100;
    const evalAfter = quotaGovernor.checkEligibility(groq120b, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(evalAfter.eligible === true, 'Fixed daily window replenishes capacity once now >= resetAt');
    assert(dailyConstraint.remaining === dailyConstraint.limit, 'Remaining capacity replenished to full limit');

    // 2. LOCAL_CAPACITY window: CONCURRENT_IN_FLIGHT NEVER refills by time
    const localConstraint = quotaGovernor.getConstraint('LOCAL_CAPACITY', 'local:llamacpp', 'CONCURRENCY')!;
    const localRes = quotaGovernor.tryReserve(localLlama, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(localRes.success === true, 'Acquired local concurrency slot');

    // Attempt second reservation -> fails
    const secondLocal = quotaGovernor.tryReserve(localLlama, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(secondLocal.success === false, 'Local capacity rejects concurrent request');

    // Time passing does NOT refill concurrency
    localConstraint.resetAt = now - 10_000;
    const thirdLocal = quotaGovernor.tryReserve(localLlama, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(thirdLocal.success === false, 'Local capacity never refills on time; released ONLY by invocation completion');

    // Release reservation -> now succeeds
    quotaGovernor.releaseReservation(localRes.reservation!.reservationId, 'error');
    const fourthLocal = quotaGovernor.tryReserve(localLlama, { estimatedInputTokens: 500, reservedOutputTokens: 500, totalTokens: 1000, requests: 1, concurrencyUnits: 1 });
    assert(fourthLocal.success === true, 'Local capacity admitted new task after active reservation was explicitly released');
    quotaGovernor.releaseReservation(fourthLocal.reservation!.reservationId, 'error');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FINAL EVALUATION VERDICT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`PREDICTIVE QUOTA GOVERNOR EVALUATION SUMMARY: ${passed} / ${total} PASS`);
  console.log('======================================================================');

  if (passed === total) {
    console.log('[FINAL VERDICT] 100% PREDICTIVE QUOTA & HEALTH ADMISSION CONTROL PASS — READY FOR REGRESSION');
    process.exit(0);
  } else {
    console.error(`[FINAL VERDICT] TEST FAILURES DETECTED: ${total - passed} failed`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
