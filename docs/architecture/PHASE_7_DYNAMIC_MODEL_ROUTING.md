# Phase 7 Architecture Truth: Evidence-Governed Dynamic Model Routing & Cost Optimization

**Branch**: `live-mvp`  
**Milestone Tag**: `phase7-dynamic-model-routing-closure`  
**Baseline Commits**:
- Phase 0: `dc3044a` (`phase0-architecture-truth-baseline`)
- Phase 1: `23c7728` (`phase1-governed-autonomous-rework`)
- Phase 2: `6554a3e` (`phase2-true-full-stack-generation`)
- Phase 3: `2f525d9` (`phase3-multi-service-docker-verification`)
- Phase 4: `c58b385` (`phase4-real-time-event-streaming`)
- Phase 5: `8af40a5` (`phase5-secure-live-application-preview`)
- Phase 6: `b15f4fe` (`phase6-git-native-delivery`)
- Phase 7: `32e7ed6` (`phase7-dynamic-model-routing`)

---

## 1. Executive Summary & Core Principle

Phase 7 replaces TayDau Force's static model binding and failover behavior with an **Evidence-Governed Dynamic Model Router**.

The routing engine evaluates the lowest-cost sufficiently capable model and provider for each specialized task while strictly enforcing:
- **QUALITY FLOOR FIRST. COST OPTIMIZATION SECOND.**
- If no available model satisfies the required capability and quality floor, the router **never** silently downgrades.
- When all semantic model providers fail and limited deterministic output is produced, it is explicitly flagged as `degraded_mode = true`.
- **Release Gate Invariant**: The Release Evaluator (Check 9) strictly fails `is_ready = false` if any critical stage (`architecture_design`, `fullstack_code_generation`, `defect_rework`) was produced under degraded mode.

---

## 2. Dynamic Model Routing Pipeline

```text
               Task Context (Agent Role, Purpose, Prompt)
                                │
                                ▼
                           TaskProfile
             (taskType, complexity, risk, reasoningReq,
              codeReq, structuredReq, contextSizeEstimate)
                                │
                                ▼
                    Model Capability Registry
             (Tabi AI, Groq, Reasoning Models, Fast Models)
                                │
                                ▼
                     Hard Constraint Filter
                 (Enabled, Context Limit, Allowed Tasks)
                                │
                                ▼
                      Quality Floor Policy
               (minReasoningTier, minCodeTier, minStructuredTier)
                                │
                                ▼
                       Provider Health Gate
                    (Circuit Breaker / Failure Rate)
                                │
                                ▼
                      Verifier Diversity Boost
                 (Prefer model diversity for Reviewer/QA)
                                │
                                ▼
                      Cost & Score Ranking
                 (Rank lowest cost meeting quality floor)
                                │
                                ▼
                        Routing Decision
                 (Provider, ModelId, Reason Code)
                                │
      ┌─────────────────────────┼─────────────────────────┐
      ▼                         ▼                         ▼
Primary Model Call      1-Turn Schema Repair      Capability Escalation
(JSON Schema Output)    (if schema invalid)       (if repair fails)
      │                         │                         │
      └─────────────────────────┼─────────────────────────┘
                                │
                                ▼
               Persist Evidence & Emit Real-Time Events
         (model_routing_decisions, llm_calls, model.routing.*)
```

---

## 3. Model Capability Registry & Basis Classification

| Provider | Model Identifier | Type | Capability Tier | Code Tier | Reasoning Tier | Structured Tier | Context Limit | Input Price / 1M | Output Price / 1M | Basis Classification |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Tabi AI** | `qwen-max` | Semantic LLM | 4 (Elite) | 4 | 4 | 4 | 32,768 | $1.60 | $6.40 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Tabi AI** | `qwen-plus` | Semantic LLM | 3 (High) | 3 | 3 | 4 | 32,768 | $0.40 | $1.20 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Tabi AI** | `qwen-turbo` | Semantic LLM | 2 (Fast) | 2 | 2 | 3 | 16,384 | $0.10 | $0.20 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Groq** | `qwen/qwen3.8-27b` | Semantic LLM | 3 (High) | 3 | 3 | 4 | 32,768 | $0.80 | $4.00 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Groq** | `llama-3.3-70b-versatile` | Semantic LLM | 3 (High) | 3 | 3 | 4 | 32,768 | $0.59 | $0.79 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Groq** | `deepseek-r1-distill-llama-70b` | Semantic LLM | 4 (Elite) | 4 | 4 | 4 | 32,768 | $0.75 | $0.99 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Groq** | `llama-3.1-8b-instant` | Semantic LLM | 2 (Fast) | 2 | 2 | 3 | 8,192 | $0.05 | $0.08 | Pricing: Configured; Context: Provider; Tiers: TayDau Policy |
| **Local** | `deterministic-generator` | Fallback | 1 (Degraded) | 1 | 1 | 4 | 100,000 | $0.00 | $0.00 | Local Rule-Engine Generator |

*Total Registry Entries: 8 (7 Semantic LLM Models + 1 Local Deterministic Fallback).*

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

## 5. Verifier Role Independence & Diversity

To reduce common-mode model bias without breaking organizational role boundaries:
- **Role Isolation**: Engineer cannot approve own work; verifiers (Code Reviewer, QA Engineer) never receive Engineer private reasoning or scratchpads.
- **Model Diversity**: If the Software Engineer generated code using Model A (e.g. `qwen-plus`), the Dynamic Router boosts eligible alternative tier-3/tier-4 models (e.g. `llama-3.3-70b-versatile`) for Code Reviewer and QA test generation.

---

## 6. Database Migration `013_dynamic_model_routing.sql` & Table Reconciliation

- **Phase 6 Domain Tables**: 30 tables
- **Migration 013 Created**: `model_routing_decisions`
- **Total Domain Tables**: **31**
- **Migration Runner System Table**: 1 (`_migrations`)
- **Total Tables in PostgreSQL**: **32**

```sql
CREATE TABLE IF NOT EXISTS model_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_role VARCHAR(64) NOT NULL,
  task_type VARCHAR(64) NOT NULL,
  task_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  routing_policy_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0',
  candidate_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejected_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_provider VARCHAR(64) NOT NULL,
  selected_model VARCHAR(128) NOT NULL,
  routing_reason VARCHAR(64) NOT NULL,
  routing_mode VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (routing_mode IN ('static', 'shadow', 'active')),
  shadow_selection JSONB,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  actual_cost_usd NUMERIC(10, 6),
  latency_ms INT,
  fallback_count INT NOT NULL DEFAULT 0,
  degraded_mode BOOLEAN NOT NULL DEFAULT FALSE,
  validation_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'passed', 'escalated', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_routing_project_created 
ON model_routing_decisions(project_id, created_at DESC);
```

---

## 7. Matched Static vs Dynamic Benchmark & Economic Evidence

*Workload: 7 representative multi-agent tasks across 4 verified requirements in a controlled benchmark run.*

| Metric | Static Baseline (Qwen Max) | Dynamic Routing (Policy v1.0.0) | Variance / Savings |
| :--- | :--- | :--- | :--- |
| **Total Project LLM Cost** | **$0.0896** | **$0.0149** | **83.4% reduction in this controlled benchmark** |
| **Cost per Verified Requirement** | **$0.0224** | **$0.0037** | **83.5% reduction** |
| **Deterministic Quality Gates** | 100% PASS | 100% PASS | Zero regressions |
| **Degraded Calls in Live Delivery** | 0 | 0 | Zero unverified fallbacks |
| **Release Readiness Gate** | Release Ready | Release Ready | Release Evaluator 100% satisfied |
