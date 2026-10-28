import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

let sqliteDbInstance: Database.Database | null = null;

export function getSqliteDb(): Database.Database {
  if (sqliteDbInstance) return sqliteDbInstance;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbFile = path.join(dataDir, 'taydau.db');
  console.log(`[Database] Initializing persistent embedded SQLite engine at: ${dbFile}`);

  const db = new Database(dbFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Register PostgreSQL compatible functions
  db.function('gen_random_uuid', () => crypto.randomUUID());
  db.function('now', () => new Date().toISOString());
  db.function('jsonb_set', (target: any, pathStr: string, value: any) => {
    try {
      const obj = typeof target === 'string' ? JSON.parse(target) : (target || {});
      const cleanPath = pathStr.replace(/^{|}$/g, '').split(',');
      let curr = obj;
      for (let i = 0; i < cleanPath.length - 1; i++) {
        const k = cleanPath[i];
        if (!curr[k]) curr[k] = {};
        curr = curr[k];
      }
      const val = typeof value === 'string' ? JSON.parse(value) : value;
      curr[cleanPath[cleanPath.length - 1]] = val;
      return JSON.stringify(obj);
    } catch {
      return typeof target === 'string' ? target : JSON.stringify(target || {});
    }
  });

  // Initialize all application tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      name TEXT NOT NULL,
      client_brief TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      autonomy_mode TEXT NOT NULL DEFAULT 'auto_pilot',
      created_at TEXT DEFAULT (now()),
      updated_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL,
      acceptance_criteria TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (now()),
      provenance TEXT,
      baseline_id TEXT,
      is_locked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      requirement_id TEXT REFERENCES requirements(id),
      requirement_code TEXT,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      dependencies TEXT NOT NULL DEFAULT '[]',
      assigned_role TEXT NOT NULL,
      acceptance_intent TEXT,
      estimated_duration TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS architecture_specs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      tech_stack TEXT NOT NULL,
      file_structure TEXT NOT NULL,
      implementation_spec TEXT NOT NULL,
      decisions TEXT NOT NULL DEFAULT '[]',
      contract TEXT,
      application_type TEXT,
      frontend_framework TEXT,
      backend_framework TEXT,
      database_type TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS code_artifacts (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      sha256 TEXT,
      implementation_revision_id TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS code_artifact_tasks (
      artifact_id TEXT NOT NULL REFERENCES code_artifacts(id) ON DELETE CASCADE,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      PRIMARY KEY (artifact_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS requirement_baselines (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      snapshot_jsonb TEXT NOT NULL DEFAULT '{}',
      created_by_llm_call_id TEXT,
      created_at TEXT DEFAULT (now()),
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS qa_suites (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      suite_sha256 TEXT NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 0,
      is_frozen INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      parent_suite_id TEXT,
      superseded_by_suite_id TEXT,
      repair_reason TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS qa_test_suites (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      suite_sha256 TEXT NOT NULL,
      is_frozen INTEGER NOT NULL DEFAULT 1,
      author_role TEXT NOT NULL DEFAULT 'qa',
      test_count INTEGER NOT NULL DEFAULT 0,
      requirement_coverage TEXT NOT NULL DEFAULT '[]',
      repair_reason TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS qa_test_artifacts (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      suite_id TEXT REFERENCES qa_suites(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'python',
      test_framework TEXT NOT NULL DEFAULT 'pytest',
      test_type TEXT NOT NULL DEFAULT 'unit',
      target_requirement_codes TEXT NOT NULL DEFAULT '[]',
      sha256 TEXT NOT NULL,
      is_frozen INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      exit_code INTEGER NOT NULL,
      stdout TEXT,
      stderr TEXT,
      duration_ms INTEGER,
      tests_passed INTEGER DEFAULT 0,
      tests_failed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (now()),
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      run_type TEXT,
      test_type TEXT,
      status TEXT,
      error_message TEXT,
      test_suite_id TEXT REFERENCES qa_suites(id),
      implementation_revision_id TEXT
    );

    CREATE TABLE IF NOT EXISTS defects (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id),
      requirement_id TEXT REFERENCES requirements(id),
      defect_number INTEGER,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      description TEXT,
      evidence TEXT,
      rework_attempt INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'qa',
      source_artifact_id TEXT,
      failure_signature TEXT,
      resolved_at TEXT,
      resolution_artifact_id TEXT,
      resolution_evidence TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS code_reviews (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      overall_score INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      is_blocking INTEGER NOT NULL DEFAULT 0,
      review_summary TEXT NOT NULL,
      recommendations TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS review_findings (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      review_id TEXT NOT NULL REFERENCES code_reviews(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      suggestion TEXT,
      is_blocking INTEGER NOT NULL DEFAULT 0,
      code_snippet TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS security_findings (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      remediation TEXT,
      is_blocking INTEGER NOT NULL DEFAULT 0,
      line_number INTEGER,
      code_snippet TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS project_workflows (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'created',
      stage_status TEXT NOT NULL DEFAULT 'pending',
      active_role TEXT DEFAULT 'business_analyst',
      active_runner_id TEXT,
      current_rework_attempt INTEGER NOT NULL DEFAULT 0,
      max_rework_attempts INTEGER NOT NULL DEFAULT 3,
      active_defect_code TEXT,
      approved_requirement_baseline_id TEXT,
      approved_design_spec_id TEXT,
      next_action TEXT,
      failure_reason TEXT,
      updated_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS stage_runs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      role TEXT NOT NULL,
      started_at TEXT DEFAULT (now()),
      completed_at TEXT,
      failure_code TEXT,
      failure_message TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS client_interactions (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      role TEXT NOT NULL,
      question TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'free_text',
      options TEXT DEFAULT '[]',
      recommended_option TEXT,
      answer TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      why_it_matters TEXT,
      impact TEXT DEFAULT 'medium',
      required INTEGER DEFAULT 1,
      allow_custom INTEGER DEFAULT 1,
      answered_at TEXT,
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      role TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      feedback TEXT,
      requested_at TEXT DEFAULT (now()),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS workflow_escalations (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      reason TEXT NOT NULL,
      message TEXT NOT NULL,
      escalated_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution_notes TEXT,
      escalated_at TEXT DEFAULT (now()),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS project_facts (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      source_role TEXT NOT NULL,
      source_interaction_id TEXT REFERENCES client_interactions(id),
      created_at TEXT DEFAULT (now()),
      UNIQUE(project_id, fact_key)
    );

    CREATE TABLE IF NOT EXISTS design_specs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ready',
      product_experience_summary TEXT NOT NULL,
      ux_goals TEXT NOT NULL DEFAULT '[]',
      design_system TEXT NOT NULL DEFAULT '{}',
      navigation TEXT NOT NULL DEFAULT '{}',
      user_flows TEXT NOT NULL DEFAULT '[]',
      provenance TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS design_screens (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      design_spec_id TEXT NOT NULL REFERENCES design_specs(id) ON DELETE CASCADE,
      screen_id TEXT NOT NULL,
      title TEXT NOT NULL,
      purpose TEXT NOT NULL,
      route TEXT NOT NULL,
      layout_elements TEXT NOT NULL DEFAULT '[]',
      components TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS design_artifacts (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      design_spec_id TEXT NOT NULL REFERENCES design_specs(id) ON DELETE CASCADE,
      artifact_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS implementation_revisions (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      summary TEXT,
      file_count INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT NOT NULL,
      rework_attempt INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (now()),
      UNIQUE (project_id, version)
    );

    CREATE TABLE IF NOT EXISTS project_manifests (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      application_type TEXT NOT NULL,
      frontend_framework TEXT NOT NULL,
      backend_framework TEXT NOT NULL,
      database_type TEXT NOT NULL,
      manifest_data TEXT NOT NULL DEFAULT '{}',
      validation_status TEXT NOT NULL DEFAULT 'pending',
      validation_errors TEXT NOT NULL DEFAULT '[]',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS verification_runs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      implementation_revision_id TEXT,
      run_id TEXT NOT NULL,
      status TEXT NOT NULL,
      services TEXT NOT NULL DEFAULT '[]',
      resource_policy TEXT NOT NULL DEFAULT '{}',
      frontend_build_result TEXT,
      migration_result TEXT,
      backend_health_result TEXT,
      integration_test_result TEXT,
      security_result TEXT,
      error_code TEXT,
      error_message TEXT,
      logs TEXT NOT NULL DEFAULT '{}',
      cleanup_state TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT DEFAULT (now()),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS release_readiness (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      is_ready INTEGER NOT NULL DEFAULT 0,
      checks TEXT NOT NULL DEFAULT '{}',
      evaluated_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS durable_project_events (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      sequence_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT DEFAULT (now()),
      UNIQUE(project_id, sequence_number)
    );

    CREATE TABLE IF NOT EXISTS live_previews (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      revision_id TEXT REFERENCES implementation_revisions(id),
      port INTEGER NOT NULL,
      preview_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'starting',
      cleanup_status TEXT NOT NULL DEFAULT 'none',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS git_deliveries (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      release_version TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      repository_path TEXT NOT NULL,
      branch TEXT NOT NULL,
      push_status TEXT NOT NULL DEFAULT 'pending',
      release_notes TEXT NOT NULL DEFAULT '',
      manifest_summary TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS release_evaluations (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      is_releasable INTEGER NOT NULL,
      quality_score REAL NOT NULL,
      gate_results TEXT NOT NULL DEFAULT '{}',
      blockers TEXT NOT NULL DEFAULT '[]',
      warnings TEXT NOT NULL DEFAULT '[]',
      evaluated_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS model_routing_decisions (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_profile TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      selected_model TEXT NOT NULL,
      selected_provider TEXT NOT NULL,
      selected_tier INTEGER NOT NULL,
      quality_floor INTEGER NOT NULL,
      estimated_input_tokens INTEGER NOT NULL,
      estimated_output_tokens INTEGER NOT NULL,
      cost_ceiling_usd REAL NOT NULL,
      reason_codes TEXT NOT NULL DEFAULT '[]',
      policy_version TEXT NOT NULL DEFAULT 'v2.0.0',
      created_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS provider_health_snapshots (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      provider TEXT NOT NULL,
      is_healthy INTEGER NOT NULL,
      quota_state TEXT NOT NULL DEFAULT 'HEALTHY',
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS cost_summaries (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      total_cost_usd REAL NOT NULL DEFAULT 0.0,
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      call_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (now())
    );

    CREATE TABLE IF NOT EXISTS llm_calls (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_role TEXT NOT NULL,
      model_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'alibaba',
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      latency_ms INTEGER,
      purpose TEXT,
      task_code TEXT,
      requirement_code TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      workflow_run_id TEXT,
      step_run_id TEXT,
      invocation_id TEXT,
      attempt INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (now())
    );
  `);

  sqliteDbInstance = db;
  return db;
}

export function executeSqliteQuery(text: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const db = getSqliteDb();

  // 1. Transform PostgreSQL placeholders $1, $2, ... to SQLite ?
  let transformedText = text
    .replace(/\$(\d+)/g, '?')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/::jsonb/gi, '')
    .replace(/::text/gi, '')
    .replace(/::uuid/gi, '');

  // 2. Format parameters (e.g. serialize objects/arrays to JSON string for SQLite)
  const sanitizedParams = params.map((p) => {
    if (p === null || p === undefined) return null;
    if (typeof p === 'object') {
      if (p instanceof Date) return p.toISOString();
      return JSON.stringify(p);
    }
    if (typeof p === 'boolean') {
      return p ? 1 : 0;
    }
    return p;
  });

  const trimmed = transformedText.trim();
  const isSelect = /^SELECT\b/i.test(trimmed);
  const hasReturning = /\bRETURNING\b/i.test(trimmed);

  try {
    const stmt = db.prepare(transformedText);
    if (isSelect || hasReturning) {
      const rows = stmt.all(...sanitizedParams);
      return { rows: rows as any[], rowCount: rows.length };
    } else {
      const info = stmt.run(...sanitizedParams);
      return { rows: [], rowCount: info.changes };
    }
  } catch (err: any) {
    // If a transaction statement like BEGIN/COMMIT/ROLLBACK
    if (/^BEGIN\b/i.test(trimmed) || /^COMMIT\b/i.test(trimmed) || /^ROLLBACK\b/i.test(trimmed)) {
      try {
        db.exec(trimmed);
        return { rows: [], rowCount: 0 };
      } catch (txErr: any) {
        // In SQLite, if already in a transaction, BEGIN is harmless
        return { rows: [], rowCount: 0 };
      }
    }
    console.error(`[SqliteAdapter] Query execution error for SQL:\n${transformedText}\nError:`, err.message);
    throw err;
  }
}
