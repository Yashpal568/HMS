'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Calendar,
  ChevronRight,
  RefreshCw,
  PlayCircle,
  FileText,
  UserCheck,
  HeartPulse,
} from 'lucide-react';
import { AppointmentStatus } from '@hms/types';
import type { Appointment } from '@hms/types';

export default function EmrQueuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'all' | 'completed'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startingConsultationId, setStartingConsultationId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        date: selectedDate,
        limit: '50',
      });
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      const response = await apiClient.get<{ success: boolean; data: Appointment[] }>(`/appointments?${queryParams.toString()}`);
      if (response.success && response.data) {
        setAppointments(response.data);
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch OPD queue appointments:', err);
      setError(err.message || 'Failed to load doctor consultation queue.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchQuery]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      setStartingConsultationId(appointmentId);
      const response = await apiClient.post<any>('/emr/encounters', {
        appointmentId,
      });

      if (response.success) {
        router.push(`/emr/consultation/${appointmentId}`);
      } else {
        alert(response.message || 'Unable to start consultation');
      }
    } catch (err: any) {
      console.error('Error starting consultation:', err);
      alert(err.message || 'Failed to initialize consultation encounter.');
    } finally {
      setStartingConsultationId(null);
    }
  };

  // Filter appointments according to tab
  const checkedInList = appointments.filter(
    (a) => a.status === AppointmentStatus.CHECKED_IN || a.status === AppointmentStatus.IN_CONSULTATION,
  );
  const completedList = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED);

  const filteredAppointments = () => {
    switch (activeTab) {
      case 'queue':
        return checkedInList;
      case 'completed':
        return completedList;
      case 'all':
      default:
        return appointments;
    }
  };

  const currentList = filteredAppointments();

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.IN_CONSULTATION:
        return (
          <Badge variant="warning" className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Consultation
          </Badge>
        );
      case AppointmentStatus.CHECKED_IN:
        return (
          <Badge variant="teal" className="flex items-center gap-1.5 font-medium">
            <UserCheck className="w-3 h-3" />
            Checked In
          </Badge>
        );
      case AppointmentStatus.SCHEDULED:
        return (
          <Badge variant="outline" className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Scheduled
          </Badge>
        );
      case AppointmentStatus.COMPLETED:
        return (
          <Badge variant="success" className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        );
      case AppointmentStatus.CANCELLED:
        return (
          <Badge variant="destructive" className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Doctor Consultation Workspace
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time outpatient queue, active patient encounters, and electronic health record documentation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/appointments/book">
              <Button size="sm" variant="default" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
                Book Walk-in Patient
              </Button>
            </Link>
          </div>
        </div>

        {/* Operational Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/70 hover:border-border transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Waiting in Queue
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {appointments.filter((a) => a.status === AppointmentStatus.CHECKED_IN).length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Checked in & awaiting call</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 hover:border-border transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  In Consultation
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {appointments.filter((a) => a.status === AppointmentStatus.IN_CONSULTATION).length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Currently active in doctor room</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 hover:border-border transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Completed Today
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Consultations finalized & sealed</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-3.5 rounded-xl border border-border/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-background shadow-xs text-teal-700 dark:text-teal-400 border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Queue ({checkedInList.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-background shadow-xs text-teal-700 dark:text-teal-400 border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Bookings ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'completed'
                  ? 'bg-background shadow-xs text-teal-700 dark:text-teal-400 border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completed Encounters ({completedList.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search UHID or patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Patient Queue Cards / Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Unable to Load Queue"
            message={error}
            onRetry={fetchAppointments}
          />
        ) : currentList.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title={
              activeTab === 'queue'
                ? 'No Patients Waiting in Queue'
                : activeTab === 'completed'
                ? 'No Consultations Completed Yet'
                : 'No Appointments Scheduled'
            }
            description={
              activeTab === 'queue'
                ? 'There are currently no checked-in patients waiting for examination. Check-in walk-in arrivals from the appointments board.'
                : 'Appointments scheduled for this date will appear here once booked.'
            }
            action={{
              label: 'Go to Appointments Board',
              onClick: () => router.push('/appointments'),
            }}
          />
        ) : (
          <div className="space-y-3">
            {currentList.map((appointment) => {
              const patient = appointment.patient;
              const isStarting = startingConsultationId === (appointment._id || appointment.id);
              const appointmentId = appointment._id || appointment.id;

              return (
                <div
                  key={appointmentId}
                  className={`p-4 rounded-xl border transition-all ${
                    appointment.status === AppointmentStatus.IN_CONSULTATION
                      ? 'border-teal-500/50 bg-teal-50/30 dark:bg-teal-950/20 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Patient and Appointment Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Token Box */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Token</span>
                        <span className="text-base font-extrabold leading-tight">
                          #{appointment.tokenNumber}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base text-foreground">
                            {patient?.name
                              ? `${patient.name.first} ${patient.name.last}`.trim()
                              : (patient as any)?.firstName
                              ? `${(patient as any).firstName} ${(patient as any).lastName}`.trim()
                              : 'Patient Name Loading...'}
                          </span>
                          {patient?.uhid && (
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {patient.uhid}
                            </Badge>
                          )}
                          {patient?.gender && (
                            <span className="text-xs text-muted-foreground">
                              ({patient.gender.charAt(0).toUpperCase()}
                              {(patient as any)?.ageYears
                                ? `, ${(patient as any).ageYears}y`
                                : patient.dateOfBirth
                                ? `, ${Math.max(0, Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))}y`
                                : ''})
                            </span>
                          )}
                          {patient?.bloodGroup && (
                            <Badge variant="secondary" className="text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30">
                              {patient.bloodGroup}
                            </Badge>
                          )}
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Slot: {appointment.timeSlot}
                          </span>
                          <span>Dept: {appointment.department}</span>
                          {appointment.chiefComplaint && (
                            <span className="text-foreground/80 font-medium">
                              Chief Complaint: &ldquo;{appointment.chiefComplaint}&rdquo;
                            </span>
                          )}
                        </div>

                        {/* Allergy warning indicator on card */}
                        {(patient?.hasSevereAllergies || ((patient as any)?.allergies && (patient as any).allergies.length > 0)) && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {(patient as any)?.allergies?.length
                                ? `Allergies: ${(patient as any).allergies.map((a: any) => a.allergen || a).join(', ')}`
                                : 'Severe allergies documented'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {appointment.status === AppointmentStatus.IN_CONSULTATION ? (
                        <Button
                          onClick={() => router.push(`/emr/consultation/${appointmentId}`)}
                          className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs"
                          size="sm"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Resume Consultation
                        </Button>
                      ) : appointment.status === AppointmentStatus.CHECKED_IN || appointment.status === AppointmentStatus.SCHEDULED ? (
                        <Button
                          onClick={() => handleStartConsultation(appointmentId)}
                          disabled={isStarting}
                          className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs"
                          size="sm"
                        >
                          <PlayCircle className="w-4 h-4" />
                          {isStarting ? 'Starting...' : 'Start Consultation'}
                        </Button>
                      ) : appointment.status === AppointmentStatus.COMPLETED ? (
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/emr/consultation/${appointmentId}`)}
                          className="gap-1.5 text-xs"
                          size="sm"
                        >
                          <FileText className="w-4 h-4" />
                          View EMR Record
                        </Button>
                      ) : null}

                      {patient?._id && (
                        <Link href={`/patients/${patient._id}`}>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                            Patient Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
