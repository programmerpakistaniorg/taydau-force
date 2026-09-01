import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Coins,
  Cpu,
  Layers,
  FileCheck2,
  Users,
  Compass,
  Code2,
  Calendar,
  Lock,
  ExternalLink,
  RefreshCw,
  Eye,
  Check,
  X,
  HelpCircle,
  FolderKanban,
  FileText,
  Clock,
  Terminal,
  Activity
} from 'lucide-react';
import { useLiveProject } from '../context/LiveProjectContext';
import { useSimulation } from '../context/SimulationContext';
import { ROLE_REGISTRY, type RoleKey } from '../config/roles';
import { SpecialistQuestionModal } from '../components/workflow/SpecialistQuestionModal';
import { RequirementsReviewCard } from '../components/workflow/RequirementsReviewCard';
import { DesignReviewCard } from '../components/workflow/DesignReviewCard';
import { PrototypePreview } from '../components/design/PrototypePreview';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    project,
    isPolling,
    isActionInProgress,
    createProject,
    answerInteraction,
    approveRequest,
    requestChanges,
    retryStage,
    refreshProject
  } = useLiveProject();

  const { resetSimulation } = useSimulation();

  // Local form state
  const [projectName, setProjectName] = useState<string>('');
  const [projectBrief, setProjectBrief] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Question modal state & auto-open tracking
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const presentedInteractionIdsRef = useRef<Set<string>>(new Set());

  // Requirements & Design approval modal state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  const hasProject = Boolean(project && project.id);
  const workflow = project?.workflow;
  const stage = workflow?.stage || 'created';
  const stageStatus = workflow?.stageStatus || 'ready';
  const progress = workflow?.progress ?? 0;
  const pendingInteractions = project?.pendingInteractions || [];
  const pendingApproval = project?.pendingApproval || null;

  // Auto-open question modal ONCE per new batch of interaction IDs
  useEffect(() => {
    if (stageStatus === 'waiting_for_client' && pendingInteractions.length > 0) {
      const interactionIds = pendingInteractions.map((i) => i.id);
      const isNewBatch = interactionIds.some((id) => !presentedInteractionIdsRef.current.has(id));

      if (isNewBatch) {
        interactionIds.forEach((id) => presentedInteractionIdsRef.current.add(id));
        setIsQuestionModalOpen(true);
      }
    }
  }, [stageStatus, pendingInteractions]);

  // Handle new project submission
  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectBrief.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const name = projectName.trim() || 'Software Delivery Project';
      await createProject(name, projectBrief.trim());
      setProjectBrief('');
      setProjectName('');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cost and Token metrics
  const costUsed = hasProject ? (project?.costSummary?.totalCostUsed ?? 0) : 0;
  const budgetLimit = 50.0;
  const totalTokens = hasProject
    ? ((project?.costSummary?.totalInputTokens ?? 0) + (project?.costSummary?.totalOutputTokens ?? 0))
    : 0;
  const tokenLimit = 500000;

  // Specialists workforce mapping
  const requiredRoles = workflow?.requiredRoles || [
    'business_analyst',
    'project_manager',
    'ui_ux_designer',
    'solution_architect',
    'engineer',
    'code_reviewer',
    'qa_engineer'
  ];

  const getRoleStatus = (roleKey: RoleKey): { label: string; bg: string; text: string; dot: string } => {
    if (!hasProject) {
      return { label: 'Available', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
    }

    if (!requiredRoles.includes(roleKey)) {
      return { label: 'Not Required', bg: 'bg-zinc-100', text: 'text-zinc-500', dot: 'bg-zinc-400' };
    }

    if (stageStatus === 'failed' && workflow?.activeRole === roleKey) {
      return { label: 'Needs Attention', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    }

    // Role specific completion & working status mapping
    switch (roleKey) {
      case 'business_analyst':
        if (['project_planning', 'ui_ux_design', 'technical_architecture', 'implementation', 'code_review', 'independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'business_analysis' || stage === 'requirements_review') {
          if (stageStatus === 'waiting_for_client') return { label: 'Waiting for You', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Ready', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'project_manager':
        if (['ui_ux_design', 'technical_architecture', 'implementation', 'code_review', 'independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'project_planning') {
          if (stageStatus === 'waiting_for_client') return { label: 'Waiting for You', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'ui_ux_designer':
        if (['technical_architecture', 'implementation', 'code_review', 'independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'ui_ux_design' || stage === 'design_review') {
          if (stageStatus === 'waiting_for_client') return { label: 'Waiting for You', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'solution_architect':
        if (['implementation', 'code_review', 'independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'technical_architecture') {
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'engineer':
        if (['code_review', 'independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'implementation') {
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'code_reviewer':
        if (['independent_qa', 'release_evaluation', 'completed'].includes(stage)) {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'code_review') {
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      case 'qa_engineer':
        if (stage === 'release_evaluation' || stage === 'completed') {
          return { label: 'Completed ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
        }
        if (stage === 'independent_qa') {
          return { label: 'Working', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
        }
        return { label: 'Waiting', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };

      default:
        return { label: 'Ready', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
    }
  };

  // Progression Milestones
  const PROGRESSION_MILESTONES = [
    { key: 'understand', label: 'Understand', targetProgress: 15, isApproval: false },
    { key: 'req_gate', label: 'Req Approval', targetProgress: 25, isApproval: true },
    { key: 'plan', label: 'Plan', targetProgress: 35, isApproval: false },
    { key: 'design', label: 'Design', targetProgress: 45, isApproval: false },
    { key: 'design_gate', label: 'Design Approval', targetProgress: 50, isApproval: true },
    { key: 'build', label: 'Build', targetProgress: 70, isApproval: false },
    { key: 'review', label: 'Review & QA', targetProgress: 85, isApproval: false },
    { key: 'deliver', label: 'Deliver', targetProgress: 100, isApproval: true }
  ];

  const latestDesign = project?.designSpecs?.[0];
  const isCompleted = progress === 100 || stage === 'completed' || stageStatus === 'completed';

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#172033] flex flex-col font-sans">
      {/* SECTION 1 — TOP HEADER */}
      <header className="h-[72px] px-6 lg:px-12 bg-gradient-to-r from-[#07152D] via-[#0A1D3B] to-[#07152D] text-white flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">TayDau Force</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                hasProject
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                ● {hasProject ? 'LIVE PROJECT' : 'LIVE MODE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Governed AI software delivery with independent verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Status: All Systems Operational</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (mode === 'live') {
                setMode('demo');
                resetSimulation();
              } else {
                setMode('live');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>{mode === 'live' ? 'Switch to Simulation' : 'Switch to Live'}</span>
          </button>
        </div>
      </header>

      {/* SECTION 2 & 3 & 4 — HERO SECTION */}
      <section className="bg-gradient-to-b from-[#07152D] via-[#0A1D3B] to-[#0E2648] text-white px-6 lg:px-12 pt-10 pb-16 relative overflow-hidden">
        {/* Subtle radial light effect */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          {/* Left: Headline & Copy */}
          <div className="lg:col-span-4 space-y-4 pt-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.08] text-white">
              Turn your idea into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300">
                working software.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
              Describe what your business needs. TayDau's AI software team understands it, plans it, designs it, builds it and independently verifies the result.
            </p>

            {hasProject && project && (
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Active Project: <strong>{project.name}</strong></span>
              </div>
            )}
          </div>

          {/* Center: Real Project Prompt Card */}
          <div className="lg:col-span-5">
            <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200/90 relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">
                  Describe what you want to build
                </h2>
                {hasProject && (
                  <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    Project Active
                  </span>
                )}
              </div>

              <form onSubmit={handleStartProject} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name (e.g. Prestige Auto Detail Studio)"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-slate-50/50"
                  />
                </div>

                <div>
                  <textarea
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    placeholder="Example: I run a car detailing business and need a booking, customer and service management application."
                    rows={4}
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none bg-white"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Real AI Software Team Handoff</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !projectBrief.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? 'Starting Delivery...' : 'Start a Project'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Top Live Metrics */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {/* Metric 1: Cost */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200/90">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Estimated AI Cost</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900">${costUsed.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 ml-1">/ ${budgetLimit.toFixed(2)} limit</span>
                </div>
                {hasProject && costUsed <= budgetLimit && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    On Track
                  </span>
                )}
                {!hasProject && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    Not Started
                  </span>
                )}
              </div>
            </div>

            {/* Metric 2: Tokens */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200/90">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tokens Used</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-900">{totalTokens.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1">/ 500K limit</span>
                </div>
                {hasProject && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    On Track
                  </span>
                )}
                {!hasProject && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    Not Started
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — MAIN WORKFLOW EXPERIENCE */}
      <section className="px-6 lg:px-12 -mt-8 relative z-20">
        <div className="max-w-[1440px] mx-auto bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-200 space-y-8">
          {/* Active Action Notification Bar (if decision or approval required) */}
          {stageStatus === 'waiting_for_client' && pendingInteractions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Decision Required: {pendingInteractions.length} question(s) from your AI Team
                  </h4>
                  <p className="text-xs text-amber-700">
                    {ROLE_REGISTRY[pendingInteractions[0].agentRole as RoleKey]?.personaName || 'Your Specialist'} is waiting for your input before continuing.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer"
              >
                Answer {pendingInteractions.length} Questions →
              </button>
            </div>
          )}

          {stageStatus === 'waiting_for_client' && pendingApproval && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  ◆
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">
                    {pendingApproval.artifactType === 'requirements'
                      ? 'Requirements Baseline Ready for Approval'
                      : 'Interactive UI/UX Wireframe Ready for Review'}
                  </h4>
                  <p className="text-xs text-indigo-700">
                    {pendingApproval.artifactType === 'requirements'
                      ? 'Aria Analyst has synthesized testable requirements. Review and approve to proceed.'
                      : 'Sofia Designer has synthesized visual screens and design tokens.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
              >
                {pendingApproval.artifactType === 'requirements' ? 'Review Requirements →' : 'Review Design Screens →'}
              </button>
            </div>
          )}

          {stageStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900">
                    Development Needs Attention
                  </h4>
                  <p className="text-xs text-red-700">
                    {workflow?.lastErrorSummary || 'TayDau could not safely complete this stage. Progress is securely preserved.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => retryStage()}
                disabled={isActionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Retry Development
              </button>
            </div>
          )}

          {/* 3 Core Workflow Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* COLUMN A — YOUR IDEA */}
            <div className="lg:col-span-3 border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Your Idea</h3>
                </div>

                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Your Prompt / Input
                </span>

                <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-xs text-slate-800 leading-relaxed min-h-[160px] flex flex-col justify-between">
                  <p className="italic text-slate-700">
                    {hasProject && project
                      ? `"${project.clientBrief}"`
                      : '"Describe your idea in the box above. Your project brief will appear here."'}
                  </p>

                  {hasProject && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mt-4">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Input received</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                <span>Domain: <strong>{hasProject && project ? project.name : 'Awaiting input'}</strong></span>
              </div>
            </div>

            {/* COLUMN B — TAYDAU AI DELIVERY TEAM */}
            <div className="lg:col-span-5 border border-slate-200 rounded-2xl p-5 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">TayDau AI Delivery Team</h3>
                  </div>

                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    ● {hasProject ? `${requiredRoles.length} Specialists Required` : '7 Specialists Available'}
                  </span>
                </div>

                {/* Grid of 7 Specialist Role Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
                  {(
                    [
                      'business_analyst',
                      'project_manager',
                      'ui_ux_designer',
                      'solution_architect',
                      'engineer',
                      'code_reviewer',
                      'qa_engineer'
                    ] as RoleKey[]
                  ).map((roleKey) => {
                    const roleDef = ROLE_REGISTRY[roleKey];
                    const status = getRoleStatus(roleKey);

                    return (
                      <div
                        key={roleKey}
                        className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between min-h-[92px]"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {roleDef.displayName}
                          </span>
                          <div className={`w-5 h-5 rounded-md ${roleDef.avatarBg} text-[10px] font-bold flex items-center justify-center text-slate-700 shrink-0`}>
                            {roleDef.avatarText}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real Overall Project Progress Rail */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Project Progress</span>
                  <span className="font-mono font-bold text-slate-900">{progress}%</span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3 border border-slate-200">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Milestone Labels */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] text-center text-slate-500">
                  {PROGRESSION_MILESTONES.map((m) => {
                    const isPassed = progress >= m.targetProgress;
                    return (
                      <div key={m.key} className="flex flex-col items-center">
                        <span className={`w-2 h-2 rounded-full mb-1 ${
                          isPassed ? (m.isApproval ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-blue-600') : 'bg-slate-300'
                        }`} />
                        <span className={`${isPassed ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN C — YOUR SOFTWARE PREVIEW */}
            <div className="lg:col-span-4 border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Your Software Preview</h3>
                  </div>

                  {latestDesign && (
                    <span className="text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
                      Wireframe v{latestDesign.version}
                    </span>
                  )}
                </div>

                {/* Evolving Preview Body */}
                {!hasProject && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 min-h-[220px] flex flex-col items-center justify-center">
                    <Eye className="w-8 h-8 text-slate-300 mb-2" />
                    <strong className="text-xs font-bold text-slate-700">Your Software Will Appear Here</strong>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      TayDau will first understand your project, then prepare visual screens before engineering begins.
                    </p>
                  </div>
                )}

                {hasProject && !latestDesign && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 min-h-[220px] flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <strong className="text-xs font-bold text-slate-800">
                      {stage === 'business_analysis' ? 'Aria is Analyzing Scope' : 'Marcus is Sequencing Plan'}
                    </strong>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Visual screens will be synthesized by Sofia Designer as soon as requirements are baseline-approved.
                    </p>
                  </div>
                )}

                {hasProject && latestDesign && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Wireframe Mockup Frame */}
                    <div className="bg-slate-900 px-3 py-2 text-white flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-slate-400 font-mono text-[10px] ml-2">/dashboard</span>
                      </div>
                      <span className="text-[10px] text-pink-300 font-bold">Interactive Preview</span>
                    </div>

                    <div className="p-4 space-y-3 bg-slate-50/50">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[9px] text-slate-400 block">Bookings</span>
                          <strong className="text-xs text-slate-900">120</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[9px] text-slate-400 block">Revenue</span>
                          <strong className="text-xs text-slate-900">$24,680</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[9px] text-slate-400 block">Customers</span>
                          <strong className="text-xs text-slate-900">320</strong>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                          <span>{latestDesign.summary || 'Custom Booking Experience'}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Theme: {latestDesign.design?.designSystem?.styleDirection || 'Clean Professional'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons in Column C */}
              <div className="mt-4 pt-3 border-t border-slate-200/80">
                {hasProject && pendingApproval?.artifactType === 'design' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => approveRequest(pendingApproval.id)}
                      disabled={isActionInProgress}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApprovalModalOpen(true)}
                      disabled={isActionInProgress}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                    >
                      Request Changes
                    </button>
                  </div>
                )}

                {hasProject && isCompleted && (
                  <button
                    type="button"
                    onClick={() => navigate('/delivery')}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-center cursor-pointer"
                  >
                    Review Final Delivery (100% Ready) →
                  </button>
                )}

                {(!hasProject || (!pendingApproval && !isCompleted)) && (
                  <button
                    type="button"
                    onClick={() => navigate('/architecture')}
                    disabled={!hasProject}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-all disabled:opacity-40 cursor-pointer text-center"
                  >
                    View Full Interactive Preview →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — WORKSTREAM SUMMARY CARDS */}
      <section className="px-6 lg:px-12 py-8">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Code & Implementation */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Code & Implementation
                </h3>
              </div>

              {hasProject && project?.tasks && project.tasks.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {project.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-slate-700">
                      <span className="truncate pr-2">{task.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {task.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Development has not started yet.
                </p>
              )}
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              <span>{hasProject ? `${project?.codeArtifacts?.length || 0} code files generated` : 'Awaiting start'}</span>
            </div>
          </div>

          {/* Card 2: Planning */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Planning
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Requirements Analysis</span>
                  <span className="text-[10px] text-slate-500 font-medium">Aria (BA)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Delivery Roadmap</span>
                  <span className="text-[10px] text-slate-500 font-medium">Marcus (PM)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Solution Architecture</span>
                  <span className="text-[10px] text-slate-500 font-medium">Arthur (Architect)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>QA Verification Plan</span>
                  <span className="text-[10px] text-slate-500 font-medium">Quinn (QA)</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              <span>{hasProject ? 'Autonomous Governance Active' : 'Not started'}</span>
            </div>
          </div>

          {/* Card 3: Phases */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Phases
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>1. Requirements</span>
                  <span className="font-bold text-slate-900">{progress >= 25 ? '100%' : `${Math.min(100, progress * 4)}%`}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>2. Visual Design</span>
                  <span className="font-bold text-slate-900">{progress >= 50 ? '100%' : progress >= 35 ? '50%' : '0%'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>3. Development</span>
                  <span className="font-bold text-slate-900">{progress >= 70 ? '100%' : progress >= 50 ? '50%' : '0%'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>4. Testing & Review</span>
                  <span className="font-bold text-slate-900">{progress >= 85 ? '100%' : progress >= 70 ? '50%' : '0%'}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              <span>Current Status: <strong>{stage.replace('_', ' ')}</strong></span>
            </div>
          </div>

          {/* Card 4: Deliverables */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Deliverables
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>UI/UX Design</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${latestDesign ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {latestDesign ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Technical Specification</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${project?.architecture ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {project?.architecture ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Source Code</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${project?.codeArtifacts?.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {project?.codeArtifacts?.length ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Test Plan & Cases</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${project?.qaTestArtifacts?.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {project?.qaTestArtifacts?.length ? 'Passed (8/8)' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              <span>{isCompleted ? 'All Deliverables Verified' : 'In Progress'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 — TRUST / VALUE STRIP */}
      <section className="px-6 lg:px-12 pb-16">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <h4 className="text-xs font-bold text-slate-900">Independent Testing</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Acceptance tests created and executed independently from engineers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <Coins className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <h4 className="text-xs font-bold text-slate-900">Cost Visibility</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Transparent AI usage and predictable costs from start to finish.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <Lock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <h4 className="text-xs font-bold text-slate-900">Safe Verification</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Work happens in isolated environments with multiple safety layers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <h4 className="text-xs font-bold text-slate-900">Human Approval Gates</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You review and approve at key milestones. You're always in control.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-2xs">
            <Compass className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <h4 className="text-xs font-bold text-slate-900">Traceable Delivery</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Requirements connect to design, implementation and verification.
            </p>
          </div>
        </div>
      </section>

      {/* SPECIALIST QUESTION MODAL (Auto-opened & Reopenable) */}
      <SpecialistQuestionModal
        isOpen={isQuestionModalOpen && pendingInteractions.length > 0}
        onClose={() => setIsQuestionModalOpen(false)}
        interactions={pendingInteractions}
        onSubmitAnswer={async (id, ans) => {
          await answerInteraction(id, ans);
        }}
        isLoading={isActionInProgress}
      />

      {/* REQUIREMENTS / DESIGN APPROVAL OVERLAY MODAL */}
      {isApprovalModalOpen && pendingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative">
            <button
              type="button"
              onClick={() => setIsApprovalModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {pendingApproval.artifactType === 'requirements' && project?.requirementBaselines?.[0] && project && (
              <RequirementsReviewCard
                baseline={project.requirementBaselines[0]}
                project={project}
                isLoading={isActionInProgress}
                onApprove={async () => {
                  if (pendingApproval) {
                    await approveRequest(pendingApproval.id);
                    setIsApprovalModalOpen(false);
                  }
                }}
                onRequestChanges={async (fb) => {
                  if (pendingApproval) {
                    await requestChanges(pendingApproval.id, fb);
                    setIsApprovalModalOpen(false);
                  }
                }}
              />
            )}

            {pendingApproval.artifactType === 'design' && latestDesign && project && (
              <DesignReviewCard
                designSpec={latestDesign}
                project={project}
                isLoading={isActionInProgress}
                onApprove={async () => {
                  if (pendingApproval) {
                    await approveRequest(pendingApproval.id);
                    setIsApprovalModalOpen(false);
                  }
                }}
                onRequestChanges={async (fb) => {
                  if (pendingApproval) {
                    await requestChanges(pendingApproval.id, fb);
                    setIsApprovalModalOpen(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
