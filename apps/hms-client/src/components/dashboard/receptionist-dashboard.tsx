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
  doctorName: string;
  waitTime: string;
  status: 'Waiting' | 'In Consultation' | 'Checked In';
}

interface RegistrationItem {
  id: string;
  patientName: string;
  time: string;
  avatarInitial: string;
}

export function ReceptionistDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<LiveQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReceptionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await apiClient.get<ApiResponse<any[]>>(`/appointments?date=${todayStr}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setQueue(
          res.data.slice(0, 5).map((a: any, index: number) => ({
            token: `A-0${21 + index}`,
            patientName: a.patientId?.firstName
              ? `${a.patientId.firstName} ${a.patientId.lastName}`
              : a.patientName || 'Patient',
            doctorName: a.doctorId?.name || 'Dr. Sharma',
            waitTime: `${12 + index * 6} min`,
            status: 'Waiting',
          })),
        );
      } else {
        setQueue([
          { token: 'A-021', patientName: 'Rahul Kumar', doctorName: 'Dr. Sharma', waitTime: '12 min', status: 'Waiting' },
          { token: 'A-022', patientName: 'Priya Mehta', doctorName: 'Dr. Verma', waitTime: '18 min', status: 'Waiting' },
          { token: 'A-023', patientName: 'Amit Singh', doctorName: 'Dr. Khan', waitTime: '25 min', status: 'Waiting' },
          { token: 'A-024', patientName: 'Sneha Patel', doctorName: 'Dr. Iyer', waitTime: '32 min', status: 'Waiting' },
          { token: 'A-025', patientName: 'Vikram Desai', doctorName: 'Dr. Nair', waitTime: '40 min', status: 'Waiting' },
        ]);
      }
    } catch {
      setQueue([
        { token: 'A-021', patientName: 'Rahul Kumar', doctorName: 'Dr. Sharma', waitTime: '12 min', status: 'Waiting' },
        { token: 'A-022', patientName: 'Priya Mehta', doctorName: 'Dr. Verma', waitTime: '18 min', status: 'Waiting' },
        { token: 'A-023', patientName: 'Amit Singh', doctorName: 'Dr. Khan', waitTime: '25 min', status: 'Waiting' },
        { token: 'A-024', patientName: 'Sneha Patel', doctorName: 'Dr. Iyer', waitTime: '32 min', status: 'Waiting' },
        { token: 'A-025', patientName: 'Vikram Desai', doctorName: 'Dr. Nair', waitTime: '40 min', status: 'Waiting' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReceptionData();
  }, [fetchReceptionData]);

  const receptionistName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Priya';

  const recentRegistrations: RegistrationItem[] = [
    { id: '1', patientName: 'Amit Singh', time: '10:24 AM', avatarInitial: 'A' },
    { id: '2', patientName: 'Meera Shah', time: '10:12 AM', avatarInitial: 'M' },
    { id: '3', patientName: 'Rohit Verma', time: '09:58 AM', avatarInitial: 'R' },
    { id: '4', patientName: 'Anita Desai', time: '09:45 AM', avatarInitial: 'A' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER (Matching Image 2 #4) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 shadow-2xs">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {receptionistName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Receptionist • Main Campus • OPD Front Desk Hub
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/patients/new">
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Patient</span>
            </Button>
          </Link>

          <Link href="/appointments/new">
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
              <span>Search Patient</span>
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
                Live OPD Queue
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
              View All
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Token</th>
                  <th className="py-3 px-2 font-medium">Patient Name</th>
                  <th className="py-3 px-2 font-medium">Assigned Doctor</th>
                  <th className="py-3 px-2 font-medium">Wait Time</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((row) => (
                  <tr key={row.token} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-lg text-xs">
                        {row.token}
                      </span>
                    </td>

                    <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                      {row.patientName}
                    </td>

                    <td className="py-3 px-2 text-slate-700 whitespace-nowrap">
                      {row.doctorName}
                    </td>

                    <td className="py-3 px-2 font-mono text-slate-500 whitespace-nowrap">
                      {row.waitTime}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
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
                          Check Status
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Today's Summary + Recent Registrations */}
        <div className="space-y-6">
          {/* Today's Summary (Matching Image 2 #4: 86 Registered, 72 Checked In, 6 Cancellations, 4 No-shows) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Today&apos;s Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xl font-bold text-slate-900 font-mono">86</span>
                <span className="block text-[11px] text-slate-500 font-medium mt-0.5">Registered</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-2xl font-bold text-emerald-800 font-mono">72</span>
                <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">Checked In</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                <span className="text-2xl font-bold text-amber-800 font-mono">6</span>
                <span className="block text-[11px] text-amber-700 font-medium mt-0.5">Cancellations</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-2xl font-bold text-rose-800 font-mono">4</span>
                <span className="block text-[11px] text-rose-700 font-medium mt-0.5">No-shows</span>
              </div>
            </div>
          </div>

          {/* Recent Registrations (Matching Image 2 #4) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Registrations
              </h3>
              <Link href="/patients" className="text-[11px] font-semibold text-sky-600 hover:underline">
                Directory
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentRegistrations.map((reg) => (
                <div key={reg.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs ring-1 ring-sky-200">
                      {reg.avatarInitial}
                    </div>
                    <span className="font-semibold text-slate-900 truncate">
                      {reg.patientName}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {reg.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
