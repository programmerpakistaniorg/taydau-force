import pg from 'pg';
import { config } from '../config.js';
import { executeSqliteQuery, getSqliteDb } from './sqlite-fallback.js';

let isPgAvailable: boolean | null = null;
const { Pool } = pg;

export const realPgPool = new Pool({
  connectionString: config.database.url,
  connectionTimeoutMillis: 1500,
});

realPgPool.on('error', (err: any) => {
  console.warn(`[Database] Unexpected error on idle PostgreSQL client (${err?.code || err?.message}). Failing over to SQLite.`);
  isPgAvailable = false;
});

let lastHealthCheck = 0;

export async function checkPgHealth(): Promise<boolean> {
  const now = Date.now();
  if (isPgAvailable === true) return true;
  if (isPgAvailable === false && now - lastHealthCheck < 5000) return false;
  lastHealthCheck = now;
  try {
    const client = await realPgPool.connect();
    await client.query('SELECT 1');
    client.release();
    isPgAvailable = true;
    console.log('[Database] PostgreSQL connection established successfully.');
    return true;
  } catch (err: any) {
    isPgAvailable = false;
    console.warn(`[Database] PostgreSQL offline (${err.message || 'connection failed'}). Using persistent embedded SQLite engine at server/data/taydau.db.`);
    getSqliteDb(); // Ensure all tables are created
    return false;
  }
}

// Unified query function supporting PostgreSQL and zero-dependency SQLite fallback
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  if (await checkPgHealth()) {
    try {
      return await realPgPool.query<T>(text, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
        isPgAvailable = false;
        console.warn(`[Database] PostgreSQL connection lost (${err.code}). Switching to SQLite fallback.`);
      } else {
        throw err;
      }
    }
  }

  const res = executeSqliteQuery(text, params || []);
  return {
    rows: res.rows as T[],
    rowCount: res.rowCount,
    command: text.trim().split(' ')[0],
    oid: 0,
    fields: [],
  };
}

// Transaction helper supporting PostgreSQL and zero-dependency SQLite fallback
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  if (await checkPgHealth()) {
    try {
      const client = await realPgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
        isPgAvailable = false;
        console.warn(`[Database] PostgreSQL connection lost in transaction. Switching to SQLite.`);
      } else {
        throw err;
      }
    }
  }

  const client = {
    query: async (text: string, params?: any[]) => query(text, params),
    release: () => {},
  } as unknown as pg.PoolClient;

  await client.query('BEGIN');
  try {
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

// Unified pool proxy
export const pool = {
  query: async (text: string, params?: any[]) => query(text, params),
  connect: async () => {
    if (await checkPgHealth()) {
      return realPgPool.connect();
    }
    return {
      query: async (text: string, params?: any[]) => query(text, params),
      release: () => {},
    } as unknown as pg.PoolClient;
  },
  end: async () => {
    try {
      await realPgPool.end();
    } catch {}
  },
} as unknown as pg.Pool;
