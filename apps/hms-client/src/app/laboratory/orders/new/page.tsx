'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FlaskConical,
  ArrowLeft,
  User,
  Search,
  Check,
  AlertCircle,
  Clock,
  AlertTriangle,
  Stethoscope,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  LabOrderPriority,
  LabTest,
  PatientSummary,
  DoctorUserSummary,
} from '@hms/types';

function NewLabOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  // Form states
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<LabOrderPriority>(LabOrderPriority.ROUTINE);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // Search & Master lists
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [testCatalog, setTestCatalog] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load initial catalog & doctors
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [testsRes, docsRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: any[] }>('/lab/tests'),
          apiClient.get<{ success: boolean; data: any[] }>('/appointments/doctors'),
        ]);

        if (testsRes.success && testsRes.data) {
          setTestCatalog(testsRes.data);
        }
        if (docsRes.success && docsRes.data) {
          setDoctors(docsRes.data);
          if (docsRes.data.length > 0) {
            setSelectedDoctorId(docsRes.data[0]._id || docsRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors and tests metadata:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // Pre-load patient if provided via URL
  useEffect(() => {
    if (!preselectedPatientId) return;

    async function loadPatient() {
      try {
        const res = await apiClient.get<{ success: boolean; data: any }>(
          `/patients/${preselectedPatientId}`,
        );
        if (res.success && res.data) {
          setSelectedPatient(res.data);
        }
      } catch (err) {
        console.error('Failed to load preselected patient:', err);
      }
    }
    loadPatient();
  }, [preselectedPatientId]);

  // Patient Search Handler
  const handleSearchPatients = useCallback(async (q: string) => {
    setPatientSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingPatients(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>(
        `/patients?search=${encodeURIComponent(q.trim())}&limit=5`,
      );
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (err) {
      console.error('Patient search failed:', err);
    } finally {
      setIsSearchingPatients(false);
    }
  }, []);

  // Toggle Test selection
  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id],
    );
  };

  // Calculate tariff total
  const selectedTests = testCatalog.filter((t) =>
    selectedTestIds.includes(t._id || t.id),
  );
  const totalTariff = selectedTests.reduce(
    (sum, t) => sum + (t.tariffPrice || 0),
    0,
  );

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPatient) {
      setSubmitError('Please search and select a patient for this requisition.');
      return;
    }

    if (!selectedDoctorId) {
      setSubmitError('Please select the ordering attending doctor.');
      return;
    }

    if (selectedTestIds.length === 0) {
      setSubmitError('Please select at least one diagnostic test to requisition.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient._id || selectedPatient.id,
        doctorId: selectedDoctorId,
        testIds: selectedTestIds,
        priority,
        clinicalNotes: clinicalNotes.trim() || undefined,
      };

      const res = await apiClient.post<{ success: boolean; data: any }>(
        '/lab/orders',
        payload,
      );

      if (res.success && res.data) {
        router.push('/laboratory');
      } else {
        throw new Error('Failed to create laboratory requisition.');
      }
    } catch (err: any) {
      console.error('Error creating lab order:', err);
      setSubmitError(
        err?.message || 'Server rejected laboratory order creation.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Laboratory', href: '/laboratory' },
        { label: 'New Electronic Requisition' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/laboratory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel and Return to Dashboard</span>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-teal-600" />
            Electronic Laboratory Requisition
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Order outpatient or inpatient laboratory tests, set priority turnaround times, and route to phlebotomy accessioning.
          </p>
        </div>

        {/* Submit Error Banner */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-xs text-red-700">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Patient Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-teal-600" />
              1. Patient Identification
            </h2>

            {selectedPatient ? (
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedPatient.name?.first?.[0] || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedPatient.name?.first} {selectedPatient.name?.last}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 text-teal-800">
                        {selectedPatient.uhid}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="capitalize">{selectedPatient.gender}</span>
                      <span>•</span>
                      <span>Phone: {selectedPatient.contacts?.phone || '-'}</span>
                      {selectedPatient.bloodGroup && selectedPatient.bloodGroup !== 'unknown' && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-rose-600">
                            Blood Group: {selectedPatient.bloodGroup}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
                >
                  Change Patient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search patient by UHID, full name, or phone number..."
                    value={patientSearchQuery}
                    onChange={(e) => handleSearchPatients(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {isSearchingPatients && (
                    <RefreshCw className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-xs max-h-48 overflow-y-auto">
                    {searchResults.map((p) => (
                      <div
                        key={p._id || p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchResults([]);
                          setPatientSearchQuery('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedPatient(p);
                            setSearchResults([]);
                            setPatientSearchQuery('');
                          }
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            {p.name?.first} {p.name?.last}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono text-[11px]">
                            {p.uhid}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-teal-600">
                          Select Patient &rarr;
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Severe Allergy Warning if Present */}
            {selectedPatient?.allergies &&
              selectedPatient.allergies.some(
                (a: any) => a.severity === 'severe',
              ) && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
                  <span>
                    Clinical Safety Notice: Patient has documented severe allergy risks (
                    {selectedPatient.allergies
                      .filter((a: any) => a.severity === 'severe')
                      .map((a: any) => a.allergen)
                      .join(', ')}
                    ). Handle venipuncture & sterile swabs with caution.
                  </span>
                </div>
              )}
          </div>

          {/* Section 2: Clinical Details & Priority */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              2. Ordering Physician & Order Priority
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ordering Attending Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="" disabled>
                    Select Attending Clinician...
                  </option>
                  {doctors.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      Dr. {d.name} ({d.department || 'General Medicine'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requisition Turnaround Priority *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority(LabOrderPriority.ROUTINE)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      priority === LabOrderPriority.ROUTINE
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Routine
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority(LabOrderPriority.URGENT)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      priority === LabOrderPriority.URGENT
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    Urgent
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority(LabOrderPriority.STAT)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      priority === LabOrderPriority.STAT
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs animate-pulse'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    STAT Emergency
                  </button>
                </div>
              </div>
            </div>

            {priority === LabOrderPriority.STAT && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>STAT Notice:</strong> Emergency immediate turnaround. Specimen collection and critical analysis will be flagged for immediate processing at technician bench.
                </span>
              </div>
            )}

            {/* Clinical Indication Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Indication / Diagnostic Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Reason for investigation, provisional diagnosis, or specific parameters to correlate..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Section 3: Test Selection Catalog */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                3. Select Diagnostic Investigations
              </h2>
              <span className="text-xs font-semibold text-teal-700">
                {selectedTestIds.length} test(s) selected
              </span>
            </div>

            {isLoadingMeta ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                <span>Loading available diagnostic tests...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {testCatalog.map((test) => {
                  const testId = test._id || test.id;
                  const isSelected = selectedTestIds.includes(testId);

                  return (
                    <div
                      key={testId}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleTest(testId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggleTest(testId);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center mt-0.5 transition-colors ${
                            isSelected
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">
                              {test.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                              {test.code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Specimen: {test.specimenType}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {test.parameters?.length || 0} parameter(s)
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-xs text-slate-900 shrink-0">
                        ₹{test.tariffPrice}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Summary Card */}
            {selectedTests.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Requisition Summary
                  </span>
                  <span className="text-xs text-slate-500">
                    {selectedTests.map((t) => t.code).join(', ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Total Tariff
                  </span>
                  <span className="text-base font-bold text-teal-700 font-mono">
                    ₹{totalTariff}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Submission Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/laboratory">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || selectedTestIds.length === 0 || !selectedPatient}
              className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Electronic Requisition</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewLabOrderPage() {
  return (
    <Suspense
      fallback={
        <AppShell breadcrumbs={[{ label: 'Laboratory', href: '/laboratory' }, { label: 'New Electronic Requisition' }]}>
          <div className="p-12 text-center text-slate-400">Loading requisition wizard...</div>
        </AppShell>
      }
    >
      <NewLabOrderContent />
    </Suspense>
  );
}
