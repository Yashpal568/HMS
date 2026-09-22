'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Clock,
  Calendar,
  FlaskConical,
  Pill,
  ArrowRight,
  Activity,
  FileText,
  User,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface ScheduleItem {
  id: string;
  time: string;
  patientName: string;
  type: 'Consultation' | 'Follow-up' | 'New Patient';
  status: 'Waiting' | 'In Consultation' | 'Completed';
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctorData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await apiClient.get<ApiResponse<any[]>>(`/appointments?date=${todayStr}`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setSchedule(
          res.data.slice(0, 5).map((a: any) => ({
            id: a.id || a._id,
            time: a.appointmentTime || '09:30 AM',
            patientName: a.patientId?.firstName
              ? `${a.patientId.firstName} ${a.patientId.lastName}`
              : a.patientName || 'Patient',
            type: (a.reason?.toLowerCase().includes('follow') ? 'Follow-up' : 'Consultation') as any,
            status: (a.status === 'COMPLETED'
              ? 'Completed'
              : a.status === 'IN_CONSULTATION'
              ? 'In Consultation'
              : 'Waiting') as any,
          })),
        );
      } else {
        setSchedule([
          { id: '1', time: '09:30 AM', patientName: 'Amit Singh', type: 'Consultation', status: 'Completed' },
          { id: '2', time: '10:00 AM', patientName: 'Priya Mehta', type: 'Follow-up', status: 'In Consultation' },
          { id: '3', time: '10:30 AM', patientName: 'Rajesh Kumar', type: 'New Patient', status: 'Waiting' },
          { id: '4', time: '11:00 AM', patientName: 'Sunita Mehta', type: 'Follow-up', status: 'Waiting' },
          { id: '5', time: '11:30 AM', patientName: 'Vikram Rao', type: 'Consultation', status: 'Waiting' },
        ]);
      }
    } catch {
      setSchedule([
        { id: '1', time: '09:30 AM', patientName: 'Amit Singh', type: 'Consultation', status: 'Completed' },
        { id: '2', time: '10:00 AM', patientName: 'Priya Mehta', type: 'Follow-up', status: 'In Consultation' },
        { id: '3', time: '10:30 AM', patientName: 'Rajesh Kumar', type: 'New Patient', status: 'Waiting' },
        { id: '4', time: '11:00 AM', patientName: 'Sunita Mehta', type: 'Follow-up', status: 'Waiting' },
        { id: '5', time: '11:30 AM', patientName: 'Vikram Rao', type: 'Consultation', status: 'Waiting' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctorData();
  }, [fetchDoctorData]);

  const doctorName =
    user?.firstName && user.firstName !== 'System'
      ? `Dr. ${user.firstName} ${user.lastName || ''}`.trim()
      : 'Dr. Rahul Sharma';
  const dept = user?.department || 'Cardiology • Main Campus';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO GREETING (Matching Image 2 #3) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 shadow-2xs">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {doctorName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {dept} • Consultation Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/emr">
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="h-4 w-4" />
              <span>Full EMR Board</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP STATS (Matching Image 2 #3: Today's Patients 18, Completed 12, Pending 6, Follow-ups 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Today's Patients"
          value={18}
          subtext="Total roster today"
          icon={Calendar}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Completed"
          value={12}
          subtext="Consultations finished"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />

        <MetricKpiCard
          title="Pending Queue"
          value={6}
          subtext="Waiting in OPD"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />

        <MetricKpiCard
          title="Follow-ups"
          value={4}
          subtext="Scheduled reviews"
          icon={User}
          iconColor="text-sky-600"
          iconBg="bg-sky-50 border-sky-100"
        />
      </div>

      {/* 3. CURRENT PATIENT (A-021) & NEXT PATIENT (A-022) CARDS (Exact match to Image 2 #3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Patient Card (2/3 width) */}
        <div className="md:col-span-2 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-slate-50 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-teal-100/80 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Current Patient
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                In Consultation
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white font-mono font-extrabold text-lg shadow-sm">
                  A-021
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Rahul Kumar
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    32 y / Male • <strong className="text-slate-700">Chest Pain</strong> • Follow-up
                  </p>
                  <p className="text-[11px] text-teal-700 font-mono mt-1">
                    MRN: PAT-2026-000104 • Checked in 18m ago
                  </p>
                </div>
              </div>

              <Link href="/emr" className="shrink-0">
                <Button className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer">
                  <Play className="h-4 w-4 fill-white" />
                  <span>Start Consultation</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Next Patient Card (1/3 width) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Next Patient
              </span>
              <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                in 15 min
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-mono font-bold text-sm">
                A-022
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  Priya Mehta
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  28 y / Female
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  Routine Checkup
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
            <Link
              href="/patients"
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM GRID: TODAY'S SCHEDULE (2/3) + PENDING & QUICK ACTIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Today&apos;s Schedule
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Live Queue
              </span>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
            >
              View Full Queue
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Time</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Type</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-mono font-medium text-slate-600 whitespace-nowrap">
                      {item.time}
                    </td>

                    <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                      {item.patientName}
                    </td>

                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                      {item.type}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          item.status === 'Completed' &&
                            'bg-emerald-50 text-emerald-800 border-emerald-200',
                          item.status === 'In Consultation' &&
                            'bg-teal-50 text-teal-800 border-teal-200',
                          item.status === 'Waiting' &&
                            'bg-amber-50 text-amber-800 border-amber-200',
                        )}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <Link href="/emr">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                        >
                          Open EMR
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Pending Actions & Quick Clinical Tools */}
        <div className="space-y-6">
          {/* Pending Tasks Callout */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Pending Clinical Items
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white text-xs font-bold font-mono">
                    3
                  </span>
                  <span className="font-semibold text-purple-950">Lab Results Ready</span>
                </div>
                <Link href="/laboratory" className="text-[11px] font-semibold text-purple-700 hover:underline">
                  Review →
                </Link>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/70 border border-sky-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-600 text-white text-xs font-bold font-mono">
                    2
                  </span>
                  <span className="font-semibold text-sky-950">Pending Follow-ups</span>
                </div>
                <Link href="/appointments" className="text-[11px] font-semibold text-sky-700 hover:underline">
                  Schedule →
                </Link>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-bold font-mono">
                    1
                  </span>
                  <span className="font-semibold text-amber-950">Documentation Task</span>
                </div>
                <Link href="/emr" className="text-[11px] font-semibold text-amber-700 hover:underline">
                  Sign SOAP →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions (Matching Image 2 #3) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/emr">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <FileText className="h-4 w-4 mr-2 text-teal-600" />
                  <span>View Patient Records</span>
                </Button>
              </Link>

              <Link href="/emr">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Pill className="h-4 w-4 mr-2 text-emerald-600" />
                  <span>Create Prescription</span>
                </Button>
              </Link>

              <Link href="/laboratory/orders/new">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <FlaskConical className="h-4 w-4 mr-2 text-purple-600" />
                  <span>Request Lab Test</span>
                </Button>
              </Link>

              <Link href="/emr">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Stethoscope className="h-4 w-4 mr-2 text-sky-600" />
                  <span>Add Clinical Note</span>
                </Button>
              </Link>

              <Link href="/appointments">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
                  <span>Schedule Follow-up</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
