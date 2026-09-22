'use client';

import React from 'react';
import Link from 'next/link';
import { BedDouble, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BedOccupancyGaugeProps {
  total?: number;
  occupied?: number;
  available?: number;
  maintenance?: number;
  viewDetailsHref?: string;
  className?: string;
}

export function BedOccupancyGauge({
  total = 60,
  occupied = 48,
  available = 12,
  maintenance = 0,
  viewDetailsHref = '/ipd',
  className,
}: BedOccupancyGaugeProps) {
  const percentage = total > 0 ? Math.round((occupied / total) * 100) : 0;
  
  // SVG circular arc calculations
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <BedDouble className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Bed Occupancy
          </h3>
        </div>
        <Link
          href={viewDetailsHref}
          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
        >
          View Details
        </Link>
      </div>

      {/* Center gauge + Legend */}
      <div className="my-auto py-2 flex items-center justify-between gap-4">
        {/* SVG Circular Donut */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
              {percentage}%
            </span>
            <span className="text-[10px] font-medium text-slate-400 mt-0.5">
              {occupied}/{total}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Available</span>
            </span>
            <span className="font-bold text-slate-900 font-mono">{available}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
              <span>Occupied</span>
            </span>
            <span className="font-bold text-slate-900 font-mono">{occupied}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <span>Maintenance</span>
            </span>
            <span className="font-bold text-slate-900 font-mono">{maintenance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
