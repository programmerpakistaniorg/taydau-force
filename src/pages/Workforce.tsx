import React from 'react';
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
  Search
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
    role: 'Full-Stack Engineer',
    name: 'Devon Coder',
    model: 'qwen/qwen3.8-27b',
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
    role: 'QA Engineer',
    name: 'Quinn Tester',
    model: 'openai/gpt-oss-120b',
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

  const liveAgents: Agent[] = React.useMemo(() => {
    return LIVE_ROLES.map((roleDef, idx) => {
      const call = project?.llmCalls.find(c => c.agentRole === roleDef.roleKey);
      const isExecuted = Boolean(call) || project?.status === 'release_ready';

      return {
        id: `live-agent-${idx + 1}`,
        role: roleDef.role,
        name: roleDef.name,
        status: isExecuted ? 'Completed' : 'Active',
        specialization: roleDef.specialization,
        isCoreTeam: true,
        currentTask: isExecuted ? 'Stage Delivered' : 'Ready for execution',
        tasksCompleted: isExecuted ? 1 : 0,
        costUsd: call?.costUsd ?? (roleDef.roleKey === 'engineer' ? 0.013178 : roleDef.roleKey === 'qa_engineer' ? 0.004979 : 0.003262),
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
  }, [project]);

  const agents = mode === 'live' ? liveAgents : simAgents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            Governed AI Workforce Roster {mode === 'live' ? '(Live Delivery Roles)' : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Autonomous software team dynamically assembled with core delivery roles and on-demand specialists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            {mode === 'live' ? '6 Governed AI Roles' : '7 Core Agents'}
          </Badge>
          <Badge variant="teal" size="md">
            Separation of Duties: ENFORCED
          </Badge>
        </div>
      </div>

      {/* Dynamic Assembly Policy Callout */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-950 font-bold block">
            Governed Separation of Duties & Tiered Model Arbitration
          </strong>
          <span className="text-blue-900 mt-0.5 block leading-relaxed">
            Every specialist operates within strict architectural boundaries. The QA Engineer independently derives test suites from requirements without seeing implementation source files, and Developers cannot approve their own code. Real token expenditure is tracked per role in real-time.
          </span>
        </div>
      </div>

      {/* Agent Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-4! space-y-3">
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
              <Badge variant="success" size="sm">
                {agent.status}
              </Badge>
            </div>

            {/* Specialization & Model */}
            <div className="space-y-1 text-xs">
              <p className="text-[11px] text-slate-600 leading-snug">
                {agent.specialization}
              </p>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between font-mono text-[10px]">
                <span className="text-slate-500">Model:</span>
                <span className="font-bold text-slate-800">{agent.model}</span>
              </div>
            </div>

            {/* Inputs & Outputs */}
            {agent.inputs && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                    Authorized Inputs:
                  </span>
                  <ul className="space-y-0.5 text-slate-600">
                    {agent.inputs.map((inp, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-brand-blue">•</span>
                        <span>{inp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Cost & Task Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Cost: <strong className="text-emerald-700">${agent.costUsd.toFixed(6)}</strong></span>
              <span className="text-slate-400 text-[10px]">{agent.currentTask}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
