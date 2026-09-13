'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  Edit3,
  Calendar,
  Stethoscope,
  Bed,
  AlertTriangle,
  User,
  HeartPulse,
} from 'lucide-react';
import { Patient, AllergySeverity, PatientStatus } from '@hms/types';
import { AllergyBadgeList } from './allergy-badge-list';

interface PatientHeaderProps {
  patient: Patient;
}

function calculateAge(dobString?: string): string {
  if (!dobString) return '-';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    years--;
  }
  return `${Math.max(0, years)} yrs`;
}

function formatDob(dobString?: string): string {
  if (!dobString) return '-';
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return '-';
  return dob.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  const [copied, setCopied] = useState(false);

  const fullName = [patient.name.first, patient.name.middle, patient.name.last]
    .filter(Boolean)
    .join(' ');

  const severeAllergies = (patient.allergies || []).filter(
    (a) => a.severity === AllergySeverity.SEVERE,
  );

  const handleCopyUhid = async () => {
    try {
      await navigator.clipboard.writeText(patient.uhid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const statusColors: Record<PatientStatus, { badge: string; dot: string; label: string }> = {
    [PatientStatus.ACTIVE]: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Active',
    },
    [PatientStatus.INACTIVE]: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      label: 'Inactive',
    },
    [PatientStatus.DECEASED]: {
      badge: 'bg-zinc-100 text-zinc-700 border-zinc-300',
      dot: 'bg-zinc-500',
      label: 'Deceased',
    },
  };

  const currentStatus = statusColors[patient.status] || statusColors[PatientStatus.ACTIVE];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* High Alert Ribbon for Severe Allergies */}
      {severeAllergies.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" aria-hidden="true" />
          <span>Clinical Safety Warning: Patient has documented severe allergy risks ({severeAllergies.map((a) => a.allergen).join(', ')})</span>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Main Patient Identifier & Demographics */}
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/10 shrink-0">
              <User className="h-8 w-8" aria-hidden="true" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {fullName}
                </h1>

                {/* Status Indicator */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                  {currentStatus.label}
                </span>

                {/* Blood Group Tag */}
                {patient.bloodGroup && patient.bloodGroup !== 'unknown' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" />
                    {patient.bloodGroup}
                  </span>
                )}
              </div>

              {/* Patient Key Demographics Line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                {/* UHID with copy action */}
                <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                  <span className="font-semibold text-slate-500">UHID:</span>
                  <span className="font-bold">{patient.uhid}</span>
                  <button
                    type="button"
                    onClick={handleCopyUhid}
                    className="text-slate-500 hover:text-slate-900 transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    title="Copy UHID to clipboard"
                    aria-label="Copy UHID"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <span className="text-slate-300">•</span>
                <span>
                  <strong className="text-slate-800">{calculateAge(patient.dateOfBirth)}</strong>
                  <span className="text-slate-500 text-xs ml-1">({formatDob(patient.dateOfBirth)})</span>
                </span>

                <span className="text-slate-300">•</span>
                <span className="capitalize text-slate-800 font-medium">{patient.gender}</span>

                {patient.contacts?.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-700">{patient.contacts.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 lg:self-center">
            <Link
              href={`/patients/${patient.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              Edit Profile
            </Link>

            {/* Next Milestone Action Placeholders with Authentic Tooltips */}
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-80"
              title="OPD Queue & Appointments scheduled for Milestone 4"
            >
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              Book OPD (M04)
            </button>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-80"
              title="Doctor Consultation & EMR scheduled for Milestone 5"
            >
              <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
              Consultation (M05)
            </button>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed opacity-80"
              title="IPD Bed Management scheduled for Milestone 6"
            >
              <Bed className="w-3.5 h-3.5" aria-hidden="true" />
              Admit IPD (M06)
            </button>
          </div>
        </div>

        {/* Allergy Badge Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
            Known Allergies:
          </span>
          <AllergyBadgeList allergies={patient.allergies} compact={false} showNone={true} />
        </div>
      </div>
    </div>
  );
}
