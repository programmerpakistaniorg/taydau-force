import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  footer
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 shadow-subtle ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
};
