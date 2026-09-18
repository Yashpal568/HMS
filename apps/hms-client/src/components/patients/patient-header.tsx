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
  FlaskConical,
  Pill,
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
      <div className="p-5 sm:p-6">
        {/* High Alert Banner for Severe Allergies */}
        {severeAllergies.length > 0 && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="leading-relaxed">
                <strong className="font-bold uppercase tracking-wider text-rose-700 mr-1.5">
                  Clinical Safety Alert:
                </strong>
                <span>
                  Patient has documented severe allergy to{' '}
                  <strong className="font-bold text-rose-950 underline decoration-rose-400">
                    {severeAllergies.map((a) => a.allergen).join(', ')}
                  </strong>
                  . Double-check all active prescriptions and clinical orders.
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider shrink-0">
              Severe Risk
            </span>
          </div>
        )}

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
          <div className="flex flex-wrap items-center gap-2 lg:self-center">
            <Link
              href={`/appointments/book?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
              Book OPD
            </Link>

            <Link
              href="/emr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
              Consultation
            </Link>

            <Link
              href={`/ipd/admissions/new?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Bed className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Admit IPD
            </Link>

            <Link
              href={`/laboratory/orders/new?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
              Order Lab
            </Link>

            <Link
              href={`/pharmacy?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <Pill className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              Pharmacy
            </Link>

            <Link
              href={`/patients/${patient.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Edit Profile
            </Link>
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
