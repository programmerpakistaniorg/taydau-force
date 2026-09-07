# TAYDAU FORCE — ENGINEERING DECISION LOG (MICRO-ADRs)

**Scope:** Lightweight engineering and tactical decisions that do not alter global architecture (which reside in canonical ADRs under `docs/architecture/`).  
**Rule on AI Model Metadata:** If the AI assistant's underlying model ID/version is not exposed by the IDE/platform, record `NOT EXPOSED` (do NOT invent or guess model names).

---

## Decision Index

| Decision ID | Date | Work Item | Summary | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-2026-09-01** | 2026-09-06 | `FEATURE-LOCAL-SEMANTIC-FALLBACK` | Unified Single Adapter for Local llama.cpp (`local_llamacpp`) | **APPROVED** |
| **DEC-2026-09-02** | 2026-09-06 | `FEATURE-LOCAL-SEMANTIC-FALLBACK` | Non-Degraded Tier 2 Fallback for Qualified Local Models | **APPROVED** |
| **DEC-2026-09-03** | 2026-09-06 | `FEATURE-LOCAL-SEMANTIC-FALLBACK` | Multi-Token Open/Close Brace JSON Extraction Scanner | **APPROVED** |
| **DEC-2026-09-04** | 2026-09-06 | `FEATURE-EXPERIENTIAL-INFERENCE` | Dual Truth Separation: Discovery vs Commercial Catalog | **APPROVED** |

---

## Detailed Records

### DEC-2026-09-01: Unified Single Adapter for Local llama.cpp
- **Date:** 2026-09-06
- **Work Item:** `FEATURE-LOCAL-SEMANTIC-FALLBACK`
- **Decision:** Implement a single provider adapter `LocalLlamaCppAdapter` (`providerId: 'local_llamacpp'`) with distinct port routing rather than creating separate `QwenProvider` and `GLMProvider`.
- **Reason:** Both local models are served by the same runtime engine binary (`llama-server.exe`) via OpenAI-compatible endpoints (`/v1/chat/completions`). Splitting by model name would violate provider abstraction boundaries.
- **Alternatives Considered:**
  1. *Separate adapter classes (`QwenAdapter`, `GLMAdapter`)*: Rejected due to 95% redundant process management and HTTP handling code.
  2. *Direct llama.cpp C++ bindings (node-addon-api)*: Rejected due to build complexity and instability across native OS environments compared to standalone binary subprocesses.
- **Tradeoff Accepted:** Dynamic port allocation is pre-assigned (`8081` for Qwen, `8082` for GLM) rather than discovered dynamically at runtime.
- **Affected Files / Components:** `server/src/gateway/providers/local-llamacpp-adapter.ts`, `server/src/gateway/providers/provider-registry.ts`.
- **Related Requirements / ADRs:** `docs/architecture/PHASE_7_DYNAMIC_MODEL_ROUTING.md`.
- **Model / AI Runtime Identifier:** `NOT EXPOSED` (Antigravity Assistant).
- **Human Approval Status:** **APPROVED** (verified via test suite passing).

---

### DEC-2026-09-02: Non-Degraded Tier 2 Classification for Local Semantic Models
- **Date:** 2026-09-06
- **Work Item:** `FEATURE-LOCAL-SEMANTIC-FALLBACK`
- **Decision:** When cloud providers are unavailable and Dynamic Model Router routes to `local_llamacpp/local/qwen3.5-9b`, set `degradedMode: false` if task capability floor is satisfied (`reasoningTier >= 3`, `codeTier >= 3`).
- **Reason:** A locally installed 9B GGUF model is a genuine semantic model capable of generating valid structured requirements, code, and test cases. Lumping it with deterministic mock generation would incorrectly block release readiness.
- **Alternatives Considered:**
  1. *Mark all fallback as `degradedMode: true`*: Rejected because local execution is an intended offline resilience capability, not a mock failure.
  2. *Treat local model as Tier 1 primary*: Rejected because cloud models offer higher context limits and faster throughput on cloud GPUs.
- **Tradeoff Accepted:** Generation latency is significantly higher on local CPU ($\sim$2.4 tok/s vs cloud $\sim$50+ tok/s).
- **Affected Files / Components:** `server/src/gateway/dynamic-model-router.ts`, `server/src/gateway/routing-registry.ts`.
- **Related Requirements / ADRs:** `docs/architecture/PHASE_7_DYNAMIC_MODEL_ROUTING.md`, `docs/governance/TAYDAU_WORKFORCE_CONSTITUTION_V2.md`.
- **Model / AI Runtime Identifier:** `NOT EXPOSED` (Antigravity Assistant).
- **Human Approval Status:** **APPROVED**.

---

### DEC-2026-09-03: Multi-Token Open/Close Brace JSON Extraction Scanner
- **Date:** 2026-09-06
- **Work Item:** `FEATURE-LOCAL-SEMANTIC-FALLBACK`
- **Decision:** Implement exhaustive open/close brace combinator scanning (`rawText.substring(start, end + 1)`) in `parseAndValidate` and verification scripts instead of simple markdown regex or direct `JSON.parse`.
- **Reason:** Thinking and reasoning models frequently emit preamble traces (e.g. `Thinking Process:\n1. ...`) even when prompted for JSON-only or when `<think>` tags are stripped. Regex matchers fail on nested objects or multiline preambles.
- **Alternatives Considered:**
  1. *Prompt engineering only*: Ineffective on small quantized models that unconditionally output thought tokens.
  2. *Regex `/{[\s\S]*}/`*: Greedy regex captures leading or trailing text that corrupts `JSON.parse`.
- **Tradeoff Accepted:** $O(N^2)$ candidate substring checks across brace pairs during parse recovery (negligible for $<10$KB output strings).
- **Affected Files / Components:** `server/src/gateway/routed-gateway.ts`, `server/scripts/test_live_local_models.ts`.
- **Related Requirements / ADRs:** `docs/governance/ARIA_ANALYST_SPECIFICATION_V2.md`.
- **Model / AI Runtime Identifier:** `NOT EXPOSED` (Antigravity Assistant).
- **Human Approval Status:** **APPROVED**.

---

### DEC-2026-09-04: Dual Truth Separation for Model Catalog vs Callability
- **Date:** 2026-09-06
- **Work Item:** `FEATURE-EXPERIENTIAL-INFERENCE`
- **Decision:** Separate model callability verification (`GET /v1/models`) from commercial catalog and free tier promotion verification (`GET /api/models`).
- **Reason:** An API key may have technical permission to call paid models that would incur billable charges if not cross-referenced with the public promotional free whitelist.
- **Alternatives Considered:**
  1. *Trust `/v1/models` alone*: Rejected because it exposes paid models to potential unintended billing in `FREE_ONLY` mode.
  2. *Hardcode model list*: Rejected because free tier promotions change dynamically over time.
- **Tradeoff Accepted:** Requires two separate authenticated HTTP discovery requests during catalog refresh.
- **Affected Files / Components:** `server/src/gateway/providers/experiential-adapter.ts`.
- **Related Requirements / ADRs:** `docs/architecture/HACKATHON_FREE_ONLY_INFERENCE.md`.
- **Model / AI Runtime Identifier:** `NOT EXPOSED` (Antigravity Assistant).
- **Human Approval Status:** **APPROVED**.
