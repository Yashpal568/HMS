'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  UserCog,
  Search,
  Plus,
  Mail,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  Building2,
  Link2,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StaffUserSummary } from '@hms/types';

export default function UsersAccessPage() {
  const [users, setUsers] = useState<StaffUserSummary[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'DOCTOR',
    department: '',
    specialization: '',
    phone: '',
    linkEmployeeId: '',
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
    message: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Edit Access Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUserSummary | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchUsersAndMeta = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRole) params.append('role', selectedRole);

      const [usersRes, empRes, rolesRes] = await Promise.all([
        apiClient.get<any>(`/users?${params.toString()}`),
        apiClient.get<any>('/workforce/employees').catch(() => null),
        apiClient.get<any>('/roles').catch(() => null),
      ]);

      if (usersRes?.data) {
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }
      if (empRes?.data) {
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      }
      if (rolesRes?.data) {
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      }
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    void fetchUsersAndMeta();
  }, [fetchUsersAndMeta]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setIsInviting(true);

    try {
      const res = await apiClient.post<any>('/users/invite', {
        firstName: inviteData.firstName.trim(),
        lastName: inviteData.lastName.trim(),
        email: inviteData.email.trim(),
        role: inviteData.role,
        department: inviteData.department.trim() || undefined,
        specialization: inviteData.specialization.trim() || undefined,
        phone: inviteData.phone.trim() || undefined,
      });

      if (res?.data) {
        setCreatedCredentials({
          email: res.data.email,
          temporaryPassword: res.data.temporaryPassword || 'Generated on server',
          message: res.data.message || 'User invited successfully.',
        });
        await fetchUsersAndMeta();
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to provision user.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleStatus = async (user: StaffUserSummary) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiClient.patch(`/users/${user.id}/status`, { status: nextStatus });
      setStatusMessage(`User ${user.email} marked as ${nextStatus}.`);
      await fetchUsersAndMeta();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleEditAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setIsUpdating(true);

    try {
      await apiClient.patch(`/users/${editingUser.id}/access`, {
        role: editRole,
        department: editDept || undefined,
        employeeId: editEmployeeId || undefined,
      });

      setIsEditModalOpen(false);
      setStatusMessage('User access configuration updated.');
      await fetchUsersAndMeta();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user access.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppShell
      title="Users & Access"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Users & Access' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">User Accounts & Access Control</h1>
            <p className="text-xs text-slate-500">
              Manage authentication accounts, role assignments, linked staff identities, and platform access states.
            </p>
          </div>

          <Button
            onClick={() => {
              setCreatedCredentials(null);
              setIsInviteModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Invite Staff User
          </Button>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r._id || r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Linked Employee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No user accounts found. Click &quot;Invite Staff User&quot; to provision an account.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const linkedEmp = employees.find(
                      (e) => e._id === u.employeeId || e.userId === u.id || e.email === u.email,
                    );

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                              <div className="text-2xs text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-[11px] font-semibold text-teal-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {u.department || 'General'}
                        </td>
                        <td className="px-4 py-3">
                          {linkedEmp ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <Link2 className="h-3.5 w-3.5 text-teal-600" />
                              <span className="font-mono font-medium">{linkedEmp.employeeId}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unlinked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}
                            className="text-2xs"
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-2xs text-slate-500">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                                setEditDept(u.department || '');
                                setEditEmployeeId(linkedEmp?._id || '');
                                setIsEditModalOpen(true);
                              }}
                              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            >
                              Edit Access
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(u)}
                              className={cn(
                                'text-xs',
                                u.status === 'ACTIVE'
                                  ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
                              )}
                            >
                              {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite User Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Invite Hospital Staff User</h3>
                  <p className="text-xs text-slate-500">Provision login access and generate sovereign credentials.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {inviteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              {createdCredentials ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{createdCredentials.message}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Email</span>
                        <div className="font-mono text-slate-900 font-semibold">{createdCredentials.email}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Temporary Password</span>
                        <div className="flex items-center justify-between font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-800">{createdCredentials.temporaryPassword}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(createdCredentials.temporaryPassword);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-xs cursor-pointer"
                          >
                            {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800">
                      Provide these credentials to the staff member. They will be required to change password on first login.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setIsInviteModalOpen(false)}>Done</Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={inviteData.firstName}
                        onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={inviteData.lastName}
                        onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Staff Work Email *</label>
                    <input
                      type="email"
                      required
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Assigned Role *</label>
                      <select
                        value={inviteData.role}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      >
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="NURSE">NURSE</option>
                        <option value="RECEPTIONIST">RECEPTIONIST</option>
                        <option value="PHARMACIST">PHARMACIST</option>
                        <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                        <option value="ACCOUNTANT">ACCOUNTANT</option>
                        <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                        <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Cardiology"
                        value={inviteData.department}
                        onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteModalOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      disabled={isInviting}
                    >
                      {isInviting ? 'Provisioning...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Edit Access Modal */}
        {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Modify User Access</h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleEditAccessSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">System Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="NURSE">NURSE</option>
                    <option value="RECEPTIONIST">RECEPTIONIST</option>
                    <option value="PHARMACIST">PHARMACIST</option>
                    <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                    <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Link to Employee Profile</label>
                  <select
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="">No linked employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {emp.employeeId} — {emp.firstName} {emp.lastName} ({emp.staffType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Saving...' : 'Update Access'}
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
