import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { DEMO_PROJECT_INFO } from '../data/mockData';
import { useLiveProject } from '../context/LiveProjectContext';

const DEFAULT_SAMPLE_BRIEF = "Create an inventory API where users can add products, update stock quantities, and retrieve products below their low-stock threshold.";

export const Project: React.FC = () => {
  const {
    mode,
    project,
    projectsList,
    isLoading,
    isAdvancing,
    createProject,
    loadProject,
    loadVerifiedProject,
    refreshProject
  } = useLiveProject();

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('Inventory Management Service');
  const [newProjectBrief, setNewProjectBrief] = useState<string>(DEFAULT_SAMPLE_BRIEF);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectBrief.trim()) return;
    setCreateError(null);
    try {
      await createProject(newProjectName.trim(), newProjectBrief.trim());
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
                Project & Business Analysis
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Simulation Baseline
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Client requirement elicitation, identified actors, business rules, and domain risk analysis for <strong className="text-slate-800">{DEMO_PROJECT_INFO.name}</strong>.
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

        {/* Original Client Brief Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              Original Client Brief
            </span>
            <span className="text-[11px] font-mono text-slate-400">Captured at Stage 1 (Client Idea)</span>
          </div>
          <blockquote className="p-4 bg-slate-50/80 border-l-4 border-brand-blue text-sm text-slate-900 italic rounded-r-lg font-serif leading-relaxed">
            &ldquo;{DEMO_PROJECT_INFO.clientRequirement}&rdquo;
          </blockquote>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
            <span>Deconstructed into <strong>10 core specifications</strong></span>
            <span>•</span>
            <span>Lead Agent: <strong>Aria Analyst (Business Analyst)</strong></span>
            <span>•</span>
            <span>Target Architecture: <strong>Autonomous Verified Build</strong></span>
          </div>
        </div>

        {/* Business Analyst Output Banner */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Business Analyst Output & Discovery Specification
            </h3>
            <span className="text-xs text-slate-400 font-mono">Stage 2 Output (Analysis)</span>
          </div>

          {/* 1. Business Objective */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <Compass className="w-4 h-4 text-brand-blue" />
                1. Business Objective
              </span>
            }
          >
            <p className="text-xs text-slate-700 leading-relaxed">
              {baOutput.businessObjective}
            </p>
          </Card>

          {/* 2. Identified Actors */}
          <Card
            title={
              <span className="flex items-center gap-2 text-slate-900">
                <Users className="w-4 h-4 text-brand-teal" />
                2. Identified Actors & Persona Hierarchy
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {baOutput.actors.map((actor, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{actor.role}</h4>
                    <Badge variant={actor.badge === 'Administrative' ? 'danger' : actor.badge === 'Managerial' ? 'teal' : 'primary'} size="sm">
                      {actor.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {actor.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Functional Scope & 4. Business Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-900">
                  <Layers className="w-4 h-4 text-purple-600" />
                  3. Functional Scope
                </span>
              }
            >
              <ul className="space-y-2 text-xs text-slate-700">
                {baOutput.functionalScope.map((scope, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title={
                <span className="flex items-center gap-2 text-slate-900">
                  <Scale className="w-4 h-4 text-amber-600" />
                  4. Mandatory Business Rules
                </span>
              }
            >
              <ul className="space-y-2 text-xs text-slate-700">
                {baOutput.businessRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                    <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-900 text-[11px]">{rule}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* 5. Risks & 6. Assumptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title={
                <span className="flex items-center gap-2 text-slate-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  5. Technical & Domain Risks
                </span>
              }
            >
              <ul className="space-y-2 text-xs text-slate-700">
                {baOutput.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-rose-50/50 border border-rose-200/60 rounded-lg">
                    <span className="text-rose-600 font-bold text-xs shrink-0 mt-0.5">⚠</span>
                    <span className="text-[11px] text-rose-950 font-medium">{risk}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title={
                <span className="flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-4 h-4 text-brand-blue" />
                  6. Architectural Assumptions
                </span>
              }
            >
              <ul className="space-y-2 text-xs text-slate-700">
                {baOutput.assumptions.map((assump, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-blue-50/40 border border-blue-200/60 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 mt-1.5" />
                    <span className="text-[11px] text-slate-800">{assump}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIVE MODE RENDERING
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Live Header & Project Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-blue" />
              Project & Business Analysis (Live Mode)
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {project?.status === 'release_ready' ? 'Delivery Certified' : 'Live Groq Pipeline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real persisted business analysis and requirements for active project <strong className="text-slate-800">{project?.name || 'Loading...'}</strong>.
          </p>
        </div>

        {/* Action Buttons & Project Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Switcher Select */}
          {projectsList.length > 0 && (
            <select
              value={project?.id || ''}
              onChange={(e) => loadProject(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden"
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadVerifiedProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs"
            title="Load the 8/8 Passed Release Ready Verified Project"
          >
            <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Project</span>
          </button>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start New Delivery</span>
          </button>
        </div>
      </div>

      {/* Start New Delivery Expandable Modal / Form */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-blue" />
              Launch Governed AI Software Delivery
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden"
                placeholder="e.g. Smart Inventory Microservice"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Product Brief (Requirements to extract)
              </label>
              <textarea
                value={newProjectBrief}
                onChange={(e) => setNewProjectBrief(e.target.value)}
                rows={3}
                required
                minLength={10}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-brand-blue focus:outline-hidden"
                placeholder="Describe product brief..."
              />
            </div>
          </div>

          {createError && (
            <p className="text-xs text-rose-600 font-semibold">{createError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Starting Live Pipeline...' : 'Start TayDau Workforce'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Real Client Brief Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-subtle space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            Authoritative Client Brief
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Project ID: {project?.id || 'None'}
          </span>
        </div>
        <blockquote className="p-4 bg-slate-50/80 border-l-4 border-brand-blue text-sm text-slate-900 italic rounded-r-lg font-serif leading-relaxed">
          &ldquo;{project?.clientBrief || DEFAULT_SAMPLE_BRIEF}&rdquo;
        </blockquote>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
          <span>Persisted Requirements: <strong>{project?.requirements.length || 0} extracted</strong></span>
          <span>•</span>
          <span>Lead Agent: <strong>Business Analyst (qwen/qwen3.8-27b)</strong></span>
          <span>•</span>
          <span>Target Architecture: <strong>FastAPI + SQLite + Docker Sandbox</strong></span>
        </div>
      </div>

      {/* Business Analyst Extracted Requirements Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Persisted Requirements Extracted by Business Analyst
          </h3>
          <span className="text-xs text-slate-400 font-mono">Stage 2 Live Output</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {project?.requirements && project.requirements.length > 0 ? (
            project.requirements.map((req) => (
              <Card key={req.id} className="p-4! space-y-2.5">
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
                    {req.code}
                  </span>
                  <Badge variant={req.priority === 'Critical' ? 'danger' : 'teal'} size="sm">
                    {req.type}
                  </Badge>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{req.title}</h4>
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Acceptance Criteria ({req.acceptanceCriteria.length})
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {req.acceptanceCriteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
              No requirements analyzed yet. Advance stage to trigger Business Analyst.
            </div>
          )}
        </div>
      </div>

      {/* Technical Contract & Architectural Assumptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <Scale className="w-4 h-4 text-brand-blue" />
              Governed Delivery Rules & Standards
            </span>
          }
        >
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-start gap-2 p-2 bg-blue-50/50 border border-blue-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
              <span><strong>Separation of Duties:</strong> QA derives independent tests without seeing Engineer source code.</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-emerald-50/50 border border-emerald-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Hardened Sandbox:</strong> Code executes in rootless, air-gapped Docker container with resource limits.</span>
            </li>
            <li className="flex items-start gap-2 p-2 bg-purple-50/50 border border-purple-200/60 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span><strong>Cost Governor:</strong> Real-time token telemetry on every Groq model call.</span>
            </li>
          </ul>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2 text-slate-900">
              <Compass className="w-4 h-4 text-emerald-600" />
              Architecture Decisions & Tech Stack
            </span>
          }
        >
          {project?.architecture ? (
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-slate-700">Framework / DB</span>
                <span className="font-mono font-bold text-slate-900">
                  {project.architecture.techStack.framework} + {project.architecture.techStack.database}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Key Architectural Decisions ({project.architecture.decisions.length})
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  {project.architecture.decisions.map((d, i) => (
                    <li key={i} className="p-2 bg-slate-50 rounded border border-slate-100">
                      <strong>{d.title}:</strong> {d.decision}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Architecture specification will appear once Solution Architect stage is reached.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
