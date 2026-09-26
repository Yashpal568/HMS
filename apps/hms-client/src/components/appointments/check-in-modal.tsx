'use client';

import React, { useState, useMemo } from 'react';
import { Appointment, QueuePriority } from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  UserCheck,
  Calendar,
  Clock,
  Stethoscope,
  X,
  CheckCircle2,
  AlertCircle,
  Hash,
  Activity,
  HeartPulse,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckInModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAppointment: Appointment) => void;
}

export function CheckInModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CheckInModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Triage state
  const [priority, setPriority] = useState<QueuePriority>(QueuePriority.NORMAL);
  const [showTriageForm, setShowTriageForm] = useState(false);
  const [bpSystolic, setBpSystolic] = useState<string>('');
  const [bpDiastolic, setBpDiastolic] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('');
  const [spO2, setSpO2] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');

  // Live BMI calculation
  const computedBmi = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w <= 0 || h <= 0) return null;
    const heightM = h / 100;
    const bmiVal = Math.round((w / (heightM * heightM)) * 10) / 10;
    let category = 'normal';
    if (bmiVal < 18.5) category = 'underweight';
    else if (bmiVal < 25) category = 'normal';
    else if (bmiVal < 30) category = 'overweight';
    else category = 'obese';
    return { bmi: bmiVal, category };
  }, [weight, height]);

  if (!isOpen || !appointment) {
    return null;
  }

  const patientName = appointment.patient
    ? [
        appointment.patient.name?.first,
        appointment.patient.name?.middle,
        appointment.patient.name?.last,
      ]
        .filter(Boolean)
        .join(' ')
    : (appointment.patient as any)?.firstName
    ? `${(appointment.patient as any).firstName} ${(appointment.patient as any).lastName || ''}`.trim()
    : 'Patient';

  const doctorName = appointment.doctor?.name || 'Doctor';

  const formattedDate = new Date(appointment.scheduledAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleConfirmCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const apptId = appointment.id || appointment._id;

      // Construct vitals payload if any value was supplied
      const hasVitals =
        Boolean(bpSystolic) ||
        Boolean(bpDiastolic) ||
        Boolean(pulse) ||
        Boolean(temperature) ||
        Boolean(respiratoryRate) ||
        Boolean(spO2) ||
        Boolean(weight) ||
        Boolean(height);

      const vitalsPayload = hasVitals
        ? {
            bpSystolic: bpSystolic ? Number(bpSystolic) : undefined,
            bpDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
            pulse: pulse ? Number(pulse) : undefined,
            temperature: temperature ? Number(temperature) : undefined,
            respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
            spO2: spO2 ? Number(spO2) : undefined,
            weight: weight ? Number(weight) : undefined,
            height: height ? Number(height) : undefined,
          }
        : undefined;

      const payload = {
        priority,
        triageNotes: triageNotes.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || appointment.chiefComplaint || undefined,
        vitals: vitalsPayload,
      };

      const res = await apiClient.post<{ success: boolean; data: Appointment }>(
        `/appointments/${apptId}/check-in`,
        payload,
      );
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to complete check-in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-dialog-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 id="checkin-dialog-title" className="text-lg font-bold text-slate-900">
              Reception OPD Check-In & Triage
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm patient arrival, record triage vitals, and assign to live OPD Queue
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Patient & Appointment Summary Card */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3 mb-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div>
              <p className="text-sm font-semibold text-slate-900">{patientName}</p>
              <p className="text-xs text-slate-500 font-mono">
                {appointment.patient?.uhid || 'UHID Pending'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold font-mono">
                <Hash className="w-3.5 h-3.5" />
                Token #{String(appointment.tokenNumber).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 font-medium">Doctor</p>
                <p className="font-semibold text-slate-800">Dr. {doctorName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 font-medium">Time Slot</p>
                <p className="font-semibold text-slate-800">{appointment.timeSlot}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 font-medium">Date</p>
                <p className="font-semibold text-slate-800">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                D
              </div>
              <div>
                <p className="text-slate-400 font-medium">Department</p>
                <p className="font-semibold text-slate-800">{appointment.department}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Triage Priority Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Triage Clinical Priority
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPriority(QueuePriority.NORMAL)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                priority === QueuePriority.NORMAL
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Routine</span>
              <span className="text-[10px] opacity-75 font-normal">Normal FIFO</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority(QueuePriority.URGENT)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                priority === QueuePriority.URGENT
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Urgent</span>
              <span className="text-[10px] opacity-75 font-normal">+10 Queue Priority</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority(QueuePriority.EMERGENCY)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                priority === QueuePriority.EMERGENCY
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Emergency</span>
              <span className="text-[10px] opacity-75 font-normal">Top Priority Dequeue</span>
            </button>
          </div>
        </div>

        {/* Collapsible Triage Vitals Section */}
        <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTriageForm(!showTriageForm)}
            className="w-full px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Capture Triage Vitals & Notes (Optional)
            </span>
            {showTriageForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showTriageForm && (
            <div className="p-4 bg-white space-y-3 text-xs border-t border-slate-100">
              {/* BP, Pulse, Temp */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    BP (Systolic)
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    BP (Diastolic)
                  </label>
                  <input
                    type="number"
                    placeholder="80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Temp, SpO2, Resp */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Temp (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    placeholder="99"
                    value={spO2}
                    onChange={(e) => setSpO2(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Resp Rate (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="16"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Weight, Height, and computed BMI */}
              <div className="grid grid-cols-3 gap-2.5 items-end">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                  />
                </div>
                <div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block">BMI</span>
                    <span className="font-bold text-xs text-slate-800 font-mono">
                      {computedBmi ? `${computedBmi.bmi} (${computedBmi.category})` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Triage Notes */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Triage Notes & Assessment
                </label>
                <input
                  type="text"
                  placeholder="Patient ambulatory, alert, mild tachycardia noted..."
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl text-xs px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCheckIn}
            disabled={loading}
            className="rounded-xl text-xs px-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Enrolling in Queue...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Check-In & Queue</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
