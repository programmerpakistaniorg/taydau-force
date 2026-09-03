import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileEdit,
  PlusCircle,
  Users,
  Target,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { FullProjectResponse, RequirementBaseline } from '../../types/api';

interface RequirementsReviewCardProps {
  baseline: RequirementBaseline;
  project: FullProjectResponse;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
}

export const RequirementsReviewCard: React.FC<RequirementsReviewCardProps> = ({
  baseline,
  project,
  onApprove,
  onRequestChanges,
  onClose,
  isLoading = false,
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [modalMode, setModalMode] = useState<'change' | 'add'>('change');
  const [feedback, setFeedback] = useState('');

  const snapshot = baseline.snapshot || {};
  const businessGoal = snapshot.businessObjective || project.clientBrief;
  const targetUsers = snapshot.primaryUsers || ['End Customers', 'Internal Staff', 'Admin'];
  const reqList = snapshot.requirements || project.requirements || [];
  const businessRules = snapshot.businessRules || [
    'Appointments must be confirmed before technician bay allocation',
    'Customer vehicle model and service package are required fields',
    'Duplicate booking slots in the same bay must be rejected'
  ];
  const assumptions = snapshot.assumptions || [
    'Web application accessed via modern desktop and mobile browsers',
    'Standard business hours from 8:00 AM to 6:00 PM'
  ];

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    await onRequestChanges(feedback.trim());
    setShowFeedbackModal(false);
    setFeedback('');
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl border-2 border-indigo-200 shadow-2xl shadow-indigo-50/50 max-h-[88vh] w-full overflow-hidden transition-all">
      {/* 1. Fixed Header */}
      <div className="shrink-0 p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xl shadow-xs border border-indigo-100 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                HERE'S WHAT TAYDAU UNDERSTOOD
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Requirements v{baseline.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Aria Analyst extracted {reqList.length} testable business requirements. Review below and approve.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="header-approve-requirements-btn"
            onClick={onApprove}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
        {/* Structured Sections: Goal & Users */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Business Goal */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Business Goal & Target Outcome</span>
            </div>
            <p className="text-xs text-slate-900 leading-relaxed font-medium">{businessGoal}</p>
          </div>

          {/* Primary Users */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Primary Users & Target Personas</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {targetUsers.map((u: string, i: number) => (
                <span key={i} className="text-xs bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-semibold shadow-2xs">
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Derived Scope & Acceptance Checks */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Derived Scope & Acceptance Checks ({reqList.length})</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Verified by Aria Analyst</span>
          </div>

          <div className="space-y-2.5">
            {reqList.map((req: any) => (
              <div key={req.code} className="bg-slate-50 hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-2 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-lg text-xs">
                      {req.code}
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{req.title}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold shrink-0 shadow-2xs">
                    {req.type || 'Functional'} • {req.priority || 'High'}
                  </span>
                </div>

                {req.acceptanceCriteria && req.acceptanceCriteria.length > 0 && (
                  <div className="pl-3 border-l-2 border-indigo-400/70 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                    {req.acceptanceCriteria.map((crit: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Core Business Rules & Key Assumptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">Core Business Rules</span>
            <ul className="space-y-1.5 pl-3 list-disc text-slate-600 text-xs leading-relaxed">
              {businessRules.map((rule: string, idx: number) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider">Key Assumptions</span>
            <ul className="space-y-1.5 pl-3 list-disc text-slate-600 text-xs leading-relaxed">
              {assumptions.map((assump: string, idx: number) => (
                <li key={idx}>{assump}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Fixed Action Footer */}
      <div className="shrink-0 p-4 sm:p-5 bg-slate-50/95 backdrop-blur-xs border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalMode('change');
              setShowFeedbackModal(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <FileEdit className="w-3.5 h-3.5 text-slate-600" />
            <span>Request Changes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode('add');
              setShowFeedbackModal(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>I Have More to Add</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="approve-requirements-btn"
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approve Requirements & Start Planning</span>
        </button>
      </div>

      {/* Feedback / Additions Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900">
              {modalMode === 'change' ? 'Request Requirements Adjustment' : 'Provide Additional Business Context'}
            </h3>
            <p className="text-xs text-slate-600">
              Aria Analyst will receive your feedback and generate updated Requirements v{baseline.version + 1} without overwriting previous history.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  modalMode === 'change'
                    ? 'e.g. Please clarify that service bays should have technician capacity limits...'
                    : 'e.g. We also need customers to receive SMS reminder notifications...'
                }
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 resize-none font-normal"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!feedback.trim() || isLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Submit to Aria Analyst
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
