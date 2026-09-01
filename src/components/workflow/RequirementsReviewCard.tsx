import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileEdit,
  PlusCircle,
  Users,
  Target,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ListOrdered,
  Layers
} from 'lucide-react';
import { FullProjectResponse, RequirementBaseline } from '../../types/api';

interface RequirementsReviewCardProps {
  baseline: RequirementBaseline;
  project: FullProjectResponse;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  isLoading?: boolean;
}

export const RequirementsReviewCard: React.FC<RequirementsReviewCardProps> = ({
  baseline,
  project,
  onApprove,
  onRequestChanges,
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
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl shadow-indigo-50/50 p-6 md:p-8 transition-all space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xl shadow-sm border border-indigo-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">HERE'S WHAT TAYDAU UNDERSTOOD</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Requirements v{baseline.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Aria Analyst has extracted testable business scope. Review below and approve or request adjustments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve Requirements
          </button>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Goal */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Business Goal & Target Outcome
          </div>
          <p className="text-sm text-slate-900 leading-relaxed">{businessGoal}</p>
        </div>

        {/* Primary Users */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Primary Users & Roles
          </div>
          <div className="flex flex-wrap gap-1.5">
            {targetUsers.map((u: string, i: number) => (
              <span key={i} className="text-xs bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                {u}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Features */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Derived Scope & Acceptance Checks ({reqList.length})
          </h4>
        </div>
        <div className="space-y-2.5">
          {reqList.map((req: any) => (
            <div key={req.code} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {req.code}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{req.title}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                  {req.type || 'Functional'} • {req.priority || 'High'}
                </span>
              </div>
              {req.acceptanceCriteria && req.acceptanceCriteria.length > 0 && (
                <div className="pl-3 border-l-2 border-indigo-300 space-y-1 text-slate-600">
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

      {/* Business Rules & Assumptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <span className="font-bold text-slate-900 block">Core Business Rules</span>
          <ul className="space-y-1 pl-3 list-disc text-slate-600">
            {businessRules.map((rule: string, idx: number) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <span className="font-bold text-slate-900 block">Key Assumptions</span>
          <ul className="space-y-1 pl-3 list-disc text-slate-600">
            {assumptions.map((assump: string, idx: number) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalMode('change');
              setShowFeedbackModal(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <FileEdit className="w-3.5 h-3.5 text-slate-600" />
            Request Changes
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode('add');
              setShowFeedbackModal(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
            I Have More to Add
          </button>
        </div>

        <button
          type="button"
          data-testid="approve-requirements-btn"
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Requirements & Start Planning
        </button>
      </div>

      {/* Feedback / Additions Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
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
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!feedback.trim() || isLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
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
