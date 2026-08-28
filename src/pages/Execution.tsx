import React, { useState } from 'react';
import {
  GitCommit,
  GitBranch,
  Filter,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Sparkles,
  Search,
  Code2,
  FileCode2,
  ShieldCheck,
  TestTube2,
  Activity,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  Layers
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { Drawer } from '../components/common/Drawer';
import { useSimulation, SIMULATION_STEPS } from '../context/SimulationContext';
import { Task, KanbanLane } from '../types';

export const Execution: React.FC = () => {
  const {
    tasks,
    defects,
    activities,
    currentStep,
    stepInfo,
    simulateNextStep,
    resetSimulation,
    isSimulating
  } = useSimulation();

  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter((task) => {
    const matchesAgent =
      selectedAgent === 'all' ||
      task.assignedAgent.toLowerCase().includes(selectedAgent.toLowerCase()) ||
      (task.ownerDisplay && task.ownerDisplay.toLowerCase().includes(selectedAgent.toLowerCase()));
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.requirementCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const lanes: { key: KanbanLane; label: string; count: number; accent: string; bg: string }[] = [
    {
      key: 'backlog',
      label: 'Backlog',
      count: filteredTasks.filter((t) => t.status === 'backlog').length,
      accent: 'border-slate-300',
      bg: 'bg-slate-50'
    },
    {
      key: 'ready',
      label: 'Ready',
      count: filteredTasks.filter((t) => t.status === 'ready').length,
      accent: 'border-blue-300',
      bg: 'bg-blue-50/30'
    },
    {
      key: 'in_development',
      label: 'In Development',
      count: filteredTasks.filter((t) => t.status === 'in_development').length,
      accent: 'border-blue-500',
      bg: 'bg-blue-50/50'
    },
    {
      key: 'code_review',
      label: 'Code Review',
      count: filteredTasks.filter((t) => t.status === 'code_review').length,
      accent: 'border-purple-400',
      bg: 'bg-purple-50/30'
    },
    {
      key: 'qa',
      label: 'QA',
      count: filteredTasks.filter((t) => t.status === 'qa').length,
      accent: 'border-amber-400',
      bg: 'bg-amber-50/40'
    },
    {
      key: 'ready_for_release',
      label: 'Ready for Release',
      count: filteredTasks.filter((t) => t.status === 'ready_for_release').length,
      accent: 'border-teal-400',
      bg: 'bg-teal-50/30'
    },
    {
      key: 'done',
      label: 'Done',
      count: filteredTasks.filter((t) => t.status === 'done').length,
      accent: 'border-emerald-500',
      bg: 'bg-emerald-50/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-brand-blue" />
            Autonomous Execution Engine & 7-Lane Kanban
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic scheduling of agent code synthesis, automated code reviews, concurrency test runs, and release readiness gates.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search task or REQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-blue w-44 sm:w-56"
            />
          </div>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-brand-blue"
          >
            <option value="all">All Owners</option>
            <option value="Full-Stack">Full-Stack Engineer</option>
            <option value="UI/UX">UI/UX Designer</option>
            <option value="Architect">Solution Architect</option>
            <option value="Security">Security Specialist</option>
          </select>
        </div>
      </div>

      {/* Top Banner: Active Simulation Trigger & Defect Escalation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Simulation Interactive Control Panel */}
        <div className="lg:col-span-8 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-blue-200 flex items-center justify-center text-brand-blue shrink-0">
              <Sparkles className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Simulation State: Step {currentStep} of 11
                </span>
                <Badge variant="primary" size="sm">
                  {stepInfo.badge}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                {stepInfo.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={simulateNextStep}
              disabled={currentStep === 11 || isSimulating}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all ${
                currentStep === 11
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-blue hover:bg-blue-700 active:scale-98 text-white ring-2 ring-blue-600/20'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Simulate Next Activity</span>
            </button>

            {currentStep > 0 && (
              <button
                onClick={resetSimulation}
                title="Reset simulation to baseline"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Active Defect Escalation Status */}
        <div className="lg:col-span-4 p-4 bg-rose-50/70 border border-rose-200 rounded-xl shadow-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-950">Active Defect: DEF-03</span>
                <Badge variant="danger" size="sm">High</Badge>
              </div>
              <p className="text-[10px] text-rose-800 mt-0.5">
                {currentStep >= 10 ? 'Resolved & Verified' : 'Race condition rework active'}
              </p>
            </div>
          </div>
          <StatusPill status={currentStep >= 10 ? 'Resolved' : 'In Progress'} />
        </div>
      </div>

      {/* 7-Lane Kanban Board Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-[1240px]">
          {lanes.map((lane) => {
            const laneTasks = filteredTasks.filter((t) => t.status === lane.key);

            return (
              <div
                key={lane.key}
                className="w-64 shrink-0 bg-slate-100/70 rounded-xl p-2.5 border border-slate-200/80 flex flex-col min-h-[520px]"
              >
                {/* Lane Header */}
                <div
                  className={`pb-2 mb-2.5 border-b-2 ${lane.accent} flex items-center justify-between px-1`}
                >
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    {lane.label}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold shadow-2xs">
                    {laneTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {laneTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white/40">
                      No active tasks
                    </div>
                  ) : (
                    laneTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setActiveTask(task)}
                        className={`bg-white rounded-lg p-3 border shadow-subtle hover:border-blue-400 hover:shadow-md transition-all cursor-pointer ${
                          task.code === 'TASK-12' && (currentStep === 1 || currentStep === 2 || currentStep === 7 || currentStep === 8)
                            ? 'ring-2 ring-blue-500/60 border-blue-400'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Task Card Header */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {task.code}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-brand-blue bg-blue-50 px-1 py-0.2 rounded font-medium border border-blue-100">
                              {task.requirementCode}
                            </span>
                            <Badge
                              variant={
                                task.priority === 'Critical'
                                  ? 'danger'
                                  : task.priority === 'High'
                                  ? 'amber'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h4>

                        {/* Description */}
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                            <span>Progress</span>
                            <span>{task.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.progressPercent === 100 ? 'bg-emerald-500' : 'bg-brand-blue'
                              }`}
                              style={{ width: `${task.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Footer: Owner & Commit */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="font-medium text-slate-700 truncate max-w-[110px]" title={task.ownerDisplay || task.assignedAgent}>
                            {task.ownerDisplay || task.assignedAgent}
                          </span>
                          {task.commitHash ? (
                            <span className="flex items-center gap-1 font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-[9px]">
                              <GitBranch className="w-2.5 h-2.5 text-slate-400" />
                              #{task.commitHash}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Draft</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Agent Activity Panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-ping" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Simulated Agent Activity
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Simulated Multi-Agent Loop</span>
        </div>

        <Card className="p-0! overflow-hidden shadow-subtle">
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-3 hover:bg-slate-50/70 transition-colors flex items-start gap-3 text-xs"
              >
                <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                  {act.time}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline flex-wrap gap-1">
                    <strong className="text-slate-900 font-semibold">{act.actor}</strong>
                    <span className="text-slate-500">{act.action}</span>
                    <span className="font-semibold text-slate-800">{act.target}</span>
                  </div>
                  {act.details && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {act.details}
                    </p>
                  )}
                </div>
                {act.tag && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider shrink-0">
                    {act.tag}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Autonomous Orchestrator Online
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Click &lsquo;Simulate Next Activity&rsquo; to step through the workflow
            </span>
          </div>
        </Card>
      </div>

      {/* Task Detail Drawer */}
      {activeTask && (
        <Drawer
          isOpen={!!activeTask}
          onClose={() => setActiveTask(null)}
          title={`${activeTask.code}: ${activeTask.title}`}
          subtitle={`Kanban Task Inspector • Requirement: ${activeTask.requirementCode}`}
          width="xl"
        >
          {/* Status Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Workflow Lane
              </span>
              <div className="mt-1">
                <StatusPill status={activeTask.status.replace('_', ' ')} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Agent Owner
              </span>
              <span className="font-semibold text-slate-900">{activeTask.ownerDisplay || activeTask.assignedAgent}</span>
            </div>
          </div>

          {/* 1. Requirement Link & Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-blue" />
              Linked Requirement
            </h4>
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-slate-800">
              <strong className="text-brand-blue font-bold mr-2">{activeTask.requirementCode}</strong>
              <span>{activeTask.requirementTitle || 'Multi-Warehouse Business Requirement'}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {activeTask.description}
            </p>
          </div>

          {/* 2. Acceptance Criteria */}
          {activeTask.acceptanceCriteria && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Acceptance Criteria
              </h4>
              <div className="space-y-1.5">
                {activeTask.acceptanceCriteria.map((crit, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Dependencies & Files Changed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dependencies */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dependencies
              </h4>
              <div className="space-y-1">
                {activeTask.dependencies && activeTask.dependencies.length > 0 ? (
                  activeTask.dependencies.map((dep) => (
                    <div
                      key={dep}
                      className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800"
                    >
                      {dep}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No blocking dependencies</span>
                )}
              </div>
            </div>

            {/* Files Changed */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-teal-600" />
                Files Changed
              </h4>
              <div className="space-y-1">
                {activeTask.filesChanged && activeTask.filesChanged.length > 0 ? (
                  activeTask.filesChanged.map((f) => (
                    <div
                      key={f}
                      className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 truncate"
                      title={f}
                    >
                      {f}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No files modified</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Automated Tests */}
          {activeTask.testResults && activeTask.testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TestTube2 className="w-3.5 h-3.5 text-purple-600" />
                Automated Test Results
              </h4>
              <div className="space-y-1.5">
                {activeTask.testResults.map((t) => (
                  <div
                    key={t.code}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">{t.code}</span>
                      <span className="text-slate-700">{t.name}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        t.status === 'PASS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Code Review, QA Result & Security Result */}
          <div className="space-y-3 pt-2">
            {/* Code Review */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-purple-600" />
                  Code Review Gate
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  activeTask.codeReviewStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeTask.codeReviewStatus === 'Changes Requested'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {activeTask.codeReviewStatus || 'Pending'}
                </span>
              </div>
              {activeTask.codeReviewComment && (
                <p className="text-slate-600 text-[11px] pt-1">
                  {activeTask.codeReviewComment}
                </p>
              )}
            </div>

            {/* QA Result */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Independent QA Result
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  activeTask.qaResult === 'PASS'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeTask.qaResult === 'FAIL'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {activeTask.qaResult || 'Pending'}
                </span>
              </div>
              {activeTask.qaComment && (
                <p className="text-slate-600 text-[11px] pt-1">
                  {activeTask.qaComment}
                </p>
              )}
            </div>

            {/* Security Result */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  DevSecOps Scan Result
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  activeTask.securityResult === 'Passed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeTask.securityResult === 'Finding Detected'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {activeTask.securityResult || 'Pending'}
                </span>
              </div>
              {activeTask.securityComment && (
                <p className="text-slate-600 text-[11px] pt-1">
                  {activeTask.securityComment}
                </p>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
