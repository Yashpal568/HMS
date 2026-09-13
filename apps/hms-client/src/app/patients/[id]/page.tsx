'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  Bed,
  Receipt,
  User,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  ShieldCheck,
  Edit3,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Patient,
  ApiResponse,
  AllergySeverity,
} from '@hms/types';
import { PatientHeader } from '@/components/patients/patient-header';

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'demographics' | 'allergies' | 'emr' | 'appointments' | 'ipd' | 'billing'>('demographics');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<Patient>>(`/patients/${patientId}`);
      if (res.success && res.data) {
        setPatient(res.data);
      } else {
        setError(res.error?.message || 'Failed to load patient record.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 404) {
        setError('Patient chart not found. It may have been archived or belongs to another hospital tenant.');
      } else {
        setError(err instanceof Error ? err.message : 'Error connecting to hospital server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!patientId) return;
      try {
        const res = await apiClient.get<ApiResponse<Patient>>(`/patients/${patientId}`);
        if (active) {
          if (res.success && res.data) {
            setPatient(res.data);
          } else {
            setError(res.error?.message || 'Failed to load patient record.');
          }
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof ApiClientError && err.status === 404) {
            setError('Patient chart not found. It may have been archived or belongs to another hospital tenant.');
          } else {
            setError(err instanceof Error ? err.message : 'Error connecting to hospital server.');
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [patientId]);

  const fullName = patient
    ? [patient.name.first, patient.name.middle, patient.name.last].filter(Boolean).join(' ')
    : '';

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppShell
      title={patient ? `${fullName} (${patient.uhid})` : 'Patient Profile'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: patient ? patient.uhid : 'Profile' },
      ]}
    >
      <div className="space-y-6">
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Patient Directory</span>
          </Link>

          {patient && (
            <div className="flex items-center gap-2">
              <Link
                href={`/patients/${patient.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Demographics</span>
              </Link>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-3 animate-spin">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Retrieving Patient Chart</h3>
            <p className="text-xs text-slate-500 mt-1">Verifying cryptographic tenant scope and clinical record</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-sm max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Unable to Load Patient Chart</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={fetchPatient}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Retry Request
              </button>
              <Link
                href="/patients"
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Return to Directory
              </Link>
            </div>
          </div>
        )}

        {/* Loaded Patient Profile View */}
        {patient && !isLoading && (
          <div>
            {/* Header Banner */}
            <PatientHeader patient={patient} />

            {/* Profile Tab Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="flex items-center border-b border-slate-200 px-4 overflow-x-auto gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('demographics')}
                  className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'demographics'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Demographics & Contacts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('allergies')}
                  className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'allergies'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Allergies ({patient.allergies?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`py-3.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'appointments'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Appointments</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">M04</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('emr')}
                  className={`py-3.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'emr'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>EMR Consultations</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">M05</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ipd')}
                  className={`py-3.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'ipd'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bed className="w-4 h-4" />
                  <span>IPD Admissions</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">M06</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`py-3.5 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'billing'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Billing Ledger</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">M10</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {/* Tab 1: Demographics */}
                {activeTab === 'demographics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identification & Personal Details */}
                    <div className="bg-slate-50/75 rounded-xl border border-slate-200 p-5 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
                        <User className="w-4 h-4 text-teal-600" />
                        Personal Identification
                      </h3>

                      <dl className="grid grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <dt className="text-slate-500 font-medium">Full Name</dt>
                          <dd className="text-slate-900 font-semibold mt-0.5">{fullName}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Hospital UHID</dt>
                          <dd className="text-teal-800 font-mono font-bold mt-0.5">{patient.uhid}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Date of Birth</dt>
                          <dd className="text-slate-900 mt-0.5 font-medium">
                            {new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Gender</dt>
                          <dd className="text-slate-900 capitalize mt-0.5">{patient.gender}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Blood Group</dt>
                          <dd className="text-slate-900 font-bold mt-0.5">{patient.bloodGroup || 'Not Specified'}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Marital Status</dt>
                          <dd className="text-slate-900 capitalize mt-0.5">{patient.maritalStatus || 'Not Specified'}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Registered On</dt>
                          <dd className="text-slate-700 mt-0.5">{formatDateTime(patient.createdAt)}</dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Last Chart Update</dt>
                          <dd className="text-slate-700 mt-0.5">{formatDateTime(patient.updatedAt)}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Contact Information & Address */}
                    <div className="bg-slate-50/75 rounded-xl border border-slate-200 p-5 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        Contacts & Residential Address
                      </h3>

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-xs">
                        <div>
                          <dt className="text-slate-500 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Primary Phone
                          </dt>
                          <dd className="text-slate-900 font-mono font-semibold mt-0.5">
                            {patient.contacts?.phone || '-'}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Alternate Phone
                          </dt>
                          <dd className="text-slate-800 font-mono mt-0.5">
                            {patient.contacts?.alternatePhone || 'None recorded'}
                          </dd>
                        </div>

                        <div className="col-span-2">
                          <dt className="text-slate-500 font-medium flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email Address
                          </dt>
                          <dd className="text-slate-800 mt-0.5">
                            {patient.contacts?.email || 'None recorded'}
                          </dd>
                        </div>

                        <div className="col-span-2">
                          <dt className="text-slate-500 font-medium">Street Address</dt>
                          <dd className="text-slate-900 mt-0.5">
                            {patient.contacts?.address?.street || '-'}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">City & State</dt>
                          <dd className="text-slate-900 mt-0.5">
                            {patient.contacts?.address?.city}, {patient.contacts?.address?.state}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-slate-500 font-medium">Postal Code & Country</dt>
                          <dd className="text-slate-900 mt-0.5">
                            {patient.contacts?.address?.postalCode}, {patient.contacts?.address?.country}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Emergency Contact */}
                    <div className="col-span-1 md:col-span-2 bg-slate-50/75 rounded-xl border border-slate-200 p-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200 flex items-center gap-2 mb-3">
                        <HeartPulse className="w-4 h-4 text-rose-600" />
                        Designated Emergency Contact
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 block">Contact Person</span>
                          <strong className="text-slate-900 text-sm">
                            {patient.emergencyContact?.name || '-'}
                          </strong>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Relationship</span>
                          <span className="text-slate-800 font-medium">
                            {patient.emergencyContact?.relationship || '-'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Emergency Phone</span>
                          <strong className="text-slate-900 font-mono text-sm">
                            {patient.emergencyContact?.phone || '-'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Allergies */}
                {activeTab === 'allergies' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Documented Clinical Allergies & Sensitivities
                        </h3>
                        <p className="text-xs text-slate-500">
                          Critical safety alerts for pharmacy dispensing and clinical consultation.
                        </p>
                      </div>

                      <Link
                        href={`/patients/${patient.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Allergies</span>
                      </Link>
                    </div>

                    {!patient.allergies || patient.allergies.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          No Known Drug Allergies (NKDA)
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          No severe adverse drug reactions, food sensitivities, or environmental allergies have been reported for this patient.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {patient.allergies.map((allergy, idx) => {
                          const isSevere = allergy.severity === AllergySeverity.SEVERE;
                          const isModerate = allergy.severity === AllergySeverity.MODERATE;

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border ${
                                isSevere
                                  ? 'bg-red-50/70 border-red-200 ring-1 ring-red-400/20'
                                  : isModerate
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                    isSevere
                                      ? 'bg-red-600 text-white'
                                      : isModerate
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-300 text-slate-800'
                                  }`}
                                >
                                  {allergy.severity} Risk
                                </span>
                                <span className="text-xs font-mono capitalize text-slate-500">
                                  {allergy.category}
                                </span>
                              </div>

                              <div className="text-sm font-bold text-slate-900 mb-1">
                                {allergy.allergen}
                              </div>

                              {allergy.notes ? (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {allergy.notes}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No notes provided</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Appointments (Milestone 04 State) */}
                {activeTab === 'appointments' && (
                  <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <div className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
                      Upcoming Feature • Milestone 04
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      OPD Appointments & Token Queuing
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Consultation booking, doctor time-slot scheduling, live token tracking, and OPD queue management for {fullName} will be available in Milestone 04.
                    </p>
                  </div>
                )}

                {/* Tab 4: EMR (Milestone 05 State) */}
                {activeTab === 'emr' && (
                  <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <div className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                      <Stethoscope className="w-7 h-7" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
                      Upcoming Feature • Milestone 05
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Doctor Consultations & EMR Notes
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      SOAP clinical encounter documentation, vital sign trends, diagnostic orders, and digital prescriptions for {fullName} will be available in Milestone 05.
                    </p>
                  </div>
                )}

                {/* Tab 5: IPD Admissions (Milestone 06 State) */}
                {activeTab === 'ipd' && (
                  <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <div className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                      <Bed className="w-7 h-7" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
                      Upcoming Feature • Milestone 06
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Inpatient Admissions & Ward Management
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      IPD bed allocation, nursing intake, clinical rounds notes, and discharge summaries for {fullName} will be available in Milestone 06.
                    </p>
                  </div>
                )}

                {/* Tab 6: Billing (Milestone 10 State) */}
                {activeTab === 'billing' && (
                  <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <div className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-7 h-7" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
                      Upcoming Feature • Milestone 10
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Patient Invoices & Payment Ledger
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Itemized hospital charge sheets, insurance claim processing, and receipt generation for {fullName} will be available in Milestone 10.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
