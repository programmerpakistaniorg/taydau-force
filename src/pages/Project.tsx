import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Building2,
  MapPin,
  Users,
  Shield,
  Layers,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Scale,
  Compass,
  ArrowRight,
  Plus,
  Play,
  FolderCheck,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  HelpCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DEMO_PROJECT_INFO } from '../data/mockData';
import { useLiveProject } from '../context/LiveProjectContext';
import { InteractionCard } from '../components/workflow/InteractionCard';
import { ApprovalCard } from '../components/workflow/ApprovalCard';

const PROJECT_STARTER_TEMPLATES = [
  {
    label: 'Car Detailing App',
    name: 'AutoShine Detailing Platform',
    brief: 'I run a small car detailing business and need a clean web application for customers to book detailing packages, choose date/time slots, view service pricing, and for staff to manage appointments.',
    type: 'Small Business',
    audience: 'My Team & Customers',
    goal: 'Automate Bookings & Appointments',
  },
  {
    label: 'Inventory System',
    name: 'Smart Wholesale Inventory System',
    brief: 'I run a wholesale distribution business and need an inventory system where my team can add products, update stock quantities, filter low-stock items, and prevent duplicate SKUs.',
    type: 'Small Business',
    audience: 'My Team & Customers',
    goal: 'Track & Organize Data',
  },
  {
    label: 'Customer Portal',
    name: 'Client Services Portal',
    brief: 'A secure customer portal where clients can log in, view account status, submit support requests, download invoices, and review project delivery progress.',
    type: 'Service Agency / Consulting',
    audience: 'My Team & Customers',
    goal: 'Improve Customer Experience',
  },
  {
    label: 'Internal Notes API',
    name: 'Internal Notes & Task API',
    brief: 'Build an internal microservice API to create, read, update, and categorize employee notes with title, body, and tag fields. Pure backend service, no UI is required.',
    type: 'Internal Service',
    audience: 'Internal Team Only',
    goal: 'Backend Microservice API',
  },
];

export const Project: React.FC = () => {
  const navigate = useNavigate();
  const {
    mode,
    project,
    projectsList,
    isLoading,
    isActionInProgress,
    createProject,
    loadProject,
    answerInteraction,
    approveRequest,
    requestChanges,
  } = useLiveProject();

  const [isCreating, setIsCreating] = useState<boolean>(!project);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectBrief, setNewProjectBrief] = useState<string>('');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectBrief.trim()) return;
    try {
      await createProject(newProjectName.trim() || 'Untitled Project', newProjectBrief.trim());
      setIsCreating(false);
    } catch (err) {
      console.error('Project creation failed:', err);
    }
  };

  const handleApplyTemplate = (tpl: typeof PROJECT_STARTER_TEMPLATES[0], idx: number) => {
    setSelectedTemplateIndex(idx);
    setNewProjectName(tpl.name);
    setNewProjectBrief(tpl.brief);
  };

  const pendingInteraction = project?.pendingInteractions?.[0];
  const pendingApproval = project?.pendingApproval;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-brand-blue" />
            Project Onboarding & Client Decisions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Work collaboratively with your AI software team. Answer role-specific decisions and review deliverables.
          </p>
        </div>

        {mode === 'live' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue hover:bg-blue-700 text-white shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'View Active Project' : 'New Project'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Banner: Active Human Decision / Question Card */}
      {mode === 'live' && project && pendingInteraction && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <InteractionCard
            interaction={pendingInteraction}
            onSubmit={(ans) => answerInteraction(pendingInteraction.id, ans)}
            isLoading={isActionInProgress}
          />
        </div>
      )}

      {/* Top Banner: Active Human Approval Gate Card */}
      {mode === 'live' && project && pendingApproval && !pendingInteraction && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <ApprovalCard
            approval={pendingApproval}
            project={project}
            onApprove={() => approveRequest(pendingApproval.id)}
            onRequestChanges={(fb) => requestChanges(pendingApproval.id, fb)}
            isLoading={isActionInProgress}
          />
        </div>
      )}

      {/* Create Project Form */}
      {isCreating && mode === 'live' && (
        <Card className="p-6 md:p-8 border-2 border-brand-blue/30 bg-gradient-to-b from-blue-50/20 to-white">
          <div className="max-w-3xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-blue" />
              Describe What You Want Built
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Our Business Analyst will analyze your requirements, recommend sensible defaults, and orchestrate the software team.
            </p>

            {/* Inspiration Starter Chips */}
            <div className="mb-6">
              <span className="text-xs font-bold text-slate-700 block mb-2">Starter Templates:</span>
              <div className="flex flex-wrap gap-2">
                {PROJECT_STARTER_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl, idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedTemplateIndex === idx
                        ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Project Name (Optional)</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. AutoShine Detailing Platform"
                  className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Natural Language Brief</label>
                <textarea
                  value={newProjectBrief}
                  onChange={(e) => setNewProjectBrief(e.target.value)}
                  placeholder="Describe your business idea, users, and what features you need..."
                  rows={4}
                  className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none bg-white text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isActionInProgress || !newProjectBrief.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isActionInProgress ? 'Starting Team...' : 'Assemble AI Team & Deliver'}</span>
                </button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Project Overview Cards */}
      {project && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Details & Facts */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-blue" />
                Client Brief
              </h4>
              <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                "{project.clientBrief}"
              </p>
            </Card>

            {/* Confirmed Project Facts Knowledge Base */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Project Knowledge Base (Confirmed Facts)
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {project.projectFacts?.length || 0} facts recorded
                </span>
              </div>

              {project.projectFacts && project.projectFacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.projectFacts.map((f) => (
                    <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono font-bold text-indigo-700">{f.factKey}</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                          {f.confirmationStatus}
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium">
                        {typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Source: {f.sourceRole}</span>
                        <span>•</span>
                        <span>Confidence: {f.confidence * 100}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No confirmed facts recorded yet. As you answer decisions, they appear here.</p>
              )}
            </Card>
          </div>

          {/* Right Col: Interruption Telemetry & Project List */}
          <div className="space-y-6">
            {/* Interruption Telemetry */}
            <Card className="p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Client Interruption Governance
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Total Questions Asked:</span>
                  <span className="font-bold text-slate-900">{project.interruptionMetrics?.totalQuestions || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Questions Answered:</span>
                  <span className="font-bold text-emerald-700">{project.interruptionMetrics?.questionsAnswered || 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Approval Gates:</span>
                  <span className="font-bold text-indigo-700">{project.interruptionMetrics?.approvalsCount || 0}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  TayDau strictly limits client interruptions to essential professional decisions (max 3 questions per role).
                </p>
              </div>
            </Card>

            {/* Switch Active Project */}
            {projectsList.length > 0 && (
              <Card className="p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FolderCheck className="w-4 h-4 text-brand-teal" />
                  Your Projects ({projectsList.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {projectsList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadProject(p.id)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                        p.id === project?.id
                          ? 'border-brand-blue bg-blue-50/60 font-semibold text-brand-blue'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {p.progress || 0}%
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
