<p align="center">
  <img src="TayDau-Force-Logo.png" alt="TayDau Force Logo" width="220" />
</p>

<h1 align="center">TayDau Force</h1>

<p align="center">
  <strong>Autonomous Software Delivery Organization</strong><br>
  <em>Turn a product brief into planned, developed, independently reviewed, test-verified, and security-governed software through a governed AI specialist workforce.</em>
</p>

<p align="center">
  <a href="https://taydau-force.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-taydau--force.vercel.app-blue?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Status-Live%20MVP-emerald?style=for-the-badge" alt="Status: Live MVP" />
  <img src="https://img.shields.io/badge/Architecture-Frozen%20Baseline-purple?style=for-the-badge" alt="Architecture Frozen" />
</p>

---

## 🌟 Executive Overview

**TayDau Force** is an autonomous, multi-agent software delivery organization. Unlike single-prompt code generators or basic chat assistants, TayDau Force operates as a complete, governed engineering company.

It takes a natural language **Client Brief** and autonomously guides it through the entire software delivery lifecycle—synthesizing requirements, asking clarifying domain questions, designing interactive wireframes, creating architectural blueprints, writing production full-stack code, conducting strict code reviews, deriving independent QA acceptance tests, executing sandbox verification, and delivering Git-native release commits.

---

## 🏛️ System Architecture

![TayDau Force System Architecture](docs/architecture/Architecture-TayDau-Force.png)

### The 12-Stage Governed Delivery Lifecycle

```mermaid
graph TD
  A[Client Brief] --> B[1. Business Analysis - Aria]
  B --> C[2. Requirements Baseline Review - Client Gate]
  C --> D[3. Project Planning - Marcus]
  D --> E[4. UI/UX Wireframing - Sofia]
  E --> F[5. Design Approval - Client Gate]
  F --> G[6. Technical Architecture - Arthur]
  G --> H[7. Full-Stack Engineering - Devon]
  H --> I[8. Code Review & Security Audit - Evelyn]
  I --> J[9. Independent QA Derivation & Execution - Quinn]
  J --> K[10. Multi-Service Sandbox Verification]
  K --> L[11. Release Governance & Zero-Trust Audit]
  L --> M[12. Git-Native Release Delivery]
```

---

## 👥 Autonomous Workforce Architecture

TayDau Force implements a **two-tier workforce model**: a 7-member **Core Delivery Team** for the standard lifecycle, plus **Dynamic On-Demand Specialists** activated autonomously based on architectural triggers, project complexity, and domain requirements.

### 1. Core Specialist Workforce (7 Lifecycle Roles)

TayDau Force enforces strict role boundaries and governance policies (*e.g., "Developers cannot approve their own code"*):

| Specialist | Role | Key Responsibilities & Outputs |
| :--- | :--- | :--- |
| **Aria Johnson** | **Business Analyst** | Analyzes client brief, asks targeted domain clarification questions, defines user roles, business rules, edge cases, and synthesizes immutable **Requirement Baselines**. |
| **Marcus Lee** | **Project Manager** | Sequences delivery milestones, resolves dependency DAGs, tracks budget burn-down, and assigns specialist workstreams. |
| **Sofia Chen** | **UI/UX Designer** | Generates screen flows, component hierarchy, interactive wireframe specs, and live preview mockups for client approval. |
| **Arthur Pendelton** | **Solution Architect** | Designs data models, REST/FastAPI endpoints, SQLite/PostgreSQL schemas, security boundaries, and Architecture Decision Records (ADRs). |
| **Devon Vance** | **Full-Stack Engineer** | Implements clean, production-ready backend code, models, database migrations, and business logic. |
| **Dr. Evelyn Reed** | **Code Reviewer** | Conducts automated architectural compliance reviews, static analysis, and scans for OWASP/security vulnerabilities (`SEC` findings). |
| **Quinn Harper** | **Independent QA Engineer** | Derives black-box test suites from acceptance criteria, runs sandbox test executions, detects regressions, and logs triage defects (`DEF` items). |

### 2. Dynamic On-Demand Specialists (Trigger-Activated Roles)

When a project requires specialized capabilities beyond the core pipeline, the **Project Manager (Marcus)** and **Solution Architect (Arthur)** dynamically summon on-demand specialists:

| Specialist | Role | Dynamic Activation Triggers | Specialization & Outputs |
| :--- | :--- | :--- | :--- |
| **Dylan Ops** | **DevOps & Release Engineer** | Staging / Production release gates, Docker Compose multi-service topology, CI/CD orchestration. | CI/CD pipelines, container orchestration, environment blueprints, release manifests. |
| **Darius Data** | **Database Specialist** | Complex relational queries, high-throughput transactions, concurrency lock contention (`SELECT FOR UPDATE`). | PostgreSQL index tuning, isolation level optimization, migration scripts, vacuuming strategies. |
| **Samantha Sentinel** | **Security Specialist** | Authentication endpoints, RBAC matrices, sensitive data handling, `SEC-001` finding remediation. | OWASP threat modeling, SAST rule audits, zero-trust security attestations, secret scanning. |
| **Nathan Net** | **Network Specialist** | Multi-region VPC peering, edge DNS routing, DDoS mitigation policies. | VPC subnet topology, firewall rules, edge load balancer configs. |
| **Maya Learner** | **Machine Learning Specialist** | Demand forecasting, predictive analytics, recommendation algorithms, vector embeddings. | Model training pipelines, time-series forecasting weights, embedding pipelines. |
| **Milo Mobile** | **Mobile Specialist** | Native hardware integrations (barcode/RFID scanners, mobile companion apps). | React Native modules, mobile client scaffolding, hardware driver interfaces. |
| **Alex OpsAI** | **AIOps & Observability** | Post-deployment telemetry, high-volume log anomaly detection, automated error remediation. | Anomaly clustering, distributed tracing dashboards, SLA drift monitoring. |

---

## ⚡ Core Platform Capabilities

### 1. Dynamic Model Router (`FREE_ONLY` Multi-Provider Engine)
- **Zero-Cost Inference**: Built-in dynamic router with zero out-of-pocket inference cost mode (`INFERENCE_BILLING_MODE=FREE_ONLY`).
- **Supported Providers**: Groq Cloud, Google AI Studio (Gemini), OpenRouter (`glm-5.3-flash:free`, etc.), NVIDIA NIM, and Mistral AI.
- **Automated Fallback**: Graceful degradation to secondary free providers or deterministic mock fallbacks when upstream rate limits occur.

### 2. Live Interactive Wireframes & Preview Manager
- Full visual wireframe synthesis for client validation before code generation.
- Isolated sandbox iframe preview manager with automatic orphan process cleanup and lifetime tracking.

### 3. Independent Quality & Defect Governance
- **Strict Separation of Concerns**: QA tests are derived directly from requirements without access to implementation internals.
- **Automated Defect Lifecycle**: Failing test assertions automatically open defects (`DEF-01..DEF-04`) with root-cause routing back to Devon (Engineering) or Sofia (Design).

### 4. Real-Time Event-Driven Streaming
- Real-time Server-Sent Events (SSE) event pipeline (`/api/projects/:id/events`) with durable event logging in PostgreSQL and client reconnect replay.

### 5. Cost Governor & Budget Enforcement
- Real-time token usage telemetry tracking input/output tokens per specialist.
- Hard project budget limit with automated halting if limits are approached.

### 6. Git-Native Delivery & Audit Traceability
- Complete end-to-end lineage: `Client Brief → Requirement Code → Task Code → Source File → QA Test Run → Git Commit SHA`.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons
- **Backend**: Node.js, Express, TypeScript (`tsx`), PostgreSQL (`pg`), Zod validation
- **Orchestration**: Custom autonomous state machine with durable stage transitions
- **AI Gateway**: Multi-provider LLM Gateway (Groq, Gemini, OpenRouter, NVIDIA, Mistral) with streaming & structured JSON parsing
- **Database**: PostgreSQL 16 (Relational state, event logs, artifact manifests)

---

## 🚀 Quick Start Guide

### Prerequisites
1. **Node.js** v18+ installed
2. **PostgreSQL** (running locally on port `5432` or via cloud provider like [Neon.tech](https://neon.tech))
3. At least one **Free API Key** (e.g., [Groq Cloud](https://console.groq.com/keys) or [Google AI Studio](https://aistudio.google.com/))

---

### Step 1: Clone & Install

```bash
git clone https://github.com/programmerpakistaniorg/taydau-force.git
cd "taydau-force"

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

---

### Step 2: Configure Environment Variables

Create `server/.env` (or configure existing `server/.env`):

```env
PORT=3001
DATABASE_URL=postgresql://taydau:taydau@localhost:5432/taydau

# Free Inference Mode
INFERENCE_BILLING_MODE=FREE_ONLY
MODEL_PROVIDER=groq

# Free API Keys (Add at least one)
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=
OPENROUTER_API_KEY=
NVIDIA_API_KEY=
MISTRAL_API_KEY=
```

---

### Step 3: Run Database Migrations

Apply all database schemas and tables:

```bash
npm run migrate
```

---

### Step 4: Run TayDau Force

Start the backend server and frontend development server:

```bash
# Terminal 1: Start Backend (Port 3001)
npm run server

# Terminal 2: Start Frontend (Port 5173)
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 🧪 Project Verification & Testing

To run the full suite of automated verification gates across all 7 stages and multi-provider routing:

```bash
# Verify backend TypeScript compilation
cd server && npm run build && cd ..

# Verify frontend TypeScript compilation & build
npm run build
```

---

## 🏆 Hackathon Details

**Project**: TayDau Force  
**Hackathon**: Alibaba Cloud AI Hackathon Pakistan 2026  
**Team**: TayDau Force  
**Founding Engineers**: Muhammad Tayyab & Daud  
**Mission**: Building the world's most disciplined autonomous software engineering workforce.