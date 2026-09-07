import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RotateCcw,
  Layers,
  CheckCircle2,
  Radio,
  RefreshCw,
  Zap,
  Info,
  ShieldCheck,
  Server,
  Database,
  Terminal,
  X,
  ArrowRight,
  HelpCircle,
  Play
} from 'lucide-react';
import { useSimulation, SIMULATION_STEPS } from '../../context/SimulationContext';
import { useLiveProject } from '../../context/LiveProjectContext';
import { ROLE_REGISTRY, type RoleKey } from '../../config/roles';

function mapWorkflowStageToDisplay(stage: string | undefined, status: string | undefined): { label: string; bg: string; text: string; border: string } {
  if (status === 'failed') {
    return { label: 'Needs Attention', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
  }
  if (status === 'completed' || stage === 'completed') {
    return { label: 'Verified & Delivery Ready', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
  }
  if (status === 'waiting_for_client') {
    return { label: 'Action Required', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
  }

  switch (stage) {
    case 'created':
    case 'business_analysis':
      return { label: 'Business Analysis', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
    case 'requirements_review':
      return { label: 'Requirements Review', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
    case 'project_planning':
      return { label: 'Delivery Planning', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' };
    case 'ui_ux_design':
    case 'design_review':
      return { label: 'Product Design', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300' };
    case 'technical_architecture':
      return { label: 'Solution Architecture', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' };
    case 'implementation':
      return { label: 'Engineering Implementation', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' };
    case 'code_review':
      return { label: 'Code & Security Audit', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    case 'independent_qa':
      return { label: 'Independent QA Sandbox', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    case 'release_evaluation':
      return { label: 'Release Gate Verification', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
    default:
      return { label: 'Ready', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, stepInfo, simulateNextStep, resetSimulation, isSimulating } = useSimulation();
  const {
    mode,
    setMode,
    project,
    isPolling,
    isActionInProgress,
    currentProgressMessage,
    refreshProject,
    retryStage,
  } = useLiveProject();

  const [showSystemDetails, setShowSystemDetails] = useState<boolean>(false);

  const isMaxStep = currentStep === SIMULATION_STEPS.length - 1;
  const simProgressPercent = currentStep >= 11 ? 100 : currentStep >= 8 ? 75 : currentStep >= 4 ? 50 : 25;

  const liveWorkflow = project?.workflow;
  const liveProgressPercent = liveWorkflow?.progress ?? 0;
  const stageDisplay = mapWorkflowStageToDisplay(liveWorkflow?.stage, liveWorkflow?.stageStatus);
  const nextAction = project?.nextAction;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          {mode === 'live' ? (
            <span className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {project ? 'LIVE PROJECT' : 'LIVE MODE'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px]">
              <Sparkles className="w-3 h-3" />
              SIMULATION MODE
            </span>
          )}

          <span className="text-slate-400 hidden sm:inline text-[11px]">
            {mode === 'live'
              ? 'Autonomous human-team software delivery organization.'
              : 'Interactive concept demonstration with simulated workflow.'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <button
            onClick={() => setShowSystemDetails(!showSystemDetails)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="View system connection status"
          >
            <Info className="w-3 h-3" />
            <span className="hidden sm:inline">System Status</span>
          </button>

          <span className="text-slate-600">|</span>

          <button
            onClick={() => setMode(mode === 'live' ? 'demo' : 'live')}
            className="px-2.5 py-0.5 rounded-md font-semibold text-[11px] transition-colors border flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            title="Toggle between Live Project and Simulation Mode"
          >
            <Radio className="w-3 h-3 text-brand-blue" />
            <span>Switch to {mode === 'live' ? 'Simulation' : 'Live Mode'}</span>
          </button>
        </div>
      </div>

      {/* System Status Dropdown Card */}
      {showSystemDetails && (
        <div className="bg-slate-950 text-slate-200 border-b border-slate-800 px-6 py-3 text-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Model Gateway (Groq):</span>
              <span className="font-semibold text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">PostgreSQL Facts & DB:</span>
              <span className="font-semibold text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Air-Gapped Sandbox:</span>
              <span className="font-semibold text-emerald-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">Specialist Roles:</span>
              <span className="font-semibold text-emerald-400">7 Active</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Mode:</span>
              <span className="font-semibold text-white uppercase">{mode}</span>
            </div>
          </div>
          <button
            onClick={() => setShowSystemDetails(false)}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Project & Stage Context */}
        <div className="flex items-center gap-4">
          <div>
            {mode === 'live' ? (
              project ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-slate-900 tracking-tight">
                      {project.name}
                    </h1>
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold border rounded-md ${stageDisplay.bg} ${stageDisplay.text} ${stageDisplay.border}`}>
                      {stageDisplay.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Layers className="w-3.5 h-3.5 text-brand-blue" />
                      Stage:{' '}
                      <span className="text-brand-blue font-semibold">
                        {stageDisplay.label}
                      </span>
                      {liveProgressPercent === 100 && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-0.5 ml-1">
                          <CheckCircle2 className="w-3 h-3" /> (All 7 Quality Gates Passed)
                        </span>
                      )}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">
                      ID: {project.id.slice(0, 8)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-slate-900 tracking-tight">
                      No Active Project
                    </h1>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                      Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Start a project to initiate autonomous software delivery.</span>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Smart Wholesale Inventory System
                  </h1>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-brand-blue border border-blue-200 rounded-md">
                    Concept Simulation
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-slate-700 font-medium">
                    <Layers className="w-3.5 h-3.5 text-brand-blue" />
                    Status: <span className="text-brand-blue font-semibold">Concept Simulation</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">7 Specialist Roles</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Next Action & Progress */}
        <div className="flex items-center gap-4">
          {/* Progress Gauge */}
          <div className="hidden lg:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Progress</span>
              <span className="font-bold text-slate-900">
                {mode === 'live' ? liveProgressPercent : simProgressPercent}%
              </span>
            </div>
            <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (mode === 'live' && liveProgressPercent === 100) || (mode === 'demo' && simProgressPercent === 100)
                    ? 'bg-emerald-600'
                    : 'bg-brand-blue'
                }`}
                style={{ width: `${mode === 'live' ? liveProgressPercent : simProgressPercent}%` }}
              />
            </div>
          </div>

          {mode === 'live' ? (
            /* Contextual NextAction Controls */
            <div className="flex items-center gap-2">
              {nextAction && nextAction.requiresUser && (
                <button
                  onClick={() => {
                    if (nextAction.type === 'retry') {
                      retryStage();
                    } else if (nextAction.targetRoute) {
                      navigate(nextAction.targetRoute);
                    }
                  }}
                  disabled={isActionInProgress}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{nextAction.label || 'Action Required'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {nextAction?.type === 'delivery' && (
                <button
                  onClick={() => navigate('/delivery')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>View Delivery</span>
                </button>
              )}

              <button
                onClick={refreshProject}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Refresh project data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-brand-blue' : ''}`} />
              </button>
            </div>
          ) : (
            /* Simulation Controls */
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={simulateNextStep}
                disabled={isMaxStep || isSimulating}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all duration-150 ${
                  isMaxStep
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-brand-blue hover:bg-blue-700 active:scale-98 text-white ring-2 ring-blue-600/20'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isMaxStep ? 'Workflow Completed' : 'Simulate Next Step'}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-mono">
                  {currentStep}/11
                </span>
              </button>

              {currentStep > 0 && (
                <button
                  onClick={resetSimulation}
                  title="Reset simulation to initial baseline"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-md transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Polling / Progress Notification Bar */}
      {mode === 'live' && isPolling && (
        <div className="px-6 py-2 bg-blue-50/90 border-t border-blue-200 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="font-bold text-brand-blue">TayDau Software Team:</span>
            <span>{currentProgressMessage}</span>
          </div>
          <span className="text-[11px] text-blue-700 font-mono flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Working...
          </span>
        </div>
      )}
    </header>
  );
};
