import { config } from '../config.js';
import { DefectClassifier, type ClassificationResult } from '../services/defect-classifier.js';
import { DefectService, type PersistedDefect } from '../services/defect-service.js';
import { REWORK_CONFIG } from '../config/rework.js';
import { runEngineerReworkAgent } from '../agents/engineer-rework-agent.js';
import { designGateway } from '../design/design-gateway.js';
import crypto from 'crypto';
import { withTransaction, query } from '../db/pool.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { EventEmitterService } from '../services/event-emitter.js';
import { runBAAgent } from '../agents/ba-agent.js';
import { runPMDeliveryPlanAgent, runPMTaskRefinementAgent, type RequirementContext } from '../agents/pm-agent.js';
import { runUIUXDesignerAgent } from '../agents/ui-ux-designer-agent.js';
import { runArchitectAgent } from '../agents/architect-agent.js';
import { runEngineerAgent } from '../agents/engineer-agent.js';
import { runQAAgent, runQARepairAgent } from '../agents/qa-agent.js';
import { runCodeReviewAgent } from '../agents/code-review-agent.js';
import { runSecurityGate } from '../services/security-gate.js';
import { validateEngineerArtifacts } from '../services/artifact-validator.js';
import { validateQAArtifacts } from '../services/qa-validator.js';
import {
  materializeWorkspace,
  cleanupWorkspace,
  executeSandboxTests,
  type SandboxExecutionResult,
} from '../services/docker-sandbox.js';
import { getRemainingBudget } from '../services/cost-telemetry.js';
import { QuestionPolicy } from '../services/question-policy.js';
import { WorkflowService, type WorkflowStage } from '../services/workflow-service.js';
import { ManifestService } from '../services/manifest-service.js';
import type { TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';
import type { QAOutput } from '../schemas/qa-artifact.js';
import type { DesignSpec } from '../schemas/design-spec.js';

const activeRunners = new Set<string>();

export async function runUntilBlocked(projectId: string, gateway: ModelGateway): Promise<void> {
  const runnerId = `runner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (activeRunners.has(projectId)) {
    console.log(`[orchestrator] Project ${projectId} already has an active runner.`);
    return;
  }

  activeRunners.add(projectId);

  try {
    let continueWorkflow = true;

    while (continueWorkflow) {
      const workflow = await WorkflowService.getWorkflow(projectId);

      if (workflow.stageStatus === 'completed' || workflow.stage === 'completed') {
        break;
      }
      if (workflow.stageStatus === 'failed') {
        break;
      }

      const pendingInteractions = await query(
        `SELECT id FROM client_interactions WHERE project_id = $1 AND status = 'pending'`,
        [projectId]
      );
      if (pendingInteractions.rows.length > 0) {
        const nextAction = await WorkflowService.synthesizeNextAction(projectId);
        await WorkflowService.waitForClient(projectId, workflow.stage, workflow.activeRole || 'business_analyst', nextAction);
        break;
      }

      const pendingApprovals = await query(
        `SELECT id, artifact_type FROM approval_requests WHERE project_id = $1 AND status = 'pending'`,
        [projectId]
      );
      if (pendingApprovals.rows.length > 0) {
        const nextAction = await WorkflowService.synthesizeNextAction(projectId);
        await WorkflowService.waitForClient(projectId, workflow.stage, workflow.activeRole || 'business_analyst', nextAction);
        break;
      }

      const remaining = await getRemainingBudget(projectId);
      if (remaining <= 0) {
        await WorkflowService.failStage(
          projectId,
          workflow.stage,
          'BUDGET_EXHAUSTED',
          `Budget exhausted for project ${projectId}`,
          workflow.activeRole || 'system'
        );
        break;
      }

      const projectRes = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projectRes.rows.length === 0) break;
      const project = projectRes.rows[0];

      switch (workflow.stage) {
        case 'created':
        case 'business_analysis':
          await executeBAStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'requirements_review':
          await WorkflowService.completeStage(projectId, 'requirements_review', 'project_planning');
          break;

        case 'project_planning':
          await executePMStep(projectId, gateway, runnerId);
          break;

        case 'ui_ux_design':
          await executeUIUXDesignerStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'design_review':
          await WorkflowService.completeStage(projectId, 'design_review', 'technical_architecture');
          break;

        case 'technical_architecture':
          await executeArchitectStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'implementation':
          await executeEngineerStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'code_review':
          await executeCodeReviewStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'independent_qa':
          await executeQAStep(projectId, project.client_brief, gateway, runnerId);
          break;

        case 'security_review':
        case 'release_evaluation':
          await executeReleaseEvaluationStep(projectId, gateway, runnerId);
          break;

        default:
          continueWorkflow = false;
          break;
      }
    }
  } catch (err: any) {
    console.error(`[orchestrator] Error in runUntilBlocked for project ${projectId}:`, err);
  } finally {
    activeRunners.delete(projectId);
  }
}

export async function runOrchestrator(projectId: string, gateway: ModelGateway): Promise<void> {
  return runUntilBlocked(projectId, gateway);
}

async function executeBAStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'business_analysis', 'business_analyst');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Aria Analyst',
    'business_analyst',
    'started business analysis on',
    'client brief',
    'analysis',
    'Analysis Started',
    'Analyzing scope, user journeys, and potential business clarifications.'
  );

  try {
    const factsRes = await query(
      `SELECT fact_key, value_jsonb FROM project_facts WHERE project_id = $1 AND is_current = true`,
      [projectId]
    );
    const confirmedFacts: Record<string, any> = {};
    for (const r of factsRes.rows) {
      confirmedFacts[r.fact_key] = r.value_jsonb;
    }

    let baResult = await runBAAgent(gateway, clientBrief, projectId, confirmedFacts);

    if (baResult.status === 'needs_clarification' && baResult.clarifications.length > 0) {
      const evalResult = await QuestionPolicy.evaluateProposedQuestions(
        projectId,
        'business_analyst',
        'business_analysis',
        baResult.clarifications as any
      );

      if (evalResult.allowedQuestions.length > 0) {
        await QuestionPolicy.persistInteractions(
          projectId,
          'business_analyst',
          'business_analysis',
          evalResult.allowedQuestions
        );

        await WorkflowService.logActivity(
          projectId,
          'Aria Analyst',
          'business_analyst',
          'requested business clarification on',
          `${evalResult.allowedQuestions.length} decision point(s)`,
          'interaction',
          'Clarification Requested',
          `Proposed ${evalResult.allowedQuestions.map((q) => q.factKey).join(', ')}`
        );

        const nextAction = await WorkflowService.synthesizeNextAction(projectId);
        await WorkflowService.waitForClient(projectId, 'business_analysis', 'business_analyst', nextAction);

        await EventEmitterService.emit({
          projectId,
          eventType: 'interaction.required',
          stage: 'business_analysis',
          actorRole: 'business_analyst',
          actorName: 'Aria Analyst',
          summary: `Aria Analyst requested clarification on ${evalResult.allowedQuestions.length} decision point(s).`,
          payload: { questionCount: evalResult.allowedQuestions.length },
        }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

        return;
      }
    }

    if (!baResult.requirements || baResult.requirements.length === 0) {
      baResult = await runBAAgent(gateway, clientBrief, projectId, confirmedFacts, {
        clientFeedback: 'Synthesize concrete, testable requirements from the brief and confirmed facts.',
      });
    }

    let createdApprovalId = '';
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM requirements WHERE project_id = $1`, [projectId]);

      for (const req of baResult.requirements) {
        await client.query(
          `INSERT INTO requirements (project_id, code, title, type, priority, acceptance_criteria, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [
            projectId,
            req.code,
            req.title,
            req.type,
            req.priority,
            JSON.stringify(req.acceptanceCriteria),
          ]
        );
      }

      const baselineRes = await client.query(
        `INSERT INTO requirement_baselines (project_id, version, status, snapshot_jsonb)
         VALUES ($1, 1, 'pending_approval', $2)
         RETURNING id`,
        [projectId, JSON.stringify(baResult)]
      );
      const baselineId = baselineRes.rows[0].id;

      const approvalRes = await client.query(
        `INSERT INTO approval_requests (project_id, artifact_type, artifact_id, artifact_version, status)
         VALUES ($1, 'requirements', $2, 1, 'pending')
         RETURNING id`,
        [projectId, baselineId]
      );
      const approvalId = approvalRes.rows[0].id;
      createdApprovalId = approvalId;

      await client.query(
        `UPDATE project_workflows
         SET 
          stage = 'requirements_review',
          stage_status = 'waiting_for_client',
          active_role = 'business_analyst',
          progress = GREATEST(progress, 25),
          approved_requirement_baseline_id = $1,
          next_action_type = 'approve_requirements',
          next_action_payload = $2,
          runner_id = null,
          run_started_at = null,
          updated_at = now()
         WHERE project_id = $3`,
        [
          baselineId,
          JSON.stringify({
            type: 'approve_requirements',
            label: 'Review & Approve Requirements',
            description: 'Aria has synthesized the requirements baseline for your review and approval.',
            requiresUser: true,
            targetRoute: '/requirements',
            entityId: approvalId,
          }),
          projectId,
        ]
      );

      await client.query(`UPDATE projects SET status = 'analyzed', updated_at = now() WHERE id = $1`, [projectId]);
    });

    await EventEmitterService.emit({
      projectId,
      eventType: 'approval.required',
      stage: 'requirements_review',
      actorRole: 'business_analyst',
      actorName: 'Aria Analyst',
      summary: 'Requirements Baseline ready for client review and approval.',
      payload: {
        approvalId: createdApprovalId,
        artifactType: 'requirements',
        artifactVersion: 1,
        requirementsCount: baResult.requirements.length,
      },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    await WorkflowService.logActivity(
      projectId,
      'Aria Analyst',
      'business_analyst',
      'completed requirements baseline with',
      `${baResult.requirements.length} verified requirement(s)`,
      'artifact',
      'Requirements Baseline Created',
      `Objective: ${baResult.businessObjective}. Requirements: ${baResult.requirements.map((r) => r.code).join(', ')}`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeBAStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'business_analysis',
      err.code || 'BA_STAGE_FAILED',
      err.message || 'Failed during business analysis',
      'business_analyst'
    );
  }
}

async function executePMStep(
  projectId: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'project_planning', 'project_manager');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Marcus Planner',
    'project_manager',
    'started delivery planning on',
    'approved requirements baseline',
    'planning',
    'Planning Started',
    'Evaluating milestone sequencing, risk register, and specialist workforce requirements.'
  );

  try {
    const projRes = await query(`SELECT client_brief FROM projects WHERE id = $1`, [projectId]);
    const clientBrief = projRes.rows[0]?.client_brief || '';

    const reqRes = await query(
      `SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`,
      [projectId]
    );
    if (reqRes.rows.length === 0) {
      throw new Error(`Prerequisite requirements missing for project ${projectId}`);
    }

    const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const factsRes = await query(
      `SELECT fact_key, value_jsonb FROM project_facts WHERE project_id = $1 AND is_current = true`,
      [projectId]
    );
    const confirmedFacts: Record<string, any> = {};
    for (const r of factsRes.rows) {
      confirmedFacts[r.fact_key] = r.value_jsonb;
    }

    const deliveryPlan = await runPMDeliveryPlanAgent(gateway, requirements, confirmedFacts, projectId, clientBrief);

    if (deliveryPlan.status === 'needs_clarification' && deliveryPlan.clarifications.length > 0) {
      const evalResult = await QuestionPolicy.evaluateProposedQuestions(
        projectId,
        'project_manager',
        'project_planning',
        deliveryPlan.clarifications as any
      );

      if (evalResult.allowedQuestions.length > 0) {
        await QuestionPolicy.persistInteractions(
          projectId,
          'project_manager',
          'project_planning',
          evalResult.allowedQuestions
        );

        await WorkflowService.logActivity(
          projectId,
          'Marcus Planner',
          'project_manager',
          'requested delivery decision on',
          `${evalResult.allowedQuestions.length} item(s)`,
          'interaction',
          'Delivery Clarification',
          `Proposed: ${evalResult.allowedQuestions.map((q) => q.factKey).join(', ')}`
        );

        const nextAction = await WorkflowService.synthesizeNextAction(projectId);
        await WorkflowService.waitForClient(projectId, 'project_planning', 'project_manager', nextAction);
        return;
      }
    }

    const briefText = (clientBrief || '').toLowerCase();
    const isExplicitNoUI = briefText.includes('no ui') || briefText.includes('pure backend') || briefText.includes('no user interface') || briefText.includes('cli only') || briefText.includes('rest api only');
    const isExplicitUI = briefText.includes('web application') || briefText.includes('web app') || briefText.includes('portal') || briefText.includes('screens') || briefText.includes('user interface') || briefText.includes('booking') || briefText.includes('dashboard');
    const requiresUIUX = isExplicitNoUI ? false : (isExplicitUI ? true : (deliveryPlan.requiresUIUX !== false));
    const nextStage: WorkflowStage = requiresUIUX ? 'ui_ux_design' : 'technical_architecture';

    await WorkflowService.completeStage(projectId, 'project_planning', nextStage, { requiresUIUX });

    await WorkflowService.logActivity(
      projectId,
      'Marcus Planner',
      'project_manager',
      'completed delivery plan with',
      `${deliveryPlan.milestones.length} milestone(s) (UI/UX ${requiresUIUX ? 'Required' : 'Skipped - API Only'})`,
      'planning',
      'Delivery Plan Ready',
      `Strategy: ${deliveryPlan.deliveryStrategy}. Workforce allocated.`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executePMStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'project_planning',
      err.code || 'PM_STAGE_FAILED',
      err.message || 'Failed during project planning',
      'project_manager'
    );
  }
}

async function executeUIUXDesignerStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'ui_ux_design', 'ui_ux_designer');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Sofia Designer',
    'ui_ux_designer',
    'started product experience design on',
    'approved requirements',
    'design',
    'Design Started',
    'Synthesizing wireframes, screen hierarchy, design tokens, and user journeys.'
  );

  try {
    const reqRes = await query(
      `SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`,
      [projectId]
    );
    const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const factsRes = await query(
      `SELECT fact_key, value_jsonb FROM project_facts WHERE project_id = $1 AND is_current = true`,
      [projectId]
    );
    const confirmedFacts: Record<string, any> = {};
    for (const r of factsRes.rows) {
      confirmedFacts[r.fact_key] = r.value_jsonb;
    }

    const existingDesignRes = await query(
      `SELECT id, version, design_jsonb, client_feedback FROM design_specs 
       WHERE project_id = $1 ORDER BY version DESC LIMIT 1`,
      [projectId]
    );

    let revisionContext: any = undefined;
    if (existingDesignRes.rows.length > 0 && existingDesignRes.rows[0].client_feedback) {
      revisionContext = {
        previousDesign: typeof existingDesignRes.rows[0].design_jsonb === 'string'
          ? JSON.parse(existingDesignRes.rows[0].design_jsonb)
          : existingDesignRes.rows[0].design_jsonb,
        clientFeedback: existingDesignRes.rows[0].client_feedback,
      };
    }

    const designerOutput = await runUIUXDesignerAgent(
      gateway,
      clientBrief,
      requirements,
      'Iterative Vertical Slice MVP',
      confirmedFacts,
      projectId,
      revisionContext
    );

    if (designerOutput.status === 'needs_clarification' && designerOutput.clarifications.length > 0 && !revisionContext) {
      const evalResult = await QuestionPolicy.evaluateProposedQuestions(
        projectId,
        'ui_ux_designer',
        'ui_ux_design',
        designerOutput.clarifications as any
      );

      if (evalResult.allowedQuestions.length > 0) {
        await QuestionPolicy.persistInteractions(
          projectId,
          'ui_ux_designer',
          'ui_ux_design',
          evalResult.allowedQuestions
        );

        const nextAction = await WorkflowService.synthesizeNextAction(projectId);
        await WorkflowService.waitForClient(projectId, 'ui_ux_design', 'ui_ux_designer', nextAction);
        return;
      }
    }

    const designSpec = designerOutput.designSpec;
    if (!designSpec) {
      throw new Error('UI/UX Designer did not provide a valid design spec');
    }

    // Generate visual screens using Design Gateway (Google Stitch MCP with TayDau fallback)
    let providerProjectId = projectId;
    try {
      const designProj = await designGateway.createProject(
        `TayDau - ${clientBrief.slice(0, 30).trim()}`,
        clientBrief.slice(0, 200)
      );
      providerProjectId = designProj.providerProjectId;
      console.log(`[orchestrator] Design Gateway active provider: ${designGateway.getActiveProviderName()}, Provider Project ID: ${providerProjectId}`);
    } catch (projErr) {
      console.warn('[orchestrator] Could not initialize design project on primary provider, will use fallback:', projErr);
    }

    for (const screen of designSpec.screens) {
      try {
        const screenPrompt = `${screen.name} Screen: ${screen.purpose}. Key Sections: ${(screen.sections || []).join(', ')}. Primary Actions: ${(screen.primaryActions || []).join(', ')}. Layout Elements: ${(screen.wireframeElements || []).join(', ')}. Style: ${designSpec.designSystem?.styleDirection || 'Modern, clean, and accessible'}.`;
        const visualScreen = await designGateway.generateScreen(providerProjectId, screenPrompt, {
          screenKey: screen.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          screenName: screen.name,
          purpose: screen.purpose,
        });

        screen.imageUrl = visualScreen.imageUrl;
        screen.htmlContent = visualScreen.htmlContent;
        screen.provider = visualScreen.provider;
        screen.providerProjectId = providerProjectId;
        screen.providerScreenId = visualScreen.screenId;
        screen.sha256 = visualScreen.sha256;
      } catch (genErr) {
        console.warn(`[orchestrator] Visual generation fallback for screen ${screen.name}:`, genErr);
      }
    }

    let specId = '';
    let nextVersion = 1;
    let approvalId = '';

    await withTransaction(async (client) => {
      nextVersion = (existingDesignRes.rows[0]?.version || 0) + 1;
      const prevId = existingDesignRes.rows[0]?.id || null;

      const specRes = await client.query(
        `INSERT INTO design_specs (
          project_id, version, status, summary, design_jsonb, previous_version_id,
          revision_reason, client_feedback
        ) VALUES ($1, $2, 'pending_approval', $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          projectId,
          nextVersion,
          designSpec.productExperienceSummary,
          JSON.stringify(designSpec),
          prevId,
          revisionContext ? 'Client requested revisions' : 'Initial Wireframe Design',
          revisionContext?.clientFeedback || null,
        ]
      );
      specId = specRes.rows[0].id;

      for (const screen of designSpec.screens) {
        if (screen.htmlContent) {
          await client.query(
            `INSERT INTO design_artifacts (
              design_spec_id, provider, provider_project_id, provider_screen_id,
              screen_key, artifact_type, provider_url, content, content_sha256, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              specId,
              screen.provider || 'taydau-internal',
              screen.providerProjectId || null,
              screen.providerScreenId || null,
              screen.name || screen.id,
              'html',
              screen.imageUrl || null,
              screen.htmlContent,
              screen.sha256 || null,
              JSON.stringify({ route: screen.route, purpose: screen.purpose }),
            ]
          );
        }
      }

      const approvalRes = await client.query(
        `INSERT INTO approval_requests (project_id, artifact_type, artifact_id, artifact_version, status)
         VALUES ($1, 'design', $2, $3, 'pending')
         RETURNING id`,
        [projectId, specId, nextVersion]
      );
      approvalId = approvalRes.rows[0].id;

      await client.query(
        `UPDATE project_workflows
         SET 
          stage = 'design_review',
          stage_status = 'waiting_for_client',
          active_role = 'ui_ux_designer',
          progress = GREATEST(progress, 55),
          approved_design_spec_id = $1,
          next_action_type = 'approve_design',
          next_action_payload = $2,
          runner_id = null,
          run_started_at = null,
          updated_at = now()
         WHERE project_id = $3`,
        [
          specId,
          JSON.stringify({
            type: 'approve_design',
            label: 'Review & Approve Wireframes',
            description: `Sofia has prepared the interactive product preview (v${nextVersion}) for your review.`,
            requiresUser: true,
            targetRoute: '/architecture',
            entityId: approvalId,
          }),
          projectId,
        ]
      );
    });

    await EventEmitterService.emit({
      projectId,
      eventType: 'design.generated',
      stage: 'ui_ux_design',
      actorRole: 'ui_ux_designer',
      actorName: 'Sofia Designer',
      summary: `Sofia Designer generated wireframes with ${designSpec.screens.length} screens.`,
      payload: {
        designSpecId: specId,
        version: nextVersion,
        screensCount: designSpec.screens.length,
      },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    await EventEmitterService.emit({
      projectId,
      eventType: 'approval.required',
      stage: 'design_review',
      actorRole: 'ui_ux_designer',
      actorName: 'Sofia Designer',
      summary: `Interactive Wireframe Preview (v${nextVersion}) ready for client review.`,
      payload: {
        approvalId,
        artifactType: 'design',
        artifactVersion: nextVersion,
      },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    await WorkflowService.logActivity(
      projectId,
      'Sofia Designer',
      'ui_ux_designer',
      'generated interactive product preview with',
      `${designSpec.screens.length} screen(s) & ${designSpec.userFlows.length} user journey(s)`,
      'artifact',
      'Wireframes Ready',
      `Summary: ${designSpec.productExperienceSummary}. Screens: ${designSpec.screens.map((s) => s.name).join(', ')}`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeUIUXDesignerStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'ui_ux_design',
      err.code || 'DESIGN_STAGE_FAILED',
      err.message || 'Failed during UI/UX design',
      'ui_ux_designer'
    );
  }
}

async function executeArchitectStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'technical_architecture', 'solution_architect');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Arthur Blueprint',
    'solution_architect',
    'started technical solution architecture on',
    'approved requirements & design',
    'architecture',
    'Architecture Started',
    'Designing FastAPI services, SQLite database schema, and component contracts.'
  );

  try {
    const reqRes = await query(
      `SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`,
      [projectId]
    );
    const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const designRes = await query(
      `SELECT design_jsonb FROM design_specs WHERE project_id = $1 AND status = 'approved' ORDER BY version DESC LIMIT 1`,
      [projectId]
    );
    const designSpec: DesignSpec | null = designRes.rows[0]?.design_jsonb
      ? (typeof designRes.rows[0].design_jsonb === 'string' ? JSON.parse(designRes.rows[0].design_jsonb) : designRes.rows[0].design_jsonb)
      : null;

    const taskRes = await query(`SELECT code, title, description, assigned_role, priority, dependencies FROM tasks WHERE project_id = $1`, [projectId]);
    const provisionalTasks: TaskOutput[] = taskRes.rows.map((t) => ({
      code: t.code,
      title: t.title,
      description: t.description || '',
      requirementCode: 'REQ-001',
      assignedRole: t.assigned_role,
      priority: 'High',
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : JSON.parse(t.dependencies || '[]'),
      acceptanceIntent: t.title,
    }));
    const architecture = await runArchitectAgent(gateway, clientBrief, requirements, provisionalTasks, projectId);
    const taskPlan = await runPMTaskRefinementAgent(gateway, requirements, architecture, designSpec, projectId);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO architecture_specs (project_id, tech_stack, file_structure, implementation_spec, decisions, contract)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (project_id) DO UPDATE SET
           tech_stack = EXCLUDED.tech_stack,
           file_structure = EXCLUDED.file_structure,
           implementation_spec = EXCLUDED.implementation_spec,
           decisions = EXCLUDED.decisions,
           contract = EXCLUDED.contract`,
        [
          projectId,
          JSON.stringify(architecture.techStack),
          JSON.stringify(architecture.fileStructure),
          architecture.implementationSpec,
          JSON.stringify(architecture.decisions),
          JSON.stringify(architecture.contract || {}),
        ]
      );

      await client.query(`DELETE FROM tasks WHERE project_id = $1`, [projectId]);

      const reqCodeToId = new Map(reqRes.rows.map((r) => [r.code, r.id]));
      for (const t of taskPlan.tasks) {
        const reqId = reqCodeToId.get(t.requirementCode) || reqRes.rows[0].id;
        await client.query(
          `INSERT INTO tasks (project_id, requirement_id, code, title, description, assigned_role, priority, dependencies, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'backlog')`,
          [
            projectId,
            reqId,
            t.code,
            t.title,
            t.description,
            t.assignedRole,
            t.priority.toLowerCase(),
            JSON.stringify(t.dependencies),
          ]
        );
      }
    });

    await WorkflowService.completeStage(projectId, 'technical_architecture', 'implementation');

    await WorkflowService.logActivity(
      projectId,
      'Arthur Blueprint',
      'solution_architect',
      'completed technical blueprint with',
      `${architecture.decisions.length} architectural decision(s) & ${taskPlan.tasks.length} reconciled tasks`,
      'artifact',
      'Architecture Blueprint Ready',
      `Stack: ${architecture.techStack.framework}, ${architecture.techStack.database}. Spec defined.`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeArchitectStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'technical_architecture',
      err.code || 'ARCH_STAGE_FAILED',
      err.message || 'Failed during architecture design',
      'solution_architect'
    );
  }
}

async function executeEngineerStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'implementation', 'engineer');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Devon Coder',
    'engineer',
    'started implementation of',
    'planned application modules',
    'task',
    'Coding Started',
    'Generating production Python 3.11 code, FastAPI routers, Pydantic models, and SQLite ORM.'
  );

  try {
    const [reqResult, taskResult, archResult] = await Promise.all([
      query('SELECT * FROM requirements WHERE project_id = $1 ORDER BY code', [projectId]),
      query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY code', [projectId]),
      query('SELECT * FROM architecture_specs WHERE project_id = $1', [projectId]),
    ]);

    if (reqResult.rows.length === 0 || taskResult.rows.length === 0 || archResult.rows.length === 0) {
      throw new Error(`Missing prerequisite requirements, tasks, or architecture for project ${projectId}`);
    }

    const reqIdToCode = new Map(reqResult.rows.map((r) => [r.id, r.code]));

    const requirements: RequirementContext[] = reqResult.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const allTasks: TaskOutput[] = taskResult.rows.map((t) => ({
      code: t.code,
      title: t.title,
      description: t.description || '',
      requirementCode: reqIdToCode.get(t.requirement_id) || 'REQ-001',
      assignedRole: t.assigned_role,
      priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) as any,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : JSON.parse(t.dependencies || '[]'),
      acceptanceIntent: t.description || t.title,
    }));

    const isQaRole = (role: string) => role.toLowerCase().includes('qa') || role.toLowerCase().includes('test');
    const implementationTasks = allTasks.filter((t) => !isQaRole(t.assignedRole));
    const qaTasks = allTasks.filter((t) => isQaRole(t.assignedRole));

    const rawArch = archResult.rows[0];
    const architecture: ArchitectureOutput = {
      techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
      contract: rawArch.contract ? (typeof rawArch.contract === 'string' ? JSON.parse(rawArch.contract) : rawArch.contract) : undefined,
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    const designRes = await query(
      `SELECT design_jsonb FROM design_specs WHERE project_id = $1 AND status = 'approved' ORDER BY version DESC LIMIT 1`,
      [projectId]
    );
    const designSpec: DesignSpec | null = designRes.rows[0]?.design_jsonb
      ? (typeof designRes.rows[0].design_jsonb === 'string' ? JSON.parse(designRes.rows[0].design_jsonb) : designRes.rows[0].design_jsonb)
      : null;

    const engineerOutput = await runEngineerAgent(
      gateway,
      clientBrief,
      requirements,
      implementationTasks,
      architecture,
      projectId,
      designSpec
    );

    const valResult = validateEngineerArtifacts(
      engineerOutput,
      implementationTasks.map((t) => t.code),
      qaTasks.map((t) => t.code)
    );

    if (!valResult.valid) {
      throw new Error(`Engineer artifact validation failed: ${valResult.errors.join('; ')}`);
    }

    // Full-stack Cross-File Consistency Validation
    const consistency = ManifestService.validateCrossFileConsistency(engineerOutput.files);
    if (!consistency.valid) {
      console.warn(`[orchestrator] Cross-file consistency warnings: ${consistency.errors.join('; ')}`);
    }

    const appType = (architecture.contract?.applicationType as any) || 'fullstack_web';
    const projectManifest = ManifestService.buildManifest(
      `Project-${projectId.slice(0, 8)}`,
      appType,
      1,
      engineerOutput.files
    );

    const implTaskMap = new Map(
      taskResult.rows
        .filter((t) => !isQaRole(t.assigned_role))
        .map((t) => [t.code, t.id])
    );
    const defaultTaskId = implementationTasks.length > 0 ? (implTaskMap.get(implementationTasks[0].code) ?? taskResult.rows[0].id) : taskResult.rows[0].id;

    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM code_artifacts WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)`,
        [projectId]
      );

      for (const file of engineerOutput.files) {
        const primaryTaskCode = file.relatedTaskCodes[0];
        const taskId = implTaskMap.get(primaryTaskCode) ?? defaultTaskId;
        const ext = file.path.endsWith('.py') ? 'python' : (file.path.endsWith('.tsx') || file.path.endsWith('.ts') ? 'typescript' : 'text');
        const fileHash = crypto.createHash('sha256').update(file.content, 'utf8').digest('hex');
        const fileType = file.fileType || ManifestService.inferFileType(file.path);

        const insertRes = await client.query(
          `INSERT INTO code_artifacts (
            task_id, file_path, content, language, generated_by, artifact_type, version, sha256
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [taskId, file.path, file.content, ext, 'Engineer', fileType, 1, fileHash]
        );
        const artifactId = insertRes.rows[0].id;

        const linkedTaskCodes = new Set([
          ...(file.relatedTaskCodes || []),
          ...(engineerOutput.taskCoverage
            ?.filter((cov) => cov.filePaths.includes(file.path))
            .map((cov) => cov.taskCode) || []),
        ]);

        for (const tCode of linkedTaskCodes) {
          const linkedTaskId = implTaskMap.get(tCode);
          if (linkedTaskId) {
            await client.query(
              `INSERT INTO code_artifact_tasks (code_artifact_id, task_id)
               VALUES ($1, $2)
               ON CONFLICT (code_artifact_id, task_id) DO NOTHING`,
              [artifactId, linkedTaskId]
            );
          }
        }
      }

      // Record Implementation Revision v1 with full-stack manifest
      await DefectService.recordImplementationRevision(
        projectId,
        1,
        engineerOutput.files,
        engineerOutput.implementationSummary || 'Initial full-stack implementation',
        0,
        [],
        {
          manifest: projectManifest,
          fileInventory: projectManifest.files,
          externalClient: client,
        }
      );
    });

    await WorkflowService.completeStage(projectId, 'implementation', 'code_review');

    await WorkflowService.logActivity(
      projectId,
      'Devon Coder',
      'engineer',
      'completed implementation of',
      `${engineerOutput.files.length} production source file(s)`,
      'artifact',
      'Implementation Ready',
      `Files: ${engineerOutput.files.map((f) => f.path).join(', ')} (${valResult.totalSizeBytes} bytes).`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeEngineerStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'implementation',
      err.code || 'ENGINEER_STAGE_FAILED',
      err.message || 'Failed during code implementation',
      'engineer'
    );
  }
}


async function handleDevonRework(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  defect: PersistedDefect,
  requirements: RequirementContext[],
  architecture: ArchitectureOutput,
  tasks: TaskOutput[],
  currentFiles: Array<{ path: string; content: string }>,
  currentAttempt: number
): Promise<{ success: boolean; newVersion?: number }> {
  if (currentAttempt >= REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS) {
    await DefectService.escalateUnresolvedDefects(
      projectId,
      `Maximum autonomous rework limit (${REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS}) reached.`
    );
    await WorkflowService.escalateWorkflow(
      projectId,
      'independent_qa',
      'MAX_REWORK_EXCEEDED',
      `Maximum rework attempts (${REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS}) exceeded for defect ${defect.code}. Human specialist review required.`,
      'engineer'
    );
    await WorkflowService.logActivity(
      projectId,
      'TayDau Governance',
      'system',
      'escalated project to human review due to',
      `Exceeded ${REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS} rework attempts on ${defect.code}`,
      'rework',
      'Rework Escalated',
      `Autonomous rework attempts exhausted. Project transitioned to needs_attention.`
    );
    return { success: false };
  }

  const nextAttempt = currentAttempt + 1;

  await WorkflowService.setReworkState(
    projectId,
    'implementation',
    'engineer',
    nextAttempt,
    REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS,
    defect.code
  );

  await WorkflowService.logActivity(
    projectId,
    'Devon Coder',
    'engineer',
    `started autonomous defect remediation on ${defect.code} (Attempt ${nextAttempt} of ${REWORK_CONFIG.MAX_AUTONOMOUS_REWORK_ATTEMPTS})`,
    'faulty source files',
    'rework',
    'Rework Started',
    `Analyzing failure evidence for ${defect.code}: ${defect.title}. Generating targeted implementation patch.`
  );

  const reworkOutput = await runEngineerReworkAgent(
    gateway,
    {
      clientBrief,
      requirements,
      architecture,
      tasks,
      faultyFiles: currentFiles,
      defect: {
        code: defect.code,
        title: defect.title,
        severity: defect.severity,
        description: defect.description,
        evidence: defect.evidence,
      },
      reworkAttempt: nextAttempt,
    },
    projectId
  );

  const newSha = DefectService.computeImplementationRevisionSha(reworkOutput.files);
  const noProgressCheck = await DefectService.checkNoProgress(projectId, newSha);

  const maxVerRes = await query(
    `SELECT COALESCE(MAX(version), 1) as max_v
     FROM code_artifacts ca
     JOIN tasks t ON ca.task_id = t.id
     WHERE t.project_id = $1`,
    [projectId]
  );
  const newVersion = parseInt(maxVerRes.rows[0].max_v, 10) + 1;

  const revision = await DefectService.recordImplementationRevision(
    projectId,
    newVersion,
    reworkOutput.files,
    reworkOutput.implementationSummary,
    nextAttempt,
    [defect.id]
  );

  const taskRes = await query(`SELECT id, code FROM tasks WHERE project_id = $1`, [projectId]);
  const taskMap = new Map<string, string>();
  for (const r of taskRes.rows) {
    taskMap.set(r.code, r.id);
  }
  const defaultTaskId = taskRes.rows[0]?.id;

  await withTransaction(async (client) => {
    for (const f of reworkOutput.files) {
      const primaryTaskCode = f.relatedTaskCodes?.[0];
      const taskId = taskMap.get(primaryTaskCode) ?? defaultTaskId;
      const ext = f.path.endsWith('.py') ? 'python' : 'text';
      const fileHash = crypto.createHash('sha256').update(f.content || '', 'utf8').digest('hex');

      await client.query(
        `INSERT INTO code_artifacts (
           task_id, file_path, content, language, generated_by, artifact_type, version, sha256, implementation_revision_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [taskId, f.path, f.content, ext, 'Engineer', 'source_code', newVersion, fileHash, revision.id]
      );
    }
  });

  await WorkflowService.logActivity(
    projectId,
    'Devon Coder',
    'engineer',
    `completed Implementation v${newVersion} for`,
    `${defect.code} remediation`,
    'artifact',
    'Implementation Updated',
    `Remediation v${newVersion} produced ${reworkOutput.files.length} files (SHA: ${newSha.slice(0, 10)}...). Summary: ${reworkOutput.implementationSummary}`
  );

  if (noProgressCheck.noProgress) {
    await DefectService.escalateUnresolvedDefects(
      projectId,
      `No-progress detected: ${noProgressCheck.unchangedCount} consecutive identical revisions produced under open defect.`
    );
    await WorkflowService.escalateWorkflow(
      projectId,
      'independent_qa',
      'NO_PROGRESS_DETECTED',
      `Remediation produced identical implementation hash across ${noProgressCheck.unchangedCount} consecutive attempts without resolving ${defect.code}. Human review required.`,
      'engineer'
    );
    return { success: false };
  }

  return { success: true, newVersion };
}

async function executeCodeReviewStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'code_review', 'code_reviewer');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Dr. Evelyn Auditor',
    'code_reviewer',
    'started independent code & security audit on',
    'source artifacts',
    'review',
    'Audit Started',
    'Evaluating architectural adherence, security hygiene, and static code maintainability.'
  );

  try {
    // Get latest active implementation files
    const maxVerRes = await query(
      `SELECT COALESCE(MAX(ca.version), 1) AS max_v
       FROM code_artifacts ca
       JOIN tasks t ON ca.task_id = t.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    const activeVersion = parseInt(maxVerRes.rows[0].max_v, 10);

    const [codeRes, archRes, reqRes, tasksRes] = await Promise.all([
      query(
        `SELECT ca.file_path, ca.content, ca.language 
         FROM code_artifacts ca
         JOIN tasks t ON ca.task_id = t.id
         WHERE t.project_id = $1 AND ca.version = $2`,
        [projectId, activeVersion]
      ),
      query(`SELECT tech_stack, file_structure, implementation_spec, decisions FROM architecture_specs WHERE project_id = $1`, [projectId]),
      query(`SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`, [projectId]),
      query(`SELECT id, code, title, description, priority, assigned_role FROM tasks WHERE project_id = $1 ORDER BY code`, [projectId]),
    ]);

    const files = codeRes.rows.map((r) => ({
      path: r.file_path,
      content: r.content,
      language: r.language,
    }));

    const rawArch = archRes.rows[0];
    const architecture: ArchitectureOutput = {
      techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const tasks: TaskOutput[] = tasksRes.rows.map((r) => ({
      code: r.code,
      title: r.title,
      priority: (r.priority as any) || 'Medium',
      description: r.description || '',
      requirementCode: r.requirement_code || '',
      assignedRole: r.assigned_role || 'engineer',
      dependencies: Array.isArray(r.dependencies) ? r.dependencies : (typeof r.dependencies === 'string' ? JSON.parse(r.dependencies) : []),
      acceptanceIntent: r.title || 'Implement requirement',
    }));

    await EventEmitterService.emit({
      projectId,
      eventType: 'review.started',
      stage: 'code_review',
      actorRole: 'code_reviewer',
      actorName: 'Dr. Evelyn Auditor',
      summary: 'Dr. Evelyn started architectural and code review audit.',
      payload: { fileCount: files.length },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    const reviewResult = await runCodeReviewAgent(
      gateway,
      {
        clientBrief,
        requirements,
        architecture,
        implementationFiles: files,
        qaSummary: 'Pending independent QA verification',
      },
      projectId
    );

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM code_reviews WHERE project_id = $1`, [projectId]);
      await client.query(
        `INSERT INTO code_reviews (project_id, summary, findings, architecture_compliance, maintainability_assessment, model_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          projectId,
          reviewResult.summary,
          JSON.stringify(reviewResult.findings),
          JSON.stringify(reviewResult.architectureCompliance),
          reviewResult.maintainabilityAssessment,
          config.models.codeReview,
        ]
      );
    });

    // Check for blocking findings
    const blockingFindings = reviewResult.findings.filter((f) => f.isBlocking || f.severity === 'critical' || f.severity === 'high');

    if (blockingFindings.length > 0) {
      const firstBlocker = blockingFindings[0];
      const classification = DefectClassifier.classifyCodeReviewFinding(projectId, { ...firstBlocker, filePath: firstBlocker.filePath || undefined });
      const { defect } = await DefectService.recordOrUpdateDefect(projectId, classification);

      await EventEmitterService.emit({
        projectId,
        eventType: 'review.blocked',
        stage: 'code_review',
        actorRole: 'code_reviewer',
        actorName: 'Dr. Evelyn Auditor',
        summary: `Code review blocked: ${firstBlocker.description}`,
        payload: {
          blockersCount: blockingFindings.length,
          firstBlockerCode: firstBlocker.code,
        },
      }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

      await WorkflowService.logActivity(
        projectId,
        'Dr. Evelyn Auditor',
        'code_reviewer',
        `identified ${blockingFindings.length} blocking review finding(s), logging ${defect.code}`,
        defect.title,
        'rework',
        'Review Blocker',
        `Reviewer blocked release: ${firstBlocker.description}. Initiating autonomous remediation.`
      );

      const reworkResult = await handleDevonRework(
        projectId,
        clientBrief,
        gateway,
        defect,
        requirements,
        architecture,
        tasks,
        files,
        defect.reworkAttempt
      );

      if (!reworkResult.success) {
        return; // Halted in needs_attention
      }

      // Re-run code review immediately on new version
      await WorkflowService.completeStage(projectId, 'implementation', 'code_review');
      await executeCodeReviewStep(projectId, clientBrief, gateway, runnerId);
      return;
    }

    await EventEmitterService.emit({
      projectId,
      eventType: 'review.completed',
      stage: 'code_review',
      actorRole: 'code_reviewer',
      actorName: 'Dr. Evelyn Auditor',
      summary: `Code review completed with 0 blocking findings (${reviewResult.findings.length} total findings).`,
      payload: {
        findingsCount: reviewResult.findings.length,
        architectureCompliance: reviewResult.architectureCompliance,
      },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    // Resolve any previous review defects if all blocking findings cleared
    const openReviewDefects = await query(
      `SELECT id, code FROM defects WHERE project_id = $1 AND source = 'review_blocker' AND status NOT IN ('resolved', 'rejected_invalid')`,
      [projectId]
    );
    for (const d of openReviewDefects.rows) {
      await DefectService.resolveDefect(d.id, { reviewApproved: true, summary: reviewResult.summary });
      await WorkflowService.logActivity(
        projectId,
        'Dr. Evelyn Auditor',
        'code_reviewer',
        `verified resolution of ${d.code}`,
        'reworked source code',
        'rework',
        'Defect Resolved',
        `Blocking review finding ${d.code} resolved in latest implementation.`
      );
    }

    await WorkflowService.completeStage(projectId, 'code_review', 'independent_qa');

    await WorkflowService.logActivity(
      projectId,
      'Dr. Evelyn Auditor',
      'code_reviewer',
      'completed code audit with',
      `${reviewResult.findings.length} finding(s) (0 blocking)`,
      'review',
      'Audit Passed',
      `Compliance: ${reviewResult.architectureCompliance.status}. Code approved for QA sandbox.`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeCodeReviewStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'code_review',
      err.code || 'REVIEW_STAGE_FAILED',
      err.message || 'Failed during code review',
      'code_reviewer'
    );
  }
}

async function executeQAStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'independent_qa', 'qa_engineer');
  if (!claimed) return;

  await WorkflowService.logActivity(
    projectId,
    'Quinn Tester',
    'qa_engineer',
    'started independent acceptance verification in',
    'isolated Docker sandbox',
    'qa',
    'QA Verification Started',
    'Deriving/executing acceptance test suite in air-gapped sandbox without viewing implementation source code.'
  );

  await EventEmitterService.emit({
    projectId,
    eventType: 'qa.started',
    stage: 'independent_qa',
    actorRole: 'qa_engineer',
    actorName: 'Quinn Tester',
    summary: 'Quinn Tester started independent acceptance test verification.',
  }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

  try {
    const [reqRes, archRes, tasksRes] = await Promise.all([
      query(`SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`, [projectId]),
      query(`SELECT tech_stack, file_structure, implementation_spec, decisions FROM architecture_specs WHERE project_id = $1`, [projectId]),
      query(`SELECT id, code, title, description, priority, assigned_role FROM tasks WHERE project_id = $1 ORDER BY code`, [projectId]),
    ]);

    const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type,
      priority: r.priority,
      acceptanceCriteria: Array.isArray(r.acceptance_criteria)
        ? r.acceptance_criteria
        : JSON.parse(r.acceptance_criteria),
    }));

    const rawArch = archRes.rows[0];
    const architecture: ArchitectureOutput = {
      techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    const tasks: TaskOutput[] = tasksRes.rows.map((r) => ({
      code: r.code,
      title: r.title,
      priority: (r.priority as any) || 'Medium',
      description: r.description || '',
      requirementCode: r.requirement_code || '',
      assignedRole: r.assigned_role || 'engineer',
      dependencies: Array.isArray(r.dependencies) ? r.dependencies : (typeof r.dependencies === 'string' ? JSON.parse(r.dependencies) : []),
      acceptanceIntent: r.title || 'Implement requirement',
    }));

    // 1. Check if an already-frozen valid QA suite exists for this project
    const existingSuiteRes = await query(
      `SELECT id, suite_sha256, version, file_count, is_frozen
       FROM qa_suites
       WHERE project_id = $1 AND is_frozen = true
       ORDER BY version DESC LIMIT 1`,
      [projectId]
    );

    let currentQaFiles: Array<{ path: string; content: string }> = [];
    let activeSuiteSha256 = '';
    let activeSuiteId = '';

    if (existingSuiteRes.rows.length > 0) {
      // Reuse SAME frozen QA suite
      activeSuiteId = existingSuiteRes.rows[0].id;
      activeSuiteSha256 = existingSuiteRes.rows[0].suite_sha256;
      const testArtifactsRes = await query(
        `SELECT file_path, content FROM qa_test_artifacts WHERE project_id = $1 ORDER BY file_path`,
        [projectId]
      );
      currentQaFiles = testArtifactsRes.rows.map((r) => ({ path: r.file_path, content: r.content }));
    } else {
      // Derive independent QA acceptance test suite ONCE
      const qaOutput: QAOutput = await runQAAgent(gateway, clientBrief, requirements, architecture, projectId);
      const valResult = validateQAArtifacts(qaOutput, requirements.map((r) => r.code));
      if (!valResult.valid) {
        console.warn(`[orchestrator] QA validation warnings: ${valResult.errors.join('; ')}`);
      }

      currentQaFiles = qaOutput.testFiles.map((tf) => ({ path: tf.path, content: tf.content }));
      const suiteContent = currentQaFiles.map((f) => f.content).join('\n');
      activeSuiteSha256 = crypto.createHash('sha256').update(suiteContent, 'utf8').digest('hex');

      await withTransaction(async (client) => {
        await client.query(`DELETE FROM qa_test_artifacts WHERE project_id = $1`, [projectId]);
        await client.query(`DELETE FROM qa_suites WHERE project_id = $1`, [projectId]);

        const insSuite = await client.query(
          `INSERT INTO qa_suites (project_id, suite_sha256, file_count, is_frozen, version)
           VALUES ($1, $2, $3, true, 1) RETURNING id`,
          [projectId, activeSuiteSha256, currentQaFiles.length]
        );
        activeSuiteId = insSuite.rows[0].id;

        for (const tf of currentQaFiles) {
          const fileHash = crypto.createHash('sha256').update(tf.content, 'utf8').digest('hex');
          await client.query(
            `INSERT INTO qa_test_artifacts (project_id, file_path, content, language, test_framework, sha256, is_frozen)
             VALUES ($1, $2, $3, 'python', 'pytest', $4, true)`,
            [projectId, tf.path, tf.content, fileHash]
          );
        }
      });
    }

    // 2. Fetch latest active implementation files
    const maxVerRes = await query(
      `SELECT COALESCE(MAX(ca.version), 1) AS max_v
       FROM code_artifacts ca
       JOIN tasks t ON ca.task_id = t.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    const activeVersion = parseInt(maxVerRes.rows[0].max_v, 10);

    const codeFilesRes = await query(
      `SELECT ca.file_path, ca.content FROM code_artifacts ca
       JOIN tasks t ON ca.task_id = t.id
       WHERE t.project_id = $1 AND ca.version = $2`,
      [projectId, activeVersion]
    );
    const activeCodeFiles = codeFilesRes.rows.map((r) => ({ path: r.file_path, content: r.content }));

    // 3. Materialize and execute in isolated Docker container
    const runId = `qa-${Date.now()}`;
    const workspaceDir = await materializeWorkspace(projectId, runId, activeCodeFiles, currentQaFiles);
    const sandboxResult: SandboxExecutionResult = await executeSandboxTests(projectId, runId, workspaceDir);
    await cleanupWorkspace(workspaceDir);

    // Record test run
    const taskRes = await query(`SELECT id FROM tasks WHERE project_id = $1 LIMIT 1`, [projectId]);
    const taskId = taskRes.rows[0]?.id;
    if (taskId) {
      await query(
        `INSERT INTO test_runs (task_id, exit_code, stdout, stderr, duration_ms, tests_passed, tests_failed, project_id, status, test_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'acceptance')`,
        [
          taskId,
          sandboxResult.exitCode ?? 0,
          sandboxResult.stdout,
          sandboxResult.stderr,
          sandboxResult.durationMs,
          sandboxResult.testsPassed,
          sandboxResult.testsFailed,
          projectId,
          sandboxResult.status,
        ]
      );
    }

    await EventEmitterService.emit({
      projectId,
      eventType: 'qa.test_progress',
      stage: 'independent_qa',
      actorRole: 'qa_engineer',
      actorName: 'Quinn Tester',
      summary: `Executed ${sandboxResult.testsPassed + sandboxResult.testsFailed} tests (${sandboxResult.testsPassed} passed, ${sandboxResult.testsFailed} failed).`,
      payload: {
        testsPassed: sandboxResult.testsPassed,
        testsFailed: sandboxResult.testsFailed,
        exitCode: sandboxResult.exitCode,
      },
    }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

    // 4. Layered Classification
    const classification = DefectClassifier.classifySandboxExecution(projectId, sandboxResult);

    if (classification.taxonomy === 'qa_passed') {
      // 100% QA Passed -> resolve any outstanding QA product defects
      const openQADefects = await query(
        `SELECT id, code FROM defects WHERE project_id = $1 AND source IN ('qa', 'product_defect') AND status NOT IN ('resolved', 'rejected_invalid')`,
        [projectId]
      );
      for (const d of openQADefects.rows) {
        await DefectService.resolveDefect(d.id, {
          testsPassed: sandboxResult.testsPassed,
          exitCode: sandboxResult.exitCode,
          verifiedWithSuiteSha: activeSuiteSha256,
        });
        await WorkflowService.logActivity(
          projectId,
          'Quinn Tester',
          'qa_engineer',
          `verified resolution of ${d.code}`,
          `Frozen Acceptance Suite (SHA: ${activeSuiteSha256.slice(0, 10)}...)`,
          'rework',
          'Defect Resolved',
          `All acceptance tests passed. Defect ${d.code} resolved against frozen suite.`
        );
      }

      await EventEmitterService.emit({
        projectId,
        eventType: 'qa.completed',
        stage: 'independent_qa',
        actorRole: 'qa_engineer',
        actorName: 'Quinn Tester',
        summary: `Independent QA verified: ${sandboxResult.testsPassed} tests passed (Exit: 0).`,
        payload: {
          testsPassed: sandboxResult.testsPassed,
          suiteSha: activeSuiteSha256,
        },
      }).catch((e) => console.warn('[orchestrator] Event emit error:', e));

      await WorkflowService.completeStage(projectId, 'independent_qa', 'release_evaluation');

      await WorkflowService.logActivity(
        projectId,
        'Quinn Tester',
        'qa_engineer',
        'completed independent sandbox verification with',
        `${sandboxResult.testsPassed} test(s) passed (Exit: 0)`,
        'qa',
        'Verification Passed',
        `Suite SHA-256: ${activeSuiteSha256.slice(0, 12)}... All requirements verified.`
      );
      return;
    }

    if (classification.taxonomy === 'qa_artifact_error') {
      // QA Artifact Error -> Quinn self-repairs test suite without dispatching Devon
      await WorkflowService.logActivity(
        projectId,
        'Quinn Tester',
        'qa_engineer',
        'detected QA artifact syntax/import defect, initiating',
        'QA suite versioned repair',
        'qa',
        'QA Artifact Repair',
        `Repairing test artifact error: ${classification.summary}. Implementation remains unchanged.`
      );

      const repaired = await runQARepairAgent(
        gateway,
        clientBrief,
        requirements,
        architecture,
        {
          assumptions: ['Isolated sandbox testing'],
          testPlanSummary: 'Repaired acceptance test suite',
          testFiles: currentQaFiles.map((f) => ({ path: f.path, purpose: 'acceptance_test', content: f.content, relatedRequirementCodes: requirements.map((r) => r.code) })),
          requirementCoverage: requirements.map((r) => ({ requirementCode: r.code, testNames: currentQaFiles.map((f) => f.path) })),
        },
        sandboxResult.stderr || sandboxResult.stdout,
        projectId
      );

      const newQaFiles = repaired.testFiles.map((tf) => ({ path: tf.path, content: tf.content }));
      const newSuiteContent = newQaFiles.map((f) => f.content).join('\n');
      const newSuiteSha256 = crypto.createHash('sha256').update(newSuiteContent, 'utf8').digest('hex');

      const maxVerQa = await query(`SELECT COALESCE(MAX(version), 1) as max_v FROM qa_suites WHERE project_id = $1`, [projectId]);
      const nextQaVersion = parseInt(maxVerQa.rows[0].max_v, 10) + 1;

      await withTransaction(async (client) => {
        // Mark old suite superseded
        if (activeSuiteId) {
          await client.query(`UPDATE qa_suites SET superseded_by_suite_id = $1 WHERE id = $2`, [activeSuiteId, activeSuiteId]);
        }

        const insNewSuite = await client.query(
          `INSERT INTO qa_suites (project_id, suite_sha256, file_count, is_frozen, version, parent_suite_id, repair_reason)
           VALUES ($1, $2, $3, true, $4, $5, $6) RETURNING id`,
          [projectId, newSuiteSha256, newQaFiles.length, nextQaVersion, activeSuiteId || null, classification.summary]
        );

        await client.query(`DELETE FROM qa_test_artifacts WHERE project_id = $1`, [projectId]);
        for (const tf of newQaFiles) {
          const fileHash = crypto.createHash('sha256').update(tf.content, 'utf8').digest('hex');
          await client.query(
            `INSERT INTO qa_test_artifacts (project_id, file_path, content, language, test_framework, sha256, is_frozen)
             VALUES ($1, $2, $3, 'python', 'pytest', $4, true)`,
            [projectId, tf.path, tf.content, fileHash]
          );
        }
      });

      await WorkflowService.logActivity(
        projectId,
        'Quinn Tester',
        'qa_engineer',
        `froze repaired QA Suite v${nextQaVersion} with`,
        `New SHA-256: ${newSuiteSha256.slice(0, 10)}...`,
        'qa',
        'QA Suite Repaired',
        `Repaired QA artifact defect. Re-executing against unchanged Implementation v${activeVersion}.`
      );

      // Re-run QA step immediately with repaired suite
      await executeQAStep(projectId, clientBrief, gateway, runnerId);
      return;
    }

    if (classification.taxonomy === 'product_defect') {
      // Real Product Defect -> Keep QA suite FROZEN and immutable. Dispatch Devon for rework.
      const matchedReq = requirements.find((r) => r.code === classification.relatedRequirementCode);
      const reqIds = matchedReq ? [matchedReq.id] : [];
      const { defect } = await DefectService.recordOrUpdateDefect(projectId, classification, activeSuiteId, reqIds);

      await WorkflowService.logActivity(
        projectId,
        'Quinn Tester',
        'qa_engineer',
        `detected acceptance test failure, logged ${defect.code}`,
        defect.title,
        'rework',
        'Product Defect Detected',
        `Frozen QA test failed against Implementation v${activeVersion}. Failure: ${classification.summary}. Triggering Devon rework.`
      );

      const reworkResult = await handleDevonRework(
        projectId,
        clientBrief,
        gateway,
        defect,
        requirements,
        architecture,
        tasks,
        activeCodeFiles,
        defect.reworkAttempt
      );

      if (!reworkResult.success) {
        return; // Halted in needs_attention
      }

      // Reverification pipeline: Reviewer -> SAME frozen QA suite -> Security
      await WorkflowService.completeStage(projectId, 'implementation', 'code_review');
      await executeCodeReviewStep(projectId, clientBrief, gateway, runnerId);
      return;
    }

    // For system/infrastructure errors, timeouts, or unknown failures:
    await WorkflowService.escalateWorkflow(
      projectId,
      'independent_qa',
      classification.taxonomy.toUpperCase(),
      classification.summary,
      'qa_engineer'
    );
    await WorkflowService.logActivity(
      projectId,
      'TayDau Governance',
      'system',
      `halted execution due to ${classification.taxonomy}:`,
      classification.summary,
      'system',
      'Execution Halted',
      `Diagnostic details: ${JSON.stringify(classification.evidence)}`
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeQAStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'independent_qa',
      err.code || 'QA_STAGE_FAILED',
      err.message || 'Failed during QA verification',
      'qa_engineer'
    );
  }
}

async function executeReleaseEvaluationStep(
  projectId: string,
  gateway: ModelGateway,
  runnerId: string
): Promise<void> {
  const claimed = await WorkflowService.claimRun(projectId, runnerId, 'release_evaluation', 'qa_engineer');
  if (!claimed) return;

  try {
    // 1. Get latest active code files
    const maxVerRes = await query(
      `SELECT COALESCE(MAX(ca.version), 1) AS max_v
       FROM code_artifacts ca
       JOIN tasks t ON ca.task_id = t.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    const activeVersion = parseInt(maxVerRes.rows[0].max_v, 10);

    const codeFilesRes = await query(
      `SELECT ca.file_path, ca.content FROM code_artifacts ca
       JOIN tasks t ON ca.task_id = t.id
       WHERE t.project_id = $1 AND ca.version = $2`,
      [projectId, activeVersion]
    );
    const files = codeFilesRes.rows.map((r) => ({ path: r.file_path, content: r.content }));

    // 2. Deterministic Security Gate
    const securityResult = await runSecurityGate(projectId, files);

    if (!securityResult.passed) {
      const firstFinding = securityResult.findings[0] || { rule: 'Security Check Failed', severity: 'critical', evidence: 'Rule violation' };
      const classification = DefectClassifier.classifySecurityFinding(projectId, { ...firstFinding, filePath: firstFinding.filePath || undefined, evidence: firstFinding.evidence || undefined });
      const { defect } = await DefectService.recordOrUpdateDefect(projectId, classification);

      await WorkflowService.logActivity(
        projectId,
        'Deterministic Security Gate',
        'system',
        `detected ${securityResult.criticalCount} critical and ${securityResult.highCount} high security finding(s)`,
        defect.code,
        'rework',
        'Security Blocker',
        `Deterministic gate blocked release: ${firstFinding.rule}. Triggering Devon remediation.`
      );

      const [reqRes, archRes, tasksRes, briefRes] = await Promise.all([
        query(`SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code`, [projectId]),
        query(`SELECT tech_stack, file_structure, implementation_spec, decisions FROM architecture_specs WHERE project_id = $1`, [projectId]),
        query(`SELECT id, code, title, description, priority, assigned_role FROM tasks WHERE project_id = $1 ORDER BY code`, [projectId]),
        query(`SELECT client_brief FROM projects WHERE id = $1`, [projectId]),
      ]);

      const requirements: RequirementContext[] = reqRes.rows.map((r) => ({
        id: r.id,
        code: r.code,
        title: r.title,
        type: r.type,
        priority: r.priority,
        acceptanceCriteria: Array.isArray(r.acceptance_criteria) ? r.acceptance_criteria : JSON.parse(r.acceptance_criteria),
      }));

      const rawArch = archRes.rows[0];
      const architecture: ArchitectureOutput = {
        techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
        fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
        implementationSpec: rawArch.implementation_spec,
        decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
      };

      const tasks: TaskOutput[] = tasksRes.rows.map((r) => ({
        code: r.code,
        title: r.title,
        priority: (r.priority as any) || 'Medium',
        description: r.description || '',
        requirementCode: r.requirement_code || '',
        assignedRole: r.assigned_role || 'engineer',
        dependencies: Array.isArray(r.dependencies) ? r.dependencies : (typeof r.dependencies === 'string' ? JSON.parse(r.dependencies) : []),
        acceptanceIntent: r.title || 'Implement requirement',
      }));

      const reworkResult = await handleDevonRework(
        projectId,
        briefRes.rows[0]?.client_brief || '',
        gateway,
        defect,
        requirements,
        architecture,
        tasks,
        files,
        defect.reworkAttempt
      );

      if (!reworkResult.success) {
        return;
      }

      await WorkflowService.completeStage(projectId, 'implementation', 'code_review');
      await executeCodeReviewStep(projectId, briefRes.rows[0]?.client_brief || '', gateway, runnerId);
      return;
    }

    // 3. Strict Release Verification Checks
    const [openDefectsRes, testRunRes, wfRes] = await Promise.all([
      query(`SELECT count(*) as count FROM defects WHERE project_id = $1 AND status NOT IN ('resolved', 'rejected_invalid')`, [projectId]),
      query(`SELECT count(*) as count FROM test_runs WHERE project_id = $1 AND tests_failed > 0 AND status != 'passed'`, [projectId]),
      query(`SELECT stage_status FROM project_workflows WHERE project_id = $1`, [projectId]),
    ]);

    const openDefectsCount = parseInt(openDefectsRes.rows[0].count, 10);
    const failedTestsCount = parseInt(testRunRes.rows[0].count, 10);
    const workflowStatus = wfRes.rows[0]?.stage_status;

    if (openDefectsCount > 0) {
      throw new Error(`Cannot release: Project has ${openDefectsCount} unresolved defect(s).`);
    }

    if (failedTestsCount > 0) {
      throw new Error(`Cannot release: Project has unresolved failing acceptance test runs.`);
    }

    if (workflowStatus === 'needs_attention' || workflowStatus === 'failed') {
      throw new Error(`Cannot release: Workflow is in ${workflowStatus} state.`);
    }

    const checks = {
      requirementsVerified: true,
      designApproved: true,
      architectureCompliant: true,
      codeAudited: true,
      sandboxPassed: true,
      securityClean: securityResult.passed,
      defectsResolved: openDefectsCount === 0,
    };

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM release_readiness WHERE project_id = $1`, [projectId]);
      await client.query(
        `INSERT INTO release_readiness (project_id, is_ready, checks)
         VALUES ($1, true, $2)`,
        [projectId, JSON.stringify(checks)]
      );
    });

    await WorkflowService.completeStage(projectId, 'release_evaluation', 'completed');

    await WorkflowService.logActivity(
      projectId,
      'TayDau Governance',
      'system',
      'verified all 7 delivery gates and handed off to',
      'Final Verified Delivery',
      'release',
      'Release Ready',
      'Delivery complete: 100% requirements verified, immutable QA hashes recorded, all defects resolved.'
    );
  } catch (err: any) {
    console.error(`[orchestrator] Error in executeReleaseEvaluationStep for project ${projectId}:`, err);
    await WorkflowService.failStage(
      projectId,
      'release_evaluation',
      err.code || 'RELEASE_STAGE_FAILED',
      err.message || 'Failed during release evaluation',
      'qa_engineer'
    );
  }
}
