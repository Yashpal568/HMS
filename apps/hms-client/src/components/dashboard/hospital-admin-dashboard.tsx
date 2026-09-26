'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Clock,
  Bed,
  Receipt,
  Eye,
  MoreHorizontal,
  Sun,
  Activity,
  Building2,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { LiveOpdQueueCard, QueueItem } from './shared/live-opd-queue-card';
import { BedOccupancyGauge } from './shared/bed-occupancy-gauge';
import { DepartmentStatusWidget } from './shared/department-status-widget';
import { PendingTasksWidget } from './shared/pending-tasks-widget';
import { RecentActivityWidget } from './shared/recent-activity-widget';
import { QuickActionsMenu } from './shared/quick-actions-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse, DashboardSummary } from '@hms/types';

interface OpdFlowAppointment {
  id: string;
  time: string;
  patientName: string;
  patientInitial: string;
  department: string;
  doctor: string;
  status: 'Completed' | 'In Consultation' | 'Waiting' | 'Scheduled';
}

export function HospitalAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'opd_queue' | 'department_wise'>('appointments');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const [opdFlowAppointments, setOpdFlowAppointments] = useState<OpdFlowAppointment[]>([]);
  const [liveQueue, setLiveQueue] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [dashRes, apptsRes] = await Promise.all([
        apiClient.get<ApiResponse<DashboardSummary>>('/dashboard').catch(() => null),
        apiClient.get<ApiResponse<any[]>>(`/appointments?date=${todayStr}`).catch(() => null),
      ]);

      if (dashRes?.data) {
        setSummary(dashRes.data);
      }

      const rawAppts = apptsRes?.data && Array.isArray(apptsRes.data) ? apptsRes.data : [];
      const mappedAppointments: OpdFlowAppointment[] = rawAppts.slice(0, 10).map((a: any) => {
        const pName = a.patient?.name
          ? `${a.patient.name.first || ''} ${a.patient.name.last || ''}`.trim()
          : a.patientId?.firstName
          ? `${a.patientId.firstName} ${a.patientId.lastName || ''}`.trim()
          : a.patientName || 'Patient';

        let statusText: OpdFlowAppointment['status'] = 'Scheduled';
        if (a.status === 'COMPLETED') statusText = 'Completed';
        else if (a.status === 'IN_CONSULTATION') statusText = 'In Consultation';
        else if (a.status === 'CHECKED_IN') statusText = 'Waiting';

        return {
          id: a.id || a._id,
          time: a.timeSlot || '09:00 AM',
          patientName: pName,
          patientInitial: pName.charAt(0).toUpperCase() || 'P',
          department: a.department || 'General Medicine',
          doctor: a.doctor?.name ? `Dr. ${a.doctor.name}` : 'Attending Clinician',
          status: statusText,
        };
      });

      setOpdFlowAppointments(mappedAppointments);

      const mappedQueue = rawAppts
        .filter((a: any) => a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION')
        .map((a: any) => {
          const pName = a.patient?.name
            ? `${a.patient.name.first || ''} ${a.patient.name.last || ''}`.trim()
            : a.patientId?.firstName
            ? `${a.patientId.firstName} ${a.patientId.lastName || ''}`.trim()
            : a.patientName || 'Patient';

          return {
            token: `#${String(a.tokenNumber || 1).padStart(2, '0')}`,
            patientName: pName,
            doctorName: a.doctor?.name ? `Dr. ${a.doctor.name}` : 'Doctor',
            department: a.department,
            waitTime: a.timeSlot || 'Waiting',
            status: a.status === 'IN_CONSULTATION' ? 'In Consultation' : 'Waiting',
            reason: a.chiefComplaint || 'Consultation',
            patientId: a.patient?.id || a.patient?._id,
          };
        });

      setLiveQueue(mappedQueue);
    } catch {
      // Graceful fallback
      setOpdFlowAppointments([]);
      setLiveQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const firstName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Hospital';
  const hospitalName =
    user?.hospitalId && !/^[0-9a-fA-F]{24}$/.test(user.hospitalId)
      ? user.hospitalId
      : 'Main Campus';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP GREETING BANNER (Exact Match to Image 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/80 shadow-2xs">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {firstName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Here&apos;s what&apos;s happening at {hospitalName} today.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 font-mono">
              {currentTime || 'Mon, 22 Sep 2026 10:24 AM'}
            </span>
          </div>

          <QuickActionsMenu />
        </div>
      </div>

      {/* 2. 6 TOP KPI CARDS (Exact Match to Image 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricKpiCard
          title="Total Patients"
          value={summary?.patients?.totalPatients ?? 0}
          subtext={`${summary?.patients?.activePatients ?? 0} active`}
          icon={Users}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Appointments"
          value={summary?.clinicalOverview?.todayAppointments?.count ?? 0}
          subtext={summary?.clinicalOverview?.todayAppointments?.note || 'Active today'}
          icon={Calendar}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 border-purple-100"
        />

        <MetricKpiCard
          title="OPD Queue"
          value={summary?.clinicalOverview?.todayAppointments?.count ?? 0}
          subtext={`${summary?.clinicalOverview?.todayAppointments?.count ?? 0} registered`}
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 border-blue-100"
        />

        <MetricKpiCard
          title="Admissions"
          value={summary?.clinicalOverview?.activeAdmissions?.count ?? 0}
          subtext={summary?.clinicalOverview?.activeAdmissions?.note || 'Active admitted'}
          icon={Bed}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50 border-indigo-100"
        />

        <MetricKpiCard
          title="Available Beds"
          value={`${summary?.clinicalOverview?.beds?.available ?? 0} / ${summary?.clinicalOverview?.beds?.total ?? 0}`}
          subtext={`${summary?.clinicalOverview?.beds?.total ? Math.round(((summary.clinicalOverview.beds.occupied || 0) / summary.clinicalOverview.beds.total) * 100) : 0}% Occupancy`}
          icon={Bed}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />

        <MetricKpiCard
          title="Pending Bills"
          value={summary?.clinicalOverview?.pendingInvoices?.count ?? 0}
          subtext={summary?.clinicalOverview?.pendingInvoices?.note || 'Pending settlement'}
          icon={Receipt}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />
      </div>

      {/* 3. MIDDLE SECTION: OPD FLOW (2/3) + LIVE OPD QUEUE (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's OPD Flow (Tabs + Table) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Today&apos;s OPD Flow
                </h3>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('appointments')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                      activeTab === 'appointments'
                        ? 'bg-white text-teal-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    Appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('opd_queue')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                      activeTab === 'opd_queue'
                        ? 'bg-white text-teal-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    OPD Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('department_wise')}
                    className={cn(
                      'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                      activeTab === 'department_wise'
                        ? 'bg-white text-teal-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    Department Wise
                  </button>
                </div>

                <Link
                  href="/appointments"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
                >
                  View All
                </Link>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-2 font-medium">Time</th>
                    <th className="py-3 px-2 font-medium">Patient</th>
                    <th className="py-3 px-2 font-medium">Department</th>
                    <th className="py-3 px-2 font-medium">Doctor</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opdFlowAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        No outpatient consultations scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    opdFlowAppointments.map((row) => (
                      <tr
                        key={row.id}
                        className="group hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-2 font-mono font-medium text-slate-600 whitespace-nowrap">
                          {row.time}
                        </td>

                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-teal-800 font-bold text-xs ring-1 ring-slate-200">
                              {row.patientInitial}
                            </div>
                            <span className="font-semibold text-slate-900 whitespace-nowrap">
                              {row.patientName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                          {row.department}
                        </td>

                        <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap">
                          {row.doctor}
                        </td>

                        <td className="py-3 px-2 whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              row.status === 'Completed' &&
                                'bg-emerald-50 text-emerald-800 border-emerald-200/60',
                              row.status === 'In Consultation' &&
                                'bg-teal-50 text-teal-800 border-teal-200/60',
                              row.status === 'Waiting' &&
                                'bg-amber-50 text-amber-800 border-amber-200/60',
                              row.status === 'Scheduled' &&
                                'bg-slate-100 text-slate-700 border-slate-200/60',
                            )}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link href="/appointments">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                <span>View</span>
                              </Button>
                            </Link>
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live OPD Queue */}
        <div className="lg:col-span-1">
          <LiveOpdQueueCard queue={liveQueue} />
        </div>
      </div>

      {/* 4. BOTTOM GRID (4 Columns): Department Status, Bed Occupancy, Pending Tasks, Recent Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DepartmentStatusWidget />
        <BedOccupancyGauge />
        <PendingTasksWidget />
        <RecentActivityWidget />
      </div>

      {/* 5. BOTTOM BRAND BANNER (Exact Match to Image 3) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-teal-50/80 via-white to-slate-50 p-5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">
              Delivering Better Healthcare, Together
            </h4>
            <p className="text-[11px] text-slate-500">
              Efficient operations. Happier patients. Healthier communities.
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-400 italic">
          &ldquo;Quality healthcare is a team effort.&rdquo; — <span className="font-semibold text-slate-700 not-italic">MedCore</span>
        </div>
      </div>
    </div>
  );
}
