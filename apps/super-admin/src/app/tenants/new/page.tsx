'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SuperAdminAppShell } from '../../../components/layout/super-admin-app-shell';
import { apiClient } from '../../../lib/api-client';
import { SubscriptionTier, type Plan, type CreateTenantDto } from '@hms/types';
import {
  Building2,
  Layers,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function ProvisionTenantPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateTenantDto>({
    name: '',
    subdomain: '',
    customDomain: '',
    tier: SubscriptionTier.STARTER_CLINIC,
    planId: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPassword: 'Password123!',
    phone: '',
    city: '',
  });

  // Load plans from API
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/super-admin/plans');
        if (res.data && res.data.length > 0) {
          setAvailablePlans(res.data);
          // Set initial planId
          const firstPlan = res.data[0];
          setFormData((prev) => ({
            ...prev,
            planId: firstPlan.id,
            tier: firstPlan.tier,
          }));
        }
      } catch {
        // Fallback plans if none seeded
      }
    }
    loadPlans();
  }, []);

  // Auto-slugify subdomain
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({
      ...prev,
      name,
      subdomain: prev.subdomain ? prev.subdomain : slug,
    }));
  };

  const handlePlanSelect = (plan: Plan) => {
    setFormData((prev) => ({
      ...prev,
      planId: plan.id,
      tier: plan.tier,
    }));
  };

  const validateStep = (step: number): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.name.trim()) {
        setErrorMessage('Hospital Name is required.');
        return false;
      }
      if (!formData.subdomain.trim()) {
        setErrorMessage('Tenant Subdomain is required.');
        return false;
      }
      if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
        setErrorMessage('Subdomain must only contain lowercase letters, numbers, and hyphens.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.tier) {
        setErrorMessage('Please select a SaaS Subscription Tier.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.adminFirstName.trim() || !formData.adminLastName.trim()) {
        setErrorMessage('Administrator First and Last names are required.');
        return false;
      }
      if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
        setErrorMessage('A valid Administrator Email is required.');
        return false;
      }
      if (formData.adminPassword && formData.adminPassword.length < 8) {
        setErrorMessage('Administrator Password must be at least 8 characters long.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleProvisionSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await apiClient.post<{ success: boolean; data: any }>('/super-admin/tenants', formData);
      setProvisionSuccess(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision tenant. Please check parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SuperAdminAppShell
      title="Provision Hospital Tenant"
      description="Onboard a new healthcare facility, allocate isolated tenant resources, and configure initial licensing."
      breadcrumbs={[
        { label: 'Platform Console', href: '/dashboard' },
        { label: 'Tenants', href: '/tenants' },
        { label: 'Provision' },
      ]}
    >
      {/* Wizard Progress Steps */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Facility Profile', icon: Building2 },
            { num: 2, label: 'SaaS Plan & Tier', icon: Layers },
            { num: 3, label: 'Hospital Admin', icon: UserCheck },
            { num: 4, label: 'Review & Launch', icon: ShieldCheck },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                    : isDone
                    ? 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold leading-tight">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Provision Success View */}
      {provisionSuccess ? (
        <div className="p-8 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-6 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Hospital Tenant Successfully Provisioned!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cryptographically isolated tenant environment created with initial subscription and hospital admin credentials.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Tenant ID:</span>
              <span className="text-slate-200">{provisionSuccess.tenant?.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Facility:</span>
              <span className="text-slate-200">{provisionSuccess.tenant?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">Tenant Subdomain:</span>
              <span className="text-indigo-400">{provisionSuccess.tenant?.subdomain}.hmsmedcore.com</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-500">SaaS Tier:</span>
              <span className="text-slate-200">{provisionSuccess.tenant?.tier}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Admin Email:</span>
              <span className="text-slate-200">{provisionSuccess.adminUser?.email}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={`/tenants/${provisionSuccess.tenant?.id}`}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              View Tenant Management 360
            </Link>
            <Link
              href="/tenants"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      ) : (
        /* Wizard Form Steps */
        <div className="p-6 md:p-8 rounded-2xl bg-slate-900/70 border border-slate-800">
          {/* STEP 1: Hospital Facility Profile */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Step 1: Hospital Facility Profile</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter official hospital legal name and choose their unique multi-tenant subdomain slug.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Hospital / Clinic Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. St. Jude General Hospital"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Subdomain Slug <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder="st-jude"
                      value={formData.subdomain}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-l-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <span className="px-3.5 py-2.5 bg-slate-800/80 border border-l-0 border-slate-800 rounded-r-xl text-xs font-mono text-slate-400">
                      .hmsmedcore.com
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tenant host routing will map this slug directly into the hospital client web app.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">City / Municipality</label>
                    <input
                      type="text"
                      placeholder="e.g. Chicago"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Facility Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2834"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Custom Domain (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. portal.stjudehospital.org"
                    value={formData.customDomain}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customDomain: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SaaS Plan & Tier */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Step 2: Subscription Plan & Resource Limits</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select a subscription tier to define quota caps for licensed doctors, bed allocations, and storage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(availablePlans.length > 0
                  ? availablePlans
                  : [
                      {
                        id: 'plan-starter',
                        code: 'STARTER_CLINIC',
                        name: 'Starter Clinic',
                        tier: SubscriptionTier.STARTER_CLINIC,
                        priceMonthly: 199,
                        priceAnnual: 1990,
                        limits: { maxDoctors: 5, maxBeds: 10, maxStorageGb: 10 },
                        includedModules: ['Outpatient', 'Appointments', 'Billing'],
                      },
                      {
                        id: 'plan-growth',
                        code: 'GROWTH_HOSPITAL',
                        name: 'Growth Hospital',
                        tier: SubscriptionTier.GROWTH_HOSPITAL,
                        priceMonthly: 599,
                        priceAnnual: 5990,
                        limits: { maxDoctors: 25, maxBeds: 100, maxStorageGb: 100 },
                        includedModules: ['Outpatient', 'Inpatient', 'Laboratory', 'Pharmacy', 'Radiology'],
                      },
                      {
                        id: 'plan-enterprise',
                        code: 'ENTERPRISE_NETWORK',
                        name: 'Enterprise Network',
                        tier: SubscriptionTier.ENTERPRISE_NETWORK,
                        priceMonthly: 1999,
                        priceAnnual: 19990,
                        limits: { maxDoctors: 200, maxBeds: 1000, maxStorageGb: 1000 },
                        includedModules: ['All Modules', 'ICU', 'Blood Bank', 'Analytics', 'Custom SLA'],
                      },
                    ]
                ).map((plan) => {
                  const isSelected = formData.tier === plan.tier;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan as any)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-4 ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-600/15'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div>
                        <div className="text-xl font-bold text-white font-mono">
                          ${plan.priceMonthly}{' '}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          or ${plan.priceAnnual}/yr billed annually
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Doctors Quota:</span>
                          <span className="font-mono font-medium">{plan.limits.maxDoctors} staff</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Bed Quota:</span>
                          <span className="font-mono font-medium">{plan.limits.maxBeds} beds</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Storage Quota:</span>
                          <span className="font-mono font-medium">{plan.limits.maxStorageGb} GB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Initial Hospital Administrator Account */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Step 3: Initial Hospital Administrator</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create the root administrator account for this hospital. This account will have role{' '}
                  <span className="text-indigo-400 font-mono">HOSPITAL_ADMIN</span> scoped strictly to this facility.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Admin First Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Eleanor"
                      value={formData.adminFirstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, adminFirstName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Admin Last Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vance"
                      value={formData.adminLastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, adminLastName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Administrator Work Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="admin@stjude.org"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    This email will receive activation notices and manage staff inside `apps/hms-client`.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Temporary Initial Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, adminPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Provision Launch */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Step 4: Review & Finalize Provisioning</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Verify the facility metadata and resource quotas before initiating tenant database provisioning.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <div className="space-y-2 border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Facility Details
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-semibold text-slate-200">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Portal Domain:</span>
                    <span className="font-mono text-indigo-400">{formData.subdomain}.hmsmedcore.com</span>
                  </div>
                  {formData.city && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="text-slate-300">{formData.city}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    SaaS Plan & Entitlements
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Tier:</span>
                    <span className="font-mono text-indigo-300 font-semibold">{formData.tier}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Hospital Administrator
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-slate-200">
                      {formData.adminFirstName} {formData.adminLastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Work Email:</span>
                    <span className="font-mono text-slate-200">{formData.adminEmail}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800/60">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Step
              </button>
            ) : (
              <Link
                href="/tenants"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </Link>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProvisionSubmit}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Provisioning Tenant...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Provision Hospital Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </SuperAdminAppShell>
  );
}
