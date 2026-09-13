'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'teal';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 select-none';

  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'border-transparent bg-slate-900 text-white shadow-xs',
    secondary: 'border-transparent bg-slate-100 text-slate-800',
    destructive: 'border-red-200 bg-red-50 text-red-700',
    outline: 'border border-slate-200 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    teal: 'border-teal-200 bg-teal-50 text-teal-800',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}
