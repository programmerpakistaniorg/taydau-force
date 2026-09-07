# Phase 6 Architecture Truth: Git-Native Verified Software Delivery

**Branch**: `live-mvp`  
**Milestone Tag**: `phase6-git-native-delivery`  
**Baseline Commits**:
- Phase 0: `dc3044a` (`phase0-architecture-truth-baseline`)
- Phase 1: `23c7728` (`phase1-governed-autonomous-rework`)
- Phase 2: `6554a3e` (`phase2-true-full-stack-generation`)
- Phase 3: `2f525d9` (`phase3-multi-service-docker-verification`)
- Phase 4: `c58b385` (`phase4-real-time-event-streaming`)
- Phase 5: `8af40a5` (`phase5-secure-live-application-preview`)

---

## 1. Executive Summary & Purpose

Phase 6 elevates **Git to a first-class delivery artifact** within TayDau Force.

When an autonomous software delivery project completes verification and achieves release readiness, TayDau materializes the **exact persisted implementation revision** into an isolated, standalone Git repository whose commit history reflects autonomous software delivery and whose final delivery commit is cryptographically bound to the verified TayDau revision.

Generated client repositories are created completely outside and isolated from the TayDau Force platform source code and repository.

---

## 2. Core Delivery Lineage & Integrity

```text
Approved Requirements Baseline
             │
             ▼
    Architecture Contract
             │
             ▼
    Design Specifications (if fullstack)
             │
             ▼
   Implementation Revision (Code Artifacts in DB)
             │
             ▼
   Code Review & Security Gate
             │
             ▼
    Frozen QA Sandbox Verification
             │
             ▼
      Release Evaluator Gate (release_ready)
             │
             ▼
   Git Delivery Service (Materialize exact DB revision)
             │
   ┌─────────┴─────────┐
   ▼                   ▼
.taydau/ Provenance   Git Commit & Tree SHA
   │                   │
   └─────────┬─────────┘
             ▼
  git_deliveries DB Record (Durable provenance binding)
             │
             ▼
  Local / Bare / Remote Git Push
```

---

## 3. Trust Boundary & Command Safety

1. **Host-Side Privileged Operation**:
   - `GitDeliveryService` executes Git operations on the host within `artifacts/deliveries/<projectId>_<deliveryId>/repo`.
   - Generated application containers and LLM agents **never** receive Git credentials, SSH private keys, GitHub tokens, or execution rights to run delivery Git commands.
2. **Safe Argument-Array Spawning**:
   - Commands execute exclusively through `execFile('git', args, { cwd })`, eliminating all shell injection and argument concatenation vulnerabilities.
3. **Repository-Local Identity**:
   - Local identity configured per delivery repo:
     - `user.name = "TayDau Force"`
     - `user.email = "delivery@taydau.local"`
   - Never modifies the host developer's global `~/.gitconfig`.
4. **Malicious Path Rejection**:
   - Every file path is validated before materialization:
     - Absolute paths rejected.
     - `../` directory traversals rejected.
     - `.git/` internal modifications rejected.
     - `.gitmodules` submodules and symlink escapes rejected.

---

## 4. Secret Scanning & `.env` Policy

- **No Secrets in Repositories**:
  - Pre-commit secret scanning checks every file for live `DATABASE_URL`, API keys (`sk-ant-...`, `sk-...`), GitHub tokens, and private keys.
- **Environment Policy**:
  - Generates `.env.example` with clean parameter names and blank/placeholder values.
  - Rejects real `.env` files.

---

## 5. Line Ending Consistency (`.gitattributes`) & `.gitignore`

- On Windows development hosts, TayDau generates `.gitattributes`:
  ```gitattributes
  * text=auto eol=lf
  *.py text eol=lf
  *.ts text eol=lf
  *.tsx text eol=lf
  *.js text eol=lf
  *.json text eol=lf
  *.md text eol=lf
  *.sql text eol=lf
  *.png binary
  *.jpg binary
  ```
- Generates stack-appropriate `.gitignore` ignoring `.env`, `node_modules/`, `dist/`, `__pycache__/`, `.pytest_cache/`, and temporary build files.

---

## 6. Non-Circular Delivery Provenance

To prevent impossible circular self-hashing (where a committed file tries to contain the commit SHA of the commit that contains it):
1. TayDau generates `.taydau/delivery-manifest.json` containing:
   - `projectId`, `revisionVersion`, `manifestSha`, `applicationType`, `verificationStatus`, `releaseStatus`, and timestamp.
2. TayDau generates `.taydau/VERIFICATION.md` containing the human-readable quality summary.
3. Git creates the commit `C` and tree `T`.
4. The database table `git_deliveries` stores `git_commit_sha`, `git_tree_sha`, and `manifest_sha`, establishing an external, immutable cryptographic binding.

---

## 7. Database Migration `012_git_native_delivery.sql`

```sql
CREATE TABLE IF NOT EXISTS git_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  implementation_revision_id UUID NOT NULL REFERENCES implementation_revisions(id) ON DELETE RESTRICT,
  revision_version INT NOT NULL,
  manifest_sha VARCHAR(64) NOT NULL,
  verification_run_id UUID REFERENCES verification_runs(id) ON DELETE SET NULL,
  qa_suite_sha VARCHAR(64),
  release_decision_id UUID REFERENCES release_readiness(id) ON DELETE SET NULL,
  repository_path VARCHAR(500) NOT NULL,
  git_commit_sha VARCHAR(64),
  git_tree_sha VARCHAR(64),
  branch_name VARCHAR(100) NOT NULL DEFAULT 'main',
  remote_url_sanitized VARCHAR(500),
  push_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (push_status IN ('pending', 'in_progress', 'pushed', 'skipped', 'failed')),
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'preparing'
    CHECK (delivery_status IN ('preparing', 'repository_created', 'committed', 'verified', 'pushing', 'delivered', 'failed')),
  error_code VARCHAR(64),
  sanitized_error_message TEXT,
  provenance_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_scan_passed BOOLEAN NOT NULL DEFAULT FALSE,
  files_committed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_git_deliveries_active_project 
ON git_deliveries(project_id) 
WHERE delivery_status IN ('preparing', 'repository_created', 'committed', 'pushing');
```

---

## 8. Real-Time Delivery Events

- `delivery.git.preparing`: Revision materialization initiated.
- `delivery.git.repository_created`: Git repository initialized on branch.
- `delivery.git.commit_created`: Revision committed with tree SHA.
- `delivery.git.push_started`: Remote push initiated.
- `delivery.git.push_completed`: Pushed to remote successfully.
- `delivery.ready`: Delivery package verified and ready.
- `delivery.git.failed`: Materialization, scanning, or push error.
