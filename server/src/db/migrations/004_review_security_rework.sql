-- Migration 004: Code Reviews, Security Findings, QA Suite Hashing & Defect Rework Provenance

-- 1. Extend qa_test_artifacts and code_artifacts with SHA-256 hashes
ALTER TABLE qa_test_artifacts ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE qa_test_artifacts ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT true;
ALTER TABLE code_artifacts ADD COLUMN IF NOT EXISTS sha256 TEXT;

-- 2. QA Suites Table for deterministic suite-level integrity tracking
CREATE TABLE IF NOT EXISTS qa_suites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  suite_sha256 TEXT NOT NULL,
  file_count   INTEGER NOT NULL,
  is_frozen    BOOLEAN NOT NULL DEFAULT true,
  version      INTEGER NOT NULL DEFAULT 1,
  frozen_at    TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_suites_project ON qa_suites(project_id);

-- 3. Code Reviews Table
CREATE TABLE IF NOT EXISTS code_reviews (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  summary                   TEXT NOT NULL,
  findings                  JSONB NOT NULL DEFAULT '[]',
  architecture_compliance   JSONB NOT NULL,
  maintainability_assessment TEXT,
  model_id                  TEXT NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_reviews_project ON code_reviews(project_id);

-- 4. Security Findings Table
CREATE TABLE IF NOT EXISTS security_findings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  source      TEXT NOT NULL,
  severity    TEXT NOT NULL,
  rule        TEXT NOT NULL,
  file_path   TEXT,
  evidence    TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_findings_project ON security_findings(project_id);

-- 5. Extend defects table with rework and fault injection attribution
ALTER TABLE defects ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS fault_origin TEXT;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS is_controlled_fault BOOLEAN DEFAULT false;

-- 6. Release Readiness Evaluation Table
CREATE TABLE IF NOT EXISTS release_readiness (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  is_ready      BOOLEAN NOT NULL,
  checks        JSONB NOT NULL,
  evaluated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_readiness_project ON release_readiness(project_id);
