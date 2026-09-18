'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Plus,
  ClipboardList,
  BookOpen,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  AlertTriangle,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Microscope,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { LabDashboardSummary, LabOrder, LabOrderStatus, LabOrderPriority } from '@hms/types';

export default function LaboratoryDashboardPage() {
  const [metrics, setMetrics] = useState<LabDashboardSummary | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashboardRes, ordersRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: LabDashboardSummary }>('/lab/dashboard'),
        apiClient.get<{ success: boolean; data: any[] }>('/lab/orders'),
      ]);

      if (dashboardRes.success && dashboardRes.data) {
        setMetrics(dashboardRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
    } catch (err) {
      console.error('Failed to load laboratory data:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to hospital server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search and filtering
  const filteredOrders = orders.filter((order) => {
    // Status Filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // Priority Filter
    if (priorityFilter !== 'all' && order.priority !== priorityFilter) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const orderNum = (order.orderNumber || '').toLowerCase();
      const accession = (order.accessionNumber || '').toLowerCase();
      const patientName = order.patientId?.name
        ? `${order.patientId.name.first} ${order.patientId.name.last}`.toLowerCase()
        : '';
      const patientUhid = (order.patientId?.uhid || '').toLowerCase();
      const testNames = (order.testIds || [])
        .map((t: any) => `${t.code} ${t.name}`.toLowerCase())
        .join(' ');

      if (
        !orderNum.includes(q) &&
        !accession.includes(q) &&
        !patientName.includes(q) &&
        !patientUhid.includes(q) &&
        !testNames.includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case LabOrderStatus.ORDERED:
        return {
          label: 'Pending Collection',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case LabOrderStatus.SAMPLE_COLLECTED:
        return {
          label: 'Sample Collected',
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case LabOrderStatus.IN_PROCESS:
        return {
          label: 'In Process',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
        };
      case LabOrderStatus.RESULT_ENTERED:
        return {
          label: 'Awaiting Sign-Off',
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case LabOrderStatus.VERIFIED:
        return {
          label: 'Verified & Sealed',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case LabOrderStatus.CANCELLED:
        return {
          label: 'Cancelled',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case LabOrderPriority.STAT:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            STAT
          </span>
        );
      case LabOrderPriority.URGENT:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3" />
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Routine
          </span>
        );
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Laboratory Information System (LIS)' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                <Microscope className="w-3.5 h-3.5" />
                CLIA / NABL Standard Diagnostics
              </span>
              <span className="text-xs text-slate-400 font-mono">LIS v1.0</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-teal-600" />
              Laboratory & Diagnostics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Diagnostic requisitions, phlebotomy accessioning, bench result entry, and pathologist electronic verification.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link href="/laboratory/tests">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Test Catalog</span>
              </button>
            </Link>

            <Link href="/laboratory/worklist">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              >
                <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                <span>Technician Worklist</span>
              </button>
            </Link>

            <Link href="/laboratory/orders/new">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Lab Order</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="px-3 py-1 bg-white border border-red-200 rounded-md font-semibold hover:bg-red-50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Requisitions</span>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {isLoading ? '-' : metrics?.totalOrders ?? 0}
              </span>
              <span className="text-[11px] text-slate-500">all-time</span>
            </div>
          </div>

          {/* Card 2: Pending Collection */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">Pending Collection</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">
                {isLoading ? '-' : metrics?.pendingCollection ?? 0}
              </span>
              <span className="text-[11px] text-amber-600">phlebotomy queue</span>
            </div>
          </div>

          {/* Card 3: In Process */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">In Bench Testing</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Microscope className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-700">
                {isLoading ? '-' : metrics?.inProcess ?? 0}
              </span>
              <span className="text-[11px] text-blue-600">samples drawn</span>
            </div>
          </div>

          {/* Card 4: Awaiting Verification */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Awaiting Sign-Off</span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-700">
                {isLoading ? '-' : metrics?.awaitingVerification ?? 0}
              </span>
              <span className="text-[11px] text-purple-600">pathologist review</span>
            </div>
          </div>

          {/* Card 5: Completed Today */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Verified Today</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">
                {isLoading ? '-' : metrics?.completedToday ?? 0}
              </span>
              <span className="text-[11px] text-emerald-600">sealed reports</span>
            </div>
          </div>
        </div>

        {/* Critical Alert Warning Banner */}
        {metrics && metrics.criticalCountToday > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Critical Value Alert ({metrics.criticalCountToday} today)
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  One or more diagnostic test results have breached life-threatening critical thresholds. Immediate clinical escalation required.
                </p>
              </div>
            </div>
            <Link href="/laboratory/worklist">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs shrink-0"
              >
                Inspect Worklist &rarr;
              </button>
            </Link>
          </div>
        )}

        {/* Master Orders Registry Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header & Search Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Order #, Accession #, Patient Name, UHID, or Test..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Priorities</option>
                <option value={LabOrderPriority.ROUTINE}>Routine</option>
                <option value={LabOrderPriority.URGENT}>Urgent</option>
                <option value={LabOrderPriority.STAT}>STAT Emergency</option>
              </select>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchData}
                disabled={isLoading}
                className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh Table"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center border-b border-slate-200 px-4 gap-1 overflow-x-auto bg-slate-50/20 text-xs">
            {[
              { key: 'all', label: 'All Orders' },
              { key: LabOrderStatus.ORDERED, label: 'Pending Collection' },
              { key: LabOrderStatus.SAMPLE_COLLECTED, label: 'Sample Collected' },
              { key: LabOrderStatus.RESULT_ENTERED, label: 'Awaiting Sign-Off' },
              { key: LabOrderStatus.VERIFIED, label: 'Verified & Sealed' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`py-3 px-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order Details</th>
                  <th className="py-3 px-4">Patient Demographics</th>
                  <th className="py-3 px-4">Tests Requested</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Accession Barcode</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Loading laboratory orders registry...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <FlaskConical className="w-10 h-10 text-slate-300 mb-2" />
                        <span className="font-semibold text-slate-600">No laboratory requisitions found</span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          Create an electronic order or adjust your query filters.
                        </span>
                        <Link href="/laboratory/orders/new" className="mt-3">
                          <button
                            type="button"
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                          >
                            Create First Order
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const statusBadge = getStatusBadge(order.status);
                    const patient = order.patientId;
                    const doctor = order.doctorId;
                    const tests = order.testIds || [];

                    return (
                      <tr key={order._id || order.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Column 1: Order # and Date */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-teal-700">
                            <span>{order.orderNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {doctor && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Ordered by Dr. {doctor.name}
                            </div>
                          )}
                        </td>

                        {/* Column 2: Patient */}
                        <td className="py-3.5 px-4">
                          {patient ? (
                            <div>
                              <Link
                                href={`/patients/${patient._id || patient.id}`}
                                className="font-semibold text-slate-800 hover:text-teal-600 transition-colors"
                              >
                                {patient.name?.first} {patient.name?.last}
                              </Link>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>{patient.uhid}</span>
                                <span>•</span>
                                <span className="capitalize">{patient.gender || '-'}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown Patient</span>
                          )}
                        </td>

                        {/* Column 3: Tests */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {tests.map((t: any) => (
                              <span
                                key={t._id || t.code}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                title={t.name}
                              >
                                {t.code}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Column 4: Priority */}
                        <td className="py-3.5 px-4">{getPriorityBadge(order.priority)}</td>

                        {/* Column 5: Accession Barcode */}
                        <td className="py-3.5 px-4">
                          {order.accessionNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-50 text-slate-800 border border-slate-300">
                              <span>|||</span>
                              <span>{order.accessionNumber}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Uncollected</span>
                          )}
                        </td>

                        {/* Column 6: Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* Column 7: Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === LabOrderStatus.ORDERED && (
                              <Link href="/laboratory/worklist">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md transition-colors"
                                >
                                  Collect Sample &rarr;
                                </button>
                              </Link>
                            )}

                            {order.status === LabOrderStatus.SAMPLE_COLLECTED && (
                              <Link href="/laboratory/worklist">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors"
                                >
                                  Enter Results &rarr;
                                </button>
                              </Link>
                            )}

                            {order.status === LabOrderStatus.RESULT_ENTERED && (
                              <Link href={`/laboratory/reports/${order._id || order.id}`}>
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md transition-colors"
                                >
                                  Review & Sign &rarr;
                                </button>
                              </Link>
                            )}

                            {order.status === LabOrderStatus.VERIFIED && (
                              <Link href={`/laboratory/reports/${order._id || order.id}`}>
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors"
                                >
                                  View Report
                                </button>
                              </Link>
                            )}
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
      </div>
    </AppShell>
  );
}
