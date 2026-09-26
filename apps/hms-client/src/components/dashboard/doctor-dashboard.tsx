'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  uhid?: string;
  tokenNumber?: number;
  type: string;
  status: 'Waiting' | 'In Consultation' | 'Completed' | 'Scheduled';
  appointmentId: string;
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);

  // Real KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    followUps: 0,
  });

  // Current active patient and next waiting patient
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [nextPatient, setNextPatient] = useState<any>(null);

  const fetchDoctorData = useCallback(async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await apiClient.get<ApiResponse<any[]>>(`/appointments?date=${todayStr}`);
      const appts = res?.data && Array.isArray(res.data) ? res.data : [];

      // Calculate real stats
      const total = appts.length;
      const completed = appts.filter((a: any) => a.status === 'COMPLETED').length;
      const pending = appts.filter(
        (a: any) => a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION',
      ).length;
      const followUps = appts.filter(
        (a: any) => a.type === 'FOLLOW_UP' || a.reason?.toLowerCase().includes('follow'),
      ).length;

      setKpis({ total, completed, pending, followUps });

      // Find current active patient in consultation
      const inConsult = appts.find((a: any) => a.status === 'IN_CONSULTATION');
      setCurrentPatient(inConsult || null);

      // Find next waiting patient
      const nextWait = appts.find((a: any) => a.status === 'CHECKED_IN');
      setNextPatient(nextWait || null);

      // Schedule items
      const scheduleItems: ScheduleItem[] = appts.slice(0, 10).map((a: any) => {
        const pName = a.patient?.name
          ? `${a.patient.name.first || ''} ${a.patient.name.last || ''}`.trim()
          : a.patientId?.firstName
          ? `${a.patientId.firstName} ${a.patientId.lastName || ''}`.trim()
          : a.patientName || 'Patient';

        let statusText: ScheduleItem['status'] = 'Scheduled';
        if (a.status === 'COMPLETED') statusText = 'Completed';
        else if (a.status === 'IN_CONSULTATION') statusText = 'In Consultation';
        else if (a.status === 'CHECKED_IN') statusText = 'Waiting';

        return {
          id: a.id || a._id,
          appointmentId: a.id || a._id,
          time: a.timeSlot || a.appointmentTime || '09:00 AM',
          patientName: pName,
          uhid: a.patient?.uhid || a.patientId?.uhid,
          tokenNumber: a.tokenNumber,
          type: a.type || 'Consultation',
          status: statusText,
        };
      });

      setSchedule(scheduleItems);
    } catch {
      setSchedule([]);
      setKpis({ total: 0, completed: 0, pending: 0, followUps: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctorData();
  }, [fetchDoctorData]);

  // Handle Call Next Patient action
  const handleCallNext = async () => {
    try {
      setCallingNext(true);
      const res = await apiClient.post<{ success: boolean; data: any; message: string }>(
        '/queue/call-next',
        {},
      );
      if (res.success && res.data) {
        const nextApptId = res.data.appointmentId?._id || res.data.appointmentId;
        if (nextApptId) {
          router.push(`/emr/consultation/${nextApptId}`);
        } else {
          void fetchDoctorData();
        }
      } else {
        alert('All patients in the OPD queue have been called or completed.');
      }
    } catch (err: any) {
      console.error('Call next error:', err);
      alert(err.message || 'Failed to call next patient');
    } finally {
      setCallingNext(false);
    }
  };

  const doctorName =
    user?.firstName && user.firstName !== 'System'
      ? `Dr. ${user.firstName} ${user.lastName || ''}`.trim()
      : 'Dr. Physician';
  const dept = user?.department || 'Outpatient Department';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO GREETING */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 shadow-2xs">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good day, {doctorName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {dept} &bull; Live OPD Cockpit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleCallNext}
            disabled={callingNext}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>{callingNext ? 'Calling Next...' : 'Call Next Patient'}</span>
          </Button>

          <Link href="/emr">
            <Button
              size="sm"
              variant="outline"
              className="text-slate-700 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="h-4 w-4 text-teal-600" />
              <span>Full EMR Board</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. REAL TOP STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Today's Patients"
          value={kpis.total}
          subtext="Total roster today"
          icon={Calendar}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Completed"
          value={kpis.completed}
          subtext="Consultations finished"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />

        <MetricKpiCard
          title="Pending Queue"
          value={kpis.pending}
          subtext="Waiting / in consultation"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />

        <MetricKpiCard
          title="Follow-ups"
          value={kpis.followUps}
          subtext="Review appointments"
          icon={User}
          iconColor="text-sky-600"
          iconBg="bg-sky-50 border-sky-100"
        />
      </div>

      {/* 3. CURRENT PATIENT & NEXT PATIENT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Patient Card (2/3 width) */}
        <div className="md:col-span-2 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-slate-50 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-teal-100/80 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Current Patient
              </span>
              {currentPatient ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  In Consultation
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">
                  Room Ready
                </span>
              )}
            </div>

            {currentPatient ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white font-mono font-extrabold text-lg shadow-sm">
                    #{currentPatient.tokenNumber}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                      {currentPatient.patient?.name
                        ? `${currentPatient.patient.name.first} ${currentPatient.patient.name.last}`.trim()
                        : (currentPatient.patient as any)?.firstName
                        ? `${(currentPatient.patient as any).firstName} ${(currentPatient.patient as any).lastName || ''}`.trim()
                        : 'Patient in Room'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentPatient.chiefComplaint ? (
                        <>Chief Complaint: <strong className="text-slate-700">&ldquo;{currentPatient.chiefComplaint}&rdquo;</strong></>
                      ) : (
                        'General Outpatient Consultation'
                      )}
                    </p>
                    <p className="text-[11px] text-teal-700 font-mono mt-1">
                      UHID: {currentPatient.patient?.uhid || 'Assigned'} &bull; Slot: {currentPatient.timeSlot}
                    </p>
                  </div>
                </div>

                <Link href={`/emr/consultation/${currentPatient.id || currentPatient._id}`} className="shrink-0">
                  <Button className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer">
                    <Play className="h-4 w-4 fill-white" />
                    <span>Resume Consultation</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <User className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700">No Patient Currently in Consultation</h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                  Click below to call the next waiting patient from the live OPD queue into your consultation room.
                </p>
                <Button
                  onClick={handleCallNext}
                  disabled={callingNext}
                  size="sm"
                  className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Call Next Patient</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Next Patient Card (1/3 width) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Next Waiting Patient
              </span>
              {nextPatient ? (
                <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                  Checked In
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Empty</span>
              )}
            </div>

            {nextPatient ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-mono font-bold text-sm">
                    #{nextPatient.tokenNumber}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {nextPatient.patient?.name
                        ? `${nextPatient.patient.name.first} ${nextPatient.patient.name.last}`.trim()
                        : (nextPatient.patient as any)?.firstName
                        ? `${(nextPatient.patient as any).firstName} ${(nextPatient.patient as any).lastName || ''}`.trim()
                        : 'Next Patient'}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      Slot: {nextPatient.timeSlot}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {nextPatient.chiefComplaint || 'Routine Consultation'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={handleCallNext}
                    disabled={callingNext}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Call to Room</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-400">No patients waiting in queue</p>
                <p className="text-[11px] text-slate-400 mt-1">Checked-in arrivals will appear here</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
            <Link
              href="/emr"
              className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>View Full Queue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S SCHEDULE (REAL DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Today&apos;s OPD Roster & Queue
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Live Roster ({schedule.length})
              </span>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
            >
              Manage Schedule
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Token / Time</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Type</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No outpatient appointments scheduled for today. Book an appointment or walk-in arrival.
                    </td>
                  </tr>
                ) : (
                  schedule.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">
                          #{item.tokenNumber || '—'}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-mono text-[11px]">
                          ({item.time})
                        </span>
                      </td>

                      <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                        {item.patientName}
                        {item.uhid && (
                          <span className="text-[10px] font-mono text-slate-400 block font-normal">
                            {item.uhid}
                          </span>
                        )}
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
                            item.status === 'Scheduled' &&
                              'bg-slate-50 text-slate-600 border-slate-200',
                          )}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {item.status === 'In Consultation' ? (
                          <Link href={`/emr/consultation/${item.appointmentId}`}>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg cursor-pointer"
                            >
                              Resume
                            </Button>
                          </Link>
                        ) : item.status === 'Waiting' ? (
                          <Link href={`/emr/consultation/${item.appointmentId}`}>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                            >
                              Consult
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/emr/consultation/${item.appointmentId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                            >
                              View
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quick Clinical Navigation */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              OPD Cockpit Quick Links
            </h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/appointments/book"
                className="flex items-center justify-between p-3 rounded-xl bg-teal-50/70 border border-teal-100 hover:bg-teal-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold text-teal-950">Book Walk-in Patient</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-teal-700" />
              </Link>

              <Link
                href="/emr"
                className="flex items-center justify-between p-3 rounded-xl bg-sky-50/70 border border-sky-100 hover:bg-sky-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <span className="font-semibold text-sky-950">Doctor Consultation Queue</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-sky-700" />
              </Link>

              <Link
                href="/patients"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-slate-900">Patient Longitudinal History</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
