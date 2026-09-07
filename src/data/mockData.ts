import {
  Agent,
  LifecycleStage,
  Requirement,
  Task,
  Defect,
  SecurityFinding,
  ActivityItem,
  CostSummary,
  DeliveryItem
} from '../types';

export interface ArchitectureDecisionRecord {
  code: string;
  title: string;
  status: 'Accepted' | 'Implemented' | 'Approved';
  date: string;
  context: string;
  decision: string;
  consequences: string;
}

export const ARCHITECTURE_DECISION_RECORDS: ArchitectureDecisionRecord[] = [
  {
    code: 'ADR-001',
    title: 'PostgreSQL selected for Relational Storage & Row-Level Locking',
    status: 'Accepted',
    date: 'Sprint 1',
    context: 'Multi-warehouse stock balances require strict ACID consistency to prevent race conditions and phantom reads during concurrent transfer requests.',
    decision: 'Adopt PostgreSQL 16 with explicit SELECT FOR UPDATE pessimistic locking and transaction isolation for all warehouse transfer endpoints.',
    consequences: 'Guarantees zero negative inventory states; requires robust connection pooling (PgBouncer) for high-frequency scan traffic.'
  },
  {
    code: 'ADR-002',
    title: 'REST API selected with OpenAPI 3.1 Contract Generation',
    status: 'Implemented',
    date: 'Sprint 1',
    context: 'Warehouse barcode scanners, manager web dashboards, and reporting workers require standardized HTTP integration.',
    decision: 'Expose RESTful endpoints adhering to OpenAPI 3.1 specifications with auto-generated TypeScript client contracts.',
    consequences: 'Simplifies frontend client binding and independent QA mock testing; payload size overhead is negligible.'
  },
  {
    code: 'ADR-003',
    title: 'Docker isolation required for Autonomous Execution Workspaces',
    status: 'Accepted',
    date: 'Sprint 1',
    context: 'Multiple autonomous AI agents write, test, and lint code concurrently. Workspace isolation is critical to avoid dependency cross-contamination.',
    decision: 'Containerize each autonomous service in dedicated Docker environments with read-only root filesystems and isolated network bridges.',
    consequences: 'Enables deterministic test execution and safe sandbox execution of synthesized agent code.'
  },
  {
    code: 'ADR-004',
    title: 'Role-Based Access Control (RBAC) required for Stock Adjustments',
    status: 'Approved',
    date: 'Sprint 2',
    context: 'Operational security mandate: Warehouse staff cannot unilaterally overwrite ledger quantities without manager sign-off.',
    decision: 'Implement claims-based RBAC token guards (Admin, Warehouse Manager, Staff) enforced at the API gateway and controller layers.',
    consequences: 'Prevents unauthorized inventory shrinkage; mandates authentication middleware on all state-mutating endpoints.'
  }
];

export const INITIAL_AGENTS: Agent[] = [
  // --- CORE TEAM ---
  {
    id: 'agent-ba',
    role: 'Business Analyst Agent',
    name: 'Aria Analyst',
    status: 'Completed',
    specialization: 'Requirements Elicitation, User Stories, Acceptance Criteria (Given-When-Then), Business Rules',
    isCoreTeam: true,
    tasksCompleted: 18,
    costUsd: 0.11,
    model: 'Claude 3.5 Sonnet',
    avatarBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    avatarText: 'BA',
    badgeVariant: 'success',
    inputs: ['Client Brief', 'Stakeholder Goals', 'Domain Constraints', 'Industry Regulations'],
    outputs: ['10 Atomic Requirements', 'Acceptance Criteria (AC-001..AC-010)', 'Actor Definitions', 'Business Rules'],
    permissionsCan: [
      'Deconstruct client brief into specifications',
      'Define acceptance criteria (Given-When-Then)',
      'Assign requirement priorities and categories'
    ],
    permissionsCannot: [
      'Modify source code repositories',
      'Approve QA test sign-offs',
      'Trigger cloud deployments'
    ]
  },
  {
    id: 'agent-pm',
    role: 'Project Manager Agent',
    name: 'Marcus Planner',
    status: 'Active',
    specialization: 'Task Graph Scheduling, Dependency Mapping, Autonomous Workforce Routing, Defect Triage',
    isCoreTeam: true,
    currentTask: 'Supervising Sprint 2 Delivery & Defect Rework',
    tasksCompleted: 24,
    costUsd: 0.18,
    model: 'GPT-4o',
    avatarBg: 'bg-blue-50 text-blue-700 border-blue-200',
    avatarText: 'PM',
    badgeVariant: 'blue',
    inputs: ['Requirements Specification', 'Defect Reports', 'Agent Telemetry', 'Cost Budget'],
    outputs: ['Sprint Backlog', 'Task Assignment Graph', 'Milestone Forecasts', 'Cost Budget Alerts'],
    permissionsCan: [
      'Schedule sprint tasks and assign to agents',
      'Triage and route defects (e.g. DEF-03)',
      'Manage token budget allocation'
    ],
    permissionsCannot: [
      'Directly alter application source code',
      'Override failed security gates',
      'Mark requirements verified without QA sign-off'
    ]
  },
  {
    id: 'agent-arch',
    role: 'Solution Architect Agent',
    name: 'Sophia Architect',
    status: 'Completed',
    specialization: 'Clean Architecture, Hexagonal Boundaries, Multi-Warehouse Concurrency Model, ADR Synthesis',
    isCoreTeam: true,
    tasksCompleted: 6,
    costUsd: 0.27,
    model: 'o3-mini (Reasoning)',
    avatarBg: 'bg-teal-50 text-teal-700 border-teal-200',
    avatarText: 'SA',
    badgeVariant: 'teal',
    inputs: ['Functional Requirements', 'SLA Targets (99.9%)', 'Scale Projections', 'Tech Stack Constraints'],
    outputs: ['Hexagonal Architecture Spec', 'ADR-001 to ADR-004', 'Database Schema DDL', 'API Contracts'],
    permissionsCan: [
      'Define system architecture and ADRs',
      'Design database schema and locking strategies',
      'Enforce clean code & boundary rules'
    ],
    permissionsCannot: [
      'Bypass QA regression testing',
      'Deploy unverified builds to production'
    ]
  },
  {
    id: 'agent-ui',
    role: 'UI/UX Designer',
    name: 'Elena Design',
    status: 'Completed',
    specialization: 'Enterprise Design Tokens, Multi-Warehouse Dashboards, Responsive Layouts, WCAG 2.1 AA',
    isCoreTeam: true,
    tasksCompleted: 8,
    costUsd: 0.13,
    model: 'Claude 3.5 Sonnet',
    avatarBg: 'bg-purple-50 text-purple-700 border-purple-200',
    avatarText: 'UI',
    badgeVariant: 'slate',
    inputs: ['User Personas', 'Wireframe Specs', 'Brand Design System Tokens', 'Usability Guidelines'],
    outputs: ['Figma Design Tokens', 'Responsive Component Specs', 'Interactive Prototype States'],
    permissionsCan: [
      'Generate frontend component layouts and styles',
      'Define accessible color palettes and typography',
      'Create UI interaction states and modals'
    ],
    permissionsCannot: [
      'Modify backend API endpoints',
      'Approve security audits'
    ]
  },
  {
    id: 'agent-dev',
    role: 'Full-Stack Engineer',
    name: 'Devon Coder',
    status: 'Working',
    specialization: 'React, TypeScript, FastAPI, PostgreSQL Transactions, Row-Level Locking, Docker Services',
    isCoreTeam: true,
    currentTask: 'Implementing atomic lock for REQ-006 (Stock Transfer)',
    tasksCompleted: 19,
    costUsd: 0.81,
    model: 'Claude 3.7 Sonnet',
    avatarBg: 'bg-blue-50 text-blue-700 border-blue-200',
    avatarText: 'FE',
    badgeVariant: 'blue',
    inputs: ['Task Specs (TASK-01..TASK-24)', 'API Schemas', 'Architecture Guidelines', 'Defect Logs'],
    outputs: ['Frontend React Components', 'FastAPI Backend Handlers', 'SQL Migrations', 'Unit Tests'],
    permissionsCan: [
      'Read specifications and requirements',
      'Modify and commit application source code',
      'Execute local unit tests and developer builds'
    ],
    permissionsCannot: [
      'Approve QA verification gates',
      'Alter verified requirements without BA review',
      'Deploy directly to production infrastructure'
    ]
  },
  {
    id: 'agent-qa',
    role: 'QA Engineer',
    name: 'Quinn Tester',
    status: 'Testing',
    specialization: 'End-to-End Playwright, Concurrency Race Condition Testing, Unit/Integration Test Generation',
    isCoreTeam: true,
    currentTask: 'Executing TEST-23 race condition transfer verification',
    tasksCompleted: 12,
    costUsd: 0.21,
    model: 'GPT-4o-mini',
    avatarBg: 'bg-amber-50 text-amber-700 border-amber-200',
    avatarText: 'QA',
    badgeVariant: 'amber',
    inputs: ['Acceptance Criteria (AC-001..AC-010)', 'Committed Source Code', 'Test Scenarios'],
    outputs: ['Automated Test Suites (42 Unit, 17 Int, 9 E2E)', 'Defect Logs (DEF-01..DEF-03)', 'Quality Gate Reports'],
    permissionsCan: [
      'Execute automated test suites and concurrency stress tests',
      'Create and reject defect incidents (e.g. DEF-03)',
      'Approve or block QA release gates'
    ],
    permissionsCannot: [
      'Silently modify feature business logic code',
      'Bypass failing test assertions'
    ]
  },
  {
    id: 'agent-devops',
    role: 'DevOps Engineer',
    name: 'Dylan Ops',
    status: 'Waiting',
    specialization: 'Docker Containerization, GitHub Actions CI/CD, Alibaba Cloud Deployment, Telemetry',
    isCoreTeam: true,
    currentTask: 'Awaiting QA and Security Sign-Off before Staging Deployment',
    tasksCompleted: 4,
    costUsd: 0.00,
    model: 'Claude 3.5 Haiku',
    avatarBg: 'bg-slate-50 text-slate-700 border-slate-200',
    avatarText: 'DO',
    badgeVariant: 'slate',
    inputs: ['Dockerfiles', 'Environment Blueprints', 'Cloud Security Policies', 'Release Gates'],
    outputs: ['CI/CD Pipeline YAML', 'Container Images', 'Terraform Blueprints', 'Deployment Manifests'],
    permissionsCan: [
      'Configure CI/CD build workflows and Docker containers',
      'Deploy verified release artifacts to staging/production',
      'Monitor runtime health telemetry'
    ],
    permissionsCannot: [
      'Deploy release when Quality or Security Gate is Blocked',
      'Modify application functional logic'
    ]
  },

  // --- ON-DEMAND SPECIALISTS ---
  {
    id: 'agent-db',
    role: 'Database Specialist',
    name: 'Darius Data',
    status: 'Activated',
    activationStatus: 'Activated',
    specialization: 'PostgreSQL Index Tuning, Isolation Levels, Vacuuming, Read-Replica Topology',
    isCoreTeam: false,
    currentTask: 'Auditing index selectivity on warehouse_stock table',
    tasksCompleted: 3,
    costUsd: 0.09,
    model: 'Claude 3.5 Sonnet',
    avatarBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    avatarText: 'DB',
    badgeVariant: 'teal',
    inputs: ['Query Plans', 'Table Schemas', 'Transaction Concurrency Traces'],
    outputs: ['Migration Scripts', 'Composite Indexes', 'Lock Contention Analysis'],
    permissionsCan: [
      'Analyze query execution plans and index efficiency',
      'Recommend transaction isolation levels',
      'Author database performance migrations'
    ],
    permissionsCannot: [
      'Bypass application layer security guards',
      'Directly wipe production data'
    ]
  },
  {
    id: 'agent-sec',
    role: 'Security Specialist',
    name: 'Samantha Sentinel',
    status: 'Activated',
    activationStatus: 'Activated',
    specialization: 'OWASP Top 10, SAST Rule Audits, RBAC Policy Enforcement, Threat Modeling',
    isCoreTeam: false,
    currentTask: 'Verifying remediation for SEC-001 (Stock Adjustment RBAC)',
    tasksCompleted: 6,
    costUsd: 0.13,
    model: 'Claude 3.5 Sonnet',
    avatarBg: 'bg-rose-50 text-rose-700 border-rose-200',
    avatarText: 'SEC',
    badgeVariant: 'amber',
    inputs: ['Controller Endpoints', 'Token Handlers', 'Dependency Manifests', 'SAST Reports'],
    outputs: ['Security Findings (SEC-001..SEC-003)', 'RBAC Rule Matrices', 'Compliance Attestations'],
    permissionsCan: [
      'Review security requirements and RBAC matrices',
      'Execute automated SAST / secret scans',
      'Create security findings and block unpatched releases'
    ],
    permissionsCannot: [
      'Bypass organizational release policies',
      'Grant unverified authorization exemptions'
    ]
  },
  {
    id: 'agent-net',
    role: 'Network Specialist',
    name: 'Nathan Net',
    status: 'Not Required',
    activationStatus: 'Not Required',
    specialization: 'VPC Peering, Cloudflare DDoS Mitigation, Edge DNS Routing, BGP',
    isCoreTeam: false,
    tasksCompleted: 0,
    costUsd: 0.00,
    model: 'Claude 3.5 Haiku',
    avatarBg: 'bg-slate-50 text-slate-400 border-slate-200',
    avatarText: 'NET',
    badgeVariant: 'slate',
    inputs: ['Network Topologies', 'CIDR Ranges'],
    outputs: ['VPC Configurations'],
    permissionsCan: ['Configure VPC subnets'],
    permissionsCannot: ['Deploy without approval']
  },
  {
    id: 'agent-ml',
    role: 'ML Specialist',
    name: 'Maya Learner',
    status: 'Not Required',
    activationStatus: 'Not Required',
    specialization: 'Demand Forecasting Models, Predictive Stock Depletion, Time-Series Embeddings',
    isCoreTeam: false,
    tasksCompleted: 0,
    costUsd: 0.00,
    model: 'o3-mini',
    avatarBg: 'bg-slate-50 text-slate-400 border-slate-200',
    avatarText: 'ML',
    badgeVariant: 'slate',
    inputs: ['Historical Sales Data'],
    outputs: ['Forecasting Weights'],
    permissionsCan: ['Train forecasting weights'],
    permissionsCannot: ['Directly modify core ERP stock']
  },
  {
    id: 'agent-mob',
    role: 'Mobile Specialist',
    name: 'Milo Mobile',
    status: 'Not Required',
    activationStatus: 'Not Required',
    specialization: 'React Native, Swift/Kotlin Scanner Clients, Bluetooth Zebra Printer Drivers',
    isCoreTeam: false,
    tasksCompleted: 0,
    costUsd: 0.00,
    model: 'Claude 3.5 Sonnet',
    avatarBg: 'bg-slate-50 text-slate-400 border-slate-200',
    avatarText: 'MOB',
    badgeVariant: 'slate',
    inputs: ['Native SDKs'],
    outputs: ['Mobile Builds'],
    permissionsCan: ['Compile iOS/Android shells'],
    permissionsCannot: ['Bypass API gateway']
  },
  {
    id: 'agent-aiops',
    role: 'AIOps Specialist',
    name: 'Alex OpsAI',
    status: 'Planned',
    activationStatus: 'Planned',
    specialization: 'Autonomous Log Anomaly Clustering, Auto-Remediation, Latency Forecasting',
    isCoreTeam: false,
    tasksCompleted: 0,
    costUsd: 0.00,
    model: 'Claude 3.7 Sonnet',
    avatarBg: 'bg-purple-50 text-purple-400 border-purple-200',
    avatarText: 'AI',
    badgeVariant: 'purple',
    inputs: ['Telemetry Firehoses'],
    outputs: ['Anomaly Signatures'],
    permissionsCan: ['Ingest telemetry streams'],
    permissionsCannot: ['Modify production configurations']
  }
];

export const INITIAL_LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'stage-1',
    name: 'Client Idea',
    stageNumber: 1,
    status: 'completed',
    description: 'Initial client requirement captured: 3-warehouse inventory management with transfers, alerts, and reporting.',
    leadAgent: 'Business Analyst',
    durationEstimate: '0.4m'
  },
  {
    id: 'stage-2',
    name: 'Analysis',
    stageNumber: 2,
    status: 'completed',
    description: 'Deconstructed requirement into 10 atomic functional specs, domain entities, and acceptance tests.',
    leadAgent: 'Business Analyst',
    durationEstimate: '1.2m'
  },
  {
    id: 'stage-3',
    name: 'Prototype',
    stageNumber: 3,
    status: 'completed',
    description: 'Rapid UI wireframe & interaction model generated for warehouse stock operators and managers.',
    leadAgent: 'UI/UX Designer',
    durationEstimate: '0.8m'
  },
  {
    id: 'stage-4',
    name: 'Validation',
    stageNumber: 4,
    status: 'completed',
    description: 'Stakeholder confirmation simulated against business rules and warehouse topology.',
    leadAgent: 'Project Manager',
    durationEstimate: '0.5m'
  },
  {
    id: 'stage-5',
    name: 'Architecture',
    stageNumber: 5,
    status: 'completed',
    description: 'Hexagonal clean architecture, isolated warehouse bounded contexts, and transaction isolation level mapped.',
    leadAgent: 'Solution Architect',
    durationEstimate: '2.1m'
  },
  {
    id: 'stage-6',
    name: 'Team Assembly',
    stageNumber: 6,
    status: 'completed',
    description: '8 autonomous AI agent profiles initialized with prompt contracts, tools, and budget allocations.',
    leadAgent: 'Project Manager',
    durationEstimate: '0.2m'
  },
  {
    id: 'stage-7',
    name: 'Build',
    stageNumber: 7,
    status: 'active',
    description: 'Full-stack engineering of React frontend components, FastAPI backend endpoints, and PostgreSQL data persistence.',
    leadAgent: 'Full-Stack Engineer',
    durationEstimate: 'In Progress (68%)'
  },
  {
    id: 'stage-8',
    name: 'Review',
    stageNumber: 8,
    status: 'completed',
    description: 'Autonomous static code analysis, linting, complexity checks, and clean code gate passed.',
    leadAgent: 'Solution Architect',
    durationEstimate: '0.9m'
  },
  {
    id: 'stage-9',
    name: 'QA & Security',
    stageNumber: 9,
    status: 'active',
    description: 'Strict verification gate: Unit, integration, E2E concurrency tests, SAST scan, and RBAC policy audit.',
    leadAgent: 'QA Engineer & Security Specialist',
    durationEstimate: 'Active Testing'
  },
  {
    id: 'stage-10',
    name: 'Deploy',
    stageNumber: 10,
    status: 'pending',
    description: 'Automated CI/CD staging deployment and environment smoke tests (blocked until QA & Sec pass).',
    leadAgent: 'DevOps Engineer',
    durationEstimate: 'Awaiting Gate'
  },
  {
    id: 'stage-11',
    name: 'Monitor',
    stageNumber: 11,
    status: 'pending',
    description: 'Autonomous runtime health telemetry, error rate tracking, and latency monitoring.',
    leadAgent: 'DevOps Engineer',
    durationEstimate: 'Planned'
  },
  {
    id: 'stage-12',
    name: 'Iterate',
    stageNumber: 12,
    status: 'pending',
    description: 'Continuous feedback loop, auto-triage of telemetry anomalies, and scheduled sprint refinement.',
    leadAgent: 'Business Analyst & PM',
    durationEstimate: 'RAD Cycle'
  }
];

export const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: 'req-1',
    code: 'REQ-001',
    title: 'User authentication',
    type: 'Security',
    category: 'Security & RBAC',
    priority: 'Critical',
    owner: 'Business Analyst & Security',
    assignedAgent: 'Security Specialist',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-001.1 Users must authenticate via secure credentials with JWT token issuance.',
      'AC-001.2 Expired or tampered tokens must immediately return HTTP 401 Unauthorized.',
      'AC-001.3 Password storage must utilize salted Argon2id / bcrypt hashing.'
    ],
    linkedTasks: [
      { code: 'TASK-01', title: 'User authentication service & JWT token dispatcher' },
      { code: 'TASK-02', title: 'Login & session management interface' }
    ],
    implementationFiles: ['/src/security/authService.ts', '/src/components/auth/LoginForm.tsx'],
    linkedTests: [
      { code: 'TEST-01', name: 'Valid credentials JWT issuance test', status: 'PASS' },
      { code: 'TEST-02', name: 'Tampered token 401 rejection test', status: 'PASS' }
    ],
    qaEvidence: 'Auth suite 100% passed: Token lifecycle, refresh expiration, and revocation verified.',
    securityEvidence: 'SAST and token entropy audit passed with zero secrets in memory.'
  },
  {
    id: 'req-2',
    code: 'REQ-002',
    title: 'Role-based access',
    type: 'Security',
    category: 'Security & RBAC',
    priority: 'High',
    owner: 'Solution Architect',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Blocked',
    qaStatus: 'Passed',
    securityStatus: 'Finding Detected',
    verificationStatus: 'In Development',
    acceptanceCriteria: [
      'AC-002.1 Distinct roles enforced: Administrator, Warehouse Manager, Warehouse Staff.',
      'AC-002.2 Staff attempting restricted stock adjustments must be denied with HTTP 403.',
      'AC-002.3 Manager credentials required for write-offs and large stock variance logs.'
    ],
    linkedTasks: [
      { code: 'TASK-03', title: 'RBAC claims middleware & route decorator' },
      { code: 'TASK-04', title: 'Role permission policy matrix' }
    ],
    implementationFiles: ['/src/security/rbacMatrix.ts', '/src/middleware/rbacGuard.ts'],
    linkedTests: [
      { code: 'TEST-05', name: 'Manager stock adjustment authorization check', status: 'PASS' },
      { code: 'TEST-06', name: 'Staff role 403 authorization guard verification', status: 'FAIL' }
    ],
    qaEvidence: 'Functionally correct for manager role, but security regression detected unauthorized staff access.',
    securityEvidence: 'SEC-001 (Medium Severity): Warehouse Staff can invoke stock adjustment endpoint directly.'
  },
  {
    id: 'req-3',
    code: 'REQ-003',
    title: 'Product management',
    type: 'Functional',
    category: 'Core Inventory',
    priority: 'Critical',
    owner: 'Business Analyst',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-003.1 Staff can create, edit, and categorize SKU products across inventory catalogs.',
      'AC-003.2 SKU barcodes (Code128 / EAN-13) must be validated for unique global constraint.',
      'AC-003.3 Product metadata includes unit weight, dimensions, supplier ID, and safety stock.'
    ],
    linkedTasks: [
      { code: 'TASK-05', title: 'Product catalog schema & CRUD handlers' },
      { code: 'TASK-06', title: 'SKU barcode validator & modal' }
    ],
    implementationFiles: ['/src/services/catalogService.ts', '/src/components/inventory/ProductGrid.tsx'],
    linkedTests: [
      { code: 'TEST-09', name: 'Product catalog CRUD operations test', status: 'PASS' },
      { code: 'TEST-10', name: 'Duplicate SKU constraint validation test', status: 'PASS' }
    ],
    qaEvidence: 'Passed on synthetic dataset of 1,200 unique SKUs with zero duplicate collisions.',
    securityEvidence: 'All SQL statements parameterized; input parser sanitizes potential XSS.'
  },
  {
    id: 'req-4',
    code: 'REQ-004',
    title: 'Warehouse management',
    type: 'Functional',
    category: 'Multi-Warehouse',
    priority: 'High',
    owner: 'Business Analyst',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-004.1 System supports multiple physical warehouse nodes (Austin, Chicago, Houston).',
      'AC-004.2 Each warehouse maintains isolated SKU stock balances and maximum volumetric capacity.',
      'AC-004.3 Warehouse managers can view node-specific utilization metrics.'
    ],
    linkedTasks: [
      { code: 'TASK-07', title: 'Warehouse node model & multi-tenant isolation' },
      { code: 'TASK-08', title: 'Capacity calculation service' }
    ],
    implementationFiles: ['/src/services/warehouseService.ts', '/src/components/warehouse/NodeList.tsx'],
    linkedTests: [{ code: 'TEST-14', name: 'Warehouse capacity utilization evaluation', status: 'PASS' }],
    qaEvidence: 'Multi-warehouse isolation verified across Austin, Chicago, and Houston partitions.',
    securityEvidence: 'Clean data separation; cross-warehouse leakage impossible without valid transfer ID.'
  },
  {
    id: 'req-5',
    code: 'REQ-005',
    title: 'Stock receiving',
    type: 'Functional',
    category: 'Core Inventory',
    priority: 'High',
    owner: 'Business Analyst',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-005.1 Staff can record incoming supplier shipments against purchase order numbers.',
      'AC-005.2 Received stock increments warehouse inventory balance atomically upon dock confirmation.',
      'AC-005.3 Damaged or rejected items trigger an automated discrepancy record.'
    ],
    linkedTasks: [
      { code: 'TASK-09', title: 'Stock receiving API & PO reconciliation' },
      { code: 'TASK-10', title: 'Receiving dock inspection UI' }
    ],
    implementationFiles: ['/src/services/receivingService.ts', '/src/components/inventory/ReceivingModal.tsx'],
    linkedTests: [{ code: 'TEST-18', name: 'Stock receiving atomic ledger increment test', status: 'PASS' }],
    qaEvidence: 'PO matching and stock increment verified across 50 receiving iterations.',
    securityEvidence: 'PO input parameters sanitized against SQL injection.'
  },
  {
    id: 'req-6',
    code: 'REQ-006',
    title: 'Stock transfer',
    type: 'Functional',
    category: 'Multi-Warehouse',
    priority: 'Critical',
    owner: 'Business Analyst & Architect',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Rework',
    qaStatus: 'Rejected',
    securityStatus: 'Reviewing',
    verificationStatus: 'QA',
    acceptanceCriteria: [
      'AC-006.1 Source warehouse must have sufficient unreserved stock prior to transfer dispatch.',
      'AC-006.2 Destination warehouse stock must increase exactly upon transit receipt confirmation.',
      'AC-006.3 Transfer must be recorded in immutable audit log with user, timestamp, and signature.',
      'AC-006.4 Unauthorized users cannot approve restricted transfers.'
    ],
    linkedTasks: [
      { code: 'TASK-12', title: 'Backend transfer API' },
      { code: 'TASK-13', title: 'Transfer interface' },
      { code: 'TASK-14', title: 'Authorization validation' }
    ],
    implementationFiles: [
      '/src/services/transferService.ts',
      '/src/database/transactions/atomicTransfer.ts',
      '/src/components/transfers/TransferModal.tsx'
    ],
    linkedTests: [
      { code: 'TEST-21', name: 'Transfer state machine transition test', status: 'PASS' },
      { code: 'TEST-22', name: 'Source warehouse deduction validation', status: 'PASS' },
      { code: 'TEST-23', name: 'Multi-warehouse race condition under concurrent transfer', status: 'FAIL' }
    ],
    qaEvidence: 'TEST-23 FAIL: Concurrency race condition detected under 50 simultaneous transfer calls. Over-allocation of 4 units occurred.',
    securityEvidence: 'Security review pending fix: Concurrency flaw could lead to double-spend inventory defect.'
  },
  {
    id: 'req-7',
    code: 'REQ-007',
    title: 'Low-stock alerts',
    type: 'Functional',
    category: 'Alerting',
    priority: 'High',
    owner: 'Business Analyst',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-007.1 System triggers notification when SKU count drops below safety stock threshold.',
      'AC-007.2 Amber warning displayed when stock is within 15% of safety threshold.',
      'AC-007.3 Critical Red alert displayed when inventory count reaches 0.'
    ],
    linkedTasks: [
      { code: 'TASK-15', title: 'Threshold evaluation engine' },
      { code: 'TASK-16', title: 'Low-stock banner & notification dispatcher' }
    ],
    implementationFiles: ['/src/services/alertEngine.ts', '/src/components/alerts/LowStockBanner.tsx'],
    linkedTests: [
      { code: 'TEST-25', name: 'Low-stock threshold boundary calculation', status: 'PASS' },
      { code: 'TEST-26', name: 'Alert notification dispatch test', status: 'PASS' }
    ],
    qaEvidence: 'Alert evaluation engine verified with 100 threshold boundary test permutations.',
    securityEvidence: 'Notification payloads sanitized against email header injection.'
  },
  {
    id: 'req-8',
    code: 'REQ-008',
    title: 'Inventory dashboard',
    type: 'Functional',
    category: 'Reporting',
    priority: 'Medium',
    owner: 'UI/UX Designer & BA',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-008.1 Dashboard displays real-time SKU counts across Austin, Chicago, and Houston.',
      'AC-008.2 Visual indicators for active transfers, pending approvals, and low-stock alerts.',
      'AC-008.3 Sub-100ms dashboard widget load time with cached aggregations.'
    ],
    linkedTasks: [
      { code: 'TASK-17', title: 'Inventory KPI aggregation service' },
      { code: 'TASK-18', title: 'Executive dashboard layout & gauges' }
    ],
    implementationFiles: ['/src/components/dashboard/InventoryDashboard.tsx', '/src/services/dashboardService.ts'],
    linkedTests: [{ code: 'TEST-29', name: 'Dashboard widget aggregation benchmark test', status: 'PASS' }],
    qaEvidence: 'Load tests confirmed 45ms average render latency for dashboard metrics.',
    securityEvidence: 'Aggregation queries prevent unauthorized cross-tenant data access.'
  },
  {
    id: 'req-9',
    code: 'REQ-009',
    title: 'Inventory reports',
    type: 'Functional',
    category: 'Reporting',
    priority: 'High',
    owner: 'Business Analyst',
    assignedAgent: 'Full-Stack Engineer',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-009.1 Generates inventory valuation reports using FIFO and weighted-average cost basis.',
      'AC-009.2 Stock aging analysis categorizes inventory into <30d, 30-60d, 60-90d, >90d buckets.',
      'AC-009.3 Export capability supports CSV and PDF report generation for managers.'
    ],
    linkedTasks: [
      { code: 'TASK-19', title: 'FIFO stock valuation calculator' },
      { code: 'TASK-20', title: 'Inventory aging & report export worker' }
    ],
    implementationFiles: ['/src/services/valuationService.ts', '/src/components/reports/ValuationReport.tsx'],
    linkedTests: [{ code: 'TEST-33', name: 'FIFO valuation precision benchmark test', status: 'PASS' }],
    qaEvidence: 'Valuation calculations matched accounting benchmark tolerance within 0.001%.',
    securityEvidence: 'Report download endpoints require Manager or Admin authorization.'
  },
  {
    id: 'req-10',
    code: 'REQ-010',
    title: 'Audit history',
    type: 'Security',
    category: 'Auditing',
    priority: 'Critical',
    owner: 'Solution Architect & Security',
    assignedAgent: 'Security Specialist',
    implementationStatus: 'Completed',
    qaStatus: 'Passed',
    securityStatus: 'Passed',
    verificationStatus: 'Verified',
    acceptanceCriteria: [
      'AC-010.1 Every stock modification (adjustment, transfer, receipt) creates an immutable audit record.',
      'AC-010.2 Audit entries capture user ID, timestamp, IP address, previous quantity, and new quantity.',
      'AC-010.3 Cryptographic hash-chaining prevents audit log truncation or tampering.'
    ],
    linkedTasks: [
      { code: 'TASK-21', title: 'Immutable hash-chained audit logger' },
      { code: 'TASK-22', title: 'Audit log viewer & verification interface' }
    ],
    implementationFiles: ['/src/database/audit/hashChainLogger.ts', '/src/components/audit/AuditTable.tsx'],
    linkedTests: [{ code: 'TEST-37', name: 'Cryptographic hash-chain tampering detection test', status: 'PASS' }],
    qaEvidence: 'Simulated log tampering test successfully detected and flagged unauthorized modification.',
    securityEvidence: 'SOC2-compliant append-only storage model verified by Security Specialist.'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-11',
    code: 'TASK-11',
    title: 'Login UI & Session Token Handler',
    requirementCode: 'REQ-001',
    requirementTitle: 'User authentication',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'qa',
    priority: 'Critical',
    branch: 'feat/req-001-login-ui',
    commitHash: '2b44e01',
    description: 'React responsive login form with Argon2id token management, auto-refresh cookie, and error boundary.',
    progressPercent: 95,
    dependencies: ['TASK-01'],
    acceptanceCriteria: [
      'AC-001.1 Users authenticate with valid email/password and receive signed JWT.',
      'AC-001.2 Invalid credentials return descriptive error with 3-attempt throttle.',
      'AC-001.3 Session token persists across browser tabs securely.'
    ],
    filesChanged: [
      '/src/components/auth/LoginForm.tsx',
      '/src/security/authClient.ts',
      '/src/context/AuthContext.tsx'
    ],
    testResults: [
      { code: 'TEST-01', name: 'Valid login credential submission test', status: 'PASS' },
      { code: 'TEST-02', name: 'Expired token session flush test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    codeReviewComment: 'Clean React form hook integration. Token stored in memory with HTTP-only cookie.',
    qaResult: 'Testing',
    qaComment: 'Automated Playwright login flow running in staging environment.',
    securityResult: 'Passed',
    securityComment: 'No hardcoded credentials; form inputs sanitized against XSS.'
  },
  {
    id: 't-12',
    code: 'TASK-12',
    title: 'Stock Transfer API & Transaction Lock',
    requirementCode: 'REQ-006',
    requirementTitle: 'Stock transfer',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'code_review',
    priority: 'Critical',
    branch: 'feat/req-006-transfer-api',
    commitHash: 'c8f3b2a',
    description: 'FastAPI multi-warehouse stock transfer endpoint with atomic transaction boundaries and stock validation.',
    progressPercent: 85,
    dependencies: ['TASK-07', 'TASK-09'],
    acceptanceCriteria: [
      'AC-006.1 Source warehouse inventory balance must hold unreserved quantity before dispatch.',
      'AC-006.2 Destination warehouse inventory balance must increment exactly on receipt.',
      'AC-006.3 Concurrent transfer calls must not produce negative stock balances.'
    ],
    filesChanged: [
      '/src/api/routes/transfers.py',
      '/src/services/transferService.ts',
      '/src/database/transactions/atomicTransfer.ts'
    ],
    testResults: [
      { code: 'TEST-21', name: 'Transfer state machine transition test', status: 'PASS' },
      { code: 'TEST-22', name: 'Source warehouse deduction validation', status: 'PASS' },
      { code: 'TEST-23', name: 'Multi-warehouse race condition under concurrent transfer', status: 'FAIL' }
    ],
    codeReviewStatus: 'Changes Requested',
    codeReviewComment: 'Requires explicit SELECT FOR UPDATE pessimistic row lock to prevent race conditions during concurrent transfers.',
    qaResult: 'FAIL',
    qaComment: 'TEST-23 failed under 50 concurrent transfer requests. DEF-03 created.',
    securityResult: 'Reviewing',
    securityComment: 'Double-spend concurrency vulnerability identified.'
  },
  {
    id: 't-13',
    code: 'TASK-13',
    title: 'Transfer UI & Multi-Warehouse Selector',
    requirementCode: 'REQ-006',
    requirementTitle: 'Stock transfer',
    assignedAgent: 'UI/UX Designer',
    ownerDisplay: 'UI/UX + Full-Stack',
    status: 'in_development',
    priority: 'High',
    branch: 'feat/req-006-transfer-ui',
    commitHash: 'a71e49d',
    description: 'Interactive transfer modal for selecting source, destination, SKU picker, and real-time quantity validation.',
    progressPercent: 65,
    dependencies: ['TASK-12'],
    acceptanceCriteria: [
      'AC-006.1 Source and destination warehouses must be selectable with stock preview.',
      'AC-006.2 Quantity input cannot exceed available inventory balance.',
      'AC-006.3 Dispatch receipt confirmation drawer prompts warehouse manager.'
    ],
    filesChanged: [
      '/src/components/transfers/TransferModal.tsx',
      '/src/components/transfers/WarehouseDropdown.tsx'
    ],
    testResults: [
      { code: 'TEST-24', name: 'Transfer modal quantity validation unit test', status: 'PASS' }
    ],
    codeReviewStatus: 'In Review',
    codeReviewComment: 'Form validation logic adheres to design tokens.',
    qaResult: 'Pending',
    securityResult: 'Passed'
  },
  {
    id: 't-14',
    code: 'TASK-14',
    title: 'Authorization Validation & RBAC Middleware',
    requirementCode: 'REQ-002',
    requirementTitle: 'Role-based access',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'in_development',
    priority: 'High',
    branch: 'sec/req-002-rbac-guard',
    commitHash: '7d88e12',
    description: 'Enforce Manager and Admin role permission checks before allowing stock adjustments or shrinkage write-offs.',
    progressPercent: 50,
    dependencies: ['TASK-01'],
    acceptanceCriteria: [
      'AC-002.1 Only Manager/Admin roles can perform manual stock count adjustments.',
      'AC-002.2 Regular Warehouse Staff attempting adjustments receive HTTP 403 Forbidden.'
    ],
    filesChanged: [
      '/src/middleware/rbacGuard.ts',
      '/src/controllers/stockAdjustmentController.ts'
    ],
    testResults: [
      { code: 'TEST-05', name: 'Manager stock adjustment authorization check', status: 'PASS' },
      { code: 'TEST-06', name: 'Staff role 403 authorization guard verification', status: 'FAIL' }
    ],
    codeReviewStatus: 'In Review',
    codeReviewComment: 'Security Specialist reviewing token claim decorator.',
    qaResult: 'Testing',
    securityResult: 'Finding Detected',
    securityComment: 'SEC-001 active: Authorization bypass vulnerability being remediated.'
  },
  {
    id: 't-15',
    code: 'TASK-15',
    title: 'Inventory Report & FIFO Valuation Service',
    requirementCode: 'REQ-009',
    requirementTitle: 'Inventory reports',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'ready',
    priority: 'High',
    branch: 'feat/req-009-valuation-report',
    description: 'Service computing FIFO stock valuation, inventory turnover ratios, and aging breakdown across 3 warehouse nodes.',
    progressPercent: 20,
    dependencies: ['TASK-05', 'TASK-07'],
    acceptanceCriteria: [
      'AC-009.1 Calculate valuation using FIFO cost tiers across Austin, Chicago, Houston.',
      'AC-009.2 Group inventory aging into <30d, 30-60d, 60-90d, >90d buckets.'
    ],
    filesChanged: ['/src/services/valuationService.ts'],
    testResults: [],
    codeReviewStatus: 'Pending',
    qaResult: 'Pending',
    securityResult: 'Pending'
  },
  {
    id: 't-16',
    code: 'TASK-16',
    title: 'Barcode Scanner Client & QR Decoder',
    requirementCode: 'REQ-003',
    requirementTitle: 'Product management',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'backlog',
    priority: 'Medium',
    branch: 'feat/req-003-barcode-scanner',
    description: 'Client-side camera scanner and USB barcode wedge reader driver supporting Code128 and EAN-13.',
    progressPercent: 0,
    dependencies: ['TASK-05'],
    acceptanceCriteria: [
      'AC-003.2 Parse raw barcode string and match registered SKU in sub-50ms.'
    ],
    filesChanged: [],
    testResults: [],
    codeReviewStatus: 'Pending',
    qaResult: 'Pending',
    securityResult: 'Pending'
  },
  {
    id: 't-17',
    code: 'TASK-17',
    title: 'Low-Stock Safety Threshold Alert Dispatcher',
    requirementCode: 'REQ-007',
    requirementTitle: 'Low-stock alerts',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'ready_for_release',
    priority: 'High',
    branch: 'feat/req-007-alert-engine',
    commitHash: '91cb094',
    description: 'Background threshold watcher with in-app notification toasts and debounced alert email dispatcher.',
    progressPercent: 100,
    dependencies: ['TASK-05'],
    acceptanceCriteria: [
      'AC-007.1 Flag Amber warning at 15% safety stock threshold.',
      'AC-007.2 Flag Red alert on 0 stock level and dispatch digest.'
    ],
    filesChanged: [
      '/src/services/alertEngine.ts',
      '/src/components/alerts/LowStockBanner.tsx'
    ],
    testResults: [
      { code: 'TEST-25', name: 'Low-stock threshold boundary calculation', status: 'PASS' },
      { code: 'TEST-26', name: 'Alert notification dispatch test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    codeReviewComment: 'Debounce queue prevents duplicate email dispatches.',
    qaResult: 'PASS',
    qaComment: 'Passed all 100 test permutations.',
    securityResult: 'Passed'
  },
  {
    id: 't-01',
    code: 'TASK-01',
    title: 'User Authentication & JWT Token Dispatcher',
    requirementCode: 'REQ-001',
    requirementTitle: 'User authentication',
    assignedAgent: 'Solution Architect',
    ownerDisplay: 'Solution Architect',
    status: 'done',
    priority: 'Critical',
    branch: 'feat/req-001-auth-core',
    commitHash: '1a029fe',
    description: 'Core JWT issuance service with Argon2id password hashing, token claims, and revocation list.',
    progressPercent: 100,
    dependencies: [],
    acceptanceCriteria: [
      'AC-001.1 Secure token issuance with 15-minute expiration.'
    ],
    filesChanged: ['/src/security/authService.ts'],
    testResults: [
      { code: 'TEST-01', name: 'Valid credentials JWT issuance test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    qaResult: 'PASS',
    securityResult: 'Passed'
  },
  {
    id: 't-05',
    code: 'TASK-05',
    title: 'Product Catalog Schema & CRUD Handlers',
    requirementCode: 'REQ-003',
    requirementTitle: 'Product management',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'done',
    priority: 'Critical',
    branch: 'feat/req-003-catalog',
    commitHash: '3e12089',
    description: 'Normalized PostgreSQL schema for SKU products with unique barcode constraints and category taxonomy.',
    progressPercent: 100,
    dependencies: ['TASK-01'],
    acceptanceCriteria: [
      'AC-003.1 Staff can create, edit, and categorize SKU products.'
    ],
    filesChanged: ['/src/services/catalogService.ts'],
    testResults: [
      { code: 'TEST-09', name: 'Product catalog CRUD operations test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    qaResult: 'PASS',
    securityResult: 'Passed'
  },
  {
    id: 't-09',
    code: 'TASK-09',
    title: 'Stock Receiving API & PO Reconciliation',
    requirementCode: 'REQ-005',
    requirementTitle: 'Stock receiving',
    assignedAgent: 'Full-Stack Engineer',
    ownerDisplay: 'Full-Stack Engineer',
    status: 'done',
    priority: 'High',
    branch: 'feat/req-005-receiving',
    commitHash: '8f4301a',
    description: 'Receiving dock transaction handler incrementing warehouse stock upon physical shipment receipt.',
    progressPercent: 100,
    dependencies: ['TASK-05'],
    acceptanceCriteria: [
      'AC-005.1 Staff can record incoming supplier shipments against PO.'
    ],
    filesChanged: ['/src/services/receivingService.ts'],
    testResults: [
      { code: 'TEST-18', name: 'Stock receiving atomic ledger increment test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    qaResult: 'PASS',
    securityResult: 'Passed'
  },
  {
    id: 't-21',
    code: 'TASK-21',
    title: 'Immutable Hash-Chained Audit Logger',
    requirementCode: 'REQ-010',
    requirementTitle: 'Audit history',
    assignedAgent: 'Security Specialist',
    ownerDisplay: 'Security Specialist',
    status: 'done',
    priority: 'Critical',
    branch: 'feat/req-010-audit',
    commitHash: '1a34bc8',
    description: 'Cryptographic SHA-256 hash-chaining engine for append-only audit event logging.',
    progressPercent: 100,
    dependencies: [],
    acceptanceCriteria: [
      'AC-010.1 Every stock modification creates an immutable audit record.'
    ],
    filesChanged: ['/src/database/audit/hashChainLogger.ts'],
    testResults: [
      { code: 'TEST-37', name: 'Cryptographic hash-chain tampering detection test', status: 'PASS' }
    ],
    codeReviewStatus: 'Approved',
    qaResult: 'PASS',
    securityResult: 'Passed'
  }
];

export const INITIAL_DEFECTS: Defect[] = [
  {
    id: 'def-3',
    code: 'DEF-03',
    title: 'Failed stock transfer authorization test & race condition',
    severity: 'High',
    status: 'In Progress',
    relatedTask: 'TASK-12',
    relatedReq: 'REQ-006',
    owner: 'Full-Stack Engineer',
    discoveredBy: 'QA Engineer',
    assignedTo: 'Full-Stack Engineer',
    description: 'Under 50 simultaneous transfer calls, PostgreSQL read-modify-write without pessimistic row lock results in -4 inventory discrepancy.',
    createdAt: '12:34'
  },
  {
    id: 'def-4',
    code: 'DEF-04',
    title: 'Dashboard empty-state rendering issue on zero-inventory nodes',
    severity: 'Low',
    status: 'Open',
    relatedTask: 'TASK-13',
    relatedReq: 'REQ-008',
    owner: 'UI/UX Designer',
    discoveredBy: 'QA Engineer',
    assignedTo: 'UI/UX Designer',
    description: 'When a new warehouse has 0 registered SKUs, capacity gauge renders NaN% instead of 0% empty state placeholder.',
    createdAt: '12:45'
  },
  {
    id: 'def-1',
    code: 'DEF-01',
    title: 'Catalog pagination off-by-one error on last page',
    severity: 'Low',
    status: 'Resolved',
    relatedTask: 'TASK-05',
    relatedReq: 'REQ-003',
    owner: 'Full-Stack Engineer',
    discoveredBy: 'QA Engineer',
    assignedTo: 'Full-Stack Engineer',
    description: 'Requesting page 10 when total items is 100 with pageSize 10 returned empty array instead of item 91-100.',
    createdAt: '11:15'
  },
  {
    id: 'def-2',
    code: 'DEF-02',
    title: 'Low stock email trigger fired twice on simultaneous sales',
    severity: 'Medium',
    status: 'Resolved',
    relatedTask: 'TASK-17',
    relatedReq: 'REQ-007',
    owner: 'Full-Stack Engineer',
    discoveredBy: 'QA Engineer',
    assignedTo: 'Full-Stack Engineer',
    description: 'Lack of debouncing in notification queue resulted in duplicate alert email dispatch.',
    createdAt: '11:42'
  }
];

export const INITIAL_SECURITY_FINDINGS: SecurityFinding[] = [
  {
    id: 'sec-1',
    code: 'SEC-001',
    severity: 'Medium',
    title: 'Broken Function Level Authorization on Stock Adjustment',
    issue: 'Warehouse Staff role can invoke manual stock adjustment endpoint without manager approval.',
    affectedRequirement: 'REQ-002',
    affectedEndpoint: 'POST /api/v1/inventory/adjust',
    status: 'Fix In Progress',
    isReleaseBlocking: true,
    cwe: 'CWE-285: Improper Authorization',
    remediation: 'Attach @Roles(Role.WAREHOUSE_MANAGER, Role.ADMIN) guard decorator to controller method.'
  },
  {
    id: 'sec-2',
    code: 'SEC-002',
    severity: 'Low',
    title: 'Missing Rate Limiting on SKU Barcode Query API',
    issue: 'Unauthenticated requests to public barcode lookup can cause CPU spike.',
    affectedRequirement: 'REQ-003',
    affectedEndpoint: 'GET /api/v1/catalog/lookup-barcode',
    status: 'Open',
    isReleaseBlocking: false,
    cwe: 'CWE-770: Allocation of Resources Without Limits',
    remediation: 'Configure slowapi rate limiting to 120 req/min per client IP.'
  }
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    time: '12:21',
    actor: 'Project Manager',
    actorRole: 'Autonomous Orchestrator',
    action: 'assigned TASK-14 to',
    target: 'Full-Stack Engineer',
    type: 'task',
    tag: 'Workflow',
    details: 'Triggered by Sprint 2 Concurrency Milestone'
  },
  {
    id: 'act-2',
    time: '12:23',
    actor: 'QA Engineer',
    actorRole: 'Verification Agent',
    action: 'rejected verification for',
    target: 'TASK-12 (Stock Transfer API)',
    type: 'qa',
    tag: 'Test Failure',
    details: 'TEST-23 failed: Over-allocation race condition under concurrent transfer requests.'
  },
  {
    id: 'act-3',
    time: '12:24',
    actor: 'System Autonomous Guard',
    actorRole: 'Defect Tracker',
    action: 'automatically created',
    target: 'DEF-03 (Transfer Race Condition)',
    type: 'defect',
    tag: 'Defect Created',
    details: 'Severity: High | Affected Requirement: REQ-006'
  },
  {
    id: 'act-4',
    time: '12:25',
    actor: 'Security Specialist',
    actorRole: 'DevSecOps Auditor',
    action: 'started security review for',
    target: 'SEC-01 (RBAC Policy Audit)',
    type: 'security',
    tag: 'Security Audit',
    details: 'Scanning API authorization guards across all warehouse management routes.'
  },
  {
    id: 'act-5',
    time: '12:27',
    actor: 'Full-Stack Engineer',
    actorRole: 'Code Execution Agent',
    action: 'started simulated fix for',
    target: 'TASK-12 & DEF-03',
    type: 'task',
    tag: 'Fix In Progress',
    details: 'Applying PostgreSQL SELECT FOR UPDATE pessimistic row-level lock.'
  }
];

export const INITIAL_COST_SUMMARY: CostSummary = {
  totalBudget: 5.00,
  totalCostUsed: 1.84,
  budgetUsedPercent: 36.8,
  totalModelCalls: 74,
  retriesCount: 6,
  escalationsCount: 2,
  verifiedRequirements: 8,
  costPerVerifiedReq: 0.23,
  breakdown: [
    { agentRole: 'Full-Stack Engineer', agentName: 'Devon Coder', model: 'Claude 3.7 Sonnet', calls: 32, tokens: '142.5k', costUsd: 0.81 },
    { agentRole: 'Solution Architect', agentName: 'Sophia Architect', model: 'o3-mini (Reasoning)', calls: 8, tokens: '54.2k', costUsd: 0.27 },
    { agentRole: 'QA Engineer', agentName: 'Quinn Tester', model: 'GPT-4o-mini', calls: 14, tokens: '68.1k', costUsd: 0.21 },
    { agentRole: 'Project Manager', agentName: 'Marcus Planner', model: 'GPT-4o', calls: 9, tokens: '38.4k', costUsd: 0.18 },
    { agentRole: 'Security Specialist', agentName: 'Samantha Sentinel', model: 'Claude 3.5 Sonnet', calls: 5, tokens: '26.8k', costUsd: 0.13 },
    { agentRole: 'UI/UX Designer', agentName: 'Elena Design', model: 'Claude 3.5 Sonnet', calls: 4, tokens: '22.0k', costUsd: 0.13 },
    { agentRole: 'Business Analyst', agentName: 'Aria Analyst', model: 'Claude 3.5 Sonnet', calls: 2, tokens: '18.4k', costUsd: 0.11 }
  ]
};

export const INITIAL_DELIVERY_ITEMS: DeliveryItem[] = [
  {
    id: 'del-1',
    title: 'Working Application & Interactive UI',
    category: 'Code & Build',
    status: 'In Progress',
    verifiedBy: 'Full-Stack & QA Agent',
    artifactPath: '/dist/index.html',
    evidenceHash: 'sha256:4a8c9b...e21f'
  },
  {
    id: 'del-2',
    title: 'TypeScript & FastAPI Source Code Repository',
    category: 'Code & Build',
    status: 'Ready',
    verifiedBy: 'Solution Architect',
    artifactPath: '/src/ (Clean Hexagonal Architecture)',
    evidenceHash: 'sha256:7b91d2...a438'
  },
  {
    id: 'del-3',
    title: 'System Requirements Specification (SRS v1.0)',
    category: 'Specifications',
    status: 'Ready',
    verifiedBy: 'Business Analyst',
    artifactPath: '/docs/TayDau_Force_SRS_v1.0.docx',
    evidenceHash: 'sha256:3d8e12...f902'
  },
  {
    id: 'del-4',
    title: 'Detailed Architecture & Design Guide (ADRs)',
    category: 'Specifications',
    status: 'Ready',
    verifiedBy: 'Solution Architect',
    artifactPath: '/docs/Architecture_and_Design_Guide.docx',
    evidenceHash: 'sha256:91c28f...001a'
  },
  {
    id: 'del-5',
    title: 'OpenAPI 3.1 REST API Specification',
    category: 'Specifications',
    status: 'In Progress',
    verifiedBy: 'Full-Stack Engineer',
    artifactPath: '/docs/openapi_v1.json',
    evidenceHash: 'sha256:12e9aa...bc45'
  },
  {
    id: 'del-6',
    title: 'Automated Test Results (Unit, Int, E2E)',
    category: 'Quality Assurance',
    status: 'Available',
    verifiedBy: 'QA Engineer',
    artifactPath: '/reports/test-summary.xml',
    evidenceHash: 'sha256:55ab89...cd12'
  },
  {
    id: 'del-7',
    title: 'Formal QA Quality Gate Report',
    category: 'Quality Assurance',
    status: 'In Progress',
    verifiedBy: 'QA Engineer',
    artifactPath: '/reports/qa-signoff.pdf',
    evidenceHash: 'sha256:ee4199...871b'
  },
  {
    id: 'del-8',
    title: 'DevSecOps & SAST Security Audit Report',
    category: 'Security & Compliance',
    status: 'In Progress',
    verifiedBy: 'Security Specialist',
    artifactPath: '/reports/security-audit.json',
    evidenceHash: 'sha256:7721cc...ef43'
  },
  {
    id: 'del-9',
    title: 'Release Notes & Change Manifest',
    category: 'Release & Operations',
    status: 'Pending',
    verifiedBy: 'Project Manager',
    artifactPath: '/docs/RELEASE_NOTES.md',
    evidenceHash: 'sha256:pending'
  },
  {
    id: 'del-10',
    title: 'Software Bill of Materials (CycloneDX SBOM)',
    category: 'Security & Compliance',
    status: 'Planned',
    verifiedBy: 'DevOps Engineer',
    artifactPath: '/build/sbom.cyclonedx.json',
    evidenceHash: 'sha256:planned'
  },
  {
    id: 'del-11',
    title: 'Alibaba Cloud Deployment & Docker Blueprint',
    category: 'Release & Operations',
    status: 'Pending',
    verifiedBy: 'DevOps Engineer',
    artifactPath: '/infra/alibaba-cloud-ack.yaml',
    evidenceHash: 'sha256:pending'
  }
];

export const DEMO_PROJECT_INFO = {
  name: 'Smart Wholesale Inventory System',
  clientRequirement: 'Build a simple web-based inventory system where our team can add products, update stock quantities, and receive automatic alerts when items drop below safety thresholds.',
  company: 'Apex Logistics Global',
  targetSLA: '99.9% Uptime',
  analysisStatus: 'Analysis Complete',
  baOutput: {
    businessObjective: 'Automate and unify real-time stock control, multi-warehouse transfers, replenishment alerts, and executive inventory valuation for Apex Logistics Global across 3 regional distribution hubs.',
    actors: [
      {
        role: 'Warehouse Staff',
        description: 'Perform item scan, cycle counts, draft transfer requests, and confirm incoming shipments on receiving docks.',
        badge: 'Operational'
      },
      {
        role: 'Warehouse Manager',
        description: 'Approve stock transfers, sign off large stock adjustments, manage replenishment safety thresholds, and inspect facility space.',
        badge: 'Managerial'
      },
      {
        role: 'Administrator',
        description: 'Manage system configuration, assign user RBAC permissions, configure warehouse nodes, and conduct system-wide audits.',
        badge: 'Administrative'
      }
    ],
    functionalScope: [
      'Multi-warehouse inventory cataloging with global SKU indexing',
      'Atomic stock transfers with race-condition prevention across nodes',
      'Configurable safety stock threshold alerting with email/in-app notifications',
      'FIFO inventory valuation and aging reports for executive leadership',
      'Cryptographically attested immutable stock movement audit trail'
    ],
    businessRules: [
      'Stock quantity cannot be negative under any transaction condition',
      'Transfers require both a valid source and destination warehouse',
      'Only managers can approve large stock adjustments and shrinkage write-offs',
      'Low-stock threshold is configurable per individual product SKU'
    ],
    risks: [
      'Concurrent transfer requests causing inventory over-allocation under peak operational load',
      'Unauthorized stock adjustments leading to inventory shrinkage discrepancies',
      'Network latency between regional warehouse barcode scanners and central database'
    ],
    assumptions: [
      'All 3 warehouses possess reliable broadband connectivity with local device caching fallback',
      'Stock items follow standardized EAN-13 or Code128 SKU barcode labeling conventions',
      'PostgreSQL database handles concurrent ACID row locks with sub-50ms transaction latency'
    ]
  },
  warehouses: [
    {
      id: 'wh-austin',
      name: 'Warehouse A — Central Distribution',
      location: 'Austin, Texas',
      capacity: '1,200 SKUs',
      utilization: '78%',
      manager: 'Sarah Jenkins',
      activeTransfers: 3
    },
    {
      id: 'wh-chicago',
      name: 'Warehouse B — North Logistics Hub',
      location: 'Chicago, Illinois',
      capacity: '850 SKUs',
      utilization: '64%',
      manager: 'David Chen',
      activeTransfers: 2
    },
    {
      id: 'wh-houston',
      name: 'Warehouse C — Port Terminal Depo',
      location: 'Houston, Texas',
      capacity: '650 SKUs',
      utilization: '82%',
      manager: 'Elena Rostova',
      activeTransfers: 1
    }
  ]
};
