import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home,
  FolderKanban,
  FileText,
  Layers,
  Users,
  Code2,
  ShieldCheck,
  Coins,
  PackageCheck,
  Sparkles,
  Settings,
  HelpCircle,
  User
} from 'lucide-react';
import { DocumentationModal } from '../common/DocumentationModal';
import { useLiveProject } from '../../context/LiveProjectContext';

export const AppLayout: React.FC = () => {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, project } = useLiveProject();

  const navItems = [
    { path: '/', icon: Home, label: 'Home Pipeline', desc: 'Visual Delivery Pipeline' },
    { path: '/project', icon: FolderKanban, label: 'My Project', desc: 'Project Overview & Coordination' },
    { path: '/requirements', icon: FileText, label: 'Features', desc: 'Requirements Baseline & Stories' },
    { path: '/architecture', icon: Layers, label: 'Solution Design', desc: 'System Architecture & Schemas' },
    { path: '/workforce', icon: Users, label: 'AI Team', desc: 'Autonomous Specialists & Activity' },
    { path: '/execution', icon: Code2, label: 'Build Progress', desc: 'Task Execution & Code Artifacts' },
    { path: '/qa-security', icon: ShieldCheck, label: 'Testing & Safety', desc: 'Automated QA & Threat Scans' },
    { path: '/cost-governor', icon: Coins, label: 'Cost & Budget', desc: 'Token Telemetry & Cost Governor' },
    { path: '/delivery', icon: PackageCheck, label: 'Final Delivery', desc: 'Release Readiness & Verification' },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT ICON SIDEBAR (Clean vertical icon bar with tooltips) */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-16 sm:w-18 bg-white border-r border-slate-200/80 flex flex-col items-center py-4 justify-between shrink-0 z-30 shadow-sm sticky top-0 h-screen">
        {/* Top Logo Mark */}
        <div className="flex flex-col items-center gap-6">
          <Link
            to="/"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-[2px] shadow-sm hover:scale-105 transition-transform flex items-center justify-center group"
            title="TayDau Force Home"
          >
            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center overflow-hidden p-1">
              <img
                src="/TayDau-Force-Logo.png"
                alt="TayDau Force Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </Link>

          {/* Navigation Icon List */}
          <nav className="flex flex-col items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <div key={item.path} className="relative group">
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>

                  {/* Rich Hover Tooltip */}
                  <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col z-50 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap border border-slate-700/80 animate-in fade-in zoom-in-95">
                    <span className="font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-300 font-normal">{item.desc}</span>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            title="System Documentation & Architecture"
            aria-label="Documentation"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Clean Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-20 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>TayDau Force</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Autonomous Software Delivery
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation Mode Switcher */}
            <button
              type="button"
              onClick={() => setMode(mode === 'live' ? 'demo' : 'live')}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer"
            >
              {mode === 'live' ? '● Live Project Mode' : 'Switch to Live Mode'}
            </button>

            {/* User Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white px-6 py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">TayDau Force</span>
              <span className="text-slate-300">•</span>
              <span>Autonomous Software Delivery Organization</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Governed AI Software Delivery with Independent Verification
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* System Documentation Modal */}
      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
    </div>
  );
};

export default AppLayout;
