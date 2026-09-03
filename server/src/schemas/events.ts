import { z } from 'zod';

export const ProjectEventTypeSchema = z.enum([
  'project.created',

  'workflow.stage.started',
  'workflow.stage.completed',
  'workflow.stage.waiting_for_client',
  'workflow.needs_attention',

  'agent.started',
  'agent.activity',
  'agent.completed',
  'agent.failed',

  'interaction.required',
  'interaction.resolved',

  'approval.required',
  'approval.approved',
  'approval.changes_requested',

  'artifact.created',
  'artifact.updated',

  'design.generated',
  'design.revised',
  'design.approved',

  'implementation.revision.created',

  'review.started',
  'review.completed',
  'review.blocked',

  'qa.started',
  'qa.test_progress',
  'qa.completed',

  'security.started',
  'security.completed',
  'security.blocked',

  'defect.opened',
  'defect.assigned',
  'rework.started',
  'rework.completed',
  'defect.resolved',
  'defect.escalated',

  'verification.started',
  'verification.service_status',
  'verification.log',
  'verification.completed',

  'preview.starting',
  'preview.ready',
  'preview.failed',
  'preview.updated',
  'preview.stopping',
  'preview.stopped',
  'preview.expired',

  'delivery.git.preparing',
  'delivery.git.repository_created',
  'delivery.git.commit_created',
  'delivery.git.push_started',
  'delivery.git.push_completed',
  'delivery.git.failed',
  'delivery.ready',

  'release.ready',
  'release.blocked',
]);

export type ProjectEventType = z.infer<typeof ProjectEventTypeSchema>;

export const ProjectEventSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  sequence: z.number().optional(),
  eventId: z.string(),
  eventType: ProjectEventTypeSchema,
  stage: z.string().optional().nullable(),
  actorRole: z.string().optional().nullable(),
  actorName: z.string().optional().nullable(),
  summary: z.string(),
  payload: z.record(z.any()).default({}),
  correlationId: z.string().optional().nullable(),
  causationId: z.string().optional().nullable(),
  schemaVersion: z.string().default('1.0'),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type ProjectEvent = z.infer<typeof ProjectEventSchema>;
