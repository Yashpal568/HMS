'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Appointment, AppointmentStatus } from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { CheckInModal } from '@/components/appointments/check-in-modal';
import { CancelModal } from '@/components/appointments/cancel-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Clock,
  User,
  Stethoscope,
  ChevronLeft,
  UserCheck,
  XCircle,
  FileText,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AppointmentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const appointmentId = resolvedParams.id;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const fetchAppointment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<{ success: boolean; data: Appointment }>(
        `/appointments/${appointmentId}`
      );
      setAppointment(res.data);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to load appointment details.');
      }
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointment();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAppointment]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !appointment) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Appointment Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            {error || 'The requested appointment record does not exist or has been removed.'}
          </p>
          <div className="mt-6">
            <Link href="/appointments">
              <Button className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white">
                Back to OPD Queue
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const patientName = appointment.patient
    ? [
        appointment.patient.name?.first,
        appointment.patient.name?.middle,
        appointment.patient.name?.last,
      ]
        .filter(Boolean)
        .join(' ')
    : 'Unknown Patient';

  const doctorName = appointment.doctor?.name || 'Doctor';

  const scheduledDate = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isScheduled = appointment.status === AppointmentStatus.SCHEDULED;
  const isCheckedIn = appointment.status === AppointmentStatus.CHECKED_IN;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
  const canCancel = !isCancelled && appointment.status !== AppointmentStatus.COMPLETED;

  const patientPhone = appointment.patient?.phone || appointment.patient?.contacts?.phone;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/appointments" className="hover:text-teal-600 transition-colors">
              Appointments & OPD
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Token #{String(appointment.tokenNumber).padStart(2, '0')}</span>
          </div>

          <Link href="/appointments">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 border-slate-200">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Queue</span>
            </Button>
          </Link>
        </div>

        {/* Patient & Appointment Banner Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {patientName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{patientName}</h1>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono mt-1">
                <span>UHID: {appointment.patient?.uhid || 'N/A'}</span>
                <span>•</span>
                <span>Gender: {appointment.patient?.gender || 'N/A'}</span>
                {patientPhone && (
                  <>
                    <span>•</span>
                    <span>Ph: {patientPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Token Pill */}
          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="px-4 py-2.5 rounded-2xl bg-teal-50 border border-teal-200 text-center">
              <span className="block text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                Daily Token
              </span>
              <span className="text-xl font-black font-mono text-teal-800">
                #{String(appointment.tokenNumber).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Lifecycle Action Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {isScheduled && (
              <span className="text-sky-700 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Scheduled visit — Awaiting patient arrival at reception
              </span>
            )}
            {isCheckedIn && (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                Patient is checked in and waiting in outpatient consultation queue
              </span>
            )}
            {isCancelled && (
              <span className="text-rose-700 font-medium flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Appointment was cancelled
              </span>
            )}
            {appointment.status === AppointmentStatus.COMPLETED && (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Outpatient consultation concluded
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isScheduled && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCheckInOpen(true)}
                className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Check In Now</span>
              </Button>
            )}

            {canCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelOpen(true)}
                className="rounded-xl text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <span>Cancel Appointment</span>
              </Button>
            )}

            {appointment.patientId && (
              <Link href={`/patients/${appointment.patientId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs border-slate-200 text-slate-700 flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>Full Patient Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Appointment Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Clinical Session Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Consultation Particulars</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Consulting Physician</span>
                <span className="font-semibold text-slate-800">Dr. {doctorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Department</span>
                <span className="font-semibold text-slate-800">{appointment.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Scheduled Date</span>
                <span className="font-semibold text-slate-800">{scheduledDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Reserved Time Slot</span>
                <span className="font-semibold text-teal-700">{appointment.timeSlot}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Visit Classification</span>
                <span className="font-semibold text-slate-800">{appointment.type}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Clinical Intake & Notes */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Presenting Intake & Notes</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Chief Complaint</span>
                <p className="text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  {appointment.chiefComplaint || 'No chief complaint recorded at booking.'}
                </p>
              </div>

              {appointment.notes && (
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Reception Remarks</span>
                  <p className="text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Cancellation Reason if cancelled */}
              {isCancelled && (appointment.cancellationReason || appointment.cancelledReason) && (
                <div>
                  <span className="text-rose-500 font-semibold block mb-1">
                    Cancellation Reason
                  </span>
                  <p className="text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                    {appointment.cancellationReason || appointment.cancelledReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Check-In Modal */}
        <CheckInModal
          appointment={appointment}
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onSuccess={(updated) => setAppointment(updated)}
        />

        {/* Cancel Modal */}
        <CancelModal
          appointment={appointment}
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
          onSuccess={(updated) => setAppointment(updated)}
        />
      </div>
    </AppShell>
  );
}
