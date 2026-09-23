'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  KeyRound,
  Search,
  ShieldCheck,
  Lock,
  Layers,
  CheckCircle2,
  FileText,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>('/roles/permissions');
      if (res?.data) {
        setPermissions(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPermissions();
  }, [fetchPermissions]);

  // Extract unique domains
  const domains = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      const code = p.code || p.slug || '';
      const d = p.domain || p.module || (code ? code.split('.')[0] : 'general');
      if (d) set.add(d);
    }
    return Array.from(set).sort();
  }, [permissions]);

  const filteredPermissions = permissions.filter((p) => {
    const code = p.code || p.slug || '';
    const domain = p.domain || p.module || (code ? code.split('.')[0] : 'general');
    const matchesDomain = selectedDomain === 'ALL' || domain.toLowerCase() === selectedDomain.toLowerCase();
    const matchesSearch =
      code.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      domain.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <AppShell
      title="Permissions Explorer"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Permissions' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Hospital Security Privileges & Permissions</h1>
          <p className="text-xs text-slate-500">
            Authoritative platform permission definitions governing clinical endpoints, data operations, and administrative functions.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered Privileges</span>
            <div className="text-2xl font-bold text-slate-900">{permissions.length}</div>
            <p className="text-2xs text-slate-500">Fine-grained operational scopes</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Functional Domains</span>
            <div className="text-2xl font-bold text-teal-700">{domains.length}</div>
            <p className="text-2xs text-slate-500">Clinical, operational, and administrative</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Isolation Invariant</span>
            <div className="text-2xl font-bold text-emerald-700">Tenant-Scoped</div>
            <p className="text-2xs text-slate-500">Cryptographically verified JWT context</p>
          </div>
        </div>

        {/* Search and Domain Pills */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search permissions by slug, name, or domain (e.g. emr.create, billing)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDomain('ALL')}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                selectedDomain === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              All Domains ({permissions.length})
            </button>
            {domains.map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={cn(
                  'px-3 py-1 rounded-xl text-xs font-semibold uppercase whitespace-nowrap transition-colors cursor-pointer',
                  selectedDomain === dom
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {dom}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Permission Slug</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Access Level</th>
                  <th className="px-4 py-3">Security Guard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Loading permissions catalog...
                    </td>
                  </tr>
                ) : filteredPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No permissions found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredPermissions.map((perm) => {
                    const permCode = perm.code || perm.slug || 'unknown';
                    const domain = perm.domain || perm.module || (permCode ? permCode.split('.')[0] : 'general');
                    return (
                      <tr key={permCode} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span className="font-mono font-bold text-slate-900">{permCode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                            {domain}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {perm.description || 'Restricted system privilege'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {permCode.includes('manage') || permCode.includes('delete')
                              ? 'Administrative'
                              : permCode.includes('create') || permCode.includes('update')
                              ? 'Write / Operational'
                              : 'Read / View'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                            Tenant Protected
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
