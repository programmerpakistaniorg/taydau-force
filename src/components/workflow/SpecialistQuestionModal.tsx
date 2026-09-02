import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Edit3
} from 'lucide-react';
import { ClientInteraction } from '../../types/api';
import { ROLE_REGISTRY, type RoleKey } from '../../config/roles';

interface SpecialistQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: ClientInteraction[];
  onSubmitAnswer: (interactionId: string, answer: any) => Promise<void>;
  isLoading?: boolean;
}

export const SpecialistQuestionModal: React.FC<SpecialistQuestionModalProps> = ({
  isOpen,
  onClose,
  interactions,
  onSubmitAnswer,
  isLoading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [useCustomMode, setUseCustomMode] = useState<Record<string, boolean>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const prevInteractionsKeyRef = useRef<string>('');

  // Stabilize interaction batch key to avoid resetting answers on each background polling tick
  const interactionsKey = interactions?.map((i) => i.id).sort().join(',') || '';

  useEffect(() => {
    if (interactions && interactions.length > 0) {
      if (interactionsKey !== prevInteractionsKeyRef.current) {
        prevInteractionsKeyRef.current = interactionsKey;
        setCurrentIndex(0);
        setAnswers((prev) => {
          const updated = { ...prev };
          interactions.forEach((item) => {
            if (updated[item.id] === undefined) {
              updated[item.id] = item.recommendedOption || (item.options && item.options[0]) || '';
            }
          });
          return updated;
        });
      }
    }
  }, [interactionsKey, interactions]);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !interactions || interactions.length === 0) {
    return null;
  }

  const totalQuestions = interactions.length;
  const currentInteraction = interactions[currentIndex] || interactions[0];
  const roleKey = (currentInteraction.agentRole as RoleKey) || 'business_analyst';
  const roleDef = ROLE_REGISTRY[roleKey] || ROLE_REGISTRY.business_analyst;

  const isCustomActive = Boolean(useCustomMode[currentInteraction.id]);
  const currentAnswer = isCustomActive
    ? customAnswers[currentInteraction.id] || ''
    : answers[currentInteraction.id] || '';

  const getRoleGreeting = (role: string) => {
    switch (role) {
      case 'business_analyst':
        return `I've analyzed your business idea. I need ${totalQuestions > 1 ? `${totalQuestions} quick decisions` : 'a quick decision'} before I finalize the requirements baseline.`;
      case 'project_manager':
        return `Your requirements are clear. I need ${totalQuestions > 1 ? `${totalQuestions} delivery preferences` : 'a delivery preference'} before preparing the delivery plan.`;
      case 'ui_ux_designer':
        return `I understand the product goals. Please share your aesthetic and workflow preferences for the visual screens.`;
      case 'solution_architect':
        return `Technical architecture is being synthesized. A technical constraint requires your confirmation.`;
      case 'engineer':
        return `Implementation is underway. Please clarify this operational edge case so code generation matches your needs.`;
      default:
        return `Your specialist team needs client input before proceeding autonomously.`;
    }
  };

  const handleSelectOption = (opt: string) => {
    setAnswers((prev) => ({ ...prev, [currentInteraction.id]: opt }));
    setUseCustomMode((prev) => ({ ...prev, [currentInteraction.id]: false }));
  };

  const handleCustomTextChange = (text: string) => {
    setCustomAnswers((prev) => ({ ...prev, [currentInteraction.id]: text }));
    setAnswers((prev) => ({ ...prev, [currentInteraction.id]: text }));
  };

  const handleToggleCustom = () => {
    setUseCustomMode((prev) => {
      const nextCustom = !prev[currentInteraction.id];
      if (nextCustom && customAnswers[currentInteraction.id]) {
        setAnswers((a) => ({ ...a, [currentInteraction.id]: customAnswers[currentInteraction.id] }));
      }
      return {
        ...prev,
        [currentInteraction.id]: nextCustom,
      };
    });
  };

  const handleNextOrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAnswer = isCustomActive
      ? (customAnswers[currentInteraction.id] || '').trim()
      : answers[currentInteraction.id];

    if (!finalAnswer) return;

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Final submission of all answers sequentially
      for (const interaction of interactions) {
        const ans = useCustomMode[interaction.id]
          ? (customAnswers[interaction.id] || '').trim()
          : answers[interaction.id] || interaction.recommendedOption || (interaction.options && interaction.options[0]);
        if (ans) {
          await onSubmitAnswer(interaction.id, ans);
        }
      }
      onClose();
    }
  };

  const handleAcceptAllRecommended = async () => {
    for (const interaction of interactions) {
      const rec = interaction.recommendedOption || (interaction.options && interaction.options[0]);
      if (rec) {
        await onSubmitAnswer(interaction.id, rec);
      }
    }
    onClose();
  };

  const allHaveRecommendations = interactions.every((i) => Boolean(i.recommendedOption));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specialist-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden transform transition-all"
      >
        {/* Top Specialist Banner (Header - shrink-0) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question dialog"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div
              className={`w-12 h-12 rounded-2xl ${roleDef.avatarBg} font-bold flex items-center justify-center text-lg shadow-md border-2 border-white/20 shrink-0`}
            >
              {roleDef.avatarText}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="specialist-modal-title" className="text-base font-bold text-white tracking-tight">
                  {roleDef.personaName}
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-white/15 text-indigo-200 border border-white/10">
                  {roleDef.displayName}
                </span>
                {totalQuestions > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-500/30 text-indigo-200">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {getRoleGreeting(roleKey)}
              </p>
            </div>
          </div>

          {/* Stepper Dots for Multi-Questions */}
          {totalQuestions > 1 && (
            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10">
              {interactions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-8 bg-indigo-400'
                      : idx < currentIndex
                      ? 'w-3 bg-emerald-400'
                      : 'w-3 bg-slate-600'
                  }`}
                  title={`Go to Question ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Question Form */}
        <form onSubmit={handleNextOrSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Question Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Question Text */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1">
                Decision Point #{currentIndex + 1}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentInteraction.question}
              </h3>

              {/* Why this matters */}
              {currentInteraction.whyItMatters && (
                <div className="mt-2.5 flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 font-semibold">Why this matters: </strong>
                    <span>{currentInteraction.whyItMatters}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Options Grid */}
            {currentInteraction.options && currentInteraction.options.length > 0 && !isCustomActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {currentInteraction.options.map((opt) => {
                  const isSelected = !isCustomActive && answers[currentInteraction.id] === opt;
                  const isRecommended = currentInteraction.recommendedOption === opt;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`group relative flex items-start justify-between p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-medium shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                        <span className="text-xs sm:text-sm leading-snug">{opt}</span>
                      </div>

                      {isRecommended && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-1.5 py-0.5 rounded-md shrink-0">
                          Recommended
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Answer View */}
            {currentInteraction.allowCustom && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleToggleCustom}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-4 inline-flex items-center gap-1 mb-2.5 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>
                    {isCustomActive
                      ? '← Choose from suggested options'
                      : 'Specify custom operational requirement instead'}
                  </span>
                </button>

                {isCustomActive && (
                  <textarea
                    value={customAnswers[currentInteraction.id] || ''}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="Describe your specific workflow, rules, or requirements in detail..."
                    rows={3}
                    className="w-full text-xs sm:text-sm p-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 bg-white shadow-xs resize-none"
                    autoFocus
                    required
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer Actions (Sticky - shrink-0) */}
          <div className="shrink-0 bg-white flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-100">
            <div>
              {allHaveRecommendations && totalQuestions > 1 && (
                <button
                  type="button"
                  onClick={handleAcceptAllRecommended}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Use Recommended for All ({totalQuestions})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !currentAnswer.toString().trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {isLoading
                    ? 'Saving Decisions...'
                    : currentIndex < totalQuestions - 1
                    ? 'Next Question'
                    : 'Submit Decisions & Continue'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpecialistQuestionModal;
