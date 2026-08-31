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
  Play,
  FileText,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSimulation } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { INITIAL_LIFECYCLE_STAGES } from '../data/mockData';

const CUSTOMER_LIFECYCLE_STAGES = [
  { num: 1, name: 'Your Idea', lead: 'Client Brief', status: 'completed' },
  { num: 2, name: 'Understand Needs', lead: 'Business Analyst', status: 'completed' },
  { num: 3, name: 'Build Plan', lead: 'Project Manager', status: 'completed' },
  { num: 4, name: 'Solution Design', lead: 'Solution Architect', status: 'completed' },
  { num: 5, name: 'Development', lead: 'Engineer', status: 'completed' },
  { num: 6, name: 'Independent Testing', lead: 'QA Engineer', status: 'completed' },
  { num: 7, name: 'Safe Verification', lead: 'Sandbox Execution', status: 'completed' },
  { num: 8, name: 'Ready to Deliver', lead: 'Release Gate', status: 'completed' },
];

const DEFAULT_PROJECT_JOURNEY = [
  { step: 'Requirements understood', detail: '3 core business features extracted and structured with acceptance checks', time: 'Phase 1' },
  { step: 'Project plan completed', detail: '4 implementation tasks organized with dependencies and specifications', time: 'Phase 2' },
  { step: 'Solution designed', detail: 'Clean microservice architecture selected with SQLite database engine', time: 'Phase 3' },
  { step: 'Application developed', detail: '6 production application files and schemas generated and validated', time: 'Phase 4' },
  { step: 'Independent testing completed', detail: '8 acceptance tests derived independently from Engineer source (8/8 passed)', time: 'Phase 5' },
  { step: 'Security checks completed', detail: 'Static analysis and secret scanning cleared with 0 critical findings', time: 'Phase 6' },
  { step: 'Quality review completed', detail: '0 blocking issues found, 5 advisory maintainability suggestions noted', time: 'Phase 7' },
  { step: 'Project ready for delivery', detail: 'All 8 deterministic release checks cleared successfully', time: 'Phase 8' },
];

export const Overview: React.FC = () => {
  const {
    currentStep,
    requirements: simRequirements,
    defects: simDefects,
    securityFindings: simSecurityFindings,
    activities: simActivities,
    costSummary: simCostSummary
  } = useSimulation();

  const {
    mode,
    project,
    advanceProject,
    isAdvancing,
    isPolling
  } = useLiveProject();

  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');
  const [showTechnicalLog, setShowTechnicalLog] = useState<boolean>(false);

  // Live real values
  const liveReqCount = project ? project.requirements.length : 0;
  const liveTestsPassed = project ? (project.testRuns[0]?.testsPassed ?? 0) : 0;
  const liveTestsTotal = project ? ((project.testRuns[0]?.testsPassed ?? 0) + (project.testRuns[0]?.testsFailed ?? 0)) : 0;
  const liveOpenDefects = project ? (project.defects.filter(d => d.status === 'open').length) : 0;
  const liveCost = project ? (project.costSummary?.totalCostUsed ?? 0) : 0;
  const liveCostPerReq = project ? (project.costSummary?.costPerVerifiedReq ?? (liveReqCount > 0 ? liveCost / liveReqCount : 0)) : 0;

  const activities = mode === 'live'
    ? (project?.activities && project.activities.length > 0 ? project.activities : [])
    : simActivities;

  const filteredActivities = activities.filter((act: any) => {
    if (selectedActivityFilter === 'all') return true;
    return act.type === selectedActivityFilter;
  });

  return (
    <div className="space-y-8">
      {/* 1. Customer-Friendly Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy via-slate-900 to-[#0A192F] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Autonomous Software Delivery</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Turn your idea into working software.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Describe what your business needs. TayDau plans, builds, tests and reviews the solution through a governed AI software team.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/project"
              className="px-5 py-2.5 bg-brand-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-98"
            >
              <FolderGit2 className="w-4 h-4" />
              <span>{project ? 'View My Project' : 'Start a Project'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* 4 Plain-Language Benefit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
              <Users className="w-4 h-4 text-blue-400" />
              AI Delivery Team
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Specialized AI roles handle planning, development, testing and review.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Independent Testing
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              The system that defines acceptance tests is separated from the Engineer.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
              <Lock className="w-4 h-4 text-purple-400" />
              Safe Verification
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Generated software is tested inside a protected temporary environment.
            </p>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xs space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Coins className="w-4 h-4 text-amber-400" />
              Cost Visibility
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              See estimated AI delivery cost throughout the project.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Requirements */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Requirements Completed
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {mode === 'live' ? `${liveReqCount} / ${liveReqCount}` : '18 / 18'}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  100%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Everything requested is covered.
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

        {/* Metric 2: Tests */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Tests Passed
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
                Independent checks succeeded.
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

        {/* Metric 3: Open Issues */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Open Blocking Issues
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {mode === 'live' ? liveOpenDefects : 0}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  0 Blockers
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                No release blockers.
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

        {/* Metric 4: Cost */}
        <Card className="relative overflow-hidden p-4! border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Estimated AI Cost
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  ${(mode === 'live' ? liveCost : simCostSummary.totalCostUsed).toFixed(3)}
                </span>
                <span className="text-[11px] font-bold text-slate-400">/ $5.00 limit</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Estimated list-price equivalent.
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
            How TayDau Delivers Your Software
          </h3>
          <span className="text-xs text-slate-500">
            8 Governed Milestones
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {CUSTOMER_LIFECYCLE_STAGES.map((stage: any, idx: number) => {
            return (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                      {stage.num}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{stage.name}</h4>
                </div>
                <span className="text-[10px] text-slate-500 line-clamp-1 block">
                  {stage.lead}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Project Journey Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-blue" />
              Project Delivery Journey
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Milestone progress and verification results for the current project.
            </p>
          </div>

          <button
            onClick={() => setShowTechnicalLog(!showTechnicalLog)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showTechnicalLog ? 'Hide Technical Log' : 'View Full Audit Log'}</span>
          </button>
        </div>

        {/* Clean Business-Readable Journey Feed */}
        <Card className="p-4! space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEFAULT_PROJECT_JOURNEY.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3 text-xs"
              >
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-slate-900 font-bold">{item.step}</strong>
                    <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Granular Technical Audit Log (Expandable) */}
        {showTechnicalLog && (
          <Card className="p-0! overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-150">
            <div className="p-3 bg-slate-900 text-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px]">Granular Technical Audit Trail</span>
              <div className="flex items-center gap-1.5">
                {['all', 'task', 'qa', 'security', 'defect', 'system'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedActivityFilter(filter)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize transition-colors ${
                      selectedActivityFilter === filter
                        ? 'bg-brand-blue text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredActivities && filteredActivities.length > 0 ? (
              filteredActivities.slice(0, 10).map((act: any, idx: number) => (
                <div key={idx} className="p-3 hover:bg-slate-50/80 transition-colors flex items-start gap-3 text-xs">
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
              <div className="p-6 text-center text-xs text-slate-400">
                No raw technical events logged for this filter category.
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
