# Phase 7 Architecture Truth: Evidence-Governed Dynamic Model Routing & Cost Optimization

**Branch**: `live-mvp`  
**Milestone Tag**: `phase7-dynamic-model-routing-final`  
**Baseline Commits & Tags**:
- Phase 0: `dc3044a` (`phase0-architecture-truth-baseline`)
- Phase 1: `23c7728` (`phase1-governed-autonomous-rework`)
- Phase 2: `6554a3e` (`phase2-true-full-stack-generation`)
- Phase 3: `2f525d9` (`phase3-multi-service-docker-verification`)
- Phase 4: `c58b385` (`phase4-real-time-event-streaming`)
- Phase 5: `8af40a5` (`phase5-secure-live-application-preview`)
- Phase 6: `b15f4fe` (`phase6-git-native-delivery`)
- Phase 7: `32e7ed6` (`phase7-dynamic-model-routing`)
- Phase 7A: `91f148c` (`phase7-dynamic-model-routing-closure`)

---

## 1. Executive Summary & Core Principle

Phase 7 replaces static model bindings with an **Evidence-Governed Dynamic Model Router** that chooses the cheapest eligible model meeting required capability floors.

Core Invariant:
- **QUALITY FLOOR FIRST. COST OPTIMIZATION SECOND.**
- A model is never silently downgraded below the required capability floor.
- Unknown pricing is never treated as $0.
- Fallback to local deterministic generator is explicitly marked `degraded_mode = true`, and strictly blocks release readiness via Release Evaluator Check 9.

---

## 2. Authoritative Model Capability Registry Truth Table

*Note: Reasoning and Code Tiers are **TAYDAU INTERNAL ROUTING POLICY CLASSIFICATIONS (v1.0.0)**, not vendor benchmark claims.*

| Provider | Model Identifier | Availability | Provider Context Limit | TayDau Policy Routing Cap | Input Price / 1M | Output Price / 1M | Pricing Provenance | Policy Reasoning Tier | Policy Code Tier | Structured Output Mode | Allowed Task Classes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| **Tabi AI** | `qwen-max` | **ACTIVE** | 32,768 | 32,768 | $1.60 | $6.40 | `ACCOUNT_CONFIGURED_PRICE` | Tier 4 (Elite) | Tier 4 (Elite) | JSON Prompt Schema | ALL |
| **Tabi AI** | `qwen-plus` | **ACTIVE** | 131,072 | 32,768 | $0.40 | $1.20 | `ACCOUNT_CONFIGURED_PRICE` | Tier 3 (High) | Tier 3 (High) | JSON Prompt Schema | ALL |
| **Tabi AI** | `qwen-turbo` | **ACTIVE** | 131,072 | 16,384 | $0.10 | $0.20 | `ACCOUNT_CONFIGURED_PRICE` | Tier 2 (Fast) | Tier 2 (Fast) | JSON Prompt Schema | Requirements, Planning, Design, Summarization |
| **Groq** | `qwen/qwen3.8-27b` | **ACTIVE** | 32,768 | 32,768 | $0.80 | $4.00 | `ACCOUNT_CONFIGURED_PRICE` | Tier 3 (High) | Tier 3 (High) | `json_object` Mode | ALL |
| **Groq** | `llama-3.3-70b-versatile` | **ACTIVE** | 131,072 | 32,768 | $0.59 | $0.79 | `PUBLIC_PROVIDER_PRICE` | Tier 3 (High) | Tier 3 (High) | `json_object` Mode | ALL |
| **Groq** | `llama-3.1-8b-instant` | **ACTIVE** | 131,072 | 8,192 | $0.05 | $0.08 | `PUBLIC_PROVIDER_PRICE` | Tier 2 (Fast) | Tier 2 (Fast) | `json_object` Mode | Requirements, Planning, Design, Summarization |
| **Groq** | `deepseek-r1-distill-llama-70b` | **DISABLED** | 131,072 | 32,768 | — | — | `UNKNOWN` (Deprecated Oct 2025) | Tier 4 (Elite) | Tier 4 (Elite) | Disabled | None |
| **Local** | `deterministic-generator` | **FALLBACK** | 100,000 | 100,000 | $0.00 | $0.00 | `ADAPTER_CONFIGURED_PRICE` | Tier 1 (Deterministic) | Tier 1 (Deterministic) | Programmatic Types | Fallback Only (`degraded_mode = true`) |

### Inventory Summary:
- **Total Registry Entries**: 8
- **Active Semantic LLM Models**: 6 (3 Tabi AI + 3 Groq)
- **Deprecated / Disabled Models**: 1 (`deepseek-r1-distill-llama-70b`)
- **Deterministic Degraded Fallback**: 1 (`deterministic-generator`)

---

## 3. Specialist Role Ownership & Independence

| Specialist Agent | Assigned Name | Primary Responsibilities |
| :--- | :--- | :--- |
| **Business Analyst** | `Sofia` | Client brief parsing, requirements synthesis, interactive Q&A |
| **Project Manager** | `Marcus` | Task decomposition, delivery plan, timeline milestones |
| **UI/UX Designer** | `Aria` | Component design specs, color tokens, layout hierarchy |
| **Solution Architect** | `Zara` | System architecture, ER diagrams, endpoint contracts, schema models |
| **Software Engineer** | `Devon` | Full-stack generation, backend Express, frontend React |
| **Code Reviewer** | `Evelyn` | Independent code quality audit, security analysis (0 generation authority) |
| **QA Engineer** | `Quinn` | Frozen test suite authoring, automated execution, defect verification |

---

## 4. Minimum Quality Floor Policies

| Task Type | Min Reasoning Tier | Min Code Tier | Min Structured Tier | Release Critical |
| :--- | :---: | :---: | :---: | :---: |
| `architecture_design` | **3** | 2 | 3 | **YES** |
| `fullstack_code_generation` | **3** | **3** | 3 | **YES** |
| `defect_rework` | **3** | **3** | 3 | **YES** |
| `code_review` | **3** | 2 | 3 | **YES** |
| `qa_test_generation` | **3** | **3** | 3 | **YES** |
| `requirements_synthesis` | 2 | 1 | 2 | NO |
| `project_planning` | 2 | 1 | 2 | NO |
| `ui_ux_design` | 2 | 1 | 2 | NO |
| `summarization_or_formatting` | 1 | 1 | 1 | NO |

---

## 5. Matched Static vs Dynamic Benchmark & Economic Evidence

*Workload: 7 representative multi-agent tasks across 4 verified requirements in a matched controlled benchmark run.*

| Metric | Static Baseline (Qwen Max) | Dynamic Routing (Policy v1.0.0) | Variance / Savings |
| :--- | :--- | :--- | :--- |
| **Total Project LLM Cost** | **$0.0896** | **$0.0149** | **83.4% reduction in this controlled matched benchmark** |
| **Cost per Verified Requirement** | **$0.0224** | **$0.0037** | **83.5% reduction** |
| **Deterministic Quality Gates** | 100% PASS | 100% PASS | Zero regressions |
| **Degraded Calls in Live Delivery** | 0 | 0 | Zero unverified fallbacks |
| **Release Readiness Gate** | Release Ready | Release Ready | Release Evaluator 100% satisfied (9/9 checks) |

---

## 6. Database Table Reconciliation

- **Phase 6 Domain Tables**: 30 tables
- **Migration 013 Created**: `model_routing_decisions`
- **Total Domain Application Tables**: **31**
- **Migration Runner System Table**: 1 (`_migrations`)
- **Total Tables in PostgreSQL Database**: **32**
