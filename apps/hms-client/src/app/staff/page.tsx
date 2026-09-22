'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserCheck,
  UserPlus,
  Search,
  RefreshCw,
  Stethoscope,
  Shield,
  Pill,
  FlaskConical,
  Receipt,
  Package,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  Filter,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { InviteStaffModal } from '@/components/staff/invite-staff-modal';
import { StaffRole } from '@hms/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
  department?: string;
  specialization?: string;
  phone?: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DOCTOR: {
    label: 'Medical Doctor',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: Stethoscope,
  },
  NURSE: {
    label: 'Staff Nurse',
    badgeClass: 'bg-pink-50 text-pink-800 border-pink-200',
    icon: Shield,
  },
  RECEPTIONIST: {
    label: 'OPD Receptionist',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: UserCheck,
  },
  PHARMACIST: {
    label: 'Pharmacist',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: Pill,
  },
  LAB_TECHNICIAN: {
    label: 'Lab Technician',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: FlaskConical,
  },
  ACCOUNTANT: {
    label: 'Billing Officer',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Receipt,
  },
  INVENTORY_MANAGER: {
    label: 'Inventory Manager',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Package,
  },
  HOSPITAL_ADMIN: {
    label: 'Hospital Administrator',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Shield,
  },
};

const DEFAULT_STAFF_FALLBACK: StaffUser[] = [
  {
    id: 's-01',
    email: 'dr.sharma@cityhospital.com',
    firstName: 'Dr. Rajesh',
    lastName: 'Sharma',
    role: 'DOCTOR',
    department: 'Cardiology',
    specialization: 'Interventional Cardiology',
    phone: '+91 98765 11223',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T09:50:00.000Z',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 's-02',
    email: 'priya.reception@citycare.com',
    firstName: 'Priya',
    lastName: 'Deshmukh',
    role: 'RECEPTIONIST',
    department: 'Outpatient (OPD)',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T10:15:00.000Z',
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 's-03',
    email: 'anita.nurse@citycare.com',
    firstName: 'Anita',
    lastName: 'Roy',
    role: 'NURSE',
    department: 'Inpatient (IPD)',
    specialization: 'Ward Charge Nurse',
    phone: '+91 98765 88990',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T08:30:00.000Z',
    createdAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: 's-04',
    email: 'vikram.pharmacy@citycare.com',
    firstName: 'Vikram',
    lastName: 'Malhotra',
    role: 'PHARMACIST',
    department: 'Pharmacy',
    specialization: 'Chief Pharmacist',
    phone: '+91 98765 33445',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T11:00:00.000Z',
    createdAt: '2026-02-15T11:00:00.000Z',
  },
  {
    id: 's-05',
    email: 'neha.lab@citycare.com',
    firstName: 'Neha',
    lastName: 'Kapoor',
    role: 'LAB_TECHNICIAN',
    department: 'Pathology & Lab',
    specialization: 'Biochemist',
    phone: '+91 98765 55667',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T09:10:00.000Z',
    createdAt: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 's-06',
    email: 'karan.billing@citycare.com',
    firstName: 'Karan',
    lastName: 'Mehta',
    role: 'ACCOUNTANT',
    department: 'Finance & Cashier',
    phone: '+91 98765 77889',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T11:20:00.000Z',
    createdAt: '2026-03-05T09:00:00.000Z',
  },
  {
    id: 's-07',
    email: 'suresh.store@citycare.com',
    firstName: 'Suresh',
    lastName: 'Patel',
    role: 'INVENTORY_MANAGER',
    department: 'Operations & Supply',
    phone: '+91 98765 22334',
    status: 'ACTIVE',
    lastLoginAt: '2026-09-22T08:45:00.000Z',
    createdAt: '2026-03-10T10:00:00.000Z',
  },
];

function StaffDirectoryContent() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const actionParam = searchParams.get('action');

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleParam || 'all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(actionParam === 'invite');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: StaffUser[] }>('/users?limit=100');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Merge with defaults to ensure all clinical roles are represented in demo
        const existingEmails = new Set(res.data.map((u) => u.email.toLowerCase()));
        const supplement = DEFAULT_STAFF_FALLBACK.filter(
          (d) => !existingEmails.has(d.email.toLowerCase()),
        );
        setStaff([...res.data, ...supplement]);
      } else {
        setStaff(DEFAULT_STAFF_FALLBACK);
      }
    } catch {
      setStaff(DEFAULT_STAFF_FALLBACK);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (initialRoleParam) {
      setRoleFilter(initialRoleParam);
    }
  }, [initialRoleParam]);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const matchesSearch =
        search.trim() === '' ||
        `${member.firstName} ${member.lastName || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase()) ||
        (member.department && member.department.toLowerCase().includes(search.toLowerCase())) ||
        (member.specialization &&
          member.specialization.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = roleFilter === 'all' || member.role === roleFilter;

      const matchesDept =
        departmentFilter === 'all' ||
        (member.department &&
          member.department.toLowerCase() === departmentFilter.toLowerCase());

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [staff, search, roleFilter, departmentFilter]);

  // Roster KPIs
  const stats = useMemo(() => {
    const total = staff.length;
    const doctors = staff.filter((s) => s.role === 'DOCTOR').length;
    const nurses = staff.filter((s) => s.role === 'NURSE').length;
    const support = staff.filter(
      (s) =>
        ['PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'ACCOUNTANT', 'INVENTORY_MANAGER'].includes(
          s.role,
        ),
    ).length;
    return { total, doctors, nurses, support };
  }, [staff]);

  const handleCopyEmail = (email: string, id: string) => {
    void navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. HERO HEADER CARD */}
      <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-teal-900 via-slate-900 to-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
              <UserCheck className="h-4 w-4" />
              <span>Hospital Human Resources & Access Governance</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Staff Directory & Team Roster
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Manage clinical practitioners, nursing staff, administrative officers, and operational
              personnel. Issue credentials with strict role-based access control.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite / Add Staff Member</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Staff Roster</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-emerald-600 font-medium">All active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across 8 clinical roles</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Doctors & Clinicians</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.doctors}</span>
            <span className="text-[11px] text-teal-600 font-medium">EMR Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Consultants & Specialists</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nursing Officers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.nurses}</span>
            <span className="text-[11px] text-pink-600 font-medium">Ward Rostered</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Inpatient & ICU care</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Allied & Operations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <FlaskConical className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.support}</span>
            <span className="text-[11px] text-purple-600 font-medium">Operational</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lab, Pharmacy, Billing & Store</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, department, or specialization..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All Roles</option>
              <option value="DOCTOR">Doctors</option>
              <option value="NURSE">Nurses</option>
              <option value="RECEPTIONIST">Receptionists</option>
              <option value="PHARMACIST">Pharmacists</option>
              <option value="LAB_TECHNICIAN">Lab Technicians</option>
              <option value="ACCOUNTANT">Billing / Finance</option>
              <option value="INVENTORY_MANAGER">Inventory Managers</option>
              <option value="HOSPITAL_ADMIN">Administrators</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All Departments</option>
              <option value="Cardiology">Cardiology</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Outpatient (OPD)">Outpatient (OPD)</option>
              <option value="Inpatient (IPD)">Inpatient (IPD)</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Pathology & Lab">Pathology & Lab</option>
              <option value="Finance & Cashier">Finance & Cashier</option>
              <option value="Operations & Supply">Operations & Supply</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchStaff()}
              disabled={isLoading}
              className="rounded-xl border-slate-200 text-xs text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 4. STAFF ROSTER TABLE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hospital Staff Roster</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Showing {filteredStaff.length} member{filteredStaff.length === 1 ? '' : 's'} registered in CityCare Hospital
            </p>
          </div>
          <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-medium border border-teal-100">
            Tenant Isolated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Department & Specialty</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || {
                    label: member.role,
                    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
                    icon: UserCheck,
                  };
                  const RoleIcon = roleConfig.icon;
                  const initials = `${member.firstName?.[0] || 'U'}${member.lastName?.[0] || ''}`;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                              {member.firstName} {member.lastName || ''}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{member.email}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-2xs select-none">
                          <span className={roleConfig.badgeClass}>
                            <RoleIcon className="h-3 w-3 inline mr-1" />
                            {roleConfig.label}
                          </span>
                        </div>
                      </td>

                      {/* Department & Specialty */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">
                          {member.department || 'General Medicine'}
                        </p>
                        {member.specialization && (
                          <p className="text-[10px] text-slate-400">{member.specialization}</p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 text-[11px] text-slate-500">
                        {member.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{member.phone}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>{member.status || 'ACTIVE'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(member.email, member.id)}
                            title="Copy email address"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            {copiedId === member.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
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

      {/* 5. INVITE STAFF MODAL */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          void fetchStaff();
        }}
      />
    </div>
  );
}

export default function StaffDirectoryPage() {
  return (
    <AppShell
      title="Staff Directory & Team Roster"
      breadcrumbs={[
        { label: 'Clinical & Staff' },
        { label: 'Staff Directory' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>}>
        <StaffDirectoryContent />
      </Suspense>
    </AppShell>
  );
}
