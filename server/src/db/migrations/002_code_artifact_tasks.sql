-- Migration 002: Add code_artifact_tasks junction table for lossless multi-task code traceability

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS code_artifact_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_artifact_id   UUID REFERENCES code_artifacts(id) ON DELETE CASCADE NOT NULL,
  task_id            UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(code_artifact_id, task_id)
);

-- 2. Indexes for fast bi-directional lookup
CREATE INDEX IF NOT EXISTS idx_code_artifact_tasks_artifact ON code_artifact_tasks(code_artifact_id);
CREATE INDEX IF NOT EXISTS idx_code_artifact_tasks_task ON code_artifact_tasks(task_id);

-- 3. Backfill junction table from existing code_artifacts rows
INSERT INTO code_artifact_tasks (code_artifact_id, task_id)
SELECT id, task_id FROM code_artifacts
WHERE task_id IS NOT NULL
ON CONFLICT (code_artifact_id, task_id) DO NOTHING;
