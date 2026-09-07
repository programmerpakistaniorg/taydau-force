# TayDau Force -- Technical Audit Report

**Date:** August 2026  
**Purpose:** Pre-implementation audit for Alibaba Cloud AI Hackathon Pakistan 2026 MVP  
**Repository:** `d:\TayDau Force`  
**Auditor:** Automated Technical Analysis  

---

## 1. Current Architecture

### App Structure

The application is a single-page React application using client-side routing:

- **Entry point:** `src/main.tsx` renders `<App />` into `#root` in `index.html`
- **Router:** `src/App.tsx` uses `BrowserRouter` with nested `<Route>` elements under a shared `<AppLayout />` wrapper
- **Layout:** `src/components/layout/AppLayout.tsx` provides a fixed sidebar (`Sidebar.tsx`), sticky header (`Header.tsx`), main content outlet, and footer

### Routing Map

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `Overview.tsx` | Landing dashboard with KPIs and lifecycle |
| `/project` | `Project.tsx` | Business analysis output |
| `/requirements` | `Requirements.tsx` | 10-requirement traceability matrix |
| `/architecture` | `Architecture.tsx` | Pipeline flow and ADRs |
| `/workforce` | `Workforce.tsx` | 7 core + 6 specialist agents |
| `/execution` | `Execution.tsx` | 7-lane Kanban board |
| `/qa-security` | `QASecurity.tsx` | QA metrics and security findings |
| `/cost-governor` | `CostGovernor.tsx` | Cost tracking and model routing |
| `/delivery` | `Delivery.tsx` | Release readiness manifest |
| `*` | `Navigate to /` | Catch-all redirect |

### State Management

- **Single context provider:** `SimulationContext.tsx` wraps the entire app via `<SimulationProvider>`
- **State model:** One `useState` for `currentStep` (0-11) drives all UI state
- **Computation pattern:** `getComputedState(step)` deep-clones all mock data arrays via `JSON.parse(JSON.stringify(...))` and applies step-based mutations
- **No external state library** (no Redux, Zustand, or Jotai)
- **No API calls** -- all data is imported from `src/data/mockData.ts`

### Data Flow

```
mockData.ts (static imports)
    |
SimulationContext.getComputedState(currentStep)
    |
Context value (agents, requirements, tasks, defects, etc.)
    |
Page components consume via useSimulation() hook
```

### Build Pipeline

- **Bundler:** Vite 6.1 (`vite.config.ts`) with `@vitejs/plugin-react`
- **TypeScript:** `tsc && vite build` (strict mode enabled in `tsconfig.json`)
- **CSS:** Tailwind CSS 3.4 with PostCSS + Autoprefixer
- **Deployment:** Vercel with SPA rewrites (`vercel.json`)

---

## 2. Existing Reusable Components

### Layout Components (keep as-is)

| Component | Path | Reusability |
|-----------|------|-------------|
| `AppLayout` | `src/components/layout/AppLayout.tsx` | Shell with sidebar/header/outlet -- fully reusable |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation with active state and conditional indicators |
| `Header` | `src/components/layout/Header.tsx` | Sticky header with progress indicator (simulation controls can be swapped for real controls) |

### Common UI Components (keep as-is)

| Component | Path | Reusability |
|-----------|------|-------------|
| `Badge` | `src/components/common/Badge.tsx` | Generic variant-based badge (7 variants, 2 sizes) |
| `Card` | `src/components/common/Card.tsx` | Container with optional title/subtitle/action/footer |
| `Modal` | `src/components/common/Modal.tsx` | Escape-key aware, backdrop-dismissible, size variants |
| `Drawer` | `src/components/common/Drawer.tsx` | Right-sliding panel, 3 width options |
| `StatusPill` | `src/components/common/StatusPill.tsx` | Dynamic status coloring via string matching |
| `DocumentationModal` | `src/components/common/DocumentationModal.tsx` | Static content -- update text as needed |

### Type Definitions (keep and extend)

`src/types/index.ts` provides well-structured TypeScript interfaces:
- `Agent`, `Requirement`, `Task`, `Defect`, `SecurityFinding`, `ActivityItem`, `CostSummary`, `DeliveryItem`, `LifecycleStage`
- Union types for statuses: `AgentStatus`, `KanbanLane`, `RequirementPriority`, `VerificationStatus`

### Design System (keep as-is)

- `tailwind.config.js` defines brand colors (`brand-navy`, `brand-blue`, `brand-teal`), enterprise theme tokens, custom fonts (`Inter`, `JetBrains Mono`), and shadow presets
- `index.html` loads Google Fonts

---

## 3. Technical Debt / Structural Weaknesses

### Critical Issues

1. **Deep-clone on every render:** `SimulationContext.getComputedState()` performs `JSON.parse(JSON.stringify(...))` on 8 arrays on EVERY state change. No memoization (`useMemo`) is used. This will not scale when data comes from a real API.

2. **No data fetching layer:** Zero `fetch()`, `axios`, or any HTTP client. The entire data layer must be built from scratch.

3. **No error boundaries:** No `<ErrorBoundary>` components anywhere in the tree. Runtime errors crash the entire app.

4. **No loading states:** No skeleton loaders, suspense fallbacks, or loading indicators for async operations.

5. **Hardcoded simulation logic in context:** The 473-line `SimulationContext.tsx` mixes presentation concerns (step descriptions, actor names) with state logic. This will need complete refactoring for real orchestration.

6. **No testing infrastructure:** Zero test files. No test runner configured (no Jest, Vitest, or Playwright in `package.json`).

7. **Unused React import:** `import React from 'react'` is present in all files despite React 17+ JSX transform being configured in tsconfig (`"jsx": "react-jsx"`).

### Moderate Issues

8. **TypeScript strictness gaps:** `noUnusedLocals` and `noUnusedParameters` are both `false` -- allowing dead code to accumulate silently.

9. **No path aliases:** Imports use relative paths (`../../components/common/Card`). No `@/` alias configured in `tsconfig.json` or `vite.config.ts`.

10. **Monolithic mock data file:** `src/data/mockData.ts` is 1,458 lines -- difficult to maintain and impossible to progressively replace with API calls.

11. **`StatusPill` uses string matching:** `getStyle()` matches substrings like `'pass'` or `'fail'` -- fragile and could produce incorrect colors for new statuses.

12. **No code splitting:** All 9 page components are eagerly imported in `App.tsx`. No `React.lazy()` or route-based splitting.

---

## 4. Security Concerns

### Current State (Low Risk -- prototype with no backend)

1. **No secrets exposed:** No API keys, tokens, or credentials found in source code or config files. `.gitignore` is present.

2. **No `.env` file committed:** Git status shows only `AGENTS.md` as untracked. No `.env` in repo.

3. **XSS surface:** All data rendered is from local mock objects (no user input). However, `dangerouslySetInnerHTML` is NOT used anywhere -- safe.

4. **No Content Security Policy:** `index.html` has no CSP meta tag. External font loading from `fonts.googleapis.com` and `fonts.gstatic.com` is the only external resource.

5. **No authentication/authorization:** Prototype has zero access control. When backend is added, JWT handling and route guards will be needed.

6. **Google Fonts privacy:** Loading fonts from Google may have GDPR implications for EU users (minor for hackathon).

### When Backend Is Added -- Security Requirements

- CORS configuration on API endpoints
- JWT token storage (HttpOnly cookies, not localStorage)
- Input validation and sanitization on all API endpoints
- Rate limiting on public endpoints
- Secret management via environment variables (never in code)
- Docker container security (read-only filesystem, non-root user, resource limits)

---

## 5. Missing Backend Capabilities

The following backend services are needed for real AI orchestration:

| Service | Purpose | Priority |
|---------|---------|----------|
| **Orchestrator Service** | Manages the 12-stage delivery lifecycle, routes tasks between agents | P0 |
| **Model Gateway** | Unified interface to LLM providers (Qwen, OpenAI, Anthropic) with routing logic | P0 |
| **Agent Execution Engine** | Sends structured prompts to LLMs, parses responses, validates outputs | P0 |
| **Project State Service** | CRUD for requirements, tasks, defects, agents -- shared state graph | P0 |
| **Code Execution Sandbox** | Docker-based isolated environment for running generated code | P1 |
| **Test Runner Service** | Executes test suites inside containers, reports results | P1 |
| **Cost Telemetry Service** | Tracks token usage, cost per call, budget enforcement | P1 |
| **Webhook/Event Bus** | Inter-service communication for step transitions | P2 |
| **File/Artifact Storage** | Store generated code, test reports, build artifacts | P2 |

---

## 6. Missing Persistence Layer

### Database Needs

| Data Entity | Storage Requirement | Suggested Store |
|-------------|-------------------|-----------------|
| Projects | Relational (metadata, lifecycle stage) | PostgreSQL |
| Requirements | Relational with linked tasks/tests | PostgreSQL |
| Tasks (Kanban) | Relational with status transitions | PostgreSQL |
| Defects | Relational with requirement links | PostgreSQL |
| Agent Definitions | Semi-structured (prompts, permissions) | PostgreSQL JSONB |
| Activity Log | Append-only time series | PostgreSQL |
| Cost Telemetry | Per-call token/cost records | PostgreSQL |
| Generated Code | File blobs | Filesystem / Object Storage |
| LLM Conversation History | Large text, per-agent | PostgreSQL or Redis |
| Session/Auth State | Short-lived | Redis |

### State Persistence Requirements

- Project state must survive server restarts
- Agent conversation context must be retrievable for retry/escalation logic
- Cost accumulation must be atomic (no double-counting)
- Activity log must be append-only and auditable

---

## 7. What Should Remain Simulated Temporarily

The following can stay as mock while the MVP vertical slice is built:

1. **UI/UX Designer agent outputs** -- The prototype UI is already the deliverable; no need to generate UI via LLM yet
2. **Mobile, ML, Network, AIOps specialists** -- Explicitly excluded from MVP per AGENTS.md
3. **Kubernetes deployment** -- AGENTS.md rule #16 prohibits K8s until Docker works
4. **Monitoring and telemetry dashboards** -- Can remain static until deployment works
5. **SBOM generation** -- Nice-to-have, not MVP critical
6. **Multi-warehouse topology data** -- The demo project data can remain mock
7. **12-stage lifecycle visualization** -- Keep the existing visual but wire real status from backend

---

## 8. What Should Become Real First

**The Minimum Vertical Slice (one complete loop):**

```
User submits a brief (text input)
    -> BA Agent decomposes into 1-3 requirements (real LLM call)
    -> PM Agent creates task list (real LLM call)
    -> Architect Agent produces structure (real LLM call)
    -> Engineer Agent generates code (real LLM call -> Docker execution)
    -> QA Agent runs tests (real test execution in Docker)
    -> If FAIL -> Defect created -> Engineer retries (rework loop)
    -> If PASS -> Requirement marked Verified
    -> Cost tracked at each step
```

**Minimum real components needed:**

1. Brief submission form (frontend)
2. Orchestrator that sequences agent calls (backend)
3. Model Gateway calling Qwen/Alibaba Cloud AI (backend)
4. Code execution sandbox (Docker)
5. Test execution and result capture (Docker)
6. Persistent project state (PostgreSQL)
7. Cost tracking per LLM call (backend)
8. Real-time status updates to frontend (WebSocket or polling)

---

## 9. Proposed Backend Architecture

### Technology Choices

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Server | **Node.js + Express/Fastify** or **Python FastAPI** | Team familiarity; FastAPI matches mock data references |
| Database | **PostgreSQL 16** | Already referenced in ADR-001; ACID, JSONB support |
| Cache/Queue | **Redis** | Session state, pub/sub for real-time updates |
| Container Runtime | **Docker** | Code execution sandboxes |
| Real-time | **WebSocket (Socket.IO)** | Push step updates to frontend |

### API Structure

```
POST   /api/v1/projects                    # Create project from brief
GET    /api/v1/projects/:id                # Get project state
POST   /api/v1/projects/:id/advance        # Trigger next lifecycle step
GET    /api/v1/projects/:id/requirements   # List requirements
GET    /api/v1/projects/:id/tasks          # List tasks
GET    /api/v1/projects/:id/defects        # List defects
GET    /api/v1/projects/:id/activities     # Activity stream
GET    /api/v1/projects/:id/cost           # Cost summary
POST   /api/v1/agents/:role/execute        # Execute agent with prompt
POST   /api/v1/sandbox/run                 # Execute code in Docker
GET    /api/v1/sandbox/:id/result          # Get execution result
WS     /ws/projects/:id/stream             # Real-time updates
```

### Service Layers

```

       Frontend (React SPA)       

       API Gateway / Router       

  Orchestrator      Agent Engine 
  (Lifecycle FSM)   (LLM calls) 

  Model Gateway     Sandbox Mgr 
  (LLM routing)     (Docker)    

     Project State Service        
     (PostgreSQL + Redis)         

```

---

## 10. Proposed Model Gateway Abstraction

### Interface Design

```typescript
interface ModelGatewayConfig {
  providers: {
    alibaba: { apiKey: string; baseUrl: string; models: string[] };
    openai?: { apiKey: string; baseUrl: string; models: string[] };
    anthropic?: { apiKey: string; baseUrl: string; models: string[] };
  };
  routing: {
    fast: string;       // e.g., "qwen-turbo" or "gpt-4o-mini"
    coding: string;     // e.g., "qwen-coder-32b" or "claude-3.5-haiku"
    reasoning: string;  // e.g., "qwen-max" or "claude-3.5-sonnet"
  };
  limits: {
    maxBudgetUsd: number;
    maxRetriesPerTask: number;
    maxTokensPerCall: number;
  };
}

interface ModelRequest {
  taskType: 'fast' | 'coding' | 'reasoning';
  agentRole: string;
  projectId: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

interface ModelResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    retryCount: number;
  };
}

interface ModelGateway {
  call(request: ModelRequest): Promise<ModelResponse>;
  estimateCost(request: ModelRequest): number;
  getRemainingBudget(projectId: string): Promise<number>;
  getUsageStats(projectId: string): Promise<CostSummary>;
}
```

### Routing Logic

1. **Task complexity classification:** Each agent role has a default tier (`fast`, `coding`, `reasoning`)
2. **Escalation on failure:** After 2 consecutive failures, auto-escalate to `reasoning` tier
3. **Budget check before every call:** If remaining budget < estimated cost, halt and require approval
4. **Provider fallback:** If primary provider (Alibaba/Qwen) fails, fall back to secondary

### Provider Priority (Hackathon)

1. **Primary:** Alibaba Cloud Model Studio / Qwen (required for hackathon)
2. **Fallback:** OpenAI or Anthropic (if Qwen is unavailable)

---

## 11. Proposed Shared Project-State Model

### Unified State Schema

```typescript
interface ProjectState {
  id: string;
  name: string;
  brief: string;                          // Original client brief text
  status: 'analyzing' | 'planning' | 'architecting' | 'executing' | 'testing' | 'verified' | 'failed';
  currentStage: number;                   // 1-12 lifecycle stage
  
  requirements: Requirement[];            // Reuse existing type from src/types/index.ts
  tasks: Task[];                          // Reuse existing type
  defects: Defect[];                      // Reuse existing type
  agents: AgentAssignment[];              // Which agents are active
  activities: ActivityItem[];             // Audit trail
  costSummary: CostSummary;              // Running totals
  
  artifacts: {
    generatedCode: CodeArtifact[];        // Files generated by Engineer agent
    testResults: TestResult[];            // Test execution records
    architectureSpec: string;             // Architect output
    securityFindings: SecurityFinding[];  // Security scan results
  };
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    totalDurationMs?: number;
  };
}

interface AgentAssignment {
  role: string;
  model: string;
  tier: 'fast' | 'coding' | 'reasoning';
  totalCalls: number;
  totalCostUsd: number;
  status: 'idle' | 'working' | 'completed' | 'failed';
}

interface CodeArtifact {
  path: string;
  content: string;
  language: string;
  generatedBy: string;        // Agent role
  commitHash?: string;
  timestamp: string;
}

interface TestResult {
  testId: string;
  name: string;
  status: 'pass' | 'fail' | 'error' | 'skip';
  output: string;
  durationMs: number;
  executedAt: string;
}
```

### State Access Pattern

- All agents READ from the same project state
- Only the Orchestrator WRITES state transitions
- Individual agents produce outputs that the Orchestrator merges into state
- Frontend subscribes to state changes via WebSocket

---

## 12. Proposed Agent Contract Format

### Structured Input/Output Contract

```typescript
interface AgentContract {
  role: string;                                // e.g., "business_analyst"
  systemPrompt: string;                        // Role description and constraints
  inputSchema: {
    projectBrief?: string;                     // BA input
    requirements?: Requirement[];              // PM, Architect, Engineer input
    tasks?: Task[];                            // Engineer input
    codeArtifacts?: CodeArtifact[];           // QA input
    testResults?: TestResult[];                // PM (for defect creation)
    defectContext?: Defect;                    // Engineer (for rework)
  };
  outputSchema: {
    requirements?: Requirement[];              // BA output
    tasks?: Task[];                            // PM output
    architectureSpec?: string;                 // Architect output
    codeFiles?: CodeArtifact[];               // Engineer output
    testPlan?: string[];                       // QA output
    defects?: Defect[];                        // QA output
    verdict?: 'pass' | 'fail';                // QA output
    costEstimate?: number;                     // Any agent
  };
  constraints: {
    maxOutputTokens: number;
    responseFormat: 'json';                    // All agents must return parseable JSON
    requiredFields: string[];                  // Fields that must be present in output
    validationRules: string[];                // Business rules to enforce
  };
  permissions: {
    canRead: string[];                        // State fields this agent can access
    canWrite: string[];                       // State fields this agent can modify
    cannotDo: string[];                       // Explicit prohibitions
  };
}
```

### Agent Roles for MVP

| Role | Input | Output | Tier |
|------|-------|--------|------|
| Business Analyst | `projectBrief` | `requirements[]` with acceptance criteria | fast |
| Project Manager | `requirements[]` | `tasks[]` with dependencies | fast |
| Solution Architect | `requirements[]` | `architectureSpec` (file structure, tech decisions) | reasoning |
| Full-Stack Engineer | `tasks[]` + `architectureSpec` | `codeFiles[]` | coding |
| QA Engineer | `codeFiles[]` + `requirements[]` | `testPlan` + `verdict` + `defects[]` | coding |

---

## 13. Proposed Docker Execution Architecture

### Container Strategy

```

              Host Machine                  

  Backend Service (Node/Python)            
    
       Sandbox Manager                   
    - Creates containers per execution   
    - Mounts generated code              
    - Captures stdout/stderr             
    - Enforces timeout (30s max)         
    - Cleans up after execution          
    
                                          
           
   Sandbox A      Sandbox B          
   (Engineer)     (QA Tests)         
   node:20-slim   python:3.12        
   read-only /    read-only /        
   no-network     no-network         
   256MB RAM      512MB RAM          
   30s timeout    60s timeout        
           

```

### Security Controls

- **Read-only root filesystem** -- containers cannot modify system files
- **No network access** -- generated code cannot phone home
- **Resource limits** -- CPU (0.5 cores), RAM (256-512MB), disk (50MB tmpfs)
- **Execution timeout** -- 30 seconds for code execution, 60 seconds for test suites
- **Non-root user** -- processes run as unprivileged user inside container
- **Ephemeral** -- containers are destroyed after each execution

### Execution Flow

1. Orchestrator receives generated code from Engineer agent
2. Sandbox Manager creates a temporary directory with the code files
3. Docker container is started with the code mounted read-only
4. Container runs `npm install && npm test` or equivalent
5. stdout/stderr captured
6. Exit code determines pass/fail
7. Container is destroyed
8. Results stored in project state

---

## 14. Proposed QA/Rework Architecture

### QA Independence Model

```
Engineer Agent produces code
        
        

  Orchestrator          stores code artifacts in project state
  transitions to QA   

        
        

  QA Agent              reads code + requirements
  (DIFFERENT model      generates test cases
   from Engineer)       produces verdict

        
         PASS -> Orchestrator marks requirement Verified
        
         FAIL -> Orchestrator creates Defect
                        
                        
              
                Engineer Agent        receives defect context
                (rework attempt)      produces patched code
              
                        
                        
              QA Agent re-evaluates (max 2 rework cycles)
                        
                         PASS -> Verified
                         FAIL (after 2 retries) -> Escalate to reasoning tier
```

### Key Rules (from AGENTS.md)

- Engineers CANNOT approve their own work (principle #6)
- Maximum 2 standard retries before model escalation
- QA Agent uses a DIFFERENT model instance than Engineer to prevent bias
- Defects include: failing test name, expected vs actual, stack trace context

### Rework Data Flow

```typescript
interface ReworkContext {
  originalTask: Task;
  defect: Defect;
  failingTests: TestResult[];
  previousAttempts: CodeArtifact[];  // So Engineer knows what already failed
  retryCount: number;
  escalated: boolean;                 // If true, use reasoning-tier model
}
```

---

## 15. Proposed Cost Telemetry Architecture

### Token Tracking Model

```typescript
interface CostEvent {
  id: string;
  projectId: string;
  agentRole: string;
  model: string;
  provider: string;
  tier: 'fast' | 'coding' | 'reasoning';
  
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  
  cost: {
    inputCostUsd: number;
    outputCostUsd: number;
    totalCostUsd: number;
  };
  
  context: {
    taskCode?: string;
    requirementCode?: string;
    isRetry: boolean;
    retryNumber: number;
    isEscalation: boolean;
  };
  
  timestamp: string;
  durationMs: number;
}
```

### Budget Enforcement

```typescript
interface BudgetPolicy {
  hardLimitUsd: number;          // $5.00 default
  warningThresholdPercent: number; // 80% -- alert at $4.00
  
  perCallLimits: {
    fast: { maxTokens: 4000; maxCostUsd: 0.01 };
    coding: { maxTokens: 16000; maxCostUsd: 0.05 };
    reasoning: { maxTokens: 32000; maxCostUsd: 0.15 };
  };
  
  retryPolicy: {
    maxRetries: 2;
    escalateAfter: 2;           // Switch to reasoning tier
    haltOnBudgetExceeded: true;
  };
}
```

### Cost Attribution

- Every LLM call logs a `CostEvent` to PostgreSQL
- Running total maintained in `ProjectState.costSummary`
- Cost per verified requirement = total spend / verified requirements count
- Frontend `CostGovernor.tsx` page reads from `/api/v1/projects/:id/cost`

### Circuit Breaker

- Before every Model Gateway call, check: `remainingBudget >= estimatedCost`
- If insufficient: halt execution, log warning, notify frontend via WebSocket
- Allow manual override only with explicit user approval

---

## 16. Exact Phased Implementation Plan

### Phase 0: Foundation (Days 1-2)

**Deliverables:**
- Backend project scaffolding (Node.js/Express or Python/FastAPI)
- PostgreSQL schema for projects, requirements, tasks, defects, activities, cost_events
- Model Gateway abstraction with Alibaba Cloud / Qwen integration
- Docker sandbox manager with basic code execution
- API endpoints: `POST /projects`, `GET /projects/:id`
- Environment configuration (`.env` for API keys, never committed)

**Files to create:**
```
backend/
    src/
    server.ts                    # Express/Fastify entry
    config/env.ts                # Environment variable loader
    db/schema.sql                # PostgreSQL DDL
    db/client.ts                 # Database connection pool
    services/modelGateway.ts     # LLM provider abstraction
    services/orchestrator.ts     # Lifecycle state machine
    services/sandboxManager.ts   # Docker execution
    routes/projects.ts           # API routes
    Dockerfile
    docker-compose.yml               # PostgreSQL + Redis + Backend
    package.json
```

**Acceptance criteria:**
- [ ] Can send a prompt to Qwen via Model Gateway and receive a response
- [ ] Can create a project record in PostgreSQL
- [ ] Can execute a simple Node.js script in a Docker container and capture output
- [ ] Cost of each LLM call is logged to database

---

### Phase 1: Business Analysis Agent (Days 2-3)

**Deliverables:**
- BA Agent contract with structured JSON output
- Prompt engineering for requirement decomposition
- API endpoint: `POST /projects/:id/analyze`
- Frontend: Brief submission form (replace static `DEMO_PROJECT_INFO.clientRequirement`)
- Store generated requirements in PostgreSQL

**Agent contract:**
- Input: `{ brief: string }`
- Output: `{ requirements: [{ code, title, type, priority, acceptanceCriteria[] }] }`
- Model tier: `fast` (Qwen-Turbo)

**Acceptance criteria:**
- [ ] User submits a text brief via frontend
- [ ] BA Agent produces 3-5 structured requirements with acceptance criteria
- [ ] Requirements appear in the existing `Requirements.tsx` page
- [ ] Cost is tracked: should be <$0.02 per analysis

---

### Phase 2: Planning & Architecture Agents (Days 3-4)

**Deliverables:**
- PM Agent generates tasks from requirements
- Architect Agent produces file structure and technology decisions
- API endpoints: `POST /projects/:id/plan`, `POST /projects/:id/architect`
- Tasks appear in `Execution.tsx` Kanban board

**Agent contracts:**
- PM Input: `{ requirements[] }` -> Output: `{ tasks[] }` with dependencies
- Architect Input: `{ requirements[], tasks[] }` -> Output: `{ fileStructure, techDecisions, architecture }` 
- Model tiers: PM=`fast`, Architect=`reasoning`

**Acceptance criteria:**
- [ ] PM creates tasks linked to requirements
- [ ] Architect produces a file structure that Engineer can follow
- [ ] Tasks appear in correct Kanban lanes
- [ ] Total cost for Phase 2 < $0.10

---

### Phase 3: Engineering Agent + Docker Execution (Days 4-6)

**Deliverables:**
- Engineer Agent generates actual code files
- Generated code is stored as artifacts
- Code is executed in Docker sandbox
- Basic test execution (at minimum: syntax check + lint)
- Results stored in project state

**Agent contract:**
- Input: `{ task, architectureSpec, existingCode[] }`
- Output: `{ files: [{ path, content, language }] }`
- Model tier: `coding` (Qwen-Coder)

**Acceptance criteria:**
- [ ] Engineer generates runnable code for at least one task
- [ ] Code executes successfully in Docker container
- [ ] Execution result (pass/fail + output) stored in project state
- [ ] Generated files viewable in frontend

---

### Phase 4: QA Agent + Rework Loop (Days 6-8)

**Deliverables:**
- QA Agent reviews code against acceptance criteria
- QA produces test assertions or verdict
- If FAIL: Defect created, Engineer gets rework context
- Rework loop (max 2 retries)
- Escalation to reasoning tier on repeated failure

**Agent contract:**
- Input: `{ codeFiles[], requirement, acceptanceCriteria[] }`
- Output: `{ verdict: 'pass'|'fail', testResults[], defects[] }`
- Model tier: `coding` (different model/instance from Engineer)

**Acceptance criteria:**
- [ ] QA Agent independently evaluates Engineer's code
- [ ] Failed verdict creates a defect automatically
- [ ] Engineer receives defect and produces patched code
- [ ] After pass, requirement status becomes "Verified"
- [ ] Rework loop demonstrated end-to-end

---

### Phase 5: Integration + Polish (Days 8-10)

**Deliverables:**
- Full end-to-end loop working: Brief -> Verified Requirement
- WebSocket real-time updates to frontend
- Existing pages (`Overview`, `QASecurity`, `CostGovernor`, `Delivery`) read from real API
- Activity stream populated from real events
- Cost Governor shows real spend data
- Demo recording / presentation preparation

**Acceptance criteria:**
- [ ] One complete brief-to-verification loop completes autonomously
- [ ] Frontend displays real-time progress (not simulation buttons)
- [ ] Total cost for a demo loop is < $1.00
- [ ] Cost per verified requirement is trackable
- [ ] "Simulate Next Activity" button is replaced with real lifecycle status
- [ ] Build passes: `tsc && vite build` with no errors

---

### What Is Explicitly Out of Scope

Per AGENTS.md and hackathon constraints:

- No Kubernetes (rule #16)
- No Mobile/ML/Network/AIOps agents
- No enterprise SSO or multi-tenant auth
- No production monitoring/alerting infrastructure
- No CI/CD pipeline automation (manual deploy to Vercel/Alibaba Cloud)
- No SBOM generation
- No multi-project support (single project at a time)

---

## Summary

The TayDau Force prototype is a high-quality interactive demonstration with:
- Clean TypeScript types and component architecture
- Well-designed UI with reusable common components
- Comprehensive mock data representing the full delivery lifecycle
- Clear separation between layout and page logic

The primary gap is: **zero backend, zero API calls, zero real AI behavior.** The entire data layer must be built from scratch. However, the existing type definitions (`src/types/index.ts`) and the mock data structure provide an excellent contract specification for the real API responses.

**Critical path to MVP:**
1. Model Gateway + Qwen integration (Day 1)
2. Docker sandbox execution (Day 2)
3. BA + PM + Architect agents (Days 2-4)
4. Engineer agent + code generation (Days 4-6)
5. QA agent + rework loop (Days 6-8)
6. Frontend integration + demo (Days 8-10)

**Target KPI:** Complete one brief-to-verified-requirement cycle for < $1.00 total AI cost.