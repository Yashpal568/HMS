'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Stethoscope,
  Users,
  Search,
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  Layers,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Department, Team, HospitalOnboardingState, OnboardingStep } from '@hms/types';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [onboarding, setOnboarding] = useState<HospitalOnboardingState | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptType, setNewDeptType] = useState('CLINICAL');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [deptRes, teamRes, onbRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Department[] }>('/organization/departments'),
        apiClient.get<{ success: boolean; data: Team[] }>('/organization/teams'),
        apiClient.get<{ success: boolean; data: HospitalOnboardingState }>('/organization/onboarding'),
      ]);

      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data);
        if (!newTeamDeptId && deptRes.data.length > 0) {
          setNewTeamDeptId(deptRes.data[0].id || (deptRes.data[0] as any)._id);
        }
      }
      if (teamRes.success && teamRes.data) {
        setTeams(teamRes.data);
      }
      if (onbRes.success && onbRes.data) {
        setOnboarding(onbRes.data);
      }
    } catch (err) {
      console.error('Failed to load organization data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [newTeamDeptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: Department }>(
        '/organization/departments',
        {
          name: newDeptName,
          code: newDeptCode,
          type: newDeptType,
          description: newDeptDesc,
        },
      );
      if (res.success) {
        setShowCreateDept(false);
        setNewDeptName('');
        setNewDeptCode('');
        setNewDeptDesc('');
        fetchData();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName || !newTeamCode || !newTeamDeptId) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: Team }>(
        '/organization/teams',
        {
          departmentId: newTeamDeptId,
          name: newTeamName,
          code: newTeamCode,
          description: newTeamDesc,
        },
      );
      if (res.success) {
        setShowCreateTeam(false);
        setNewTeamName('');
        setNewTeamCode('');
        setNewTeamDesc('');
        fetchData();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDepts = departments.filter((d) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredTeams = teams.filter((t) => {
    if (selectedDeptId !== 'ALL') {
      const deptMatch =
        (t.departmentId as any)?._id?.toString() === selectedDeptId ||
        t.departmentId?.toString() === selectedDeptId;
      return deptMatch;
    }
    return true;
  });

  return (
    <AppShell
      title="Departments & Organization"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Departments & Teams' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <Building2 className="h-4 w-4" />
              <span>Hospital Organizational Structure</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Clinical & Administrative Departments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure hospital clinical wards, operating divisions, teams, and onboarding milestones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <Button
              onClick={() => setShowCreateTeam(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-teal-700" />
              Add Team
            </Button>

            <Button
              onClick={() => setShowCreateDept(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Department
            </Button>
          </div>
        </div>

        {/* Hospital Onboarding Progress Tracker */}
        {onboarding && (
          <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Hospital Onboarding & Go-Live Readiness
                </h3>
              </div>
              <Badge
                variant="outline"
                className="bg-teal-50 text-teal-800 border-teal-200 font-mono text-xs"
              >
                {onboarding.completionPercentage}% Configured
              </Badge>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(15, onboarding.completionPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-1 text-[11px]">
              {Object.values(OnboardingStep).map((step, idx) => {
                const isCompleted = onboarding.completedSteps.includes(step);
                const isCurrent = onboarding.currentStep === step;
                return (
                  <div
                    key={step}
                    className={`p-2 rounded-lg text-center border font-medium ${
                      isCompleted
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : isCurrent
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <p className="font-bold text-[10px] text-slate-500">{idx + 1}</p>
                    <p className="truncate uppercase">{step}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Teams:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || (d as any)._id} value={d.id || (d as any)._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((d) => (
            <div
              key={d.id || (d as any)._id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-slate-50">
                    {d.code}
                  </Badge>
                  <span className="text-[10px] font-semibold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {d.type}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{d.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {d.description || 'Configured operational healthcare department.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  Active Service
                </span>
                <Link
                  href={`/staff?departmentId=${d.id || (d as any)._id}`}
                  className="text-teal-700 hover:underline font-semibold flex items-center gap-1"
                >
                  View Staff <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Department Teams Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-600" />
                <span>Specialized Working Teams</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sub-teams assigned to specific hospital workflows within departments.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredTeams.length} Teams
            </Badge>
          </div>

          {filteredTeams.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No sub-teams created yet. Click &quot;Add Team&quot; above to configure units like Pathology Team or General OPD Team.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {filteredTeams.map((t) => (
                <div
                  key={t.id || (t as any)._id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{t.name}</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500">
                      {t.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {t.description || 'Specialized unit team.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Department */}
        {showCreateDept && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Add Hospital Department</h3>
              <form onSubmit={handleCreateDepartment} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Neurology"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Code *</label>
                    <input
                      type="text"
                      required
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                      placeholder="e.g. NEURO"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={newDeptType}
                      onChange={(e) => setNewDeptType(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                    >
                      <option value="CLINICAL">Clinical</option>
                      <option value="DIAGNOSTIC">Diagnostic</option>
                      <option value="OPERATIONAL">Operational</option>
                      <option value="ADMINISTRATIVE">Administrative</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                    placeholder="Department scope and purpose..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDept(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Department'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Team */}
        {showCreateTeam && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Add Department Sub-Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parent Department *
                  </label>
                  <select
                    value={newTeamDeptId}
                    onChange={(e) => setNewTeamDeptId(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id || (d as any)._id} value={d.id || (d as any)._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g. Pathology Team"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Code *</label>
                    <input
                      type="text"
                      required
                      value={newTeamCode}
                      onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PATH-1"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    placeholder="Team responsibilities..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateTeam(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Team'}
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
