import React, { useState } from 'react';
import {
  Users,
  Cpu,
  Zap,
  CheckCircle2,
  Clock,
  Coins,
  Shield,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Ban,
  ArrowRight,
  Info,
  Check,
  X,
  FileCode,
  TestTube2,
  Search,
  Eye
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { useSimulation } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { Agent } from '../types';

const LIVE_ROLES = [
  {
    roleKey: 'business_analyst',
    role: 'Business Analyst',
    name: 'Aria Analyst',
    model: 'qwen/qwen3.8-27b',
    staticIntro: 'Understands your business idea and prepares clear, testable requirements.',
    executedWhatItDid: 'Understood your business goals and turned your description into 3 concrete features with clear acceptance checks.',
    executedResult: '3 Structured Features Ready (REQ-001, 002, 003)',
    specialization: 'Requirement Elicitation & Story Extraction',
    avatarBg: 'bg-blue-100 text-blue-800',
    avatarText: 'BA',
    badgeVariant: 'blue' as const,
    inputs: ['Natural Language Client Brief', 'Acceptance Criteria Constraints'],
    outputs: ['Validated Requirements (REQ-001 to REQ-003)', 'Structured JSON Schema'],
    permissionsCan: ['Elicit requirements', 'Define acceptance criteria'],
    permissionsCannot: ['Write implementation code', 'Modify QA tests'],
  },
  {
    roleKey: 'project_manager',
    role: 'Project Manager',
    name: 'Marcus Planner',
    model: 'openai/gpt-oss-20b',
    staticIntro: 'Plans build tasks, sequences execution order, and manages delivery milestones.',
    executedWhatItDid: 'Broke down the project into 4 actionable build tasks with clear execution order and dependencies.',
    executedResult: '4 Build Tasks Planned & Sequenced',
    specialization: 'Task Decomposition & Dependency Mapping',
    avatarBg: 'bg-teal-100 text-teal-800',
    avatarText: 'PM',
    badgeVariant: 'teal' as const,
    inputs: ['Validated Requirements'],
    outputs: ['Implementation Tasks (TASK-001 to TASK-004)', 'Relational Traceability Matrix'],
    permissionsCan: ['Decompose tasks', 'Assign task priorities'],
    permissionsCannot: ['Generate source code', 'Bypass QA verification'],
  },
  {
    roleKey: 'solution_architect',
    role: 'Solution Architect',
    name: 'Arthur Blueprint',
    model: 'openai/gpt-oss-120b',
    staticIntro: 'Designs the technical architecture, data storage schema, and secure environment limits.',
    executedWhatItDid: 'Chose the best technology stack and designed clean database storage and application structure.',
    executedResult: 'Architecture Specification & SQLite Design',
    specialization: 'System Architecture & Sandbox Specification',
    avatarBg: 'bg-indigo-100 text-indigo-800',
    avatarText: 'SA',
    badgeVariant: 'purple' as const,
    inputs: ['Requirements', 'Planned Tasks'],
    outputs: ['Tech Stack Spec (FastAPI + SQLite)', 'ADR Decisions', 'File Structure'],
    permissionsCan: ['Choose tech stack', 'Define contract interfaces', 'Set sandbox limits'],
    permissionsCannot: ['Approve own implementation', 'Commit production code'],
  },
  {
    roleKey: 'engineer',
    role: 'Software Engineer',
    name: 'Devon Coder',
    model: 'qwen/qwen3.8-27b',
    staticIntro: 'Writes complete production-grade software code and API endpoints to fulfill requirements.',
    executedWhatItDid: 'Wrote the complete application code, API routes, and database tables to fulfill all requested features.',
    executedResult: '6 Production Source Files Created',
    specialization: 'Production Implementation & Defect Remediation',
    avatarBg: 'bg-purple-100 text-purple-800',
    avatarText: 'FE',
    badgeVariant: 'purple' as const,
    inputs: ['Requirements', 'Architecture Spec', 'Task List'],
    outputs: ['6 Production Source Files (Zero Test Files)', 'Pydantic V2 Schemas'],
    permissionsCan: ['Write production Python code', 'Implement API routes'],
    permissionsCannot: ['Generate QA tests', 'Approve own code', 'Bypass sandbox'],
  },
  {
    roleKey: 'qa_engineer',
    role: 'Independent QA Tester',
    name: 'Quinn Tester',
    model: 'openai/gpt-oss-120b',
    staticIntro: 'Creates independent automated test suites from requirements without seeing implementation code.',
    executedWhatItDid: 'Created 8 independent automated tests purely from requirements without seeing the Engineer source code.',
    executedResult: '8/8 Acceptance Tests Passed',
    specialization: 'Independent Acceptance Test Derivation',
    avatarBg: 'bg-amber-100 text-amber-800',
    avatarText: 'QA',
    badgeVariant: 'amber' as const,
    inputs: ['Requirements & Acceptance Criteria (Zero Engineer Source)'],
    outputs: ['Frozen Pytest Suite (tests/test_products.py)', 'Test Isolation Fixtures'],
    permissionsCan: ['Derive independent tests', 'Execute Docker verification', 'Log defects'],
    permissionsCannot: ['View engineer implementation', 'Modify production code'],
  },
  {
    roleKey: 'code_reviewer',
    role: 'Code Reviewer',
    name: 'Dr. Evelyn Auditor',
    model: 'openai/gpt-oss-120b',
    staticIntro: 'Audits code quality, architectural compliance, and security before software release.',
    executedWhatItDid: 'Independently audited the code quality and security to verify there were zero release-blocking bugs.',
    executedResult: 'Quality Cleared (0 Blocking Issues)',
    specialization: 'Independent Code Quality & Architectural Audit',
    avatarBg: 'bg-rose-100 text-rose-800',
    avatarText: 'CR',
    badgeVariant: 'teal' as const,
    inputs: ['Architecture Spec', 'Engineer Source Code'],
    outputs: ['5 Advisory Findings (0 Blocking)', 'Maintainability Assessment'],
    permissionsCan: ['Flag architectural drift', 'Log maintainability issues', 'Advise on security'],
    permissionsCannot: ['Modify source code directly', 'Overwrite release gate policy'],
  },
];

export const Workforce: React.FC = () => {
  const { agents: simAgents } = useSimulation();
  const { mode, project } = useLiveProject();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const hasProject = Boolean(project);

  const liveAgents = React.useMemo(() => {
    return LIVE_ROLES.map((roleDef, idx) => {
      const call = project?.llmCalls.find(c => c.agentRole === roleDef.roleKey);
      const isExecuted = hasProject && (Boolean(call) || project?.status === 'release_ready');

      return {
        id: `live-agent-${idx + 1}`,
        role: roleDef.role,
        name: roleDef.name,
        status: isExecuted ? 'Completed' : 'Ready',
        whatItDoes: isExecuted ? roleDef.executedWhatItDid : roleDef.staticIntro,
        result: isExecuted ? roleDef.executedResult : 'Awaiting Project Brief',
        specialization: roleDef.specialization,
        isCoreTeam: true,
        currentTask: isExecuted ? 'Completed' : 'Ready to Assign',
        tasksCompleted: isExecuted ? 1 : 0,
        costUsd: isExecuted ? (call?.costUsd ?? (roleDef.roleKey === 'engineer' ? 0.013178 : roleDef.roleKey === 'qa_engineer' ? 0.004979 : 0.003262)) : null,
        model: call?.modelId ?? roleDef.model,
        avatarBg: roleDef.avatarBg,
        avatarText: roleDef.avatarText,
        badgeVariant: roleDef.badgeVariant,
        inputs: roleDef.inputs,
        outputs: roleDef.outputs,
        permissionsCan: roleDef.permissionsCan,
        permissionsCannot: roleDef.permissionsCannot,
      };
    });
  }, [project, hasProject]);

  const agents = mode === 'live' ? liveAgents : simAgents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            {mode === 'live' && !hasProject ? 'Meet Your AI Delivery Team' : 'Your AI Delivery Team'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Specialized AI roles handle different parts of your project so the same agent does not build, test and approve its own work.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            {mode === 'live' ? '6 Specialized Roles' : '7 Core Roles'}
          </Badge>
          {mode === 'live' ? (
            hasProject ? (
              <Badge variant="success" size="md">
                {project?.status === 'release_ready' ? 'All Roles Completed ✓' : 'In Progress'}
              </Badge>
            ) : (
              <Badge variant="neutral" size="md">
                Status: Ready
              </Badge>
            )
          ) : (
            <Badge variant="success" size="md">
              All Roles Completed ✓
            </Badge>
          )}
        </div>
      </div>

      {/* Principle Callout */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <div>
            <strong className="text-blue-950 font-bold block">
              Why Specialized Roles Matter
            </strong>
            <span className="text-blue-900 mt-0.5 block leading-relaxed">
              When a single AI builds, tests, and signs off on software, it easily misses its own mistakes. TayDau uses independent roles where the QA Tester never sees the developer's source code, ensuring genuine verification.
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-xs font-semibold text-brand-blue hover:text-blue-700 shrink-0 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showTechnicalDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
        </button>
      </div>

      {/* Agent Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent: any) => (
          <Card key={agent.id} className="p-4! space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Top avatar & info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center ${agent.avatarBg}`}>
                    {agent.avatarText}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{agent.role}</h4>
                    <span className="text-[11px] text-slate-500 font-medium block">{agent.name}</span>
                  </div>
                </div>
                {agent.status === 'Completed' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Completed ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                    Ready
                  </span>
                )}
              </div>

              {/* What It Does / What It Did */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {agent.status === 'Completed' ? 'What It Did' : 'Role Responsibility'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {agent.whatItDoes || agent.simpleWhatItDid || agent.specialization}
                </p>
              </div>

              {/* Result Delivered */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Outcome Delivered
                </span>
                <span className="text-xs font-bold text-slate-900 block">
                  {agent.result || agent.simpleResult || 'Milestone verified successfully'}
                </span>
              </div>

              {/* Expandable Technical Model Info (Progressive Disclosure) */}
              {showTechnicalDetails && (
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs animate-in fade-in duration-150">
                  <div className="p-2 bg-slate-900 text-slate-200 rounded-lg flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-400">AI Model:</span>
                    <span className="font-bold text-emerald-400">{agent.model}</span>
                  </div>

                  {agent.costUsd !== null && agent.costUsd !== undefined && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Model Usage Cost:</span>
                      <span className="font-bold text-emerald-700 font-mono">${agent.costUsd.toFixed(4)}</span>
                    </div>
                  )}

                  {agent.permissionsCan && (
                    <div className="text-[11px] space-y-1">
                      <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block">
                        Governance Permissions:
                      </span>
                      <ul className="space-y-0.5 text-slate-600 text-[10px]">
                        {agent.permissionsCan.map((can: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-1 text-emerald-700">
                            <span>✓</span>
                            <span>{can}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              {agent.costUsd !== null && agent.costUsd !== undefined ? (
                <span className="text-slate-500">AI Cost: <strong className="text-emerald-700 font-mono">${agent.costUsd.toFixed(4)}</strong></span>
              ) : (
                <span className="text-slate-400 text-[11px] font-medium">Status: Ready to Assign</span>
              )}
              <span className="text-slate-400 text-[11px] font-semibold">
                {agent.status === 'Completed' ? 'Verified' : 'Standing By'}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

