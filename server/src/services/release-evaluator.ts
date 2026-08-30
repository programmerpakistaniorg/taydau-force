import { query } from '../db/pool.js';

export interface ReleaseCheck {
  name: string;
  category: 'requirements' | 'qa' | 'security' | 'review' | 'traceability';
  passed: boolean;
  details: string;
}

export interface ReleaseReadinessResult {
  isReady: boolean;
  projectId: string;
  evaluatedAt: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: ReleaseCheck[];
}

/**
 * Deterministically evaluates release readiness strictly from persisted database evidence.
 */
export async function evaluateReleaseReadiness(projectId: string): Promise<ReleaseReadinessResult> {
  const checks: ReleaseCheck[] = [];

  // Check 1: Validated Requirements Coverage
  const reqRes = await query(
    'SELECT id, code FROM requirements WHERE project_id = $1',
    [projectId]
  );
  const totalReqs = reqRes.rows.length;

  const reqCovRes = await query(
    `SELECT DISTINCT r.id FROM requirements r
     JOIN qa_test_requirements qtr ON qtr.requirement_id = r.id
     JOIN qa_test_artifacts qta ON qta.id = qtr.qa_test_artifact_id
     WHERE r.project_id = $1`,
    [projectId]
  );
  const coveredReqs = reqCovRes.rows.length;
  const reqCoveragePassed = totalReqs > 0 && coveredReqs === totalReqs;
  checks.push({
    name: 'Requirements Coverage',
    category: 'requirements',
    passed: reqCoveragePassed,
    details: `${coveredReqs}/${totalReqs} requirements covered by independent acceptance tests (${totalReqs > 0 ? ((coveredReqs / totalReqs) * 100).toFixed(0) : 0}%)`,
  });

  // Check 2: Frozen QA Suite
  const qaSuiteRes = await query(
    'SELECT suite_sha256, is_frozen, file_count FROM qa_suites WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
    [projectId]
  );
  const isQAFrozen = qaSuiteRes.rows.length > 0 && qaSuiteRes.rows[0].is_frozen === true;
  checks.push({
    name: 'Frozen QA Suite Integrity',
    category: 'qa',
    passed: isQAFrozen,
    details: isQAFrozen
      ? `Authoritative QA suite frozen (SHA-256: ${qaSuiteRes.rows[0].suite_sha256.slice(0, 12)}..., ${qaSuiteRes.rows[0].file_count} files)`
      : 'No frozen QA suite found in database',
  });

  // Check 3: Deterministic Acceptance Test Execution
  const testRunRes = await query(
    'SELECT status, tests_passed, tests_failed, exit_code FROM test_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
    [projectId]
  );
  const latestRun = testRunRes.rows[0];
  const acceptancePassed = latestRun && latestRun.status === 'passed' && latestRun.tests_failed === 0 && latestRun.tests_passed > 0;
  checks.push({
    name: 'Acceptance Test Pass Rate',
    category: 'qa',
    passed: Boolean(acceptancePassed),
    details: latestRun
      ? `Latest test run: ${latestRun.tests_passed} passed, ${latestRun.tests_failed} failed (Status: ${latestRun.status}, Exit code: ${latestRun.exit_code})`
      : 'No acceptance test run recorded',
  });

  // Check 4: Open Product Defects
  const defectRes = await query(
    `SELECT code, title, severity FROM defects WHERE project_id = $1 AND status = 'open'`,
    [projectId]
  );
  const openDefects = defectRes.rows.length;
  checks.push({
    name: 'Open Product Defects',
    category: 'qa',
    passed: openDefects === 0,
    details: openDefects === 0
      ? '0 open product defects'
      : `${openDefects} unresolved open defect(s): ${defectRes.rows.map((d) => d.code).join(', ')}`,
  });

  // Check 5: Code Review Critical Blockers
  const crRes = await query(
    'SELECT summary, findings, architecture_compliance FROM code_reviews WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1',
    [projectId]
  );
  let crPassed = true;
  let crDetails = 'Code review completed with no critical blockers';
  if (crRes.rows.length > 0) {
    const findings = Array.isArray(crRes.rows[0].findings) ? crRes.rows[0].findings : JSON.parse(crRes.rows[0].findings || '[]');
    const criticalFindings = findings.filter((f: any) => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      crPassed = false;
      crDetails = `${criticalFindings.length} critical code review finding(s) detected`;
    }
  } else {
    crPassed = false;
    crDetails = 'No code review recorded for project';
  }
  checks.push({
    name: 'Code Review Clearance',
    category: 'review',
    passed: crPassed,
    details: crDetails,
  });

  // Check 6: Deterministic Security Critical Findings
  const secCritRes = await query(
    `SELECT count(*) FROM security_findings WHERE project_id = $1 AND severity = 'critical' AND status = 'open'`,
    [projectId]
  );
  const critSecCount = parseInt(secCritRes.rows[0].count, 10);
  checks.push({
    name: 'Security Gate (Critical Blockers)',
    category: 'security',
    passed: critSecCount === 0,
    details: critSecCount === 0 ? '0 critical security vulnerabilities' : `${critSecCount} critical security finding(s)`,
  });

  // Check 7: Deterministic Security High Findings
  const secHighRes = await query(
    `SELECT count(*) FROM security_findings WHERE project_id = $1 AND severity = 'high' AND status = 'open'`,
    [projectId]
  );
  const highSecCount = parseInt(secHighRes.rows[0].count, 10);
  checks.push({
    name: 'Security Gate (High Blockers)',
    category: 'security',
    passed: highSecCount === 0,
    details: highSecCount === 0 ? '0 high-severity security vulnerabilities' : `${highSecCount} high-severity security finding(s)`,
  });

  // Check 8: Relational Task Traceability
  const taskRes = await query('SELECT count(*) FROM tasks WHERE project_id = $1', [projectId]);
  const totalTasks = parseInt(taskRes.rows[0].count, 10);
  const coveredTasksRes = await query(
    `SELECT count(DISTINCT task_id) FROM code_artifact_tasks cat
     JOIN tasks t ON t.id = cat.task_id
     WHERE t.project_id = $1`,
    [projectId]
  );
  const coveredTasks = parseInt(coveredTasksRes.rows[0].count, 10);
  const tracePassed = totalTasks > 0 && coveredTasks === totalTasks;
  checks.push({
    name: 'Task-to-Code Traceability',
    category: 'traceability',
    passed: tracePassed,
    details: `${coveredTasks}/${totalTasks} implementation tasks mapped to code artifacts (${totalTasks > 0 ? ((coveredTasks / totalTasks) * 100).toFixed(0) : 0}%)`,
  });

  const passedChecks = checks.filter((c) => c.passed).length;
  const failedChecks = checks.filter((c) => !c.passed).length;
  const isReady = failedChecks === 0;
  const evaluatedAt = new Date().toISOString();

  // Persist readiness evaluation
  await query(
    `INSERT INTO release_readiness (project_id, is_ready, checks, evaluated_at)
     VALUES ($1, $2, $3, $4)`,
    [projectId, isReady, JSON.stringify(checks), evaluatedAt]
  );

  // If ready, update project status to 'release_ready'
  if (isReady) {
    await query(
      `UPDATE projects SET status = 'release_ready', updated_at = now() WHERE id = $1`,
      [projectId]
    );
  }

  return {
    isReady,
    projectId,
    evaluatedAt,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    checks,
  };
}
