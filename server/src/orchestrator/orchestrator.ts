import { withTransaction, query } from '../db/pool.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { runBAAgent } from '../agents/ba-agent.js';
import { runPMAgent, type RequirementContext } from '../agents/pm-agent.js';
import { runArchitectAgent } from '../agents/architect-agent.js';
import { runEngineerAgent } from '../agents/engineer-agent.js';
import { validateEngineerArtifacts } from '../services/artifact-validator.js';
import { logActivity } from '../services/activity-logger.js';
import { getRemainingBudget } from '../services/cost-telemetry.js';
import type { TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';

export async function runOrchestrator(projectId: string, gateway: ModelGateway): Promise<void> {
  // Loop through stages sequentially so a project advances through all eligible stages
  let continueWorkflow = true;

  while (continueWorkflow) {
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      throw new Error(`Project ${projectId} not found`);
    }
    const project = projectResult.rows[0];

    switch (project.status) {
      case 'submitted':
        await runBAStep(projectId, project.client_brief, gateway);
        break;

      case 'analyzed':
        await runPMStep(projectId, gateway);
        break;

      case 'planned':
        await runArchitectStep(projectId, project.client_brief, gateway);
        break;

      case 'designed':
        await runEngineerStep(projectId, project.client_brief, gateway);
        break;

      case 'implemented':
      case 'analyzing':
      case 'planning':
      case 'architecting':
      case 'implementing':
      case 'failed':
      default:
        console.log(`[orchestrator] Project ${projectId} is in status '${project.status}', stopping active loop`);
        continueWorkflow = false;
        break;
    }
  }
}

async function runBAStep(projectId: string, clientBrief: string, gateway: ModelGateway): Promise<void> {
  // Status guard: only run if status is 'submitted'
  const updated = await query(
    `UPDATE projects SET status = 'analyzing', updated_at = now() 
     WHERE id = $1 AND status = 'submitted' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`[orchestrator] Project ${projectId} already past 'submitted' status, skipping BA`);
    return;
  }

  // Budget check
  const remaining = await getRemainingBudget(projectId);
  if (remaining <= 0) {
    await query(
      `UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`,
      [projectId]
    );
    throw new Error(`Budget exhausted for project ${projectId}`);
  }

  await logActivity({
    projectId,
    actor: 'Business Analyst',
    actorRole: 'BA Agent',
    action: 'started analysis of',
    target: 'client brief',
    type: 'system',
    tag: 'Analysis Started',
  });

  try {
    // Call BA agent (returns proposed output, does NOT write to DB directly)
    const baOutput = await runBAAgent(gateway, clientBrief, projectId);

    // Orchestrator validates and persists inside transaction
    await withTransaction(async (client) => {
      // Idempotency: clear existing requirements for this project if any
      await client.query('DELETE FROM requirements WHERE project_id = $1', [projectId]);

      for (const req of baOutput.requirements) {
        await client.query(
          `INSERT INTO requirements (project_id, code, title, type, priority, acceptance_criteria, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [projectId, req.code, req.title, req.type, req.priority, JSON.stringify(req.acceptanceCriteria), 'pending']
        );
      }
      await client.query(
        `UPDATE projects SET status = 'analyzed', updated_at = now() WHERE id = $1`,
        [projectId]
      );
    });

    await logActivity({
      projectId,
      actor: 'Business Analyst',
      actorRole: 'BA Agent',
      action: 'completed analysis, generated',
      target: `${baOutput.requirements.length} requirements`,
      type: 'system',
      tag: 'Analysis Complete',
      details: `Business objective: ${baOutput.businessObjective}`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'persisted requirements to',
      target: 'database',
      type: 'system',
      tag: 'Requirements Persisted',
      details: `Stored ${baOutput.requirements.length} requirements (${baOutput.requirements.map(r => r.code).join(', ')})`,
    });

  } catch (err) {
    await query(
      `UPDATE projects SET status = 'submitted', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'Business Analyst',
      actorRole: 'BA Agent',
      action: 'failed to analyze',
      target: 'client brief',
      type: 'system',
      tag: 'Error',
      details: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

async function runPMStep(projectId: string, gateway: ModelGateway): Promise<void> {
  // Status guard: only transition from 'analyzed' to 'planning'
  const updated = await query(
    `UPDATE projects SET status = 'planning', updated_at = now() 
     WHERE id = $1 AND status = 'analyzed' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`[orchestrator] Project ${projectId} already past 'analyzed' status, skipping PM`);
    return;
  }

  // Budget check
  const remaining = await getRemainingBudget(projectId);
  if (remaining <= 0) {
    await query(
      `UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`,
      [projectId]
    );
    throw new Error(`Budget exhausted for project ${projectId}`);
  }

  await logActivity({
    projectId,
    actor: 'Project Manager',
    actorRole: 'PM Agent',
    action: 'started task planning for',
    target: 'validated requirements',
    type: 'task',
    tag: 'Planning Started',
  });

  try {
    // Fetch validated requirements
    const reqResult = await query(
      'SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code',
      [projectId]
    );
    if (reqResult.rows.length === 0) {
      throw new Error(`No requirements found for project ${projectId}`);
    }

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

    // Call PM Agent (returns proposed task plan, does NOT write to DB directly)
    const pmOutput = await runPMAgent(gateway, requirements, projectId);

    const reqMap = new Map(requirements.map((r) => [r.code, r.id]));

    // Orchestrator validates and persists tasks in a transaction
    await withTransaction(async (client) => {
      // Idempotency: clear existing tasks for this project if any
      await client.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);

      for (const task of pmOutput.tasks) {
        const reqId = reqMap.get(task.requirementCode) ?? null;
        await client.query(
          `INSERT INTO tasks (
            project_id, requirement_id, code, title, description,
            status, priority, dependencies, assigned_role
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            projectId,
            reqId,
            task.code,
            task.title,
            task.description,
            'backlog',
            task.priority.toLowerCase(),
            JSON.stringify(task.dependencies),
            task.assignedRole,
          ]
        );
      }

      await client.query(
        `UPDATE projects SET status = 'planned', updated_at = now() WHERE id = $1`,
        [projectId]
      );
    });

    await logActivity({
      projectId,
      actor: 'Project Manager',
      actorRole: 'PM Agent',
      action: 'completed planning, produced',
      target: `${pmOutput.tasks.length} tasks`,
      type: 'task',
      tag: 'Planning Complete',
      details: `Summary: ${pmOutput.summary}`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'persisted implementation tasks to',
      target: 'database',
      type: 'system',
      tag: 'Tasks Persisted',
      details: `Stored ${pmOutput.tasks.length} tasks (${pmOutput.tasks.map((t) => t.code).join(', ')})`,
    });

  } catch (err) {
    await query(
      `UPDATE projects SET status = 'analyzed', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'Project Manager',
      actorRole: 'PM Agent',
      action: 'failed task planning for',
      target: 'requirements',
      type: 'system',
      tag: 'Error',
      details: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

async function runArchitectStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway
): Promise<void> {
  // Status guard: only transition from 'planned' to 'architecting'
  const updated = await query(
    `UPDATE projects SET status = 'architecting', updated_at = now() 
     WHERE id = $1 AND status = 'planned' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`[orchestrator] Project ${projectId} already past 'planned' status, skipping Architect`);
    return;
  }

  // Budget check
  const remaining = await getRemainingBudget(projectId);
  if (remaining <= 0) {
    await query(
      `UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`,
      [projectId]
    );
    throw new Error(`Budget exhausted for project ${projectId}`);
  }

  await logActivity({
    projectId,
    actor: 'Solution Architect',
    actorRole: 'Architect Agent',
    action: 'started architecture analysis for',
    target: 'planned tasks & requirements',
    type: 'system',
    tag: 'Architecture Started',
  });

  try {
    // Fetch requirements and tasks
    const reqResult = await query(
      'SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code',
      [projectId]
    );
    const taskResult = await query(
      'SELECT id, code, title, description, requirement_id, priority, dependencies, assigned_role FROM tasks WHERE project_id = $1 ORDER BY code',
      [projectId]
    );

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

    const tasks: TaskOutput[] = taskResult.rows.map((t) => ({
      code: t.code,
      title: t.title,
      description: t.description || '',
      requirementCode: reqIdToCode.get(t.requirement_id) || 'REQ-001',
      assignedRole: t.assigned_role,
      priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) as any,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : JSON.parse(t.dependencies || '[]'),
      acceptanceIntent: t.description || t.title,
    }));

    // Call Architect Agent (returns proposed spec, does NOT write to DB directly)
    const archOutput = await runArchitectAgent(gateway, clientBrief, requirements, tasks, projectId);

    // Orchestrator validates and persists architecture specification
    await withTransaction(async (client) => {
      // Idempotency: clear previous architecture spec for this project if any
      await client.query('DELETE FROM architecture_specs WHERE project_id = $1', [projectId]);

      await client.query(
        `INSERT INTO architecture_specs (
          project_id, tech_stack, file_structure, implementation_spec, decisions
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          projectId,
          JSON.stringify(archOutput.techStack),
          JSON.stringify(archOutput.fileStructure),
          archOutput.implementationSpec,
          JSON.stringify(archOutput.decisions),
        ]
      );

      await client.query(
        `UPDATE projects SET status = 'designed', updated_at = now() WHERE id = $1`,
        [projectId]
      );
    });

    await logActivity({
      projectId,
      actor: 'Solution Architect',
      actorRole: 'Architect Agent',
      action: 'completed architecture design with',
      target: `${archOutput.decisions.length} ADRs`,
      type: 'system',
      tag: 'Architecture Complete',
      details: `Tech stack: ${archOutput.techStack.language} / ${archOutput.techStack.framework}`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'persisted architecture specification to',
      target: 'database',
      type: 'system',
      tag: 'Architecture Persisted',
      details: `Saved specification with ${archOutput.fileStructure.length} planned files`,
    });

  } catch (err) {
    await query(
      `UPDATE projects SET status = 'planned', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'Solution Architect',
      actorRole: 'Architect Agent',
      action: 'failed architecture design for',
      target: 'project',
      type: 'system',
      tag: 'Error',
      details: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

async function runEngineerStep(
  projectId: string,
  clientBrief: string,
  gateway: ModelGateway
): Promise<void> {
  // Status guard: only transition from 'designed' to 'implementing'
  const updated = await query(
    `UPDATE projects SET status = 'implementing', updated_at = now() 
     WHERE id = $1 AND status = 'designed' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`[orchestrator] Project ${projectId} already past 'designed' status, skipping Engineer`);
    return;
  }

  // Budget check
  const remaining = await getRemainingBudget(projectId);
  if (remaining <= 0) {
    await query(
      `UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`,
      [projectId]
    );
    throw new Error(`Budget exhausted for project ${projectId}`);
  }

  await logActivity({
    projectId,
    actor: 'Full-Stack Engineer',
    actorRole: 'Engineer Agent',
    action: 'started implementation from',
    target: 'approved architecture',
    type: 'task',
    tag: 'Implementation Started',
  });

  try {
    // Fetch requirements, tasks, and architecture
    const reqResult = await query(
      'SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code',
      [projectId]
    );
    const taskResult = await query(
      'SELECT id, code, title, description, requirement_id, priority, dependencies, assigned_role FROM tasks WHERE project_id = $1 ORDER BY code',
      [projectId]
    );
    const archResult = await query(
      'SELECT tech_stack, file_structure, implementation_spec, decisions FROM architecture_specs WHERE project_id = $1',
      [projectId]
    );

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

    const tasks: TaskOutput[] = taskResult.rows.map((t) => ({
      code: t.code,
      title: t.title,
      description: t.description || '',
      requirementCode: reqIdToCode.get(t.requirement_id) || 'REQ-001',
      assignedRole: t.assigned_role,
      priority: (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) as any,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : JSON.parse(t.dependencies || '[]'),
      acceptanceIntent: t.description || t.title,
    }));

    const rawArch = archResult.rows[0];
    const architecture: ArchitectureOutput = {
      techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    // Call Engineer Agent (generates structured source code files)
    const engineerOutput = await runEngineerAgent(
      gateway,
      clientBrief,
      requirements,
      tasks,
      architecture,
      projectId
    );

    // Deterministic security, path, dependency, and coverage validation
    const valResult = validateEngineerArtifacts(
      engineerOutput,
      tasks.map((t) => t.code)
    );

    if (!valResult.valid) {
      throw new Error(
        `Engineer artifact security/coverage validation failed: ${valResult.errors.join('; ')}`
      );
    }

    const taskMap = new Map(taskResult.rows.map((t) => [t.code, t.id]));
    const defaultTaskId = taskResult.rows[0].id;

    // Transactionally persist code artifacts into PostgreSQL
    await withTransaction(async (client) => {
      // Idempotency: clear previous code artifacts for this project's tasks
      await client.query(
        `DELETE FROM code_artifacts WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)`,
        [projectId]
      );

      for (const file of engineerOutput.files) {
        const primaryTaskCode = file.relatedTaskCodes[0];
        const taskId = taskMap.get(primaryTaskCode) ?? defaultTaskId;
        const ext = file.path.endsWith('.py') ? 'python' : 'text';

        await client.query(
          `INSERT INTO code_artifacts (
            task_id, file_path, content, language, generated_by, artifact_type, version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            taskId,
            file.path,
            file.content,
            ext,
            'Engineer',
            'source_code',
            1,
          ]
        );
      }

      await client.query(
        `UPDATE projects SET status = 'implemented', updated_at = now() WHERE id = $1`,
        [projectId]
      );
    });

    await logActivity({
      projectId,
      actor: 'Full-Stack Engineer',
      actorRole: 'Engineer Agent',
      action: 'completed code generation for',
      target: `${engineerOutput.files.length} source files`,
      type: 'task',
      tag: 'Implementation Complete',
      details: `Generated ${engineerOutput.files.length} files (${valResult.totalSizeBytes} bytes). ${engineerOutput.implementationSummary}`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'persisted code artifacts to',
      target: 'database',
      type: 'system',
      tag: 'Code Artifacts Persisted',
      details: `Saved ${engineerOutput.files.length} artifacts (${engineerOutput.files.map((f) => f.path).join(', ')})`,
    });

  } catch (err) {
    await query(
      `UPDATE projects SET status = 'designed', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'Full-Stack Engineer',
      actorRole: 'Engineer Agent',
      action: 'failed code generation for',
      target: 'project',
      type: 'system',
      tag: 'Error',
      details: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}
