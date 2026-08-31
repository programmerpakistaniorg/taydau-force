import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Network,
  Users,
  GitCommit,
  ShieldCheck,
  Coins,
  PackageCheck,
  HelpCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { useLiveProject } from '../../context/LiveProjectContext';

interface SidebarProps {
  onOpenDocModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDocModal }) => {
  const { currentStep } = useSimulation();
  const { mode, project } = useLiveProject();

  const navItems = [
    { name: 'Home', path: '/', icon: LayoutDashboard },
    { name: 'My Project', path: '/project', icon: FolderKanban },
    { name: 'Features', path: '/requirements', icon: ListChecks },
    { name: 'Solution Design', path: '/architecture', icon: Network },
    { name: 'AI Team', path: '/workforce', icon: Users },
    { name: 'Build Progress', path: '/execution', icon: GitCommit },
    { name: 'Testing & Safety', path: '/qa-security', icon: ShieldCheck },
    { name: 'Cost & Budget', path: '/cost-governor', icon: Coins },
    { name: 'Final Delivery', path: '/delivery', icon: PackageCheck },
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col shrink-0 bg-brand-navy text-slate-200 border-r border-slate-800 select-none z-20 overflow-hidden">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-800/80 flex items-center gap-3 shrink-0">
        <img
          src="/TayDau-Force-Logo.png"
          alt="TayDau Force Logo"
          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/15 shadow-xs"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            TayDau Force
            {mode === 'demo' ? (
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded">
                Sim
              </span>
            ) : (
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded">
                Live
              </span>
            )}
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Autonomous Software Delivery
          </span>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto min-h-0">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Delivery Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0 opacity-90" />
                <span>{item.name}</span>
              </div>
              {item.name === 'Testing & Safety' && mode === 'demo' && currentStep >= 4 && currentStep < 10 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Mode-Aware Sidebar Footer Card */}
      <div className="shrink-0">
        {mode === 'live' ? (
          <div className="p-3 mx-3 mb-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE PROJECT
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {project
                ? (project.status === 'release_ready' ? 'Ready for Delivery • 8/8 passed' : 'Project in progress')
                : 'No project active • Start a project to begin'}
            </p>
          </div>
        ) : (
          <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              SIMULATION MODE
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Step {currentStep} of 11 • Concept demonstration
            </p>
          </div>
        )}
      </div>

      {/* Footer / Docs */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <button
          onClick={onOpenDocModal}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Documentation</span>
        </button>
        <span className="text-[10px] text-slate-400 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
