# TAYDAU FORCE — AI COLLABORATION MANIFEST

**Status:** ACTIVE GOVERNANCE CONTRACT  
**Authority:** Supreme Operating Protocol for AI-Assisted Engineering Collaboration  
**Effective Date:** 2026-09-06  
**Primary Principle:** STOP BLINDLY APPROVING AI CHANGES. MAKE EVERY CHANGE TRACEABLE, EXPLAINABLE, TESTABLE, AND REVERSIBLE.

---

## 1. Collaboration Control Mapping Table

To prevent documentation rot and duplicate sources of truth, this manifest defines the authoritative repository location for every engineering governance control.

| Control | Purpose | Canonical File / Directory | Owner | When Updated | When NOT Updated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manifest** | Maps collaboration controls to canonical authorities | `docs/ai-collaboration/AI_COLLABORATION_MANIFEST.md` | Human Lead & AI | When repository documentation architecture changes | During routine feature implementation |
| **Handover** | Current state, unblocked next actions, active risks, test status | `docs/ai-collaboration/HANDOVER.md` | Human & AI | End of every substantial work session | During mid-task code iteration |
| **Architecture** | System components, module boundaries, data models, contracts | `docs/architecture/` (`PHASE_0`–`PHASE_7`, `TayDau_Force_Detailed_Architecture_and_Design_Guide.md`) | Architect & Human | Major architectural phase additions or boundary changes | Routine bug fixes or micro-optimizations |
| **Governance / Workforce** | Workforce constitution, specialist separation, authority boundaries | `docs/governance/TAYDAU_WORKFORCE_CONSTITUTION_V2.md`, `AGENTS.md` | Governance Lead | When agent roles, authority, or validation rules change | Implementation detail changes inside a single agent |
| **Decisions (Micro/Eng)** | Small engineering choices, tradeoffs, rejected alternatives | `docs/ai-collaboration/DECISIONS.md` | Developer & AI | When choosing between viable implementation alternatives | Trivial variable renames or simple bug fixes |
| **Execution Flow** | Runtime request paths, provider routing, failover sequences | `docs/ai-collaboration/FLOW.md` | System Architect | When runtime execution sequence or fallback topology changes | When execution flow remains unchanged |
| **Constraints / Off-Limits** | Hard project invariants, security floors, forbidden operations | `docs/ai-collaboration/CONSTRAINTS.md` | Human Lead | When new organizational invariants or security floors are mandated | During normal coding within existing boundaries |
| **Work Items / Feature Traces** | Individual feature, bug, refactor, or hardening lifecycle records | `docs/ai-collaboration/work-items/*.md` | Author & Reviewer | Created per non-trivial task; updated during execution | For trivial single-line style or typo fixes |
| **Test Checklist** | Index of concrete verification commands, expectations, exit codes | `docs/ai-collaboration/TEST_CHECKLIST.md` | QA Lead & AI | When new test suites, verification scripts, or benchmarks are added | When test commands remain identical |
| **Rollback & Recovery** | Safe baselines, revert procedures, migration reversibility | `docs/ai-collaboration/ROLLBACK.md` | Ops / Engineering | Before executing medium-to-high risk changes | During non-breaking additive documentation |
| **Human Learning Log** | Educational breakdown, concepts, call paths, mental model | `docs/ai-collaboration/LEARNING_LOG.md` | Human Developer & AI | After completing significant engineering work items | After trivial one-off command runs |
| **Roadmaps** | Long-term enterprise post-hackathon evolutionary trajectory | `docs/roadmaps/TAYDAU_ENTERPRISE_PRODUCTION_ROADMAP.md` | Product / Lead | Post-hackathon milestone planning | During current MVP runtime development |

---

## 2. Epistemic Precedence & Conflict Resolution

1. **Deterministic Precedence**: When a conflict arises between an AI assistant's assertion and a deterministic check (`tsc`, test script exit code, `git diff`), the deterministic result is absolute truth.
2. **Single Source of Truth**: Never create competing `ARCHITECTURE.md` or `DECISIONS.md` when an authoritative ADR or architecture guide exists.
3. **No Fake Certainty**: Never claim "100% verified" or "production ready" without verifiable execution evidence.
