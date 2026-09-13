'use client';

import React from 'react';
import { AppointmentStatus } from '@hms/types';
import { cn } from '@/lib/utils';
import {
  Clock,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertOctagon,
} from 'lucide-react';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus | string;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
    pulse?: boolean;
  }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: Clock,
  },
  CHECKED_IN: {
    label: 'Checked In',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: UserCheck,
    pulse: true,
  },
  IN_CONSULTATION: {
    label: 'In Consultation',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Stethoscope,
    pulse: true,
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
  NO_SHOW: {
    label: 'No Show',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: AlertOctagon,
  },
};

export function AppointmentStatusBadge({
  status,
  className,
  showIcon = true,
}: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && (
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          {config.pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                status === 'CHECKED_IN' ? 'bg-amber-400' : 'bg-indigo-400'
              )}
            />
          )}
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
}
