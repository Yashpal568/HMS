'use client';

import React, { useState } from 'react';
import { Appointment } from '@hms/types';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  XCircle,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CancelModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAppointment: Appointment) => void;
}

const COMMON_REASONS = [
  'Patient requested cancellation',
  'Doctor unavailable / emergency case',
  'Rescheduled to alternate date',
  'Incorrect booking details',
  'Patient no-show',
  'Other',
];

export function CancelModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: CancelModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
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

  const finalReason =
    selectedReason === 'Other'
      ? customReason.trim()
      : selectedReason + (customReason.trim() ? ` - ${customReason.trim()}` : '');

  const handleConfirmCancel = async () => {
    if (!finalReason) {
      setError('Please provide a reason for cancelling this appointment.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const apptId = appointment.id || appointment._id;
      const res = await apiClient.post<{ success: boolean; data: Appointment }>(
        `/appointments/${apptId}/cancel`,
        { reason: finalReason }
      );
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to cancel appointment. Please try again.');
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
        aria-labelledby="cancel-dialog-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="cancel-dialog-title" className="text-lg font-bold text-slate-900">
              Cancel Appointment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Release time slot for {patientName} ({appointment.timeSlot})
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Notes / Remarks {selectedReason === 'Other' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Provide specific notes regarding cancellation..."
              className="w-full text-xs rounded-xl border border-slate-200 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              This will update the appointment status to <strong>CANCELLED</strong>, free the slot for new bookings, and log an auditable event.
            </span>
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
            Go Back
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCancel}
            disabled={loading || (selectedReason === 'Other' && !customReason.trim())}
            className="rounded-xl text-xs px-5 bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Confirm Cancellation</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
