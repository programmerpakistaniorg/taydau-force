import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, FileEdit, ArrowRight, ShieldCheck, Layers } from 'lucide-react';
import { ApprovalRequest, FullProjectResponse } from '../../types/api';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  project: FullProjectResponse;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  isLoading?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  project,
  onApprove,
  onRequestChanges,
  isLoading = false,
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');

  const isRequirements = approval.artifactType === 'requirements';
  const latestBaseline = project.requirementBaselines?.[0];
  const latestDesign = project.designSpecs?.[0];

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    await onRequestChanges(feedback.trim());
    setShowFeedbackModal(false);
    setFeedback('');
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-xl shadow-emerald-50/50 p-6 md:p-8 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xl shadow-sm">
            {isRequirements ? <ShieldCheck className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">
                {isRequirements ? 'Requirements Review Gate' : 'Product Design Review Gate'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Version {approval.artifactVersion}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRequirements
                ? 'Aria Analyst has extracted testable requirements from your brief. Please verify the scope.'
                : 'Sofia Designer has created the interactive product preview. Please verify user flow & screens.'}
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-6 text-sm text-slate-700 space-y-3">
        {isRequirements && latestBaseline ? (
          <>
            <div>
              <span className="font-semibold text-slate-900">Business Objective: </span>
              {latestBaseline.snapshot?.businessObjective || 'Deliver functional vertical slice.'}
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="font-semibold text-slate-900 block mb-1.5">
                Derived Requirements ({latestBaseline.snapshot?.requirements?.length || project.requirements.length}):
              </span>
              <div className="space-y-1.5 pl-2">
                {(latestBaseline.snapshot?.requirements || project.requirements).map((r: any) => (
                  <div key={r.code} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {r.code}
                    </span>
                    <span className="font-medium text-slate-900">{r.title}</span>
                    <span className="text-slate-500">({r.type}, {r.priority})</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : latestDesign ? (
          <>
            <div>
              <span className="font-semibold text-slate-900">Experience Summary: </span>
              {latestDesign.summary || latestDesign.design?.productExperienceSummary}
            </div>
            <div className="pt-2 border-t border-slate-200/60">
              <span className="font-semibold text-slate-900 block mb-1.5">
                Screens in Preview ({latestDesign.design?.screens?.length || 0}):
              </span>
              <div className="flex flex-wrap gap-2">
                {latestDesign.design?.screens?.map((s: any) => (
                  <span
                    key={s.id}
                    className="text-xs bg-pink-50 text-pink-800 border border-pink-100 font-medium px-2.5 py-1 rounded-lg"
                  >
                    {s.name} ({s.route})
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">Artifact ready for inspection.</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setShowFeedbackModal(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <FileEdit className="w-4 h-4 text-slate-500" />
          Request Changes / Feedback
        </button>

        <button
          type="button"
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{isLoading ? 'Approving...' : isRequirements ? 'Approve Requirements & Plan Delivery' : 'Approve Wireframes & Begin Architecture'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Request Changes Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              Request Changes on {isRequirements ? 'Requirements' : 'Wireframe Design'}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Our specialists will revise the baseline. Note: If your feedback adds new features, our Scope Change Control will route to business analysis.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Please add an upcoming appointments section on the dashboard, or adjust customer booking steps..."
                rows={4}
                className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-900 bg-white"
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !feedback.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  Submit Revisions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
