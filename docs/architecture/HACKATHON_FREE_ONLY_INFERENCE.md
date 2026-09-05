# TayDau Force Architecture: Hackathon Free-Only Multi-Provider Inference Resilience

**Branch**: `live-mvp`  
**Milestone Tag**: `taydau-hackathon-free-only-inference`  
**Prior Frozen Architecture Baseline**: `63cd879` (`taydau-hackathon-architecture-final`)

---

## 1. Executive Summary & Why Free-Only Mode Exists

During hackathon deployments and student prototyping, external API credit exhaustion can interrupt multi-agent software delivery pipelines. 

The **Hackathon Free-Only Multi-Provider Inference Resilience Upgrade** extends the Phase 7 Dynamic Model Router with a strict server-side policy:

```
INFERENCE_BILLING_MODE=FREE_ONLY
```

When enabled, TayDau Force routes **ONLY** through official free developer tiers and verified free credit allocations across trusted platforms (**Google AI Studio, Groq Cloud, OpenRouter `:free` pools, NVIDIA NIM, Mistral AI**).

### Core Invariants:
1. **Zero Out-of-Pocket Inference Spend**: Expected billable inference cost under verified free-tier configuration is strictly **$0.00**.
2. **Quality Floor First**: A model is never chosen simply because it is free if it violates the specialist task's minimum reasoning or code tier.
3. **No Unverified / Untrusted Proxies**: Legacy or unverified proxy providers (e.g. historical Tabi) are permanently unroutable (`trustLevel: 'DISABLED'`).
4. **429 Rate-Limit Failover**: When a free provider returns HTTP 429, the router immediately parses `Retry-After` headers, sets a cooldown, and fails over to an alternate verified free provider.
5. **Degraded Release Gating**: If all semantic free routes are exhausted, the system falls back to `deterministic-generator` with `degraded_mode = true`, which strictly blocks Release Readiness via Release Evaluator Check 9.
6. **Discovery vs. Authority**: Catalog repositories such as `awesome-free-llm-apis` are used **strictly as reference/discovery sources**. TayDau relies exclusively on official live provider API validation for routing eligibility.

---

## 2. Provider Trust & Billing Classification Models

```
                                ROUTING ELIGIBILITY PIPELINE
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TaskProfile Floor      ──► Min Reasoning Tier & Code Tier                           │
│ 2. Trust Policy           ──► FIRST_PARTY & VERIFIED_INFERENCE_PLATFORM (No Experimental)│
│ 3. Billing Mode Check     ──► FREE_TIER & FREE_CREDITS Only (PAID/UNKNOWN Rejected)    │
│ 4. Data Policy Check      ──► PUBLIC_OR_SYNTHETIC_ONLY for Hackathon Workloads         │
│ 5. Quota & Health Check   ──► AVAILABLE (Not Cooldown / Rate-Limited / Auth-Failed)    │
│ 6. Quality-First Scoring  ──► Capability Tier + Structured Output + Verifier Diversity │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Trust Classification (`ProviderTrust`):
- `FIRST_PARTY`: Google AI Studio, Mistral AI, Local Generator.
- `VERIFIED_INFERENCE_PLATFORM`: Groq Cloud, NVIDIA NIM, OpenRouter.
- `EXPERIMENTAL`: Unverified community mirrors (ineligible for critical release tasks).
- `DISABLED`: Historical unverified proxy endpoints (permanently excluded).

### Billing Classification (`BillingClassification`):
- `FREE_TIER`: Official free developer quotas (e.g., Groq free tier, Google AI Studio 15 RPM).
- `FREE_CREDITS`: Developer platform starter credits (e.g., NVIDIA NIM free credits).
- `PAID`: Billable pay-as-you-go routes (strictly ineligible in `FREE_ONLY` mode).
- `UNKNOWN`: Unverified pricing status (penalized/rejected in `FREE_ONLY` mode).

---

## 3. Authoritative Verified Model Registry Truth Table

*Note: Capability, Code, and Reasoning Tiers are **TAYDAU INTERNAL ROUTING POLICY CLASSIFICATIONS (v2.0.0)**.*

| Provider | Model Identifier | Availability | Trust Level | Billing Class | Provider Context | Policy Routing Cap | Expected Billable / 1M | Reference Economic Value / 1M (In/Out) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Groq Cloud** | `openai/gpt-oss-120b` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 131,072 | 32,768 | **$0.00** | $0.60 / $1.20 |
| **Groq Cloud** | `openai/gpt-oss-20b` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 131,072 | 16,384 | **$0.00** | $0.15 / $0.30 |
| **Groq Cloud** | `qwen/qwen3.8-27b` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 131,042 | 32,768 | **$0.00** | $0.80 / $4.00 |
| **Groq Cloud** | `llama-3.3-70b-versatile` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 131,072 | 32,768 | **$0.00** | $0.59 / $0.79 |
| **Groq Cloud** | `llama-3.1-8b-instant` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 131,072 | 8,192 | **$0.00** | $0.05 / $0.08 |
| **Google AI Studio** | `gemini-2.0-flash` | **ACTIVE** | `FIRST_PARTY` | `FREE_TIER` | 1,048,576 | 65,536 | **$0.00** | $0.10 / $0.40 |
| **Google AI Studio** | `gemini-1.5-flash` | **ACTIVE** | `FIRST_PARTY` | `FREE_TIER` | 1,048,576 | 32,768 | **$0.00** | $0.075 / $0.30 |
| **NVIDIA NIM** | `meta/llama-3.3-70b-instruct`| **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_CREDITS` | 131,072 | 32,768 | **$0.00** | $0.59 / $0.79 |
| **Mistral AI** | `codestral-latest` | **ACTIVE** | `FIRST_PARTY` | `FREE_TIER` | 32,768 | 32,768 | **$0.00** | $0.30 / $0.90 |
| **OpenRouter** | `qwen/qwen-2.5-coder-32b-instruct:free` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 32,768 | 32,768 | **$0.00** | $0.20 / $0.40 |
| **OpenRouter** | `z-ai/glm-5.3-flash:free` | **ACTIVE** | `VERIFIED_INFERENCE_PLATFORM` | `FREE_TIER` | 1,310,720 | 32,768 | **$0.00** | $0.075 / $0.25 |
| **Tabi AI** | `qwen-max` / `plus` / `turbo` | **DISABLED**| `DISABLED` | `PAID` | — | — | — | Unroutable |
| **Local** | `deterministic-generator` | **FALLBACK** | `FIRST_PARTY` | `FREE_TIER` | 100,000 | 100,000 | **$0.00** | $0.00 / $0.00 |

---

## 4. Quota State & Error Taxonomy

The router maintains dedicated runtime quota states per provider/model:
- `AVAILABLE`: Healthy and eligible for routing.
- `RATE_LIMITED`: Received HTTP 429. Cooldown set dynamically via `Retry-After` header (or 30–60s bounded backoff).
- `DAILY_QUOTA_EXHAUSTED`: Received quota exhaustion notification. Cooldown set for 12 hours.
- `AUTH_FAILED`: Received HTTP 401/403. Route disabled without entering retry loop.
- `BILLING_REQUIRED`: Received HTTP 402. Route immediately marked ineligible in `FREE_ONLY` mode.
- `PROVIDER_UNAVAILABLE`: Received HTTP 5xx. Triggers transient circuit breaker.

---

## 5. Cost Governor & Telemetry Model

In `FREE_ONLY` mode, the Cost Governor records two separate metrics:
1. `costUsd` / `expectedBillableCostUsd`: Strictly **$0.00** for verified free-tier models.
2. `referenceInferenceCostUsd`: Economic baseline calculated against commercial list prices to quantify free-tier savings.

### Golden Demo Telemetry Evidence:
- **Workload**: 7 specialist invocations for Dental Clinic Management Platform.
- **Observed Hackathon Spend**: **$0.00**
- **Expected Billable Cost**: **$0.00**
- **Reference Economic Value**: **$0.0180**
- **Quality Gates**: 100% PASS (Schema Validation, Code Review Independence, Frozen QA, Security Gate, Live Preview, Release Readiness, Git Delivery).
