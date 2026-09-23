'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
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
  Calendar,
  AlertCircle,
  Plus,
  Moon,
  Sun,
  UserCheck,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Employee,
  StaffType,
  EmploymentStatus,
  WorkforceSchedule,
  ShiftType,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Department,
} from '@hms/types';

function StaffContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role');
  const initialDept = searchParams.get('departmentId');

  const [activeTab, setActiveTab] = useState<'employees' | 'schedules' | 'attendance' | 'leave'>('employees');

  // Employee State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffType, setSelectedStaffType] = useState<string>(initialRole || 'ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDept || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [showApplyLeave, setShowApplyLeave] = useState(false);

  // Form states - Create Employee
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empStaffType, setEmpStaffType] = useState<StaffType>(StaffType.DOCTOR);
  const [empDeptId, setEmpDeptId] = useState('');

  // Form states - Schedule
  const [schedEmpId, setSchedEmpId] = useState('');
  const [schedShiftType, setSchedShiftType] = useState<ShiftType>(ShiftType.MORNING);
  const [schedStart, setSchedStart] = useState('08:00');
  const [schedEnd, setSchedEnd] = useState('16:00');

  // Form states - Leave
  const [leaveEmpId, setLeaveEmpId] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.CASUAL);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');

  // Schedules state
  const [schedules, setSchedules] = useState<WorkforceSchedule[]>([]);

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<{
    date: string;
    summary: { totalEmployees: number; present: number; late: number; onLeave: number; absent: number };
    records: AttendanceRecord[];
  } | null>(null);

  // Leave state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStaffType !== 'ALL') params.append('staffType', selectedStaffType);
      if (selectedDeptId !== 'ALL') params.append('departmentId', selectedDeptId);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const [empRes, deptRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Employee[] }>(`/workforce/employees?${params.toString()}`),
        apiClient.get<{ success: boolean; data: Department[] }>('/organization/departments'),
      ]);

      if (empRes.success && empRes.data) setEmployees(empRes.data);
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
        if (!empDeptId && deptRes.data.length > 0) {
          setEmpDeptId(deptRes.data[0].id || (deptRes.data[0] as any)._id);
        }
      }
    } catch (err) {
      console.error('Failed to load workforce:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStaffType, selectedDeptId, selectedStatus, searchQuery, empDeptId]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: WorkforceSchedule[] }>('/workforce/schedules');
      if (res.success && res.data) setSchedules(res.data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/workforce/attendance');
      if (res.success && res.data) setAttendanceData(res.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: LeaveRequest[] }>('/workforce/leave');
      if (res.success && res.data) setLeaveRequests(res.data);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'schedules') fetchSchedules();
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'leave') fetchLeaveRequests();
  }, [activeTab, fetchSchedules, fetchAttendance, fetchLeaveRequests]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: Employee }>(
        '/workforce/employees',
        {
          firstName: empFirstName,
          lastName: empLastName,
          email: empEmail,
          phone: empPhone,
          designation: empDesignation,
          staffType: empStaffType,
          departmentId: empDeptId,
          assignedWorkspaces: [empStaffType],
        },
      );
      if (res.success) {
        setShowCreateEmployee(false);
        setEmpFirstName('');
        setEmpLastName('');
        setEmpEmail('');
        setEmpPhone('');
        setEmpDesignation('');
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedEmpId) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean }>('/workforce/schedules', {
        employeeId: schedEmpId,
        shiftType: schedShiftType,
        startTime: schedStart,
        endTime: schedEnd,
        daysOfWeek: [1, 2, 3, 4, 5],
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      if (res.success) {
        setShowCreateSchedule(false);
        fetchSchedules();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to assign shift schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmpId || !leaveStart || !leaveEnd) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean }>('/workforce/leave', {
        employeeId: leaveEmpId,
        leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        totalDays: Number(leaveDays),
        reason: leaveReason,
      });
      if (res.success) {
        setShowApplyLeave(false);
        setLeaveReason('');
        fetchLeaveRequests();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewLeave = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await apiClient.post<{ success: boolean }>(`/workforce/leave/${id}/review`, { action });
      if (res.success) fetchLeaveRequests();
    } catch (err: any) {
      alert(err?.message || `Failed to ${action.toLowerCase()} leave request.`);
    }
  };

  const handleQuickCheckIn = async (employeeId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean }>('/workforce/attendance/check-in', { employeeId });
      if (res.success) fetchAttendance();
    } catch (err: any) {
      alert(err?.message || 'Check-in failed.');
    }
  };

  const handleQuickCheckOut = async (employeeId: string) => {
    try {
      const res = await apiClient.post<{ success: boolean }>('/workforce/attendance/check-out', { employeeId });
      if (res.success) fetchAttendance();
    } catch (err: any) {
      alert(err?.message || 'Check-out failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <Users className="h-4 w-4" />
            <span>Workforce Management & Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hospital Workforce & Personnel Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage hospital clinicians, nursing, allied health staff, shifts, attendance, and leave workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              if (activeTab === 'employees') fetchEmployees();
              if (activeTab === 'schedules') fetchSchedules();
              if (activeTab === 'attendance') fetchAttendance();
              if (activeTab === 'leave') fetchLeaveRequests();
            }}
            variant="outline"
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {activeTab === 'employees' && (
            <Button
              onClick={() => setShowCreateEmployee(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Add Employee Profile
            </Button>
          )}

          {activeTab === 'schedules' && (
            <Button
              onClick={() => setShowCreateSchedule(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              Assign Shift Schedule
            </Button>
          )}

          {activeTab === 'leave' && (
            <Button
              onClick={() => setShowApplyLeave(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Submit Leave Request
            </Button>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'employees'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Workforce Directory
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'schedules'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Shift Schedules
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Daily Attendance Command
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'leave'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Leave Management
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: WORKFORCE DIRECTORY                                         */}
      {/* =================================================================== */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <select
                value={selectedStaffType}
                onChange={(e) => setSelectedStaffType(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">All Staff Types</option>
                {Object.values(StaffType).map((st) => (
                  <option key={st} value={st}>
                    {st.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id || (d as any)._id} value={d.id || (d as any)._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="EXITED">Exited</option>
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Full Name & Contact</th>
                    <th className="px-4 py-3">Designation & Department</th>
                    <th className="px-4 py-3">Staff Type</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        {isLoading ? 'Loading workforce directory...' : 'No employees matching filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id || (emp as any)._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {emp.employeeId}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{emp.designation}</p>
                          <p className="text-[11px] text-teal-700">
                            {(emp.departmentId as any)?.name || 'General Operations'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {emp.staffType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              emp.employmentStatus === EmploymentStatus.ACTIVE
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }
                          >
                            {emp.employmentStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleQuickCheckIn(emp.id || (emp as any)._id)}
                            className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-semibold border border-teal-200"
                          >
                            Check-In
                          </button>
                          <button
                            onClick={() => handleQuickCheckOut(emp.id || (emp as any)._id)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold border border-slate-300"
                          >
                            Check-Out
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SHIFT SCHEDULES                                             */}
      {/* =================================================================== */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Active Hospital Shift Rosters & Overnight Timings
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Schedules support 24/7 rotating shifts. Overnight shifts (e.g. 22:00 to 06:00) are flagged and evaluated without day-boundary split errors.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Shift Type</th>
                    <th className="px-4 py-3">Working Hours</th>
                    <th className="px-4 py-3">Overnight Flag</th>
                    <th className="px-4 py-3">Working Days</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No active shift schedules assigned yet. Click &quot;Assign Shift Schedule&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    schedules.map((s) => (
                      <tr key={s.id || (s as any)._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {(s.employeeId as any)?.firstName} {(s.employeeId as any)?.lastName} (
                          {(s.employeeId as any)?.employeeId})
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {s.shiftType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {s.startTime} → {s.endTime}
                        </td>
                        <td className="px-4 py-3">
                          {s.isOvernight ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              <Moon className="h-3 w-3" /> Overnight Shift
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Sun className="h-3 w-3" /> Day Shift
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {s.daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ATTENDANCE COMMAND                                          */}
      {/* =================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Roster</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {attendanceData?.summary.totalEmployees || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Present</span>
              <p className="text-xl font-bold font-mono text-emerald-800 mt-1">
                {attendanceData?.summary.present || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-700">Late (&gt;15 min)</span>
              <p className="text-xl font-bold font-mono text-amber-800 mt-1">
                {attendanceData?.summary.late || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-indigo-700">On Leave</span>
              <p className="text-xl font-bold font-mono text-indigo-800 mt-1">
                {attendanceData?.summary.onLeave || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-700">Absent</span>
              <p className="text-xl font-bold font-mono text-rose-800 mt-1">
                {attendanceData?.summary.absent || 0}
              </p>
            </div>
          </div>

          {/* Today's Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Live Daily Attendance Ledger ({attendanceData?.date || 'Today'})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check-In</th>
                    <th className="px-4 py-3">Check-Out</th>
                    <th className="px-4 py-3">Late Delay</th>
                    <th className="px-4 py-3">Capture Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!attendanceData?.records || attendanceData.records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No check-ins logged yet for today. Use the Quick Action buttons in Workforce Directory.
                      </td>
                    </tr>
                  ) : (
                    attendanceData.records.map((r) => (
                      <tr key={r.id || (r as any)._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {(r.employeeId as any)?.firstName} {(r.employeeId as any)?.lastName} (
                          {(r.employeeId as any)?.employeeId})
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              r.status === AttendanceStatus.PRESENT
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : r.status === AttendanceStatus.LATE
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : r.status === AttendanceStatus.ON_LEAVE
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {r.lateMinutes > 0 ? `${r.lateMinutes} mins` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                          {r.method}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: LEAVE MANAGEMENT                                            */}
      {/* =================================================================== */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Workforce Leave Requests & Automated Attendance Sync
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Approved leaves automatically reflect as &quot;ON_LEAVE&quot; on the daily hospital attendance ledger.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Date Range</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No pending or approved leave requests. Click &quot;Submit Leave Request&quot; to test.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.map((l) => (
                      <tr key={l.id || (l as any)._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {(l.employeeId as any)?.firstName} {(l.employeeId as any)?.lastName} (
                          {(l.employeeId as any)?.employeeId})
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {l.leaveType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {l.startDate} → {l.endDate}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-slate-800">
                          {l.totalDays}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">
                          {l.reason}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              l.status === LeaveStatus.APPROVED
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : l.status === LeaveStatus.REJECTED
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {l.status === LeaveStatus.PENDING && (
                            <>
                              <button
                                onClick={() => handleReviewLeave(l.id || (l as any)._id, 'APPROVE')}
                                className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-semibold border border-teal-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(l.id || (l as any)._id, 'REJECT')}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE EMPLOYEE PROFILE                                      */}
      {/* =================================================================== */}
      {showCreateEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Workforce Employee Profile</h3>
            <p className="text-xs text-slate-500">
              Employee profiles represent workforce personnel. User authentication login accounts are linked separately.
            </p>
            <form onSubmit={handleCreateEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={empFirstName}
                    onChange={(e) => setEmpFirstName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={empLastName}
                    onChange={(e) => setEmpLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. ramesh@hospital.local"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    placeholder="e.g. Senior Consultant"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Staff Type *</label>
                  <select
                    value={empStaffType}
                    onChange={(e) => setEmpStaffType(e.target.value as StaffType)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    {Object.values(StaffType).map((st) => (
                      <option key={st} value={st}>
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department *</label>
                <select
                  value={empDeptId}
                  onChange={(e) => setEmpDeptId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id || (d as any)._id} value={d.id || (d as any)._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateEmployee(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Employee Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ASSIGN SHIFT SCHEDULE                                        */}
      {/* =================================================================== */}
      {showCreateSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Assign Shift Schedule</h3>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Employee *</label>
                <select
                  value={schedEmpId}
                  onChange={(e) => setSchedEmpId(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id || (e as any)._id} value={e.id || (e as any)._id}>
                      {e.firstName} {e.lastName} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Shift Type</label>
                  <select
                    value={schedShiftType}
                    onChange={(e) => setSchedShiftType(e.target.value as ShiftType)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    {Object.values(ShiftType).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Shift Start</label>
                  <input
                    type="time"
                    required
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Shift End</label>
                <input
                  type="time"
                  required
                  value={schedEnd}
                  onChange={(e) => setSchedEnd(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateSchedule(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: SUBMIT LEAVE REQUEST                                         */}
      {/* =================================================================== */}
      {showApplyLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit Leave Request</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Employee *</label>
                <select
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id || (e as any)._id} value={e.id || (e as any)._id}>
                      {e.firstName} {e.lastName} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    {Object.values(LeaveType).map((lt) => (
                      <option key={lt} value={lt}>
                        {lt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Medical reason or personal leave..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApplyLeave(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffPage() {
  return (
    <AppShell
      title="Workforce Management"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Workforce & Personnel' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading workforce hub...</div>}>
        <StaffContent />
      </Suspense>
    </AppShell>
  );
}
