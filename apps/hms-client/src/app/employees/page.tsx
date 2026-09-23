'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Search,
  Plus,
  Filter,
  UserCheck,
  Building2,
  Mail,
  Phone,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Eye,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StaffType, EmploymentStatus, ResourceScope } from '@hms/types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    staffType: StaffType.DOCTOR,
    designation: '',
    departmentId: '',
    teamId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    createUser: true,
    role: 'DOCTOR',
    assignedWorkspaces: ['DOCTOR'],
    accessScope: ResourceScope.HOSPITAL_WIDE,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedStaffType) params.append('staffType', selectedStaffType);
      if (selectedStatus) params.append('status', selectedStatus);

      const [empRes, deptRes, teamRes] = await Promise.all([
        apiClient.get<any>(`/workforce/employees?${params.toString()}`),
        apiClient.get<any>('/organization/departments').catch(() => null),
        apiClient.get<any>('/organization/teams').catch(() => null),
      ]);

      if (empRes?.data) {
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      }
      if (deptRes?.data) {
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      }
      if (teamRes?.data) {
        setTeams(Array.isArray(teamRes.data) ? teamRes.data : []);
      }
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedDept, selectedStaffType, selectedStatus]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/workforce/employees', {
        ...formData,
        departmentId: formData.departmentId || undefined,
        teamId: formData.teamId || undefined,
      });

      setSuccessMessage('Employee profile successfully created.');
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        staffType: StaffType.DOCTOR,
        designation: '',
        departmentId: '',
        teamId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        createUser: true,
        role: 'DOCTOR',
        assignedWorkspaces: ['DOCTOR'],
        accessScope: ResourceScope.HOSPITAL_WIDE,
      });
      await fetchEmployees();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Employee Directory"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Employees' },
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hospital Workforce & Employees</h1>
            <p className="text-xs text-slate-500">
              Manage clinical and operational staff, credentials, workspace roles, and organizational assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Employee
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, employee ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedStaffType}
                onChange={(e) => setSelectedStaffType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
              >
                <option value="">All Staff Types</option>
                {Object.values(StaffType).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
              >
                <option value="">All Statuses</option>
                {Object.values(EmploymentStatus).map((es) => (
                  <option key={es} value={es}>{es}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Department & Team</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Workspaces</th>
                  <th className="px-4 py-3">User Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      Loading employees...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No employees found matching current criteria. Click &quot;Add Employee&quot; to provision a staff member.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id || emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-teal-50 border border-teal-100 text-teal-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.firstName?.[0] || 'E'}{emp.lastName?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</div>
                            <div className="text-2xs text-slate-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-600">
                        {emp.employeeId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{emp.departmentId?.name || 'General'}</div>
                        <div className="text-2xs text-slate-400">{emp.teamId?.name || 'No team'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{emp.designation}</div>
                        <div className="text-2xs text-slate-400">{emp.staffType}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(emp.assignedWorkspaces && emp.assignedWorkspaces.length > 0
                            ? emp.assignedWorkspaces
                            : [emp.staffType]
                          ).map((ws: string) => (
                            <span
                              key={ws}
                              className="px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200/80 text-[10px] font-medium text-teal-800"
                            >
                              {ws}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.userId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Active Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            No Login
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={emp.employmentStatus === 'ACTIVE' ? 'success' : 'secondary'}
                          className="text-2xs"
                        >
                          {emp.employmentStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsViewModalOpen(true);
                          }}
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Multi-Section Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision New Hospital Employee</h3>
                  <p className="text-xs text-slate-500">Configure personal credentials, organizational unit, access role, and workspaces.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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

              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
                {/* Section 1: Basic Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">1. Personal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Employment & Department */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">2. Employment & Unit</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Staff Type *</label>
                      <select
                        value={formData.staffType}
                        onChange={(e) => {
                          const st = e.target.value as StaffType;
                          setFormData({
                            ...formData,
                            staffType: st,
                            role: st,
                            assignedWorkspaces: [st],
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      >
                        {Object.values(StaffType).map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Job Designation *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior Cardiologist, Charge Nurse"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Department</label>
                      <select
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: User Account & Workspace Access */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">3. Login & Workspace Access</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.createUser}
                        onChange={(e) => setFormData({ ...formData, createUser: e.target.checked })}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-semibold text-slate-800 text-xs">Provision User Login</span>
                    </label>
                  </div>

                  {formData.createUser && (
                    <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">System Role</label>
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-teal-500"
                          >
                            <option value="DOCTOR">DOCTOR</option>
                            <option value="NURSE">NURSE</option>
                            <option value="RECEPTIONIST">RECEPTIONIST</option>
                            <option value="PHARMACIST">PHARMACIST</option>
                            <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
                            <option value="ACCOUNTANT">ACCOUNTANT</option>
                            <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                            <option value="DEPARTMENT_MANAGER">DEPARTMENT_MANAGER</option>
                            <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Resource Scope</label>
                          <select
                            value={formData.accessScope}
                            onChange={(e) => setFormData({ ...formData, accessScope: e.target.value as ResourceScope })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-teal-500"
                          >
                            <option value={ResourceScope.HOSPITAL_WIDE}>Hospital Wide</option>
                            <option value={ResourceScope.DEPARTMENT_ONLY}>Department Only</option>
                            <option value={ResourceScope.TEAM_ONLY}>Team Only</option>
                            <option value={ResourceScope.ASSIGNED_RESOURCES}>Assigned Resources Only</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-teal-800">
                        A secure temporary password will be initialized and the account will require a password change on first sign-in.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Profile...' : 'Save Employee'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Profile Modal */}
        {isViewModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center text-base">
                    {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedEmployee.employeeId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.departmentId?.name || 'General'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Designation</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.designation}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Staff Type</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.staffType}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resource Scope</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedEmployee.accessScope || 'HOSPITAL_WIDE'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Workspaces</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedEmployee.assignedWorkspaces || [selectedEmployee.staffType]).map((ws: string) => (
                      <span key={ws} className="px-2 py-0.5 rounded bg-teal-100/70 text-teal-800 text-2xs font-semibold">
                        {ws}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
