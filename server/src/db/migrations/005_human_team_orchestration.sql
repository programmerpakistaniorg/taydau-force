-- Migration 005: Live Human-Team Orchestration V1
-- Canonical Workflows, Project Facts Knowledge Base, Client Interactions, Requirement Baselines, Approval Requests, and Design Specs

-- 1. Canonical Project Workflows
CREATE TABLE IF NOT EXISTS project_workflows (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stage                       TEXT NOT NULL DEFAULT 'created',
  stage_status                TEXT NOT NULL DEFAULT 'pending',
  progress                    INTEGER NOT NULL DEFAULT 0,
  next_action_type            TEXT,
  next_action_payload         JSONB NOT NULL DEFAULT '{}',
  required_roles              JSONB NOT NULL DEFAULT '["business_analyst", "project_manager", "ui_ux_designer", "solution_architect", "engineer", "code_reviewer", "qa_engineer"]',
  active_role                 TEXT,
  approved_requirement_baseline_id UUID,
  approved_design_spec_id     UUID,
  retry_count                 INTEGER NOT NULL DEFAULT 0,
  last_error_code             TEXT,
  last_error_summary          TEXT,
  runner_id                   TEXT,
  run_started_at              TIMESTAMPTZ,
  started_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_workflows_lookup ON project_workflows(project_id, stage, stage_status);

-- 2. Project Knowledge Base (Versioned Facts with Provenance & Authority)
CREATE TABLE IF NOT EXISTS project_facts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  fact_key            TEXT NOT NULL,
  category            TEXT NOT NULL,
  value_jsonb         JSONB NOT NULL,
  source_role         TEXT NOT NULL,
  source_type         TEXT NOT NULL DEFAULT 'inferred',
  source_reference    TEXT,
  confirmation_status TEXT NOT NULL DEFAULT 'inferred',
  confidence          NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  version             INTEGER NOT NULL DEFAULT 1,
  is_current          BOOLEAN NOT NULL DEFAULT true,
  supersedes_fact_id  UUID REFERENCES project_facts(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_facts_current ON project_facts(project_id, fact_key) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_project_facts_project ON project_facts(project_id);

-- 3. Structured Client Interactions (Questions & Clarifications)
CREATE TABLE IF NOT EXISTS client_interactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  agent_role          TEXT NOT NULL,
  workflow_stage      TEXT NOT NULL,
  fact_key            TEXT NOT NULL,
  interaction_type    TEXT NOT NULL,
  question            TEXT NOT NULL,
  why_it_matters      TEXT NOT NULL,
  options_jsonb       JSONB NOT NULL DEFAULT '[]',
  recommended_option  TEXT,
  allow_custom        BOOLEAN NOT NULL DEFAULT false,
  impact              TEXT NOT NULL DEFAULT 'medium',
  required            BOOLEAN NOT NULL DEFAULT true,
  status              TEXT NOT NULL DEFAULT 'pending',
  answer_jsonb        JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  answered_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_pending ON client_interactions(project_id, status);

-- 4. Immutable Requirement Baselines
CREATE TABLE IF NOT EXISTS requirement_baselines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version                 INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'pending_approval',
  snapshot_jsonb          JSONB NOT NULL,
  created_by_llm_call_id  UUID,
  created_at              TIMESTAMPTZ DEFAULT now(),
  approved_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_req_baselines_project ON requirement_baselines(project_id, version);

-- 5. Human Approval Requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  artifact_type         TEXT NOT NULL,
  artifact_id           UUID,
  artifact_version      INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'pending',
  feedback              TEXT,
  scope_classification  TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  decided_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_pending ON approval_requests(project_id, status);

-- 6. Versioned UI/UX Design Specifications
CREATE TABLE IF NOT EXISTS design_specs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version                 INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'pending_approval',
  summary                 TEXT NOT NULL,
  design_jsonb            JSONB NOT NULL,
  previous_version_id     UUID REFERENCES design_specs(id),
  revision_reason         TEXT,
  client_feedback         TEXT,
  created_by_llm_call_id  UUID,
  created_at              TIMESTAMPTZ DEFAULT now(),
  approved_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_design_specs_project ON design_specs(project_id, version);

-- 7. Backfill existing projects with truthful workflows
INSERT INTO project_workflows (project_id, stage, stage_status, progress, started_at, updated_at)
SELECT 
  p.id,
  CASE 
    WHEN p.status = 'release_ready' THEN 'completed'
    WHEN p.status = 'tested_passed' THEN 'release_evaluation'
    WHEN p.status = 'verifying' THEN 'independent_qa'
    WHEN p.status = 'implemented' THEN 'independent_qa'
    WHEN p.status = 'designed' THEN 'technical_architecture'
    WHEN p.status = 'planned' THEN 'project_planning'
    WHEN p.status = 'analyzed' THEN 'business_analysis'
    ELSE 'created'
  END,
  CASE 
    WHEN p.status = 'release_ready' THEN 'completed'
    WHEN p.status = 'failed' THEN 'failed'
    ELSE 'pending'
  END,
  CASE 
    WHEN p.status = 'release_ready' THEN 100
    WHEN p.status = 'tested_passed' THEN 93
    WHEN p.status = 'verifying' THEN 85
    WHEN p.status = 'implemented' THEN 78
    WHEN p.status = 'designed' THEN 65
    WHEN p.status = 'planned' THEN 35
    WHEN p.status = 'analyzed' THEN 15
    ELSE 0
  END,
  p.created_at,
  p.updated_at
FROM projects p
ON CONFLICT (project_id) DO NOTHING;

ALTER TABLE qa_test_artifacts ADD COLUMN IF NOT EXISTS test_framework TEXT DEFAULT 'pytest';
