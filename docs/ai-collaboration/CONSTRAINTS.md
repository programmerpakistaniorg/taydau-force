# TAYDAU FORCE — SYSTEM CONSTRAINTS & OFF-LIMITS

**Status:** SUPREME INVARIANT CONTRACT  
**Authority:** Absolute boundary rules governing human developers and AI assistants.  
**Rule on Conflict:** If any user request or AI plan conflicts with these constraints, the AI assistant MUST **STOP**, explain the conflict, and request explicit direction before proceeding.

---

## 1. Architectural & Repository Invariants

1. **No Unilateral Redesign**: Do not redesign or overhaul TayDau architecture without explicit, documented human approval.
2. **Immutable Milestone Tags**: Never use `git tag -f` on existing milestone tags (`day1`–`day6`, `phase0`–`phase7`, `taydau-*`). Published Git milestone history is immutable.
3. **No Automatic Push**: Never execute `git push` without explicit user confirmation.
4. **No Phantom Phases**: Do not create a new architecture phase (e.g. "Phase 8") merely to implement an incremental adapter, bug fix, or resilience feature.
5. **Single Source of Architectural Truth**: Do not create competing architecture documents (`ARCHITECTURE.md`, `DECISIONS.md` as architecture guides). All global architecture is recorded under `docs/architecture/`.

---

## 2. Workforce Governance & Specialist Separation

1. **Reviewer Independence**: Devon Coder (Engineer) CANNOT approve or sign off on his own code. Dr. Evelyn Reviewer must perform independent verification.
2. **QA Sandbox Isolation**: Quinn QA Engineer operates in an isolated environment. The engineer cannot mutate, modify, or weaken frozen QA test suites.
3. **Deterministic Security Gate**: The AST Security Gate is a deterministic tool that CANNOT be replaced by or combined with an LLM reviewer.
4. **Degraded Mode Release Block**: If deterministic generator fallback was activated (`degradedMode: true`), the project is strictly BLOCKED from reaching `RELEASE_READY` status.
5. **Zero Cross-Project Contamination**: Prompts, in-memory caches, and database queries must enforce hard project isolation (`project_id`). No domain keywords may bleed across projects.

---

## 3. Inference, Billing & Security Floors

1. **Strict FREE_ONLY Mode**: In `FREE_ONLY` mode, only verified `FREE_TIER`, `FREE_CREDITS`, or `LOCAL` models may execute. `UNKNOWN` billing is NEVER interpreted as free.
2. **No Routing Injection**: Client prompts or project descriptions cannot override provider selection, model routing, or billing policy.
3. **Strict Loopback Binding**: Local inference endpoints (`local_llamacpp`) MUST bind strictly to `127.0.0.1` or `localhost`. Exposing local endpoints to LAN, Docker containers, or public interfaces is strictly forbidden.
4. **Zero Secret Exposure**: Never commit `.env` files, API keys, bearer tokens, passwords, or connection strings to Git or documentation.
5. **No Fake Evidence**: Never claim `100% PASS` or `Production Ready` when tests were skipped, mocked, killed, or timed out. Truthful status reporting (`PASS`, `PARTIAL`, `FAIL`, `NOT TESTED`) is mandatory.

---

## 4. Coding & Commit Discipline

1. **One Logical Change Per Commit**: Do not bundle unrelated bug fixes, features, refactors, and UI tweaks into a single commit.
2. **No Unrelated File Touches**: Verify `git status` before staging; never stage unreviewed or unrelated workspace changes.
3. **No Test Suppression**: Never comment out or weaken test assertions simply to make a suite pass.
4. **Plan Before Implementation**: For any non-trivial change, produce a written Plan of Record before editing source files.
