# TAYDAU FORCE — CURRENT SESSION HANDOVER

**Current Branch:** `live-mvp`  
**Safe Baseline Commit:** `bfeac63` (`feat(inference): add qualified local llama.cpp semantic fallback`)  
**Safe Baseline Tag:** `taydau-local-semantic-fallback` (local only, not pushed)  
**Session Updated:** 2026-09-06T21:15:00+05:00  

---

## 1. Current Work Status

### Completed
1. **Workforce Governance (W1/W2)**:
   - Aria Requirements Integrity Validator with hard quality scoring.
   - Context firewall eliminating cross-project canary contamination.
   - Verified 31/31 assertions passing (`npx tsx scripts/test_w1_w2_governance.ts`).
2. **Experiential Labs Dynamic Free-Only Inference**:
   - Dynamic catalog qualification via `GET /api/models` and authenticated `GET /v1/models`.
   - Live streaming/completion verified via `qwen3.8-27b`, `deepseek-v4-flash`, `gpt-5.6-luna`.
   - Strict `FREE_ONLY` enforcement with zero billable leakage.
3. **Local Semantic Fallback (llama.cpp Resilience Tier)**:
   - Dynamic Model Router Tier 2 local semantic fallback (`local_llamacpp/local/qwen3.5-9b`).
   - Loopback `127.0.0.1` binding security with argument array execution.
   - 37/37 contract tests passed (`npx tsx scripts/test_local_llamacpp_integration.ts`).
   - Live CPU-based inference qualified: 128 tok smoke at $\sim$2.4 tok/s, structured Zod JSON schema passed.
   - GLM multimodal inspection completed (`mmproj` absent $\to$ Vision UNQUALIFIED).
4. **AI-Assisted Collaboration & Learning Protocol**:
   - Documentation audit completed; single source of truth established.
   - AI Collaboration Manifest, Constraints, Test Checklist, Rollback, and Learning Log established.

### Partially Complete
- **Database Schema Sync**: Postgres pool warning occurs in standalone test scripts when local PostgreSQL container is offline. Telemetry logging in `routed-gateway.ts` is resilient with `.catch(() => {})`.

### Failed / Rejected Approaches
- **Single-line JSON extraction**: Qwen 3.5 9B Thinking model emits preamble thoughts on CPU before JSON. Direct `JSON.parse(text)` fails; resolved by full open/close brace combinator extraction scanning.
- **GLM Vision Multi-modal Claim**: GLM-4.1V 9B snapshot in cache lacked `mmproj-F16.gguf`; rejected vision claim and marked `visionQualified: false`.

### Remains / Next Session Actions
1. Execute human developer walkthrough of the collaboration framework.
2. Review work-item trace for Local Semantic Fallback (`docs/ai-collaboration/work-items/FEATURE-LOCAL-SEMANTIC-FALLBACK.md`).
3. Prepare client brief UI testing for the upcoming live vertical slice demo.

---

## 2. Invariants & Off-Limits (Must NOT Accidentally Change)

1. **Routing Hierarchy**: Cloud Providers $\to$ Local Semantic Models (`local_llamacpp`) $\to$ Deterministic Generator (`degradedMode: true`).
2. **Reviewer Independence**: Devon cannot approve his own code; Reviewer and Security gates cannot be bypassed.
3. **Tag Discipline**: Never use `git tag -f` or push milestone tags without explicit review.
4. **Billing Invariant**: `FREE_ONLY` billing mode is strictly active; unknown billing is never assumed free.

---

## 3. Verified Test State

| Test Suite | Execution Command | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| **Local llama.cpp Contract Suite** | `npx tsx server/scripts/test_local_llamacpp_integration.ts` | **PASS (37/37)** | `0` |
| **W1/W2 Workforce Governance** | `npx tsx server/scripts/test_w1_w2_governance.ts` | **PASS (31/31)** | `0` |
| **Live Local Model Benchmark** | `npx tsx server/scripts/test_live_local_models.ts` | **PASS** | `0` |
| **Server TypeScript Build** | `npm --prefix server run build` | **PASS (0 errors)** | `0` |
| **Frontend Production Build** | `npm run build` | **PASS (0 errors)** | `0` |

---

## 4. Known Issues & Operational Notes

- **CPU Generation Latency**: On Intel UHD 620 without discrete GPU offload (`-ngl 0`), generation speed is $\sim$2.4–2.6 tokens/sec. Timeout in `LocalLlamaCppAdapter` is configured to 180s–300s.
- **Port Strategy**: Qwen server binds to `127.0.0.1:8081`, GLM server to `127.0.0.1:8082`.
