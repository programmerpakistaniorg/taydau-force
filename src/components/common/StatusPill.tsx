import React from 'react';

interface StatusPillProps {
  status: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const getStyle = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes('verified') || lower.includes('pass') || lower.includes('complete') || lower.includes('ready') || lower.includes('available')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (lower.includes('working') || lower.includes('progress') || lower.includes('active') || lower.includes('testing') || lower.includes('review')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (lower.includes('warning') || lower.includes('rework') || lower.includes('waiting') || lower.includes('fix in progress') || lower.includes('open')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (lower.includes('fail') || lower.includes('reject') || lower.includes('block') || lower.includes('finding') || lower.includes('defect') || lower.includes('critical') || lower.includes('high')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
};
