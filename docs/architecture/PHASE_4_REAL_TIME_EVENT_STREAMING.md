# Phase 4 Architecture Truth: Durable Real-Time Project Event Streaming

## 1. Overview & Core Mission
Phase 4 elevates TayDau Force from client-side polling to a high-durability, ordered, typed **Server-Sent Events (SSE)** architecture. The system streams structured delivery organization activities, workflow stage transitions, specialist agent progress, defect lifecycles, and multi-service sandbox verification events directly to connected clients in real time while guaranteeing AI safety, deterministic replay, and zero host secret leakage.

---

## 2. Architectural Principles

### 2.1 REST vs. SSE Division of Responsibility
- **REST (Authoritative Transport)**: All mutations, project creations, stage advancements, approval decisions, client interactions, answers, retries, and lifecycle actions remain strictly authoritative via HTTP REST endpoints.
- **SSE (Real-Time Propagation Transport)**: Delivers instant reactive telemetry, state transitions, progress updates, and activity logs. If an SSE connection drops, the frontend automatically falls back to gentle 5-second polling until reconnection.

### 2.2 Strict AI Safety & Information Boundary
- **No Chain-of-Thought (CoT) Leakage**: Private reasoning traces, raw provider internal thought blocks, and unvalidated system tokens are strictly stripped and never streamed over SSE or persisted in `project_events`.
- **Sanitized Event Payloads**: Only structured, business-meaningful data (role, actor, stage, summary, sanitized progress counters, test outcomes) is broadcast.
- **Zero Host Secrets**: No API keys, credentials, or environment paths are exposed in stream payloads.

---

## 3. Data Model & Database Migration 010

PostgreSQL migration `010_durable_project_events.sql` creates the `project_events` table:

```sql
CREATE TABLE IF NOT EXISTS project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence BIGSERIAL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  stage TEXT,
  actor_role TEXT,
  actor_name TEXT,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  causation_id TEXT,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project_sequence ON project_events(project_id, sequence);
CREATE INDEX IF NOT EXISTS idx_project_events_project_created ON project_events(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_project_events_type ON project_events(event_type);
```

---

## 4. Canonical Event Catalog

| Event Type | Producer | Description |
| :--- | :--- | :--- |
| `project.created` | Project Route | Emitted when a new software delivery project is submitted. |
| `workflow.stage.started` | WorkflowService | Specialist began active autonomous execution on a stage. |
| `workflow.stage.completed` | WorkflowService | Specialist successfully completed execution; transitioning to next stage. |
| `workflow.stage.waiting_for_client` | WorkflowService | Workflow paused waiting for client interaction or approval. |
| `workflow.needs_attention` | WorkflowService | Rework bound exceeded or system exception requiring attention. |
| `agent.activity` | Activity Logger | Granular specialist agent action logged to timeline. |
| `interaction.required` | Orchestrator | BA / PM / Architect generated questions requiring human input. |
| `approval.required` | Orchestrator | Requirements baseline or wireframe preview ready for client review. |
| `design.generated` | UI/UX Agent | Sofia Designer synthesized wireframe layout or interactive preview. |
| `implementation.revision.created` | Engineer Agent | Devon Coder produced/updated full-stack workspace source code. |
| `review.started` / `review.completed` | Reviewer Agent | Dr. Evelyn completed architectural & security review. |
| `qa.started` / `qa.completed` | QA Agent | Quinn Tester executed isolated acceptance test suite. |
| `defect.opened` / `rework.started` / `defect.resolved` | Defect Service | Defect lifecycle progression during autonomous rework loop. |
| `verification.started` / `verification.completed` | Multi-Service Sandbox | Docker sandbox execution with real backend, DB, and frontend. |
| `release.ready` | Release Evaluator | All 7 delivery quality gates passed; delivery package ready. |

---

## 5. SSE Server Implementation & Replay (`GET /api/projects/:id/events`)

- **Protocol Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- **Replay Mechanism**:
  - Accepts `Last-Event-ID` header or `?lastEventId=<seq>` query param.
  - Queries `SELECT ... FROM project_events WHERE project_id = $1 AND sequence > $2 ORDER BY sequence ASC`.
  - Replays all missed events seamlessly upon reconnect.
- **Heartbeat Management**:
  - Broadcasts `:heartbeat\n\n` comments every 15 seconds to prevent idle reverse proxy or NAT timeouts.
- **Connection Lifecycle**:
  - Subscribes `res` to in-memory `Set<Response>`.
  - Automatically cleans up closed client sockets on `res.on('close')`.

---

## 6. Frontend Client Integration (`LiveProjectContext`)

- **EventSource Connection**: Subscribes to `/api/projects/${activeProjectId}/events`.
- **Immediate State Synchronization**: On receiving state-modifying events (`workflow.*`, `approval.*`, `defect.*`, `verification.*`), triggers silent snapshot refresh via `fetchProject()`.
- **Graceful Reconnect & Fallback**:
  - On network drop or error, transitions `connectionStatus` to `'fallback_polling'` (5s interval).
  - Automatically reconnects with `Last-Event-ID` cursor.
  - On `onopen`, disables fallback polling immediately.

---

## 7. Verification Evidence

- **Database Migrations 001 $\rightarrow$ 010**: Applied cleanly and verified on fresh instances.
- **Monotonic Sequence Enforcement**: Verified across concurrent event emissions.
- **Last-Event-ID Replay**: Validated with simulated client disconnection and stream chunk recovery.
- **No CoT / Secret Leakage**: 100% verified across all emitted payloads.
