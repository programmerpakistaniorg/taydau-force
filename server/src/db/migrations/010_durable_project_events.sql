-- Migration 010: Durable Project Events
-- Implements high-durability, ordered event sourcing log for Server-Sent Events (SSE) and real-time streaming.

CREATE TABLE IF NOT EXISTS project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence BIGSERIAL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stage TEXT,
  actor_role TEXT,
  actor_name TEXT,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  causation_id TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project_sequence ON project_events(project_id, sequence);
CREATE INDEX IF NOT EXISTS idx_project_events_project_created ON project_events(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_project_events_type ON project_events(event_type);
