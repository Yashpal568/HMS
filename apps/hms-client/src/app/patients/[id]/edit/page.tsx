'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Patient,
  PatientGender,
  BloodGroup,
  MaritalStatus,
  PatientStatus,
  AllergyCategory,
  AllergySeverity,
  PatientAllergy,
  UpdatePatientPayload,
  ApiResponse,
} from '@hms/types';

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id as string;

  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);

  // Form State
  const [formData, setFormData] = useState<UpdatePatientPayload>({
    name: { first: '', middle: '', last: '' },
    gender: PatientGender.MALE,
    bloodGroup: BloodGroup.UNKNOWN,
    maritalStatus: MaritalStatus.SINGLE,
    status: PatientStatus.ACTIVE,
    contacts: {
      phone: '',
      alternatePhone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      },
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    allergies: [],
  });

  // Allergy draft
  const [allergyDraft, setAllergyDraft] = useState<PatientAllergy>({
    allergen: '',
    category: AllergyCategory.DRUG,
    severity: AllergySeverity.MILD,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPatient = async () => {
      if (!patientId) return;
      try {
        const res = await apiClient.get<ApiResponse<Patient>>(`/patients/${patientId}`);
        if (active) {
          if (res.success && res.data) {
            setPatient(res.data);
            setFormData({
              name: {
                first: res.data.name.first || '',
                middle: res.data.name.middle || '',
                last: res.data.name.last || '',
              },
              gender: res.data.gender || PatientGender.MALE,
              bloodGroup: res.data.bloodGroup || BloodGroup.UNKNOWN,
              maritalStatus: res.data.maritalStatus || MaritalStatus.SINGLE,
              status: res.data.status || PatientStatus.ACTIVE,
              contacts: {
                phone: res.data.contacts?.phone || '',
                alternatePhone: res.data.contacts?.alternatePhone || '',
                email: res.data.contacts?.email || '',
                address: {
                  street: res.data.contacts?.address?.street || '',
                  city: res.data.contacts?.address?.city || '',
                  state: res.data.contacts?.address?.state || '',
                  postalCode: res.data.contacts?.address?.postalCode || '',
                  country: res.data.contacts?.address?.country || 'India',
                },
              },
              emergencyContact: {
                name: res.data.emergencyContact?.name || '',
                relationship: res.data.emergencyContact?.relationship || '',
                phone: res.data.emergencyContact?.phone || '',
              },
              allergies: res.data.allergies ? [...res.data.allergies] : [],
            });
          } else {
            setErrorMessage(res.error?.message || 'Patient chart not found.');
          }
        }
      } catch (err: unknown) {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Error loading patient record.',
          );
        }
      } finally {
        if (active) {
          setIsLoadingPatient(false);
        }
      }
    };

    void loadPatient();

    return () => {
      active = false;
    };
  }, [patientId]);

  const handleAddAllergy = () => {
    if (!allergyDraft.allergen.trim()) return;
    setFormData((prev) => ({
      ...prev,
      allergies: [...(prev.allergies || []), { ...allergyDraft }],
    }));
    setAllergyDraft({
      allergen: '',
      category: AllergyCategory.DRUG,
      severity: AllergySeverity.MILD,
      notes: '',
    });
  };

  const handleRemoveAllergy = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      allergies: (prev.allergies || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.name?.first?.trim() || !formData.name?.last?.trim()) {
      setErrorMessage('Patient First Name and Last Name are required.');
      return;
    }
    if (!formData.contacts?.phone?.trim()) {
      setErrorMessage('Contact phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.patch<ApiResponse<Patient>>(
        `/patients/${patientId}`,
        formData,
      );

      if (res.success && res.data) {
        setSuccessMessage('Patient demographic record updated successfully.');
        setTimeout(() => {
          router.push(`/patients/${patientId}`);
        }, 1000);
      } else {
        setErrorMessage(res.error?.message || 'Failed to update patient record.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error updating patient chart.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title={patient ? `Edit ${patient.uhid}` : 'Edit Patient'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: patient ? patient.uhid : 'Patient', href: `/patients/${patientId}` },
        { label: 'Edit' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${patientId}`}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Edit Patient Record
              </h1>
              {patient && (
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  UHID: <span className="font-bold text-slate-800">{patient.uhid}</span> (Permanent Identifier)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoadingPatient && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-3 animate-spin">
              <RefreshCw className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Loading Patient Details...</p>
          </div>
        )}

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        {!isLoadingPatient && patient && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Demographics */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                1. Patient Demographics & Chart Status
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name?.first || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name!, first: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.name?.middle || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name!, middle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name?.last || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: { ...formData.name!, last: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as PatientGender,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={PatientGender.MALE}>Male</option>
                    <option value={PatientGender.FEMALE}>Female</option>
                    <option value={PatientGender.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bloodGroup: e.target.value as BloodGroup,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={BloodGroup.UNKNOWN}>Unknown</option>
                    <option value={BloodGroup.A_POSITIVE}>A+</option>
                    <option value={BloodGroup.A_NEGATIVE}>A-</option>
                    <option value={BloodGroup.B_POSITIVE}>B+</option>
                    <option value={BloodGroup.B_NEGATIVE}>B-</option>
                    <option value={BloodGroup.AB_POSITIVE}>AB+</option>
                    <option value={BloodGroup.AB_NEGATIVE}>AB-</option>
                    <option value={BloodGroup.O_POSITIVE}>O+</option>
                    <option value={BloodGroup.O_NEGATIVE}>O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marital Status
                  </label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maritalStatus: e.target.value as MaritalStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={MaritalStatus.SINGLE}>Single</option>
                    <option value={MaritalStatus.MARRIED}>Married</option>
                    <option value={MaritalStatus.DIVORCED}>Divorced</option>
                    <option value={MaritalStatus.WIDOWED}>Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Record Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as PatientStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  >
                    <option value={PatientStatus.ACTIVE}>Active</option>
                    <option value={PatientStatus.INACTIVE}>Inactive</option>
                    <option value={PatientStatus.DECEASED}>Deceased</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Contact & Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                2. Contact Information & Address
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.contacts?.phone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: { ...formData.contacts!, phone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contacts?.alternatePhone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: { ...formData.contacts!, alternatePhone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.contacts?.email || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: { ...formData.contacts!, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.contacts?.address?.street || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: {
                          ...formData.contacts!,
                          address: { ...formData.contacts!.address!, street: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.contacts?.address?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: {
                          ...formData.contacts!,
                          address: { ...formData.contacts!.address!, city: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={formData.contacts?.address?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: {
                          ...formData.contacts!,
                          address: { ...formData.contacts!.address!, state: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.contacts?.address?.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: {
                          ...formData.contacts!,
                          address: { ...formData.contacts!.address!, postalCode: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.contacts?.address?.country || 'India'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: {
                          ...formData.contacts!,
                          address: { ...formData.contacts!.address!, country: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Emergency Contact */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                3. Emergency Contact
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact?.name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          name: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact?.relationship || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          relationship: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: {
                          ...formData.emergencyContact!,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Allergies */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                4. Documented Allergies & Sensitivities
              </h2>

              {formData.allergies && formData.allergies.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {formData.allergies.map((allergy, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 border-slate-200 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            allergy.severity === AllergySeverity.SEVERE
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : allergy.severity === AllergySeverity.MODERATE
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {allergy.severity}
                        </span>
                        <div>
                          <strong className="text-slate-900">{allergy.allergen}</strong>
                          <span className="text-xs text-slate-500 ml-2 capitalize">
                            ({allergy.category})
                          </span>
                          {allergy.notes && (
                            <p className="text-xs text-slate-600 mt-0.5">{allergy.notes}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
                        title="Remove allergy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mb-4 italic">
                  No allergies currently recorded for this patient chart.
                </p>
              )}

              {/* Add allergy row */}
              <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">
                  Add Clinical Allergy
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Allergen Name
                    </label>
                    <input
                      type="text"
                      value={allergyDraft.allergen}
                      onChange={(e) =>
                        setAllergyDraft({ ...allergyDraft, allergen: e.target.value })
                      }
                      placeholder="e.g. Penicillin"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={allergyDraft.category}
                      onChange={(e) =>
                        setAllergyDraft({
                          ...allergyDraft,
                          category: e.target.value as AllergyCategory,
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={AllergyCategory.DRUG}>Drug</option>
                      <option value={AllergyCategory.FOOD}>Food</option>
                      <option value={AllergyCategory.ENVIRONMENTAL}>Environmental</option>
                      <option value={AllergyCategory.OTHER}>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Severity
                    </label>
                    <select
                      value={allergyDraft.severity}
                      onChange={(e) =>
                        setAllergyDraft({
                          ...allergyDraft,
                          severity: e.target.value as AllergySeverity,
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={AllergySeverity.MILD}>Mild</option>
                      <option value={AllergySeverity.MODERATE}>Moderate</option>
                      <option value={AllergySeverity.SEVERE}>Severe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={allergyDraft.notes || ''}
                      onChange={(e) =>
                        setAllergyDraft({ ...allergyDraft, notes: e.target.value })
                      }
                      placeholder="e.g. Swelling, rash"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    disabled={!allergyDraft.allergen.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to Record
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={`/patients/${patientId}`}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-teal-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving Updates...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Demographic Updates</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
