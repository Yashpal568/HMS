'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Appointment,
  AppointmentStatus,
  DoctorUserSummary,
} from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { CheckInModal } from '@/components/appointments/check-in-modal';
import { CancelModal } from '@/components/appointments/cancel-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  UserCheck,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertCircle,
  Settings,
  Hash,
  Stethoscope,
} from 'lucide-react';

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorUserSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [checkInTarget, setCheckInTarget] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  // Fetch doctors roster
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: DoctorUserSummary[] }>(
        '/appointments/doctors'
      );
      setDoctors(res.data || []);
    } catch (err) {
      console.error('Failed to load doctors', err);
    }
  }, []);

  // Fetch appointments for date & doctor
  const fetchAppointments = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (selectedDate) queryParams.set('date', selectedDate);
        if (selectedDoctorId) queryParams.set('doctorId', selectedDoctorId);
        if (selectedStatus) queryParams.set('status', selectedStatus);
        if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

        const url = `/appointments?${queryParams.toString()}`;
        const res = await apiClient.get<{
          success: boolean;
          data: Appointment[];
          total: number;
        }>(url);

        setAppointments(res.data || []);
      } catch (err: unknown) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('Failed to fetch OPD appointments.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, selectedDoctorId, selectedStatus, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Filter client-side search query
  const filteredAppointments = appointments.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const patientName = app.patient
      ? `${app.patient.name?.first || ''} ${app.patient.name?.last || ''}`.toLowerCase()
      : '';
    const uhid = (app.patient?.uhid || '').toLowerCase();
    const token = String(app.tokenNumber);
    const doctor = (app.doctor?.name || '').toLowerCase();

    return (
      patientName.includes(q) ||
      uhid.includes(q) ||
      token.includes(q) ||
      doctor.includes(q)
    );
  });

  // Calculate OPD Queue Metrics
  const totalCount = appointments.length;
  const waitingCount = appointments.filter((a) => a.status === AppointmentStatus.CHECKED_IN).length;
  const inConsultCount = appointments.filter(
    (a) => a.status === AppointmentStatus.IN_CONSULTATION
  ).length;
  const completedCount = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handleAppointmentUpdated = (updated: Appointment) => {
    const updatedId = updated.id || updated._id;
    setAppointments((prev) =>
      prev.map((app) => ((app.id || app._id) === updatedId ? updated : app))
    );
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Appointments & OPD Queue
                </h1>
                <p className="text-xs text-slate-500">
                  Manage outpatient clinic scheduling, reception check-in, and daily consultation queue
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/appointments/schedules">
              <Button
                variant="outline"
                className="rounded-xl text-xs gap-1.5 border-slate-200 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Doctor Schedules</span>
              </Button>
            </Link>

            <Link href="/appointments/book">
              <Button className="rounded-xl text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Date Navigator Bar & KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Date Selector Box */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Schedule Date
              </span>
              {isToday ? (
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold text-[10px] border border-teal-200">
                  Today
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                >
                  Jump to Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 text-center font-medium text-xs rounded-xl border border-slate-200 py-2 px-2 text-slate-800 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPI 1: Total Appointments */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Bookings</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h3>
              <p className="text-[11px] text-slate-400">Scheduled for this date</p>
            </div>
          </div>

          {/* KPI 2: Waiting in OPD Queue */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Waiting in Queue</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-0.5">{waitingCount}</h3>
              <p className="text-[11px] text-amber-600/80 font-medium">Checked in & ready</p>
            </div>
          </div>

          {/* KPI 3: In Consultation & Completed */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Seen / Active</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-bold text-emerald-700">{completedCount}</h3>
                <span className="text-xs font-medium text-indigo-600">
                  ({inConsultCount} in consult)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Outpatient throughput</p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, UHID, token..."
                className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Doctor Filter & Refresh */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => {
                  const docId = doc.id || doc._id || '';
                  return (
                    <option key={docId} value={docId}>
                      Dr. {doc.name} ({doc.department || 'OPD'})
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={() => fetchAppointments(true)}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh OPD Queue"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-3 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                selectedStatus === ''
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Appointments ({appointments.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus(AppointmentStatus.CHECKED_IN)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                selectedStatus === AppointmentStatus.CHECKED_IN
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Waiting ({waitingCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus(AppointmentStatus.SCHEDULED)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                selectedStatus === AppointmentStatus.SCHEDULED
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Scheduled (Not Arrived) (
              {appointments.filter((a) => a.status === AppointmentStatus.SCHEDULED).length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus(AppointmentStatus.IN_CONSULTATION)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                selectedStatus === AppointmentStatus.IN_CONSULTATION
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              In Consultation ({inConsultCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus(AppointmentStatus.COMPLETED)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                selectedStatus === AppointmentStatus.COMPLETED
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* OPD Queue High-Density Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Doctor & Dept</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-6 w-16 rounded-lg" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-36 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Skeleton className="h-7 w-20 ml-auto rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-sm mx-auto text-slate-500">
                        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-semibold text-slate-800">
                          No OPD Appointments Found
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          No appointments match the selected date, doctor, or status criteria.
                        </p>
                        <div className="mt-4">
                          <Link href="/appointments/book">
                            <Button className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                              <Plus className="w-4 h-4 mr-1" /> Book New Appointment
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((app) => {
                    const apptId = app.id || app._id;
                    const patientName = app.patient
                      ? [app.patient.name?.first, app.patient.name?.last]
                          .filter(Boolean)
                          .join(' ')
                      : 'Unknown Patient';

                    const doctorName = app.doctor?.name || 'Doctor';

                    const isScheduled = app.status === AppointmentStatus.SCHEDULED;
                    const canCancel =
                      app.status !== AppointmentStatus.CANCELLED &&
                      app.status !== AppointmentStatus.COMPLETED;

                    const patientPhone = app.patient?.phone || app.patient?.contacts?.phone;

                    return (
                      <tr
                        key={apptId}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Token # */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                            <Hash className="w-3.5 h-3.5" />
                            {String(app.tokenNumber).padStart(2, '0')}
                          </span>
                        </td>

                        {/* Slot */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {app.timeSlot}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div>
                            <Link
                              href={`/patients/${app.patientId}`}
                              className="font-semibold text-slate-900 hover:text-teal-600 transition-colors"
                            >
                              {patientName}
                            </Link>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                              <span>{app.patient?.uhid || 'UHID Pending'}</span>
                              {patientPhone && (
                                <>
                                  <span>•</span>
                                  <span>{patientPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Doctor */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-medium text-slate-800">Dr. {doctorName}</p>
                            <p className="text-[11px] text-slate-400">{app.department}</p>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100">
                            {app.type}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <AppointmentStatusBadge status={app.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Check-In Action */}
                            {isScheduled && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setCheckInTarget(app)}
                                className="h-7 text-xs px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Check In</span>
                              </Button>
                            )}

                            {/* Consult Action */}
                            {(app.status === AppointmentStatus.CHECKED_IN ||
                              app.status === AppointmentStatus.IN_CONSULTATION) && (
                              <Link href={`/emr/consultation/${apptId}`}>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center gap-1 shadow-xs"
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  <span>Consult</span>
                                </Button>
                              </Link>
                            )}

                            {/* View Detail Action */}
                            <Link href={`/appointments/${apptId}`}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 rounded-lg border-slate-200 hover:bg-slate-100 text-slate-700"
                                title="View Appointment Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </Link>

                            {/* Cancel Action */}
                            {canCancel && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCancelTarget(app)}
                                className="h-7 text-xs px-2 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"
                                title="Cancel Appointment"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Check-In Modal */}
        <CheckInModal
          appointment={checkInTarget}
          isOpen={!!checkInTarget}
          onClose={() => setCheckInTarget(null)}
          onSuccess={handleAppointmentUpdated}
        />

        {/* Cancel Modal */}
        <CancelModal
          appointment={cancelTarget}
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={handleAppointmentUpdated}
        />
      </div>
    </AppShell>
  );
}
