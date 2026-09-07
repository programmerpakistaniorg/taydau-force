# Phase 5 Architecture Truth: Secure Live Running Application Preview

**Branch**: `live-mvp`  
**Milestone Tag**: `phase5-secure-live-application-preview`  
**Baseline Commits**:
- Phase 0: `dc3044a` (`phase0-architecture-truth-baseline`)
- Phase 1: `23c7728` (`phase1-governed-autonomous-rework`)
- Phase 2: `6554a3e` (`phase2-true-full-stack-generation`)
- Phase 3: `2f525d9` (`phase3-multi-service-docker-verification`)
- Phase 4: `c58b385` (`phase4-real-time-event-streaming`)

---

## 1. Executive Summary & Purpose

Phase 5 delivers **Secure Live Running Application Preview**, allowing users, developers, and QA auditors to interact directly with genuinely running, containerized full-stack applications in real time within the TayDau Force workbench while enforcing strict isolation boundaries.

Generated application code is treated as **untrusted software**. It executes inside project-scoped Docker networks on dedicated ephemeral loopback browser origins, completely isolated from TayDau Force's trusted origin, browser storage, cookies, and internal database.

---

## 2. Security Threat Model & Invariants

```text
                     TAYDAU TRUSTED UI
                 (http://localhost:5173)
                            │
                            │ Embeds sandboxed <iframe>
                            ▼
               ┌────────────────────────┐
               │ Isolated Preview Origin│ (http://127.0.0.1:<ephemeral-port>)
               │   + Capability Path    │ (/p/<opaque-capability>/)
               └────────────┬───────────┘
                            │
                            ▼
                 Trusted Preview Proxy
                (Strips Cookies/Auth)
                            │
            ┌───────────────┴───────────────┐
            │  Run Network: taydau_preview  │
            │                               │
            ▼               ▼               ▼
     Frontend Service Backend Service  PostgreSQL Service
       (Vite:3000)     (FastAPI:8000)     (16-alpine:5432)
```

### Core Security Invariants:
1. **Distinct Browser Origin Per Run**:
   $$\text{Origin}(\text{TayDau UI}) \neq \text{Origin}(\text{Preview A}) \neq \text{Origin}(\text{Preview B})$$
   Each preview stack binds an atomically assigned ephemeral port on `127.0.0.1:<port>`. The browser isolates `localStorage`, `sessionStorage`, `IndexedDB`, and service workers across origins.
2. **Cookie & Header Boundary**:
   The trusted preview proxy strips `Cookie`, `Authorization`, and `Proxy-Authorization` headers before forwarding requests to the generated app. It strips `Set-Cookie` response headers returned by the generated app.
3. **No Database Credential Sharing**:
   The preview proxy container does NOT receive TayDau PostgreSQL credentials, LLM keys, or host secrets. It validates capability hashes locally against its injected configuration.
4. **Project/Run-Scoped Isolated Networks**:
   Every preview run creates a private bridge network (`taydau_preview_<runId>`). Cross-preview network communication is blocked.
5. **Phase 3 Container Hardening Parity**:
   All preview containers enforce `--cap-drop=ALL`, `--security-opt no-new-privileges:true`, read-only root filesystems, PID limits (100), memory limits (512MB), CPU limits (1.0 core), and `/var/run/docker.sock` is absent.
6. **Iframe Sandboxing**:
   `sandbox="allow-scripts allow-forms allow-same-origin"`. Omitted: `allow-top-navigation`, `allow-popups-to-escape-sandbox`, `allow-modals`.
7. **Trust & Verification Separation**:
   Preview status (`ready` / `starting`) is completely decoupled from verification status (`unverified` / `verification_running` / `verified`) and release evaluation. A running preview does not imply release readiness.

---

## 3. Database Schema & Migration `011`

The `live_previews` table tracks multi-service container lifecycle state:

```sql
CREATE TABLE IF NOT EXISTS live_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  implementation_revision_id UUID NOT NULL REFERENCES implementation_revisions(id) ON DELETE RESTRICT,
  revision_version INT NOT NULL,
  manifest_sha VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'starting'
    CHECK (status IN ('starting', 'ready', 'stopping', 'stopped', 'expired', 'failed')),
  cleanup_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (cleanup_status IN ('pending', 'in_progress', 'complete', 'failed')),
  capability_hash VARCHAR(64) UNIQUE NOT NULL,
  ephemeral_port INT NOT NULL DEFAULT 0,
  docker_network VARCHAR(128) NOT NULL,
  service_topology JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code VARCHAR(64),
  sanitized_error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ready_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guarantees DB-level at-most-one active preview per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_previews_active_project 
ON live_previews(project_id) 
WHERE status IN ('starting', 'ready', 'stopping');
```

---

## 4. Capability Path & Routing Contract

- **Capability Format**: `cap_<hex32>`, hashed with SHA-256 for DB persistence.
- **Route Mapping**:
  - `http://127.0.0.1:<port>/p/<capability>/api/*` $\rightarrow$ upstream `http://backend:8000/api/*`
  - `http://127.0.0.1:<port>/p/<capability>/*` $\rightarrow$ upstream `http://frontend:3000/*` (with SPA fallback)
- **Non-Destructive Overlays**:
  Canonical implementation revision files and `manifest_sha` are never modified. Build and runtime overlays (`VITE_BASE_PATH=/p/<cap>/`, `API_BASE_URL=/p/<cap>/api`) are injected at container startup.

---

## 5. Real-Time Preview Events

- `preview.starting`: Container initialization begun.
- `preview.ready`: Stack healthy; proxy listening on ephemeral port.
- `preview.updated`: New revision available while preview is open.
- `preview.stopping`: Teardown initiated.
- `preview.stopped`: Containers removed and network destroyed.
- `preview.expired`: 15-minute idle inactivity reaper terminated the stack.
- `preview.failed`: Container boot or health check failed.

---

## 6. Lifecycle & Governance

- **15-Minute Idle TTL**: `LivePreviewManager.reapIdlePreviews()` runs periodically, terminating inactive stacks.
- **2-Hour Absolute Lifetime**: Prevents long-lived resource leaks.
- **Crash / Orphan Recovery**: `LivePreviewManager.reconcileOrphans()` inspects `taydau.resource=preview` containers on server boot and reconciles database state.
