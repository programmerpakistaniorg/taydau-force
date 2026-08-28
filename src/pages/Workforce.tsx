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
  X
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { useSimulation } from '../context/SimulationContext';
import { Agent } from '../types';

export const Workforce: React.FC = () => {
  const { agents, costSummary } = useSimulation();

  const coreTeam = agents.filter((a) => a.isCoreTeam);
  const specialists = agents.filter((a) => !a.isCoreTeam);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            Dynamic AI Workforce Assembly
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Autonomous software team dynamically assembled with core delivery roles and on-demand specialists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            7 Core Agents
          </Badge>
          <Badge variant="teal" size="md">
            2 Activated Specialists
          </Badge>
        </div>
      </div>

      {/* Dynamic Assembly Policy Callout */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div>
          <strong className="text-blue-950 font-bold block">
            Dynamic Workforce Optimization Principle
          </strong>
          <span className="text-blue-900 mt-0.5 block leading-relaxed">
            &ldquo;TayDau Force activates specialists based on project requirements instead of running every possible agent.&rdquo;
            For the Smart Inventory Management System, the Database Specialist and Security Specialist were activated for concurrency locking and RBAC protection, while Mobile, ML, and Network specialists remain unallocated to minimize token expenditure.
          </span>
        </div>
      </div>

      {/* 1. Core Team Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-blue" />
            Core Team (7 Essential Delivery Roles)
          </h3>
          <span className="text-xs text-slate-400 font-mono">100% Provisioned</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {coreTeam.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* 2. On-Demand Specialists Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-teal" />
            On-Demand Specialists (Dynamic Activation)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Requirement-Triggered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {specialists.map((agent) => (
            <AgentCard key={agent.id} agent={agent} isSpecialist />
          ))}
        </div>
      </div>

      {/* 3. Agent Permissions & Separation of Powers Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Agent Permissions & Separation of Powers Policy
          </h3>
          <span className="text-xs text-slate-400 font-mono">Zero-Trust Operational Guardrails</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Full-Stack Engineer Permissions */}
          <Card className="p-4! space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Full-Stack Engineer</h4>
              <Badge variant="primary" size="sm">Devon Coder</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Can:
                </span>
                <ul className="space-y-1 text-slate-700 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Read requirements and task specifications
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Modify application source code
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Run development and unit tests
                  </li>
                </ul>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Cannot:
                </span>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Approve QA verification gates
                  </li>
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Alter verified requirements
                  </li>
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Deploy directly to production
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* QA Engineer Permissions */}
          <Card className="p-4! space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">QA Engineer</h4>
              <Badge variant="amber" size="sm">Quinn Tester</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Can:
                </span>
                <ul className="space-y-1 text-slate-700 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Execute automated tests & stress tests
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Create defect records (e.g. DEF-03)
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Approve or reject QA gates
                  </li>
                </ul>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Cannot:
                </span>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Silently modify feature code
                  </li>
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Bypass failing test assertions
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Security Specialist Permissions */}
          <Card className="p-4! space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">Security Specialist</h4>
              <Badge variant="amber" size="sm">Samantha Sentinel</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Can:
                </span>
                <ul className="space-y-1 text-slate-700 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Review security requirements
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Run SAST & secret scans
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Create security findings (SEC-001)
                  </li>
                </ul>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Cannot:
                </span>
                <ul className="space-y-1 text-slate-600 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Bypass release policy
                  </li>
                  <li className="flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Grant unverified exemptions
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface AgentCardProps {
  agent: Agent;
  isSpecialist?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSpecialist }) => {
  const isNotRequired = agent.status === 'Not Required';

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-subtle flex flex-col justify-between transition-all ${
        isNotRequired
          ? 'opacity-60 bg-slate-50/50 border-slate-200'
          : agent.status === 'Working' || agent.status === 'Testing' || agent.status === 'Reviewing'
          ? 'border-blue-300 ring-2 ring-blue-500/10'
          : 'border-slate-200'
      }`}
    >
      <div>
        {/* Avatar & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border shadow-2xs ${agent.avatarBg}`}
            >
              {agent.avatarText}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                {agent.role}
              </h4>
              <p className="text-[11px] text-slate-500">{agent.name}</p>
            </div>
          </div>
          <StatusPill status={agent.status} />
        </div>

        {/* Specialization */}
        <div className="mt-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Specialization
          </span>
          <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-2">
            {agent.specialization}
          </p>
        </div>

        {/* Current Task if present */}
        {agent.currentTask && (
          <div className="mt-3 p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-xs">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-brand-blue" />
              Current Task
            </span>
            <p className="text-[11px] text-blue-950 font-medium leading-snug">
              {agent.currentTask}
            </p>
          </div>
        )}

        {/* Inputs & Outputs */}
        {agent.inputs && agent.outputs && !isNotRequired && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Inputs</span>
              <span className="text-slate-700 leading-tight block mt-0.5 truncate" title={agent.inputs.join(', ')}>
                {agent.inputs[0]}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block">Outputs</span>
              <span className="text-slate-700 leading-tight block mt-0.5 truncate" title={agent.outputs.join(', ')}>
                {agent.outputs[0]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metadata */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] font-mono text-slate-500">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Assigned Model:</span>
          <span className="font-semibold text-slate-800">{agent.model}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Spend / Tasks:</span>
          <span className="text-emerald-700 font-bold">
            ${agent.costUsd.toFixed(2)}{' '}
            <span className="text-slate-400 font-normal">({agent.tasksCompleted} tasks)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
