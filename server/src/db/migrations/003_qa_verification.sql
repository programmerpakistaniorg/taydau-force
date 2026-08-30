-- Migration 003: QA test artifacts, test-to-requirement links, and test-run extensions

-- 1. QA test artifacts table
CREATE TABLE IF NOT EXISTS qa_test_artifacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  file_path     TEXT NOT NULL,
  content       TEXT NOT NULL,
  language      TEXT NOT NULL DEFAULT 'python',
  generated_by  TEXT NOT NULL DEFAULT 'QA Engineer',
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. QA test requirements junction table
CREATE TABLE IF NOT EXISTS qa_test_requirements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_test_artifact_id  UUID REFERENCES qa_test_artifacts(id) ON DELETE CASCADE NOT NULL,
  requirement_id       UUID REFERENCES requirements(id) ON DELETE CASCADE NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(qa_test_artifact_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_qa_test_req_artifact ON qa_test_requirements(qa_test_artifact_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_req_requirement ON qa_test_requirements(requirement_id);

-- 3. Extend test_runs table
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'passed';
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS test_type TEXT NOT NULL DEFAULT 'independent_acceptance';
ALTER TABLE test_runs ALTER COLUMN task_id DROP NOT NULL;
