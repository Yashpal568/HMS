'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Briefcase,
  Layers,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  Users,
  Edit2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ResourceScope } from '@hms/types';

export default function WorkspaceAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [assignedWorkspaces, setAssignedWorkspaces] = useState<string[]>([]);
  const [assignedScope, setAssignedScope] = useState<ResourceScope>(ResourceScope.HOSPITAL_WIDE);
  const [assignedDept, setAssignedDept] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignRes, tempRes, deptRes] = await Promise.all([
        apiClient.get<any>('/workspaces/assignments'),
        apiClient.get<any>('/workspaces/templates'),
        apiClient.get<any>('/organization/departments').catch(() => null),
      ]);

      if (assignRes?.data) setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
      if (tempRes?.data) setTemplates(Array.isArray(tempRes.data) ? tempRes.data : []);
      if (deptRes?.data) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTeamsForDept = async (deptId: string) => {
    if (!deptId) {
      setTeams([]);
      return;
    }
    try {
      const res = await apiClient.get<any>(`/organization/teams?departmentId=${deptId}`);
      if (res?.data && Array.isArray(res.data)) {
        setTeams(res.data);
      } else {
        setTeams([]);
      }
    } catch {
      setTeams([]);
    }
  };

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  const toggleWorkspace = (code: string) => {
    setAssignedWorkspaces((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleOpenAssignModal = (item: any) => {
    setSelectedAssignment(item);
    setAssignedWorkspaces(item.assignedWorkspaces || (item.role ? [item.role] : []));
    setAssignedScope(item.accessScope || ResourceScope.HOSPITAL_WIDE);
    setAssignedDept(item.departmentId || '');
    setAssignedTeam(item.teamId || '');
    setFormError(null);
    if (item.departmentId) {
      void fetchTeamsForDept(item.departmentId);
    } else {
      setTeams([]);
    }
    setIsAssignModalOpen(true);
  };

  const handleDeptChange = (deptId: string) => {
    setAssignedDept(deptId);
    setAssignedTeam('');
    void fetchTeamsForDept(deptId);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (assignedWorkspaces.length === 0) {
      setFormError('At least one workspace must be assigned.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const empId = selectedAssignment.id || selectedAssignment._id || selectedAssignment.employeeId;
      await apiClient.post('/workspaces/assign', {
        employeeId: empId,
        workspaces: assignedWorkspaces,
        accessScope: assignedScope,
        departmentId: assignedDept || undefined,
        teamId: assignedTeam || undefined,
      });

      const empName = selectedAssignment.employeeName || selectedAssignment.name || 'Employee';
      setStatusMessage(`Workspaces updated for ${empName}.`);
      setIsAssignModalOpen(false);
      await fetchAssignments();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save workspace assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = assignments.filter((a) => {
    const name = a.employeeName || a.name || '';
    const code = a.employeeCode || a.employeeId || '';
    const email = a.email || '';
    const dept = a.department || '';
    const q = search.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      title="Workspace Assignments"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Workspace Assignments' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Workspace Authorization Matrix</h1>
            <p className="text-xs text-slate-500">
              Grant single or multi-workspace authorizations and define operational access boundaries for personnel.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Search */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, code, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">User Account</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Workspace(s)</th>
                  <th className="px-4 py-3">Resource Scope</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      Loading workspace assignments...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      No assignments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const empName = item.employeeName || item.name || 'Unnamed Employee';
                    const empCode = item.employeeCode || item.employeeId || '—';
                    const hasAccount = item.hasUserAccount ?? item.isUserLinked ?? false;
                    const primaryRole = (item.assignedRoles && item.assignedRoles[0]) || item.staffType || item.designation || 'Staff';
                    return (
                      <tr key={item.id || item.employeeId || item._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{empName}</div>
                          <div className="text-2xs font-mono text-slate-400">{empCode}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">{item.email || '—'}</div>
                          {hasAccount ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Linked
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Unlinked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                            {primaryRole}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {item.department || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.team || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.assignedWorkspaces || []).map((ws: string) => (
                              <span
                                key={ws}
                                className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-[10px] font-semibold text-teal-800"
                              >
                                {ws}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
                            {item.accessScope}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.userStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAssignModal(item)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modify Workspaces Modal */}
        {isAssignModalOpen && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Authorize Workspaces & Access Scope
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedAssignment.employeeName} ({selectedAssignment.employeeCode})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
                {/* Workspaces Checklist */}
                <div className="space-y-2">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    Authorized Operational Workspaces *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    {templates.map((tpl) => {
                      const isChecked = assignedWorkspaces.includes(tpl.code);
                      return (
                        <label
                          key={tpl.code}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-xl border transition-colors cursor-pointer select-none',
                            isChecked
                              ? 'bg-teal-50 border-teal-300 text-teal-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleWorkspace(tpl.code)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-xs">{tpl.name.replace(' Workspace', '')}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{tpl.code}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Resource Scope */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                    Operational Resource Scope *
                  </label>
                  <select
                    value={assignedScope}
                    onChange={(e) => setAssignedScope(e.target.value as ResourceScope)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value={ResourceScope.HOSPITAL_WIDE}>HOSPITAL_WIDE (All facilities & wards)</option>
                    <option value={ResourceScope.DEPARTMENT_ONLY}>DEPARTMENT_ONLY (Scoped to assigned unit)</option>
                    <option value={ResourceScope.TEAM_ONLY}>TEAM_ONLY (Scoped to clinical care team)</option>
                    <option value={ResourceScope.ASSIGNED_RESOURCES}>ASSIGNED_RESOURCES (Strictly assigned patients/beds)</option>
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={assignedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                {/* Team Selection */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1">
                    Assigned Team (Optional)
                  </label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    disabled={!assignedDept || teams.length === 0}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">{teams.length === 0 ? (assignedDept ? 'No teams in this department' : 'Select a department first') : 'Select Team (Optional)'}</option>
                    {teams.map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAssignModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Authorizations'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
