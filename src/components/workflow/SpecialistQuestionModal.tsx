import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  Compass
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

  // Reset or initialize answers when interactions change
  useEffect(() => {
    if (interactions && interactions.length > 0) {
      setCurrentIndex(0);
      const initialAnswers: Record<string, any> = {};
      interactions.forEach((item) => {
        initialAnswers[item.id] = item.recommendedOption || (item.options && item.options[0]) || '';
      });
      setAnswers(initialAnswers);
    }
  }, [interactions]);

  // Keyboard accessibility: Escape to close & Focus trap
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

  const currentAnswer = useCustomMode[currentInteraction.id]
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
  };

  const handleToggleCustom = () => {
    setUseCustomMode((prev) => ({
      ...prev,
      [currentInteraction.id]: !prev[currentInteraction.id],
    }));
  };

  const handleNextOrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAnswer = useCustomMode[currentInteraction.id]
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specialist-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
      >
        {/* Top Specialist Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close question dialog"
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div
              className={`w-14 h-14 rounded-2xl ${roleDef.avatarBg} font-bold flex items-center justify-center text-xl shadow-md border-2 border-white/20 shrink-0`}
            >
              {roleDef.avatarText}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="specialist-modal-title" className="text-lg font-bold text-white tracking-tight">
                  {roleDef.personaName}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/15 text-indigo-200 border border-white/10">
                  {roleDef.displayName}
                </span>
                {totalQuestions > 1 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-500/30 text-indigo-200">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {getRoleGreeting(roleKey)}
              </p>
            </div>
          </div>

          {/* Stepper Dots for Multi-Questions */}
          {totalQuestions > 1 && (
            <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/10">
              {interactions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
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
        <form onSubmit={handleNextOrSubmit} className="p-6 md:p-8 space-y-6">
          {/* Question Text */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Decision Point #{currentIndex + 1}
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
              {currentInteraction.question}
            </h3>

            {/* Why this matters */}
            {currentInteraction.whyItMatters && (
              <div className="mt-3 flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-semibold">Why this matters: </strong>
                  <span>{currentInteraction.whyItMatters}</span>
                </div>
              </div>
            )}
          </div>

          {/* Options Grid */}
          {currentInteraction.options && currentInteraction.options.length > 0 && !useCustomMode[currentInteraction.id] && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentInteraction.options.map((opt) => {
                const isSelected = answers[currentInteraction.id] === opt;
                const isRecommended = currentInteraction.recommendedOption === opt;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`group relative flex items-start justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-medium shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 pr-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm leading-snug">{opt}</span>
                    </div>

                    {isRecommended && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-md shrink-0">
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
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-4 inline-block mb-3"
              >
                {useCustomMode[currentInteraction.id]
                  ? '← Choose from suggested options'
                  : 'Specify custom operational requirement instead'}
              </button>

              {useCustomMode[currentInteraction.id] && (
                <textarea
                  value={customAnswers[currentInteraction.id] || ''}
                  onChange={(e) => handleCustomTextChange(e.target.value)}
                  placeholder="Describe your specific workflow, rules, or requirements in detail..."
                  rows={3}
                  className="w-full text-sm p-3.5 border-2 border-indigo-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 bg-white shadow-inner resize-none"
                  autoFocus
                  required
                />
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div>
              {allHaveRecommendations && totalQuestions > 1 && (
                <button
                  type="button"
                  onClick={handleAcceptAllRecommended}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || !currentAnswer.toString().trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
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
