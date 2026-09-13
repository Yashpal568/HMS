'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit3,
  AlertCircle,
  RefreshCw,
  Eye,
  HeartPulse,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  PatientSummary,
  PatientStatus,
  ApiResponse,
  PaginationMeta,
} from '@hms/types';

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (pageNumber: number, searchQuery = search, status = statusFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', pageNumber.toString());
        queryParams.set('limit', '10');
        if (searchQuery.trim()) {
          queryParams.set('search', searchQuery.trim());
        }
        if (status && status !== 'all') {
          queryParams.set('status', status);
        }

        const res = await apiClient.get<ApiResponse<PatientSummary[]>>(
          `/patients?${queryParams.toString()}`,
        );

        if (res.success && res.data) {
          setPatients(res.data);
          if (res.meta) {
            setMeta(res.meta);
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load patient directory.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', '1');
        queryParams.set('limit', '10');
        if (search.trim()) {
          queryParams.set('search', search.trim());
        }
        if (statusFilter && statusFilter !== 'all') {
          queryParams.set('status', statusFilter);
        }

        const res = await apiClient.get<ApiResponse<PatientSummary[]>>(
          `/patients?${queryParams.toString()}`,
        );

        if (active) {
          if (res.success && res.data) {
            setPatients(res.data);
            if (res.meta) {
              setMeta(res.meta);
            }
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Failed to load patient directory.',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, search ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, statusFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      loadPage(newPage);
    }
  };

  const statusTabItems = [
    { id: 'all', label: 'All Patients' },
    { id: PatientStatus.ACTIVE, label: 'Active' },
    { id: PatientStatus.INACTIVE, label: 'Inactive' },
    { id: PatientStatus.DECEASED, label: 'Deceased' },
  ];

  return (
    <AppShell
      title="Patient Directory"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Patients' },
      ]}
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Patient Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Authoritative hospital patient registry, sequential UHID indexing, and clinical safety records.
            </p>
          </div>

          <Link
            href="/patients/register"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by UHID, patient name, or phone..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadPage(meta.page)}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 border-t border-slate-100 pt-3 overflow-x-auto">
            {statusTabItems.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => loadPage(1)}
              className="font-semibold text-xs text-red-800 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Patients Table / States */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-3 animate-spin">
                <RefreshCw className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-700">Loading patient records...</p>
              <p className="text-xs text-slate-400 mt-1">Retrieving scoped hospital registry</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {search.trim() ? 'No Matching Patients' : 'No Patients Registered Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                {search.trim()
                  ? `No patient records found matching "${search}". Try searching with a different name, phone, or UHID.`
                  : 'Start building your hospital patient registry by registering your first patient.'}
              </p>
              {!search.trim() && (
                <Link
                  href="/patients/register"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Register First Patient
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">UHID</th>
                    <th scope="col" className="px-5 py-3.5">Patient Name</th>
                    <th scope="col" className="px-5 py-3.5">Phone & City</th>
                    <th scope="col" className="px-5 py-3.5">Blood Group</th>
                    <th scope="col" className="px-5 py-3.5">Allergies</th>
                    <th scope="col" className="px-5 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => {
                    const fullName = [p.name.first, p.name.middle, p.name.last]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* UHID */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Link
                            href={`/patients/${p.id}`}
                            className="font-mono text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded border border-teal-200 inline-flex items-center gap-1 group-hover:border-teal-400 transition-colors"
                          >
                            <span>{p.uhid}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                        </td>

                        {/* Patient Name & Demographics */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            <Link href={`/patients/${p.id}`} className="hover:underline">
                              {fullName}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500 capitalize">
                            {p.gender}
                          </div>
                        </td>

                        {/* Phone & City */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-mono text-xs text-slate-800">
                            {p.phone || '-'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.city || '-'}
                          </div>
                        </td>

                        {/* Blood Group */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {p.bloodGroup && p.bloodGroup !== 'unknown' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <HeartPulse className="w-3 h-3" />
                              {p.bloodGroup}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Allergies Alert */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {p.hasSevereAllergies ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-300 ring-1 ring-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                              Severe Allergy ({p.allergyCount})
                            </span>
                          ) : p.allergyCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              {p.allergyCount} Allergy Recorded
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">NKDA</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              p.status === PatientStatus.ACTIVE
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.status === PatientStatus.INACTIVE
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/patients/${p.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded transition-colors"
                              title="View Patient Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Link>
                            <Link
                              href={`/patients/${p.id}/edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                              title="Edit Demographics"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && patients.length > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/75 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Showing{' '}
                <span className="font-semibold text-slate-900">
                  {(meta.page - 1) * meta.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-900">{meta.total}</span>{' '}
                registered patients
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(meta.page - 1)}
                  disabled={meta.page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="px-2 font-medium text-slate-700">
                  Page {meta.page} of {meta.totalPages || 1}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(meta.page + 1)}
                  disabled={meta.page >= meta.totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
