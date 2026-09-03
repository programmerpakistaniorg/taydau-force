import { query, withTransaction } from '../db/pool.js';
import { ROLE_REGISTRY, type RoleKey } from '../config/roles.js';

export type WorkflowStage =
  | 'created'
  | 'business_analysis'
  | 'requirements_review'
  | 'project_planning'
  | 'ui_ux_design'
  | 'design_review'
  | 'technical_architecture'
  | 'implementation'
  | 'code_review'
  | 'independent_qa'
  | 'security_review'
  | 'release_evaluation'
  | 'completed';

export type WorkflowStageStatus =
  | 'pending'
  | 'running'
  | 'waiting_for_client'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'paused'
  | 'cancelled';

export interface NextAction {
  type: 'answer_questions' | 'approve_requirements' | 'approve_design' | 'retry' | 'working' | 'delivery' | 'none';
  label: string | null;
  description: string;
  requiresUser: boolean;
  targetRoute: string;
  entityId?: string;
  count?: number;
  role?: string;
  roleKey?: string;
}

export interface ProjectWorkflowRecord {
  id: string;
  projectId: string;
  stage: WorkflowStage;
  stageStatus: WorkflowStageStatus;
  progress: number;
  nextActionType: string | null;
  nextActionPayload: Record<string, any>;
  requiredRoles: string[];
  activeRole: string | null;
  approvedRequirementBaselineId: string | null;
  approvedDesignSpecId: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorSummary: string | null;
  runnerId: string | null;
  runStartedAt: string | null;
  startedAt: string;
  updatedAt: string;
}

export const STAGE_PROGRESS_MAP: Record<WorkflowStage, number> = {
  created: 0,
  business_analysis: 15,
  requirements_review: 25,
  project_planning: 35,
  ui_ux_design: 45,
  design_review: 55,
  technical_architecture: 65,
  implementation: 78,
  code_review: 85,
  independent_qa: 93,
  security_review: 96,
  release_evaluation: 98,
  completed: 100,
};

export class WorkflowService {
  static async getWorkflow(projectId: string): Promise<ProjectWorkflowRecord> {
    const res = await query(
      `SELECT 
        id, project_id AS "projectId", stage, stage_status AS "stageStatus",
        progress, next_action_type AS "nextActionType",
        next_action_payload AS "nextActionPayload",
        required_roles AS "requiredRoles", active_role AS "activeRole",
        approved_requirement_baseline_id AS "approvedRequirementBaselineId",
        approved_design_spec_id AS "approvedDesignSpecId",
        retry_count AS "retryCount", last_error_code AS "lastErrorCode",
        last_error_summary AS "lastErrorSummary",
        runner_id AS "runnerId", run_started_at AS "runStartedAt",
        started_at AS "startedAt", updated_at AS "updatedAt"
       FROM project_workflows WHERE project_id = $1`,
      [projectId]
    );

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    const ins = await query(
      `INSERT INTO project_workflows (project_id, stage, stage_status, progress)
       VALUES ($1, 'created', 'pending', 0)
       RETURNING 
        id, project_id AS "projectId", stage, stage_status AS "stageStatus",
        progress, next_action_type AS "nextActionType",
        next_action_payload AS "nextActionPayload",
        required_roles AS "requiredRoles", active_role AS "activeRole",
        approved_requirement_baseline_id AS "approvedRequirementBaselineId",
        approved_design_spec_id AS "approvedDesignSpecId",
        retry_count AS "retryCount", last_error_code AS "lastErrorCode",
        last_error_summary AS "lastErrorSummary",
        runner_id AS "runnerId", run_started_at AS "runStartedAt",
        started_at AS "startedAt", updated_at AS "updatedAt"`,
      [projectId]
    );
    return ins.rows[0];
  }

  static async claimRun(
    projectId: string,
    runnerId: string,
    stage: WorkflowStage,
    activeRole: string
  ): Promise<boolean> {
    const res = await query(
      `UPDATE project_workflows
       SET 
        stage = $1,
        stage_status = 'running',
        active_role = $2,
        runner_id = $3,
        run_started_at = now(),
        updated_at = now()
       WHERE project_id = $4
         AND (stage_status != 'running' OR runner_id = $3 OR run_started_at < now() - interval '5 minutes')
       RETURNING id`,
      [stage, activeRole, runnerId, projectId]
    );

    if (res.rows.length > 0) {
      await query(`UPDATE projects SET status = $1, updated_at = now() WHERE id = $2`, [
        this.mapWorkflowToLegacyStatus(stage, 'running'),
        projectId,
      ]);
      return true;
    }
    return false;
  }

  static async waitForClient(
    projectId: string,
    stage: WorkflowStage,
    activeRole: string,
    nextAction: NextAction
  ): Promise<void> {
    const progress = STAGE_PROGRESS_MAP[stage] || 0;
    await query(
      `UPDATE project_workflows
       SET 
        stage = $1,
        stage_status = 'waiting_for_client',
        active_role = $2,
        progress = GREATEST(progress, $3),
        next_action_type = $4,
        next_action_payload = $5,
        runner_id = null,
        run_started_at = null,
        updated_at = now()
       WHERE project_id = $6`,
      [stage, activeRole, progress, nextAction.type, JSON.stringify(nextAction), projectId]
    );

    await query(`UPDATE projects SET status = $1, updated_at = now() WHERE id = $2`, [
      this.mapWorkflowToLegacyStatus(stage, 'waiting_for_client'),
      projectId,
    ]);
  }

  static async completeStage(
    projectId: string,
    completedStage: WorkflowStage,
    nextStage: WorkflowStage,
    payload: {
      approvedRequirementBaselineId?: string;
      approvedDesignSpecId?: string;
      requiresUIUX?: boolean;
    } = {}
  ): Promise<void> {
    const isTerminal = nextStage === 'completed';
    const progress = isTerminal ? 100 : (STAGE_PROGRESS_MAP[completedStage] || 0);

    const queryParams: any[] = [
      nextStage,
      isTerminal ? 'completed' : 'pending',
      progress,
      payload.approvedRequirementBaselineId || null,
      payload.approvedDesignSpecId || null,
      isTerminal ? 'delivery' : null,
      isTerminal
        ? JSON.stringify({
            type: 'delivery',
            label: 'View Verified Delivery',
            description: 'All 7 verification gates completed.',
            requiresUser: false,
            targetRoute: '/delivery',
          })
        : '{}',
    ];

    let rolesSql = '';
    if (payload.requiresUIUX !== undefined) {
      const roles = payload.requiresUIUX === false
        ? ['business_analyst', 'project_manager', 'solution_architect', 'engineer', 'qa_engineer', 'code_reviewer']
        : ['business_analyst', 'project_manager', 'ui_ux_designer', 'solution_architect', 'engineer', 'qa_engineer', 'code_reviewer'];
      queryParams.push(JSON.stringify(roles));
      rolesSql = `, required_roles = $${queryParams.length}::jsonb`;
    }

    queryParams.push(projectId);
    const pidIdx = queryParams.length;

    await query(
      `UPDATE project_workflows
       SET 
        stage = $1,
        stage_status = $2,
        progress = GREATEST(progress, $3),
        active_role = null,
        approved_requirement_baseline_id = COALESCE($4, approved_requirement_baseline_id),
        approved_design_spec_id = COALESCE($5, approved_design_spec_id),
        next_action_type = $6,
        next_action_payload = $7${rolesSql},
        runner_id = null,
        run_started_at = null,
        updated_at = now()
       WHERE project_id = $${pidIdx}`,
      queryParams
    );

    await query(`UPDATE projects SET status = $1, updated_at = now() WHERE id = $2`, [
      isTerminal ? 'release_ready' : this.mapWorkflowToLegacyStatus(nextStage, 'pending'),
      projectId,
    ]);
  }

  static async failStage(
    projectId: string,
    failedStage: WorkflowStage,
    errorCode: string,
    errorSummary: string,
    activeRole: string
  ): Promise<void> {
    await query(
      `UPDATE project_workflows
       SET 
        stage = $1,
        stage_status = 'failed',
        active_role = $2,
        last_error_code = $3,
        last_error_summary = $4,
        next_action_type = 'retry',
        next_action_payload = $5,
        runner_id = null,
        run_started_at = null,
        updated_at = now()
       WHERE project_id = $6`,
      [
        failedStage,
        activeRole,
        errorCode,
        errorSummary,
        JSON.stringify({
          type: 'retry',
          label: 'Retry Stage',
          description: `Stage ${failedStage} failed: ${errorSummary}`,
          requiresUser: true,
          targetRoute: '/project',
        }),
        projectId,
      ]
    );

    await query(`UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`, [projectId]);
  }

  static async synthesizeNextAction(projectId: string): Promise<NextAction> {
    const workflow = await this.getWorkflow(projectId);

    if (workflow.stageStatus === 'failed') {
      return {
        type: 'retry',
        label: 'Retry Development',
        description: workflow.lastErrorSummary || 'A verification or execution step requires attention.',
        requiresUser: true,
        targetRoute: '/project',
      };
    }

    if (workflow.stage === 'completed' || workflow.stageStatus === 'completed') {
      return {
        type: 'delivery',
        label: 'View Verified Delivery',
        description: 'Solution tested, security audited, and ready for release.',
        requiresUser: false,
        targetRoute: '/delivery',
      };
    }

    if (workflow.stageStatus === 'running') {
      const roleDef = workflow.activeRole ? ROLE_REGISTRY[workflow.activeRole as RoleKey] : null;
      return {
        type: 'working',
        label: null,
        description: roleDef ? `${roleDef.personaName} is working on ${roleDef.displayName.toLowerCase()}...` : 'TayDau team is executing the software delivery slice...',
        requiresUser: false,
        targetRoute: '/project',
        role: roleDef?.displayName,
        roleKey: workflow.activeRole || undefined,
      };
    }

    if (workflow.stageStatus === 'waiting_for_client') {
      const interactionsRes = await query(
        `SELECT id, agent_role, question FROM client_interactions WHERE project_id = $1 AND status = 'pending'`,
        [projectId]
      );
      if (interactionsRes.rows.length > 0) {
        const count = interactionsRes.rows.length;
        const roleKey = interactionsRes.rows[0].agent_role as RoleKey;
        const roleDef = ROLE_REGISTRY[roleKey];
        return {
          type: 'answer_questions',
          label: `Answer ${count} Question${count > 1 ? 's' : ''}`,
          description: `Your ${roleDef?.displayName || 'specialist'} needs decisions before continuing.`,
          requiresUser: true,
          targetRoute: '/project',
          count,
          role: roleDef?.displayName,
          roleKey,
        };
      }

      const approvalsRes = await query(
        `SELECT id, artifact_type, artifact_version FROM approval_requests WHERE project_id = $1 AND status = 'pending'`,
        [projectId]
      );
      if (approvalsRes.rows.length > 0) {
        const app = approvalsRes.rows[0];
        if (app.artifact_type === 'requirements') {
          return {
            type: 'approve_requirements',
            label: 'Review & Approve Requirements',
            description: 'Aria has prepared the requirements baseline for your approval.',
            requiresUser: true,
            targetRoute: '/requirements',
            entityId: app.id,
          };
        } else if (app.artifact_type === 'design') {
          return {
            type: 'approve_design',
            label: 'Review & Approve Wireframes',
            description: 'Sofia has prepared the interactive product preview for your review.',
            requiresUser: true,
            targetRoute: '/architecture',
            entityId: app.id,
          };
        }
      }
    }

    return {
      type: 'none',
      label: null,
      description: 'Project is queued for autonomous execution.',
      requiresUser: false,
      targetRoute: '/project',
    };
  }

  static async logActivity(
    projectId: string,
    actor: string,
    actorRole: string,
    action: string,
    target: string,
    type: string,
    tag?: string,
    details?: string
  ): Promise<void> {
    await query(
      `INSERT INTO activities (project_id, actor, actor_role, action, target, type, tag, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, actor, actorRole, action, target, type, tag || null, details || null]
    );
  }

  private static mapWorkflowToLegacyStatus(stage: WorkflowStage, status: WorkflowStageStatus): string {
    if (status === 'failed') return 'failed';
    switch (stage) {
      case 'created':
        return 'submitted';
      case 'business_analysis':
      case 'requirements_review':
        return 'analyzed';
      case 'project_planning':
        return 'planned';
      case 'ui_ux_design':
      case 'design_review':
      case 'technical_architecture':
        return 'designed';
      case 'implementation':
        return 'implementing';
      case 'code_review':
      case 'independent_qa':
      case 'security_review':
        return 'verifying';
      case 'release_evaluation':
        return 'tested_passed';
      case 'completed':
        return 'release_ready';
      default:
        return 'in_progress';
    }
  }

  static async pauseWorkflow(projectId: string): Promise<void> {
    await query(
      `UPDATE project_workflows
       SET 
        stage_status = 'paused',
        active_role = null,
        runner_id = null,
        run_started_at = null,
        next_action_type = 'resume',
        next_action_payload = jsonb_build_object(
          'type', 'resume',
          'label', 'Resume Delivery',
          'description', 'Project paused by user. Click resume to continue.',
          'requiresUser', true,
          'targetRoute', '/'
        ),
        updated_at = now()
       WHERE project_id = $1`,
      [projectId]
    );

    await query(`UPDATE projects SET status = 'paused', updated_at = now() WHERE id = $1`, [projectId]);
  }

  static async resumeWorkflow(projectId: string): Promise<void> {
    await query(
      `UPDATE project_workflows
       SET 
        stage_status = 'pending',
        runner_id = null,
        run_started_at = null,
        retry_count = 0,
        last_error_code = null,
        last_error_summary = null,
        updated_at = now()
       WHERE project_id = $1`,
      [projectId]
    );

    await query(`UPDATE projects SET status = 'in_progress', updated_at = now() WHERE id = $1`, [projectId]);
  }

  static async endWorkflow(projectId: string): Promise<void> {
    await query(
      `UPDATE project_workflows
       SET 
        stage_status = 'cancelled',
        active_role = null,
        runner_id = null,
        run_started_at = null,
        next_action_type = 'none',
        next_action_payload = jsonb_build_object(
          'type', 'none',
          'label', 'Project Ended',
          'description', 'Project permanently closed by user.',
          'requiresUser', false,
          'targetRoute', '/'
        ),
        updated_at = now()
       WHERE project_id = $1`,
      [projectId]
    );

    await query(`UPDATE projects SET status = 'cancelled', updated_at = now() WHERE id = $1`, [projectId]);
  }
}
