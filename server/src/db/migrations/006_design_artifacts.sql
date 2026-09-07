-- Migration 006: Design Artifacts and Provider Integration
CREATE TABLE IF NOT EXISTS design_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_spec_id UUID REFERENCES design_specs(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_project_id VARCHAR(255),
  provider_screen_id VARCHAR(255),
  screen_key VARCHAR(100) NOT NULL,
  artifact_type VARCHAR(50) NOT NULL,
  provider_url TEXT,
  content TEXT,
  content_sha256 VARCHAR(64) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_artifacts_spec ON design_artifacts(design_spec_id);
CREATE INDEX IF NOT EXISTS idx_design_artifacts_provider ON design_artifacts(provider, provider_screen_id);
