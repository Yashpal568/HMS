'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricKpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  sparkline?: boolean;
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

export function MetricKpiCard({
  title,
  value,
  subtext,
  change,
  icon: Icon,
  iconColor = 'text-teal-600',
  iconBg = 'bg-teal-50 border-teal-100',
  sparkline = false,
  sparklineData = [4, 6, 5, 8, 7, 10, 12],
  onClick,
  className,
}: MetricKpiCardProps) {
  // Generate simple SVG path for sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const width = 64;
    const height = 24;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <svg className="h-6 w-16 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="url(#sparkGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
      </svg>
    );
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 transition-all duration-200 shadow-2xs hover:shadow-md hover:border-slate-300',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className,
      )}
    >
      {/* Top row: Icon + Title */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 tracking-tight">{title}</span>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105',
            iconBg,
          )}
        >
          <Icon className={cn('h-4.5 w-4.5', iconColor)} aria-hidden="true" />
        </div>
      </div>

      {/* Main Value */}
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-feature-settings">
          {value}
        </span>

        {sparkline && renderSparkline()}
      </div>

      {/* Footer: Trend or Subtext */}
      <div className="mt-2.5 flex items-center justify-between text-xs">
        {change && (
          <div
            className={cn(
              'inline-flex items-center gap-1 font-semibold text-[11px]',
              change.isPositive !== false ? 'text-emerald-700' : 'text-rose-700',
            )}
          >
            {change.isPositive !== false ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{typeof change.value === 'number' ? `↑ ${change.value}%` : change.value}</span>
            {change.label && <span className="text-slate-400 font-normal">{change.label}</span>}
          </div>
        )}

        {subtext && (
          <span className="text-[11px] font-medium text-slate-400">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
