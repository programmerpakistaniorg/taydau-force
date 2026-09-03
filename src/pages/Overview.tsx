import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Code2,
  FileText,
  Workflow as WorkflowIcon,
  HelpCircle,
  Eye,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Layers,
  Flag,
  RotateCcw,
  CheckCircle2,
  FileCode,
  FolderKanban,
  Shield,
  Clock,
  Terminal,
  Activity,
  PauseCircle,
  StopCircle,
  Square,
  Play,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { useLiveProject } from '../context/LiveProjectContext';
import { SpecialistQuestionModal } from '../components/workflow/SpecialistQuestionModal';
import { RequirementsReviewCard } from '../components/workflow/RequirementsReviewCard';
import { DesignReviewCard } from '../components/workflow/DesignReviewCard';
import { type RoleKey } from '../config/roles';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const {
    project,
    isActionInProgress,
    createProject,
    answerInteraction,
    approveRequest,
    requestChanges,
    retryStage,
    pauseProject,
    resumeProject,
    endProject,
    clearActiveProject
  } = useLiveProject();

  // Form states
  const [projectName, setProjectName] = useState<string>('');
  const [projectBrief, setProjectBrief] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);

  // Bottom section active tab: 'code' | 'documents' | 'phases'
  const [activeBottomTab, setActiveBottomTab] = useState<'code' | 'documents' | 'phases'>('code');

  // Question modal state & tracking
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const presentedInteractionIdsRef = useRef<Set<string>>(new Set());

  // Approval modal state
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  // Stop / Pause / End project modal state
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);
  const [stopModalMode, setStopModalMode] = useState<'stop_only' | 'new_project'>('stop_only');
  const [isStoppingProject, setIsStoppingProject] = useState<boolean>(false);

  const hasProject = Boolean(project && project.id);
  const workflow = project?.workflow;
  const stage = workflow?.stage || 'created';
  const stageStatus = workflow?.stageStatus || 'ready';
  const progress = workflow?.progress ?? 0;
  const pendingInteractions = project?.pendingInteractions || [];
  const pendingApproval = project?.pendingApproval || null;

  // Auto-open question modal ONCE per new batch
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

  // Handle project start
  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectBrief.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const name = projectName.trim() || 'Autonomous Delivery Project';
      await createProject(name, projectBrief.trim());
      setProjectBrief('');
      setProjectName('');
      setIsPromptModalOpen(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerInteraction = async (interactionId: string, answer: any) => {
    try {
      await answerInteraction(interactionId, answer);
    } catch (err) {
      console.error('Failed to answer interaction:', err);
    }
  };

  const handleApprove = async () => {
    if (!pendingApproval) return;
    try {
      await approveRequest(pendingApproval.id);
      setIsApprovalModalOpen(false);
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleRequestChanges = async (feedback: string) => {
    if (!pendingApproval) return;
    try {
      await requestChanges(pendingApproval.id, feedback);
      setIsApprovalModalOpen(false);
    } catch (err) {
      console.error('Failed to request changes:', err);
    }
  };

  const handleRetry = async () => {
    try {
      await retryStage();
    } catch (err) {
      console.error('Failed to retry stage:', err);
    }
  };

  const handleStopClick = () => {
    setStopModalMode('stop_only');
    setIsStopModalOpen(true);
  };

  const handleNewProjectClick = () => {
    const isRunning = hasProject && stageStatus !== 'completed' && stageStatus !== 'cancelled' && stageStatus !== 'paused';
    if (isRunning) {
      setStopModalMode('new_project');
      setIsStopModalOpen(true);
    } else {
      setIsPromptModalOpen(true);
    }
  };

  const handlePauseConfirm = async () => {
    setIsStoppingProject(true);
    try {
      await pauseProject();
      setIsStopModalOpen(false);
      if (stopModalMode === 'new_project') {
        setIsPromptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to pause project:', err);
    } finally {
      setIsStoppingProject(false);
    }
  };

  const handleEndConfirm = async () => {
    setIsStoppingProject(true);
    try {
      await endProject();
      setIsStopModalOpen(false);
      if (stopModalMode === 'new_project') {
        setIsPromptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to end project:', err);
    } finally {
      setIsStoppingProject(false);
    }
  };

  const handleResumeClick = async () => {
    try {
      await resumeProject();
    } catch (err) {
      console.error('Failed to resume project:', err);
    }
  };


  // Full 7 Specialists + DevOps System Stage Definition
  const rails = [
    {
      index: 1,
      roleKey: 'business_analyst' as RoleKey,
      roleName: 'Business Analyst',
      personName: 'Aria Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      initials: 'AJ',
      yPos: 25,
      isCompleted: Boolean(workflow?.approvedRequirementBaselineId || (project?.requirementBaselines && project.requirementBaselines.length > 0)),
      isWorking: stage === 'business_analysis' || (stage === 'requirements_review' && stageStatus === 'running'),
      isWaiting: stageStatus === 'waiting_for_client' && (stage === 'business_analysis' || stage === 'requirements_review'),
      evidencePct: workflow?.approvedRequirementBaselineId ? 100 : stage === 'requirements_review' ? 75 : (project?.requirementBaselines && project.requirementBaselines.length > 0) ? 50 : stage === 'business_analysis' ? 25 : 0,
      activities: [
        'Reviewing your business brief',
        'Identifying user roles & boundaries',
        'Checking requirement ambiguity',
        'Synthesizing testable baseline'
      ],
      outputName: 'Requirements Baseline v1'
    },
    {
      index: 2,
      roleKey: 'project_manager' as RoleKey,
      roleName: 'Project Manager',
      personName: 'Marcus Lee',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      initials: 'ML',
      yPos: 75,
      isCompleted: Boolean(project?.tasks && project.tasks.length > 0 && progress >= 35),
      isWorking: stage === 'project_planning' && stageStatus === 'running',
      isWaiting: stageStatus === 'waiting_for_client' && stage === 'project_planning',
      evidencePct: (project?.tasks && project.tasks.length > 0 && progress >= 35) ? 100 : stage === 'project_planning' ? 50 : 0,
      activities: [
        'Reviewing approved requirements',
        'Sequencing task dependencies',
        'Planning delivery roadmap',
        'Assessing delivery risk matrix'
      ],
      outputName: 'Delivery Plan & Workstreams'
    },
    {
      index: 3,
      roleKey: 'ui_ux_designer' as RoleKey,
      roleName: 'UI/UX Designer',
      personName: 'Sofia Martinez',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      initials: 'SM',
      yPos: 125,
      isCompleted: Boolean(workflow?.approvedDesignSpecId || (project?.designSpecs && project.designSpecs.length > 0 && progress >= 50)),
      isWorking: stage === 'ui_ux_design' || (stage === 'design_review' && stageStatus === 'running'),
      isWaiting: stageStatus === 'waiting_for_client' && (stage === 'ui_ux_design' || stage === 'design_review'),
      evidencePct: workflow?.approvedDesignSpecId ? 100 : (project?.designSpecs && project.designSpecs.length > 0) ? 75 : stage === 'ui_ux_design' ? 50 : 0,
      activities: [
        'Mapping user journeys',
        'Structuring component tokens',
        'Preparing visual layout hierarchy',
        'Generating interactive screen designs'
      ],
      outputName: 'Interactive UI/UX Wireframe'
    },
    {
      index: 4,
      roleKey: 'architect' as RoleKey,
      roleName: 'Solution Architect',
      personName: 'Arthur Pendelton',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      initials: 'AP',
      yPos: 175,
      isCompleted: Boolean(project?.architecture && progress >= 60),
      isWorking: stage === 'architecture' && stageStatus === 'running',
      isWaiting: stageStatus === 'waiting_for_client' && stage === 'architecture',
      evidencePct: project?.architecture ? 100 : stage === 'architecture' ? 50 : 0,
      activities: [
        'Analyzing schema boundaries',
        'Defining REST & DB contracts',
        'Establishing security constraints',
        'Generating architecture specification'
      ],
      outputName: 'System Architecture Specification'
    },
    {
      index: 5,
      roleKey: 'engineer' as RoleKey,
      roleName: 'Full-Stack Developer',
      personName: 'Devon Brown',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      initials: 'DB',
      yPos: 225,
      isCompleted: Boolean(project?.codeArtifacts && project.codeArtifacts.length > 0 && progress >= 75),
      isWorking: stage === 'engineering' && stageStatus === 'running',
      isWaiting: stageStatus === 'waiting_for_client' && stage === 'engineering',
      evidencePct: (project?.codeArtifacts && project.codeArtifacts.length > 0 && progress >= 75) ? 100 : stage === 'engineering' ? 50 : 0,
      activities: [
        'Scaffolding project structure',
        'Implementing API endpoints',
        'Generating database schemas',
        'Building client views & controllers'
      ],
      outputName: 'Production Source Code'
    },
    {
      index: 6,
      roleKey: 'reviewer' as RoleKey,
      roleName: 'Code Reviewer',
      personName: 'Dr. Evelyn Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
      initials: 'EV',
      yPos: 275,
      isCompleted: Boolean(progress >= 85),
      isWorking: stage === 'code_review' && stageStatus === 'running',
      isWaiting: false,
      evidencePct: progress >= 85 ? 100 : stage === 'code_review' ? 50 : 0,
      activities: [
        'Auditing code against architectural rules',
        'Inspecting security threat vulnerabilities',
        'Checking secret leakage & env safety',
        'Issuing independent sign-off'
      ],
      outputName: 'Code Review & Security Audit'
    },
    {
      index: 7,
      roleKey: 'qa_engineer' as RoleKey,
      roleName: 'Independent QA',
      personName: 'Quinn Quality',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      initials: 'QQ',
      yPos: 325,
      isCompleted: stage === 'completed' || Boolean(project?.qaTestArtifacts && project.qaTestArtifacts.length > 0 && progress >= 100),
      isWorking: stage === 'testing' && stageStatus === 'running',
      isWaiting: stageStatus === 'failed',
      evidencePct: (stage === 'completed' || (project?.qaTestArtifacts && project.qaTestArtifacts.length > 0 && progress >= 100)) ? 100 : stage === 'testing' ? 50 : 0,
      activities: [
        'Running isolated container tests',
        'Verifying acceptance criteria',
        'Checking boundary edge cases',
        'Issuing independent QA release verdict'
      ],
      outputName: 'Automated QA Test Suite'
    },
  ];

  // Active rail indicator
  const activeRail = rails.find((r) => r.isWorking || r.isWaiting) || rails[0];

  // Derive Top Mission-Control Current Stage & Next Action
  const getCurrentStageSummary = () => {
    if (!hasProject) {
      return { stageText: 'Awaiting project prompt', nextText: 'Enter your business idea to begin delivery loop' };
    }
    if (stage === 'business_analysis') {
      return { stageText: 'Aria is analyzing business requirements', nextText: 'Requirements Baseline Approval' };
    }
    if (stage === 'requirements_review') {
      return { stageText: 'Requirements Baseline ready for client review', nextText: 'Review and approve requirements' };
    }
    if (stage === 'project_planning') {
      return { stageText: 'Marcus is planning delivery roadmap & tasks', nextText: 'UI/UX Visual Design' };
    }
    if (stage === 'ui_ux_design') {
      return { stageText: 'Sofia is synthesizing interactive UI/UX design', nextText: 'Design Screen Approval' };
    }
    if (stage === 'design_review') {
      return { stageText: 'Sofia is waiting for design screen approval', nextText: 'Review and approve design wireframes' };
    }
    if (stage === 'architecture') {
      return { stageText: 'Arthur is generating system architecture & schema', nextText: 'Full Stack Engineering' };
    }
    if (stage === 'engineering') {
      return { stageText: 'Devon is coding backend services and APIs', nextText: 'Code Review & Security Audit' };
    }
    if (stage === 'code_review') {
      return { stageText: 'Dr. Evelyn is conducting independent code review', nextText: 'Automated QA Verification' };
    }
    if (stage === 'testing') {
      return { stageText: 'Quinn is executing automated QA in isolated sandbox', nextText: 'Final Release Delivery' };
    }
    return { stageText: '100% Release Ready & Verified', nextText: 'Deployment & Client Handover' };
  };

  const stageSummary = getCurrentStageSummary();
  const latestDesignArtifact = project?.designArtifacts?.[0] || null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1650px] mx-auto space-y-6 font-sans">
      {/* CSS Animation Keyframes for Laser Flow */}
      <style>{`
        @keyframes laserBeam {
          0% { stroke-dashoffset: 120; }
          100% { stroke-dashoffset: 0; }
        }
        .laser-glow {
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.85));
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* TOP MISSION CONTROL STATUS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl px-5 py-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="font-bold text-slate-800">Current Stage:</span>
          <span className="text-slate-600">{stageSummary.stageText}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Next:</span>
          <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
            {stageSummary.nextText}
          </span>
        </div>
      </div>

      {/* Persistent Amber Banner: Waiting for Question Decisions */}
      {stageStatus === 'waiting_for_client' && pendingInteractions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Aria Analyst needs your input ({pendingInteractions.length} question
                {pendingInteractions.length > 1 ? 's' : ''})
              </h4>
              <p className="text-xs text-amber-800">
                Your decisions guide the requirements scope and system capabilities.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuestionModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer"
          >
            Answer {pendingInteractions.length} Question{pendingInteractions.length > 1 ? 's' : ''} →
          </button>
        </div>
      )}

      {/* Persistent Blue Banner: Waiting for Client Approval */}
      {stageStatus === 'waiting_for_client' && pendingApproval && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              ◆
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">
                {pendingApproval.artifactType === 'requirements'
                  ? 'Requirements Baseline Ready for Approval'
                  : 'Interactive UI/UX Wireframe Ready for Review'}
              </h4>
              <p className="text-xs text-blue-700">
                {pendingApproval.artifactType === 'requirements'
                  ? 'Aria Analyst has synthesized testable requirements. Review and approve to proceed.'
                  : 'Sofia Designer has synthesized visual screen designs. Review to proceed.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (pendingApproval.artifactType === 'design') {
                navigate('/architecture');
              } else {
                setIsApprovalModalOpen(true);
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
          >
            {pendingApproval.artifactType === 'requirements'
              ? 'Review Requirements →'
              : 'Review Design Screens →'}
          </button>
        </div>
      )}

      {/* Failure Alert Banner */}
      {stageStatus === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-950">Development Needs Attention</h4>
              <p className="text-xs text-red-800">
                {workflow?.lastErrorSummary || 'A verification check failed. Upstream artifacts remain safely preserved.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer"
          >
            Retry Development
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VISUAL DELIVERY PIPELINE SYSTEM (Connected with Animated SVG Curved Cables) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-0 relative">
          {/* ------------------------------------------------------------- */}
          {/* 1A. LEFT: PROMPT CARD */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full lg:w-[260px] xl:w-[290px] shrink-0 relative z-10">
            <div
              className={`bg-white rounded-2xl p-5 border-2 transition-all shadow-md relative ${
                hasProject
                  ? 'border-blue-500/80 shadow-blue-500/10'
                  : 'border-blue-400/80 hover:border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Prompt</span>
                </div>

                {hasProject && (
                  <div className="flex items-center gap-1.5">
                    {stageStatus === 'paused' ? (
                      <button
                        type="button"
                        onClick={handleResumeClick}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Resume Project Delivery"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    ) : stageStatus !== 'cancelled' && stageStatus !== 'completed' ? (
                      <button
                        type="button"
                        onClick={handleStopClick}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                        title="Stop or Pause Project"
                      >
                        <Square className="w-2.5 h-2.5 fill-current text-rose-500" />
                        <span>Stop</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleNewProjectClick}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    >
                      + New
                    </button>
                  </div>
                )}
              </div>

              {hasProject ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {project?.name}
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-4 leading-relaxed">
                    “{project?.clientBrief}”
                  </p>

                  {stageStatus === 'paused' ? (
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Paused (Saved)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResumeClick}
                        className="underline hover:text-amber-900 cursor-pointer font-extrabold"
                      >
                        Resume ▶
                      </button>
                    </div>
                  ) : stageStatus === 'cancelled' ? (
                    <div className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1">
                      <StopCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Project Ended</span>
                    </div>
                  ) : stageStatus === 'completed' ? (
                    <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>100% Delivery Completed</span>
                    </div>
                  ) : (
                    <div className="text-[10px] font-semibold text-emerald-600 flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active in Delivery Loop</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStopClick}
                        className="text-slate-400 hover:text-rose-600 text-[10px] font-medium cursor-pointer transition-colors"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleStartProject} className="space-y-3">
                  <div>
                    <input
                      id="project-name-input"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Project Name (e.g. Soltrade)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <textarea
                      id="project-brief-input"
                      rows={3}
                      value={projectBrief}
                      onChange={(e) => setProjectBrief(e.target.value)}
                      placeholder="Describe what software to build..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-normal"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !projectBrief.trim()}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Pipeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Right Connector Node Dot */}
              <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-600 border-4 border-white shadow-md z-20" />
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1B. LEFT SVG CURVED BRANCHING CABLES (Prompt -> Rails) */}
          {/* ------------------------------------------------------------- */}
          <div className="hidden lg:block w-12 xl:w-16 h-[350px] shrink-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 60 350" fill="none" preserveAspectRatio="none">
              {rails.map((rail) => {
                const isRailActive = rail.isWorking || rail.isWaiting;
                const pathD = `M 0,175 C 25,175 35,${rail.yPos} 60,${rail.yPos}`;

                return (
                  <g key={`left-curve-${rail.index}`}>
                    {/* Background faint guide curve */}
                    <path
                      d={pathD}
                      stroke={rail.isCompleted ? '#3b82f6' : '#e2e8f0'}
                      strokeWidth={rail.isCompleted ? 2.5 : 1.8}
                      strokeLinecap="round"
                    />

                    {/* Active glowing laser flow animation */}
                    {isRailActive && (
                      <path
                        d={pathD}
                        stroke="#2563eb"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="laser-glow"
                        strokeDasharray="16 8"
                        style={{
                          animation: 'laserBeam 1.2s linear infinite'
                        }}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1C. CENTER: 7 SPECIALIST HORIZONTAL RAILS */}
          {/* ------------------------------------------------------------- */}
          <div className="flex-1 w-full max-w-[560px] flex flex-col justify-center space-y-2.5 py-1 z-10">
            {rails.map((rail) => {
              const isRailActive = rail.isWorking || rail.isWaiting;

              return (
                <div
                  key={rail.index}
                  className="flex items-center gap-2 relative group"
                >
                  {/* Step Index Badge (1) to (7) */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      rail.isCompleted
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : isRailActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-100'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {rail.index}
                  </div>

                  {/* Horizontal Track with Step Checkpoints (25%, 50%, 75%, 100%) */}
                  <div className="flex-1 relative flex items-center px-1">
                    {/* Background track line */}
                    <div className="absolute left-0 right-0 h-[2px] bg-slate-200" />

                    {/* Active colored progress fill based on real evidence */}
                    <div
                      className={`absolute left-0 h-[2px] transition-all duration-700 ${
                        rail.isCompleted ? 'bg-blue-600' : isRailActive ? 'bg-blue-500' : 'bg-transparent'
                      }`}
                      style={{ width: `${rail.evidencePct}%` }}
                    />

                    {/* Glowing animated laser pulse along active rail */}
                    {isRailActive && (
                      <div className="absolute left-0 right-0 h-4 pointer-events-none overflow-hidden -top-1">
                        <div className="w-16 h-full bg-gradient-to-r from-transparent via-blue-400/90 to-transparent blur-[2px] animate-[pulse_1.5s_infinite]" />
                      </div>
                    )}

                    {/* Step Milestone Dots */}
                    <div className="relative w-full flex items-center justify-between text-[8px] font-semibold text-slate-400">
                      {[
                        { label: '25%', val: 25 },
                        { label: '50%', val: 50 },
                        { label: '75%', val: 75 },
                        { label: '100%', val: 100 },
                      ].map((step) => {
                        const isWaitingHere = rail.isWaiting && step.val === 50;
                        return (
                          <div key={step.label} className="flex flex-col items-center -mt-3">
                            <span className="text-[8px] text-slate-400 font-medium mb-0.5">
                              {step.label}
                            </span>
                            {isWaitingHere ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-200 animate-ping" />
                            ) : (
                              <div
                                className={`w-2 h-2 rounded-full transition-all ${
                                  rail.evidencePct >= step.val
                                    ? 'bg-blue-600 ring-2 ring-blue-100'
                                    : 'bg-slate-300'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Checkbox [✓] or Active Indicator */}
                  <div className="shrink-0">
                    {rail.isCompleted ? (
                      <div className="w-5 h-5 rounded-md bg-blue-50 border-2 border-blue-600 text-blue-600 flex items-center justify-center font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : isRailActive ? (
                      <div className="w-5 h-5 rounded-md border-2 border-dashed border-blue-500 bg-blue-50/50 flex items-center justify-center text-blue-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center" />
                    )}
                  </div>

                  {/* Specialist Card (Avatar, Role, Name) */}
                  <div
                    className={`min-w-[145px] xl:min-w-[160px] p-1.5 px-2 rounded-xl border flex items-center gap-2 transition-all ${
                      isRailActive
                        ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-1 ring-blue-200'
                        : rail.isCompleted
                        ? 'bg-white border-slate-200'
                        : 'bg-white border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-[9px] text-slate-600">
                      {rail.avatarUrl ? (
                        <img
                          src={rail.avatarUrl}
                          alt={rail.personName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        rail.initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 truncate">
                        {rail.roleName}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate font-normal">
                        {rail.personName}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1D. RIGHT SVG CURVED CONVERGING CABLES (Rails -> Live Workbench) */}
          {/* ------------------------------------------------------------- */}
          <div className="hidden lg:block w-12 xl:w-16 h-[350px] shrink-0 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 60 350" fill="none" preserveAspectRatio="none">
              {rails.map((rail) => {
                const isRailActive = rail.isWorking || rail.isWaiting;
                const pathD = `M 0,${rail.yPos} C 25,${rail.yPos} 35,175 52,175`;

                return (
                  <g key={`right-curve-${rail.index}`}>
                    <path
                      d={pathD}
                      stroke={rail.isCompleted ? '#3b82f6' : '#e2e8f0'}
                      strokeWidth={rail.isCompleted ? 2.5 : 1.8}
                      strokeLinecap="round"
                    />

                    {isRailActive && (
                      <path
                        d={pathD}
                        stroke="#2563eb"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="laser-glow"
                        strokeDasharray="16 8"
                        style={{
                          animation: 'laserBeam 1.2s linear infinite'
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Converged Arrowhead pointing into Live Workbench */}
              <polygon
                points="52,170 60,175 52,180"
                fill="#2563eb"
              />
            </svg>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1E. RIGHT: LIVE WORKBENCH */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 z-10">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-4 relative">
              {/* Header Title & Active Sparkle */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Live Workbench
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {activeRail.roleName}
                </span>
              </div>

              {/* Dynamic Workbench Content Based on Active Specialist */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 min-h-[170px] flex flex-col justify-between space-y-3">
                {stage === 'ui_ux_design' || stage === 'design_review' ? (
                  latestDesignArtifact ? (
                    <div className="space-y-2 text-left">
                      <div className="text-[11px] font-bold text-blue-700 flex items-center justify-between">
                        <span>{latestDesignArtifact.screenKey || 'Interactive Wireframe'}</span>
                        <span className="text-[9px] text-slate-400 font-mono">Stitch v1</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-[10px] text-slate-600 line-clamp-3 leading-relaxed">
                        {latestDesignArtifact.content?.slice(0, 140) || 'Visual layout tokens and component specifications.'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2 text-center">
                      <div className="w-full h-16 bg-blue-100/50 rounded-xl border border-blue-200/50 flex items-center justify-center text-blue-500">
                        <Layers className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">Synthesizing Screen Layouts...</span>
                    </div>
                  )
                ) : stage === 'engineering' ? (
                  <div className="space-y-2 text-left font-mono text-[10px]">
                    <div className="text-slate-800 font-bold font-sans text-xs">Generating Project Structure:</div>
                    <div className="bg-slate-900 text-slate-200 p-2.5 rounded-xl space-y-1 font-mono text-[10px]">
                      <div className="text-emerald-400">✓ app/main.py</div>
                      <div className="text-emerald-400">✓ app/models/schema.py</div>
                      <div className="text-cyan-300">● app/routes/api.py (generating)</div>
                    </div>
                  </div>
                ) : stage === 'testing' ? (
                  <div className="space-y-2 text-left text-[11px]">
                    <div className="font-bold text-slate-800">QA Assertion Matrix:</div>
                    <div className="space-y-1 text-slate-600 text-[10px]">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Unit test contracts verified</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Security & secret leak audit passed</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                        <span>Running isolated Docker container tests...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>{activeRail.personName} is working...</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-600">
                      {activeRail.activities.slice(0, 3).map((act, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-blue-500">•</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Working Status Footer */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-medium truncate max-w-[160px]">
                    Output: {activeRail.outputName}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                </div>

                {/* Approve Design Button if Design Ready */}
                {pendingApproval?.artifactType === 'design' && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                  >
                    ✓ Approve Design & Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOTTOM SECTION: TABBED WORKBENCH (Code | Documents & Planning | Phases) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        {/* Clean Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveBottomTab('code')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeBottomTab === 'code'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Code</span>
              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[10px] text-blue-700 border border-blue-200 font-bold">
                {project?.codeArtifacts?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('documents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeBottomTab === 'documents'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documents & Planning</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBottomTab('phases')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeBottomTab === 'phases'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <WorkflowIcon className="w-4 h-4" />
              <span>Phases</span>
              <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-[10px] text-blue-700 border border-blue-200 font-bold">
                {progress}%
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline font-medium">
            Evidence-governed delivery artifacts
          </span>
        </div>

        {/* Tab 1 Content: Code Files Tree */}
        {activeBottomTab === 'code' && (
          <div className="space-y-3">
            {project?.codeArtifacts && project.codeArtifacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                {project.codeArtifacts.map((ca) => (
                  <div
                    key={ca.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate text-slate-800">{ca.filePath}</span>
                    </div>
                    <span className="text-[10px] text-blue-600 uppercase font-sans font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
                      {ca.language}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-slate-200/60 space-y-2">
                <Code2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Source files have not been generated yet</p>
                <p className="text-xs text-slate-400">
                  Devon Coder will generate modular application files during the Full-Stack Developer stage.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Content: Documents & Planning */}
        {activeBottomTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Requirements Baseline v1</div>
                <div className="text-[11px] text-slate-500">Business Analyst Scope & Stories</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                project?.requirementBaselines?.length ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {project?.requirementBaselines?.length ? '✓ Approved' : 'Pending'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">UI/UX Design Specification</div>
                <div className="text-[11px] text-slate-500">Interactive Screens & Design Tokens</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                workflow?.approvedDesignSpecId ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {workflow?.approvedDesignSpecId ? '✓ Approved' : 'Pending'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Solution Architecture Spec</div>
                <div className="text-[11px] text-slate-500">System Contracts & DB Schemas</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                project?.architecture ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {project?.architecture ? '✓ Ready' : 'Pending'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Independent QA Test Suite</div>
                <div className="text-[11px] text-slate-500">Automated Docker Sandbox Assertions</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                project?.qaTestArtifacts?.length ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {project?.qaTestArtifacts?.length ? '✓ Verified' : 'Pending'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Code Review & Security Audit</div>
                <div className="text-[11px] text-slate-500">Independent Code Quality Inspection</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                progress >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {progress >= 85 ? '✓ Signed Off' : 'Pending'}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Delivery Package & DevOps</div>
                <div className="text-[11px] text-slate-500">Production Deployment Artifacts</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                stage === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {stage === 'completed' ? '✓ Ready' : 'Pending'}
              </span>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Phases Roadmap */}
        {activeBottomTab === 'phases' && (
          <div className="space-y-3 text-xs">
            {[
              { num: '01', name: 'Business Analysis', agent: 'Aria Analyst', isDone: Boolean(workflow?.approvedRequirementBaselineId), isCurr: stage === 'business_analysis' },
              { num: '02', name: 'Delivery Planning', agent: 'Marcus Planner', isDone: Boolean(project?.tasks?.length && progress >= 35), isCurr: stage === 'project_planning' },
              { num: '03', name: 'Experience Design', agent: 'Sofia Designer', isDone: Boolean(workflow?.approvedDesignSpecId), isCurr: stage === 'ui_ux_design' || stage === 'design_review' },
              { num: '04', name: 'Solution Architecture', agent: 'Arthur Architect', isDone: Boolean(project?.architecture), isCurr: stage === 'architecture' },
              { num: '05', name: 'Full-Stack Development', agent: 'Devon Coder', isDone: Boolean(project?.codeArtifacts?.length && progress >= 75), isCurr: stage === 'engineering' },
              { num: '06', name: 'Independent Review', agent: 'Dr. Evelyn Vance', isDone: progress >= 85, isCurr: stage === 'code_review' },
              { num: '07', name: 'Automated QA & Security', agent: 'Quinn QA', isDone: stage === 'completed' || Boolean(project?.qaTestArtifacts?.length), isCurr: stage === 'testing' },
              { num: '08', name: 'Deployment & Delivery', agent: 'System DevOps', isDone: stage === 'completed', isCurr: stage === 'completed' },
            ].map((p) => (
              <div
                key={p.num}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  p.isCurr
                    ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                    : p.isDone
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400">{p.num}</span>
                  <div>
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="text-slate-400 ml-2">({p.agent})</span>
                  </div>
                </div>
                <div>
                  {p.isDone ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Complete
                    </span>
                  ) : p.isCurr ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                      ● In Progress
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      ○ Waiting
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

            {/* ========================================================================= */}
      {/* 2B. STOP / PAUSE / END PROJECT MODAL */}
      {/* ========================================================================= */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {stopModalMode === 'new_project' ? 'Start a New Project' : 'Stop Project Development'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stopModalMode === 'new_project'
                    ? `An active project (${project?.name}) is currently in progress.`
                    : `What would you like to do with "${project?.name}"?`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStopModalOpen(false)}
                disabled={isStoppingProject}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Pause */}
              <div
                onClick={!isStoppingProject ? handlePauseConfirm : undefined}
                className="group p-4 rounded-2xl border-2 border-amber-200/80 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 font-bold">
                    <PauseCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                        Pause, I'll restart it later
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Temporarily halts agent loops. All requirements, wireframes, code files, and test results are securely preserved so you can resume at any time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: End Permanently */}
              <div
                onClick={!isStoppingProject ? handleEndConfirm : undefined}
                className="group p-4 rounded-2xl border-2 border-rose-200/80 hover:border-rose-400 bg-rose-50/40 hover:bg-rose-50 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 font-bold">
                    <StopCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-rose-900 transition-colors">
                        End this project permanently
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                        Permanent
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Permanently terminates autonomous development and archives this project run.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStopModalOpen(false)}
                disabled={isStoppingProject}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Keep Working
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NEW PROJECT PROMPT MODAL */}
      {/* ========================================================================= */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Start Another Project</h3>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartProject} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Soltrade Enterprise Portal"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business Brief</label>
                <textarea
                  rows={4}
                  value={projectBrief}
                  onChange={(e) => setProjectBrief(e.target.value)}
                  placeholder="Describe what you want the AI software organization to deliver..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-normal"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !projectBrief.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Starting...' : 'Start Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SPECIALIST QUESTION MODAL */}
      {/* ========================================================================= */}
      {isQuestionModalOpen && pendingInteractions.length > 0 && (
        <SpecialistQuestionModal
          isOpen={isQuestionModalOpen}
          interactions={pendingInteractions}
          onClose={() => setIsQuestionModalOpen(false)}
          onSubmitAnswer={handleAnswerInteraction}
          isLoading={isActionInProgress}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. APPROVAL MODAL OVERLAYS */}
      {/* ========================================================================= */}
      {isApprovalModalOpen && pendingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl w-full my-8">
            {pendingApproval.artifactType === 'requirements' &&
              project?.requirementBaselines?.[0] &&
              project && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center border border-slate-200 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                  <RequirementsReviewCard
                    baseline={project.requirementBaselines[0]}
                    project={project}
                    onApprove={handleApprove}
                    onRequestChanges={handleRequestChanges}
                    isLoading={isActionInProgress}
                  />
                </div>
              )}


          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
