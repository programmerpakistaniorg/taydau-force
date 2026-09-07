import React, { useState } from 'react';
import { HelpCircle, Check, Sparkles, Send, ArrowRight } from 'lucide-react';
import { ClientInteraction } from '../../types/api';
import { ROLE_REGISTRY, type RoleKey } from '../../config/roles';

interface InteractionCardProps {
  interaction: ClientInteraction;
  onSubmit: (answer: any) => Promise<void>;
  isLoading?: boolean;
}

export const InteractionCard: React.FC<InteractionCardProps> = ({
  interaction,
  onSubmit,
  isLoading = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    interaction.recommendedOption || (interaction.options && interaction.options[0]) || ''
  );
  const [customText, setCustomText] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const roleKey = interaction.agentRole as RoleKey;
  const roleDef = ROLE_REGISTRY[roleKey] || ROLE_REGISTRY.business_analyst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAnswer = useCustom ? customText.trim() : selectedOption;
    if (!finalAnswer) return;
    await onSubmit(finalAnswer);
  };

  const handleUseRecommended = async () => {
    if (!interaction.recommendedOption) return;
    await onSubmit(interaction.recommendedOption);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg shadow-indigo-50/50 p-6 md:p-8 transition-all">
      {/* Specialist Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${roleDef.avatarBg} font-bold flex items-center justify-center text-lg shadow-sm`}>
            {roleDef.avatarText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-base">{roleDef.personaName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {roleDef.displayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{roleDef.roleTitle}</p>
          </div>
        </div>

        {interaction.recommendedOption && (
          <button
            type="button"
            onClick={handleUseRecommended}
            disabled={isLoading}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Accept Recommended ({interaction.recommendedOption})
          </button>
        )}
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
          {interaction.question}
        </h3>
        {interaction.whyItMatters && (
          <div className="mt-2.5 flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Why we're asking: </span>
              {interaction.whyItMatters}
            </div>
          </div>
        )}
      </div>

      {/* Form Choices */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {interaction.options && interaction.options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {interaction.options.map((opt) => {
              const isSelected = !useCustom && selectedOption === opt;
              const isRecommended = interaction.recommendedOption === opt;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt);
                    setUseCustom(false);
                  }}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 pr-4">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>

                  {isRecommended && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md shrink-0">
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Answer Input */}
        {interaction.allowCustom && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setUseCustom(!useCustom)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 mb-2 inline-block"
            >
              {useCustom ? '← Choose from suggested options' : 'Specify custom preference instead'}
            </button>

            {useCustom && (
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Describe your specific requirement or operational decision..."
                rows={2}
                className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 bg-white"
                required
              />
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isLoading || (useCustom && !customText.trim()) || (!useCustom && !selectedOption)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Saving Decision...' : 'Confirm Decision & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
