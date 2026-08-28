import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Coins,
  FileCheck2,
  Users,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Boxes,
  FolderGit2,
  Network
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { useSimulation, SIMULATION_STEPS } from '../context/SimulationContext';
import { INITIAL_LIFECYCLE_STAGES } from '../data/mockData';

export const Overview: React.FC = () => {
  const {
    currentStep,
    agents,
    requirements,
    defects,
    securityFindings,
    activities,
    costSummary,
    simulateNextStep
  } = useSimulation();

  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');

  const verifiedReqCount = requirements.filter((r) => r.verificationStatus === 'Verified').length;
  const openDefectsCount = defects.filter((d) => d.status === 'Open' || d.status === 'In Fix').length;
  const mediumSecCount = securityFindings.filter((s) => s.severity === 'Medium' && s.status !== 'Resolved').length;
  const overallProgress = currentStep >= 11 ? 72 : currentStep >= 8 ? 70 : 68;

  const filteredActivities = activities.filter((act) => {
    if (selectedActivityFilter === 'all') return true;
    return act.type === selectedActivityFilter;
  });

  return (
    <div className="space-y-8">
      {/* 1. Landing Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-slate-900 to-[#0A192F] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Autonomous Software Delivery Organization</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            TayDau Force
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            &ldquo;Turn a product brief into planned, developed, independently verified and security-aware software through a governed AI workforce.&rdquo;
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/project"
              className="px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-98"
            >
              <FolderGit2 className="w-4 h-4" />
              Open Demo Project
            </Link>

            <Link
              to="/architecture"
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all active:scale-98"
            >
              <Network className="w-4 h-4" />
              View Architecture
            </Link>
          </div>
        </div>

        {/* 4 Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
              <Users className="w-4 h-4 text-blue-400" />
              Dynamic AI Workforce
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Specialist roles activate dynamically on demand without bloated agent spend.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Independent Verification
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Strict separation of powers: Developers cannot approve their own code.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Secure Delivery
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              DevSecOps gate blocks unverified AI code from production release.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Coins className="w-4 h-4 text-amber-400" />
              Cost-Aware Orchestration
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Task complexity routing with hard budget caps at $0.17/verified requirement.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Metric Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Active Project Metrics (Smart Inventory System)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Simulated State</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Status */}
          <Card className="p-3.5! border-l-4 border-l-brand-blue">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Project Status
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              In Development
            </div>
            <div className="mt-2 text-[10px] text-slate-400">Sprint 2 / Phase 1</div>
          </Card>

          {/* Progress */}
          <Card className="p-3.5! border-l-4 border-l-brand-blue">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Overall Progress
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900 flex items-baseline gap-1 font-mono">
              {overallProgress}%
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 self-center" />
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-brand-blue h-full rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </Card>

          {/* Requirements */}
          <Card className="p-3.5! border-l-4 border-l-emerald-600">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Requirements
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
              {verifiedReqCount}{' '}
              <span className="text-xs font-normal text-slate-400">/ 18 Verified</span>
            </div>
            <div className="mt-2 text-[10px] text-emerald-600 font-medium">
              11 certified gates
            </div>
          </Card>

          {/* Open Defects */}
          <Card className="p-3.5! border-l-4 border-l-rose-500">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Open Defects
            </div>
            <div className="mt-1 text-lg font-bold text-rose-600 flex items-center gap-1.5 font-mono">
              {openDefectsCount}
              {openDefectsCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-700">
                  {currentStep >= 6 && currentStep < 10 ? 'DEF-03 Active' : 'Triage'}
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-slate-400">
              {currentStep >= 6 && currentStep < 10 ? 'High severity race bug' : '0 critical'}
            </div>
          </Card>

          {/* Security Findings */}
          <Card className="p-3.5! border-l-4 border-l-amber-500">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Security Findings
            </div>
            <div className="mt-1 text-lg font-bold text-amber-700 flex items-center gap-1.5 font-mono">
              {mediumSecCount}
              <span className="text-xs font-medium text-amber-600">Medium</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">SEC-001 (RBAC Patch)</div>
          </Card>

          {/* AI Cost Used */}
          <Card className="p-3.5! border-l-4 border-l-teal-600">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              AI Cost Used
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900 font-mono">
              ${costSummary.totalCostUsed.toFixed(2)}
            </div>
            <div className="mt-2 text-[10px] text-teal-700 font-medium">
              Budget: $5.00 (36.8%)
            </div>
          </Card>
        </div>
      </div>

      {/* 3. 12-Stage Lifecycle Timeline */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-blue" />
              12-Stage Autonomous Software Delivery Lifecycle
            </span>
            <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
              Client Idea → Analysis → Prototype → Validation → Architecture → Team Assembly → Build → Review → QA & Security → Deploy → Monitor → Iterate
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[920px] flex items-center justify-between relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />

            {INITIAL_LIFECYCLE_STAGES.map((st) => {
              const isCompleted = st.stageNumber <= 6 || st.stageNumber === 8;
              const isActive = st.stageNumber === 7 || st.stageNumber === 9;

              return (
                <div
                  key={st.id}
                  className="flex flex-col items-center text-center relative z-10 group"
                  style={{ width: '75px' }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 shadow-xs ${
                      isActive
                        ? 'bg-brand-blue text-white border-blue-400 ring-4 ring-blue-100 scale-110'
                        : isCompleted
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white text-slate-400 border-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{st.stageNumber}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-medium leading-tight line-clamp-2 ${
                      isActive
                        ? 'text-brand-blue font-bold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.name}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    {isActive ? 'Current' : isCompleted ? 'Passed' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Active Stage Description Callout */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
            <span className="font-semibold text-slate-900">Current Phase: Stage 7 (Build) & Stage 9 (QA & Security)</span>
            <span className="text-slate-500 hidden md:inline">
              — Full-Stack Engineer and QA verification engine are executing concurrency and RBAC tests for Sprint 2.
            </span>
          </div>
          <button
            onClick={simulateNextStep}
            className="text-[11px] font-semibold text-brand-blue hover:text-blue-800 flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <span>Advance Workflow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {/* 4. 2-Column: Active AI Workforce & Demo Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active AI Workforce */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-blue" />
              Active AI Workforce ({agents.length} Roles)
            </h3>
            <span className="text-xs text-slate-400">Model-Routed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-3.5 rounded-xl border bg-white shadow-subtle transition-all duration-150 ${
                  agent.status === 'Working' || agent.status === 'Testing' || agent.status === 'Reviewing'
                    ? 'border-blue-200 ring-1 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs border ${agent.avatarBg}`}
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

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 line-clamp-2">
                  {agent.currentTask || agent.specialization}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Model: {agent.model}</span>
                  <span className="text-slate-600 font-semibold">${agent.costUsd.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Demo Activity Stream */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Demo Activity Stream
            </h3>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-medium text-slate-600">
              {['all', 'task', 'qa', 'defect'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedActivityFilter(f)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    selectedActivityFilter === f ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-0! overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {filteredActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No activity items match the selected filter.
                </div>
              ) : (
                filteredActivities.map((act) => {
                  const getTagBadge = (type: string) => {
                    if (type === 'qa') return 'bg-amber-50 text-amber-700 border-amber-200';
                    if (type === 'defect') return 'bg-rose-50 text-rose-700 border-rose-200';
                    if (type === 'security') return 'bg-purple-50 text-purple-700 border-purple-200';
                    if (type === 'system') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    return 'bg-blue-50 text-blue-700 border-blue-200';
                  };

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-start gap-3"
                    >
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                        {act.time}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline flex-wrap gap-1 text-xs">
                          <strong className="text-slate-900 font-semibold">{act.actor}</strong>
                          <span className="text-slate-500">{act.action}</span>
                          <span className="font-semibold text-slate-800">{act.target}</span>
                        </div>
                        {act.details && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {act.details}
                          </p>
                        )}
                      </div>
                      {act.tag && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getTagBadge(
                            act.type
                          )}`}
                        >
                          {act.tag}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-blue" />
                Simulated activity updates automatically as workflow steps advance
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
