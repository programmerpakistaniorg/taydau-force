export interface ProjectSummary {
  id: string;
  name: string;
  clientBrief: string;
  status: string;
  stage?: string;
  stageStatus?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NextAction {
  type: 'answer_questions' | 'approve_requirements' | 'approve_design' | 'retry' | 'working' | 'delivery' | 'none';
  label: string | null;
  description: string;
  requiresUser: boolean;
  targetRoute: string;
  entityId?: string;
  count?: number;
  role?: string;
  roleKey?: string;
}

export interface ProjectWorkflow {
  id: string;
  projectId: string;
  stage: string;
  stageStatus: string;
  progress: number;
  nextActionType: string | null;
  nextActionPayload: Record<string, any>;
  requiredRoles: string[];
  activeRole: string | null;
  approvedRequirementBaselineId: string | null;
  approvedDesignSpecId: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorSummary: string | null;
  startedAt: string;
  updatedAt: string;
}

export interface ProjectFact {
  id: string;
  factKey: string;
  category: string;
  value: any;
  sourceRole: string;
  sourceType: string;
  confirmationStatus: string;
  confidence: number;
  version: number;
  isCurrent: boolean;
  createdAt: string;
}

export interface ClientInteraction {
  id: string;
  agentRole: string;
  workflowStage: string;
  factKey: string;
  interactionType: 'single_choice' | 'multi_choice' | 'free_text' | 'recommendation' | 'approval' | 'confirmation';
  question: string;
  whyItMatters: string;
  options: string[];
  recommendedOption?: string;
  allowCustom?: boolean;
  impact?: 'low' | 'medium' | 'high' | 'critical';
  required?: boolean;
  status: 'pending' | 'answered' | 'cancelled' | 'superseded';
  answer?: any;
  createdAt: string;
  answeredAt?: string;
}

export interface ApprovalRequest {
  id: string;
  artifactType: 'requirements' | 'design';
  artifactId: string;
  artifactVersion: number;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  feedback?: string;
  scopeClassification?: 'design_only' | 'possible_scope_change' | 'not_applicable';
  createdAt: string;
  decidedAt?: string;
}

export interface RequirementBaseline {
  id: string;
  version: number;
  status: string;
  snapshot: any;
  createdAt: string;
  approvedAt?: string;
}

export interface DesignScreen {
  id: string;
  name: string;
  purpose: string;
  route: string;
  primaryUser: string;
  sections: string[];
  primaryActions: string[];
  wireframeElements: string[];
  imageUrl?: string;
  htmlContent?: string;
  provider?: string;
  providerProjectId?: string;
  providerScreenId?: string;
  sha256?: string;
}

export interface DesignArtifact {
  id: string;
  designSpecId: string;
  provider: string;
  providerProjectId?: string;
  providerScreenId?: string;
  screenKey: string;
  artifactType: 'preview_image' | 'html' | 'design_system';
  providerUrl?: string;
  content?: string;
  contentSha256: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DesignSpec {
  id: string;
  version: number;
  status: string;
  summary: string;
  design: {
    productExperienceSummary: string;
    uxGoals: string[];
    screens: DesignScreen[];
    navigation: {
      type: string;
      items: Array<{ label: string; route: string; iconName?: string }>;
    };
    userFlows: Array<{ name: string; steps: string[] }>;
    designSystem: {
      styleDirection: string;
      colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
      };
      typography: {
        headingFont: string;
        bodyFont: string;
      };
      componentPrinciples: string[];
    };
    responsiveBehavior: string;
    loadingStates: string[];
    emptyStates: string[];
    errorStates: string[];
    assumptions: string[];
  };
  previousVersionId?: string;
  revisionReason?: string;
  clientFeedback?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface InterruptionMetrics {
  totalQuestions: number;
  questionsAnswered: number;
  questionsPending: number;
  questionsPerRole: Record<string, number>;
  approvalsCount: number;
  totalInterruptions: number;
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
    code?: string;
    title: string;
    decision: string;
    rationale?: string;
    status?: string;
    context?: string;
    consequences?: string;
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
  status?: string;
  testType?: string;
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
  checks: ReleaseCheck[] | Record<string, boolean>;
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
  type: string;
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
  workflow: ProjectWorkflow;
  nextAction: NextAction;
  interruptionMetrics: InterruptionMetrics;
  projectFacts: ProjectFact[];
  clientInteractions: ClientInteraction[];
  pendingInteractions: ClientInteraction[];
  approvalRequests: ApprovalRequest[];
  pendingApproval: ApprovalRequest | null;
  requirementBaselines: RequirementBaseline[];
  designSpecs: DesignSpec[];
  designArtifacts?: DesignArtifact[];
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
