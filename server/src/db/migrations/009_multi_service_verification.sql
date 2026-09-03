-- Migration 009: Multi-Service Verification Runs
-- Adds structured tracking for multi-service Docker sandbox execution, service health, and evidence.

CREATE TABLE IF NOT EXISTS verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  implementation_revision_id UUID REFERENCES implementation_revisions(id) ON DELETE SET NULL,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'passed', 'failed', 'timeout', 'error')),
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  resource_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  frontend_build_result JSONB,
  migration_result JSONB,
  backend_health_result JSONB,
  integration_test_result JSONB,
  security_result JSONB,
  error_code TEXT,
  error_message TEXT,
  logs JSONB NOT NULL DEFAULT '{}'::jsonb,
  cleanup_state TEXT NOT NULL DEFAULT 'pending' CHECK (cleanup_state IN ('pending', 'cleaned', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_runs_project_id ON verification_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_revision_id ON verification_runs(implementation_revision_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_run_id ON verification_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_status ON verification_runs(status);
