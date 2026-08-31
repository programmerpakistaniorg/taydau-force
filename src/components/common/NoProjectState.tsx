import React from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Plus, ArrowRight } from 'lucide-react';

interface NoProjectStateProps {
  pageTitle?: string;
  message?: string;
}

export const NoProjectState: React.FC<NoProjectStateProps> = ({
  pageTitle = 'No Active Project',
  message = 'Start a new project to generate requirements, architecture, production code, independent test suites, and delivery reports.'
}) => {
  return (
    <div className="p-10 sm:p-14 text-center bg-white border border-slate-200 rounded-2xl shadow-subtle space-y-4 max-w-lg mx-auto my-8 animate-in fade-in duration-200">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-brand-blue flex items-center justify-center mx-auto shadow-2xs">
        <FolderPlus className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-slate-900">{pageTitle}</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="pt-2">
        <Link
          to="/project"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Start a Project</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </Link>
      </div>
    </div>
  );
};
