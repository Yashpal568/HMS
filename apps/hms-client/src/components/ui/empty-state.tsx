import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  badge,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      {badge && (
        <span className="inline-flex items-center px-2 py-0.5 mb-2 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {badge}
        </span>
      )}

      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
