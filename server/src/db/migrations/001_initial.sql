CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  client_brief  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'submitted',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  type              TEXT NOT NULL,
  priority          TEXT NOT NULL,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  requirement_id    UUID REFERENCES requirements(id),
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'backlog',
  priority          TEXT NOT NULL DEFAULT 'medium',
  dependencies      JSONB NOT NULL DEFAULT '[]',
  assigned_role     TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS architecture_specs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  tech_stack        JSONB NOT NULL,
  file_structure    JSONB NOT NULL,
  implementation_spec TEXT NOT NULL,
  decisions         JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS code_artifacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  file_path     TEXT NOT NULL,
  content       TEXT NOT NULL,
  language      TEXT NOT NULL,
  generated_by  TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  exit_code     INTEGER NOT NULL,
  stdout        TEXT,
  stderr        TEXT,
  duration_ms   INTEGER,
  tests_passed  INTEGER DEFAULT 0,
  tests_failed  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  task_id           UUID REFERENCES tasks(id),
  requirement_id    UUID REFERENCES requirements(id),
  code              TEXT NOT NULL,
  title             TEXT NOT NULL,
  severity          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open',
  description       TEXT,
  evidence          JSONB,
  rework_attempt    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  agent_role    TEXT NOT NULL,
  model_id      TEXT NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'alibaba',
  input_tokens  INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd      NUMERIC(10,6) NOT NULL,
  latency_ms    INTEGER,
  purpose       TEXT,
  task_code     TEXT,
  requirement_code TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  success       BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  actor         TEXT NOT NULL,
  actor_role    TEXT NOT NULL,
  action        TEXT NOT NULL,
  target        TEXT NOT NULL,
  type          TEXT NOT NULL,
  tag           TEXT,
  details       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
