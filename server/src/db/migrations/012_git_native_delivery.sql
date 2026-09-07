-- Migration 012: Git-Native Verified Software Delivery
-- Tracks exact materialization of verified implementation revisions into isolated Git repositories with provenance

CREATE TABLE IF NOT EXISTS git_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  implementation_revision_id UUID NOT NULL REFERENCES implementation_revisions(id) ON DELETE RESTRICT,
  revision_version INT NOT NULL,
  manifest_sha VARCHAR(64) NOT NULL,
  verification_run_id UUID REFERENCES verification_runs(id) ON DELETE SET NULL,
  qa_suite_sha VARCHAR(64),
  release_decision_id UUID REFERENCES release_readiness(id) ON DELETE SET NULL,
  repository_path VARCHAR(500) NOT NULL,
  git_commit_sha VARCHAR(64),
  git_tree_sha VARCHAR(64),
  branch_name VARCHAR(100) NOT NULL DEFAULT 'main',
  remote_url_sanitized VARCHAR(500),
  push_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (push_status IN ('pending', 'in_progress', 'pushed', 'skipped', 'failed')),
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'preparing'
    CHECK (delivery_status IN ('preparing', 'repository_created', 'committed', 'verified', 'pushing', 'delivered', 'failed')),
  error_code VARCHAR(64),
  sanitized_error_message TEXT,
  provenance_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_scan_passed BOOLEAN NOT NULL DEFAULT FALSE,
  files_committed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index ensuring at-most-one active in-flight delivery per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_git_deliveries_active_project 
ON git_deliveries(project_id) 
WHERE delivery_status IN ('preparing', 'repository_created', 'committed', 'pushing');

-- Index for lookup by revision
CREATE INDEX IF NOT EXISTS idx_git_deliveries_revision 
ON git_deliveries(project_id, implementation_revision_id);
