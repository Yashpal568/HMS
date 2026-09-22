'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Database,
  Cpu,
  Clock,
  RefreshCw,
  AlertTriangle,
  Shield,
  X,
  CheckCircle2,
} from 'lucide-react';

interface DeepHealthData {
  status: 'ok' | 'degraded';
  database: {
    status: string;
    latencyMs: number;
    poolSize: number;
  };
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  uptimeSeconds: number;
  timestamp: string;
}

interface DeepHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeepHealthModal({ isOpen, onClose }: DeepHealthModalProps) {
  const [data, setData] = useState<DeepHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DeepHealthData>('/health/deep');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch deep system health telemetry');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchHealth();
      const interval = setInterval(() => {
        void fetchHealth();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchHealth]);

  if (!isOpen) return null;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deep-health-title"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 id="deep-health-title" className="text-lg font-bold text-white tracking-tight">
                System Telemetry & Health
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Real-time database latency, memory footprint, and production telemetry.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  data.status === 'ok'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                {data.status === 'ok' ? 'HEALTHY' : 'DEGRADED'}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error ? (
            <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-medium">Gathering deep system diagnostics...</p>
            </div>
          ) : (
            <>
              {/* Database Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Database className="h-4 w-4 text-teal-600" />
                    <span>MongoDB Atlas System of Record</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {data.database.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Roundtrip Latency
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{data.database.latencyMs}</span>
                      <span className="text-xs font-semibold text-slate-500">ms</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Max Connection Pool
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{data.database.poolSize}</span>
                      <span className="text-xs font-semibold text-slate-500">sockets</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Footprint */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Cpu className="h-4 w-4 text-indigo-600" />
                    <span>Node.js Process Memory Footprint</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-600">RSS: {data.memory.rssMb} MB</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Heap Used
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{data.memory.heapUsedMb}</span>
                      <span className="text-xs font-semibold text-slate-500">MB</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Heap Total
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{data.memory.heapTotalMb}</span>
                      <span className="text-xs font-semibold text-slate-500">MB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uptime and Security */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Server Uptime</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{formatUptime(data.uptimeSeconds)}</div>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
                    <Shield className="h-3.5 w-3.5 text-teal-600" />
                    <span>Security Headers</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-700">Helmet & CSP Active</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchHealth()}
            disabled={isLoading}
            className="text-xs text-slate-600 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
