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
  Clock,
  CheckCircle2,
  PlayCircle,
  Plus,
  FlaskConical,
  Pill,
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
  const [activeTab, setActiveTab] = useState<'demographics' | 'allergies' | 'emr' | 'appointments' | 'ipd' | 'lab' | 'pharmacy' | 'billing'>('demographics');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emrHistory, setEmrHistory] = useState<any[]>([]);
  const [loadingEmr, setLoadingEmr] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const fetchEmrHistory = useCallback(async () => {
    if (!patientId) return;
    setLoadingEmr(true);
    try {
      const res = await apiClient.get<any>(`/emr/patients/${patientId}/history`);
      if (res.success && res.data) {
        setEmrHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient EMR history:', err);
    } finally {
      setLoadingEmr(false);
    }
  }, [patientId]);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    setLoadingAppointments(true);
    try {
      const res = await apiClient.get<any>(`/appointments?patientId=${patientId}`);
      if (res.success && res.data) {
        setAppointments(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [patientId]);

  const fetchAdmissions = useCallback(async () => {
    if (!patientId) return;
    setLoadingAdmissions(true);
    try {
      const res = await apiClient.get<any>(`/ipd/admissions?patientId=${patientId}`);
      if (res.success && res.data) {
        setAdmissions(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient admissions:', err);
    } finally {
      setLoadingAdmissions(false);
    }
  }, [patientId]);

  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [loadingLabOrders, setLoadingLabOrders] = useState(false);

  const fetchLabOrders = useCallback(async () => {
    if (!patientId) return;
    setLoadingLabOrders(true);
    try {
      const res = await apiClient.get<any>(`/lab/orders?patientId=${patientId}`);
      if (res.success && res.data) {
        setLabOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient lab orders:', err);
    } finally {
      setLoadingLabOrders(false);
    }
  }, [patientId]);

  const fetchPrescriptions = useCallback(async () => {
    if (!patientId) return;
    setLoadingPrescriptions(true);
    try {
      const res = await apiClient.get<any>(`/pharmacy/prescriptions?patientId=${patientId}&status=all`);
      if (res.success && res.data) {
        setPrescriptions(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient prescriptions:', err);
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeTab === 'emr') {
      fetchEmrHistory();
    }
  }, [activeTab, fetchEmrHistory]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    }
  }, [activeTab, fetchAppointments]);

  useEffect(() => {
    if (activeTab === 'ipd') {
      fetchAdmissions();
    }
  }, [activeTab, fetchAdmissions]);

  useEffect(() => {
    if (activeTab === 'lab') {
      fetchLabOrders();
    }
  }, [activeTab, fetchLabOrders]);

  useEffect(() => {
    if (activeTab === 'pharmacy') {
      fetchPrescriptions();
    }
  }, [activeTab, fetchPrescriptions]);

  useEffect(() => {
    if (patientId) {
      fetchAppointments();
      fetchEmrHistory();
      fetchAdmissions();
      fetchLabOrders();
      fetchPrescriptions();
    }
  }, [patientId, fetchAppointments, fetchEmrHistory, fetchAdmissions, fetchLabOrders, fetchPrescriptions]);

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
              <div className="flex items-center border-b border-slate-200 px-2 sm:px-3 overflow-x-auto gap-0.5 sm:gap-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('demographics')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'demographics'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>Demographics</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('allergies')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'allergies'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Allergies</span>
                  {patient.allergies && patient.allergies.length > 0 && (
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full font-semibold">
                      {patient.allergies.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'appointments'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>Appointments</span>
                  {appointments.length > 0 && (
                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded-full font-semibold">
                      {appointments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('emr')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'emr'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  <span>Consults</span>
                  {emrHistory.length > 0 && (
                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded-full font-semibold">
                      {emrHistory.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ipd')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'ipd'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bed className="w-3.5 h-3.5 text-emerald-600" />
                  <span>IPD Stays</span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono">M06</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('lab')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'lab'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span>Lab & Tests</span>
                  {labOrders.length > 0 && (
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded-full font-semibold">
                      {labOrders.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pharmacy')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'pharmacy'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pharmacy & Rx</span>
                  {prescriptions.length > 0 && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full font-semibold">
                      {prescriptions.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`py-2.5 px-2 sm:px-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'billing'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/20'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Billing</span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono">M10</span>
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

                {/* Tab 3: Outpatient Appointments & Tokens */}
                {activeTab === 'appointments' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Outpatient Appointments & Token Queue
                        </h3>
                        <p className="text-xs text-slate-500">
                          Scheduled visits, consultation tokens, and clinic queue status for {fullName}.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchAppointments}
                          disabled={loadingAppointments}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAppointments ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </button>
                        <Link href={`/appointments/book?patientId=${patientId}`}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Book Appointment</span>
                          </button>
                        </Link>
                      </div>
                    </div>

                    {loadingAppointments ? (
                      <div className="space-y-3">
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          No Appointments Scheduled
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          There are currently no outpatient appointments booked for {fullName}.
                        </p>
                        <Link href={`/appointments/book?patientId=${patientId}`}>
                          <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Book First Appointment
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments.map((apt: any) => {
                          const appointmentId = apt._id || apt.id;
                          const isToday = apt.scheduledAt === new Date().toISOString().split('T')[0];

                          return (
                            <div
                              key={appointmentId}
                              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-3.5">
                                {/* Token Box */}
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
                                  <span className="text-[9px] uppercase font-bold tracking-wider">Token</span>
                                  <span className="text-sm font-extrabold leading-tight">
                                    #{apt.tokenNumber}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-slate-900">
                                      {apt.department}
                                    </span>
                                    <span
                                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        apt.status === 'COMPLETED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : apt.status === 'IN_CONSULTATION'
                                          ? 'bg-amber-100 text-amber-800'
                                          : apt.status === 'CHECKED_IN'
                                          ? 'bg-teal-100 text-teal-800'
                                          : apt.status === 'CANCELLED'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {apt.status?.replace('_', ' ')}
                                    </span>
                                    {isToday && (
                                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                                        Today
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                    <span className="flex items-center gap-1 font-medium">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {new Date(apt.scheduledAt).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    <span className="flex items-center gap-1 font-medium">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {apt.timeSlot}
                                    </span>
                                    <span>
                                      Clinician: {apt.doctor?.name ? (apt.doctor.name.startsWith('Dr.') ? apt.doctor.name : `Dr. ${apt.doctor.name}`) : 'Attending Physician'}
                                    </span>
                                  </div>

                                  {apt.chiefComplaint && (
                                    <p className="text-xs text-slate-600 italic">
                                      &ldquo;{apt.chiefComplaint}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {apt.status === 'CHECKED_IN' || apt.status === 'IN_CONSULTATION' ? (
                                  <Link href={`/emr/consultation/${appointmentId}`}>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                      <span>Consultation Cockpit</span>
                                    </button>
                                  </Link>
                                ) : apt.status === 'COMPLETED' ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('emr')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>View EMR Record</span>
                                  </button>
                                ) : (
                                  <Link href="/appointments">
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                      View on OPD Board
                                    </button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: EMR (Real Clinical History) */}
                {activeTab === 'emr' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Clinical Encounter History & Prescriptions
                        </h3>
                        <p className="text-xs text-slate-500">
                          Chronological medical records, vitals observations, ICD-10 diagnoses, and prescription orders.
                        </p>
                      </div>

                      <button
                        onClick={fetchEmrHistory}
                        disabled={loadingEmr}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingEmr ? 'animate-spin' : ''}`} />
                        <span>Refresh EMR</span>
                      </button>
                    </div>

                    {loadingEmr ? (
                      <div className="space-y-3">
                        <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                      </div>
                    ) : emrHistory.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          No Clinical Encounters Documented
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          No doctor consultations have been recorded for {fullName} yet. Encounters will be created during outpatient visits.
                        </p>
                        <Link href="/appointments/book">
                          <button className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors">
                            Book Outpatient Consultation
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {emrHistory.map((enc: any) => (
                          <div
                            key={enc._id || enc.id}
                            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                                  {new Date(enc.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">
                                  Attending: Dr. {enc.doctor ? enc.doctor.name : 'Attending Physician'}
                                </span>
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    enc.status === 'finalized'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {enc.status}
                                </span>
                              </div>

                              <Link href={`/emr/consultation/${enc.appointmentId}`}>
                                <span className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer">
                                  View Full Consultation &rarr;
                                </span>
                              </Link>
                            </div>

                            {/* Complaints */}
                            {enc.chiefComplaints && enc.chiefComplaints.length > 0 && (
                              <div className="text-xs">
                                <span className="text-slate-500 font-medium mr-2">Chief Complaints:</span>
                                <span className="text-slate-800 font-semibold">
                                  {enc.chiefComplaints.join(', ')}
                                </span>
                              </div>
                            )}

                            {/* Diagnoses */}
                            {enc.diagnoses && enc.diagnoses.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="text-slate-500 font-medium">Diagnoses:</span>
                                {enc.diagnoses.map((d: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-medium border border-teal-100"
                                  >
                                    [{d.code}] {d.description}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Vitals Summary */}
                            {enc.vitals && (enc.vitals.bpSystolic || enc.vitals.pulse || enc.vitals.bmi) && (
                              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                {enc.vitals.bpSystolic && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
                                    <strong className="text-slate-700">{enc.vitals.bpSystolic}/{enc.vitals.bpDiastolic || '-'} mmHg</strong>
                                  </div>
                                )}
                                {enc.vitals.pulse && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Pulse</span>
                                    <strong className="text-slate-700">{enc.vitals.pulse} bpm</strong>
                                  </div>
                                )}
                                {enc.vitals.temperature && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Temp</span>
                                    <strong className="text-slate-700">{enc.vitals.temperature} °F</strong>
                                  </div>
                                )}
                                {enc.vitals.bmi && (
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">BMI</span>
                                    <strong className="text-slate-700">{enc.vitals.bmi} ({enc.vitals.bmiCategory})</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Prescribed Medications */}
                            {enc.prescription?.items && enc.prescription.items.length > 0 && (
                              <div className="text-xs space-y-1">
                                <span className="text-slate-500 font-medium block">Prescription (Rx):</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {enc.prescription.items.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                                    >
                                      <div>
                                        <strong className="text-slate-800">{item.medicineName} {item.strength}</strong>
                                        <span className="text-[11px] text-slate-500 block">
                                          {item.frequency} &bull; {item.durationDays} days &bull; {item.instructions}
                                        </span>
                                      </div>
                                      <span className="text-slate-500 text-[11px] uppercase font-mono">
                                        Qty: {item.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5: IPD Admissions (Live Inpatient Stays) */}
                {activeTab === 'ipd' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Inpatient Department (IPD) Admissions & Bed History
                        </h3>
                        <p className="text-xs text-slate-500">
                          Complete record of hospital admissions, bed allocations, stay duration, and discharge summaries.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={fetchAdmissions}
                          disabled={loadingAdmissions}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAdmissions ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </button>

                        <Link href={`/ipd/admissions/new?patientId=${patientId}`}>
                          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Admit to IPD</span>
                          </button>
                        </Link>
                      </div>
                    </div>

                    {loadingAdmissions ? (
                      <div className="space-y-3">
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                      </div>
                    ) : admissions.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Bed className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          No Inpatient Stays on Record
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          {fullName} has no active or past inpatient admissions recorded at this hospital.
                        </p>
                        <Link href={`/ipd/admissions/new?patientId=${patientId}`}>
                          <button className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors">
                            Initiate IPD Admission
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {admissions.map((adm: any) => {
                          const isAdmitted = adm.status === 'admitted';
                          return (
                            <div
                              key={adm._id || adm.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-slate-900">
                                    {adm.admissionNumber}
                                  </span>
                                  <span
                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                      isAdmitted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {adm.status}
                                  </span>
                                  <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {adm.ward?.name || 'Ward'} &bull; Bed {adm.bed?.bedNumber || adm.bedNumber || 'N/A'}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>
                                    <strong className="text-slate-700">Diagnosis:</strong> {adm.admittingDiagnosis}
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    <strong className="text-slate-700">Source:</strong> <span className="capitalize">{adm.admissionSource}</span>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    <strong className="text-slate-700">Admitted:</strong>{' '}
                                    {new Date(adm.admissionDate).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Link href={`/ipd/admissions/${adm._id || adm.id}`}>
                                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                                    Stay Chart &rarr;
                                  </button>
                                </Link>
                                {isAdmitted && (
                                  <Link href={`/ipd/admissions/${adm._id || adm.id}/discharge`}>
                                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors">
                                      Discharge
                                    </button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 5.5: Laboratory Investigations */}
                {activeTab === 'lab' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-purple-600" />
                          Diagnostic Requisitions & Verified Reports
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Electronic orders, phlebotomy specimen accessioning, and signed clinical pathology reports.
                        </p>
                      </div>

                      <Link href={`/laboratory/orders/new?patientId=${patientId}`}>
                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Requisition</span>
                        </button>
                      </Link>
                    </div>

                    {loadingLabOrders ? (
                      <div className="space-y-3">
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                      </div>
                    ) : labOrders.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-700 uppercase">
                          No Laboratory Investigations Ordered
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          No blood tests or diagnostic panels have been requisitioned for {fullName} yet.
                        </p>
                        <Link href={`/laboratory/orders/new?patientId=${patientId}`}>
                          <button className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs">
                            Create First Lab Order
                          </button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {labOrders.map((order: any) => {
                          const isVerified = order.status === 'verified';
                          const hasCritical = order.results?.some((r: any) => r.flag === 'CRITICAL');

                          return (
                            <div
                              key={order._id || order.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-teal-700">
                                    {order.orderNumber}
                                  </span>
                                  {order.accessionNumber && (
                                    <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                      {order.accessionNumber}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                      isVerified
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {order.status.replace('_', ' ')}
                                  </span>
                                  {hasCritical && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                      CRITICAL VALUE
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                                  <span>
                                    <strong>Tests:</strong>{' '}
                                    {(order.testIds || []).map((t: any) => t.code || t.name).join(', ')}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Ordered:{' '}
                                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Link href={`/laboratory/reports/${order._id || order.id}`}>
                                  <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors">
                                    {isVerified ? 'View Signed Report' : 'Inspect Order'} &rarr;
                                  </button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Pharmacy & Prescriptions */}
                {activeTab === 'pharmacy' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Prescription History & Pharmacy Dispensing</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Doctor-authored medications, dosage instructions, and dispensing status.
                        </p>
                      </div>
                      <Link href="/pharmacy">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors">
                          <Pill className="w-3.5 h-3.5" />
                          <span>Pharmacy Workstation</span>
                        </button>
                      </Link>
                    </div>

                    {loadingPrescriptions ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                        <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Loading patient prescriptions...</p>
                      </div>
                    ) : prescriptions.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                          <Pill className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">No Prescriptions Recorded</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          There are no electronic prescriptions on file for this patient yet. Prescriptions can be authored during OPD consultations or IPD rounds.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {prescriptions.map((rx: any) => {
                          const isDispensed = rx.status === 'dispensed';
                          const isPartial = rx.status === 'partially_dispensed';

                          return (
                            <div
                              key={rx._id || rx.id}
                              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-emerald-700">
                                      RX-{(rx._id || rx.id).slice(-8).toUpperCase()}
                                    </span>
                                    <span
                                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        isDispensed
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isPartial
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {rx.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <span>
                                      Prescribed by <strong>{rx.doctorId?.name || 'Attending Physician'}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(rx.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isDispensed ? (
                                    <Link href={`/pharmacy/dispense/${rx._id || rx.id}`}>
                                      <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs flex items-center gap-1.5">
                                        <Pill className="w-3.5 h-3.5" />
                                        <span>Dispense Medications &rarr;</span>
                                      </button>
                                    </Link>
                                  ) : (
                                    <Link href={`/pharmacy/dispense/${rx._id || rx.id}`}>
                                      <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                                        View Dispense Record
                                      </button>
                                    </Link>
                                  )}
                                </div>
                              </div>

                              {/* Prescribed Medications Table */}
                              <div className="mt-3 overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-y border-slate-100">
                                    <tr>
                                      <th className="py-2 px-3">Medicine</th>
                                      <th className="py-2 px-3">Dosage / Form</th>
                                      <th className="py-2 px-3">Frequency</th>
                                      <th className="py-2 px-3">Duration</th>
                                      <th className="py-2 px-3">Instructions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(rx.items || []).map((item: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                                          {item.medicineName || item.genericName || 'Prescribed Medicine'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {item.dosage || 'Standard'} • {item.dosageForm || 'Oral'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                            {item.frequency || '1-0-1'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {item.durationDays ? `${item.durationDays} days` : 'As directed'}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-500 italic">
                                          {item.instructions || 'After meals with water'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
