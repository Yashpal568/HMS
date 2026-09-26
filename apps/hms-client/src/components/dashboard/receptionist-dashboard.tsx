'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  UserPlus,
  CheckCircle2,
  Search,
  ArrowRight,
  UserCheck,
  CalendarPlus,
  XCircle,
  AlertCircle,
  Hash,
  Stethoscope,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface LiveQueueRow {
  token: string;
  patientName: string;
  uhid?: string;
  doctorName: string;
  slot: string;
  status: string;
  appointmentId: string;
}

interface RegistrationItem {
  id: string;
  patientName: string;
  uhid: string;
  time: string;
  avatarInitial: string;
}

export function ReceptionistDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<LiveQueueRow[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<RegistrationItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    checkedIn: 0,
    cancelled: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchReceptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch appointments and recent patients in parallel
      const [apptsRes, patientsRes] = await Promise.all([
        apiClient.get<ApiResponse<any[]>>(`/appointments?date=${todayStr}`).catch(() => ({ data: [] } as any)),
        apiClient.get<ApiResponse<any[]>>('/patients?limit=5').catch(() => ({ data: [] } as any)),
      ]);

      const appts = apptsRes?.data && Array.isArray(apptsRes.data) ? apptsRes.data : [];

      // Calculate real summary
      const total = appts.length;
      const checkedIn = appts.filter(
        (a: any) =>
          a.status === 'CHECKED_IN' ||
          a.status === 'IN_CONSULTATION' ||
          a.status === 'COMPLETED',
      ).length;
      const cancelled = appts.filter((a: any) => a.status === 'CANCELLED').length;
      const completed = appts.filter((a: any) => a.status === 'COMPLETED').length;

      setSummary({ total, checkedIn, cancelled, completed });

      // Live OPD Queue: Filter only active or checked-in appointments
      const liveQueueItems: LiveQueueRow[] = appts.map((a: any) => {
        const pName = a.patient?.name
          ? `${a.patient.name.first || ''} ${a.patient.name.last || ''}`.trim()
          : a.patientId?.firstName
          ? `${a.patientId.firstName} ${a.patientId.lastName || ''}`.trim()
          : a.patientName || 'Patient';

        const dName = a.doctor?.name
          ? `Dr. ${a.doctor.name}`
          : a.doctorId?.firstName
          ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName || ''}`.trim()
          : 'Attending Clinician';

        let statusText = 'Scheduled';
        if (a.status === 'CHECKED_IN') statusText = 'Waiting';
        else if (a.status === 'IN_CONSULTATION') statusText = 'In Consultation';
        else if (a.status === 'COMPLETED') statusText = 'Completed';
        else if (a.status === 'CANCELLED') statusText = 'Cancelled';

        return {
          token: `#${String(a.tokenNumber || 1).padStart(2, '0')}`,
          patientName: pName,
          uhid: a.patient?.uhid || a.patientId?.uhid,
          doctorName: dName,
          slot: a.timeSlot || '09:00 AM',
          status: statusText,
          appointmentId: a.id || a._id,
        };
      });

      setQueue(liveQueueItems);

      // Real recent patient registrations
      const rawPatients = patientsRes?.data && Array.isArray(patientsRes.data) ? patientsRes.data : [];
      const regItems: RegistrationItem[] = rawPatients.slice(0, 5).map((p: any) => {
        const fullName = p.name
          ? `${p.name.first || ''} ${p.name.last || ''}`.trim()
          : p.firstName
          ? `${p.firstName} ${p.lastName || ''}`.trim()
          : 'New Patient';
        const initial = fullName.charAt(0).toUpperCase() || 'P';
        const dateStr = p.createdAt
          ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Recent';

        return {
          id: p.id || p._id,
          patientName: fullName,
          uhid: p.uhid || 'UHID',
          time: dateStr,
          avatarInitial: initial,
        };
      });

      setRecentRegistrations(regItems);
    } catch {
      setQueue([]);
      setRecentRegistrations([]);
      setSummary({ total: 0, checkedIn: 0, cancelled: 0, completed: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceptionData();
  }, [fetchReceptionData]);

  const receptionistName =
    user?.firstName && user.firstName !== 'System' ? user.firstName : 'Front Desk';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shadow-2xs">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good day, {receptionistName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Front Desk &bull; OPD Registration & Queue Intake Hub
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/patients/register">
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Patient</span>
            </Button>
          </Link>

          <Link href="/appointments/book">
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Book Appointment</span>
            </Button>
          </Link>

          <Link href="/appointments">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-slate-800 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Check In</span>
            </Button>
          </Link>

          <Link href="/patients">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-slate-800 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="h-4 w-4 text-slate-500" />
              <span>Search Directory</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID: LIVE OPD QUEUE (2/3) + SUMMARY & RECENT REGISTRATIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live OPD Queue Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Live OPD Queue Intake
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
            >
              Manage Live Queue ({queue.length})
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Token</th>
                  <th className="py-3 px-2 font-medium">Patient Name</th>
                  <th className="py-3 px-2 font-medium">Assigned Clinician</th>
                  <th className="py-3 px-2 font-medium">Slot</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No patients in queue today. Register a new patient or book a walk-in appointment above.
                    </td>
                  </tr>
                ) : (
                  queue.map((row) => (
                    <tr key={row.appointmentId} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-lg text-xs">
                          {row.token}
                        </span>
                      </td>

                      <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                        {row.patientName}
                        {row.uhid && (
                          <span className="text-[10px] font-mono text-slate-400 block font-normal">
                            {row.uhid}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-slate-700 whitespace-nowrap">
                        {row.doctorName}
                      </td>

                      <td className="py-3 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {row.slot}
                      </td>

                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            row.status === 'Waiting' &&
                              'bg-amber-50 text-amber-800 border-amber-200/60',
                            row.status === 'In Consultation' &&
                              'bg-teal-50 text-teal-800 border-teal-200/60',
                            row.status === 'Completed' &&
                              'bg-emerald-50 text-emerald-800 border-emerald-200/60',
                            row.status === 'Scheduled' &&
                              'bg-slate-50 text-slate-600 border-slate-200/60',
                            row.status === 'Cancelled' &&
                              'bg-rose-50 text-rose-700 border-rose-200/60',
                          )}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        <Link href="/appointments">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-lg cursor-pointer"
                          >
                            Queue Board
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Today's Summary + Recent Registrations */}
        <div className="space-y-6">
          {/* Today's Summary (Real Data) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Today&apos;s Intake Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xl font-bold text-slate-900 font-mono">{summary.total}</span>
                <span className="block text-[11px] text-slate-500 font-medium mt-0.5">Roster Today</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-2xl font-bold text-emerald-800 font-mono">{summary.checkedIn}</span>
                <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">Checked In</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="text-2xl font-bold text-amber-800 font-mono">{summary.completed}</span>
                <span className="block text-[11px] text-amber-700 font-medium mt-0.5">Completed</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-2xl font-bold text-rose-800 font-mono">{summary.cancelled}</span>
                <span className="block text-[11px] text-rose-700 font-medium mt-0.5">Cancelled</span>
              </div>
            </div>
          </div>

          {/* Recent Registrations (Real Data) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Patient Registrations
              </h3>
              <Link href="/patients" className="text-[11px] font-semibold text-sky-600 hover:underline">
                Directory &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentRegistrations.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  No recent registrations found.
                </p>
              ) : (
                recentRegistrations.map((reg) => (
                  <div key={reg.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs ring-1 ring-sky-200">
                        {reg.avatarInitial}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {reg.patientName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {reg.uhid}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {reg.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
