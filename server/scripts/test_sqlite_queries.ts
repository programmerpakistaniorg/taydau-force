import { executeSqliteQuery } from '../src/db/sqlite-fallback.js';

async function test() {
  console.log('[Test] Running SQLite fallback query test...');

  // 1. Insert project
  const p = executeSqliteQuery(
    'INSERT INTO projects (name, client_brief, status, autonomy_mode) VALUES ($1, $2, $3, $4) RETURNING *',
    ['Judge Demo Project', 'Build an autonomous multi-warehouse inventory system with real-time tracking.', 'submitted', 'auto_pilot']
  );
  console.log('[Test] Project created:', p.rows[0].id, p.rows[0].name);

  // 2. Insert workflow
  const wf = executeSqliteQuery(
    `INSERT INTO project_workflows (project_id, stage, stage_status, active_role, next_action)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [p.rows[0].id, 'business_analysis', 'running', 'business_analyst', 'Sana Tariq is analyzing']
  );
  console.log('[Test] Workflow created:', wf.rows[0].stage, wf.rows[0].active_role);

  // 3. Query projects
  const list = executeSqliteQuery('SELECT * FROM projects WHERE id = $1', [p.rows[0].id]);
  console.log('[Test] Query project by ID:', list.rows.length, list.rows[0].name);

  // 4. Update workflow
  const upd = executeSqliteQuery(
    'UPDATE project_workflows SET stage = $1, stage_status = $2 WHERE project_id = $3 RETURNING *',
    ['project_planning', 'running', p.rows[0].id]
  );
  console.log('[Test] Workflow updated:', upd.rows[0].stage);

  console.log('[Test] All queries executed successfully with zero PostgreSQL dependencies!');
}

test();
