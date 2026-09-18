'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bed,
  ArrowLeft,
  ChevronRight,
  User,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Stethoscope,
  Building,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { DischargeCondition } from '@hms/types';

export default function InpatientDischargePage() {
  const params = useParams();
  const router = useRouter();
  const admissionId = params?.id as string;

  const [admission, setAdmission] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [dischargeCondition, setDischargeCondition] = useState<DischargeCondition>(
    DischargeCondition.IMPROVED,
  );
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAdmission = useCallback(async () => {
    if (!admissionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(
        `/ipd/admissions/${admissionId}`,
      );
      if (res.success && res.data) {
        setAdmission(res.data);
        if (res.data.status === 'discharged') {
          router.replace(`/ipd/admissions/${admissionId}`);
        }
      }
    } catch (err) {
      console.error('Failed to load admission for discharge:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve admission file.');
    } finally {
      setIsLoading(false);
    }
  }, [admissionId, router]);

  useEffect(() => {
    fetchAdmission();
  }, [fetchAdmission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeSummary.trim()) {
      setFormError('Clinical discharge summary narrative is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/ipd/admissions/${admissionId}/discharge`,
        {
          dischargeCondition,
          dischargeSummary: dischargeSummary.trim(),
          followUpInstructions: followUpInstructions.trim() || undefined,
        },
      );

      if (res.success) {
        router.push(`/ipd/admissions/${admissionId}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to authorize inpatient discharge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          Loading inpatient discharge file...
        </div>
      </AppShell>
    );
  }

  if (error || !admission) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Admission Record Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || 'The requested admission record could not be loaded.'}
          </p>
          <Link href="/ipd">
            <button className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors">
              Return to Inpatient Dashboard
            </button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const patient = admission.patient || {};
  const admDate = new Date(admission.admissionDate);
  const daysStay = Math.max(
    1,
    Math.ceil((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 border-b border-slate-200 pb-4">
          <Link href="/ipd" className="hover:text-teal-700 transition-colors">
            IPD
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href={`/ipd/admissions/${admissionId}`} className="hover:text-teal-700 transition-colors font-mono">
            {admission.admissionNumber}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Authorize Discharge</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Authorize Inpatient Discharge
          </h1>
          <p className="text-sm text-slate-500">
            Conclude hospital stay, record clinical outcome condition, author discharge summary, and release bed for housekeeping.
          </p>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{formError}</div>
          </div>
        )}

        {/* Patient & Stay Context Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {patient.name?.first} {patient.name?.middle} {patient.name?.last}
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  UHID: {patient.uhid || 'N/A'} &bull; {patient.gender} &bull; {daysStay} {daysStay === 1 ? 'day stay' : 'days stay'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                Bed {admission.bed?.bedNumber} ({admission.bed?.ward?.name})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Attending Physician</span>
              <strong className="text-slate-800">
                Dr. {admission.attendingDoctor?.name || 'Physician'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Admitting Diagnosis</span>
              <strong className="text-slate-800 truncate block" title={admission.admittingDiagnosis}>
                {admission.admittingDiagnosis}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Admission Date</span>
              <strong className="text-slate-800">
                {admDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </strong>
            </div>
          </div>
        </div>

        {/* Housekeeping Notice Banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong className="font-semibold block">Automatic Bed Turnover Protocol:</strong>
            Authorizing this discharge will automatically release Bed {admission.bed?.bedNumber} and transition its status to <span className="font-bold underline">CLEANING</span> so housekeeping staff can prepare it for the next patient intake.
          </div>
        </div>

        {/* Discharge Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Clinical Discharge Evaluation
            </h2>

            {/* Condition at Discharge */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Patient Condition at Discharge <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    value: DischargeCondition.IMPROVED,
                    label: 'Improved / Stable',
                    desc: 'Condition stabilized; fit for discharge home.',
                  },
                  {
                    value: DischargeCondition.CURED,
                    label: 'Fully Cured',
                    desc: 'Complete resolution of acute illness.',
                  },
                  {
                    value: DischargeCondition.TRANSFERRED,
                    label: 'Transferred Out',
                    desc: 'Transferred to higher level medical facility.',
                  },
                  {
                    value: DischargeCondition.LAMA,
                    label: 'LAMA',
                    desc: 'Left Against Medical Advice by choice.',
                  },
                  {
                    value: DischargeCondition.DECEASED,
                    label: 'Deceased',
                    desc: 'In-hospital clinical mortality confirmed.',
                  },
                ].map((cond) => (
                  <div
                    key={cond.value}
                    onClick={() => setDischargeCondition(cond.value)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      dischargeCondition === cond.value
                        ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs text-slate-900">{cond.label}</strong>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          dischargeCondition === cond.value
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {dischargeCondition === cond.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{cond.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Discharge Summary Narrative */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Clinical Course & Discharge Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={dischargeSummary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                required
                placeholder="Detail patient's response to therapy, surgical procedures, medication changes, and overall clinical trajectory during hospital stay..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Follow-up instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Post-Discharge Instructions & Follow-up Appointment (Optional)
              </label>
              <textarea
                rows={3}
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                placeholder="e.g. Continue Tab Cefixime 200mg BD for 5 days. Report to OPD in 7 days for suture removal. Restrict strenuous physical activity."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link href={`/ipd/admissions/${admissionId}`}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancel & Return</span>
              </button>
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !dischargeSummary.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Authorizing Discharge...' : 'Authorize Discharge & Release Bed'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
