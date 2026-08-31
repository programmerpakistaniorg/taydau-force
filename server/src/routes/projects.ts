import { Router } from 'express';
import { query } from '../db/pool.js';
import { createGateway } from '../gateway/provider-factory.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';
import { getProjectCostSummary } from '../services/cost-telemetry.js';
import { logActivity } from '../services/activity-logger.js';

const router = Router();
const gateway = createGateway();

// POST /api/projects — create project and trigger BA automatically
router.post('/', async (req, res, next) => {
  try {
    const { name, clientBrief } = req.body;
    if (!clientBrief || typeof clientBrief !== 'string' || clientBrief.trim().length < 10) {
      res.status(400).json({ error: 'clientBrief is required and must be at least 10 characters' });
      return;
    }

    const projectName = name || 'Untitled Project';

    // Create project
    const result = await query(
      'INSERT INTO projects (name, client_brief) VALUES ($1, $2) RETURNING *',
      [projectName, clientBrief.trim()]
    );
    const project = result.rows[0];

    // Log project creation activity
    await logActivity({
      projectId: project.id,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'created project',
      target: projectName,
      type: 'system',
      tag: 'Project Created',
      details: `Client brief received (${clientBrief.trim().length} chars)`,
    });

    // Trigger orchestrator asynchronously (don't block the response)
    // The orchestrator will run BA and update project status
    runOrchestrator(project.id, gateway).catch(err => {
      console.error(`Orchestrator error for project ${project.id}:`, err);
    });

    res.status(201).json({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.created_at,
      message: 'Project created. Business analysis started automatically.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/advance — advance project to next valid stage
router.post('/:id/advance', async (req, res, next) => {
  try {
    const { id } = req.params;
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const project = projectResult.rows[0];

    // Trigger orchestrator asynchronously
    runOrchestrator(project.id, gateway).catch((err) => {
      console.error(`Orchestrator advance error for project ${project.id}:`, err);
    });

    res.json({
      id: project.id,
      status: project.status,
      message: `Orchestrator advance triggered from status '${project.status}'`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects — list projects
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, client_brief, status, created_at, updated_at FROM projects ORDER BY created_at DESC LIMIT 50'
    );
    res.json({
      projects: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        clientBrief: r.client_brief,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — full project state
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const project = projectResult.rows[0];

    // Fetch related data
    const [
      requirementsResult,
      tasksResult,
      architectureResult,
      artifactsResult,
      qaArtifactsResult,
      testRunsResult,
      defectsResult,
      activitiesResult,
      qaSuiteResult,
      codeReviewResult,
      securityFindingsResult,
      releaseReadinessResult,
      llmCallsResult,
    ] = await Promise.all([
      query('SELECT * FROM requirements WHERE project_id = $1 ORDER BY code', [id]),
      query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY code', [id]),
      query('SELECT * FROM architecture_specs WHERE project_id = $1', [id]),
      query(`
        SELECT 
          ca.id,
          ca.task_id,
          ca.file_path,
          ca.content,
          ca.language,
          ca.generated_by,
          ca.artifact_type,
          ca.version,
          ca.sha256,
          ca.created_at,
          COALESCE(
            array_agg(t.code ORDER BY t.code) FILTER (WHERE t.code IS NOT NULL),
            ARRAY[]::text[]
          ) AS task_codes
        FROM code_artifacts ca
        LEFT JOIN code_artifact_tasks cat ON ca.id = cat.code_artifact_id
        LEFT JOIN tasks t ON cat.task_id = t.id
        WHERE ca.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
           OR cat.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
        GROUP BY ca.id
        ORDER BY ca.file_path
      `, [id]),
      query(`
        SELECT
          qa.id,
          qa.file_path,
          qa.content,
          qa.language,
          qa.generated_by,
          qa.version,
          qa.is_frozen,
          qa.sha256,
          qa.created_at,
          COALESCE(
            array_agg(r.code ORDER BY r.code) FILTER (WHERE r.code IS NOT NULL),
            ARRAY[]::text[]
          ) AS requirement_codes
        FROM qa_test_artifacts qa
        LEFT JOIN qa_test_requirements qtr ON qa.id = qtr.qa_test_artifact_id
        LEFT JOIN requirements r ON qtr.requirement_id = r.id
        WHERE qa.project_id = $1
        GROUP BY qa.id
        ORDER BY qa.file_path
      `, [id]),
      query('SELECT * FROM test_runs WHERE project_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM defects WHERE project_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM activities WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
      query('SELECT * FROM qa_suites WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
      query('SELECT * FROM code_reviews WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
      query('SELECT * FROM security_findings WHERE project_id = $1 ORDER BY created_at ASC', [id]),
      query('SELECT * FROM release_readiness WHERE project_id = $1 ORDER BY evaluated_at DESC LIMIT 1', [id]),
      query('SELECT * FROM llm_calls WHERE project_id = $1 ORDER BY created_at ASC', [id]),
    ]);

    // Cost summary
    const costSummary = await getProjectCostSummary(id);
    const archSpec = architectureResult.rows[0] ?? null;
    const qaSuite = qaSuiteResult.rows[0] ?? null;
    const codeReview = codeReviewResult.rows[0] ?? null;
    const releaseReadiness = releaseReadinessResult.rows[0] ?? null;

    res.json({
      id: project.id,
      name: project.name,
      clientBrief: project.client_brief,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      requirements: requirementsResult.rows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        type: r.type,
        priority: r.priority,
        acceptanceCriteria: typeof r.acceptance_criteria === 'string' ? JSON.parse(r.acceptance_criteria) : r.acceptance_criteria,
        status: r.status,
        createdAt: r.created_at,
      })),
      tasks: tasksResult.rows.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dependencies: typeof t.dependencies === 'string' ? JSON.parse(t.dependencies) : t.dependencies,
        assignedRole: t.assigned_role,
        requirementId: t.requirement_id,
        createdAt: t.created_at,
      })),
      architecture: archSpec
        ? {
            id: archSpec.id,
            techStack: typeof archSpec.tech_stack === 'string' ? JSON.parse(archSpec.tech_stack) : archSpec.tech_stack,
            fileStructure: typeof archSpec.file_structure === 'string' ? JSON.parse(archSpec.file_structure) : archSpec.file_structure,
            implementationSpec: archSpec.implementation_spec,
            decisions: typeof archSpec.decisions === 'string' ? JSON.parse(archSpec.decisions) : archSpec.decisions,
            createdAt: archSpec.created_at,
          }
        : null,
      codeArtifacts: artifactsResult.rows.map((a) => ({
        id: a.id,
        taskId: a.task_id,
        taskCodes: a.task_codes,
        filePath: a.file_path,
        content: a.content,
        language: a.language,
        generatedBy: a.generated_by,
        artifactType: a.artifact_type,
        version: a.version,
        sha256: a.sha256,
        createdAt: a.created_at,
      })),
      qaTestArtifacts: qaArtifactsResult.rows.map((qa) => ({
        id: qa.id,
        filePath: qa.file_path,
        content: qa.content,
        language: qa.language,
        generatedBy: qa.generated_by,
        requirementCodes: qa.requirement_codes,
        version: qa.version,
        isFrozen: qa.is_frozen,
        sha256: qa.sha256,
        createdAt: qa.created_at,
      })),
      qaSuite: qaSuite
        ? {
            suiteSha256: qaSuite.suite_sha256,
            suiteHash: qaSuite.suite_sha256,
            qaModel: 'openai/gpt-oss-120b',
            fileCount: qaSuite.file_count,
            isFrozen: qaSuite.is_frozen,
            version: qaSuite.version,
            createdAt: qaSuite.created_at,
          }
        : null,
      testRuns: testRunsResult.rows.map((tr) => ({
        id: tr.id,
        exitCode: tr.exit_code,
        status: tr.status,
        testType: tr.test_type,
        durationMs: tr.duration_ms,
        testsPassed: tr.tests_passed,
        testsFailed: tr.tests_failed,
        stdout: tr.stdout,
        stderr: tr.stderr,
        createdAt: tr.created_at,
      })),
      defects: defectsResult.rows.map((d) => ({
        id: d.id,
        code: d.code,
        title: d.title,
        severity: d.severity,
        status: d.status,
        description: d.description,
        evidence: typeof d.evidence === 'string' ? JSON.parse(d.evidence) : d.evidence,
        reworkAttempt: d.rework_attempt,
        resolvedBy: d.resolved_by,
        faultOrigin: d.fault_origin,
        isControlledFault: d.is_controlled_fault,
        createdAt: d.created_at,
      })),
      codeReview: codeReview
        ? {
            summary: codeReview.summary,
            findings: typeof codeReview.findings === 'string' ? JSON.parse(codeReview.findings) : codeReview.findings,
            architectureCompliance: typeof codeReview.architecture_compliance === 'string' ? JSON.parse(codeReview.architecture_compliance) : codeReview.architecture_compliance,
            maintainabilityAssessment: codeReview.maintainability_assessment,
            modelId: codeReview.model_id,
            createdAt: codeReview.created_at,
          }
        : null,
      securityFindings: securityFindingsResult.rows.map((s) => ({
        id: s.id,
        source: s.source,
        severity: s.severity,
        rule: s.rule,
        filePath: s.file_path,
        evidence: s.evidence,
        status: s.status,
        createdAt: s.created_at,
      })),
      releaseReadiness: releaseReadiness
        ? {
            isReady: releaseReadiness.is_ready,
            checks: typeof releaseReadiness.checks === 'string' ? JSON.parse(releaseReadiness.checks) : releaseReadiness.checks,
            evaluatedAt: releaseReadiness.evaluated_at,
          }
        : null,
      llmCalls: llmCallsResult.rows.map((c) => ({
        id: c.id,
        agentRole: c.agent_role,
        modelId: c.model_id,
        inputTokens: c.input_tokens,
        outputTokens: c.output_tokens,
        costUsd: parseFloat(c.cost_usd),
        latencyMs: c.latency_ms,
        createdAt: c.created_at,
      })),
      activities: activitiesResult.rows.map((a) => ({
        id: a.id,
        actor: a.actor,
        actorRole: a.actor_role,
        action: a.action,
        target: a.target,
        type: a.type,
        tag: a.tag,
        details: a.details,
        createdAt: a.created_at,
      })),
      costSummary: {
        totalBudget: 5.00,
        ...costSummary,
        budgetUsedPercent: costSummary.totalCostUsed > 0 ? (costSummary.totalCostUsed / 5.00) * 100 : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

