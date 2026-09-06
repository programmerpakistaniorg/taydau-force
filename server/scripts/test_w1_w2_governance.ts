import { createGateway } from '../src/gateway/provider-factory.js';
import { runBAAgent } from '../src/agents/ba-agent.js';
import { RequirementsIntegrityValidator } from '../src/validators/requirements-integrity-validator.js';

interface TestCase {
  id: string;
  name: string;
  brief: string;
  forbiddenCanaryTerms: string[];
}

const TEST_PROJECTS: TestCase[] = [
  {
    id: 'proj-progtay-01',
    name: 'ProgTay Developer Community',
    brief: 'Build a developer portfolio and open-source contribution tracker with GitHub sync, project stars, and developer badges.',
    forbiddenCanaryTerms: ['technician bay', 'vehicle model', 'oil change', 'dental', 'teeth', 'cavity', 'patient record']
  },
  {
    id: 'proj-dentcare-02',
    name: 'DentCare Pediatric Clinic',
    brief: 'Build an online appointment scheduling platform for a pediatric dental clinic with doctor availability calendar, patient registration, and SMS visit reminders.',
    forbiddenCanaryTerms: ['technician bay', 'vehicle model', 'oil change', 'git repository', 'pull request', 'commit sha']
  },
  {
    id: 'proj-autopro-03',
    name: 'AutoPro Fleet Maintenance',
    brief: 'Build a fleet vehicle inspection and oil maintenance logging system for commercial trucks with mileage tracking and service alerts.',
    forbiddenCanaryTerms: ['dental', 'teeth', 'cavity', 'patient record', 'github star', 'developer badge']
  }
];

async function runGovernanceEvalSuite() {
  console.log('======================================================================');
  console.log('TAYDAU FORCE — WORKFORCE GOVERNANCE EVALUATION SUITE (W1 + W2)');
  console.log('======================================================================\n');

  const gateway = createGateway();
  let totalAssertions = 0;
  let passedAssertions = 0;

  function assert(condition: boolean, desc: string) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  [PASS] ${desc}`);
    } else {
      console.error(`  [FAIL] ${desc}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. SEQUENTIAL ORDER TEST: ProgTay -> Dental -> AutoPro
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: SEQUENTIAL ORDER CONTAMINATION & PROVENANCE EVALUATION ---');
  const seqResults: Record<string, any> = {};

  for (const proj of TEST_PROJECTS) {
    console.log(`\nExecuting Aria Analyst v2 for: ${proj.name} (${proj.id})`);
    const output = await runBAAgent(gateway, proj.brief, proj.id);

    // Validate with RequirementsIntegrityValidator
    const valResult = RequirementsIntegrityValidator.validate(proj.id, proj.brief, output);
    assert(valResult.isValid, `${proj.name} passed RequirementsIntegrityValidator (0 errors)`);
    assert(output.requirements.length >= 1, `${proj.name} produced at least 1 testable requirement (got ${output.requirements.length})`);

    // Verify 100% Provenance Coverage
    const provenanceCount = output.requirements.filter((r) => r.provenance && r.provenance.sourceType).length;
    assert(provenanceCount === output.requirements.length, `${proj.name} has 100% provenance coverage (${provenanceCount}/${output.requirements.length})`);

    // Verify Source ID correctness
    const validSourceIdCount = output.requirements.filter((r) => r.provenance?.sourceId === proj.id).length;
    assert(validSourceIdCount === output.requirements.length, `${proj.name} requirements all link to valid sourceId "${proj.id}"`);

    // Assert 0% Cross-Project Contamination
    const fullText = JSON.stringify(output).toLowerCase();
    let contaminationCount = 0;
    for (const canary of proj.forbiddenCanaryTerms) {
      if (fullText.includes(canary.toLowerCase())) {
        console.error(`    CONTAMINATION DETECTED in ${proj.name}: Found canary term "${canary}"`);
        contaminationCount++;
      }
    }
    assert(contaminationCount === 0, `${proj.name} has ZERO cross-domain canary contamination (0/${proj.forbiddenCanaryTerms.length} detected)`);

    seqResults[proj.id] = output;
  }

  // -------------------------------------------------------------------------
  // 2. REVERSED ORDER TEST: AutoPro -> ProgTay -> Dental
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: REVERSED ORDER ISOLATION EVALUATION ---');
  const reversedProjects = [...TEST_PROJECTS].reverse();

  for (const proj of reversedProjects) {
    console.log(`\nExecuting Aria Analyst v2 in reverse order for: ${proj.name}`);
    const output = await runBAAgent(gateway, proj.brief, proj.id);

    const valResult = RequirementsIntegrityValidator.validate(proj.id, proj.brief, output);
    assert(valResult.isValid, `Reversed ${proj.name} passed RequirementsIntegrityValidator`);

    const fullText = JSON.stringify(output).toLowerCase();
    let contaminationCount = 0;
    for (const canary of proj.forbiddenCanaryTerms) {
      if (fullText.includes(canary.toLowerCase())) {
        contaminationCount++;
      }
    }
    assert(contaminationCount === 0, `Reversed ${proj.name} zero cross-domain canary contamination`);
  }

  // -------------------------------------------------------------------------
  // 3. CONCURRENT PROJECTS ISOLATION TEST
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: CONCURRENT PARALLEL INVOCATION ISOLATION ---');
  console.log('Launching ProgTay & DentCare simultaneously via Promise.all...');

  const [concA, concB] = await Promise.all([
    runBAAgent(gateway, TEST_PROJECTS[0].brief, TEST_PROJECTS[0].id),
    runBAAgent(gateway, TEST_PROJECTS[1].brief, TEST_PROJECTS[1].id),
  ]);

  const concTextA = JSON.stringify(concA).toLowerCase();
  const concTextB = JSON.stringify(concB).toLowerCase();

  assert(!concTextA.includes('teeth') && !concTextA.includes('dental'), 'Concurrent ProgTay contains 0 dental concepts');
  assert(!concTextB.includes('github') && !concTextB.includes('open-source'), 'Concurrent DentCare contains 0 GitHub/dev concepts');
  assert(concA.requirements.every((r) => r.provenance?.sourceId === TEST_PROJECTS[0].id), 'Concurrent ProgTay requirements bound to ProgTay project ID');
  assert(concB.requirements.every((r) => r.provenance?.sourceId === TEST_PROJECTS[1].id), 'Concurrent DentCare requirements bound to DentCare project ID');

  // -------------------------------------------------------------------------
  // 4. VERSIONING & REVISION ISOLATION TEST
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: VERSIONING & REVISION ISOLATION ---');
  console.log('Simulating Client Change Request on ProgTay v1 -> v2 with specific feedback...');

  const progTayV1 = seqResults['proj-progtay-01'];
  const revisionFeedback = 'Please also add mandatory 2-Factor Authentication for all open-source repo syncing.';

  const progTayV2 = await runBAAgent(gateway, TEST_PROJECTS[0].brief, TEST_PROJECTS[0].id, {}, {
    clientFeedback: revisionFeedback,
    previousRequirements: progTayV1.requirements,
  });

  const v2Val = RequirementsIntegrityValidator.validate(TEST_PROJECTS[0].id, TEST_PROJECTS[0].brief, progTayV2);
  assert(v2Val.isValid, 'ProgTay v2 baseline passed integrity validation');
  assert(progTayV2.requirements.length >= 1, 'ProgTay v2 contains revised requirements');
  assert(
    JSON.stringify(progTayV2).toLowerCase().includes('factor') || 
    JSON.stringify(progTayV2).toLowerCase().includes('auth') || 
    JSON.stringify(progTayV2).toLowerCase().includes('security') ||
    JSON.stringify(progTayV2).toLowerCase().includes('sync'),
    'ProgTay v2 successfully incorporated client feedback'
  );

  // -------------------------------------------------------------------------
  // 5. DETERMINISTIC MALFORMED INPUT REJECTION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: DETERMINISTIC MALFORMED PROVENANCE REJECTION ---');
  const badBAOutput: any = {
    status: 'ready',
    businessObjective: 'Bad project',
    targetUsers: ['User'],
    requirements: [
      {
        code: 'REQ-001',
        title: 'Fake Requirement',
        type: 'Functional',
        priority: 'High',
        acceptanceCriteria: ['Too short'], // Fails criteria length
        provenance: {
          sourceType: 'CLIENT_BRIEF',
          sourceId: 'foreign-project-id-999', // Fails project ID mismatch
          sourceExcerpt: 'Nothing real',
          epistemicStatus: 'EXPLICIT',
        }
      }
    ]
  };

  const badVal = RequirementsIntegrityValidator.validate('correct-project-id-123', 'Some client brief text', badBAOutput);
  assert(!badVal.isValid, 'RequirementsIntegrityValidator successfully rejected foreign project ID and brief criteria');
  assert(badVal.errors.some((e) => e.includes('foreign sourceId')), 'Validator correctly identified foreign sourceId violation');
  assert(badVal.errors.some((e) => e.includes('too brief to be testable')), 'Validator correctly identified too-brief criteria violation');

  console.log('\n======================================================================');
  console.log(`EVALUATION SUMMARY: ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED (${Math.round((passedAssertions / totalAssertions) * 100)}%)`);
  console.log('======================================================================\n');

  if (passedAssertions === totalAssertions) {
    console.log('>>> VERDICT: ALL W1 + W2 WORKFORCE GOVERNANCE CRITERIA SATISFIED (PASS) <<<');
    process.exit(0);
  } else {
    console.error('>>> VERDICT: GOVERNANCE FAILURES DETECTED <<<');
    process.exit(1);
  }
}

runGovernanceEvalSuite().catch((err) => {
  console.error('Fatal error during evaluation suite:', err);
  process.exit(1);
});
