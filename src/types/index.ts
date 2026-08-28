export type AgentStatus = 'Completed' | 'Active' | 'Working' | 'Testing' | 'Waiting' | 'Reviewing' | 'Idle' | 'Activated' | 'Not Required' | 'Planned';

export interface Agent {
  id: string;
  role: string;
  name: string;
  status: AgentStatus;
  specialization: string;
  isCoreTeam: boolean;
  activationStatus?: 'Activated' | 'Not Required' | 'Planned';
  currentTask?: string;
  tasksCompleted: number;
  costUsd: number;
  model: string;
  avatarBg: string;
  avatarText: string;
  badgeVariant: 'success' | 'blue' | 'amber' | 'slate' | 'teal' | 'purple';
  inputs?: string[];
  outputs?: string[];
  permissionsCan?: string[];
  permissionsCannot?: string[];
}

export interface LifecycleStage {
  id: string;
  name: string;
  stageNumber: number;
  status: 'completed' | 'active' | 'pending' | 'blocked';
  description: string;
  leadAgent: string;
  durationEstimate: string;
}

export type RequirementPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type VerificationStatus = 'Verified' | 'In Development' | 'QA' | 'Pending' | 'Rejected' | 'Blocked';

export interface Requirement {
  id: string;
  code: string;
  title: string;
  type: 'Functional' | 'Security' | 'Integration' | 'Non-Functional';
  category: 'Core Inventory' | 'Multi-Warehouse' | 'Alerting' | 'Reporting' | 'Security & RBAC' | 'Auditing';
  priority: RequirementPriority;
  owner: string;
  assignedAgent: string;
  implementationStatus: 'Completed' | 'In Progress' | 'Pending' | 'Blocked' | 'Rework';
  qaStatus: 'Passed' | 'Testing' | 'Rejected' | 'Pending';
  securityStatus: 'Passed' | 'Finding Detected' | 'Reviewing' | 'Pending';
  verificationStatus: VerificationStatus;
  acceptanceCriteria: string[];
  linkedTasks: {
    code: string;
    title: string;
  }[];
  implementationFiles: string[];
  linkedTests: {
    code: string;
    name: string;
    status: 'PASS' | 'FAIL' | 'PENDING' | 'RUNNING';
  }[];
  qaEvidence: string;
  securityEvidence: string;
}

export type KanbanLane =
  | 'backlog'
  | 'ready'
  | 'in_development'
  | 'code_review'
  | 'qa'
  | 'ready_for_release'
  | 'done';

export interface Task {
  id: string;
  code: string;
  title: string;
  requirementCode: string;
  requirementTitle?: string;
  assignedAgent: string;
  ownerDisplay?: string;
  status: KanbanLane;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  branch: string;
  commitHash?: string;
  description: string;
  progressPercent: number;
  dependencies?: string[];
  acceptanceCriteria?: string[];
  filesChanged?: string[];
  testResults?: {
    code: string;
    name: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
  }[];
  codeReviewStatus?: 'Approved' | 'Changes Requested' | 'In Review' | 'Pending';
  codeReviewComment?: string;
  qaResult?: 'PASS' | 'FAIL' | 'Testing' | 'Pending';
  qaComment?: string;
  securityResult?: 'Passed' | 'Finding Detected' | 'Reviewing' | 'Pending';
  securityComment?: string;
}

export interface Defect {
  id: string;
  code: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'In Fix' | 'Resolved' | 'Verified';
  relatedTask: string;
  owner?: string;
  relatedReq: string;
  discoveredBy: string;
  assignedTo: string;
  description: string;
  createdAt: string;
}

export interface SecurityFinding {
  id: string;
  code: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  issue: string;
  affectedRequirement: string;
  affectedEndpoint: string;
  status: 'Fix In Progress' | 'Open' | 'Resolved';
  isReleaseBlocking: boolean;
  cwe: string;
  remediation: string;
}

export interface ActivityItem {
  id: string;
  time: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  type: 'task' | 'qa' | 'security' | 'defect' | 'governor' | 'system';
  tag?: string;
  details?: string;
}

export interface CostSummary {
  totalBudget: number;
  budgetTotalUsd?: number;
  totalCostUsed: number;
  budgetUsedPercent: number;
  totalModelCalls: number;
  retriesCount: number;
  escalationsCount: number;
  verifiedRequirements: number;
  costPerVerifiedReq: number;
  breakdown: {
    agentRole: string;
    agentName: string;
    model: string;
    calls: number;
    tokens: string;
    costUsd: number;
  }[];
}

export interface DeliveryItem {
  id: string;
  title: string;
  category: 'Code & Build' | 'Specifications' | 'Quality Assurance' | 'Security & Compliance' | 'Release & Operations';
  status: 'Ready' | 'In Progress' | 'Pending' | 'Planned' | 'Available';
  verifiedBy: string;
  artifactPath: string;
  evidenceHash: string;
}
