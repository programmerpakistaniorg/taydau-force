import { createGateway } from '../src/gateway/provider-factory.js';
import { runUntilBlocked } from '../src/orchestrator/orchestrator.js';
import { WorkflowService } from '../src/services/workflow-service.js';
import { query } from '../src/db/pool.js';

async function main() {
  console.log('=== TayDau Force Live Pipeline End-to-End Verification ===');

  const projectName = 'EcoSmart Karachi Recycling';
  const clientBrief = 'Build an autonomous community waste reporting and recycling management platform with location tagging, citizen rewards, and real-time truck route dispatching.';

  const insertRes = await query(
    `INSERT INTO projects (name, client_brief, status, autonomy_mode)
     VALUES ($1, $2, 'submitted', 'auto_pilot')
     RETURNING id, name, status, autonomy_mode`,
    [projectName, clientBrief]
  );
  const projectId = insertRes.rows[0].id;
  console.log(`Created project: ${projectId} (${projectName}) in Auto-Pilot mode.`);

  // Initialize canonical workflow
  await WorkflowService.getWorkflow(projectId);

  const gateway = createGateway();

  console.log('Starting autonomous execution loop via runUntilBlocked...');
  const startTime = Date.now();

  await runUntilBlocked(projectId, gateway);

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`Execution loop finished in ${durationSec}s.`);

  // Inspect results
  const wf = await WorkflowService.getWorkflow(projectId);
  console.log('Final Workflow State:');
  console.log(`- Stage: ${wf.stage}`);
  console.log(`- Status: ${wf.stageStatus}`);
  console.log(`- Progress: ${wf.progress}%`);
  console.log(`- Active Role: ${wf.activeRole}`);

  const reqs = await query(`SELECT code, title, status FROM requirements WHERE project_id = $1`, [projectId]);
  console.log(`Requirements persisted (${reqs.rows.length}):`, reqs.rows);

  const tasks = await query(`SELECT code, title, assigned_role, status FROM tasks WHERE project_id = $1`, [projectId]);
  console.log(`Tasks persisted (${tasks.rows.length}):`, tasks.rows);

  const design = await query(`SELECT id, status, version FROM design_specs WHERE project_id = $1`, [projectId]);
  console.log(`Design specs persisted (${design.rows.length}):`, design.rows);

  const arch = await query(`SELECT tech_stack FROM architecture_specs WHERE project_id = $1`, [projectId]);
  console.log(`Architecture specs persisted:`, arch.rows.length > 0 ? 'YES' : 'NO');

  const artifacts = await query(`SELECT file_path, language FROM code_artifacts ca JOIN tasks t ON ca.task_id = t.id WHERE t.project_id = $1`, [projectId]);
  console.log(`Code Artifacts persisted (${artifacts.rows.length}):`, artifacts.rows.map(r => r.file_path));

  const verRuns = await query(`SELECT run_id, status, error_code, completed_at FROM verification_runs WHERE project_id = $1`, [projectId]);
  console.log(`Stage 10 Vercel Verification Runs (${verRuns.rows.length}):`, verRuns.rows);

  const activities = await query(`SELECT actor_name, action, target, title FROM activities WHERE project_id = $1 ORDER BY timestamp ASC`, [projectId]);
  console.log(`Activity Logs Count: ${activities.rows.length}`);
  for (const act of activities.rows) {
    console.log(`  [${act.actor_name}] ${act.action} -> ${act.target}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal Pipeline Execution Error:', err);
  process.exit(1);
});
