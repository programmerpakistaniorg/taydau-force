import { Response } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool.js';
import type { ProjectEvent, ProjectEventType } from '../schemas/events.js';

export interface EmitEventParams {
  projectId: string;
  eventType: ProjectEventType;
  stage?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  summary: string;
  payload?: Record<string, any>;
  correlationId?: string | null;
  causationId?: string | null;
}

export class EventEmitterService {
  private static subscribers: Map<string, Set<Response>> = new Map();
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  static {
    // Send 15-second SSE keep-alive comments to prevent timeout
    this.heartbeatTimer = setInterval(() => {
      for (const [projectId, clientSet] of this.subscribers.entries()) {
        for (const res of clientSet) {
          try {
            res.write(':heartbeat\n\n');
          } catch (e) {
            clientSet.delete(res);
          }
        }
        if (clientSet.size === 0) {
          this.subscribers.delete(projectId);
        }
      }
    }, 15000);
  }

  /**
   * Subscribes an Express Response connection to real-time SSE for a project.
   */
  static subscribe(projectId: string, res: Response, lastEventId?: string | null): void {
    if (!this.subscribers.has(projectId)) {
      this.subscribers.set(projectId, new Set());
    }
    this.subscribers.get(projectId)!.add(res);

    res.on('close', () => {
      const set = this.subscribers.get(projectId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          this.subscribers.delete(projectId);
        }
      }
    });

    // If Last-Event-ID provided, replay missed events in order
    if (lastEventId) {
      const afterSeq = parseInt(lastEventId, 10);
      if (!isNaN(afterSeq)) {
        this.replayEvents(projectId, afterSeq, res).catch((err) => {
          console.error(`[event-emitter] Failed to replay events for ${projectId}:`, err);
        });
      }
    }
  }

  /**
   * Replays persisted durable events after a given sequence.
   */
  static async replayEvents(projectId: string, afterSequence: number, res: Response): Promise<void> {
    try {
      const { rows } = await query(
        `SELECT
           sequence, event_id, event_type, stage, actor_role, actor_name,
           summary, payload, correlation_id, causation_id, schema_version, created_at
         FROM project_events
         WHERE project_id = $1 AND sequence > $2
         ORDER BY sequence ASC
         LIMIT 500`,
        [projectId, afterSequence]
      );

      for (const r of rows) {
        const evt = {
          projectId,
          sequence: Number(r.sequence),
          eventId: r.event_id,
          eventType: r.event_type,
          stage: r.stage,
          actorRole: r.actor_role,
          actorName: r.actor_name,
          summary: r.summary,
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
          correlationId: r.correlation_id,
          causationId: r.causation_id,
          schemaVersion: r.schema_version,
          createdAt: r.created_at,
        };

        res.write(`id: ${evt.sequence}\nevent: ${evt.eventType}\ndata: ${JSON.stringify(evt)}\n\n`);
      }
    } catch (err) {
      console.error('[event-emitter] Error replaying events:', err);
    }
  }

  /**
   * Emits and persists a durable project event, then broadcasts it via SSE.
   */
  static async emit(params: EmitEventParams): Promise<ProjectEvent> {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payloadJson = JSON.stringify(params.payload || {});

    const { rows } = await query(
      `INSERT INTO project_events (
         project_id, event_id, event_type, stage, actor_role, actor_name,
         summary, payload, correlation_id, causation_id, schema_version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING sequence, created_at`,
      [
        params.projectId,
        eventId,
        params.eventType,
        params.stage || null,
        params.actorRole || null,
        params.actorName || null,
        params.summary,
        payloadJson,
        params.correlationId || null,
        params.causationId || null,
        '1.0',
      ]
    );

    const seq = Number(rows[0].sequence);
    const createdAt = rows[0].created_at;

    const event: ProjectEvent = {
      projectId: params.projectId,
      sequence: seq,
      eventId,
      eventType: params.eventType,
      stage: params.stage,
      actorRole: params.actorRole,
      actorName: params.actorName,
      summary: params.summary,
      payload: params.payload || {},
      correlationId: params.correlationId,
      causationId: params.causationId,
      schemaVersion: '1.0',
      createdAt: typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
    };

    // Broadcast to active SSE clients
    const clients = this.subscribers.get(params.projectId);
    if (clients && clients.size > 0) {
      const ssePayload = `id: ${seq}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`;
      for (const client of clients) {
        try {
          client.write(ssePayload);
        } catch (err) {
          clients.delete(client);
        }
      }
    }

    return event;
  }
}
