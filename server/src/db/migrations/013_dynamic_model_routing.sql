-- Migration 013: Evidence-Governed Dynamic Model Routing
-- Persists routing decisions, task profiles, candidate evaluations, cost projections, and degraded mode flags.

CREATE TABLE IF NOT EXISTS model_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_role VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  task_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  routing_policy_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
  candidate_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejected_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_provider VARCHAR(64) NOT NULL,
  selected_model VARCHAR(128) NOT NULL,
  routing_reason VARCHAR(64) NOT NULL,
  routing_mode VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (routing_mode IN ('static', 'shadow', 'active')),
  shadow_selection JSONB,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(10, 6),
  latency_ms INT,
  fallback_count INT NOT NULL DEFAULT 0,
  degraded_mode BOOLEAN NOT NULL DEFAULT FALSE,
  validation_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'passed', 'escalated', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_routing_project_created 
ON model_routing_decisions(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_routing_role_task 
ON model_routing_decisions(agent_role, task_type);
