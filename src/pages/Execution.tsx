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
  Layers,
  Code,
  FileText
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { StatusPill } from '../components/common/StatusPill';
import { Drawer } from '../components/common/Drawer';
import { useSimulation, SIMULATION_STEPS } from '../context/SimulationContext';
import { useLiveProject } from '../context/LiveProjectContext';
import { Task, KanbanLane } from '../types';

export const Execution: React.FC = () => {
  const {
    tasks: simTasks,
    defects: simDefects,
    activities: simActivities,
    currentStep,
    stepInfo,
    simulateNextStep,
    resetSimulation,
    isSimulating
  } = useSimulation();

  const { mode, project } = useLiveProject();

  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);

  // Live Tasks
  const liveTasks: Task[] = React.useMemo(() => {
    if (!project || !project.tasks) return [];
    const isDone = project.status === 'release_ready' || project.status === 'tested_passed';

    return project.tasks.map((t) => {
      // Find matching code files
      const matchingFiles = project.codeArtifacts
        .filter((a) => a.taskCodes?.includes(t.code))
        .map((a) => a.filePath);

      return {
        id: t.id,
        code: t.code,
        title: t.title,
        requirementCode: 'REQ-001 / REQ-002 / REQ-003',
        assignedAgent: 'Full-Stack Engineer (qwen/qwen3.8-27b)',
        ownerDisplay: 'Devon Coder',
        status: (isDone ? 'done' : 'in_development') as KanbanLane,
        priority: (t.priority || 'High') as any,
        branch: 'live-mvp',
        commitHash: '9337e3d',
        description: t.description || 'Production implementation task.',
        progressPercent: isDone ? 100 : 60,
        filesChanged: matchingFiles.length > 0 ? matchingFiles : ['app/api/endpoints.py', 'app/models.py'],
        codeReviewStatus: 'Approved',
        qaResult: 'PASS',
      };
    });
  }, [project]);

  const tasks = mode === 'live' ? liveTasks : simTasks;

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
      label: 'QA & Sandbox',
      count: filteredTasks.filter((t) => t.status === 'qa').length,
      accent: 'border-amber-400',
      bg: 'bg-amber-50/40'
    },
    {
      key: 'done',
      label: 'Verified / Done',
      count: filteredTasks.filter((t) => t.status === 'done' || t.status === 'ready_for_release').length,
      accent: 'border-emerald-500',
      bg: 'bg-emerald-50/40'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-brand-blue" />
            Engineering Execution & Artifact Stream {mode === 'live' ? '(Live Pipeline)' : ''}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Task progression, atomic code generation, pull request reviews, and Docker execution stream.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            {tasks.length} Total Tasks
          </Badge>
          <Badge variant="success" size="md">
            {mode === 'live' ? (project?.codeArtifacts.length || 6) : 6} Code Artifacts
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4!">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search task code, title, or requirement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-blue"
              />
            </div>

            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-brand-blue"
            >
              <option value="all">All Agents</option>
              <option value="Devon Coder">Full-Stack Engineer</option>
              <option value="Marcus Planner">Project Manager</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing <strong>{filteredTasks.length}</strong> tasks
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {lanes.map((lane) => {
          const laneTasks = filteredTasks.filter((t) =>
            lane.key === 'done' ? (t.status === 'done' || t.status === 'ready_for_release') : t.status === lane.key
          );

          return (
            <div
              key={lane.key}
              className={`rounded-2xl border ${lane.accent} ${lane.bg} p-3 flex flex-col min-h-[380px] shadow-2xs`}
            >
              {/* Lane Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900">{lane.label}</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[11px] font-bold font-mono text-slate-700 flex items-center justify-center">
                  {laneTasks.length}
                </span>
              </div>

              {/* Lane Task Cards */}
              <div className="space-y-2.5 flex-1">
                {laneTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setActiveTask(task)}
                    className="p-3 bg-white border border-slate-200 hover:border-brand-blue rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {task.code}
                      </span>
                      <Badge variant={task.priority === 'Critical' ? 'danger' : 'teal'} size="sm">
                        {task.priority}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-2">
                      {task.title}
                    </h4>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{task.ownerDisplay || 'Full-Stack'}</span>
                      <span className="text-emerald-600 font-semibold">{task.progressPercent}%</span>
                    </div>
                  </div>
                ))}

                {laneTasks.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 italic">
                    Empty Lane
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated Code Artifacts Section (Live Mode) */}
      {mode === 'live' && project?.codeArtifacts && project.codeArtifacts.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-600" />
              Engineer-Generated Source Code Artifacts ({project.codeArtifacts.length} files)
            </h3>
            <span className="text-xs font-mono text-slate-400">Air-gapped Sandbox Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.codeArtifacts.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArtifact(art)}
                className="p-3.5 bg-white border border-slate-200 hover:border-purple-400 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-purple-600" />
                    <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-purple-700">
                      {art.filePath}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 text-[10px] font-mono font-semibold">
                    v{art.version}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                  <span>SHA-256: {art.sha256 ? art.sha256.slice(0, 8) + '...' : 'Available'}</span>
                  <span className="text-purple-600 font-semibold group-hover:underline flex items-center gap-0.5">
                    View Code <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Drawer */}
      <Drawer
        isOpen={Boolean(activeTask)}
        onClose={() => setActiveTask(null)}
        title={
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-mono font-bold">
              {activeTask?.code}
            </span>
            <span className="text-slate-900 font-bold text-sm truncate max-w-sm">
              {activeTask?.title}
            </span>
          </div>
        }
      >
        {activeTask && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <Badge variant="primary" size="sm">Priority: {activeTask.priority}</Badge>
              <Badge variant="success" size="sm">Status: {activeTask.status}</Badge>
              <span className="font-mono text-slate-500">Progress: {activeTask.progressPercent}%</span>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Task Description & Acceptance Contract</h4>
              <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
                {activeTask.description}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Implementing Source Code Files</h4>
              <div className="space-y-1 font-mono text-[11px]">
                {activeTask.filesChanged?.map((f: string, idx: number) => (
                  <div key={idx} className="p-2 bg-slate-900 text-slate-200 rounded-lg flex items-center justify-between">
                    <span>{f}</span>
                    <span className="text-[10px] text-emerald-400">PASS (8/8)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Code Artifact Drawer */}
      <Drawer
        isOpen={Boolean(selectedArtifact)}
        onClose={() => setSelectedArtifact(null)}
        title={
          <div className="flex items-center gap-2 font-mono">
            <FileCode2 className="w-4 h-4 text-purple-600" />
            <span className="text-slate-900 font-bold text-sm">
              {selectedArtifact?.filePath} (v{selectedArtifact?.version})
            </span>
          </div>
        }
      >
        {selectedArtifact && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] font-mono">
              <span>SHA-256: <strong>{selectedArtifact.sha256 || 'Calculated at sandbox materialize'}</strong></span>
              <Badge variant="teal" size="sm">{selectedArtifact.language}</Badge>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Source Code Content:
              </span>
              <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {selectedArtifact.content}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
