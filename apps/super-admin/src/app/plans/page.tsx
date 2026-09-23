'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import { SubscriptionTier, type Plan, type CreatePlanDto } from '@hms/types';
import {
  Layers,
  PlusCircle,
  Edit2,
  Check,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  HardDrive,
  Users,
  Bed,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function PlansCatalogPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Plan Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createPlanForm, setCreatePlanForm] = useState<CreatePlanDto>({
    code: '',
    name: '',
    tier: SubscriptionTier.GROWTH_HOSPITAL,
    description: '',
    priceMonthly: 499,
    priceAnnual: 4990,
    currency: 'USD',
    limits: {
      maxDoctors: 20,
      maxBeds: 50,
      maxStorageGb: 50,
    },
    includedModules: ['Outpatient', 'Inpatient', 'Laboratory', 'Pharmacy'],
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Edit Plan Modal
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanForm, setEditPlanForm] = useState<Partial<CreatePlanDto>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/super-admin/plans');
      setPlans(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load subscription plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleCreatePlan = async () => {
    try {
      setIsSubmittingCreate(true);
      await apiClient.post('/super-admin/plans', createPlanForm);
      setSuccessMessage('New subscription plan successfully added.');
      setIsCreateModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create plan.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEditPlan = async () => {
    if (!editingPlan) return;
    try {
      setIsSubmittingEdit(true);
      await apiClient.patch(`/super-admin/plans/${editingPlan.id}`, editPlanForm);
      setSuccessMessage(`Plan ${editingPlan.name} updated successfully.`);
      setEditingPlan(null);
      await fetchPlans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update plan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setEditPlanForm({
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      limits: { ...plan.limits },
      includedModules: [...plan.includedModules],
    });
  };

  return (
    <SuperAdminAppShell
      title="SaaS Subscription Plans"
      description="Manage tiered pricing, licensed doctor quotas, bed capacity limits, and packaged clinical modules."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Plans' }]}
      actions={
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Create Custom Plan
        </button>
      }
    >
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMessage}
          </span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Plan Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading plan catalog...
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-3 rounded-2xl bg-slate-900 border border-slate-800">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No subscription plans found</p>
          <p className="text-slate-500">Create a plan to enable tenant onboarding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id || (plan as any)._id || plan.name}
              className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-medium">
                    {plan.tier}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{plan.description || 'General subscription tier.'}</p>
                </div>

                <div>
                  <div className="text-2xl font-bold text-white font-mono">
                    ${plan.priceMonthly}{' '}
                    <span className="text-xs font-normal text-slate-400">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ${plan.priceAnnual} / year billed annually
                  </p>
                </div>

                {/* Resource Limits */}
                <div className="space-y-2 pt-4 border-t border-slate-800/80 text-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                    Package Entitlements
                  </span>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Doctor Licenses
                    </span>
                    <span className="font-mono font-semibold text-slate-100">
                      {plan.limits.maxDoctors}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2 text-slate-400">
                      <Bed className="w-3.5 h-3.5 text-teal-400" />
                      Inpatient Beds
                    </span>
                    <span className="font-mono font-semibold text-slate-100">{plan.limits.maxBeds}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2 text-slate-400">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      Storage Quota
                    </span>
                    <span className="font-mono font-semibold text-slate-100">
                      {plan.limits.maxStorageGb} GB
                    </span>
                  </div>
                </div>

                {/* Modules */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold tracking-wider">
                    Included Modules
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.includedModules.map((mod, modIdx) => (
                      <span
                        key={`${mod}-${modIdx}`}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  Configure Limits & Pricing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Edit {editingPlan.name}</h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Plan Display Name</label>
                <input
                  type="text"
                  value={editPlanForm.name ?? ''}
                  onChange={(e) => setEditPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={editPlanForm.priceMonthly ?? 0}
                    onChange={(e) =>
                      setEditPlanForm((prev) => ({ ...prev, priceMonthly: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Annual Price ($)</label>
                  <input
                    type="number"
                    value={editPlanForm.priceAnnual ?? 0}
                    onChange={(e) =>
                      setEditPlanForm((prev) => ({ ...prev, priceAnnual: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Max Doctors</label>
                <input
                  type="number"
                  value={editPlanForm.limits?.maxDoctors ?? 0}
                  onChange={(e) =>
                    setEditPlanForm((prev) => ({
                      ...prev,
                      limits: { ...prev.limits!, maxDoctors: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Max Beds</label>
                <input
                  type="number"
                  value={editPlanForm.limits?.maxBeds ?? 0}
                  onChange={(e) =>
                    setEditPlanForm((prev) => ({
                      ...prev,
                      limits: { ...prev.limits!, maxBeds: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Max Storage (GB)</label>
                <input
                  type="number"
                  value={editPlanForm.limits?.maxStorageGb ?? 0}
                  onChange={(e) =>
                    setEditPlanForm((prev) => ({
                      ...prev,
                      limits: { ...prev.limits!, maxStorageGb: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={handleEditPlan}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Create Custom Plan</h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Plan Code (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. SPECIALTY_CARDIAC"
                  value={createPlanForm.code}
                  onChange={(e) =>
                    setCreatePlanForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. Specialty Cardiac Center"
                  value={createPlanForm.name}
                  onChange={(e) => setCreatePlanForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Monthly Price ($)</label>
                  <input
                    type="number"
                    value={createPlanForm.priceMonthly}
                    onChange={(e) =>
                      setCreatePlanForm((prev) => ({
                        ...prev,
                        priceMonthly: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Annual Price ($)</label>
                  <input
                    type="number"
                    value={createPlanForm.priceAnnual}
                    onChange={(e) =>
                      setCreatePlanForm((prev) => ({
                        ...prev,
                        priceAnnual: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Max Doctors</label>
                  <input
                    type="number"
                    value={createPlanForm.limits.maxDoctors}
                    onChange={(e) =>
                      setCreatePlanForm((prev) => ({
                        ...prev,
                        limits: { ...prev.limits, maxDoctors: parseInt(e.target.value, 10) || 0 },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Max Beds</label>
                  <input
                    type="number"
                    value={createPlanForm.limits.maxBeds}
                    onChange={(e) =>
                      setCreatePlanForm((prev) => ({
                        ...prev,
                        limits: { ...prev.limits, maxBeds: parseInt(e.target.value, 10) || 0 },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Max GB</label>
                  <input
                    type="number"
                    value={createPlanForm.limits.maxStorageGb}
                    onChange={(e) =>
                      setCreatePlanForm((prev) => ({
                        ...prev,
                        limits: { ...prev.limits, maxStorageGb: parseInt(e.target.value, 10) || 0 },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCreate}
                onClick={handleCreatePlan}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSubmittingCreate ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminAppShell>
  );
}
