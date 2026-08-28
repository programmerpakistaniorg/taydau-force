import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DocumentationModal } from '../common/DocumentationModal';
import { Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-enterprise-bg text-enterprise-text font-sans antialiased">
      {/* Left Sidebar */}
      <Sidebar onOpenDocModal={() => setIsDocModalOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Sticky Header */}
        <Header />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        {/* Global Enterprise Hackathon Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">TayDau Force</span>
              <span className="text-slate-300">•</span>
              <span>Autonomous Software Delivery Organization Prototype</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                <Sparkles className="w-3 h-3 text-brand-blue" />
                Prototype prepared for Alibaba Cloud AI Hackathon Pakistan 2026
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Concept Documentation Modal */}
      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
    </div>
  );
};
