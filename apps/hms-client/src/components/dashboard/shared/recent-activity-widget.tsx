'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserPlus,
  CalendarCheck,
  FileCheck2,
  Receipt,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export interface RecentActivityWidgetProps {
  activities?: ActivityItem[];
  viewAllHref?: string;
  className?: string;
}

export function RecentActivityWidget({
  activities = [
    {
      id: 'act-1',
      title: 'New patient registered',
      subtitle: 'Amit Singh',
      time: '2 min ago',
      icon: UserPlus,
      iconBg: 'bg-emerald-50 border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'act-2',
      title: 'Appointment completed',
      subtitle: 'Priya Mehta',
      time: '12 min ago',
      icon: CalendarCheck,
      iconBg: 'bg-sky-50 border-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      id: 'act-3',
      title: 'Lab report uploaded',
      subtitle: 'Rajesh Kumar',
      time: '28 min ago',
      icon: FileCheck2,
      iconBg: 'bg-purple-50 border-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'act-4',
      title: 'Payment received',
      subtitle: 'Invoice #INV-0021',
      time: '45 min ago',
      icon: Receipt,
      iconBg: 'bg-teal-50 border-teal-100',
      iconColor: 'text-teal-600',
    },
  ],
  viewAllHref = '/audit',
  className,
}: RecentActivityWidgetProps) {
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
            <Activity className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recent Activity
          </h3>
        </div>
        <Link
          href={viewAllHref}
          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
        >
          View All
        </Link>
      </div>

      {/* Activity Timeline List */}
      <div className="mt-2 divide-y divide-slate-100">
        {activities.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              className="flex items-center justify-between py-2 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border',
                    act.iconBg,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', act.iconColor)} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate leading-tight">
                    {act.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {act.subtitle}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                {act.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
