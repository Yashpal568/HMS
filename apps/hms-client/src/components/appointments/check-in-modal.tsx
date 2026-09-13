'use client';

import React, { useState } from 'react';
import { Appointment } from '@hms/types';
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
      const res = await apiClient.post<{ success: boolean; data: Appointment }>(
        `/appointments/${apptId}/check-in`
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
        className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
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
              Reception OPD Check-In
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm patient arrival to advance to OPD Queue
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3 mb-6">
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

        <div className="flex items-center justify-end gap-3 pt-2">
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
                <span>Checking In...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Check-In</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
