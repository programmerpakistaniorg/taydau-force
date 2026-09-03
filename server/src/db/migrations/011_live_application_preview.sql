-- Migration 011: Live Application Preview
-- Secure multi-service container runtime state & capability hash tracking

CREATE TABLE IF NOT EXISTS live_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  implementation_revision_id UUID NOT NULL REFERENCES implementation_revisions(id) ON DELETE RESTRICT,
  revision_version INT NOT NULL,
  manifest_sha VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'starting'
    CHECK (status IN ('starting', 'ready', 'stopping', 'stopped', 'expired', 'failed')),
  cleanup_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (cleanup_status IN ('pending', 'in_progress', 'complete', 'failed')),
  capability_hash VARCHAR(64) UNIQUE NOT NULL,
  ephemeral_port INT NOT NULL DEFAULT 0,
  docker_network VARCHAR(128) NOT NULL,
  service_topology JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code VARCHAR(64),
  sanitized_error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ready_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guarantee DB-level single active preview per project (at-most-one in starting, ready, stopping)
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_previews_active_project 
ON live_previews(project_id) 
WHERE status IN ('starting', 'ready', 'stopping');

CREATE INDEX IF NOT EXISTS idx_live_previews_project_id ON live_previews(project_id);
CREATE INDEX IF NOT EXISTS idx_live_previews_capability_hash ON live_previews(capability_hash);
