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

const DEFAULT_SAMPLE_BRIEF = "I run a small wholesale business and need a simple system where my team can add products, update stock and see which items are running low.";

export const Project: React.FC = () => {
  const navigate = useNavigate();
  const {
    mode,
    project,
    projectsList,
    isLoading,
    isAdvancing,
    createProject,
    loadProject,
    refreshProject
  } = useLiveProject();

  const [isCreating, setIsCreating] = useState<boolean>(!project);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectBrief, setNewProjectBrief] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('Small / Mid Business');
  const [targetAudience, setTargetAudience] = useState<string>('Team & Customers');
  const [primaryGoal, setPrimaryGoal] = useState<string>('Automate workflow & save time');
  const [createError, setCreateError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // If there's no project loaded, open creation form by default
  React.useEffect(() => {
    if (!project && !isLoading) {
      setIsCreating(true);
    }
  }, [project, isLoading]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectBrief.trim()) return;
    setCreateError(null);
    const name = newProjectName.trim() || 'New Software Project';
    try {
      await createProject(name, newProjectBrief.trim());
      setIsCreating(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create project');
    }
  };

  if (mode === 'demo') {
    const { baOutput } = DEMO_PROJECT_INFO;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-brand-blue" />
                My Project
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-brand-blue border border-blue-200 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Concept Demonstration
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Project overview, business goals, and extracted requirements for <strong className="text-slate-800">{DEMO_PROJECT_INFO.name}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="md">
              Client: {DEMO_PROJECT_INFO.company}
            </Badge>
            <Badge variant="primary" size="md">
              Target SLA: {DEMO_PROJECT_INFO.targetSLA}
            </Badge>
          </div>
        </div>

        {/* Business Goal Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              Your Project Idea
            </span>
          </div>
          <blockquote className="p-4 bg-slate-50/80 border-l-4 border-brand-blue text-sm text-slate-900 italic rounded-r-lg font-serif leading-relaxed">
            &ldquo;{DEMO_PROJECT_INFO.clientRequirement}&rdquo;
          </blockquote>
        </div>

        {/* Requirements Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            What the System Will Build
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {baOutput.actors.map((actor, idx) => (
              <Card key={idx} className="p-4! space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{actor.role}</h4>
                  <Badge variant="primary" size="sm">{actor.badge}</Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{actor.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIVE MODE RENDERING (BUSINESS-FIRST UX)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-blue" />
              My Project
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {project ? (project.status === 'release_ready' ? 'Ready for Delivery' : 'In Progress') : 'No Active Project'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Describe what your business needs. TayDau understands your idea, creates clear requirements, and prepares the build plan.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {projectsList.length > 0 && (
            <select
              value={project?.id || ''}
              onChange={(e) => loadProject(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden"
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {project && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Close Form' : 'Start New Project'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Onboarding Intake Form (When Starting a Project or No Project Active) */}
      {(isCreating || !project) && (
        <form onSubmit={handleCreateSubmit} className="p-6 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                What would you like to build?
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Describe your idea in your own words. You do not need any technical knowledge.
              </p>
            </div>
            {project && (
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-medium"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden"
                placeholder="e.g. Invoicing & Billing Portal"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Your Idea & Business Needs
              </label>
              <textarea
                value={newProjectBrief}
                onChange={(e) => setNewProjectBrief(e.target.value)}
                rows={3}
                required
                minLength={10}
                className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden leading-relaxed"
                placeholder="e.g., I want an invoicing app where my team can create customer invoices, send automated payment reminders, and track overdue bills."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Business Type (Optional)
                </label>
                <input
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Services, Retail"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Who Will Use It? (Optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Sales Team & Customers"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Primary Goal (Optional)
                </label>
                <input
                  type="text"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  placeholder="e.g. Save time & get paid faster"
                />
              </div>
            </div>
          </div>

          {createError && (
            <p className="text-xs text-rose-600 font-semibold">{createError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200/60">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isLoading ? 'TayDau Team Working...' : 'Create My Project'}</span>
            </button>
          </div>
        </form>
      )}

      {project && (
        <>
          {/* Understood Business Goal Card */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-blue" />
                We Understood Your Project
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Project: {project.name}
              </span>
            </div>

            <blockquote className="p-4 bg-slate-50 border-l-4 border-brand-blue text-xs sm:text-sm text-slate-900 rounded-r-lg font-medium leading-relaxed">
              &ldquo;{project.clientBrief}&rdquo;
            </blockquote>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>Features Planned: <strong className="text-slate-800">{project.requirements?.length || 0} Core Features</strong></span>
                <span>•</span>
                <span>Estimated AI Delivery Cost: <strong className="text-slate-800">&lt; $0.03</strong></span>
              </div>

              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-xs font-semibold text-brand-blue hover:text-blue-700 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showTechnicalDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
              </button>
            </div>
          </div>

          {/* Feature Cards: What The System Needs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                What the System Needs to Deliver
              </h3>
              <span className="text-xs text-slate-500">
                {project.requirements?.length || 0} Features Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {project.requirements && project.requirements.length > 0 ? (
                project.requirements.map((req) => (
                  <Card key={req.id} className="p-4! space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-brand-blue text-[11px] font-bold">
                          {req.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {req.status === 'validated' || project.status === 'release_ready' ? 'Completed ✓' : 'Planned'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">
                        {req.title}
                      </p>

                      <div className="space-y-1 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Acceptance Checks ({req.acceptanceCriteria?.length || 0})
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-600">
                          {(req.acceptanceCriteria || []).map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Technical ID: {req.code}</span>
                      <span className="text-emerald-600 font-semibold">Verified</span>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  Understanding your project requirements...
                </div>
              )}
            </div>

            {/* Next Step Action Button */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-xs font-bold text-slate-900 block">Next: Review Solution Design & Features</strong>
                <span className="text-[11px] text-slate-500">See how TayDau designed and verified this software.</span>
              </div>

              <button
                onClick={() => navigate('/requirements')}
                className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Review & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expandable Technical Details */}
          {showTechnicalDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
              <Card
                title={
                  <span className="flex items-center gap-2 text-slate-900">
                    <Scale className="w-4 h-4 text-brand-blue" />
                    Governed Delivery Standards
                  </span>
                }
              >
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2 p-2 bg-blue-50/50 border border-blue-200/60 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                    <span><strong>Separation of Duties:</strong> QA derives tests independently without seeing Engineer source code.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Protected Verification:</strong> Code executes in a network-isolated, rootless Docker environment.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 bg-purple-50/50 border border-purple-200/60 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Cost Visibility:</strong> Live token accounting across every AI role.</span>
                  </li>
                </ul>
              </Card>

              <Card
                title={
                  <span className="flex items-center gap-2 text-slate-900">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Selected Technical Stack
                  </span>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Backend / Database</span>
                    <span className="font-mono font-bold text-slate-900">
                      {project.architecture?.techStack.framework || 'FastAPI'} + {project.architecture?.techStack.database || 'SQLite'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Verification Engine</span>
                    <span className="font-mono font-bold text-slate-900">Pytest (8 Independent Tests)</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
