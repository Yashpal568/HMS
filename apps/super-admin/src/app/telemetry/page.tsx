'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import type { PlatformTelemetry } from '@hms/types';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  Users,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shield,
  HardDrive,
} from 'lucide-react';

export default function TelemetryCockpitPage() {
  const [telemetry, setTelemetry] = useState<PlatformTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTelemetry = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: PlatformTelemetry }>('/super-admin/telemetry');
      setTelemetry(res.data);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to ping platform telemetry.');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry(false);
  }, [fetchTelemetry]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchTelemetry(true);
      }, 10000); // every 10s
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchTelemetry]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  };

  const pingMs = telemetry?.databasePingMs ?? 0;
  const isHealthyPing = pingMs < 100;

  return (
    <SuperAdminAppShell
      title="Infrastructure & Cluster Telemetry"
      description="Real-time telemetry from MongoDB Atlas, Node.js process runtime, connection pools, and platform census."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Telemetry' }]}
      actions={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Auto-Refresh (10s)</span>
          </label>
          <button
            type="button"
            onClick={() => fetchTelemetry(false)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ping Now
          </button>
        </div>
      }
    >
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

      {/* Cluster Status Top Alert */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/30 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white">MongoDB Atlas Cloud Cluster</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tenant shared cluster partitioned via cryptographic tenant scoping indexes.
            </p>
          </div>
        </div>

        <div className="text-right text-xs font-mono text-slate-400">
          <div>Last Ping Sample:</div>
          <div className="text-slate-200 font-semibold">{lastRefreshedAt.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Ping Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Database Ping Latency</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isHealthyPing
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {pingMs} <span className="text-sm font-normal text-slate-400">ms</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Round-trip execution to MongoDB admin ping command
            </p>
          </div>
        </div>

        {/* Active Connections */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Connection Pool</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {telemetry?.activeConnections ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Active client socket connections in pool</p>
          </div>
        </div>

        {/* Process Memory RSS */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Process Memory (RSS)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {telemetry?.memoryRssMb ?? 0}{' '}
              <span className="text-sm font-normal text-slate-400">MB</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Heap: {telemetry?.memoryHeapMb ?? 0} MB • Resident set size
            </p>
          </div>
        </div>

        {/* Process Uptime */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">NestJS Core Uptime</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-tight font-mono">
              {telemetry ? formatUptime(telemetry.uptimeSeconds) : '0s'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Continuous daemon execution</p>
          </div>
        </div>
      </div>

      {/* Global Census Metrics */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">Platform SaaS Census</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated system-wide volume counters across all provisioned hospital tenants.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Total Tenants</span>
            <div className="text-xl font-bold text-white font-mono">
              {telemetry?.totalTenants ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Active Tenants</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {telemetry?.activeTenants ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Total Users</span>
            <div className="text-xl font-bold text-indigo-300 font-mono">
              {telemetry?.totalUsers ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Doctors Licensed</span>
            <div className="text-xl font-bold text-teal-400 font-mono">
              {telemetry?.totalDoctors ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Patients Managed</span>
            <div className="text-xl font-bold text-purple-400 font-mono">
              {telemetry?.totalPatients ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Guarantees Box */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Multi-Tenant Architecture Invariants
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">MongoDB Atlas Single Source of Record</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Cloud database cluster partitioned with multi-tenant indices on `{`{ tenantId: 1 }`}`. No local SQLite or Prisma.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">Strict Zero-PHI Access Boundary</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Platform Super Admin endpoints strictly exclude clinical collections (encounters, lab results, prescriptions).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">Cryptographic Session Isolation</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Backend services derive tenant context strictly from verified JWT claims, never client-supplied query parameters.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminAppShell>
  );
}
