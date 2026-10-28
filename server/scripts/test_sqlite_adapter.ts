import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function createSqliteDb(dbPath: string = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Custom PG functions
  db.function('gen_random_uuid', () => crypto.randomUUID());
  db.function('now', () => new Date().toISOString());
  db.function('jsonb_set', (target: any, pathStr: string, value: any) => {
    try {
      const obj = typeof target === 'string' ? JSON.parse(target) : (target || {});
      const cleanPath = pathStr.replace(/^{|}$/g, '').split(',');
      let curr = obj;
      for (let i = 0; i < cleanPath.length - 1; i++) {
        const k = cleanPath[i];
        if (!curr[k]) curr[k] = {};
        curr = curr[k];
      }
      const val = typeof value === 'string' ? JSON.parse(value) : value;
      curr[cleanPath[cleanPath.length - 1]] = val;
      return JSON.stringify(obj);
    } catch {
      return typeof target === 'string' ? target : JSON.stringify(target || {});
    }
  });

  return db;
}

// Quick verification
const db = createSqliteDb();
console.log('UUID test:', db.prepare('SELECT gen_random_uuid() as uuid, now() as now').get());
