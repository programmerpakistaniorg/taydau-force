export interface ProjectSummary {
  id: string;
  name: string;
  clientBrief: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendRequirement {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  acceptanceCriteria: string[];
  status: string;
  createdAt: string;
}

export interface BackendTask {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dependencies: string[];
  assignedRole: string;
  requirementId?: string;
  createdAt: string;
}

export interface BackendArchitecture {
  id: string;
  techStack: {
    framework: string;
    database: string;
    language: string;
    libraries?: string[];
    [key: string]: any;
  };
  fileStructure: Array<{
    path: string;
    purpose: string;
    [key: string]: any;
  }>;
  implementationSpec: string;
  decisions: Array<{
    title: string;
    decision: string;
    rationale: string;
  }>;
  createdAt: string;
}

export interface BackendCodeArtifact {
  id: string;
  taskId: string;
  taskCodes: string[];
  filePath: string;
  content: string;
  language: string;
  generatedBy: string;
  artifactType: string;
  version: number;
  sha256?: string;
  createdAt: string;
}

export interface BackendQATestArtifact {
  id: string;
  filePath: string;
  content: string;
  language: string;
  generatedBy: string;
  requirementCodes: string[];
  version: number;
  isFrozen?: boolean;
  sha256?: string;
  createdAt: string;
}

export interface BackendQASuite {
  suiteSha256: string;
  suiteHash?: string;
  qaModel?: string;
  fileCount: number;
  isFrozen: boolean;
  version: number;
  createdAt: string;
}

export interface BackendTestRun {
  id: string;
  exitCode: number;
  status: 'passed' | 'failed' | 'error';
  testType: string;
  durationMs: number;
  testsPassed: number;
  testsFailed: number;
  stdout: string;
  stderr: string;
  createdAt: string;
}

export interface BackendDefect {
  id: string;
  code: string;
  title: string;
  severity: string;
  status: string;
  description: string;
  evidence: any;
  reworkAttempt?: number;
  resolvedBy?: string;
  faultOrigin?: string;
  isControlledFault?: boolean;
  createdAt: string;
}

export interface BackendCodeReviewFinding {
  code: string;
  title?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  isBlocking: boolean;
  category: string;
  filePath: string | null;
  description: string;
  recommendation: string;
  relatedRequirementCodes: string[];
}

export interface BackendCodeReview {
  summary: string;
  findings: BackendCodeReviewFinding[];
  architectureCompliance: {
    status: 'pass' | 'warning' | 'fail';
    notes: string[];
  };
  maintainabilityAssessment: string;
  modelId: string;
  createdAt: string;
}

export interface BackendSecurityFinding {
  id: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  filePath: string | null;
  evidence: string;
  status: string;
  createdAt: string;
}

export interface ReleaseCheck {
  name: string;
  category: 'requirements' | 'qa' | 'security' | 'review' | 'traceability';
  passed: boolean;
  details: string;
}

export interface BackendReleaseReadiness {
  isReady: boolean;
  checks: ReleaseCheck[];
  evaluatedAt: string;
}

export interface BackendLLMCall {
  id: string;
  agentRole: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface BackendActivity {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  type: 'task' | 'qa' | 'security' | 'defect' | 'governor' | 'system';
  tag?: string;
  details?: string;
  createdAt: string;
}

export interface BackendCostSummary {
  totalBudget: number;
  totalCostUsed: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalModelCalls: number;
  verifiedRequirements: number;
  costPerVerifiedReq: number;
  budgetUsedPercent: number;
  byRole?: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    model: string;
  }>;
}

export interface FullProjectResponse {
  id: string;
  name: string;
  clientBrief: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requirements: BackendRequirement[];
  tasks: BackendTask[];
  architecture: BackendArchitecture | null;
  codeArtifacts: BackendCodeArtifact[];
  qaTestArtifacts: BackendQATestArtifact[];
  qaSuite: BackendQASuite | null;
  testRuns: BackendTestRun[];
  defects: BackendDefect[];
  codeReview: BackendCodeReview | null;
  securityFindings: BackendSecurityFinding[];
  releaseReadiness: BackendReleaseReadiness | null;
  llmCalls: BackendLLMCall[];
  activities: BackendActivity[];
  costSummary: BackendCostSummary;
}
