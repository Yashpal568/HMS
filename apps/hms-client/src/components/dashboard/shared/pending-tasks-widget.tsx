'use client';

import React from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Receipt,
  AlertTriangle,
  UserCheck,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskItem {
  id: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href: string;
}

export interface PendingTasksWidgetProps {
  tasks?: TaskItem[];
  totalCount?: number;
  viewAllHref?: string;
  className?: string;
}

export function PendingTasksWidget({
  tasks = [
    {
      id: 'lab',
      label: 'Lab Reports to Review',
      count: 3,
      icon: FlaskConical,
      iconBg: 'bg-rose-50 border-rose-100',
      iconColor: 'text-rose-600',
      href: '/laboratory',
    },
    {
      id: 'billing',
      label: 'Bills Awaiting Payment',
      count: 8,
      icon: Receipt,
      iconBg: 'bg-amber-50 border-amber-100',
      iconColor: 'text-amber-600',
      href: '/billing',
    },
    {
      id: 'stock',
      label: 'Low Stock Alerts',
      count: 4,
      icon: AlertTriangle,
      iconBg: 'bg-orange-50 border-orange-100',
      iconColor: 'text-orange-600',
      href: '/inventory',
    },
    {
      id: 'discharge',
      label: 'Discharge Approvals',
      count: 2,
      icon: CheckCircle2,
      iconBg: 'bg-sky-50 border-sky-100',
      iconColor: 'text-sky-600',
      href: '/ipd',
    },
    {
      id: 'leave',
      label: 'Staff Leave Requests',
      count: 1,
      icon: CalendarCheck,
      iconBg: 'bg-purple-50 border-purple-100',
      iconColor: 'text-purple-600',
      href: '/audit',
    },
  ],
  totalCount = 6,
  viewAllHref = '/appointments',
  className,
}: PendingTasksWidgetProps) {
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <UserCheck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Pending Tasks
          </h3>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            {totalCount}
          </span>
        </div>
        <Link
          href={viewAllHref}
          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
        >
          View All
        </Link>
      </div>

      {/* Task List */}
      <div className="mt-2 divide-y divide-slate-100">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <Link
              key={task.id}
              href={task.href}
              className="group flex items-center justify-between py-2 text-xs hover:bg-slate-50/80 -mx-1 px-1 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border',
                    task.iconBg,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', task.iconColor)} />
                </div>
                <span className="text-slate-700 font-medium truncate group-hover:text-slate-900 transition-colors">
                  {task.label}
                </span>
              </div>

              <span className="font-bold text-slate-900 font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-teal-50 group-hover:text-teal-800 transition-colors">
                {task.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
