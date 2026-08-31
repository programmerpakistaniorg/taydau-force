export type RoleKey =
  | 'business_analyst'
  | 'project_manager'
  | 'ui_ux_designer'
  | 'solution_architect'
  | 'engineer'
  | 'code_reviewer'
  | 'qa_engineer';

export type QuestionDomain =
  | 'business'
  | 'delivery'
  | 'experience'
  | 'technical_business_constraint'
  | 'implementation';

export interface RoleMetadata {
  roleKey: RoleKey;
  displayName: string;
  personaName: string;
  roleTitle: string;
  avatarText: string;
  avatarBg: string;
  badgeVariant: 'blue' | 'teal' | 'purple' | 'amber' | 'pink' | 'indigo' | 'emerald';
  questionDomain: QuestionDomain;
  description: string;
  responsibility: string;
  displayOrder: number;
  isCoreSpecialist: boolean;
}

export const ROLE_REGISTRY: Record<RoleKey, RoleMetadata> = {
  business_analyst: {
    roleKey: 'business_analyst',
    displayName: 'Business Analyst',
    personaName: 'Aria Analyst',
    roleTitle: 'Lead Business Analyst',
    avatarText: 'BA',
    avatarBg: 'bg-blue-100 text-blue-800',
    badgeVariant: 'blue',
    questionDomain: 'business',
    description: 'Understands your business idea and turns it into structured, testable requirements.',
    responsibility: 'Requirements Elicitation, User Stories & Acceptance Criteria',
    displayOrder: 1,
    isCoreSpecialist: true,
  },
  project_manager: {
    roleKey: 'project_manager',
    displayName: 'Project Manager',
    personaName: 'Marcus Planner',
    roleTitle: 'Senior Delivery Manager',
    avatarText: 'PM',
    avatarBg: 'bg-teal-100 text-teal-800',
    badgeVariant: 'teal',
    questionDomain: 'delivery',
    description: 'Prepares the delivery approach, sequences milestones, and organizes specialist plans.',
    responsibility: 'Scope Management, Milestone Sequencing & Delivery Plan',
    displayOrder: 2,
    isCoreSpecialist: true,
  },
  ui_ux_designer: {
    roleKey: 'ui_ux_designer',
    displayName: 'UI/UX Designer',
    personaName: 'Sofia Designer',
    roleTitle: 'Lead Product Experience Designer',
    avatarText: 'UX',
    avatarBg: 'bg-pink-100 text-pink-800',
    badgeVariant: 'pink',
    questionDomain: 'experience',
    description: 'Converts approved requirements into intuitive wireframes, navigation, and interactive previews.',
    responsibility: 'Information Architecture, Wireframe Previews & Design System',
    displayOrder: 3,
    isCoreSpecialist: true,
  },
  solution_architect: {
    roleKey: 'solution_architect',
    displayName: 'Solution Architect',
    personaName: 'Arthur Blueprint',
    roleTitle: 'Principal Solution Architect',
    avatarText: 'SA',
    avatarBg: 'bg-indigo-100 text-indigo-800',
    badgeVariant: 'indigo',
    questionDomain: 'technical_business_constraint',
    description: 'Designs technical architecture, data schemas, API contracts, and security boundaries.',
    responsibility: 'Technical Blueprint, SQLite Schema & Interface Contracts',
    displayOrder: 4,
    isCoreSpecialist: true,
  },
  engineer: {
    roleKey: 'engineer',
    displayName: 'Full-Stack Engineer',
    personaName: 'Devon Coder',
    roleTitle: 'Senior Full-Stack Engineer',
    avatarText: 'FE',
    avatarBg: 'bg-purple-100 text-purple-800',
    badgeVariant: 'purple',
    questionDomain: 'implementation',
    description: 'Implements production source code, API routes, database logic, and validation.',
    responsibility: 'Production Python Implementation & Schema Verification',
    displayOrder: 5,
    isCoreSpecialist: true,
  },
  code_reviewer: {
    roleKey: 'code_reviewer',
    displayName: 'Code Reviewer',
    personaName: 'Dr. Evelyn Auditor',
    roleTitle: 'Principal Code & Security Auditor',
    avatarText: 'CR',
    avatarBg: 'bg-rose-100 text-rose-800',
    badgeVariant: 'teal',
    questionDomain: 'technical_business_constraint',
    description: 'Independently audits code maintainability, security, and architectural compliance.',
    responsibility: 'Static Quality Gate, Architectural Audit & Security Linting',
    displayOrder: 6,
    isCoreSpecialist: true,
  },
  qa_engineer: {
    roleKey: 'qa_engineer',
    displayName: 'Independent QA Tester',
    personaName: 'Quinn Tester',
    roleTitle: 'Lead Independent Verification Engineer',
    avatarText: 'QA',
    avatarBg: 'bg-amber-100 text-amber-800',
    badgeVariant: 'amber',
    questionDomain: 'business',
    description: 'Derives test suites independently from requirements without seeing implementation code.',
    responsibility: 'Independent Test Derivation & Air-Gapped Sandbox Execution',
    displayOrder: 7,
    isCoreSpecialist: true,
  },
};

export const ORDERED_ROLES = Object.values(ROLE_REGISTRY).sort(
  (a, b) => a.displayOrder - b.displayOrder
);
