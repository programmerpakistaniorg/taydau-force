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
  CheckCircle2
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
    retryStage
  } = useLiveProject();

  // Local form state & project creation mode
  const [projectName, setProjectName] = useState<string>('');
  const [projectBrief, setProjectBrief] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState<boolean>(false);

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

  // Submit decision for a specific interaction
  const handleAnswerInteraction = async (interactionId: string, answer: any) => {
    try {
      await answerInteraction(interactionId, answer);
    } catch (err) {
      console.error('Failed to answer interaction:', err);
    }
  };

  // Approve pending baseline or design spec
  const handleApprove = async () => {
    if (!pendingApproval) return;
    try {
      await approveRequest(pendingApproval.id);
      setIsApprovalModalOpen(false);
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  // Request changes with feedback
  const handleRequestChanges = async (feedback: string) => {
    if (!pendingApproval) return;
    try {
      await requestChanges(pendingApproval.id, feedback);
      setIsApprovalModalOpen(false);
    } catch (err) {
      console.error('Failed to request changes:', err);
    }
  };

  // Handle retry on failure
  const handleRetry = async () => {
    try {
      await retryStage();
    } catch (err) {
      console.error('Failed to retry stage:', err);
    }
  };

  // Specialist Rails Definition (5 Core Specialist Rails Matching Wireframe)
  const rails = [
    {
      index: 1,
      roleKey: 'business_analyst' as RoleKey,
      roleName: 'Business Analyst',
      personName: 'Aria Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      initials: 'AJ',
      stageKeys: ['business_analysis', 'requirements_review'],
      pctComplete: progress >= 25 ? 100 : Math.round((progress / 25) * 100),
      isCompleted: Boolean(workflow?.approvedRequirementBaselineId || (project?.requirementBaselines && project.requirementBaselines.length > 0)),
      isWorking: stage === 'business_analysis' || (stage === 'requirements_review' && stageStatus === 'running'),
      isWaiting: stageStatus === 'waiting_for_client' && (stage === 'business_analysis' || stage === 'requirements_review'),
      thinkingMsg: 'Thinking and analyzing client business requirements.',
    },
    {
      index: 2,
      roleKey: 'project_manager' as RoleKey,
      roleName: 'Project Manager',
      personName: 'Marcus Lee',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      initials: 'ML',
      stageKeys: ['project_planning'],
      pctComplete: progress >= 40 ? 100 : progress >= 25 ? Math.round(((progress - 25) / 15) * 100) : 0,
      isCompleted: Boolean(project?.tasks && project.tasks.length > 0 && progress >= 40),
      isWorking: stage === 'project_planning' && stageStatus === 'running',
      isWaiting: stageStatus === 'waiting_for_client' && stage === 'project_planning',
      thinkingMsg: 'Thinking and structuring technical delivery roadmap.',
    },
    {
      index: 3,
      roleKey: 'ui_ux_designer' as RoleKey,
      roleName: 'UI/UX Designer',
      personName: 'Sofia Martinez',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      initials: 'SM',
      stageKeys: ['ui_ux_design', 'design_review'],
      pctComplete: progress >= 50 ? 100 : progress >= 40 ? Math.round(((progress - 40) / 10) * 100) : 0,
      isCompleted: Boolean(workflow?.approvedDesignSpecId || (project?.designSpecs && project.designSpecs.length > 0 && progress >= 50)),
      isWorking: stage === 'ui_ux_design' || (stage === 'design_review' && stageStatus === 'running'),
      isWaiting: stageStatus === 'waiting_for_client' && (stage === 'ui_ux_design' || stage === 'design_review'),
      thinkingMsg: 'Thinking and crafting the best user experience.',
    },
    {
      index: 4,
      roleKey: 'engineer' as RoleKey,
      roleName: 'Full Stack Developer',
      personName: 'Devon Brown',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      initials: 'DB',
      stageKeys: ['architecture', 'engineering', 'code_review'],
      pctComplete: progress >= 75 ? 100 : progress >= 50 ? Math.round(((progress - 50) / 25) * 100) : 0,
      isCompleted: Boolean(project?.codeArtifacts && project.codeArtifacts.length > 0 && progress >= 75),
      isWorking: (stage === 'architecture' || stage === 'engineering' || stage === 'code_review') && stageStatus === 'running',
      isWaiting: stageStatus === 'waiting_for_client' && (stage === 'architecture' || stage === 'engineering'),
      thinkingMsg: 'Thinking and generating production-ready code modules.',
    },
    {
      index: 5,
      roleKey: 'qa_engineer' as RoleKey,
      roleName: 'DevOps Engineer',
      personName: 'Evelyn Davis',
      avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80',
      initials: 'ED',
      stageKeys: ['testing', 'completed'],
      pctComplete: progress >= 100 ? 100 : progress >= 75 ? Math.round(((progress - 75) / 25) * 100) : 0,
      isCompleted: stage === 'completed' || Boolean(project?.qaTestArtifacts && project.qaTestArtifacts.length > 0 && progress >= 100),
      isWorking: stage === 'testing' && stageStatus === 'running',
      isWaiting: stageStatus === 'failed',
      thinkingMsg: 'Thinking and executing container tests in isolated sandbox.',
    },
  ];

  // Active rail indicator
  const activeRail = rails.find((r) => r.isWorking || r.isWaiting) || rails[0];

  // Right Preview Card Dynamic Stage Output Title & Details
  const getRightPreviewState = () => {
    if (!hasProject) {
      return {
        title: 'UI/UX Design',
        statusTitle: 'Ready for prompt',
        thinkingText: 'Submit your prompt on the left to start the autonomous delivery workflow.',
      };
    }
    if (stage === 'business_analysis' || stage === 'requirements_review') {
      return {
        title: 'Business Analysis',
        statusTitle: 'Analysis in progress...',
        thinkingText: 'Aria is extracting testable requirements and business logic boundaries.',
      };
    }
    if (stage === 'project_planning') {
      return {
        title: 'Project Roadmap',
        statusTitle: 'Planning in progress...',
        thinkingText: 'Marcus is sequencing milestone tasks and workstream dependencies.',
      };
    }
    if (stage === 'ui_ux_design' || stage === 'design_review') {
      return {
        title: 'UI/UX Design',
        statusTitle: 'Design in progress...',
        thinkingText: 'Thinking and crafting the best user experience.',
      };
    }
    if (stage === 'architecture' || stage === 'engineering' || stage === 'code_review') {
      return {
        title: 'Full Stack Development',
        statusTitle: 'Implementation in progress...',
        thinkingText: 'Devon is writing clean modular code and database schemas.',
      };
    }
    if (stage === 'testing') {
      return {
        title: 'DevOps & Verification',
        statusTitle: 'Testing in progress...',
        thinkingText: 'Evelyn is running unit assertions and security sandbox checks.',
      };
    }
    return {
      title: 'Verified Release',
      statusTitle: '100% Release Ready ✓',
      thinkingText: 'All client requirements verified and ready for deployment.',
    };
  };

  const previewState = getRightPreviewState();
  const latestDesignArtifact = project?.designArtifacts?.[0] || null;

  return (
    <div className="p-6 md:p-8 max-w-[1550px] mx-auto space-y-8 font-sans">
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
            onClick={() => setIsApprovalModalOpen(true)}
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
      {/* 1. VISUAL DELIVERY PIPELINE (Matching Exact Layout in media_1788281208212.png) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* ------------------------------------------------------------- */}
          {/* 1A. LEFT: PROMPT CARD (3 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div
              className={`bg-white rounded-2xl p-4 sm:p-5 border-2 transition-all shadow-md relative ${
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
                  <button
                    type="button"
                    onClick={() => setIsPromptModalOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    + New
                  </button>
                )}
              </div>

              {hasProject ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {project?.name}
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                    “{project?.clientBrief}”
                  </p>
                  <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active in Delivery Loop</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStartProject} className="space-y-3">
                  <div>
                    <input
                      id="project-name-input"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Project Name"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <textarea
                      id="project-brief-input"
                      rows={3}
                      value={projectBrief}
                      onChange={(e) => setProjectBrief(e.target.value)}
                      placeholder="Describe what software you want to build..."
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
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1B. CENTER: 5 SPECIALIST PROGRESS RAILS (5 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 relative flex flex-col justify-center space-y-4 py-2">
            {rails.map((rail) => {
              const isRailActive = rail.isWorking || rail.isWaiting;

              return (
                <div
                  key={rail.index}
                  className="flex items-center gap-3 relative group"
                >
                  {/* Step Index Badge (1) to (5) */}
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      rail.isCompleted
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : isRailActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {rail.index}
                  </div>

                  {/* Horizontal Track with Step Checkpoints (25%, 50%, 75%, 100%) */}
                  <div className="flex-1 relative flex items-center px-1">
                    {/* Background track line */}
                    <div className="absolute left-0 right-0 h-[2px] bg-slate-200" />

                    {/* Active colored progress fill */}
                    <div
                      className={`absolute left-0 h-[2px] transition-all duration-700 ${
                        rail.isCompleted ? 'bg-blue-600' : isRailActive ? 'bg-blue-500' : 'bg-transparent'
                      }`}
                      style={{ width: `${rail.pctComplete}%` }}
                    />

                    {/* Animated glowing beam along active rail */}
                    {isRailActive && (
                      <div className="absolute left-0 right-0 h-3 pointer-events-none overflow-hidden">
                        <div className="w-20 h-full bg-gradient-to-r from-transparent via-blue-400/80 to-transparent blur-[3px] animate-[pulse_1.5s_infinite]" />
                      </div>
                    )}

                    {/* Step Milestone Dots */}
                    <div className="relative w-full flex items-center justify-between text-[9px] font-semibold text-slate-400">
                      {[
                        { label: '25%', val: 25 },
                        { label: '50%', val: 50 },
                        { label: '75%', val: 75 },
                        { label: '100%', val: 100 },
                      ].map((step) => (
                        <div key={step.label} className="flex flex-col items-center -mt-3.5">
                          <span className="text-[9px] text-slate-400 font-medium mb-1">
                            {step.label}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full transition-all ${
                              rail.pctComplete >= step.val
                                ? 'bg-blue-600 ring-2 ring-blue-100'
                                : 'bg-slate-300'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Checkbox [✓] or Active Indicator */}
                  <div className="shrink-0">
                    {rail.isCompleted ? (
                      <div className="w-6 h-6 rounded-lg bg-blue-50 border-2 border-blue-600 text-blue-600 flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isRailActive ? (
                      <div className="w-6 h-6 rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/50 flex items-center justify-center text-blue-600">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center" />
                    )}
                  </div>

                  {/* Specialist Card (Avatar, Role, Name) */}
                  <div
                    className={`min-w-[160px] p-2 rounded-xl border flex items-center gap-2.5 transition-all ${
                      isRailActive
                        ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                        : rail.isCompleted
                        ? 'bg-white border-slate-200'
                        : 'bg-white border-slate-100 opacity-70'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-xs text-slate-600">
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
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {rail.roleName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-normal">
                        {rail.personName}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1C. RIGHT: LIVE OUTPUT & THINKING PREVIEW PANEL (4 Cols) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-4 relative">
              {/* Header Title & Sparkle Icon */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {previewState.title}
                </h3>
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>

              {/* Wireframe Mockup Canvas */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 min-h-[160px] flex flex-col justify-center items-center text-center space-y-2 relative overflow-hidden">
                {latestDesignArtifact ? (
                  <div className="w-full text-left bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="text-[11px] font-bold text-blue-700 truncate">
                      {latestDesignArtifact.screenKey || 'Dashboard Screen'}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-3">
                      {latestDesignArtifact.content?.slice(0, 120) || 'Visual layout tokens and component specifications.'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 w-full">
                    {/* Placeholder Wireframe Blocks matching image */}
                    <div className="w-full h-16 bg-blue-100/50 rounded-xl border border-blue-200/50 flex items-center justify-center text-blue-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 px-4">
                      <div className="w-3/4 h-2 bg-slate-200 rounded mx-auto" />
                      <div className="w-1/2 h-2 bg-slate-200 rounded mx-auto" />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Thinking Status & Active Pulse */}
              <div className="space-y-2 text-left pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span className="text-xs font-bold text-slate-900">
                    {previewState.statusTitle}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {previewState.thinkingText}
                </p>

                {/* Progress bar slider & Carousel pagination dots */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${progress || 15}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                </div>

                {/* Action CTA when design ready */}
                {pendingApproval?.artifactType === 'design' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                    >
                      ✓ Approve Design & Continue
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOTTOM SECTION: CODE & IMPLEMENTATION, PLANNING (3 Columns) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Code & Implementation, planning
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: </> Code */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Code2 className="w-4 h-4 text-blue-600" />
                <span>Code</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                {project?.codeArtifacts?.length || 0} Files
              </span>
            </div>

            {project?.codeArtifacts && project.codeArtifacts.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {project.codeArtifacts.slice(0, 5).map((ca) => (
                  <div
                    key={ca.id}
                    className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-slate-700 font-mono text-[11px]"
                  >
                    <span className="truncate max-w-[170px]">{ca.filePath}</span>
                    <span className="text-[10px] text-blue-600 uppercase font-sans font-bold">
                      {ca.language}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-slate-200/70 rounded-md w-full animate-pulse" />
                ))}
                <p className="text-[11px] text-slate-400 italic pt-1">
                  Source files will populate during the Full Stack Developer stage.
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Implementation & planning */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Implementation & planning</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                Specs & Reports
              </span>
            </div>

            {project?.requirementBaselines && project.requirementBaselines.length > 0 ? (
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <span className="font-medium truncate">Requirements Baseline v1</span>
                  <span className="text-[10px] font-bold text-emerald-600">✓ Ready</span>
                </div>
                {project?.architecture && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="font-medium truncate">Solution Architecture Spec</span>
                    <span className="text-[10px] font-bold text-emerald-600">✓ Ready</span>
                  </div>
                )}
                {project?.qaTestArtifacts && project.qaTestArtifacts.length > 0 && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="font-medium truncate">Independent QA Test Suite</span>
                    <span className="text-[10px] font-bold text-emerald-600">✓ Verified</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-slate-200/70 rounded-md w-full animate-pulse" />
                ))}
                <p className="text-[11px] text-slate-400 italic pt-1">
                  Architecture documents and verification reports will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Column 3: Phases */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Flag className="w-4 h-4 text-cyan-600" />
                <span>Phases</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                {progress}% Complete
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: '1. Business Analysis', pct: progress >= 25 ? 100 : Math.round((progress / 25) * 100) },
                { name: '2. Delivery Planning', pct: progress >= 40 ? 100 : progress >= 25 ? Math.round(((progress - 25) / 15) * 100) : 0 },
                { name: '3. UI/UX Design', pct: progress >= 50 ? 100 : progress >= 40 ? Math.round(((progress - 40) / 10) * 100) : 0 },
                { name: '4. Full Stack Build', pct: progress >= 75 ? 100 : progress >= 50 ? Math.round(((progress - 50) / 25) * 100) : 0 },
                { name: '5. DevOps & QA Verification', pct: progress >= 100 ? 100 : progress >= 75 ? Math.round(((progress - 75) / 25) * 100) : 0 },
              ].map((phase) => (
                <div key={phase.name} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium text-slate-700">
                    <span>{phase.name}</span>
                    <span className="font-bold text-slate-900">{phase.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${phase.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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

            {pendingApproval.artifactType === 'design' &&
              project?.designSpecs?.[0] &&
              project && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsApprovalModalOpen(false)}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center border border-slate-200 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                  <DesignReviewCard
                    designSpec={project.designSpecs[0]}
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
