import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  // Create _migrations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // Get already-executed migrations
  const result = await pool.query<{ name: string }>('SELECT name FROM _migrations ORDER BY name');
  const executed = new Set(result.rows.map((r) => r.name));

  // Read .sql files from migrations/ directory
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;

  for (const file of files) {
    if (executed.has(file)) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  applied: ${file}`);
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FAILED: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`\nMigration complete: ${applied} new migration(s) applied.`);
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
