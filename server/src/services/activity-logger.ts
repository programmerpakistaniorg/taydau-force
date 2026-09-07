import { query } from '../db/pool.js';

export interface ActivityRecord {
  projectId: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  type: 'task' | 'qa' | 'security' | 'defect' | 'governor' | 'system';
  tag?: string;
  details?: string;
}

export async function logActivity(record: ActivityRecord): Promise<void> {
  await query(
    `INSERT INTO activities (project_id, actor, actor_role, action, target, type, tag, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      record.projectId, record.actor, record.actorRole,
      record.action, record.target, record.type,
      record.tag || null, record.details || null,
    ]
  );
}
