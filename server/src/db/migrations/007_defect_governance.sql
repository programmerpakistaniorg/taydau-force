-- Migration 007: Governed Autonomous Defect Rework Engine
-- Implementation Revisions, Race-Safe Defect Governance, Traceability, and QA Lineage

-- 1. Implementation Revisions (Canonical Version Grouping)
CREATE TABLE IF NOT EXISTS implementation_revisions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version                 INTEGER NOT NULL,
  summary                 TEXT,
  file_count              INTEGER NOT NULL DEFAULT 0,
  total_bytes             INTEGER NOT NULL DEFAULT 0,
  sha256                  TEXT NOT NULL,
  rework_attempt          INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS idx_impl_revisions_project ON implementation_revisions(project_id, version);

-- 2. Link Code Artifacts to Implementation Revisions
ALTER TABLE code_artifacts ADD COLUMN IF NOT EXISTS implementation_revision_id UUID REFERENCES implementation_revisions(id) ON DELETE CASCADE;

-- 3. Enhance Defects Table for Governed Rework
ALTER TABLE defects ADD COLUMN IF NOT EXISTS defect_number INTEGER;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'qa';
ALTER TABLE defects ADD COLUMN IF NOT EXISTS source_artifact_id UUID;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS failure_signature TEXT;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS resolution_artifact_id UUID;
ALTER TABLE defects ADD COLUMN IF NOT EXISTS resolution_evidence JSONB;

-- Backfill defect_number for existing rows if any
DO $$
DECLARE
  r RECORD;
  n INTEGER;
BEGIN
  FOR r IN SELECT DISTINCT project_id FROM defects WHERE defect_number IS NULL LOOP
    n := 1;
    FOR r IN SELECT id FROM defects WHERE project_id = r.project_id AND defect_number IS NULL ORDER BY created_at LOOP
      UPDATE defects SET defect_number = n WHERE id = r.id;
      n := n + 1;
    END LOOP;
  END LOOP;
END $$;

-- Uniqueness constraint on (project_id, defect_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_defects_project_number'
  ) THEN
    ALTER TABLE defects ADD CONSTRAINT uq_defects_project_number UNIQUE (project_id, defect_number);
  END IF;
END $$;

-- Partial unique index for idempotent deduplication of unresolved defects
CREATE UNIQUE INDEX IF NOT EXISTS idx_defects_unresolved_signature
ON defects (project_id, failure_signature)
WHERE status NOT IN ('resolved', 'rejected_invalid');

CREATE INDEX IF NOT EXISTS idx_defects_project_status ON defects(project_id, status);

-- 4. Implementation Revision <-> Defects Many-to-Many Join Table
CREATE TABLE IF NOT EXISTS implementation_revision_defects (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  implementation_revision_id  UUID REFERENCES implementation_revisions(id) ON DELETE CASCADE NOT NULL,
  defect_id                   UUID REFERENCES defects(id) ON DELETE CASCADE NOT NULL,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (implementation_revision_id, defect_id)
);

CREATE INDEX IF NOT EXISTS idx_impl_rev_defects_lookup ON implementation_revision_defects(implementation_revision_id, defect_id);

-- 5. Defect <-> Requirement Traceability Join Table
CREATE TABLE IF NOT EXISTS defect_requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id         UUID REFERENCES defects(id) ON DELETE CASCADE NOT NULL,
  requirement_id    UUID REFERENCES requirements(id) ON DELETE CASCADE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (defect_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_defect_reqs_lookup ON defect_requirements(defect_id, requirement_id);

-- 6. Enhance QA Suites with Lineage & Repair Reason
ALTER TABLE qa_suites ADD COLUMN IF NOT EXISTS parent_suite_id UUID REFERENCES qa_suites(id);
ALTER TABLE qa_suites ADD COLUMN IF NOT EXISTS repair_reason TEXT;
ALTER TABLE qa_suites ADD COLUMN IF NOT EXISTS superseded_by_suite_id UUID REFERENCES qa_suites(id);
