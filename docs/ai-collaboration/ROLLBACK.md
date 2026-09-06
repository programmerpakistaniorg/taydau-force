# TAYDAU FORCE — ROLLBACK & RECOVERY PROCEDURES

**Status:** ACTIVE RECOVERY PROTOCOL  
**Primary Principle:** Every change must have a known rollback path BEFORE implementation begins.

---

## 1. Safe Git Baseline Anchors

| Milestone / Work Item | Safe Git Commit | Safe Git Tag | State Description |
| :--- | :--- | :--- | :--- |
| **Local Semantic Fallback** | `bfeac63` | `taydau-local-semantic-fallback` | Verified 3-tier routing with local llama.cpp fallback |
| **Experiential Live Integration** | `24a8109` | `taydau-experiential-free-inference` | Dynamic catalog discovery with free-only routing |
| **Workforce Governance W1/W2** | `fca6913` | `phase7-dynamic-model-routing-closure` | Aria integrity validator & context firewall active |
| **Phase 7 Dynamic Routing** | `1dfbf3a` | `phase7-dynamic-model-routing-final` | Full multi-provider dynamic routing architecture |

---

## 2. Standard Rollback Procedures

### 2.1 Uncommitted Working Tree Rollback
If uncommitted modifications break the build or fail tests:
```powershell
# Discard working tree changes across all files
git restore .

# Clean untracked scratch files (careful: inspect with -n first)
git clean -fd
```

### 2.2 Reverting a Committed Work Item
If a committed work item introduces regressions after passing initial tests:
```powershell
# Create a safe revert commit (preserves history without rewriting)
git revert <commit-hash> -m 1

# Re-run full test checklist to confirm clean baseline
npm --prefix server run build
npm run build
npx tsx server/scripts/test_w1_w2_governance.ts
```

### 2.3 Hard Reset to Known Milestone (Local Only)
> [!CAUTION]
> Only perform with explicit human confirmation and never on dirty working trees with unsaved work.
```powershell
# Reset branch to known good baseline tag
git reset --hard taydau-local-semantic-fallback
```

---

## 3. Database Migration Reversibility

| Migration Script | Direction | Destruction Risk | Reversal Procedure |
| :--- | :--- | :--- | :--- |
| `001_initial_schema.sql` | Forward-only | LOW (Additive) | Drop tables in reverse dependency order |
| `010_durable_project_events.sql` | Forward-only | LOW (Additive) | `DROP TABLE project_events CASCADE;` |

**Database Invariant:** Schema migrations must remain backwards-compatible. Never execute destructive `DROP COLUMN` or type conversions without a preceding data preservation backup.
