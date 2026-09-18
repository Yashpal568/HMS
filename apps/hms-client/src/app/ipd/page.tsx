'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bed,
  Plus,
  Grid,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { IpdCensusSummary, Admission, WardCensusItem } from '@hms/types';

export default function IpdDashboardPage() {
  const [census, setCensus] = useState<IpdCensusSummary | null>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'admitted' | 'discharged'>('admitted');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [censusRes, admissionsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: IpdCensusSummary }>('/ipd/census'),
        apiClient.get<{ success: boolean; data: any[] }>('/ipd/admissions?limit=100'),
      ]);

      if (censusRes.success && censusRes.data) {
        setCensus(censusRes.data);
      }
      if (admissionsRes.success && admissionsRes.data) {
        setAdmissions(admissionsRes.data);
      }
    } catch (err) {
      console.error('Failed to load IPD data:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to hospital server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAdmissions = admissions.filter((adm) => {
    const isStatusMatch =
      statusFilter === 'ALL' || adm.status === statusFilter;

    const isWardMatch =
      selectedWard === 'ALL' ||
      adm.wardId === selectedWard ||
      adm.ward?.id === selectedWard ||
      adm.ward?._id === selectedWard;

    const patientName = adm.patient
      ? `${adm.patient.name?.first || ''} ${adm.patient.name?.last || ''}`.toLowerCase()
      : '';
    const uhid = adm.patient?.uhid?.toLowerCase() || '';
    const admNum = adm.admissionNumber?.toLowerCase() || '';
    const query = searchQuery.toLowerCase().trim();

    const isSearchMatch =
      !query ||
      patientName.includes(query) ||
      uhid.includes(query) ||
      admNum.includes(query);

    return isStatusMatch && isWardMatch && isSearchMatch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <Bed className="w-3.5 h-3.5" />
                Inpatient Department
              </span>
              <span className="text-xs text-slate-500">• Live Ward Operations</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              IPD & Bed Management
            </h1>
            <p className="text-sm text-slate-500">
              Real-time hospital bed allocation, occupancy census, patient transfers, and discharge authorization.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Refresh census and admissions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link href="/ipd/beds">
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-xs">
                <Grid className="w-3.5 h-3.5" />
                <span>Visual Bed Matrix</span>
              </button>
            </Link>

            <Link href="/ipd/admissions/new">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Admit Inpatient</span>
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={fetchData}
              className="text-xs font-semibold text-rose-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Real-time Census KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Beds */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Hospital Beds</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {isLoading ? '...' : census?.totalBeds ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 block">Across all active wards</span>
          </div>

          {/* Occupied Beds */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Occupied Beds</span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono">
              {isLoading ? '...' : census?.occupiedBeds ?? 0}
            </div>
            <span className="text-[11px] text-rose-600/80 font-medium block">
              Active inpatients in care
            </span>
          </div>

          {/* Available Beds */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Available Beds</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">
              {isLoading ? '...' : census?.availableBeds ?? 0}
            </div>
            <span className="text-[11px] text-emerald-600/80 font-medium block">
              Ready for immediate intake
            </span>
          </div>

          {/* Cleaning Turnover */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Turnover / Cleaning</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-600 font-mono">
              {isLoading ? '...' : census?.cleaningBeds ?? 0}
            </div>
            <span className="text-[11px] text-amber-600/80 font-medium block">
              Housekeeping in progress
            </span>
          </div>

          {/* Occupancy Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Occupancy Rate</span>
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-teal-700 font-mono">
              {isLoading ? '...' : `${census?.occupancyRate ?? 0}%`}
            </div>
            {/* Visual Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(census?.occupancyRate ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ward Breakdown Cards */}
        {census?.wardBreakdown && census.wardBreakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ward Occupancy Distribution
              </h2>
              <Link href="/ipd/beds">
                <span className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer flex items-center gap-1">
                  View Matrix <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {census.wardBreakdown.map((ward: WardCensusItem) => (
                <div
                  key={ward.wardId}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{ward.wardName}</h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        {ward.wardCode} &bull; <span className="capitalize">{ward.wardType}</span>
                      </span>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-slate-700">
                      {ward.occupancyRate}%
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{
                        width: `${ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0}%`,
                      }}
                      title={`Occupied: ${ward.occupiedBeds}`}
                    />
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width: `${ward.totalBeds > 0 ? (ward.cleaningBeds / ward.totalBeds) * 100 : 0}%`,
                      }}
                      title={`Cleaning: ${ward.cleaningBeds}`}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{
                        width: `${ward.totalBeds > 0 ? (ward.availableBeds / ward.totalBeds) * 100 : 0}%`,
                      }}
                      title={`Available: ${ward.availableBeds}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {ward.availableBeds} Avail
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {ward.occupiedBeds} Occ
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {ward.cleaningBeds} Clean
                    </span>
                    <span className="text-slate-400 font-mono">
                      {ward.totalBeds} Beds
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Inpatients & Admissions Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inpatient Admissions Registry
              </h2>
              <p className="text-xs text-slate-500">
                Manage hospitalized patients, bed allocations, and clinical discharge authorizations.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patient, UHID, ADM#..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Status filter toggle */}
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50 text-xs">
                <button
                  onClick={() => setStatusFilter('admitted')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'admitted'
                      ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admitted
                </button>
                <button
                  onClick={() => setStatusFilter('discharged')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'discharged'
                      ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Discharged
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading inpatient records...
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Bed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Admissions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || statusFilter !== 'admitted'
                  ? 'No records match your selected search or filter criteria.'
                  : 'There are currently no patients admitted in the Inpatient Department.'}
              </p>
              <Link href="/ipd/admissions/new">
                <button className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Admit First Patient</span>
                </button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Admission Details</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Ward & Bed</th>
                    <th className="px-4 py-3">Attending Doctor</th>
                    <th className="px-4 py-3">Diagnosis & Source</th>
                    <th className="px-4 py-3">Stay Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAdmissions.map((adm) => {
                    const isAdmitted = adm.status === 'admitted';
                    const admDate = new Date(adm.admissionDate);
                    const daysStay = Math.max(
                      1,
                      Math.ceil(
                        (Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24),
                      ),
                    );

                    return (
                      <tr
                        key={adm._id || adm.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Admission Details */}
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-900">
                            {adm.admissionNumber}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {admDate.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* Patient */}
                        <td className="px-4 py-3.5">
                          {adm.patient ? (
                            <Link
                              href={`/patients/${adm.patientId}`}
                              className="font-semibold text-teal-700 hover:underline block"
                            >
                              {adm.patient.name?.first} {adm.patient.name?.last}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              Patient ID: {adm.patientId}
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-slate-500 block">
                            UHID: {adm.patient?.uhid || 'N/A'}
                          </span>
                        </td>

                        {/* Ward & Bed */}
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900 block">
                            {adm.ward?.name || 'Assigned Ward'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            <Bed className="w-3 h-3" />
                            {adm.bed?.bedNumber || 'Bed Assigned'}
                          </span>
                        </td>

                        {/* Attending Doctor */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800 flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            Dr. {adm.attendingDoctor?.name || 'Physician'}
                          </span>
                        </td>

                        {/* Diagnosis & Source */}
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-800 truncate max-w-[180px]" title={adm.admittingDiagnosis}>
                            {adm.admittingDiagnosis}
                          </div>
                          <span className="text-[11px] text-slate-400 capitalize">
                            Source: {adm.admissionSource}
                          </span>
                        </td>

                        {/* Stay Duration */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-800">
                            {daysStay} {daysStay === 1 ? 'day' : 'days'}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {isAdmitted ? 'Current stay' : 'Discharged'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              isAdmitted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAdmitted ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {adm.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          <Link href={`/ipd/admissions/${adm._id || adm.id}`}>
                            <button className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs">
                              Stay Chart
                            </button>
                          </Link>

                          {isAdmitted && (
                            <Link href={`/ipd/admissions/${adm._id || adm.id}/discharge`}>
                              <button className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors shadow-2xs">
                                Discharge
                              </button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
