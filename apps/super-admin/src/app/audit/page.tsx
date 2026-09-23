'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import type { PlatformAuditLog } from '@hms/types';
import {
  Lock,
  Search,
  Filter,
  Shield,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export default function PlatformAuditTrailPage() {
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payload modal state
  const [inspectLog, setInspectLog] = useState<PlatformAuditLog | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: PlatformAuditLog[] }>(
        '/super-admin/audit?limit=100',
      );
      setAuditLogs(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load platform audit trail.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log: any) => {
      const actor = log.actorEmail || log.userEmail || log.userId || '';
      const action = log.action || '';
      const targetTenant =
        log.targetTenantName ||
        (log.details as any)?.tenantName ||
        (log.details as any)?.tenantId ||
        log.targetTenantId ||
        '';
      const ip = log.ipAddress || '';

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        actor.toLowerCase().includes(query) ||
        action.toLowerCase().includes(query) ||
        targetTenant.toLowerCase().includes(query) ||
        ip.toLowerCase().includes(query);

      const matchesAction = selectedAction === 'ALL' || action === selectedAction;
      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, selectedAction]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('SUSPEND')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (action.includes('REACTIVATE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (action.includes('PROVISION')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (action.includes('OVERRIDE')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (action.includes('BROADCAST')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <SuperAdminAppShell
      title="Platform Security & Audit Trail"
      description="Cryptographically anchored immutable audit trail of administrative commands, tenant state mutations, and access events."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Security & Audit' }]}
      actions={
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audit Trail
        </button>
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search actor email, tenant, action, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5" />
          <span>Action Type:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Platform Actions</option>
            <option value="TENANT_PROVISIONED">TENANT_PROVISIONED</option>
            <option value="TENANT_STATUS_UPDATED">TENANT_STATUS_UPDATED</option>
            <option value="TENANT_QUOTAS_OVERRIDDEN">TENANT_QUOTAS_OVERRIDDEN</option>
            <option value="PLAN_CREATED">PLAN_CREATED</option>
            <option value="PLAN_UPDATED">PLAN_UPDATED</option>
            <option value="PLATFORM_BROADCAST_CREATED">PLATFORM_BROADCAST_CREATED</option>
            <option value="PLATFORM_BROADCAST_DISMISSED">PLATFORM_BROADCAST_DISMISSED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Querying immutable audit collection...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Lock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No platform audit records found</p>
            <p className="text-slate-500">Actions taken in the control plane are permanently recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Platform Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Hospital</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.map((log: any) => {
                  const logId = log.id || log._id || Math.random().toString();
                  const actorDisplay = log.actorEmail || log.userEmail || log.userId || 'System';
                  const tenantDisplay =
                    log.targetTenantName ||
                    (log.details as any)?.tenantName ||
                    (log.details as any)?.tenantId ||
                    log.targetTenantId ||
                    'Platform-Wide';

                  return (
                  <tr key={logId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getActionBadgeColor(
                          log.action || '',
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-200">
                      <span className="font-medium">{actorDisplay}</span>
                    </td>

                    <td className="py-3.5 px-4 text-indigo-300 font-sans font-medium">
                      {tenantDisplay}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">ID: {inspectLog.id}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Action:</span>
                <span className="font-mono text-indigo-300 font-semibold">{inspectLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Actor:</span>
                <span className="font-mono text-slate-200">{inspectLog.actorEmail}</span>
              </div>
              {inspectLog.targetTenantName && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Target Tenant:</span>
                  <span className="text-slate-200">{inspectLog.targetTenantName}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-200">{inspectLog.timestamp}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Sanitized Event Metadata</label>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
                {JSON.stringify(inspectLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminAppShell>
  );
}
