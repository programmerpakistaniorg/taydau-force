# TAYDAU FORCE — WORK-ITEM TRACE DIRECTORY

**Purpose:** This directory contains individual lifecycle trace records for every non-trivial engineering task (feature, bug, refactor, hardening).

---

## 1. Naming Convention

- Features: `FEATURE-<SHORT_DESCRIPTION>.md` (e.g. `FEATURE-LOCAL-SEMANTIC-FALLBACK.md`)
- Bugs: `BUG-<SHORT_DESCRIPTION>.md` (e.g. `BUG-ARIA-CANARY-CONTAMINATION.md`)
- Hardening: `HARDENING-<SHORT_DESCRIPTION>.md` (e.g. `HARDENING-LOOPBACK-SECURITY.md`)
- Refactors: `REFACTOR-<SHORT_DESCRIPTION>.md` (e.g. `REFACTOR-PROVIDER-REGISTRY.md`)

---

## 2. Standard Work-Item Template

Every work-item document must include:

```markdown
# [WORK ITEM ID]: [Title]

- **Type:** FEATURE / BUG / REFACTOR / HARDENING
- **Status:** DRAFT / IN_PROGRESS / VERIFIED / MERGED
- **Date Created:** YYYY-MM-DD
- **Author / Model:** Human Lead / Antigravity Assistant (`NOT EXPOSED`)
- **Related ADR / Requirement:** [Link to doc]
- **Target Git Branch:** live-mvp
- **Resulting Commit:** [Commit SHA]
- **Resulting Tag:** [Tag Name]

## 1. Problem / Goal
[Detailed explanation of why this change exists]

## 2. Current vs Expected Behavior
- **Current:** [Before change]
- **Expected:** [After change]

## 3. Affected Components & Call Flow
[List affected files, functions, and runtime flow IDs]

## 4. Implementation Plan of Record
[Step-by-step implementation changes]

## 5. Execution History & Attempts Made
- **What Succeeded:** [Items that worked cleanly]
- **What Failed / Blocked:** [Errors encountered and root causes]
- **Adjustments Made:** [How failures were resolved]

## 6. Verification Evidence
| Test Suite | Command | Result | Exit Code | Evidence Type |
| :--- | :--- | :--- | :--- | :--- |

## 7. Rollback Strategy
[Exact commands to revert if regressions are detected]

## 8. Residual Risks & Future Notes
[Any caveats, performance trade-offs, or follow-up work]
```
