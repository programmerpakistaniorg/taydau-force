# TAYDAU FORCE — CANONICAL TEST CHECKLIST & VERIFICATION COMMANDS

**Status:** ACTIVE VERIFICATION REGISTRY  
**Authority:** Standardized testing index for validating system components, builds, and governance gates.

---

## 1. Quick Verification Matrix

| Component | Target / Gate | Command Line | Evidence Type | Expected Exit |
| :--- | :--- | :--- | :--- | :--- |
| **Server Build** | TypeScript Compilation | `npm --prefix server run build` | `BUILD TEST` | `0` (0 errors) |
| **Frontend Build** | Vite Production Bundle | `npm run build` | `BUILD TEST` | `0` (0 errors) |
| **Workforce Governance** | W1/W2 Isolation & Integrity | `npx tsx server/scripts/test_w1_w2_governance.ts` | `INTEGRATION TEST` | `0` (31/31 assertions) |
| **Local llama.cpp Suite** | Local Fallback Contract | `npx tsx server/scripts/test_local_llamacpp_integration.ts` | `UNIT / INTEGRATION` | `0` (37/37 assertions) |
| **Local Live Benchmark** | Qwen 3.5 9B Live Inference | `npx tsx server/scripts/test_live_local_models.ts` | `LOCAL LIVE TEST` | `0` (Schema PASS) |
| **Experiential Live Suite** | Experiential API Qualification | `npx tsx server/scripts/test_experiential_integration.ts` | `EXTERNAL LIVE TEST` | `0` (100% verified) |
| **Secret Leak Audit** | Zero Secret & Path Check | `npx tsx server/scripts/test_secret_leak_audit.ts` | `STATIC ANALYSIS` | `0` (0 leaks) |

---

## 2. Detailed Verification Specifications

### 2.1 Server TypeScript Build
- **Command:** `npm --prefix server run build` (or `tsc -p server/tsconfig.json`)
- **Working Directory:** Repository root (`d:\TayDau Force`)
- **What It Proves:** Type safety across all server modules, schemas, providers, and routers.
- **Verification Rule:** Must produce 0 TypeScript diagnostic errors.

### 2.2 Frontend Vite Build
- **Command:** `npm run build`
- **Working Directory:** Repository root (`d:\TayDau Force`)
- **What It Proves:** React component bundling, Tailwind CSS compilation, and asset integrity.
- **Verification Rule:** Must generate `dist/index.html` and assets without bundling failures.

### 2.3 Workforce Governance Suite (W1 + W2)
- **Command:** `npx tsx server/scripts/test_w1_w2_governance.ts`
- **What It Proves:**
  1. Context Firewall: Sequential, reversed, and concurrent execution has 0 cross-domain canary contamination.
  2. Aria Requirements Integrity Validator: Blocks vague requirements and scores criteria against the 5-Pillar model.
  3. Dynamic Multi-Provider Failover: Automatically fails over across providers under rate limits.
  4. 100% Lineage: Requirements tie back to source project ID.

### 2.4 Local llama.cpp Contract Suite
- **Command:** `npx tsx server/scripts/test_local_llamacpp_integration.ts`
- **What It Proves:**
  1. Registry metadata integrity (`LOCAL_TRUSTED`, `LOCAL`, `LOCAL_COMPUTE`, `0.00` USD).
  2. Loopback `127.0.0.1` binding security and path sanitization.
  3. Quality floor matching across all 7 specialist workforce roles.
  4. Dynamic Router 3-tier failover chain (Cloud $\to$ Local $\to$ Deterministic).

### 2.5 Local Live Model Benchmark
- **Command:** `npx tsx server/scripts/test_live_local_models.ts`
- **What It Proves:**
  1. `llama-server.exe` spawns cleanly via subprocess argument array.
  2. Live smoke completion latency and tokens/sec throughput on CPU.
  3. Live structured JSON completion adheres to Zod `BARequirementsSchema`.
  4. GLM multimodal projection verification (`mmproj` presence).

---

## 3. Evidence Reporting Guidelines

When reporting test results, classify each run honestly:
- `NOT RUN`: Test was not executed in this session.
- `MOCKED TEST`: Executed with simulated responses only.
- `LOCAL LIVE TEST`: Executed against local hardware subprocess (e.g. `llama-server.exe`).
- `EXTERNAL LIVE TEST`: Executed against live cloud API endpoints (e.g. Groq, Experiential).
- `BUILD TEST`: Static TypeScript compiler or bundler verification.
- `STATIC ANALYSIS`: AST scanner or regex security audit.

**Never report "100% PASS" if any required suite was skipped, killed, or returned non-zero.**
