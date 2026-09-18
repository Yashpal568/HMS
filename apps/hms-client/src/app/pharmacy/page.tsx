'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Package,
  Layers,
  FileText,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { PrescriptionStatus } from '@hms/types';

interface DashboardMetrics {
  pendingPrescriptionsCount: number;
  dispensedTodayCount: number;
  nearExpiryBatchesCount: number;
  lowStockMedicinesCount: number;
  totalMedicinesCount: number;
  totalBatchesCount: number;
}

export default function PharmacyDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'partially_dispensed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, queueRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: DashboardMetrics }>('/pharmacy/dashboard'),
        apiClient.get<{ success: boolean; data: any[] }>('/pharmacy/prescriptions'),
      ]);

      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      }
      if (queueRes.success) {
        setPrescriptions(queueRes.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load pharmacy dashboard:', err);
      setError(err?.message || 'Error loading pharmacy operational data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const patientName = `${p.patientId?.name?.first || ''} ${p.patientId?.name?.last || ''}`.toLowerCase();
      const uhid = (p.patientId?.uhid || '').toLowerCase();
      const doctor = (p.doctorId?.name || '').toLowerCase();
      const meds = (p.items || []).map((i: any) => i.medicineName.toLowerCase()).join(' ');
      return patientName.includes(q) || uhid.includes(q) || doctor.includes(q) || meds.includes(q);
    }
    return true;
  });

  return (
    <AppShell
      title="Pharmacy Workstation"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Pharmacy Workstation' },
      ]}
    >
      <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <Pill className="h-4 w-4" />
            <span>Pharmacy Operations & Dispensing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pharmacy Dispensing Workstation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage electronic prescription fulfillment, FEFO batch selection, stock levels, and patient labeling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/pharmacy/medicines"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Package className="h-3.5 w-3.5 text-teal-600" />
            Drug Master Catalog
          </Link>

          <Link
            href="/pharmacy/batches"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            Batch Stock Ledger
          </Link>
        </div>
      </div>

      {/* Operational Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Prescriptions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Prescriptions
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.pendingPrescriptionsCount ?? 0}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
              Action Required
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting pharmacist fulfillment</p>
        </div>

        {/* Dispensed Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Dispensed Today
            </span>
            <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.dispensedTodayCount ?? 0}
            </span>
            <span className="text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-medium">
              Orders Sealed
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Dispensing records recorded</p>
        </div>

        {/* Near Expiry Batches (< 60 Days) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Near-Expiry Batches
            </span>
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.nearExpiryBatchesCount ?? 0}
            </span>
            <span className="text-xs text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded font-medium">
              &lt; 60 Days
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">FEFO prioritization active</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Low Stock Medicines
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertCircle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.lowStockMedicinesCount ?? 0}
            </span>
            <span className="text-xs text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium">
              Below Min Level
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Reorder threshold reached</p>
        </div>
      </div>

      {/* Main Prescriptions Queue Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Prescription Dispensing Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor prescriptions issued from OPD consultations and IPD wards ready for dispensing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Queue ({prescriptions.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('partially_dispensed')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  statusFilter === 'partially_dispensed'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Partially Dispensed
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, UHID, doctor..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-52 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Prescriptions Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading prescriptions queue...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-xs bg-rose-50/50">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              {error}
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No prescriptions found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No electronic doctor prescriptions are currently pending dispensing matching the active filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Information</th>
                  <th className="py-3 px-4">Prescribing Doctor</th>
                  <th className="py-3 px-4">Prescribed Medications</th>
                  <th className="py-3 px-4">Encounter Date</th>
                  <th className="py-3 px-4">Dispensing Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredPrescriptions.map((p) => {
                  const patient = p.patientId;
                  const doctor = p.doctorId;
                  const items = p.items || [];
                  const hasAllergies = patient?.allergies && patient.allergies.length > 0;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {patient?.name?.first} {patient?.name?.last}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-teal-700">{patient?.uhid}</span>
                          <span>•</span>
                          <span>{patient?.gender}</span>
                        </div>
                        {hasAllergies && (
                          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                            <span>Allergy Alert ({patient.allergies.length})</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {doctor?.name ? `Dr. ${doctor.name}` : 'Attending Physician'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {doctor?.department || 'General Medicine'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 mb-1">
                          {items.length} {items.length === 1 ? 'Medication' : 'Medications'}
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {items.map((item: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200"
                            >
                              <span className="font-medium">{item.medicineName}</span>
                              <span className="text-slate-400">({item.quantity} qty)</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {p.createdAt ? (
                          <>
                            <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                            <div className="text-slate-400">
                              {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          'Recently'
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {p.status === PrescriptionStatus.DISPENSED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Dispensed
                          </span>
                        ) : p.status === PrescriptionStatus.PARTIALLY_DISPENSED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="h-3 w-3" />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Pending Dispensing
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/pharmacy/dispense/${p._id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs"
                        >
                          <span>Dispense</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
    </AppShell>
  );
}
