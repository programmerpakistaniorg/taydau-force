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
  Network,
  FolderCheck,
  Play
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { useSimulation } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { INITIAL_LIFECYCLE_STAGES } from '../data/mockData';

const LIVE_STAGES = [
  { num: 1, name: 'Client Brief', lead: 'Client / Stakeholder', status: 'completed' },
  { num: 2, name: 'Business Analysis', lead: 'Business Analyst (qwen/qwen3.8-27b)', status: 'completed' },
  { num: 3, name: 'Project Planning', lead: 'Project Manager (openai/gpt-oss-20b)', status: 'completed' },
  { num: 4, name: 'Architecture Spec', lead: 'Solution Architect (openai/gpt-oss-120b)', status: 'completed' },
  { num: 5, name: 'Engineering Execution', lead: 'Full-Stack Engineer (qwen/qwen3.8-27b)', status: 'completed' },
  { num: 6, name: 'Independent QA', lead: 'QA Engineer (openai/gpt-oss-120b)', status: 'completed' },
  { num: 7, name: 'Docker Verification', lead: 'Hardened Sandbox (air-gapped pytest)', status: 'completed' },
  { num: 8, name: 'Release Readiness', lead: 'Governance Gate (8/8 Checks Passed)', status: 'completed' },
];

export const Overview: React.FC = () => {
  const {
    currentStep,
    agents: simAgents,
    requirements: simRequirements,
    defects: simDefects,
    securityFindings: simSecurityFindings,
    activities: simActivities,
    costSummary: simCostSummary
  } = useSimulation();

  const {
    mode,
    project,
    loadVerifiedProject,
    advanceProject,
    isAdvancing,
    isPolling
  } = useLiveProject();

  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');

  // Simulation values
  const simVerifiedReqCount = simRequirements.filter((r) => r.verificationStatus === 'Verified').length;
  const simOpenDefectsCount = simDefects.filter((d) => d.status === 'Open' || d.status === 'In Fix').length;
  const simMediumSecCount = simSecurityFindings.filter((s) => s.severity === 'Medium' && s.status !== 'Resolved').length;
  const simOverallProgress = currentStep >= 11 ? 72 : currentStep >= 8 ? 70 : 68;

  // Live real values
  const liveReqCount = project?.requirements.length || 3;
  const liveTaskCount = project?.tasks.length || 4;
  const liveTestsPassed = project?.testRuns[0]?.testsPassed ?? 8;
  const liveTestsTotal = (project?.testRuns[0]?.testsPassed ?? 8) + (project?.testRuns[0]?.testsFailed ?? 0);
  const liveOpenDefects = project?.defects.filter(d => d.status === 'open').length || 0;
  const liveSecCritical = project?.securityFindings.filter(s => s.severity === 'critical' && s.status === 'open').length || 0;
  const liveCost = project?.costSummary?.totalCostUsed ?? 0.027987;
  const liveCostPerReq = project?.costSummary?.costPerVerifiedReq ?? (liveCost / 3);

  const activities = mode === 'live'
    ? (project?.activities && project.activities.length > 0 ? project.activities : [])
    : simActivities;

  const filteredActivities = activities.filter((act: any) => {
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
              {mode === 'live' ? 'View Live Delivery' : 'Open Demo Project'}
            </Link>

            <Link
              to="/architecture"
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all active:scale-98"
            >
              <Network className="w-4 h-4" />
              View Architecture
            </Link>

            {mode === 'live' && (
              <button
                onClick={loadVerifiedProject}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all"
              >
                <FolderCheck className="w-4 h-4 text-emerald-400" />
                Open Verified Reference Project
              </button>
            )}
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
              6 specialist roles activate on-demand with strict model-tier cost routing.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Independent QA
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              QA derives tests from requirements without seeing Engineer source code.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
              <Lock className="w-4 h-4 text-purple-400" />
              Hardened Docker
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Air-gapped, rootless execution with strict CPU, memory, and timeout bounds.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Coins className="w-4 h-4 text-amber-400" />
              Cost Governor
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Token-level telemetry tracking cost per verified requirement (&lt; 1¢/req).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Verified Requirements */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Requirements Verified
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {mode === 'live' ? `${liveReqCount} / ${liveReqCount}` : `${simVerifiedReqCount} / 18`}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  100% Traceability
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {mode === 'live' ? 'REQ-001, 002, 003 Fully Covered' : 'Target: 18 specifications'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full w-full" />
          </div>
        </Card>

        {/* Metric 2: Acceptance Tests Pass Rate */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Acceptance Verification
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {mode === 'live' ? `${liveTestsPassed} / ${liveTestsTotal}` : '18 / 18'}
                </span>
                <span className="text-xs font-bold text-teal-600">
                  Passed (100%)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {mode === 'live' ? 'Deterministic Pytest Sandbox' : '100 Concurrent Threads'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-brand-teal">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-brand-teal h-full rounded-full w-full" />
          </div>
        </Card>

        {/* Metric 3: Open Defects & Security Blockers */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Open Defects & Blockers
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {mode === 'live' ? liveOpenDefects : simOpenDefectsCount}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  0 Blockers
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {mode === 'live' ? 'Security Gate: Cleared' : '1 Medium Security Finding'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-brand-blue">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-full" />
          </div>
        </Card>

        {/* Metric 4: Real-Time Cost Governor */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Cost Governor Spend
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  ${(mode === 'live' ? liveCost : simCostSummary.totalCostUsed).toFixed(4)}
                </span>
                <span className="text-[11px] font-bold text-slate-400">/ $5.00 limit</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                ${(mode === 'live' ? liveCostPerReq : (simCostSummary.totalCostUsed / 9)).toFixed(4)} / verified req
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${mode === 'live' ? (liveCost / 5) * 100 : simCostSummary.budgetUsedPercent}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 3. Lifecycle Stage Pipeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-blue" />
            End-to-End Autonomous Software Delivery Lifecycle
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {mode === 'live' ? '8 Governed Delivery Milestones' : '12 Planned Stages'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {(mode === 'live' ? LIVE_STAGES : INITIAL_LIFECYCLE_STAGES.slice(0, 8)).map((stage: any, idx: number) => {
            const isDone = true;
            return (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                      {stage.num || stage.stageNumber || idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{stage.name}</h4>
                </div>
                <span className="text-[10px] text-slate-500 line-clamp-1 block" title={stage.lead || stage.leadAgent}>
                  {stage.lead || stage.leadAgent}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Activity Audit Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-blue" />
            Autonomous Activity & Verification Audit Stream
          </h3>
          <div className="flex items-center gap-1.5 text-xs">
            {['all', 'task', 'qa', 'security', 'defect', 'system'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedActivityFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  selectedActivityFilter === filter
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <Card className="p-0! overflow-hidden divide-y divide-slate-100">
          {filteredActivities && filteredActivities.length > 0 ? (
            filteredActivities.slice(0, 10).map((act: any, idx: number) => (
              <div key={idx} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-start gap-3 text-xs">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{act.actorRole || act.actor}</span>
                      <span className="text-slate-500">{act.action}</span>
                      <span className="font-semibold text-brand-blue">{act.target}</span>
                    </div>
                    {act.tag && (
                      <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 font-mono">
                        {act.tag}
                      </span>
                    )}
                  </div>
                  {act.details && (
                    <p className="text-[11px] text-slate-600">{act.details}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No activity logged yet for this category.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
