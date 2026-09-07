# TayDau Force Enterprise Production Roadmap (Post-Hackathon)

> [!IMPORTANT]
> **ROADMAP CLASSIFICATION: PLANNED — NOT IMPLEMENTED**
> This document represents the post-hackathon enterprise architectural roadmap for TayDau Force. 
> It defines the future technical specifications for multi-tenancy, distributed durable execution, brownfield maintenance, sandboxing, and cloud provisioning.
> **None of the features in this roadmap describe current MVP runtime capabilities.** Current runtime capabilities remain strictly defined in [`AGENTS.md`](../../AGENTS.md), [`README.md`](../../README.md), and [`docs/governance/TAYDAU_WORKFORCE_CONSTITUTION_V2.md`](../governance/TAYDAU_WORKFORCE_CONSTITUTION_V2.md).

---

## Executive Architectural Summary

TayDau Force currently operates as a proven, relational-database-persisted, real-time vertical slice with client-side SSE streaming, local Docker Compose sandboxing, deterministic verification gates, and dynamic zero-cost multi-provider routing.

This roadmap charts the disciplined evolution from a **single-service, 0-to-1 greenfield autonomous delivery engine** into an **enterprise-grade, multi-tenant software organization SaaS platform**.

```
                           ENTERPRISE EVOLUTION PROGRESSION (E0 - E9)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E0: Production Threat Model, Trust Boundaries & Architecture Decision Records (ADRs)   │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E1: Identity, Organizations, Workspaces, Capability-Based RBAC & Connection-Safe RLS   │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E2: Multi-Worker PostgreSQL Durable State Machine (At-Least-Once & Deduplicated Outbox)│
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E3: Brownfield Repository Ingestion, Base Commit Pinning & Workspace Worktrees         │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E4: AST Code Intelligence & Semantic Symbol Indexing (Tree-sitter TS & Python)         │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E5: Governed Change Requests (CRs), Selective Lifecycle Reopening & Patch Engine       │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E6: Execution Driver Abstraction (Typed Commands, Nonce Scoping, Resource Limits)      │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E7: Higher-Isolation Linux Sandbox Backends (gVisor / Kata / Cloud MicroVMs)           │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E8: Governed Infrastructure-as-Code (IaC), Template Synthesis & Human Deployment Gates │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ E9: Advanced Human-in-the-Loop Collaboration (Structured Steer & Visual Canvas Notes)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## E0 — Production Threat Model & Architecture Decision Records (ADRs)
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Define zero-trust boundaries before adding enterprise database schemas or distributed workers.

### Core Architectural Contracts
1. **Identity & Tenant Isolation Threat Model**:
   - Cross-tenant data leakage threat vectors (API ID manipulation, direct object references).
   - Connection-pool leakage: PostgreSQL RLS parameters (`SET LOCAL`) must reset automatically at transaction boundaries.
2. **Untrusted Code Execution Threat Model**:
   - Arbitrary AI code execution, container escapes, resource exhaustion (fork bombs), unauthorized egress network traffic.
3. **Cloud Credentials Custody**:
   - AI models never possess raw cloud credentials, production API keys, or infrastructure mutation privileges.
4. **Authoritative State Model**:
   - Explicit state hierarchy resolving business lifecycle truth (`project_workflows`), execution instances (`workflow_runs`), and evidence logs (`workflow_step_runs`).

---

## E1 — Identity, Organizations, Workspaces & Capability-Based RBAC
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Provide multi-tenant data isolation, workspace boundaries, capability-based permissions, and leak-proof PostgreSQL Row-Level Security (RLS).

### Key Invariants & Safeguards
- **Unambiguous Tenant Ownership Path**: Every tenant-owned object must reference an authoritative tenant boundary. No object (e.g. `qa_suite`, `defect`, `security_finding`, `llm_call`) can be resolved by ID alone without tenant validation.
- **Complete Tenant Table Audit**:
  - `organizations`, `workspaces`, `users`, `workspace_members`, `api_keys`
  - All project artifacts: `projects`, `requirements`, `requirement_baselines`, `client_interactions`, `design_specs`, `design_artifacts`, `architecture_specs`, `tasks`, `code_artifacts`, `implementation_revisions`, `code_reviews`, `qa_suites`, `qa_test_artifacts`, `verification_runs`, `defects`, `security_findings`, `release_readiness`, `live_previews`, `git_deliveries`, `llm_calls`, `model_routing_decisions`, `project_events`.
- **Connection-Pool Safe PostgreSQL RLS**:
  ```sql
  -- Scoped strictly to transaction lifetime; zero leakage across pooled connections
  BEGIN;
  SET LOCAL app.current_org_id = 'org_uuid';
  SET LOCAL app.current_workspace_id = 'workspace_uuid';
  -- Query execution with WITH CHECK policies on INSERT/UPDATE
  COMMIT;
  ```
- **Capability-Based Permissions (Decoupled from Role Names)**:
  - Permissions matrix: `requirements.approve`, `design.approve`, `architecture.override`, `routing.configure`, `provider_keys.manage`, `budget.view`, `deployment.execute`, `security_exception.approve`, `git_delivery.push`.
- **API Key Security**: Hashed secrets (Argon2/SHA256), visible prefix (`tdf_live_...`), scopes, expiration, last used tracking, and revocation.

---

## E2 — Multi-Worker PostgreSQL Durable State Machine
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Transition single-service PostgreSQL-persisted orchestration into an at-least-once, multi-worker distributed durable execution engine without adding Redis/BullMQ infrastructure overhead.

### Key Invariants & Safeguards
- **Zero Redis Dependency**: Leverage PostgreSQL native advisory locks, transactional outbox pattern, and leased heartbeat records.
- **At-Least-Once Delivery with Idempotency**:
  - Step handler execution keys: `workflowRunId + stepId + attemptId + idempotencyKey`.
  - Artifact deduplication: Deterministic content hashing (`sha256`) prevents duplicate baseline or revision rows upon retried specialist runs.
- **Artifact Ref Storage (No Giant JSON Blobs)**:
  - Replace raw `input_snapshot`/`output_snapshot` text blobs with `inputArtifactRefs`, `outputArtifactRefs`, and `contentHashes`.
- **Zero-Lease Human Gates**:
  - When waiting for client approval, workflows transition to `WAITING_FOR_HUMAN`. No worker holds a lease or heartbeat during multi-day pauses.

---

## E3 — Brownfield Repository Ingestion & Worktree Isolation
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Enable TayDau Force to ingest, inspect, and safely branch existing client repositories.

### Key Invariants & Safeguards
- **Ingestion Pipeline**:
  `Git Remote / Tarball Upload` $\rightarrow$ `Security Scanner (Secret & Malware Audit)` $\rightarrow$ `Base Commit Pinning (baseCommitSha)` $\rightarrow$ `Fingerprint Generator` $\rightarrow$ `Isolated Git Worktree`.
- **Base Commit Immutability**: All downstream change requests, AST indexes, and patch hunks bind strictly to `baseCommitSha` to prevent race conditions against upstream branch updates.

---

## E4 — AST Code Intelligence & Semantic Indexing
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Construct in-memory symbol graphs to pass precise semantic context to specialists instead of overflowing token budgets with full repository dumps.

### Key Invariants & Safeguards
- **Target Language Focus**: Strictly **TypeScript/JavaScript** and **Python** (matching the core stack; zero premature expansion to Go/Rust/C#).
- **Tree-sitter Symbol Extraction**:
  - Functions, class definitions, exported interfaces, type signatures, and import/export graphs.
- **Headless Type Contract Pre-Validation**:
  - Background `tsc --noEmit` and `mypy` execution validating type contracts deterministically before passing patches to Dr. Evelyn (Code Review) or Quinn (QA).

---

## E5 — Governed Change Requests (CRs) & Selective Lifecycle Reopening
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Enable iterative maintenance and refactoring on existing codebases while preserving workforce governance.

### Key Invariants & Safeguards
- **Selective Lifecycle Reopening**:
  ```
  Client Change Request (CR)
             ↓
  Aria Impact Analysis
             ↓
  Requirements impact? ──► [YES] ──► New Requirements Baseline Revision
             │
            [NO]
             ▼
  Architecture impact? ──► [YES] ──► Arthur Architecture Delta
             │
            [NO]
             ▼
  Design impact?       ──► [YES] ──► Sofia UI Delta
             │
            [NO]
             ▼
  Devon Patch Generation (Unified Diff)
             ▼
  Isolated git apply --check in Worktree
             ▼
  Headless Type & Compiler Verification
             ▼
  Dr. Evelyn Code Review
             ▼
  Quinn Targeted Regression Tests
  ```
- **Patch Application Rules**: Patches generated as standard unified diffs, tested against base commits in isolated worktrees, never bypassing type or QA verification gates.

---

## E6 — Execution Driver Abstraction
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Decouple sandboxed execution logic from specific container runtimes using a strictly typed interface.

### Key Invariants & Safeguards
- **No Raw Shell Strings**: Replace `executeCommand(sessionId, cmd)` with structured execution contracts:
  ```typescript
  interface CommandExecutionSpec {
    executable: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
    env: Record<string, string>;
  }
  ```
- **Lifecycle Contract**: `provision`, `materializeFiles`, `executeCommand`, `startService`, `healthCheck`, `networkPolicy`, `portExposure`, `resourceLimits`, `collectArtifacts`, `teardownEnvironment`, `reconcileOrphans`.

---

## E7 — Higher-Isolation Linux Sandbox Backends
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Provide hardened multi-tenant compute isolation for running untrusted AI-generated code in production Linux environments.

### Implementation Progression
1. **Tier 1 (Current)**: Hardened local Docker Compose with read-only rootfs and resource limits.
2. **Tier 2 (SaaS Beta)**: Managed remote execution driver (e.g. E2B / Daytona).
3. **Tier 3 (Enterprise Self-Hosted)**: gVisor / Kata Containers kernel isolation under Linux/KVM.
4. **Tier 4 (Cloud Multi-Tenant)**: Firecracker MicroVMs with jailer and TAP device network isolation (evaluated only when threat model and dedicated Linux bare-metal compute justify operational cost).

---

## E8 — Governed Infrastructure-as-Code (IaC) & Cloud Provisioning
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Provide safe, predictable, zero-cloud-leakage cloud deployments.

### Key Invariants & Safeguards
- **Approved Template Synthesis (No Free-Form Hallucinated HCL)**:
  - Pre-approved, hardened Terraform/OpenTofu modules with strictly typed parameters (e.g. `compute: 'ecs_fargate'`, `db: 'rds_postgres'`).
- **7-Stage IaC Governance Pipeline**:
  `Template Synthesis` $\rightarrow$ `terraform fmt -check` $\rightarrow$ `terraform validate` $\rightarrow$ `Security Scanner (Checkov/Tfsec)` $\rightarrow$ `Cost Estimator (Infracost)` $\rightarrow$ `terraform plan` $\rightarrow$ **MANDATORY HUMAN APPROVAL** $\rightarrow$ `Isolated Execution Driver (terraform apply)`.
- **Zero Raw Cloud Credentials for AI**: AI models never receive cloud API keys or IAM write access.

---

## E9 — Advanced Human-in-the-Loop Collaboration
*Status: PLANNED — NOT IMPLEMENTED*

### Objectives
Enable intuitive client feedback and technical lead steering without breaking workforce governance contracts.

### Key Invariants & Safeguards
- **Governed Visual Canvas Annotations**:
  - Client clicks DOM elements in live previews $\rightarrow$ Generates structured `DesignFeedbackEvent` $\rightarrow$ Fed as governed input into Sofia's next design revision (never mutates code directly).
- **Structured Steering Requests (No Raw Mid-Stream Prompt Overrides)**:
  - Technical leads submit a `SteeringRequest` classifying target stage (Requirements, Architecture, Implementation) $\rightarrow$ Orchestrator safely reopens the designated specialist stage with full traceability.

---

## Architectural Comparison Matrix

| Dimension | Current MVP Vertical Slice | Enterprise Production Target | Roadmap Phase |
| :--- | :--- | :--- | :---: |
| **Tenancy & Isolation** | Single-tenant local DB | PostgreSQL RLS, Org/Workspace tenancy, Capability RBAC | **E1** |
| **Workflow Engine** | PostgreSQL-persisted single service | Multi-worker at-least-once durable state machine | **E2** |
| **Code Evolution** | 0-to-1 greenfield software generation | Brownfield repository ingestion, AST graphs & patch engine | **E3 - E5** |
| **Execution Sandboxing** | Local Docker Compose | Typed execution driver abstraction & gVisor/MicroVMs | **E6 - E7** |
| **Cloud Provisioning** | Local Git commit & Docker manifests | Template-synthesized IaC with plan/cost human gates | **E8** |
| **Human Collaboration** | Stage approval buttons & feedback text | Canvas visual annotations & structured steering requests | **E9** |

---

## Immediate Hackathon Priority vs. Post-Hackathon Roadmap

```text
================================================================================
CURRENT ACTIVE PRIORITY: HACKATHON READINESS (FROZEN ARCHITECTURE)
================================================================================
1. [COMPLETED] Workforce Constitution v2 (TAYDAU_WORKFORCE_CONSTITUTION_V2.md)
2. [COMPLETED] Aria Analyst Specification v2 (ARIA_ANALYST_SPECIFICATION_V2.md)
3. [COMPLETED] Automotive Contamination Forensics & UI Fallback Purge
4. [COMPLETED] Requirements Integrity Validator (2D Provenance & Context Firewall)
5. [COMPLETED] Automated Governance Test Suite (31/31 assertions passed)
6. [NEXT] Core-agent quality & Golden Dental Demo end-to-end verification
7. [NEXT] Zero-cost multi-provider runtime stability & judging pitch evidence

================================================================================
POST-HACKATHON HORIZON: ENTERPRISE SAAS ROADMAP (E0 - E9)
================================================================================
Begin E0 (Threat Model & ADRs) followed sequentially by E1 through E9.
```
