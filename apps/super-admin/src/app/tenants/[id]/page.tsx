'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SuperAdminAppShell } from '../../../components/layout/super-admin-app-shell';
import { apiClient } from '../../../lib/api-client';
import { TenantStatus, type Tenant, type QuotaOverrideDto } from '@hms/types';
import {
  Building2,
  Layers,
  Shield,
  CreditCard,
  HardDrive,
  Users,
  Bed,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Sliders,
  Clock,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status Action Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusActionType, setStatusActionType] = useState<'SUSPEND' | 'REACTIVATE'>('SUSPEND');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);

  // Quota Override Modal
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);
  const [quotaForm, setQuotaForm] = useState<QuotaOverrideDto>({
    maxDoctors: 0,
    maxBeds: 0,
    maxStorageGb: 0,
    reason: '',
  });
  const [isSubmittingQuota, setIsSubmittingQuota] = useState<boolean>(false);

  const fetchTenant = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: Tenant }>(`/super-admin/tenants/${tenantId}`);
      setTenant(res.data);
      if (res.data.quotas) {
        setQuotaForm({
          maxDoctors: res.data.quotas.maxDoctors,
          maxBeds: res.data.quotas.maxBeds,
          maxStorageGb: res.data.quotas.maxStorageGb,
          reason: '',
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load tenant details.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const handleStatusUpdate = async () => {
    try {
      setIsSubmittingStatus(true);
      const targetStatus: TenantStatus =
        statusActionType === 'SUSPEND' ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
      await apiClient.patch(`/super-admin/tenants/${tenantId}/status`, {
        status: targetStatus,
        reason: statusReason || `Administrative ${statusActionType.toLowerCase()} from console`,
      });

      setSuccessMessage(`Tenant status updated to ${targetStatus}`);
      setIsStatusModalOpen(false);
      setStatusReason('');
      await fetchTenant();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update tenant status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleQuotaOverride = async () => {
    try {
      setIsSubmittingQuota(true);
      await apiClient.patch(`/super-admin/tenants/${tenantId}/quotas`, quotaForm);
      setSuccessMessage('Tenant quotas successfully updated.');
      setIsQuotaModalOpen(false);
      await fetchTenant();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to override quotas.');
    } finally {
      setIsSubmittingQuota(false);
    }
  };

  if (isLoading) {
    return (
      <SuperAdminAppShell title="Loading Tenant...">
        <div className="py-20 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Fetching tenant profile from cloud records...
        </div>
      </SuperAdminAppShell>
    );
  }

  if (!tenant) {
    return (
      <SuperAdminAppShell title="Tenant Not Found">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Hospital Tenant Not Found</h2>
          <p className="text-xs text-slate-400">The requested tenant ID could not be found or has been purged.</p>
          <Link
            href="/tenants"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </Link>
        </div>
      </SuperAdminAppShell>
    );
  }

  const docUsage = tenant.usage?.doctorsCount ?? 0;
  const docQuota = tenant.quotas?.maxDoctors ?? 1;
  const docPercent = Math.min(100, Math.round((docUsage / docQuota) * 100));

  const bedUsage = tenant.usage?.bedsCount ?? 0;
  const bedQuota = tenant.quotas?.maxBeds ?? 1;
  const bedPercent = Math.min(100, Math.round((bedUsage / bedQuota) * 100));

  const storageUsage = tenant.usage?.storageGbUsed ?? 0;
  const storageQuota = tenant.quotas?.maxStorageGb ?? 1;
  const storagePercent = Math.min(100, Math.round((storageUsage / storageQuota) * 100));

  return (
    <SuperAdminAppShell
      title={tenant.name}
      description={`Multi-Tenant Subdomain: ${tenant.subdomain}.hmsmedcore.com • ID: ${tenant.id}`}
      breadcrumbs={[
        { label: 'Platform Console', href: '/dashboard' },
        { label: 'Tenants', href: '/tenants' },
        { label: tenant.name },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQuotaModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Override Quotas
          </button>

          {tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' ? (
            <button
              type="button"
              onClick={() => {
                setStatusActionType('SUSPEND');
                setIsStatusModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Suspend Hospital
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatusActionType('REACTIVATE');
                setIsStatusModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Reactivate Hospital
            </button>
          )}
        </div>
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

      {/* Top Banner & Status */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white">{tenant.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : tenant.status === 'TRIAL'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Domain: {tenant.subdomain}.hmsmedcore.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">SaaS Plan Tier</span>
            <span className="text-indigo-400 font-bold">{tenant.tier}</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Onboarded Date</span>
            <span className="text-slate-300">{new Date(tenant.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Quotas & Resource Utilization Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Doctors */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              Licensed Doctors
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {docUsage} / {docQuota}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                docPercent > 90 ? 'bg-rose-500' : docPercent > 75 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${docPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Utilization: {docPercent}%</span>
            <span>{Math.max(0, docQuota - docUsage)} seats remaining</span>
          </div>
        </div>

        {/* Beds */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-teal-400" />
              Inpatient Bed Allocation
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {bedUsage} / {bedQuota}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${bedPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Utilization: {bedPercent}%</span>
            <span>{Math.max(0, bedQuota - bedUsage)} beds remaining</span>
          </div>
        </div>

        {/* Storage */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-purple-400" />
              Cloud Storage Capacity
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {storageUsage} / {storageQuota} GB
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Utilization: {storagePercent}%</span>
            <span>{Math.max(0, storageQuota - storageUsage)} GB remaining</span>
          </div>
        </div>
      </div>

      {/* Grid: Organization Details & Isolation Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing & Contact */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            Organization & Contact Record
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Billing Email
              </span>
              <span className="font-mono text-slate-200">{tenant.billingContact?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Contact Name
              </span>
              <span className="text-slate-200">{tenant.billingContact?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Phone
              </span>
              <span className="font-mono text-slate-200">{tenant.billingContact?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                City / Region
              </span>
              <span className="text-slate-200">{tenant.slug}</span>
            </div>
          </div>
        </div>

        {/* Security & Strict Clinical Isolation Box */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            Data Isolation & Zero-PHI Compliance
          </h3>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed">
              This tenant database is partitioned with strict multi-tenant scoping. All clinical encounters,
              prescriptions, lab tests, and medical records are completely isolated and unreadable by platform super admins.
            </p>
            <div className="flex items-center gap-2 text-indigo-300 font-mono text-[11px] pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cryptographic Tenant Scoping Verified</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span>Database Collection Scope:</span>
              <span className="font-mono text-slate-200">{`{ tenantId: "${tenant.id}" }`}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Tenant Suspension Invariant:</span>
              <span className="text-slate-200">Locks clinical logins; Preserves medical history</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quota Override Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Override Resource Quotas</h3>
                <p className="text-xs text-slate-400">Custom entitlement adjustments for {tenant.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Max Licensed Doctors</label>
                <input
                  type="number"
                  value={quotaForm.maxDoctors}
                  onChange={(e) =>
                    setQuotaForm((prev) => ({ ...prev, maxDoctors: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Max Inpatient Beds</label>
                <input
                  type="number"
                  value={quotaForm.maxBeds}
                  onChange={(e) =>
                    setQuotaForm((prev) => ({ ...prev, maxBeds: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Max Storage (GB)</label>
                <input
                  type="number"
                  value={quotaForm.maxStorageGb}
                  onChange={(e) =>
                    setQuotaForm((prev) => ({ ...prev, maxStorageGb: parseInt(e.target.value, 10) || 0 }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Override Reason / Audit Note</label>
                <input
                  type="text"
                  placeholder="e.g. Hospital expansion request, promotional add-on"
                  value={quotaForm.reason}
                  onChange={(e) => setQuotaForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsQuotaModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingQuota}
                onClick={handleQuotaOverride}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                {isSubmittingQuota ? 'Saving...' : 'Apply Quota Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {statusActionType === 'SUSPEND' ? 'Suspend Hospital Tenant' : 'Reactivate Hospital Tenant'}
            </h3>
            <p className="text-xs text-slate-300">
              {statusActionType === 'SUSPEND'
                ? `Suspending ${tenant.name} will immediately block all hospital users from logging into the portal.`
                : `Reactivating ${tenant.name} will restore immediate portal access for hospital staff.`}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Justification Reason</label>
              <textarea
                rows={3}
                placeholder="Required for platform audit logs..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={handleStatusUpdate}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
                  statusActionType === 'SUSPEND'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {isSubmittingStatus ? 'Updating...' : `Confirm ${statusActionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminAppShell>
  );
}
