import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Activity,
  ChevronDown,
  Menu,
  PlusCircle,
  CheckCircle,
  FileCode,
  ShieldAlert,
  Boxes,
  Workflow as WorkflowIcon,
  Play
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

  // Local form state & project creation mode
  const [projectName, setProjectName] = useState<string>('');
  const [projectBrief, setProjectBrief] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState<boolean>(false);

  // Workspace dropdown & mobile menu state
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceDropdownRef.current &&
        !workspaceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setIsCreatingNewProject(false);
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

  // Telemetry: sum real tokens & cost from current project
  const totalCost = Number(project?.costSummary?.totalCostUsed ?? 0);
  const totalTokens =
    project?.llmCalls && project.llmCalls.length > 0
      ? project.llmCalls.reduce(
          (acc: number, call: any) =>
            acc + (Number(call.inputTokens) || 0) + (Number(call.outputTokens) || 0),
          0
        )
      : (Number(project?.costSummary?.totalInputTokens ?? 0) + Number(project?.costSummary?.totalOutputTokens ?? 0));

  // Latest design wireframe artifact
  const latestDesignSpec = project?.designSpecs?.[0] || null;
  const latestDesignArtifact = project?.designArtifacts?.[0] || null;

  // Workspace Navigation Items
  const workspaceLinks = [
    { label: 'My Project', path: '/project', desc: 'Project Overview & Team Coordination' },
    { label: 'Features', path: '/requirements', desc: 'Requirements Baseline & User Stories' },
    { label: 'Solution Design', path: '/architecture', desc: 'System Architecture & Schema Specs' },
    { label: 'AI Team', path: '/workforce', desc: 'Autonomous Specialists & Activity Log' },
    { label: 'Build Progress', path: '/execution', desc: 'Task Execution & Code Artifacts' },
    { label: 'Testing & Safety', path: '/qa-security', desc: 'Automated QA & Threat Scans' },
    { label: 'Cost & Budget', path: '/cost-governor', desc: 'Token Telemetry & Cost Governor' },
    { label: 'Final Delivery', path: '/delivery', desc: 'Release Readiness & Verification' },
  ];

  // Derive Canonical Stage Information
  const getStageDisplay = () => {
    if (!hasProject) {
      return {
        title: 'Ready for Project Brief',
        subtitle: 'Enter your idea above to initiate autonomous team execution.',
        activeAgent: 'Aria Analyst',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    }
    switch (stage) {
      case 'business_analysis':
        return {
          title: 'Understanding Your Business Needs',
          subtitle: 'Aria Analyst is extracting testable functional requirements and clarifying boundaries.',
          activeAgent: 'Aria Analyst',
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'requirements_review':
        return {
          title: 'Requirements Baseline Ready for Approval',
          subtitle: 'Aria has synthesized your functional requirements into testable acceptance criteria.',
          activeAgent: 'Aria Analyst',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'project_planning':
        return {
          title: 'Planning Delivery Roadmap',
          subtitle: 'Marcus Planner is sequencing milestones, dependency tasks, and delivery phases.',
          activeAgent: 'Marcus Planner',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'ui_ux_design':
        return {
          title: 'Designing User Experience & Wireframes',
          subtitle: 'Sofia Designer is generating interactive screen layouts, component tokens, and user journeys.',
          activeAgent: 'Sofia Designer',
          badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
        };
      case 'design_review':
        return {
          title: 'Interactive Design Wireframes Ready for Review',
          subtitle: 'Sofia has crafted your screen designs and visual token system. Review to proceed.',
          activeAgent: 'Sofia Designer',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'architecture':
        return {
          title: 'Preparing Technical Solution & Schema',
          subtitle: 'Arthur Blueprint is generating database schemas, API contracts, and security boundaries.',
          activeAgent: 'Arthur Blueprint',
          badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      case 'engineering':
        return {
          title: 'Building Your Application',
          subtitle: 'Devon Coder is generating verified implementation modules and frontend components.',
          activeAgent: 'Devon Coder',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'code_review':
        return {
          title: 'Auditing Architectural Compliance',
          subtitle: 'Dr. Evelyn Vance is reviewing code quality, type correctness, and maintainability.',
          activeAgent: 'Dr. Evelyn Vance',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'testing':
        return {
          title: 'Independently Testing Software',
          subtitle: 'Quinn Quality is running isolated test suites in Docker and verifying acceptance criteria.',
          activeAgent: 'Quinn Quality',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'completed':
        return {
          title: 'Software Verified & Ready for Delivery',
          subtitle: 'All milestones, code modules, and independent tests have completed with 100% verification.',
          activeAgent: 'TayDau Delivery Organization',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      default:
        return {
          title: `Autonomous Execution (${stage.replace(/_/g, ' ')})`,
          subtitle: 'The delivery team is executing workstreams autonomously.',
          activeAgent: 'TayDau Force Team',
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const currentStageInfo = getStageDisplay();

  // Dynamic Specialist Role Status Calculation (100% Evidence-Driven)
  const getRoleStatus = (roleKey: RoleKey) => {
    if (!hasProject) {
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    const currentActiveRole = workflow?.activeRole;

    if (stageStatus === 'failed') {
      if (currentActiveRole === roleKey) {
        return { label: 'Needs Attention', state: 'failed', color: 'red' };
      }
    }

    if (stageStatus === 'waiting_for_client') {
      if (roleKey === 'business_analyst' && (stage === 'business_analysis' || stage === 'requirements_review')) {
        return { label: pendingApproval ? 'Review Ready' : 'Waiting for You', state: 'waiting_for_client', color: 'amber' };
      }
      if (roleKey === 'ui_ux_designer' && (stage === 'ui_ux_design' || stage === 'design_review')) {
        return { label: pendingApproval ? 'Review Ready' : 'Waiting for You', state: 'waiting_for_client', color: 'amber' };
      }
      if (roleKey === 'project_manager' && stage === 'project_planning' && pendingInteractions.length > 0) {
        return { label: 'Waiting for You', state: 'waiting_for_client', color: 'amber' };
      }
    }

    // Role specific completion checks based on real persisted data
    if (roleKey === 'business_analyst') {
      if (project?.requirementBaselines && project.requirementBaselines.length > 0) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'business_analysis' || stage === 'requirements_review') {
        return { label: 'Working', state: 'running', color: 'indigo' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'project_manager') {
      if (project?.tasks && project.tasks.length > 0) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'project_planning') {
        return { label: 'Working', state: 'running', color: 'blue' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'ui_ux_designer') {
      if (project?.designSpecs && project.designSpecs.length > 0) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'ui_ux_design' || stage === 'design_review') {
        return { label: 'Working', state: 'running', color: 'pink' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'solution_architect') {
      if (project?.architecture) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'architecture') {
        return { label: 'Working', state: 'running', color: 'cyan' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'engineer') {
      if (project?.codeArtifacts && project.codeArtifacts.length > 0) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'engineering') {
        return { label: 'Working', state: 'running', color: 'emerald' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'code_reviewer') {
      if (project?.codeReview) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'code_review') {
        return { label: 'Working', state: 'running', color: 'amber' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    if (roleKey === 'qa_engineer') {
      if (project?.qaSuite || (project?.qaTestArtifacts && project.qaTestArtifacts.length > 0)) {
        return { label: 'Completed ✓', state: 'completed', color: 'emerald' };
      }
      if (stage === 'testing') {
        return { label: 'Working', state: 'running', color: 'purple' };
      }
      return { label: 'Available', state: 'available', color: 'slate' };
    }

    return { label: 'Available', state: 'available', color: 'slate' };
  };

  // Coordinated Team Specialist Definitions
  const teamSpecialists: {
    key: RoleKey;
    name: string;
    roleName: string;
    roleDesc: string;
    initials: string;
    accentColor: string;
  }[] = [
    {
      key: 'ui_ux_designer',
      name: 'Sofia Designer',
      roleName: 'UI/UX Designer',
      roleDesc: 'Design System & Wireframes',
      initials: 'SD',
      accentColor: 'from-pink-500 to-rose-500',
    },
    {
      key: 'project_manager',
      name: 'Marcus Planner',
      roleName: 'Project Manager',
      roleDesc: 'Roadmap & Task Sequencing',
      initials: 'MP',
      accentColor: 'from-blue-500 to-indigo-500',
    },
    {
      key: 'solution_architect',
      name: 'Arthur Blueprint',
      roleName: 'Solution Architect',
      roleDesc: 'System Architecture & Schema',
      initials: 'AB',
      accentColor: 'from-cyan-500 to-teal-500',
    },
    {
      key: 'business_analyst',
      name: 'Aria Analyst',
      roleName: 'Business Analyst',
      roleDesc: 'Requirements & User Stories',
      initials: 'AA',
      accentColor: 'from-violet-500 to-purple-500',
    },
    {
      key: 'engineer',
      name: 'Devon Coder',
      roleName: 'Full-Stack Engineer',
      roleDesc: 'Code Implementation',
      initials: 'DC',
      accentColor: 'from-emerald-500 to-teal-600',
    },
    {
      key: 'code_reviewer',
      name: 'Dr. Evelyn Vance',
      roleName: 'Code Reviewer',
      roleDesc: 'Quality & Security Audit',
      initials: 'EV',
      accentColor: 'from-amber-500 to-orange-500',
    },
    {
      key: 'qa_engineer',
      name: 'Quinn Quality',
      roleName: 'Independent QA',
      roleDesc: 'Automated Docker Verification',
      initials: 'QQ',
      accentColor: 'from-purple-500 to-indigo-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP DARK NAVY HEADER (Single Header with Workspace Navigation) */}
      {/* ========================================================================= */}
      <header className="bg-[#07152D] text-white border-b border-slate-800/80 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-[#07152D] rounded-[7px] flex items-center justify-center font-black text-white text-xs tracking-tighter group-hover:bg-opacity-90 transition-all">
                  TD
                </div>
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  TayDau Force
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    MVP
                  </span>
                </div>
              </div>
            </Link>
            <span className="hidden md:inline-block text-slate-500 text-xs pl-2 border-l border-slate-700">
              Autonomous Software Delivery Organization
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#ai-team" className="hover:text-white transition-colors">
              AI Team
            </a>
            <a href="#why-taydau" className="hover:text-white transition-colors">
              Why TayDau
            </a>
          </nav>

          {/* Header Action CTAs & Workspace Bridge */}
          <div className="flex items-center gap-2.5">
            {/* Simulation Switcher */}
            <button
              type="button"
              onClick={() => {
                if (mode === 'live') {
                  setMode('demo');
                } else {
                  setMode('live');
                }
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-700/60 transition-all cursor-pointer"
            >
              {mode === 'live' ? 'Switch to Simulation' : 'Switch to Live'}
            </button>

            {/* Open Workspace Dropdown */}
            <div className="relative" ref={workspaceDropdownRef}>
              <button
                type="button"
                data-testid="open-workspace-dropdown-btn"
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
              >
                <span>Open Workspace</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isWorkspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Workspace Dropdown Menu */}
              {isWorkspaceDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Project Workspace Navigation
                  </div>
                  {workspaceLinks.map((link) => (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        navigate(link.path);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/80 transition-colors flex flex-col group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {link.label}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {link.desc}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        navigate('/project');
                      }}
                      className="w-full text-center py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Go to Project Overview →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace Routes
            </div>
            {workspaceLinks.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate(link.path);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (Active Project vs No-Project Prompt Card) */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-[#07152D] via-[#091C3E] to-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Main Value Proposition Headline */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Software Delivery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Turn your idea into{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              working software
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Provide a business idea. TayDau’s orchestrated AI specialists handle business analysis,
            planning, UI/UX design, architecture, implementation, and independent QA.
          </p>

          {/* Central Hero Card: Conditional on Active Project vs Clean Prompt */}
          <div className="max-w-2xl mx-auto mt-8">
            {hasProject && !isCreatingNewProject ? (
              /* ACTIVE PROJECT HERO CARD */
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/20 text-left text-slate-900 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Your Active Project
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ● {stageStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingNewProject(true)}
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Start Another Project</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-slate-950 tracking-tight">
                    {project?.name || 'Untitled Software Project'}
                  </h3>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 italic leading-relaxed">
                    “{project?.clientBrief || 'Autonomous software brief.'}”
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        Current Stage
                      </div>
                      <div className="text-xs font-bold text-indigo-950 mt-0.5">
                        {currentStageInfo.title}
                      </div>
                    </div>

                    <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Next Action
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                        {workflow?.nextActionPayload?.label || currentStageInfo.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => navigate('/project')}
                      className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreatingNewProject(true)}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      + New Project
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* CLEAN PROMPT CREATION CARD */
              <form
                onSubmit={handleStartProject}
                className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/20 text-left text-slate-900 transition-all"
              >
                {isCreatingNewProject && hasProject && (
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-indigo-600">Start New Autonomous Project</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewProject(false)}
                      className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Return to Active Project
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="project-name-input"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                    >
                      Project Name
                    </label>
                    <input
                      id="project-name-input"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Soltrade B2B Marketplace Portal"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="project-brief-input"
                      className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
                    >
                      Business Brief / Project Idea
                    </label>
                    <textarea
                      id="project-brief-input"
                      rows={3}
                      value={projectBrief}
                      onChange={(e) => setProjectBrief(e.target.value)}
                      placeholder="Describe what you want to build (e.g. An online ordering portal with customer accounts, inventory tracking, Stripe payments, and automated invoice PDF generation)..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none font-normal"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Includes QA test verification</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !projectBrief.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Initiating Delivery...</span>
                        </>
                      ) : (
                        <>
                          <span>Start a Project</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Current Project Telemetry Cards (Derived 100% from live project) */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/70 rounded-2xl px-4 py-2.5 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Estimated AI Cost
                </div>
                <div className="text-xs font-bold text-white">
                  ${totalCost.toFixed(2)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    / $50.00 Limit
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/70 rounded-2xl px-4 py-2.5 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Tokens Used
                </div>
                <div className="text-xs font-bold text-white">
                  {totalTokens.toLocaleString()}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">
                    / 500K Limit
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/70 rounded-2xl px-4 py-2.5 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Delivery Team
                </div>
                <div className="text-xs font-bold text-white">
                  7 Specialists{' '}
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    ● Coordinated
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. THREE-COLUMN WORKFLOW EXPERIENCE (Coordinated System Center) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 -mt-6">
        {/* Main White Workflow Shell Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-8">
          {/* Top Workflow Header & Mode Badge */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-600">
                  Live Autonomous Pipeline
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {progress}% Verified
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Software Delivery Workflow
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-bold text-slate-500">Current Phase</div>
                <div className="text-xs font-bold text-slate-900">{currentStageInfo.title}</div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/project')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Workspace Details</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Persistent Amber Banner: Waiting for Question Decisions */}
          {stageStatus === 'waiting_for_client' && pendingInteractions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
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
                    Your answers will guide the functional requirements baseline and scope boundaries.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all cursor-pointer"
              >
                Answer {pendingInteractions.length} Question
                {pendingInteractions.length > 1 ? 's' : ''} →
              </button>
            </div>
          )}

          {/* Persistent Indigo/Pink Banner: Waiting for Client Approval */}
          {stageStatus === 'waiting_for_client' && pendingApproval && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
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
                {pendingApproval.artifactType === 'requirements'
                  ? 'Review Requirements →'
                  : 'Review Design Screens →'}
              </button>
            </div>
          )}

          {/* Failure Alert Banner */}
          {stageStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
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

          {/* 3-COLUMN WORKFLOW GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ------------------------------------------------------------- */}
            {/* COLUMN 1: YOUR IDEA (3 Cols) */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-3 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Your Idea
                  </h3>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="font-bold text-slate-900">
                    {hasProject ? project?.name : 'Project Prompt'}
                  </div>
                  <p className="italic leading-relaxed text-slate-600">
                    {hasProject
                      ? `“${project?.clientBrief}”`
                      : 'No active project submitted yet. Use the prompt card above to start delivery.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{hasProject ? 'Input Received & Seeded' : 'Waiting for Input'}</span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMN 2: TAYDAU AI DELIVERY TEAM (COORDINATED SYSTEM) (5 Cols) */}
            {/* ------------------------------------------------------------- */}
            <div id="ai-team" className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-[#07152D] text-white rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold border border-indigo-400/30">
                      2
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      TayDau Coordinated Team
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    ● Autonomous Coordination
                  </span>
                </div>

                {/* Central Hub & Orchestrated Specialists */}
                <div className="space-y-3">
                  {/* Central Coordinator Badge */}
                  <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-200">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span>TAYDAU FORCE ORCHESTRATOR</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Autonomous stage progression, task dispatch & telemetry
                    </div>
                  </div>

                  {/* 7 Coordinated Specialist Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {teamSpecialists.map((spec) => {
                      const status = getRoleStatus(spec.key);
                      const isWorking = status.state === 'running';
                      const isWaitingClient = status.state === 'waiting_for_client';
                      const isCompleted = status.state === 'completed';

                      return (
                        <div
                          key={spec.key}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                            isWorking
                              ? 'bg-indigo-900/40 border-indigo-500 shadow-md shadow-indigo-500/20'
                              : isWaitingClient
                              ? 'bg-amber-950/30 border-amber-500/70'
                              : isCompleted
                              ? 'bg-slate-800/60 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg bg-gradient-to-br ${spec.accentColor} text-white font-bold flex items-center justify-center text-[10px] shrink-0 shadow-sm`}
                            >
                              {spec.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {spec.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {spec.roleName}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isWorking
                                ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 animate-pulse'
                                : isWaitingClient
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Explicit Human Approval Milestone Diamonds */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Human Decision Gates</span>
                  <span className="text-indigo-400 font-mono">◆ Mandatory Approvals</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div
                    className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
                      workflow?.approvedRequirementBaselineId || (project?.requirementBaselines && project.requirementBaselines.length > 0)
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : pendingApproval?.artifactType === 'requirements'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 animate-pulse'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="font-bold">◆ Requirements</span>
                    <span>
                      {workflow?.approvedRequirementBaselineId || (project?.requirementBaselines && project.requirementBaselines.length > 0)
                        ? 'Approved ✓'
                        : pendingApproval?.artifactType === 'requirements'
                        ? 'Needs Approval'
                        : 'Pending'}
                    </span>
                  </div>

                  <div
                    className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
                      workflow?.approvedDesignSpecId || (project?.designSpecs && project.designSpecs.length > 0)
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : pendingApproval?.artifactType === 'design'
                        ? 'bg-amber-950/40 border-amber-500 text-amber-300 animate-pulse'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="font-bold">◆ Design Wireframes</span>
                    <span>
                      {workflow?.approvedDesignSpecId || (project?.designSpecs && project.designSpecs.length > 0)
                        ? 'Approved ✓'
                        : pendingApproval?.artifactType === 'design'
                        ? 'Needs Approval'
                        : 'Pending'}
                    </span>
                  </div>

                  <div
                    className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
                      stage === 'completed'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="font-bold">◆ Final Release</span>
                    <span>{stage === 'completed' ? 'Verified ✓' : 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMN 3: STAGE-AWARE SOFTWARE PREVIEW (4 Cols) */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Software Preview
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {stage === 'completed' ? '100% Release Ready' : 'Stage Output'}
                  </span>
                </div>

                {/* Stage Evolving Output Content */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 min-h-[220px] flex flex-col justify-center">
                  {!hasProject ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Your Software Will Appear Here
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                        Start a project to see interactive wireframes, code modules, and test results.
                      </p>
                    </div>
                  ) : stage === 'business_analysis' || stage === 'requirements_review' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                        <FileText className="w-4 h-4 text-violet-600" />
                        <span>Aria Analyst — Business Analysis</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Synthesizing core product features, testable acceptance criteria, and user stories.
                      </p>
                      {project?.requirementBaselines && project.requirementBaselines.length > 0 && (
                        <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100 text-[11px] text-violet-900">
                          ✓ {project.requirementBaselines[0]?.snapshot?.features?.length || 4} requirements baseline generated.
                        </div>
                      )}
                    </div>
                  ) : stage === 'project_planning' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                        <FolderKanban className="w-4 h-4 text-blue-600" />
                        <span>Marcus Planner — Delivery Roadmap</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Sequencing task dependencies and milestone delivery phases.
                      </p>
                      {project?.tasks && project.tasks.length > 0 && (
                        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] text-blue-900 font-medium">
                          ✓ {project.tasks.length} planned workstream tasks ready.
                        </div>
                      )}
                    </div>
                  ) : stage === 'ui_ux_design' || stage === 'design_review' || latestDesignArtifact ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-pink-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Sofia UI/UX Wireframe</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                          Interactive
                        </span>
                      </div>

                      {latestDesignArtifact ? (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-h-[140px] relative bg-slate-950 text-white p-3 text-[11px]">
                          <div className="font-bold text-slate-200 truncate">
                            {latestDesignArtifact.screenKey || 'Dashboard Screen'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-3">
                            {latestDesignArtifact.content?.slice(0, 150) || 'Visual screen components with tokens and KPI cards.'}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-pink-50 rounded-lg border border-pink-100 text-xs text-pink-900">
                          Sofia is crafting component tokens and layout hierarchy.
                        </div>
                      )}

                      {pendingApproval?.artifactType === 'design' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleApprove}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            ✓ Approve Design
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsApprovalModalOpen(true)}
                            className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            Review Details
                          </button>
                        </div>
                      )}
                    </div>
                  ) : stage === 'architecture' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-700">
                        <Boxes className="w-4 h-4 text-cyan-600" />
                        <span>Arthur Blueprint — Architecture</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Designing database schemas, API contracts, and service boundaries.
                      </p>
                      {project?.architecture && (
                        <div className="p-2.5 bg-cyan-50 rounded-lg border border-cyan-100 text-[11px] text-cyan-900">
                          ✓ Technical architecture specification defined.
                        </div>
                      )}
                    </div>
                  ) : stage === 'engineering' || stage === 'code_review' || stage === 'testing' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Implementation in Progress</span>
                        <span className="text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          • Code Artifacts:{' '}
                          <span className="font-semibold text-slate-900">
                            {project?.codeArtifacts?.length || 0} modules
                          </span>
                        </div>
                        <div>
                          • QA Suites:{' '}
                          <span className="font-semibold text-slate-900">
                            {project?.qaTestArtifacts?.length || 0} test cases
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 100% Verified Release Output */
                    <div className="space-y-3 text-center py-2">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Verified Software Release
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          100% tests passed in isolated execution container.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/delivery')}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Inspect Full Delivery Package →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Autonomous Status</span>
                <span className="font-bold text-slate-800">
                  {stageStatus === 'waiting_for_client' ? 'Awaiting Human Input' : 'Active Execution'}
                </span>
              </div>
            </div>
          </div>

          {/* Explicit Workspace Bridge CTA at bottom of main shell */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Want deep project telemetry & artifacts?
              </h4>
              <p className="text-sm font-bold text-slate-900">
                Inspect architecture schemas, QA execution logs, and full source code modules.
              </p>
            </div>

            <button
              type="button"
              data-testid="open-project-workspace-cta"
              onClick={() => navigate('/project')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#07152D] hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Open Project Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOUR WORKSTREAM SUMMARY CARDS (100% Live Evidence Driven) */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Code & Implementation */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Implementation
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {project?.codeArtifacts?.length || 0} Files
                </span>
              </div>

              {project?.tasks && project.tasks.length > 0 ? (
                <div className="space-y-1.5 text-xs text-slate-700">
                  {project.tasks.slice(0, 3).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                      <span className="truncate max-w-[150px] font-medium">{t.title}</span>
                      <span className="text-[10px] text-slate-500">{t.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Development has not started yet.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Generated by Devon Coder
            </div>
          </div>

          {/* Card 2: Planning & Workstreams */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Planning
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {project?.tasks?.length || 0} Tasks
                </span>
              </div>

              {project?.tasks && project.tasks.length > 0 ? (
                <div className="space-y-1.5 text-xs text-slate-700">
                  {project.tasks.slice(0, 3).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-1.5 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Roadmap will be generated after requirements baseline approval.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Planned by Marcus Planner
            </div>
          </div>

          {/* Card 3: Canonical Phases */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <WorkflowIcon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Phases
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                  Canonical Loop
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: 'Requirements', pct: progress >= 25 ? 100 : Math.round((progress / 25) * 100) },
                  { name: 'Visual Design', pct: progress >= 40 ? 100 : progress >= 25 ? Math.round(((progress - 25) / 15) * 100) : 0 },
                  { name: 'Development', pct: progress >= 75 ? 100 : progress >= 40 ? Math.round(((progress - 40) / 35) * 100) : 0 },
                  { name: 'Testing & QA', pct: progress >= 100 ? 100 : progress >= 75 ? Math.round(((progress - 75) / 25) * 100) : 0 },
                ].map((ph) => (
                  <div key={ph.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>{ph.name}</span>
                      <span>{ph.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full transition-all" style={{ width: `${ph.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Verified Sequential Loop
            </div>
          </div>

          {/* Card 4: Deliverables Checklist */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Deliverables
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700">
                  Evidence Check
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700">
                {[
                  {
                    name: 'Requirements Baseline',
                    done: Boolean(workflow?.approvedRequirementBaselineId || (project?.requirementBaselines && project.requirementBaselines.length > 0)),
                  },
                  {
                    name: 'Delivery Roadmap',
                    done: Boolean(project?.tasks && project.tasks.length > 0),
                  },
                  {
                    name: 'UI/UX Wireframes',
                    done: Boolean(workflow?.approvedDesignSpecId || (project?.designSpecs && project.designSpecs.length > 0)),
                  },
                  {
                    name: 'Technical Architecture',
                    done: Boolean(project?.architecture),
                  },
                  {
                    name: 'Source Code Modules',
                    done: Boolean(project?.codeArtifacts && project.codeArtifacts.length > 0),
                  },
                  {
                    name: 'QA Test Artifacts',
                    done: Boolean(project?.qaSuite || (project?.qaTestArtifacts && project.qaTestArtifacts.length > 0)),
                  },
                ].map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 truncate">{d.name}</span>
                    <span className={`font-semibold ${d.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {d.done ? '✓ Ready' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              Cryptographically Fingerprinted
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. TRUST & VALUE STRIP (5 Cards) */}
        {/* ========================================================================= */}
        <section id="why-taydau" className="mt-10 pt-6 border-t border-slate-200">
          <div className="text-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Why TayDau Force
            </h3>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              Deterministic Quality & Full Transparency
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900">Independent QA</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Developers cannot approve their own code. Quinn Quality writes and executes frozen tests.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                <Coins className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900">Cost Governor</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every LLM invocation is logged with exact tokens, latency, and budget threshold caps.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                <Boxes className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900">Container Isolation</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Code execution and unit testing run inside sandboxed Docker environments.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900">Human Checkpoints</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You retain ultimate authority to approve functional requirements and visual wireframes.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900">Full Traceability</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Every requirement maps directly to tasks, code files, and verified QA test assertions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 6. SPECIALIST QUESTION MODAL (Aria / Marcus / Sofia Interruption Dialog) */}
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
      {/* 7. APPROVAL MODAL OVERLAYS (Requirements & Design Specs) */}
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
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center border border-slate-200 font-bold"
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
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white text-slate-600 hover:text-slate-900 shadow-md flex items-center justify-center border border-slate-200 font-bold"
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
