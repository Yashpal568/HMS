'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  ShieldCheck,
  Plus,
  KeyRound,
  CheckCircle2,
  X,
  AlertCircle,
  Users,
  Lock,
  Edit2,
  Trash2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  // Form State
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchRolesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        apiClient.get<any>('/roles'),
        apiClient.get<any>('/roles/permissions'),
      ]);

      if (rolesRes?.data) setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      if (permRes?.data) setAllPermissions(Array.isArray(permRes.data) ? permRes.data : []);
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRolesData();
  }, [fetchRolesData]);

  // Group permissions by category/domain (e.g. "patients", "appointments", "billing")
  const groupedPermissions = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of allPermissions) {
      const domain = p.domain || (p.code ? p.code.split('.')[0] : 'general');
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(p);
    }
    return groups;
  }, [allPermissions]);

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/roles', {
        name: roleName.trim().toUpperCase(),
        description: roleDescription.trim(),
        permissions: selectedPermissions,
      });

      setStatusMessage(`Role ${roleName} created successfully.`);
      setIsCreateModalOpen(false);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      await fetchRolesData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.patch(`/roles/${selectedRole.name}`, {
        description: roleDescription.trim(),
        permissions: selectedPermissions,
      });

      setStatusMessage(`Role ${selectedRole.name} updated successfully.`);
      setIsEditModalOpen(false);
      await fetchRolesData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await apiClient.delete(`/roles/${roleName}`);
      setStatusMessage(`Role ${roleName} deleted successfully.`);
      await fetchRolesData();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <AppShell
      title="Roles Management"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Roles' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hospital Roles & Access Profiles</h1>
            <p className="text-xs text-slate-500">
              Configure system and custom hospital roles, grant domain privileges, and inspect security assignments.
            </p>
          </div>

          <Button
            onClick={() => {
              setRoleName('');
              setRoleDescription('');
              setSelectedPermissions([]);
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Custom Role
          </Button>
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
              placeholder="Search roles by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/90">
            Loading roles catalog...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200/90">
            No roles found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role) => (
              <div
                key={role._id || role.name}
                className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4 hover:border-teal-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                        {role.isSystem ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            System
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{role.description}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <KeyRound className="h-3.5 w-3.5 text-teal-600" />
                      {role.permissions?.length || 0} Privileges
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Level {role.isSystem ? 'Standard' : 'Facility'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-none pt-1">
                    {(role.permissions || []).slice(0, 8).map((perm: string) => (
                      <span
                        key={perm}
                        className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600"
                      >
                        {perm}
                      </span>
                    ))}
                    {(role.permissions || []).length > 8 && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-semibold">
                        +{role.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRole(role);
                      setRoleDescription(role.description || '');
                      setSelectedPermissions(role.permissions || []);
                      setFormError(null);
                      setIsEditModalOpen(true);
                    }}
                    className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Configure Privileges
                  </Button>

                  {!role.isSystem && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRole(role.name)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Custom Role Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Custom Role</h3>
                  <p className="text-xs text-slate-500">Define role identifier, description, and assign specific operational permissions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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

              <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Role Identifier (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CLINICAL_COORDINATOR, TRIAGE_SUPERVISOR"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describe clinical or administrative responsibilities..."
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                {/* Permissions Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Assign Privileges ({selectedPermissions.length} selected)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPermissions(
                          selectedPermissions.length === allPermissions.length
                            ? []
                            : allPermissions.map((p) => p.code),
                        )
                      }
                      className="text-2xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                    >
                      {selectedPermissions.length === allPermissions.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    {Object.entries(groupedPermissions).map(([domain, perms]) => (
                      <div key={domain} className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-teal-900 border-b border-slate-200 pb-1">
                          {domain}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {perms.map((p) => {
                            const isChecked = selectedPermissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={cn(
                                  'flex items-center gap-2 p-1.5 rounded-lg border transition-colors cursor-pointer select-none text-[11px]',
                                  isChecked
                                    ? 'bg-teal-50 border-teal-200 text-teal-950 font-medium'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.code)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                                />
                                <span className="font-mono truncate">{p.code}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Role Permissions Modal */}
        {isEditModalOpen && selectedRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure Privileges: {selectedRole.name}
                  </h3>
                  <p className="text-xs text-slate-500">Update assigned permissions for this operational role.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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

              <form onSubmit={handleEditRole} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Privileges ({selectedPermissions.length} active)
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    {Object.entries(groupedPermissions).map(([domain, perms]) => (
                      <div key={domain} className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-teal-900 border-b border-slate-200 pb-1">
                          {domain}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {perms.map((p) => {
                            const isChecked = selectedPermissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={cn(
                                  'flex items-center gap-2 p-1.5 rounded-lg border transition-colors cursor-pointer select-none text-[11px]',
                                  isChecked
                                    ? 'bg-teal-50 border-teal-200 text-teal-950 font-medium'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(p.code)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                                />
                                <span className="font-mono truncate">{p.code}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Privileges'}
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
