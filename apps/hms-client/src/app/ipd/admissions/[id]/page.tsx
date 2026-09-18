'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bed,
  ArrowLeft,
  ChevronRight,
  User,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  X,
  RefreshCw,
  Building,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { AllergySeverity, BedStatus } from '@hms/types';

export default function InpatientStayChartPage() {
  const params = useParams();
  const router = useRouter();
  const admissionId = params?.id as string;

  const [admission, setAdmission] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [destinationBedId, setDestinationBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

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
      }
    } catch (err) {
      console.error('Failed to load admission chart:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve inpatient record.');
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    fetchAdmission();
  }, [fetchAdmission]);

  // Open Transfer Modal & fetch available beds
  const openTransferModal = async () => {
    setTransferError(null);
    setDestinationBedId('');
    setTransferReason('');
    setTransferModalOpen(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/ipd/beds?status=available');
      if (res.success && res.data) {
        // Filter out current bed
        setAvailableBeds(
          res.data.filter((b) => (b._id || b.id) !== admission?.bed?.id),
        );
      }
    } catch (err) {
      console.error('Failed to load available beds:', err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationBedId) return;

    setIsSubmittingTransfer(true);
    setTransferError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/ipd/admissions/${admissionId}/transfer`,
        {
          destinationBedId,
          reason: transferReason.trim() || 'Clinical condition progression / step-down',
        },
      );

      if (res.success) {
        setTransferModalOpen(false);
        fetchAdmission(); // Refresh stay chart with new bed & timeline
      }
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Bed transfer failed.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
          Loading inpatient clinical stay chart...
        </div>
      </AppShell>
    );
  }

  if (error || !admission) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Inpatient Record Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || 'The requested admission record could not be located.'}
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
  const isAdmitted = admission.status === 'admitted';
  const severeAllergies = (patient.allergies || []).filter(
    (a: any) => a.severity === AllergySeverity.SEVERE,
  );

  const admDate = new Date(admission.admissionDate);
  const daysStay = Math.max(
    1,
    Math.ceil((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/ipd" className="hover:text-teal-700 transition-colors">
              IPD
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/ipd" className="hover:text-teal-700 transition-colors">
              Admissions
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-slate-900">
              {admission.admissionNumber}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdmission}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {isAdmitted && (
              <>
                <button
                  onClick={openTransferModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span>Transfer Bed</span>
                </button>

                <Link href={`/ipd/admissions/${admissionId}/discharge`}>
                  <button className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-2xs">
                    Authorize Discharge
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Severe Allergy Warning */}
        {severeAllergies.length > 0 && (
          <div className="bg-red-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
            <span>
              Clinical High-Risk Alert: Patient has documented severe allergies (
              {severeAllergies.map((a: any) => a.allergen).join(', ')})
            </span>
          </div>
        )}

        {/* Patient Identity & Demographic Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/10 shrink-0">
              <User className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  {patient.name?.first} {patient.name?.middle} {patient.name?.last}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    isAdmitted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAdmitted ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {admission.status}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-teal-800 border border-slate-200">
                  UHID: {patient.uhid || 'N/A'}
                </span>
                <span>&bull;</span>
                <span className="capitalize">{patient.gender || 'Unknown'}</span>
                <span>&bull;</span>
                <span>Blood: {patient.bloodGroup || 'Unknown'}</span>
                {patient.contacts?.phone && (
                  <>
                    <span>&bull;</span>
                    <span>Phone: {patient.contacts.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Link href={`/patients/${admission.patientId}`}>
            <button className="px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs">
              View Patient Profile &rarr;
            </button>
          </Link>
        </div>

        {/* Stay Summary Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Active Bed Allocation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Current Bed Location
            </span>
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-teal-600" />
              <div className="font-bold text-slate-900 text-base">
                Bed {admission.bed?.bedNumber || 'Assigned'}
              </div>
            </div>
            <span className="text-xs text-slate-500 block">
              {admission.bed?.ward?.name || 'Ward'} (Floor {admission.bed?.ward?.floor || 1})
            </span>
          </div>

          {/* Attending Physician */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Attending Physician
            </span>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <div className="font-bold text-slate-900 text-sm truncate">
                Dr. {admission.attendingDoctor?.name || 'Clinician'}
              </div>
            </div>
            <span className="text-xs text-slate-500 block truncate">
              {admission.attendingDoctor?.specialization || 'Clinical Specialist'}
            </span>
          </div>

          {/* Admission Date & Length of Stay */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Stay Duration
            </span>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <div className="font-bold text-slate-900 text-base font-mono">
                {daysStay} {daysStay === 1 ? 'Day' : 'Days'}
              </div>
            </div>
            <span className="text-xs text-slate-500 block">
              Admitted: {admDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Admission Source */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Intake Route
            </span>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-teal-600" />
              <div className="font-bold text-slate-900 text-sm capitalize">
                {admission.admissionSource?.replace('_', ' ') || 'OPD Referral'}
              </div>
            </div>
            <span className="text-xs text-slate-500 block">
              Ref: {admission.admissionNumber}
            </span>
          </div>
        </div>

        {/* Admitting Diagnosis Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Admitting Clinical Diagnosis
          </h2>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium leading-relaxed">
            {admission.admittingDiagnosis}
          </div>
        </div>

        {/* Bed Allocation & Stay History Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bed Allocation & Stay Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Chronological record of hospital ward locations, transfers, and bed stays.
              </p>
            </div>

            {isAdmitted && (
              <button
                onClick={openTransferModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-2xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer Bed</span>
              </button>
            )}
          </div>

          {admission.allocations && admission.allocations.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {admission.allocations.map((alloc: any, idx: number) => {
                const isCurrent = !alloc.releasedAt;
                const allocDate = new Date(alloc.allocatedAt);
                const relDate = alloc.releasedAt ? new Date(alloc.releasedAt) : null;

                return (
                  <div key={alloc.id || idx} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-white ${
                        isCurrent
                          ? 'border-emerald-600 bg-emerald-500 shadow-sm shadow-emerald-500/30 ring-4 ring-emerald-100'
                          : 'border-slate-400 bg-slate-200'
                      }`}
                    />

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Bed {alloc.bed?.bedNumber || 'Assigned'}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({alloc.bed?.ward?.name || 'Ward'})
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">
                              Active Location
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          {allocDate.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {relDate && (
                            <span>
                              {' '}
                              &rarr;{' '}
                              {relDate.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {alloc.transferReason && (
                        <div className="text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                          <strong className="text-slate-700">Transfer Reason:</strong>{' '}
                          {alloc.transferReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No bed allocation history recorded.
            </div>
          )}
        </div>

        {/* Discharge Summary (if discharged) */}
        {!isAdmitted && admission.dischargeSummary && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Authorized Inpatient Discharge Summary
                </h2>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                Condition: {admission.dischargeSummary.condition}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-1">
                  Discharge Date & Time:
                </span>
                <span className="text-slate-800 font-medium">
                  {admission.dischargeDate
                    ? new Date(admission.dischargeDate).toLocaleString()
                    : 'N/A'}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">
                  Clinical Course & Discharge Narrative:
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {admission.dischargeSummary.narrative}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Internal Bed Transfer Modal */}
        {transferModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Transfer Inpatient Bed
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {admission.admissionNumber}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Bed:</span>
                    <strong className="text-rose-700 font-mono">
                      Bed {admission.bed?.bedNumber} ({admission.bed?.ward?.name})
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    Notice: Current bed will transition to{' '}
                    <strong className="text-amber-600">cleaning</strong> status for housekeeping turnover.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Destination Bed <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={destinationBedId}
                    onChange={(e) => setDestinationBedId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">-- Select an Available Bed --</option>
                    {availableBeds.map((b) => (
                      <option key={b._id || b.id} value={b._id || b.id}>
                        {b.ward?.name || 'Ward'} &bull; Bed {b.bedNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Clinical Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    required
                    placeholder="e.g. Stepped down to general medicine ward, isolation protocol, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTransfer || !destinationBedId}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isSubmittingTransfer ? 'Transferring...' : 'Execute Bed Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
