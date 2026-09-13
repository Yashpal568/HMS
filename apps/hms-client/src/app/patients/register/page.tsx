'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  PatientGender,
  BloodGroup,
  MaritalStatus,
  AllergyCategory,
  AllergySeverity,
  PatientAllergy,
  CreatePatientPayload,
  ApiResponse,
  Patient,
  DuplicateCheckResult,
} from '@hms/types';
import { DuplicateAlertModal } from '@/components/patients/duplicate-alert-modal';

export default function RegisterPatientPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState<CreatePatientPayload>({
    name: {
      first: '',
      middle: '',
      last: '',
    },
    dateOfBirth: '',
    gender: PatientGender.MALE,
    bloodGroup: BloodGroup.UNKNOWN,
    maritalStatus: MaritalStatus.SINGLE,
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

  // Allergy input draft state
  const [allergyDraft, setAllergyDraft] = useState<PatientAllergy>({
    allergen: '',
    category: AllergyCategory.DRUG,
    severity: AllergySeverity.MILD,
    notes: '',
  });

  // Duplicate Check State
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [hasIgnoredDuplicate, setHasIgnoredDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live duplicate detection hook
  const checkDuplicateLive = useCallback(
    async (phone: string, dob: string) => {
      if (!phone || phone.length < 8 || !dob || hasIgnoredDuplicate) {
        return;
      }
      setIsCheckingDuplicate(true);
      try {
        const queryParams = new URLSearchParams({
          phone: phone.trim(),
          dateOfBirth: dob.trim(),
        });
        const res = await apiClient.get<ApiResponse<DuplicateCheckResult>>(
          `/patients/check-duplicate?${queryParams.toString()}`,
        );
        if (res.success && res.data?.hasDuplicate) {
          setDuplicateResult(res.data);
          setIsDuplicateModalOpen(true);
        } else {
          setDuplicateResult(null);
        }
      } catch {
        // Non-blocking duplicate check error
      } finally {
        setIsCheckingDuplicate(false);
      }
    },
    [hasIgnoredDuplicate],
  );

  useEffect(() => {
    const phone = formData.contacts.phone;
    const dob = formData.dateOfBirth;
    if (phone.length >= 10 && dob) {
      const handler = setTimeout(() => {
        checkDuplicateLive(phone, dob);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [formData.contacts.phone, formData.dateOfBirth, checkDuplicateLive]);

  // Allergies management
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

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic client validation
    if (!formData.name.first.trim() || !formData.name.last.trim()) {
      setErrorMessage('Please enter both patient First Name and Last Name.');
      return;
    }
    if (!formData.dateOfBirth) {
      setErrorMessage('Date of birth is required.');
      return;
    }
    if (!formData.contacts.phone.trim()) {
      setErrorMessage('Contact phone number is required.');
      return;
    }
    if (!formData.contacts.address.street.trim() || !formData.contacts.address.city.trim()) {
      setErrorMessage('Street address and city are required.');
      return;
    }
    if (!formData.emergencyContact.name.trim() || !formData.emergencyContact.phone.trim()) {
      setErrorMessage('Emergency contact name and phone number are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiClient.post<ApiResponse<Patient>>('/patients', formData);
      if (res.success && res.data) {
        setSuccessMessage(`Patient successfully registered with UHID: ${res.data.uhid}`);
        setTimeout(() => {
          router.push(`/patients/${res.data!.id}`);
        }, 1200);
      } else {
        setErrorMessage(res.error?.message || 'Failed to register patient.');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during patient registration.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Register Patient"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients', href: '/patients' },
        { label: 'Register' },
      ]}
    >
      {/* Duplicate Warning Modal */}
      <DuplicateAlertModal
        isOpen={isDuplicateModalOpen}
        duplicateInfo={duplicateResult}
        onClose={() => setIsDuplicateModalOpen(false)}
        onProceedAnyway={() => {
          setHasIgnoredDuplicate(true);
          setIsDuplicateModalOpen(false);
        }}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to Patients"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                New Patient Registration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates atomic sequential UHID and registers sovereign medical record.
              </p>
            </div>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Demographics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              1. Patient Demographics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name.first}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: { ...formData.name, first: e.target.value },
                    })
                  }
                  placeholder="e.g. John"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.name.middle || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: { ...formData.name, middle: e.target.value },
                    })
                  }
                  placeholder="Optional"
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
                  value={formData.name.last}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: { ...formData.name, last: e.target.value },
                    })
                  }
                  placeholder="e.g. Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dateOfBirth: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-red-500">*</span>
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
            </div>
          </div>

          {/* Section 2: Contact & Address */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                2. Contact & Address
              </h2>
              {isCheckingDuplicate && (
                <span className="text-[11px] text-teal-600 font-medium animate-pulse">
                  Verifying patient uniqueness...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contacts.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: { ...formData.contacts, phone: e.target.value },
                    })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.contacts.alternatePhone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: { ...formData.contacts, alternatePhone: e.target.value },
                    })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.contacts.email || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: { ...formData.contacts, email: e.target.value },
                    })
                  }
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contacts.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: {
                        ...formData.contacts,
                        address: { ...formData.contacts.address, street: e.target.value },
                      },
                    })
                  }
                  placeholder="House / Building / Street name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contacts.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: {
                        ...formData.contacts,
                        address: { ...formData.contacts.address, city: e.target.value },
                      },
                    })
                  }
                  placeholder="City / Town"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State / Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contacts.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: {
                        ...formData.contacts,
                        address: { ...formData.contacts.address, state: e.target.value },
                      },
                    })
                  }
                  placeholder="State"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contacts.address.postalCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: {
                        ...formData.contacts,
                        address: { ...formData.contacts.address, postalCode: e.target.value },
                      },
                    })
                  }
                  placeholder="PIN / Zip Code"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contacts.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacts: {
                        ...formData.contacts,
                        address: { ...formData.contacts.address, country: e.target.value },
                      },
                    })
                  }
                  placeholder="Country"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Emergency Contact */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              3. Emergency Contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergencyContact.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergencyContact.relationship}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        relationship: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Spouse / Parent / Sibling"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.emergencyContact.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        phone: e.target.value,
                      },
                    })
                  }
                  placeholder="+91 98765 43211"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Known Allergies */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              4. Known Clinical Allergies
            </h2>

            {/* List of currently added allergies */}
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
                No allergies added. If patient reports drug, food, or environmental allergies, record them below.
              </p>
            )}

            {/* Add allergy row */}
            <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">
                Add New Allergy Record
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
                    placeholder="e.g. Penicillin, Peanuts"
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
                    <option value={AllergySeverity.SEVERE}>Severe / Anaphylactic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Clinical Notes
                  </label>
                  <input
                    type="text"
                    value={allergyDraft.notes || ''}
                    onChange={(e) =>
                      setAllergyDraft({ ...allergyDraft, notes: e.target.value })
                    }
                    placeholder="e.g. Skin rash, shortness of breath"
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
                  Add to Patient Record
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/patients"
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
                  <span>Assigning UHID & Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Complete Patient Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
