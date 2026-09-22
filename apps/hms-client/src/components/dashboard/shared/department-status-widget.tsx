'use client';

import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DepartmentLoad {
  name: string;
  patients: number;
  status: 'On Track' | 'Busy' | 'Surge';
}

export interface DepartmentStatusWidgetProps {
  departments?: DepartmentLoad[];
  viewAllHref?: string;
  className?: string;
}

export function DepartmentStatusWidget({
  departments = [
    { name: 'General Medicine', patients: 18, status: 'On Track' },
    { name: 'Cardiology', patients: 24, status: 'Busy' },
    { name: 'Orthopedics', patients: 12, status: 'On Track' },
    { name: 'Pediatrics', patients: 15, status: 'Busy' },
    { name: 'Dermatology', patients: 9, status: 'On Track' },
  ],
  viewAllHref = '/appointments',
  className,
}: DepartmentStatusWidgetProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Department Status
          </h3>
        </div>
        <Link
          href={viewAllHref}
          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
        >
          View All
        </Link>
      </div>

      {/* Rows */}
      <div className="mt-2 divide-y divide-slate-100">
        {departments.map((dept) => (
          <div key={dept.name} className="flex items-center justify-between py-2 text-xs">
            <span className="font-medium text-slate-800 truncate pr-2">
              {dept.name}
            </span>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-semibold text-slate-600 font-mono text-[11px]">
                {dept.patients} patients
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                  dept.status === 'On Track'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                    : dept.status === 'Busy'
                    ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                    : 'bg-rose-50 text-rose-800 border-rose-200/60',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    dept.status === 'On Track'
                      ? 'bg-emerald-500'
                      : dept.status === 'Busy'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500 animate-pulse',
                  )}
                />
                <span>{dept.status}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
