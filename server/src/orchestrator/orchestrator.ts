import { withTransaction, query } from '../db/pool.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { runBAAgent } from '../agents/ba-agent.js';
import { runPMAgent, type RequirementContext } from '../agents/pm-agent.js';
import { runArchitectAgent } from '../agents/architect-agent.js';
import { runEngineerAgent } from '../agents/engineer-agent.js';
import { runQAAgent } from '../agents/qa-agent.js';
import { validateEngineerArtifacts } from '../services/artifact-validator.js';
import { validateQAArtifacts } from '../services/qa-validator.js';
import {
  materializeWorkspace,
  cleanupWorkspace,
  executeSandboxTests,
  type SandboxExecutionResult,
} from '../services/docker-sandbox.js';
import { logActivity } from '../services/activity-logger.js';
import { getRemainingBudget } from '../services/cost-telemetry.js';
import type { TaskOutput } from '../schemas/task.js';
import type { ArchitectureOutput } from '../schemas/architecture.js';
import crypto from 'crypto';

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
        await runQAStep(projectId, project.client_brief, gateway);
        break;

      case 'verifying':
        await runSandboxStep(projectId);
        break;

      case 'tested_passed':
      case 'defects_found':
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
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    // Call Engineer Agent (generates structured source code files for implementation tasks)
    const engineerOutput = await runEngineerAgent(
      gateway,
      clientBrief,
      requirements,
      implementationTasks,
      architecture,
      projectId
    );

    // Deterministic security, path, dependency, and coverage validation
    const valResult = validateEngineerArtifacts(
      engineerOutput,
      implementationTasks.map((t) => t.code),
      qaTasks.map((t) => t.code)
    );

    if (!valResult.valid) {
      throw new Error(
        `Engineer artifact security/coverage validation failed: ${valResult.errors.join('; ')}`
      );
    }

    const implTaskMap = new Map(
      taskResult.rows
        .filter((t) => !isQaRole(t.assigned_role))
        .map((t) => [t.code, t.id])
    );
    const defaultTaskId = implementationTasks.length > 0 ? (implTaskMap.get(implementationTasks[0].code) ?? taskResult.rows[0].id) : taskResult.rows[0].id;

    // Transactionally persist code artifacts into PostgreSQL
    await withTransaction(async (client) => {
      // Idempotency: clear previous code artifacts for this project's tasks
      await client.query(
        `DELETE FROM code_artifacts WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)`,
        [projectId]
      );

      for (const file of engineerOutput.files) {
        const primaryTaskCode = file.relatedTaskCodes[0];
        const taskId = implTaskMap.get(primaryTaskCode) ?? defaultTaskId;
        const ext = file.path.endsWith('.py') ? 'python' : 'text';

        const insertRes = await client.query(
          `INSERT INTO code_artifacts (
            task_id, file_path, content, language, generated_by, artifact_type, version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
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
        const artifactId = insertRes.rows[0].id;

        // Persist only implementation task relationships into code_artifact_tasks junction table
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

async function runQAStep(projectId: string, clientBrief: string, gateway: ModelGateway): Promise<void> {
  const updated = await query(
    `UPDATE projects SET status = 'verifying', updated_at = now()
     WHERE id = $1 AND status = 'implemented' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`[orchestrator] Project ${projectId} not in 'implemented' status, skipping QA`);
    return;
  }

  const remaining = await getRemainingBudget(projectId);
  if (remaining <= 0) {
    await query(`UPDATE projects SET status = 'failed', updated_at = now() WHERE id = $1`, [projectId]);
    throw new Error(`Budget exhausted for project ${projectId}`);
  }

  await logActivity({
    projectId,
    actor: 'QA Engineer',
    actorRole: 'QA Agent',
    action: 'started independent test derivation for',
    target: 'validated requirements',
    type: 'system',
    tag: 'QA Planning Started',
    details: 'QA context strictly excludes Engineer implementation code (independent test derivation)',
  });

  try {
    const reqResult = await query(
      'SELECT id, code, title, type, priority, acceptance_criteria FROM requirements WHERE project_id = $1 ORDER BY code',
      [projectId]
    );
    const archResult = await query(
      'SELECT tech_stack, file_structure, implementation_spec, decisions FROM architecture_specs WHERE project_id = $1',
      [projectId]
    );

    if (reqResult.rows.length === 0 || archResult.rows.length === 0) {
      throw new Error(`Missing requirements or architecture spec for project ${projectId}`);
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

    const rawArch = archResult.rows[0];
    const architecture: ArchitectureOutput = {
      techStack: typeof rawArch.tech_stack === 'string' ? JSON.parse(rawArch.tech_stack) : rawArch.tech_stack,
      fileStructure: typeof rawArch.file_structure === 'string' ? JSON.parse(rawArch.file_structure) : rawArch.file_structure,
      implementationSpec: rawArch.implementation_spec,
      decisions: typeof rawArch.decisions === 'string' ? JSON.parse(rawArch.decisions) : rawArch.decisions,
    };

    // Call QA Agent (CRITICAL: Engineer source code is NOT passed to QA)
    const qaOutput = await runQAAgent(gateway, clientBrief, requirements, architecture, projectId);

    // Deterministic security and requirement coverage validation
    const valResult = validateQAArtifacts(
      qaOutput,
      requirements.map((r) => r.code)
    );

    if (!valResult.valid) {
      throw new Error(`QA artifact validation failed: ${valResult.errors.join('; ')}`);
    }

    const reqMap = new Map(reqResult.rows.map((r) => [r.code, r.id]));

    // Transactionally persist QA test artifacts & requirement links
    await withTransaction(async (client) => {
      // Idempotency: clear previous QA artifacts for this project
      await client.query('DELETE FROM qa_test_artifacts WHERE project_id = $1', [projectId]);

      for (const file of qaOutput.testFiles) {
        const insertRes = await client.query(
          `INSERT INTO qa_test_artifacts (
            project_id, file_path, content, language, generated_by, version
          ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [projectId, file.path, file.content, 'python', 'QA Engineer', 1]
        );
        const artifactId = insertRes.rows[0].id;

        const linkedReqCodes = new Set([
          ...(file.relatedRequirementCodes || []),
          ...(qaOutput.requirementCoverage
            ?.filter((cov) => cov.testNames.length > 0)
            .map((cov) => cov.requirementCode) || []),
        ]);

        for (const rCode of linkedReqCodes) {
          const reqId = reqMap.get(rCode);
          if (reqId) {
            await client.query(
              `INSERT INTO qa_test_requirements (qa_test_artifact_id, requirement_id)
               VALUES ($1, $2)
               ON CONFLICT (qa_test_artifact_id, requirement_id) DO NOTHING`,
              [artifactId, reqId]
            );
          }
        }
      }
    });

    await logActivity({
      projectId,
      actor: 'QA Engineer',
      actorRole: 'QA Agent',
      action: 'completed test suite derivation for',
      target: `${qaOutput.testFiles.length} test files`,
      type: 'task',
      tag: 'QA Tests Generated',
      details: `Generated ${qaOutput.testFiles.length} test files (${valResult.totalSizeBytes} bytes). ${qaOutput.testPlanSummary}`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'persisted QA test artifacts to',
      target: 'database',
      type: 'system',
      tag: 'QA Tests Persisted',
      details: `Saved ${qaOutput.testFiles.length} QA test suites (${qaOutput.testFiles.map((f) => f.path).join(', ')})`,
    });
  } catch (err) {
    await query(
      `UPDATE projects SET status = 'implemented', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'QA Engineer',
      actorRole: 'QA Agent',
      action: 'failed test derivation for',
      target: 'project',
      type: 'system',
      tag: 'Error',
      details: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

async function runSandboxStep(projectId: string): Promise<void> {
  // Fetch Engineer artifacts
  const engArtifactsRes = await query(
    `SELECT file_path, content FROM code_artifacts 
     WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)
     ORDER BY file_path`,
    [projectId]
  );

  // Fetch QA artifacts
  const qaArtifactsRes = await query(
    `SELECT file_path, content FROM qa_test_artifacts 
     WHERE project_id = $1
     ORDER BY file_path`,
    [projectId]
  );

  if (engArtifactsRes.rows.length === 0 || qaArtifactsRes.rows.length === 0) {
    throw new Error(`Missing Engineer code artifacts or QA test artifacts for sandbox run in project ${projectId}`);
  }

  const runId = crypto.randomUUID();

  await logActivity({
    projectId,
    actor: 'System',
    actorRole: 'Orchestrator',
    action: 'started sandbox execution in',
    target: 'Docker container',
    type: 'system',
    tag: 'Sandbox Started',
    details: 'Isolated execution with --network none, non-root user, read-only rootfs, and tmpfs workspace',
  });

  const engineerFiles = engArtifactsRes.rows.map((r) => ({ path: r.file_path, content: r.content }));
  const qaFiles = qaArtifactsRes.rows.map((r) => ({ path: r.file_path, content: r.content }));

  let workspaceDir = '';
  let execResult: SandboxExecutionResult;

  try {
    workspaceDir = await materializeWorkspace(projectId, runId, engineerFiles, qaFiles);
    execResult = await executeSandboxTests(projectId, runId, workspaceDir);
  } finally {
    if (workspaceDir) {
      await cleanupWorkspace(workspaceDir);
    }
  }

  // Persist test run in PostgreSQL
  await query(
    `INSERT INTO test_runs (
      project_id, exit_code, stdout, stderr, duration_ms, tests_passed, tests_failed, status, test_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      projectId,
      execResult.exitCode ?? -1,
      execResult.stdout,
      execResult.stderr,
      execResult.durationMs,
      execResult.testsPassed,
      execResult.testsFailed,
      execResult.status,
      'independent_acceptance',
    ]
  );

  if (execResult.status === 'passed') {
    await query(
      `UPDATE projects SET status = 'tested_passed', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'completed sandbox verification with',
      target: 'PASS',
      type: 'system',
      tag: 'Sandbox Complete',
      details: `pytest passed (${execResult.testsPassed} passed, 0 failed in ${execResult.durationMs}ms)`,
    });
  } else {
    // Tests failed, timed out, or error -> Record defects and set project status to 'defects_found'
    await query(
      `UPDATE projects SET status = 'defects_found', updated_at = now() WHERE id = $1`,
      [projectId]
    );

    // Get project requirements to link defect
    const reqRes = await query(
      'SELECT id, code, title FROM requirements WHERE project_id = $1 ORDER BY code LIMIT 1',
      [projectId]
    );
    const primaryReqId = reqRes.rows.length > 0 ? reqRes.rows[0].id : null;

    // Idempotency: clear previous defects for this project before inserting
    await query('DELETE FROM defects WHERE project_id = $1', [projectId]);

    const defectEvidence = {
      exitCode: execResult.exitCode,
      testsPassed: execResult.testsPassed,
      testsFailed: execResult.testsFailed,
      stdout: execResult.stdout.slice(0, 4000),
      stderr: execResult.stderr.slice(0, 4000),
      timedOut: execResult.timedOut,
      errorMessage: execResult.errorMessage,
    };

    await query(
      `INSERT INTO defects (
        project_id, requirement_id, code, title, severity, status, description, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        projectId,
        primaryReqId,
        'DEF-001',
        'Independent Acceptance Test Failure',
        'High',
        'open',
        `Deterministic pytest execution in sandbox failed (${execResult.testsFailed} failed, ${execResult.testsPassed} passed).`,
        JSON.stringify(defectEvidence),
      ]
    );

    await logActivity({
      projectId,
      actor: 'QA Engineer',
      actorRole: 'QA Agent',
      action: 'created defect from',
      target: 'deterministic failure evidence',
      type: 'task',
      tag: 'Defect Created',
      details: `Defect DEF-001 created: ${execResult.testsFailed} test(s) failed in sandbox execution`,
    });

    await logActivity({
      projectId,
      actor: 'System',
      actorRole: 'Orchestrator',
      action: 'completed sandbox verification with',
      target: `FAIL (exit code: ${execResult.exitCode})`,
      type: 'system',
      tag: 'Sandbox Complete',
      details: `pytest failed with ${execResult.testsFailed} failure(s) in ${execResult.durationMs}ms`,
    });
  }
}

