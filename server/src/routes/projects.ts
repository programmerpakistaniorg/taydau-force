import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../db/pool.js';
import { createGateway } from '../gateway/provider-factory.js';
import { runUntilBlocked } from '../orchestrator/orchestrator.js';
import { getProjectCostSummary } from '../services/cost-telemetry.js';
import { logActivity } from '../services/activity-logger.js';
import { WorkflowService } from '../services/workflow-service.js';
import { QuestionPolicy } from '../services/question-policy.js';
import { ROLE_REGISTRY, type RoleKey } from '../config/roles.js';

const router = Router();
const gateway = createGateway();

function safeJson(val: any, fallback: any = val): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

/**
 * Scope Classifier: Evaluates whether human feedback on wireframes represents
 * a visual-only design revision or a possible functional requirements scope change.
 */
function classifyFeedbackScope(feedback: string): 'design_only' | 'possible_scope_change' {
  const lower = feedback.toLowerCase();
  const scopeChangeKeywords = [
    'add payment', 'pay online', 'credit card', 'stripe', 'paypal',
    'authentication', 'login', 'oauth', 'google sign in', 'user accounts',
    'export to pdf', 'export to excel', 'email notification', 'sms alert',
    'inventory tracking', 'multi-tenant', 'role-based permission',
    'add new feature', 'integrate with', 'webhook', 'api key',
  ];

  for (const kw of scopeChangeKeywords) {
    if (lower.includes(kw)) {
      return 'possible_scope_change';
    }
  }
  return 'design_only';
}

// POST /api/projects — create project and start autonomous human-team delivery
router.post('/', async (req, res, next) => {
  try {
    const { name, clientBrief } = req.body;
    if (!clientBrief || typeof clientBrief !== 'string' || clientBrief.trim().length < 10) {
      res.status(400).json({ error: 'clientBrief is required and must be at least 10 characters' });
      return;
    }

    const projectName = name || 'Untitled Project';

    const result = await query(
      'INSERT INTO projects (name, client_brief, status) VALUES ($1, $2, $3) RETURNING *',
      [projectName, clientBrief.trim(), 'submitted']
    );
    const project = result.rows[0];

    // Initialize canonical workflow
    await WorkflowService.getWorkflow(project.id);

    // Log project creation
    await WorkflowService.logActivity(
      project.id,
      'System',
      'system',
      'created project and initiated',
      projectName,
      'system',
      'Project Created',
      `Client brief received (${clientBrief.trim().length} chars). Autonomous delivery initiated.`
    );

    // Run autonomous orchestration in background (prompt non-blocking HTTP response)
    runUntilBlocked(project.id, gateway).catch((err) => {
      console.error(`[orchestrator] Background run error for project ${project.id}:`, err);
    });

    res.status(201).json({
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.created_at,
      message: 'Project created. Autonomous delivery organization started.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/interactions/:interactionId/answer & /questions/:interactionId/answer
const handleAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const interactionId = req.params.interactionId as string;
    const { answer } = req.body;

    if (answer === undefined || answer === null) {
      res.status(400).json({ error: 'Answer is required' });
      return;
    }

    const interactionRes = await query(
      `SELECT * FROM client_interactions WHERE id = $1 AND project_id = $2`,
      [interactionId, id]
    );

    if (interactionRes.rows.length === 0) {
      res.status(404).json({ error: 'Interaction not found' });
      return;
    }

    const interaction = interactionRes.rows[0];

    // Idempotency: if already answered, return success immediately
    if (interaction.status === 'answered') {
      res.json({ success: true, message: 'Interaction already answered' });
      return;
    }

    // Persist answer and elevate fact to client_confirmed authority
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE client_interactions
         SET status = 'answered', answer_jsonb = $1, answered_at = now()
         WHERE id = $2`,
        [JSON.stringify(answer), interactionId]
      );

      // Save fact with highest authority: client_confirmed
      await QuestionPolicy.saveFact(client, {
        projectId: id,
        factKey: interaction.fact_key,
        category: 'client_decision',
        value: answer,
        sourceRole: interaction.agent_role,
        sourceType: 'client_confirmed',
        sourceReference: `client_interaction:${interactionId}`,
        confirmationStatus: 'client_confirmed',
        confidence: 1.0,
      });
    });

    const roleDef = ROLE_REGISTRY[interaction.agent_role as RoleKey];
    await WorkflowService.logActivity(
      id,
      'Client',
      'client',
      'answered clarification for',
      roleDef?.displayName || interaction.agent_role,
      'interaction',
      'Clarification Answered',
      `Decision for "${interaction.question}": ${typeof answer === 'object' ? JSON.stringify(answer) : answer}`
    );

    const remainingRes = await query(
      `SELECT COUNT(*)::int AS count FROM client_interactions WHERE project_id = $1 AND status = 'pending'`,
      [id]
    );
    if (remainingRes.rows[0].count === 0) {
      // All pending questions answered! Resume autonomous execution in background
      runUntilBlocked(id, gateway).catch((err) => {
        console.error(`[orchestrator] Resume after answer error for project ${id}:`, err);
      });
    } else {
      const nextAction = await WorkflowService.synthesizeNextAction(id);
      await WorkflowService.waitForClient(id, interaction.workflow_stage, interaction.agent_role, nextAction);
    }

    res.json({ success: true, message: 'Answer saved.' });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/interactions/:interactionId/answer', handleAnswer);
router.post('/:id/questions/:interactionId/answer', handleAnswer);

// POST /api/projects/:id/approvals/:approvalId/approve — approve requirements or design (Idempotent)
router.post('/:id/approvals/:approvalId/approve', async (req, res, next) => {
  try {
    const { id, approvalId } = req.params;

    const approvalRes = await query(
      `SELECT * FROM approval_requests WHERE id = $1 AND project_id = $2`,
      [approvalId, id]
    );

    if (approvalRes.rows.length === 0) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    const approval = approvalRes.rows[0];

    // Idempotency: if already approved, return success
    if (approval.status === 'approved') {
      res.json({ success: true, message: 'Approval already recorded' });
      return;
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE approval_requests SET status = 'approved', decided_at = now() WHERE id = $1`,
        [approvalId]
      );

      if (approval.artifact_type === 'requirements') {
        await client.query(
          `UPDATE requirement_baselines SET status = 'approved', approved_at = now() WHERE id = $1`,
          [approval.artifact_id]
        );
        await client.query(
          `UPDATE requirements SET status = 'approved' WHERE project_id = $1`,
          [id]
        );
      } else if (approval.artifact_type === 'design') {
        await client.query(
          `UPDATE design_specs SET status = 'approved', approved_at = now() WHERE id = $1`,
          [approval.artifact_id]
        );
      }
    });

    await WorkflowService.logActivity(
      id,
      'Client',
      'client',
      'approved',
      `${approval.artifact_type === 'requirements' ? 'Requirements Baseline' : 'Interactive Product Preview'} (v${approval.artifact_version})`,
      'approval',
      'Human Approval Granted',
      `Client approved ${approval.artifact_type} v${approval.artifact_version}. Autonomous handoff continuing.`
    );

    // Resume autonomous execution in background
    runUntilBlocked(id, gateway).catch((err) => {
      console.error(`[orchestrator] Resume after approval error for project ${id}:`, err);
    });

    res.json({ success: true, message: 'Approval recorded. Team resumed execution.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/approvals/:approvalId/request-changes — request revisions with scope classification (Idempotent)
router.post('/:id/approvals/:approvalId/request-changes', async (req, res, next) => {
  try {
    const { id, approvalId } = req.params;
    const { feedback } = req.body;

    if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 3) {
      res.status(400).json({ error: 'Detailed feedback is required to request changes' });
      return;
    }

    const approvalRes = await query(
      `SELECT * FROM approval_requests WHERE id = $1 AND project_id = $2`,
      [approvalId, id]
    );

    if (approvalRes.rows.length === 0) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    const approval = approvalRes.rows[0];
    const classification = classifyFeedbackScope(feedback);

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE approval_requests 
         SET status = 'changes_requested', feedback = $1, scope_classification = $2, decided_at = now()
         WHERE id = $3`,
        [feedback.trim(), classification, approvalId]
      );

      if (approval.artifact_type === 'design') {
        // Save client feedback on the design spec
        await client.query(
          `UPDATE design_specs SET client_feedback = $1, status = 'superseded' WHERE id = $2`,
          [feedback.trim(), approval.artifact_id]
        );

        if (classification === 'possible_scope_change') {
          // Route back to BA for requirements change control
          await client.query(
            `UPDATE project_workflows
             SET stage = 'created', stage_status = 'pending', active_role = 'business_analyst', updated_at = now()
             WHERE project_id = $1`,
            [id]
          );
        } else {
          // Route back to Designer for Wireframe revision v2
          await client.query(
            `UPDATE project_workflows
             SET stage = 'ui_ux_design', stage_status = 'pending', active_role = 'ui_ux_designer', updated_at = now()
             WHERE project_id = $1`,
            [id]
          );
        }
      } else if (approval.artifact_type === 'requirements') {
        await client.query(
          `UPDATE requirement_baselines SET status = 'superseded' WHERE id = $1`,
          [approval.artifact_id]
        );
        await client.query(
          `UPDATE project_workflows
           SET stage = 'created', stage_status = 'pending', active_role = 'business_analyst', updated_at = now()
           WHERE project_id = $1`,
          [id]
        );
      }
    });

    await WorkflowService.logActivity(
      id,
      'Client',
      'client',
      'requested changes for',
      `${approval.artifact_type} v${approval.artifact_version} (Scope: ${classification})`,
      'approval',
      'Revision Requested',
      `Feedback: "${feedback.trim()}". Routing to ${classification === 'possible_scope_change' ? 'Aria Analyst (Change Control)' : 'Sofia Designer (Design Revision)'}.`
    );

    // Resume autonomous execution in background
    runUntilBlocked(id, gateway).catch((err) => {
      console.error(`[orchestrator] Resume after change request error for project ${id}:`, err);
    });

    res.json({
      success: true,
      classification,
      message: `Changes requested. Routed to ${classification === 'possible_scope_change' ? 'Business Analyst for Scope Change' : 'UI/UX Designer for Revision'}.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/retry — retry from failed stage without rolling back
router.post('/:id/retry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const workflow = await WorkflowService.getWorkflow(id);

    if (workflow.stageStatus !== 'failed') {
      res.status(400).json({ error: `Project is in '${workflow.stageStatus}' status, cannot retry.` });
      return;
    }

    await query(
      `UPDATE project_workflows
       SET stage_status = 'pending',
           retry_count = retry_count + 1,
           last_error_code = null,
           last_error_summary = null,
           runner_id = null,
           run_started_at = null,
           updated_at = now()
       WHERE project_id = $1`,
      [id]
    );

    await WorkflowService.logActivity(
      id,
      'Client',
      'client',
      'triggered retry on failed stage',
      workflow.stage,
      'system',
      'Retry Triggered',
      `Retrying stage ${workflow.stage} (Attempt ${workflow.retryCount + 1}). Upstream artifacts preserved.`
    );

    runUntilBlocked(id, gateway).catch((err) => {
      console.error(`[orchestrator] Resume after retry error for project ${id}:`, err);
    });

    res.json({ success: true, message: `Retrying stage ${workflow.stage}...` });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/advance — legacy advance alias
router.post('/:id/advance', async (req, res, next) => {
  try {
    const { id } = req.params;
    runUntilBlocked(id, gateway).catch((err) => {
      console.error(`[orchestrator] Advance error for project ${id}:`, err);
    });
    res.json({ success: true, message: 'Autonomous execution triggered' });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects — list projects
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.client_brief, p.status, p.created_at, p.updated_at,
              pw.stage, pw.stage_status, pw.progress, pw.next_action_type
       FROM projects p
       LEFT JOIN project_workflows pw ON p.id = pw.project_id
       ORDER BY p.created_at DESC LIMIT 50`
    );
    res.json({
      projects: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        clientBrief: r.client_brief,
        status: r.status,
        stage: r.stage || 'created',
        stageStatus: r.stage_status || 'pending',
        progress: r.progress || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — full rich project state
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const project = projectResult.rows[0];

    const [
      workflow,
      nextAction,
      factsRes,
      interactionsRes,
      approvalsRes,
      reqBaselinesRes,
      designSpecsRes,
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
      designArtifactsResult,
    ] = await Promise.all([
      WorkflowService.getWorkflow(id),
      WorkflowService.synthesizeNextAction(id),
      query(`SELECT * FROM project_facts WHERE project_id = $1 AND is_current = true ORDER BY created_at ASC`, [id]),
      query(`SELECT * FROM client_interactions WHERE project_id = $1 ORDER BY created_at ASC`, [id]),
      query(`SELECT * FROM approval_requests WHERE project_id = $1 ORDER BY created_at DESC`, [id]),
      query(`SELECT * FROM requirement_baselines WHERE project_id = $1 ORDER BY version DESC`, [id]),
      query(`SELECT * FROM design_specs WHERE project_id = $1 ORDER BY version DESC`, [id]),
      query('SELECT * FROM requirements WHERE project_id = $1 ORDER BY code', [id]),
      query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY code', [id]),
      query('SELECT * FROM architecture_specs WHERE project_id = $1', [id]),
      query(`
        SELECT 
          ca.id, ca.task_id, ca.file_path, ca.content, ca.language,
          ca.generated_by, ca.artifact_type, ca.version, ca.sha256, ca.created_at,
          COALESCE(array_agg(t.code ORDER BY t.code) FILTER (WHERE t.code IS NOT NULL), ARRAY[]::text[]) AS task_codes
        FROM code_artifacts ca
        LEFT JOIN code_artifact_tasks cat ON ca.id = cat.code_artifact_id
        LEFT JOIN tasks t ON cat.task_id = t.id
        WHERE ca.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
           OR cat.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
        GROUP BY ca.id ORDER BY ca.file_path
      `, [id]),
      query(`
        SELECT
          qa.id, qa.file_path, qa.content, qa.language, qa.generated_by,
          qa.version, qa.is_frozen, qa.sha256, qa.created_at,
          COALESCE(array_agg(r.code ORDER BY r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY[]::text[]) AS requirement_codes
        FROM qa_test_artifacts qa
        LEFT JOIN qa_test_requirements qtr ON qa.id = qtr.qa_test_artifact_id
        LEFT JOIN requirements r ON qtr.requirement_id = r.id
        WHERE qa.project_id = $1
        GROUP BY qa.id ORDER BY qa.file_path
      `, [id]),
      query('SELECT * FROM test_runs WHERE project_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM defects WHERE project_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM activities WHERE project_id = $1 ORDER BY created_at DESC LIMIT 60', [id]),
      query('SELECT * FROM qa_suites WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
      query('SELECT * FROM code_reviews WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]),
      query('SELECT * FROM security_findings WHERE project_id = $1 ORDER BY created_at ASC', [id]),
      query('SELECT * FROM release_readiness WHERE project_id = $1 ORDER BY evaluated_at DESC LIMIT 1', [id]),
      query('SELECT * FROM llm_calls WHERE project_id = $1 ORDER BY created_at ASC', [id]),
      query(`SELECT * FROM design_artifacts WHERE design_spec_id IN (SELECT id FROM design_specs WHERE project_id = $1) ORDER BY created_at ASC`, [id]),
    ]);

    const costSummary = await getProjectCostSummary(id);
    const archSpec = architectureResult.rows[0] ?? null;
    const qaSuite = qaSuiteResult.rows[0] ?? null;
    const codeReview = codeReviewResult.rows[0] ?? null;
    const releaseReadiness = releaseReadinessResult.rows[0] ?? null;

    // Calculate Client Interruption Metrics
    const allInteractions = interactionsRes.rows;
    const questionsPerRole: Record<string, number> = {};
    for (const inter of allInteractions) {
      questionsPerRole[inter.agent_role] = (questionsPerRole[inter.agent_role] || 0) + 1;
    }

    const interruptionMetrics = {
      totalQuestions: allInteractions.length,
      questionsAnswered: allInteractions.filter((i) => i.status === 'answered').length,
      questionsPending: allInteractions.filter((i) => i.status === 'pending').length,
      questionsPerRole,
      approvalsCount: approvalsRes.rows.length,
      totalInterruptions: allInteractions.length + approvalsRes.rows.length,
    };

    res.json({
      id: project.id,
      name: project.name,
      clientBrief: project.client_brief,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      workflow,
      nextAction,
      interruptionMetrics,
      projectFacts: factsRes.rows.map((f) => ({
        id: f.id,
        factKey: f.fact_key,
        category: f.category,
        value: safeJson(f.value_jsonb),
        sourceRole: f.source_role,
        sourceType: f.source_type,
        confirmationStatus: f.confirmation_status,
        confidence: parseFloat(f.confidence),
        version: f.version,
        isCurrent: f.is_current,
        createdAt: f.created_at,
      })),
      clientInteractions: allInteractions.map((i) => ({
        id: i.id,
        agentRole: i.agent_role,
        workflowStage: i.workflow_stage,
        factKey: i.fact_key,
        interactionType: i.interaction_type,
        question: i.question,
        whyItMatters: i.why_it_matters,
        options: safeJson(i.options_jsonb, []),
        recommendedOption: i.recommended_option,
        allowCustom: i.allow_custom,
        impact: i.impact,
        required: i.required,
        status: i.status,
        answer: safeJson(i.answer_jsonb, null),
        createdAt: i.created_at,
        answeredAt: i.answered_at,
      })),
      pendingInteractions: allInteractions
        .filter((i) => i.status === 'pending')
        .map((i) => ({
          id: i.id,
          agentRole: i.agent_role,
          workflowStage: i.workflow_stage,
          factKey: i.fact_key,
          interactionType: i.interaction_type,
          question: i.question,
          whyItMatters: i.why_it_matters,
          options: safeJson(i.options_jsonb, []),
          recommendedOption: i.recommended_option,
          allowCustom: i.allow_custom,
          impact: i.impact,
          required: i.required,
          status: i.status,
          createdAt: i.created_at,
        })),
      approvalRequests: approvalsRes.rows.map((a) => ({
        id: a.id,
        artifactType: a.artifact_type,
        artifactId: a.artifact_id,
        artifactVersion: a.artifact_version,
        status: a.status,
        feedback: a.feedback,
        scopeClassification: a.scope_classification,
        createdAt: a.created_at,
        decidedAt: a.decided_at,
      })),
      pendingApproval: (() => {
        const p = approvalsRes.rows.find((a) => a.status === 'pending');
        if (!p) return null;
        return {
          id: p.id,
          artifactType: p.artifact_type,
          artifactId: p.artifact_id,
          artifactVersion: p.artifact_version,
          status: p.status,
          feedback: p.feedback,
          scopeClassification: p.scope_classification,
          createdAt: p.created_at,
          decidedAt: p.decided_at,
        };
      })(),
      requirementBaselines: reqBaselinesRes.rows.map((rb) => ({
        id: rb.id,
        version: rb.version,
        status: rb.status,
        snapshot: safeJson(rb.snapshot_jsonb, {}),
        createdAt: rb.created_at,
        approvedAt: rb.approved_at,
      })),
      designSpecs: designSpecsRes.rows.map((ds) => ({
        id: ds.id,
        version: ds.version,
        status: ds.status,
        summary: ds.summary,
        design: safeJson(ds.design_jsonb, {}),
        previousVersionId: ds.previous_version_id,
        revisionReason: ds.revision_reason,
        clientFeedback: ds.client_feedback,
        createdAt: ds.created_at,
        approvedAt: ds.approved_at,
      })),
      designArtifacts: (designArtifactsResult?.rows || []).map((da: any) => ({
        id: da.id,
        designSpecId: da.design_spec_id,
        provider: da.provider,
        providerProjectId: da.provider_project_id,
        providerScreenId: da.provider_screen_id,
        screenKey: da.screen_key,
        artifactType: da.artifact_type,
        providerUrl: da.provider_url,
        content: da.content,
        contentSha256: da.content_sha256,
        metadata: safeJson(da.metadata, {}),
        createdAt: da.created_at,
      })),
      requirements: requirementsResult.rows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        type: r.type,
        priority: r.priority,
        acceptanceCriteria: safeJson(r.acceptance_criteria, []),
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
        dependencies: safeJson(t.dependencies, []),
        assignedRole: t.assigned_role,
        requirementId: t.requirement_id,
        createdAt: t.created_at,
      })),
      architecture: archSpec
        ? {
            id: archSpec.id,
            techStack: safeJson(archSpec.tech_stack, {}),
            fileStructure: safeJson(archSpec.file_structure, []),
            implementationSpec: archSpec.implementation_spec,
            decisions: safeJson(archSpec.decisions, []),
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
        evidence: safeJson(d.evidence, {}),
        reworkAttempt: d.rework_attempt,
        resolvedBy: d.resolved_by,
        faultOrigin: d.fault_origin,
        isControlledFault: d.is_controlled_fault,
        createdAt: d.created_at,
      })),
      codeReview: codeReview
        ? {
            summary: codeReview.summary,
            findings: safeJson(codeReview.findings, []),
            architectureCompliance: safeJson(codeReview.architecture_compliance, {}),
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
            checks: safeJson(releaseReadiness.checks, {}),
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

// POST /api/projects/:id/pause
router.post('/:id/pause', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await WorkflowService.pauseWorkflow(id);
    await WorkflowService.logActivity(
      id,
      'User',
      'client',
      'paused the project',
      'Paused Delivery',
      'user',
      'Project Paused',
      'User paused autonomous delivery loop. All artifacts and state preserved.'
    );
    res.json({ success: true, message: 'Project paused successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/resume
router.post('/:id/resume', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await WorkflowService.resumeWorkflow(id);
    await WorkflowService.logActivity(
      id,
      'User',
      'client',
      'resumed the project',
      'Resumed Delivery',
      'user',
      'Project Resumed',
      'User resumed autonomous delivery loop.'
    );
    runUntilBlocked(id, gateway).catch((err) => {
      console.error(`[orchestrator] Background resume error for project ${id}:`, err);
    });
    res.json({ success: true, message: 'Project resumed successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/end
router.post('/:id/end', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await WorkflowService.endWorkflow(id);
    await WorkflowService.logActivity(
      id,
      'User',
      'client',
      'ended the project permanently',
      'Project Terminated',
      'user',
      'Project Closed',
      'User permanently ended this software delivery project.'
    );
    res.json({ success: true, message: 'Project ended permanently.' });
  } catch (err) {
    next(err);
  }
});

export default router;

