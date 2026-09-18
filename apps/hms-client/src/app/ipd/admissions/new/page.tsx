'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bed,
  ChevronRight,
  Search,
  User,
  AlertTriangle,
  Stethoscope,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Patient,
  AdmissionSource,
  AllergySeverity,
  Ward,
  Bed as BedType,
  BedStatus,
} from '@hms/types';

function AdmissionWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPatientId = searchParams.get('patientId');
  const prefilledBedId = searchParams.get('bedId');
  const prefilledWardId = searchParams.get('wardId');

  // Patient Search & Selection
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form Fields
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState(prefilledWardId || '');
  const [beds, setBeds] = useState<any[]>([]);
  const [selectedBedId, setSelectedBedId] = useState(prefilledBedId || '');
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('');
  const [admissionSource, setAdmissionSource] = useState<AdmissionSource>(
    AdmissionSource.OPD_REFERRAL,
  );

  // Status
  const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load prereqs: doctors, wards, available beds
  const loadPrereqs = useCallback(async () => {
    setIsLoadingPrereqs(true);
    try {
      const [doctorsRes, wardsRes, bedsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>('/appointments/doctors'),
        apiClient.get<{ success: boolean; data: Ward[] }>('/ipd/wards'),
        apiClient.get<{ success: boolean; data: any[] }>('/ipd/beds?status=available'),
      ]);

      if (doctorsRes.success && doctorsRes.data) {
        setDoctors(doctorsRes.data);
        if (doctorsRes.data.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(doctorsRes.data[0].id);
        }
      }

      if (wardsRes.success && wardsRes.data) {
        setWards(wardsRes.data);
        if (wardsRes.data.length > 0 && !selectedWardId && !prefilledWardId) {
          setSelectedWardId(wardsRes.data[0]._id || wardsRes.data[0].id);
        }
      }

      if (bedsRes.success && bedsRes.data) {
        setBeds(bedsRes.data);
      }
    } catch (err) {
      console.error('Error loading admission prerequisites:', err);
    } finally {
      setIsLoadingPrereqs(false);
    }
  }, [prefilledWardId, selectedDoctorId, selectedWardId]);

  useEffect(() => {
    loadPrereqs();
  }, [loadPrereqs]);

  // Load prefilled patient if ID provided
  useEffect(() => {
    if (prefilledPatientId) {
      const loadPrefilled = async () => {
        try {
          const res = await apiClient.get<{ success: boolean; data: Patient }>(
            `/patients/${prefilledPatientId}`,
          );
          if (res.success && res.data) {
            setSelectedPatient(res.data);
          }
        } catch (err) {
          console.error('Failed to load prefilled patient:', err);
        }
      };
      loadPrefilled();
    }
  }, [prefilledPatientId]);

  // Patient search handler
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchTerm.trim()) return;

    setIsSearchingPatient(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: Patient[] }>(
        `/patients?search=${encodeURIComponent(patientSearchTerm.trim())}&limit=5`,
      );
      if (res.success && res.data) {
        setPatientSearchResults(res.data);
      }
    } catch (err) {
      console.error('Patient search error:', err);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Beds filtered by chosen Ward
  const availableBedsInWard = beds.filter(
    (b) =>
      !selectedWardId ||
      b.wardId === selectedWardId ||
      b.ward?._id === selectedWardId ||
      b.ward?.id === selectedWardId,
  );

  // Severe allergies check
  const severeAllergies = (selectedPatient?.allergies || []).filter(
    (a) => a.severity === AllergySeverity.SEVERE,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFormError('Please search and select a patient first.');
      return;
    }
    if (!selectedDoctorId) {
      setFormError('Please select an attending doctor.');
      return;
    }
    if (!selectedBedId) {
      setFormError('Please select an available hospital bed.');
      return;
    }
    if (!admittingDiagnosis.trim()) {
      setFormError('Admitting diagnosis is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/ipd/admissions', {
        patientId: selectedPatient.id || (selectedPatient as any)._id,
        attendingDoctorId: selectedDoctorId,
        bedId: selectedBedId,
        admittingDiagnosis: admittingDiagnosis.trim(),
        admissionSource,
      });

      if (res.success && res.data) {
        const admissionId =
          res.data.id ||
          res.data._id ||
          res.data.admission?.id ||
          res.data.admission?._id;
        router.push(`/ipd/admissions/${admissionId}`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create IPD admission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/ipd" className="hover:text-teal-700 transition-colors">
            IPD
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">New Admission</span>
        </div>

        {/* Title */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inpatient Admission Intake
          </h1>
          <p className="text-sm text-slate-500">
            Admit a patient to the Inpatient Department and reserve an available bed.
          </p>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Patient Selection */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Select Patient for Admission
                </h2>
              </div>

              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearchResults([]);
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Change Patient
                </button>
              )}
            </div>

            {!selectedPatient ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      placeholder="Search patient by UHID, full name, or phone number..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchPatient}
                    disabled={isSearchingPatient || !patientSearchTerm.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isSearchingPatient ? 'Searching...' : 'Find Patient'}
                  </button>
                </div>

                {patientSearchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                    {patientSearchResults.map((pat) => (
                      <div
                        key={pat.id || (pat as any)._id}
                        onClick={() => {
                          setSelectedPatient(pat);
                          setPatientSearchResults([]);
                        }}
                        className="p-3 flex items-center justify-between hover:bg-teal-50/60 cursor-pointer transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 text-xs">
                            {pat.name.first} {pat.name.middle} {pat.name.last}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono font-bold text-teal-700">
                              {pat.uhid}
                            </span>
                            <span>&bull;</span>
                            <span className="capitalize">{pat.gender}</span>
                            <span>&bull;</span>
                            <span>Phone: {pat.contacts?.phone || 'N/A'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-teal-200 text-teal-700 shadow-2xs"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Severe Allergy Warning Ribbon */}
                {severeAllergies.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-900 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      High Clinical Alert: Patient has documented severe allergy risks (
                      {severeAllergies.map((a) => a.allergen).join(', ')})
                    </span>
                  </div>
                )}

                {/* Selected Patient Card */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {selectedPatient.name.first} {selectedPatient.name.middle}{' '}
                        {selectedPatient.name.last}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                        <span className="font-mono font-bold text-teal-800">
                          UHID: {selectedPatient.uhid}
                        </span>
                        <span>&bull;</span>
                        <span className="capitalize">{selectedPatient.gender}</span>
                        <span>&bull;</span>
                        <span>Blood: {selectedPatient.bloodGroup || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Patient
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Admission & Clinical Allocation */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Ward, Bed & Clinical Allocation
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Attending Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Attending Physician <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">-- Choose Attending Physician --</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.department || 'Clinician'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admission Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admission Source <span className="text-rose-500">*</span>
                </label>
                <select
                  value={admissionSource}
                  onChange={(e) => setAdmissionSource(e.target.value as AdmissionSource)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value={AdmissionSource.EMERGENCY}>Emergency Department</option>
                  <option value={AdmissionSource.OPD_REFERRAL}>Outpatient Clinic Referral</option>
                  <option value={AdmissionSource.ELECTIVE_TRANSFER}>Elective / Planned Transfer</option>
                </select>
              </div>

              {/* Ward Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Ward <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedWardId}
                    onChange={(e) => {
                      setSelectedWardId(e.target.value);
                      setSelectedBedId(''); // reset bed on ward change
                    }}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">-- Select Ward --</option>
                    {wards.map((w) => (
                      <option key={w._id || w.id} value={w._id || w.id}>
                        {w.name} ({w.code}) &bull; {w.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bed Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Available Bed <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Bed className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    required
                    disabled={!selectedWardId || availableBedsInWard.length === 0}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {!selectedWardId
                        ? '-- Choose Ward First --'
                        : availableBedsInWard.length === 0
                        ? '-- No Available Beds in this Ward --'
                        : '-- Select an Available Bed --'}
                    </option>
                    {availableBedsInWard.map((b) => (
                      <option key={b._id || b.id} value={b._id || b.id}>
                        Bed {b.bedNumber} (Floor {b.floor || 1})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admitting Diagnosis */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Admitting Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={admittingDiagnosis}
                  onChange={(e) => setAdmittingDiagnosis(e.target.value)}
                  required
                  placeholder="e.g. Acute Gastroenteritis with Moderate Dehydration, Severe Pneumonia, Post-op Recovery..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link href="/ipd">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancel & Back</span>
              </button>
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !selectedPatient || !selectedBedId || !admittingDiagnosis.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Admitting Patient...' : 'Authorize Inpatient Admission'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewAdmissionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading admission wizard...</div>}>
      <AdmissionWizardContent />
    </Suspense>
  );
}
