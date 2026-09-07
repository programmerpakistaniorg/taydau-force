import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FileEdit,
  Eye,
  Monitor,
  Smartphone,
  Layers,
  Palette,
  Compass,
  ArrowRight,
  Code,
  ExternalLink,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { FullProjectResponse, DesignSpec, DesignScreen } from '../../types/api';
import { ROLE_REGISTRY } from '../../config/roles';

interface DesignReviewCardProps {
  designSpec: DesignSpec;
  project: FullProjectResponse;
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  isLoading?: boolean;
}

export const DesignReviewCard: React.FC<DesignReviewCardProps> = ({
  designSpec,
  project,
  onApprove,
  onRequestChanges,
  isLoading = false,
}) => {
  const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(0);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'structure'>('preview');
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  const screens: DesignScreen[] = designSpec.design?.screens || [];
  const currentScreen = screens[selectedScreenIndex] || screens[0];
  const designSystem = designSpec.design?.designSystem;
  const userFlows = designSpec.design?.userFlows || [];
  const sofiaRole = ROLE_REGISTRY.ui_ux_designer;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    await onRequestChanges(feedback.trim());
    setShowFeedbackModal(false);
    setFeedback('');
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-pink-200 shadow-xl shadow-pink-50/50 p-6 md:p-8 transition-all space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${sofiaRole.avatarBg} font-bold flex items-center justify-center text-lg shadow-sm border border-pink-100`}>
            {sofiaRole.avatarText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">YOUR FIRST DESIGN IS READY</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-pink-50 text-pink-700 border border-pink-200">
                Design v{designSpec.version}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Google Stitch Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sofia Designer has generated visual product screens matching your approved requirements.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Design
        </button>
      </div>

      {/* Screen Selector Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          {screens.map((screen, idx) => (
            <button
              key={screen.id || idx}
              type="button"
              onClick={() => setSelectedScreenIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedScreenIndex === idx
                  ? 'bg-white text-pink-700 shadow-sm border border-pink-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {screen.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setDeviceMode('desktop')}
            className={`p-1.5 rounded text-xs ${deviceMode === 'desktop' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
            title="Desktop View"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded text-xs ${deviceMode === 'mobile' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
            title="Mobile View"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Visual Screen Preview Area */}
      {currentScreen && (
        <div className="space-y-4">
          <div className="bg-slate-900/5 border border-slate-200 rounded-2xl p-4 overflow-hidden flex flex-col items-center justify-center min-h-[420px]">
            {currentScreen.htmlContent ? (
              <div
                className={`transition-all duration-300 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden ${
                  deviceMode === 'desktop' ? 'w-full max-w-[1000px] h-[520px]' : 'w-[360px] h-[560px]'
                }`}
              >
                <iframe
                  title={currentScreen.name}
                  srcDoc={currentScreen.htmlContent}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            ) : currentScreen.imageUrl ? (
              <img
                src={currentScreen.imageUrl}
                alt={currentScreen.name}
                className="max-h-[500px] rounded-xl shadow-lg border border-slate-200 object-contain"
              />
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-semibold">{currentScreen.name}</p>
                <p className="text-[11px]">{currentScreen.purpose}</p>
              </div>
            )}
          </div>

          {/* Screen Metadata & Sections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-slate-500 font-medium block mb-1">Screen Purpose</span>
              <span className="font-semibold text-slate-800">{currentScreen.purpose}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-slate-500 font-medium block mb-1">Target User Role</span>
              <span className="font-semibold text-slate-800">{currentScreen.primaryUser || 'All Users'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-slate-500 font-medium block mb-1">Primary Actions</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {currentScreen.primaryActions?.map((act, i) => (
                  <span key={i} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-700">
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand & Design System Direction */}
      {designSystem && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            <Palette className="w-4 h-4 text-pink-600" />
            Design System & Brand Aesthetics
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Theme:</span>
              <span className="font-semibold text-slate-800">{designSystem.styleDirection}</span>
            </div>
            {designSystem.colors && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Palette:</span>
                <div className="flex items-center gap-1.5">
                  {Object.entries(designSystem.colors).map(([name, hex]) => (
                    <span
                      key={name}
                      title={`${name}: ${hex}`}
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs inline-block"
                      style={{ backgroundColor: typeof hex === 'string' && hex.startsWith('#') ? hex : '#1e40af' }}
                    />
                  ))}
                </div>
              </div>
            )}
            {designSystem.typography && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Typography:</span>
                <span className="font-semibold text-slate-800">{designSystem.typography.headingFont}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Journey Flows */}
      {userFlows.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            <Compass className="w-4 h-4 text-pink-600" />
            Mapped User Journeys ({userFlows.length})
          </div>
          <div className="space-y-1.5">
            {userFlows.map((flow, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold text-slate-900">{flow.name}:</span>
                <span className="text-slate-500">{flow.steps.join('  →  ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="request-design-changes-btn"
            onClick={() => setShowFeedbackModal(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <FileEdit className="w-3.5 h-3.5 text-slate-600" />
            Request Design Changes
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback('Explore an alternative aesthetic with softer slate surfaces and high-contrast typography.');
              setShowFeedbackModal(true);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            Explore Another Direction
          </button>
        </div>

        <button
          type="button"
          data-testid="approve-design-btn"
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Design & Start Technical Architecture
        </button>
      </div>

      {/* Design Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Request Design Adjustments</h3>
            <p className="text-xs text-slate-600">
              Sofia Designer will revise the visual presentation. If your request introduces new functional scope, it will automatically route to Aria Analyst for requirements change control.
            </p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Make it more premium, darker header, and show today's appointments first..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 resize-none"
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
                  data-testid="submit-design-revision-btn"
                  disabled={!feedback.trim() || isLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl disabled:opacity-50"
                >
                  Submit Revision to Sofia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
