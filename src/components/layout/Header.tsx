import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Layers,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Radio,
  Play,
  RefreshCw,
  FolderCheck,
  Zap,
  Info,
  ShieldCheck,
  Server,
  Database,
  Terminal,
  X
} from 'lucide-react';
import { useSimulation, SIMULATION_STEPS } from '../../context/SimulationContext';
import { useLiveProject } from '../../context/LiveProjectContext';

function mapLiveStatus(status: string | undefined): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'release_ready':
      return { label: 'Ready for Delivery', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
    case 'tested_passed':
      return { label: 'Testing Complete', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' };
    case 'verifying':
      return { label: 'Testing & Checking', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' };
    case 'implementing':
    case 'implemented':
      return { label: 'Building Your Application', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
    case 'architecting':
    case 'designed':
      return { label: 'Designing Your Solution', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' };
    case 'planning':
    case 'planned':
      return { label: 'Planning Your Project', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    case 'analyzing':
    case 'analyzed':
      return { label: 'Understanding Your Needs', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' };
    case 'submitted':
      return { label: 'Getting Started', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' };
    case 'defects_found':
      return { label: 'Needs Attention', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    case 'qa_error':
      return { label: 'Testing Needs Attention', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    case 'sandbox_error':
      return { label: 'Verification Unavailable', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    case 'timed_out':
      return { label: 'Verification Timed Out', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    default:
      return { label: status || 'Ready', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

function getLiveProgressPercent(status: string | undefined): number {
  switch (status) {
    case 'release_ready': return 100;
    case 'tested_passed': return 90;
    case 'verifying': return 75;
    case 'implemented': return 65;
    case 'implementing': return 50;
    case 'designed': return 40;
    case 'architecting': return 35;
    case 'planned': return 25;
    case 'planning': return 20;
    case 'analyzed': return 15;
    case 'analyzing':
    case 'submitted': return 10;
    default: return 0;
  }
}

export const Header: React.FC = () => {
  const { currentStep, stepInfo, simulateNextStep, resetSimulation, isSimulating } = useSimulation();
  const {
    mode,
    setMode,
    project,
    isPolling,
    isAdvancing,
    currentProgressMessage,
    advanceProject,
    loadVerifiedProject,
    refreshProject
  } = useLiveProject();

  const [showSystemDetails, setShowSystemDetails] = useState<boolean>(false);

  const isMaxStep = currentStep === SIMULATION_STEPS.length - 1;
  const simProgressPercent = currentStep >= 11 ? 100 : currentStep >= 8 ? 75 : currentStep >= 4 ? 50 : 25;

  const liveStatusInfo = mapLiveStatus(project?.status);
  const liveProgressPercent = getLiveProgressPercent(project?.status);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          {mode === 'live' ? (
            <span className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE PROJECT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px]">
              <Sparkles className="w-3 h-3" />
              SIMULATION MODE
            </span>
          )}

          <span className="text-slate-400 hidden sm:inline text-[11px]">
            {mode === 'live'
              ? 'Real autonomous software delivery with independent verification.'
              : 'Interactive concept demonstration with simulated workflow.'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* System Status Popover Button */}
          <button
            onClick={() => setShowSystemDetails(!showSystemDetails)}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="View system connection status"
          >
            <Info className="w-3 h-3" />
            <span className="hidden sm:inline">System Status</span>
          </button>

          <span className="text-slate-600">|</span>

          {/* Mode Switcher Button */}
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
              <Server className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">Backend:</span>
              <span className="font-semibold text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Database:</span>
              <span className="font-semibold text-emerald-400">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">AI Provider:</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Test Sandbox:</span>
              <span className="font-semibold text-emerald-400">Available</span>
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                {mode === 'live'
                  ? (project?.name || 'Smart Wholesale Inventory System')
                  : 'Smart Wholesale Inventory System'}
              </h1>
              {mode === 'live' ? (
                <span className={`px-2.5 py-0.5 text-[11px] font-bold border rounded-md ${liveStatusInfo.bg} ${liveStatusInfo.text} ${liveStatusInfo.border}`}>
                  {liveStatusInfo.label}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-brand-blue border border-blue-200 rounded-md">
                  In Progress
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <Layers className="w-3.5 h-3.5 text-brand-blue" />
                Status:{' '}
                <span className="text-brand-blue font-semibold">
                  {mode === 'live' ? liveStatusInfo.label : 'Concept Simulation'}
                </span>
                {mode === 'live' && project?.status === 'release_ready' && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5 ml-1">
                    <CheckCircle2 className="w-3 h-3" /> (8/8 Checks Passed)
                  </span>
                )}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                {mode === 'live' ? 'ID: INV-001' : 'Sprint 2 of 4'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Progress */}
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
                  mode === 'live' && liveProgressPercent === 100 ? 'bg-emerald-600' : 'bg-brand-blue'
                }`}
                style={{ width: `${mode === 'live' ? liveProgressPercent : simProgressPercent}%` }}
              />
            </div>
          </div>

          {mode === 'live' ? (
            /* Live Controls */
            <div className="flex items-center gap-2">
              <button
                onClick={loadVerifiedProject}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
                title="Open Verified Example Project (8/8 Passed, Ready for Delivery)"
              >
                <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Open Example Project</span>
              </button>

              {project && project.status !== 'release_ready' && (
                <button
                  onClick={() => advanceProject()}
                  disabled={isAdvancing || isPolling}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 text-white shadow-xs transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isAdvancing ? 'Advancing...' : 'Advance Stage'}</span>
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
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
            <span className="font-bold text-brand-blue">TayDau Team Working:</span>
            <span>{currentProgressMessage}</span>
          </div>
          <span className="text-[11px] text-blue-700 font-mono flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Updating...
          </span>
        </div>
      )}

      {/* Dynamic Simulated Step Toast (Demo Mode) */}
      {mode === 'demo' && currentStep > 0 && (
        <div className="px-6 py-2 bg-blue-50/70 border-t border-blue-100/80 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-blue text-white">
              Step {currentStep}: {stepInfo.badge}
            </span>
            <span className="font-semibold text-slate-900">{stepInfo.title}:</span>
            <span className="text-slate-600 hidden md:inline">{stepInfo.description}</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium shrink-0 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Specialist: {stepInfo.actor}
          </span>
        </div>
      )}
    </header>
  );
};
