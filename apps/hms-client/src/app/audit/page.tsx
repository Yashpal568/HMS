'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  X,
  User,
  Globe,
  Clock,
  Terminal,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import type { AuditLogEntry, AuditQueryResponse } from '@hms/types';

export default function AuditCenterPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiClient.get<{
        success: boolean;
        data: AuditLogEntry[];
        meta?: { total: number; totalPages: number; page: number; limit: number };
      }>(`/audit?${params.toString()}`);
      if (res?.data) {
        setLogs(res.data);
        if (res.meta) {
          setTotal(res.meta.total);
          setTotalPages(res.meta.totalPages);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, startDate, endDate, actionFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (actionFilter !== 'ALL') params.set('action', actionFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/audit/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('LOGIN') || action.includes('SUCCESS')) {
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    }
    if (action.includes('PAYMENT') || action.includes('INVOICE')) {
      return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    }
    if (action.includes('REFUND') || action.includes('CANCEL') || action.includes('FAILED')) {
      return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    }
    if (action.includes('REPORT') || action.includes('EXPORT')) {
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
    return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header Title & Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Master Security & Audit Center
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Immutable institutional security audit trail, access governance, and statutory compliance logging.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <Download className="h-4 w-4 text-rose-600" />
              <span>Export Audit CSV</span>
            </button>
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Multi-Criteria Filter Bar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search action, resource, email, IP address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
                <option value="PATIENT_CREATE">PATIENT_CREATE</option>
                <option value="APPOINTMENT_CREATE">APPOINTMENT_CREATE</option>
                <option value="EMR_FINALIZE">EMR_FINALIZE</option>
                <option value="LAB_ORDER_CREATE">LAB_ORDER_CREATE</option>
                <option value="MEDICINE_DISPENSE">MEDICINE_DISPENSE</option>
                <option value="GOODS_RECEIPT_CREATE">GOODS_RECEIPT_CREATE</option>
                <option value="INVOICE_CREATE">INVOICE_CREATE</option>
                <option value="PAYMENT_PROCESS">PAYMENT_PROCESS</option>
                <option value="REFUND_APPROVE">REFUND_APPROVE</option>
                <option value="REPORT_GENERATE">REPORT_GENERATE</option>
                <option value="AUDIT_EXPORT">AUDIT_EXPORT</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>

              {/* Date Pickers */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-foreground focus:outline-none"
                />
                <span>-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-foreground focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Ledger Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Resource</th>
                  <th className="py-3 px-4 font-semibold">User Attribution</th>
                  <th className="py-3 px-4 font-semibold">Client IP</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2 text-primary" />
                      Loading verified audit trail...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => {
                    const formattedDate = new Date(log.timestamp).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${getActionBadgeClass(
                              log.action,
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{log.resource}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{log.userEmail}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                            {log.userId}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{log.ipAddress}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted hover:border-primary/50 transition-colors"
                          >
                            <Eye className="h-3 w-3 text-primary" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      No security audit events match the specified filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <div>
                Showing page <span className="font-bold text-foreground">{page}</span> of{' '}
                <span className="font-bold text-foreground">{totalPages}</span> ({total} total entries)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Audit Metadata Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Audit Record Inspection</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Action Type</span>
                  <div className="font-mono font-bold text-foreground">{selectedLog.action}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Target Resource</span>
                  <div className="font-medium text-foreground">{selectedLog.resource}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">User / Actor</span>
                  <div className="font-medium text-foreground truncate">{selectedLog.userEmail}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Client IP Address</span>
                  <div className="font-mono font-medium text-foreground">{selectedLog.ipAddress}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-1.5">
                  <span>Sanitized Audit Payload (JSON)</span>
                  <span className="text-[10px] text-emerald-600 font-medium">PII & Passwords Redacted</span>
                </div>
                <pre className="max-h-60 overflow-y-auto rounded-lg bg-muted/80 p-3 font-mono text-[11px] text-foreground border border-border">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                <span>User-Agent: {selectedLog.userAgent}</span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
