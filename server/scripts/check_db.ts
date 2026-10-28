import { query, checkPgHealth } from '../src/db/pool.js';

async function main() {
  console.log('Postgres available?', await checkPgHealth());
  const p = await query('SELECT id, name, status, autonomy_mode, created_at FROM projects ORDER BY created_at DESC LIMIT 5');
  console.log('Projects:', p.rows);

  const r = await query('SELECT * FROM requirements');
  console.log('Requirements count:', r.rows.length, r.rows);

  const w = await query('SELECT * FROM project_workflows');
  console.log('Workflows:', w.rows);

  const b = await query('SELECT * FROM requirement_baselines');
  console.log('Baselines:', b.rows);

  const a = await query('SELECT * FROM approval_requests');
  console.log('Approvals:', a.rows);

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
