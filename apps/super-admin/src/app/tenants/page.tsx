'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import { TenantStatus, type Tenant, type SubscriptionTier } from '@hms/types';
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  PauseCircle,
  PlayCircle,
  Clock,
  MoreVertical,
} from 'lucide-react';

export default function TenantsDirectoryPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  // Status modal state
  const [selectedTenantForAction, setSelectedTenantForAction] = useState<Tenant | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'REACTIVATE' | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setActionError(null);
      const res = await apiClient.get<{ success: boolean; data: Tenant[] }>('/super-admin/tenants');
      setTenants(res.data || []);
    } catch (err: unknown) {
      setActionError('Failed to load tenants directory. Please verify API status.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.billingContact?.email && t.billingContact.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
      const matchesTier = selectedTier === 'ALL' || t.tier === selectedTier;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [tenants, searchQuery, selectedStatus, selectedTier]);

  const handleStatusUpdate = async () => {
    if (!selectedTenantForAction || !actionType) return;
    try {
      setIsSubmittingAction(true);
      const targetStatus: TenantStatus =
        actionType === 'SUSPEND' ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
      await apiClient.patch(`/super-admin/tenants/${selectedTenantForAction.id}/status`, {
        status: targetStatus,
        reason: actionReason || `Administrative ${actionType.toLowerCase()} via control plane`,
      });

      setSelectedTenantForAction(null);
      setActionType(null);
      setActionReason('');
      await fetchTenants();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update tenant status.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <SuperAdminAppShell
      title="Master Tenant Directory"
      description="Manage all provisioned hospital tenants, subscription tiers, resource quotas, and lifecycle states."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Tenants' }]}
      actions={
        <Link
          href="/tenants/new"
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Provision New Tenant
        </Link>
      }
    >
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search hospital name, subdomain, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEPROVISIONED">Deprovisioned</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Tiers</option>
              <option value="STARTER_CLINIC">Starter Clinic</option>
              <option value="GROWTH_HOSPITAL">Growth Hospital</option>
              <option value="ENTERPRISE_NETWORK">Enterprise Network</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Tenants Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading tenant database...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No tenants matched your criteria</p>
            <p className="text-slate-500">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Hospital Name & Domain</th>
                  <th className="py-3 px-4">SaaS Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Doctors Quota</th>
                  <th className="py-3 px-4">Beds Quota</th>
                  <th className="py-3 px-4">Billing Contact</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTenants.map((tenant) => {
                  const docUsage = tenant.usage?.doctorsCount ?? 0;
                  const docQuota = tenant.quotas?.maxDoctors ?? 1;
                  const docPercent = Math.min(100, Math.round((docUsage / docQuota) * 100));

                  const bedUsage = tenant.usage?.bedsCount ?? 0;
                  const bedQuota = tenant.quotas?.maxBeds ?? 1;
                  const bedPercent = Math.min(100, Math.round((bedUsage / bedQuota) * 100));

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="font-bold text-slate-100 hover:text-indigo-400 transition-colors block text-sm"
                        >
                          {tenant.name}
                        </Link>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {tenant.subdomain}.hmsmedcore.com
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-medium">
                          {tenant.tier}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            tenant.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tenant.status === 'TRIAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : tenant.status === 'SUSPENDED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tenant.status === 'ACTIVE'
                                ? 'bg-emerald-400'
                                : tenant.status === 'TRIAL'
                                ? 'bg-amber-400'
                                : tenant.status === 'SUSPENDED'
                                ? 'bg-rose-400'
                                : 'bg-slate-500'
                            }`}
                          />
                          {tenant.status}
                        </span>
                      </td>

                      {/* Doctor Quota Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{docUsage} used</span>
                            <span>{docQuota} max</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                docPercent > 90
                                  ? 'bg-rose-500'
                                  : docPercent > 75
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${docPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Bed Quota Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{bedUsage} used</span>
                            <span>{bedQuota} max</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-500"
                              style={{ width: `${bedPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-medium">{tenant.billingContact?.name || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {tenant.billingContact?.email || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <span>Manage</span>
                        </Link>

                        {tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForAction(tenant);
                              setActionType('SUSPEND');
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors inline-flex items-center gap-1"
                          >
                            <PauseCircle className="w-3 h-3" />
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForAction(tenant);
                              setActionType('REACTIVATE');
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-colors inline-flex items-center gap-1"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend / Reactivate Confirmation Modal */}
      {selectedTenantForAction && actionType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  actionType === 'SUSPEND'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {actionType === 'SUSPEND' ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {actionType === 'SUSPEND' ? 'Suspend Hospital Tenant' : 'Reactivate Hospital Tenant'}
                </h3>
                <p className="text-xs text-slate-400">{selectedTenantForAction.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {actionType === 'SUSPEND'
                ? 'Suspending this tenant will temporarily lock out all hospital staff logins while preserving all databases, records, and clinical audits.'
                : 'Reactivating this tenant will restore full access for authorized hospital staff immediately.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Audit Justification Reason</label>
              <textarea
                rows={3}
                placeholder={
                  actionType === 'SUSPEND'
                    ? 'e.g. Non-payment, compliance inquiry, requested maintenance'
                    : 'e.g. Payment verified, maintenance resolved'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTenantForAction(null);
                  setActionType(null);
                  setActionReason('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleStatusUpdate}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5 ${
                  actionType === 'SUSPEND'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {isSubmittingAction ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm {actionType === 'SUSPEND' ? 'Suspension' : 'Reactivation'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminAppShell>
  );
}
