import { withTransaction, query } from '../db/pool.js';
import type { ModelGateway } from '../gateway/model-gateway.js';
import { runBAAgent } from '../agents/ba-agent.js';
import { logActivity } from '../services/activity-logger.js';
import { getRemainingBudget } from '../services/cost-telemetry.js';
import { config } from '../config.js';

export async function runOrchestrator(projectId: string, gateway: ModelGateway): Promise<void> {
  // Get current project state
  const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (projectResult.rows.length === 0) {
    throw new Error(`Project ${projectId} not found`);
  }
  const project = projectResult.rows[0];

  // Run the appropriate step based on current status
  switch (project.status) {
    case 'submitted':
      await runBAStep(projectId, project.client_brief, gateway);
      break;
    // Future steps will be added here:
    // case 'analyzing': // already in progress, skip
    // case 'analyzed': await runPMStep(...)
    // case 'planning': // in progress
    // case 'planned': await runArchitectStep(...)
    // etc.
    default:
      console.log(`Project ${projectId} is in status '${project.status}', no action needed`);
  }
}

async function runBAStep(projectId: string, clientBrief: string, gateway: ModelGateway): Promise<void> {
  // Status guard: only run if status is 'submitted' (idempotency - correction #13)
  const updated = await query(
    `UPDATE projects SET status = 'analyzing', updated_at = now() 
     WHERE id = $1 AND status = 'submitted' RETURNING id`,
    [projectId]
  );
  if (updated.rows.length === 0) {
    console.log(`Project ${projectId} already past 'submitted' status, skipping BA`);
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
    // Call BA agent (returns proposed output, does NOT write to DB)
    const baOutput = await runBAAgent(gateway, clientBrief, projectId);

    // Orchestrator validates and persists (correction #8) — use transaction (correction #12)
    await withTransaction(async (client) => {
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
    // On failure, set status back so it can be retried
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
