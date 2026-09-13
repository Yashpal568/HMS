'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DoctorUserSummary,
  DoctorSchedule,
  DayOfWeek,
} from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronLeft,
} from 'lucide-react';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: DayOfWeek.MONDAY, label: 'Monday' },
  { key: DayOfWeek.TUESDAY, label: 'Tuesday' },
  { key: DayOfWeek.WEDNESDAY, label: 'Wednesday' },
  { key: DayOfWeek.THURSDAY, label: 'Thursday' },
  { key: DayOfWeek.FRIDAY, label: 'Friday' },
  { key: DayOfWeek.SATURDAY, label: 'Saturday' },
  { key: DayOfWeek.SUNDAY, label: 'Sunday' },
];

interface ScheduleFormState {
  isActive: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatients: number;
}

const DEFAULT_FORM: ScheduleFormState = {
  isActive: true,
  startTime: '09:00',
  endTime: '13:00',
  slotDurationMinutes: 15,
  maxPatients: 30,
};

export default function DoctorSchedulesPage() {
  const [doctors, setDoctors] = useState<DoctorUserSummary[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [weeklySchedules, setWeeklySchedules] = useState<Record<number, ScheduleFormState>>({
    [DayOfWeek.MONDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.TUESDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.WEDNESDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.THURSDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.FRIDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.SATURDAY]: { ...DEFAULT_FORM },
    [DayOfWeek.SUNDAY]: { ...DEFAULT_FORM, isActive: false },
  });

  // Load doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await apiClient.get<{ success: boolean; data: DoctorUserSummary[] }>(
          '/appointments/doctors'
        );
        const docs = res.data || [];
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(docs[0].id || docs[0]._id || '');
        }
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  // Fetch doctor's existing schedules
  const fetchSchedules = useCallback(async (docId: string) => {
    if (!docId) return;
    try {
      setErrorMsg(null);
      const res = await apiClient.get<{ success: boolean; data: DoctorSchedule[] }>(
        `/appointments/schedules?doctorId=${docId}`
      );

      const map: Record<number, ScheduleFormState> = {
        [DayOfWeek.MONDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.TUESDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.WEDNESDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.THURSDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.FRIDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.SATURDAY]: { ...DEFAULT_FORM },
        [DayOfWeek.SUNDAY]: { ...DEFAULT_FORM, isActive: false },
      };

      res.data?.forEach((s) => {
        map[s.dayOfWeek] = {
          isActive: s.isActive ?? true,
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '13:00',
          slotDurationMinutes: s.slotDurationMinutes || 15,
          maxPatients: s.maxPatients || 30,
        };
      });

      setWeeklySchedules(map);
    } catch (err) {
      console.error('Failed to load schedules', err);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      const timer = setTimeout(() => {
        fetchSchedules(selectedDoctorId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedDoctorId, fetchSchedules]);

  const updateDayField = <K extends keyof ScheduleFormState>(
    day: DayOfWeek,
    field: K,
    val: ScheduleFormState[K]
  ) => {
    setWeeklySchedules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val,
      },
    }));
  };

  const selectedDoctor = doctors.find(
    (d) => (d.id || d._id) === selectedDoctorId
  );

  const handleSaveDay = async (day: DayOfWeek) => {
    const config = weeklySchedules[day];
    if (!config || !selectedDoctorId) return;

    try {
      setSavingDay(day);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        doctorId: selectedDoctorId,
        department: selectedDoctor?.department || 'General Medicine',
        dayOfWeek: day,
        startTime: config.startTime,
        endTime: config.endTime,
        slotDurationMinutes: Number(config.slotDurationMinutes),
        maxPatients: Number(config.maxPatients),
        isActive: config.isActive,
      };

      await apiClient.post('/appointments/schedules', payload);
      setSuccessMsg(`Schedule for ${DAYS.find((d) => d.key === day)?.label} saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Failed to save schedule configuration.');
      }
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/appointments" className="hover:text-teal-600 transition-colors">
                Appointments & OPD
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Doctor Schedules</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Doctor OPD Schedule Roster
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure consulting physician weekly shifts, slot durations, and daily patient capacity
            </p>
          </div>

          <Link href="/appointments">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 border-slate-200">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Queue</span>
            </Button>
          </Link>
        </div>

        {/* Doctor Selector Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">
                Select Consulting Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={loadingDoctors}
                className="mt-0.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {doctors.map((doc) => {
                  const docId = doc.id || doc._id || '';
                  return (
                    <option key={docId} value={docId}>
                      Dr. {doc.name} ({doc.department || 'OPD'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedDoctor && (
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-800">{selectedDoctor.department || 'Clinical Doctor'}</p>
              <p className="font-mono text-[11px]">{selectedDoctor.email}</p>
            </div>
          )}
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Weekly Day Cards */}
        <div className="space-y-4">
          {DAYS.map(({ key, label }) => {
            const config = weeklySchedules[key] || DEFAULT_FORM;
            const isSaving = savingDay === key;

            return (
              <div
                key={key}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                  config.isActive
                    ? 'border-slate-200/80 hover:border-slate-300'
                    : 'border-slate-200/50 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        config.isActive
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {label.slice(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                      <p className="text-[11px] text-slate-500">
                        {config.isActive ? 'Active OPD Schedule' : 'Off Duty / Clinic Closed'}
                      </p>
                    </div>
                  </div>

                  {/* On/Off Switch & Save Button */}
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.isActive}
                        onChange={(e) => updateDayField(key, 'isActive', e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span>{config.isActive ? 'Available for OPD' : 'Off Duty'}</span>
                    </label>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveDay(key)}
                      disabled={isSaving}
                      className="rounded-xl text-xs px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
                    >
                      {isSaving ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save {label}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Form fields (shown when active) */}
                {config.isActive && (
                  <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {/* Consultation Hours */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-slate-700 block">
                        OPD Consultation Hours
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={config.startTime}
                          onChange={(e) => updateDayField(key, 'startTime', e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 px-2 py-1.5 bg-slate-50 text-slate-800 text-xs"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={config.endTime}
                          onChange={(e) => updateDayField(key, 'endTime', e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200 px-2 py-1.5 bg-slate-50 text-slate-800 text-xs"
                        />
                      </div>
                    </div>

                    {/* Slot Duration */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-slate-700 block">
                        Slot Duration (Mins)
                      </span>
                      <select
                        value={config.slotDurationMinutes}
                        onChange={(e) =>
                          updateDayField(key, 'slotDurationMinutes', Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-slate-200 px-2 py-1.5 bg-slate-50 text-slate-800 text-xs"
                      >
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes (Standard)</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>

                    {/* Max Patients */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-slate-700 block">
                        Daily Capacity (Max Patients)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={150}
                        value={config.maxPatients}
                        onChange={(e) =>
                          updateDayField(key, 'maxPatients', Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 bg-slate-50 text-slate-800 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
