'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, X, UserCheck } from 'lucide-react';
import { DuplicateCheckResult } from '@hms/types';

interface DuplicateAlertModalProps {
  isOpen: boolean;
  duplicateInfo: DuplicateCheckResult | null;
  onClose: () => void;
  onProceedAnyway: () => void;
}

export function DuplicateAlertModal({
  isOpen,
  duplicateInfo,
  onClose,
  onProceedAnyway,
}: DuplicateAlertModalProps) {
  if (!isOpen || !duplicateInfo?.hasDuplicate || !duplicateInfo.existingPatient) {
    return null;
  }

  const { existingPatient } = duplicateInfo;
  const fullName = [
    existingPatient.name.first,
    existingPatient.name.middle,
    existingPatient.name.last,
  ]
    .filter(Boolean)
    .join(' ');

  const formattedDob = existingPatient.dateOfBirth
    ? new Date(existingPatient.dateOfBirth).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-dialog-title"
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
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="duplicate-dialog-title" className="text-lg font-bold text-slate-900">
              Potential Duplicate Patient Detected
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              An existing patient record in this hospital matches the phone number and date of birth you entered.
            </p>
          </div>
        </div>

        {/* Existing Patient Summary Card */}
        <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Matched Existing Record
            </span>
            <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900">
              {existingPatient.uhid}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <strong className="text-slate-900 text-sm">{fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Phone:</span>
              <strong className="text-slate-800 font-mono">{existingPatient.phone}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Birth:</span>
              <span className="text-slate-800 font-medium">{formattedDob}</span>
            </div>
          </div>
        </div>

        {/* Informational notice */}
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          To maintain clinical integrity, please verify if this patient already has a hospital chart. Creating duplicate UHID records causes fragmentation in medical history.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <Link
            href={`/patients/${existingPatient.id}`}
            target="_blank"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Existing Chart
          </Link>

          <button
            type="button"
            onClick={onProceedAnyway}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Proceed (Confirmed Distinct Person)
          </button>
        </div>
      </div>
    </div>
  );
}
