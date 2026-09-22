'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import type {
  PlatformTelemetry,
  Tenant,
  Subscription,
  PlatformBroadcast,
  PlatformAuditLog,
} from '@hms/types';
import {
  Building2,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  PlusCircle,
  Megaphone,
  Layers,
  Server,
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const [telemetry, setTelemetry] = useState<PlatformTelemetry | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcast[]>([]);
  const [recentAudits, setRecentAudits] = useState<PlatformAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [telemetryRes, tenantsRes, subsRes, broadcastRes, auditRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: PlatformTelemetry }>('/super-admin/telemetry'),
        apiClient.get<{ success: boolean; data: Tenant[] }>('/super-admin/tenants'),
        apiClient.get<{ success: boolean; data: Subscription[] }>('/super-admin/subscriptions'),
        apiClient.get<{ success: boolean; data: PlatformBroadcast[] }>('/super-admin/broadcasts'),
        apiClient.get<{ success: boolean; data: PlatformAuditLog[] }>('/super-admin/audit?limit=6'),
      ]);

      if (telemetryRes.status === 'fulfilled') setTelemetry(telemetryRes.value.data);
      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value.data);
      if (subsRes.status === 'fulfilled') setSubscriptions(subsRes.value.data);
      if (broadcastRes.status === 'fulfilled') setBroadcasts(broadcastRes.value.data);
      if (auditRes.status === 'fulfilled') setRecentAudits(auditRes.value.data);
    } catch (err: unknown) {
      setError('Failed to load dashboard metrics. Ensure the backend API is active.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate MRR / ARR from real subscriptions
  const calculatedMrr = subscriptions.reduce((sum, s) => {
    if (s.status !== 'ACTIVE') return sum;
    return sum + (s.billingCycle === 'ANNUAL' ? Math.round(s.amount / 12) : s.amount);
  }, 0);
  const calculatedArr = calculatedMrr * 12;

  const activeTenantsCount = telemetry?.activeTenants ?? tenants.filter((t) => t.status === 'ACTIVE').length;
  const totalTenantsCount = telemetry?.totalTenants ?? tenants.length;

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <SuperAdminAppShell
      title="SaaS Executive Cockpit"
      description="Real-time multi-tenant health, global licensing, infrastructure telemetry, and platform governance."
      breadcrumbs={[{ label: 'Platform Console' }, { label: 'Dashboard' }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
          <Link
            href="/tenants/new"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Provision Tenant
          </Link>
        </div>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Broadcast Banner if active */}
      {broadcasts.length > 0 && (
        <div className="space-y-2">
          {broadcasts.slice(0, 2).map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                b.severity === 'CRITICAL'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : b.severity === 'WARNING'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 shrink-0" />
                <div>
                  <span className="font-semibold uppercase tracking-wider text-[10px] mr-2 px-1.5 py-0.5 rounded bg-black/30">
                    {b.severity}
                  </span>
                  <span className="font-medium text-slate-100">{b.title}:</span>{' '}
                  <span className="text-slate-300">{b.message}</span>
                </div>
              </div>
              <span className="text-[11px] opacity-70 font-mono shrink-0">
                Audience: {b.targetAudience}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top SaaS Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR / ARR */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Monthly Run Rate (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              ${calculatedMrr.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">ARR: ${calculatedArr.toLocaleString()}</span>
              <span>across {subscriptions.length} contracts</span>
            </div>
          </div>
        </div>

        {/* Hospital Tenants */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Hospital Tenants</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {activeTenantsCount}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {totalTenantsCount}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span className="text-indigo-400 font-medium">{activeTenantsCount} active</span>
              <span>•</span>
              <span>{totalTenantsCount - activeTenantsCount} trial/suspended</span>
            </div>
          </div>
        </div>

        {/* Licensed Clinicians */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Licensed Clinicians</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {telemetry?.totalDoctors ?? 0}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span className="text-teal-400 font-medium">{telemetry?.totalUsers ?? 0}</span>
              <span>total staff accounts</span>
            </div>
          </div>
        </div>

        {/* MongoDB Atlas Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Atlas Ping Latency</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {telemetry?.databasePingMs ?? 0} ms
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
              <span className="text-emerald-400">Healthy</span>
              <span>•</span>
              <span>Uptime: {telemetry ? formatUptime(telemetry.uptimeSeconds) : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Infrastructure Cockpit & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tenants Snapshot */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Active Hospital Tenants</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top provisioned healthcare facilities and quota consumption
                </p>
              </div>
              <Link
                href="/tenants"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View all tenants ({tenants.length})
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading tenants...</div>
            ) : tenants.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No tenants provisioned yet. Click &ldquo;Provision Tenant&rdquo; to onboard a hospital.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-medium">
                    <tr>
                      <th className="pb-2.5 font-medium">Hospital Name</th>
                      <th className="pb-2.5 font-medium">Subdomain</th>
                      <th className="pb-2.5 font-medium">Tier</th>
                      <th className="pb-2.5 font-medium">Status</th>
                      <th className="pb-2.5 font-medium text-right">Doctors / Quota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tenants.slice(0, 5).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-medium text-slate-200">
                          <Link href={`/tenants/${t.id}`} className="hover:text-indigo-400">
                            {t.name}
                          </Link>
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {t.subdomain}.hmsmedcore.com
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-medium">
                            {t.tier}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              t.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.status === 'TRIAL'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          {t.usage?.doctorsCount ?? 0} / {t.quotas?.maxDoctors ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Platform Security Ledger Preview */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Platform Security Audit Feed</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immutable ledger of SaaS owner actions, tenant lifecycle, and quota changes
                </p>
              </div>
              <Link
                href="/audit"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Full Audit Trail
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No recent platform audit records.
              </div>
            ) : (
              <div className="space-y-2">
                {recentAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-200">
                            {audit.action}
                          </span>
                          {audit.targetTenantName && (
                            <span className="text-slate-400">
                              → <span className="text-indigo-300">{audit.targetTenantName}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          by <span className="text-slate-400">{audit.actorEmail}</span> • IP:{' '}
                          {audit.ipAddress || '127.0.0.1'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(audit.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Platform Health & Quick Action Cards */}
        <div className="space-y-4">
          {/* Real-time Infrastructure Box */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Infrastructure Telemetry
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">MongoDB Atlas Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60 font-mono">
                <span className="text-slate-400 font-sans">Active Connections</span>
                <span className="text-slate-200">{telemetry?.activeConnections ?? 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60 font-mono">
                <span className="text-slate-400 font-sans">Node Memory RSS</span>
                <span className="text-slate-200">{telemetry?.memoryRssMb ?? 0} MB</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60 font-mono">
                <span className="text-slate-400 font-sans">Node Memory Heap</span>
                <span className="text-slate-200">{telemetry?.memoryHeapMb ?? 0} MB</span>
              </div>
              <div className="flex justify-between items-center py-2 font-mono">
                <span className="text-slate-400 font-sans">Platform Total Patients</span>
                <span className="text-indigo-300 font-semibold">
                  {telemetry?.totalPatients ?? 0}
                </span>
              </div>
            </div>

            <Link
              href="/telemetry"
              className="block w-full text-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Open Telemetry Console
            </Link>
          </div>

          {/* Quick Management Actions */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">Platform Controls</h3>
            <div className="space-y-2">
              <Link
                href="/tenants/new"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Provision New Tenant</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/plans"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Manage Subscription Plans</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/broadcasts"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-750 text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>Broadcast System Notice</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Zero PHI Reminder */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Zero-PHI Guarantee Enforced</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Clinical consultations, patient medical records, prescriptions, and lab tests remain
              cryptographically inaccessible to platform administrators.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminAppShell>
  );
}
