'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import type { Subscription, SubscriptionStatus } from '@hms/types';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function SubscriptionsLedgerPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: Subscription[] }>('/super-admin/subscriptions');
      setSubscriptions(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Aggregate metrics
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const totalMrr = subscriptions.reduce((sum, s) => {
    if (s.status !== 'ACTIVE') return sum;
    return sum + (s.billingCycle === 'ANNUAL' ? Math.round(s.amount / 12) : s.amount);
  }, 0);
  const totalArr = totalMrr * 12;

  return (
    <SuperAdminAppShell
      title="SaaS Subscriptions & MRR Ledger"
      description="Financial ledger of multi-hospital SaaS contracts, billing frequencies, renewal cycles, and MRR run rates."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Billing & Subscriptions' }]}
      actions={
        <button
          type="button"
          onClick={fetchSubscriptions}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Ledger
        </button>
      }
    >
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total SaaS MRR</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              ${totalMrr.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Normalized recurring monthly revenue</p>
          </div>
        </div>

        {/* ARR */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Annual Run Rate (ARR)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              ${totalArr.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Projected 12-month cloud revenue</p>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Contracts</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {activeSubs.length}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {subscriptions.length}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {subscriptions.length - activeSubs.length} trialing / past due
            </p>
          </div>
        </div>

        {/* Billing Reliability */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Contract Health</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight font-mono">
              {subscriptions.length > 0
                ? `${Math.round((activeSubs.length / subscriptions.length) * 100)}%`
                : '100%'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Payment & renewal standing</p>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Syncing subscription ledger...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No active billing subscriptions</p>
            <p className="text-slate-500">Subscriptions are automatically bound when tenants are provisioned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Hospital Tenant</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Billing Frequency</th>
                  <th className="py-3 px-4">Recurring Rate</th>
                  <th className="py-3 px-4">Contract Status</th>
                  <th className="py-3 px-4">Current Period End</th>
                  <th className="py-3 px-4">Overrides</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-100">
                      <Link
                        href={`/tenants/${sub.tenantId}`}
                        className="hover:text-indigo-400 font-semibold block"
                      >
                        {sub.tenantName || 'Tenant ' + sub.tenantId.slice(0, 8)}
                      </Link>
                      <span className="text-[10px] font-mono text-slate-500">{sub.tenantId}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-medium">
                        {sub.tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {sub.billingCycle}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ${sub.amount.toLocaleString()}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">
                        {sub.currency} / {sub.billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : sub.status === 'TRIALING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-400'
                              : sub.status === 'TRIALING'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        {sub.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : 'Auto-Renewing'}
                    </td>

                    <td className="py-3.5 px-4">
                      {sub.limitsOverride ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                          Custom Overrides Active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Standard Limits</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/tenants/${sub.tenantId}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <span>Tenant 360</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminAppShell>
  );
}
