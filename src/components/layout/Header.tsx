import React from 'react';
import {
  Sparkles,
  RotateCcw,
  Layers,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useSimulation, SIMULATION_STEPS } from '../../context/SimulationContext';

export const Header: React.FC = () => {
  const { currentStep, stepInfo, simulateNextStep, resetSimulation, isSimulating } = useSimulation();

  const isMaxStep = currentStep === SIMULATION_STEPS.length - 1;
  const progressPercent = currentStep >= 11 ? 72 : currentStep >= 8 ? 70 : 68;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px]">
            <Sparkles className="w-3 h-3" />
            Interactive Concept Prototype
          </span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            This prototype demonstrates the planned TayDau Force workflow using simulated project data. No live AI agents are connected in this version.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            Client: <strong className="text-slate-200">Apex Logistics</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Sim Engine Online
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Project & Stage Context */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Smart Inventory Management System
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                In Development
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-700 font-medium">
                <Layers className="w-3.5 h-3.5 text-brand-blue" />
                Current Stage: <span className="text-brand-blue font-semibold">Build / QA</span> (Stage 7 & 9 / 12)
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Sprint 2 of 4
              </span>
            </div>
          </div>
        </div>

        {/* Right: Progress & Simulation Control */}
        <div className="flex items-center gap-4">
          {/* Completion Progress Gauge */}
          <div className="hidden lg:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Overall Completion</span>
              <span className="font-bold text-slate-900">{progressPercent}%</span>
            </div>
            <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-brand-blue rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Interactive Simulation Trigger Button */}
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
              <span>{isMaxStep ? 'Workflow Completed' : 'Simulate Next Activity'}</span>
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
        </div>
      </div>

      {/* Dynamic Simulated Step Toast / Notification Banner */}
      {currentStep > 0 && (
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
            Actor: {stepInfo.actor}
          </span>
        </div>
      )}
    </header>
  );
};
