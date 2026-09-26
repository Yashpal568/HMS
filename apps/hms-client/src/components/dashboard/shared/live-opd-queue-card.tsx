'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, User, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QueueItem {
  token: string;
  patientName: string;
  doctorName: string;
  department?: string;
  waitTime: string;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'Delayed';
  reason?: string;
  patientId?: string;
  elapsedTime?: string;
}

export interface LiveOpdQueueCardProps {
  queue?: QueueItem[];
  currentlyServing?: QueueItem;
  viewAllHref?: string;
  onSelectPatient?: (patientId: string) => void;
  className?: string;
}

export function LiveOpdQueueCard({
  queue = [],
  currentlyServing = undefined,
  viewAllHref = '/appointments',
  onSelectPatient,
  className,
}: LiveOpdQueueCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-slate-900">Live OPD Queue</h3>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <Link
          href={viewAllHref}
          className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
        >
          View All
        </Link>
      </div>

      {/* Queue Items List */}
      <div className="mt-3 divide-y divide-slate-100 overflow-hidden">
        {queue.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No patients currently in the OPD waiting queue.
          </div>
        ) : (
          queue.map((item) => (
            <div
              key={item.token}
              className="group flex items-center justify-between py-2.5 px-1 hover:bg-slate-50/80 rounded-xl transition-colors text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-bold text-teal-700 bg-teal-50/80 border border-teal-200/60 px-2 py-0.5 rounded-lg shrink-0 text-[11px]">
                  {item.token}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate group-hover:text-teal-900 transition-colors">
                    {item.patientName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {item.doctorName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] font-mono text-slate-400">
                  {item.waitTime}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    item.status === 'Waiting'
                      ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
                  )}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Currently Serving Callout Box (Exact match to Image 3) */}
      {currentlyServing && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Currently Serving
            </span>
            {currentlyServing.elapsedTime && (
              <span className="text-[11px] font-mono font-semibold text-slate-600 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                {currentlyServing.elapsedTime}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-teal-50/90 via-slate-50/70 to-emerald-50/60 border border-teal-200/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-mono font-bold text-sm shadow-sm">
                {currentlyServing.token}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentlyServing.patientName}
                </p>
                <p className="text-[11px] text-teal-800 font-medium truncate">
                  {currentlyServing.doctorName} {currentlyServing.department ? `• ${currentlyServing.department}` : ''}
                </p>
                {currentlyServing.reason && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {currentlyServing.reason}
                  </p>
                )}
              </div>
            </div>

            <Link href={`/emr?patientId=${currentlyServing.patientId || ''}`}>
              <Button
                size="sm"
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>View Patient</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
