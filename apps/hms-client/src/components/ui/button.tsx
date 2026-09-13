'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'teal';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default:
        'bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.98]',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.98]',
      outline:
        'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs active:scale-[0.98]',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200/80 active:scale-[0.98]',
      ghost:
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      link:
        'text-teal-600 underline-offset-4 hover:underline p-0 h-auto',
      teal:
        'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20 active:scale-[0.98]',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 px-3 text-[11px]',
      lg: 'h-10 px-6 text-sm',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
