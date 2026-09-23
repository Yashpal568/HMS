'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  UserPlus,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/context/workspace-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function DepartmentManagerDashboard() {
  const { user } = useAuth();
  const { employee } = useWorkspace();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const deptName = employee?.department || user?.department || 'Department Operations';

  const fetchDepartmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empRes, leaveRes, attRes] = await Promise.all([
        apiClient.get<any>('/workforce/employees?limit=6').catch(() => null),
        apiClient.get<any>('/workforce/leaves').catch(() => null),
        apiClient.get<any>('/workforce/attendance').catch(() => null),
      ]);

      if (empRes?.data) setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      if (leaveRes?.data) setLeaveRequests(Array.isArray(leaveRes.data) ? leaveRes.data : []);
      if (attRes?.data) setAttendanceRecords(Array.isArray(attRes.data) ? attRes.data : []);
    } catch {
      // Use empty defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDepartmentData();
  }, [fetchDepartmentData]);

  const activeStaff = employees.filter((e) => e.employmentStatus === 'ACTIVE');
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING');
  const presentToday = attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Building2 className="h-3 w-3" />
                {deptName}
              </span>
              <span className="text-xs text-teal-200/80">Operational Management Cockpit</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {employee ? `${employee.firstName} ${employee.lastName}` : user?.firstName ? `${user.firstName} ${user.lastName}` : 'Department Manager'}
            </h1>
            <p className="text-sm text-teal-100/90">
              Overseeing departmental shift coverage, staff rosters, attendance compliance, and leave approvals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/staff?tab=schedules">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white font-medium text-xs shadow-sm">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Shift Roster
              </Button>
            </Link>
            <Link href="/staff">
              <Button size="sm" variant="outline" className="border-teal-400/40 text-teal-100 hover:bg-teal-800/40 text-xs font-medium">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Team Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Assigned Personnel"
          value={activeStaff.length}
          subtext="Active team members"
          icon={Users}
          iconColor="text-teal-600"
        />
        <MetricKpiCard
          title="Present Today"
          value={presentToday.length}
          subtext="Checked-in on shift"
          icon={UserCheck}
          iconColor="text-emerald-600"
        />
        <MetricKpiCard
          title="Pending Leave Requests"
          value={pendingLeaves.length}
          subtext="Awaiting manager sign-off"
          icon={CalendarCheck}
          iconColor="text-amber-600"
        />
        <MetricKpiCard
          title="Shift Compliance"
          value={activeStaff.length > 0 ? `${Math.round((presentToday.length / activeStaff.length) * 100)}%` : '100%'}
          subtext="Daily roster coverage"
          icon={ShieldCheck}
          iconColor="text-teal-600"
        />
      </div>

      {/* Roster & Approvals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Staff List */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Department Workforce</h2>
              <p className="text-xs text-slate-500">Personnel assigned to this clinical unit</p>
            </div>
            <Link href="/staff" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading department workforce...</div>
          ) : employees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No employees assigned to this unit yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {employees.slice(0, 5).map((emp) => (
                <div key={emp._id || emp.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                      {emp.firstName?.[0] || 'E'}{emp.lastName?.[0] || ''}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-slate-500">{emp.designation} • {emp.staffType}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {emp.employeeId}
                    </span>
                    <Badge variant={emp.employmentStatus === 'ACTIVE' ? 'success' : 'secondary'} className="text-2xs">
                      {emp.employmentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals & Leave Requests */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pending Leave Approvals</h2>
              <p className="text-xs text-slate-500">Requests requiring department head review</p>
            </div>
            <Link href="/staff?tab=leave" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
              Leave manager <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading leave requests...</div>
          ) : pendingLeaves.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-700">All leave requests reviewed</p>
              <p className="text-2xs text-slate-400">No pending time-off approvals outstanding for this unit.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingLeaves.slice(0, 5).map((l) => (
                <div key={l._id || l.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {l.employeeId?.firstName ? `${l.employeeId.firstName} ${l.employeeId.lastName}` : 'Staff Member'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {l.leaveType} • {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href="/staff?tab=leave">
                    <Button size="sm" variant="outline" className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50">
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
