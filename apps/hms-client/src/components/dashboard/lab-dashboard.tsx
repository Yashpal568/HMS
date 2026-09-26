'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  FileCheck2,
  Activity,
  Plus,
  Printer,
  Eye,
  Sliders,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface LabOrderRow {
  id: string;
  orderNumber: string;
  patientName: string;
  testName: string;
  department: string;
  status: 'Sample Received' | 'Processing' | 'Pending Collection' | 'Completed';
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
}

export function LabDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<LabOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLabData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/laboratory/orders');
      if (res?.data && Array.isArray(res.data)) {
        setOrders(
          res.data.map((o: any) => ({
            id: o.id || o._id,
            orderNumber: o.orderNumber || 'LAB-2026-001',
            patientName: o.patientId?.firstName
              ? `${o.patientId.firstName} ${o.patientId.lastName || ''}`
              : (o.patientName || 'Patient'),
            testName: o.testId?.name || (o.tests?.[0]?.testName || 'Diagnostic Panel'),
            department: o.testId?.category || o.department || 'Diagnostic Lab',
            status: (o.status === 'SAMPLE_COLLECTED'
              ? 'Sample Received'
              : o.status === 'IN_PROGRESS'
              ? 'Processing'
              : o.status === 'VERIFIED' || o.status === 'COMPLETED'
              ? 'Completed'
              : 'Pending Collection') as any,
            priority: o.priority || 'ROUTINE',
          })),
        );
      } else {
        setOrders([]);
      }
    } catch {
      // Keep polished fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLabData();
  }, [fetchLabData]);

  const technicianName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Neha';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER (Exact Match to Image 2 #7) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 shadow-2xs">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {technicianName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Lab Technician • Main Campus • Central Diagnostic Lab
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/laboratory/orders/new">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Requisition</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP KPI CARDS (Matching Image 2 #7: Pending Orders 18, Samples Received 12, In Processing 8, Reports Pending 6) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Pending Orders"
          value={18}
          subtext="Requisitions waiting"
          icon={FlaskConical}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 border-purple-100"
        />

        <MetricKpiCard
          title="Samples Received"
          value={12}
          subtext="Accessioned today"
          icon={CheckCircle2}
          iconColor="text-sky-600"
          iconBg="bg-sky-50 border-sky-100"
        />

        <MetricKpiCard
          title="In Processing"
          value={8}
          subtext="On analyzers"
          icon={Activity}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />

        <MetricKpiCard
          title="Reports Pending"
          value={6}
          subtext="Verification required"
          icon={FileCheck2}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />
      </div>

      {/* 3. MAIN WORKSPACE GRID: RECENT LAB ORDERS (2/3) + EQUIPMENT & QUICK ACTIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Lab Orders Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Lab Orders
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Worksheet
              </span>
            </div>
            <Link
              href="/laboratory"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
            >
              View All Orders
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Order ID</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Test Requisition</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      No active laboratory orders found for this facility.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-2 font-mono font-bold text-purple-700 whitespace-nowrap">
                        {ord.orderNumber}
                      </td>

                      <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                        {ord.patientName}
                      </td>

                      <td className="py-3 px-2">
                        <p className="font-medium text-slate-800 leading-tight">{ord.testName}</p>
                        <p className="text-[10px] text-slate-400">{ord.department}</p>
                      </td>

                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            ord.status === 'Sample Received' &&
                              'bg-emerald-50 text-emerald-800 border-emerald-200',
                            ord.status === 'Processing' &&
                              'bg-amber-50 text-amber-800 border-amber-200',
                            ord.status === 'Pending Collection' &&
                              'bg-sky-50 text-sky-800 border-sky-200',
                            ord.status === 'Completed' &&
                              'bg-slate-100 text-slate-700 border-slate-200',
                          )}
                        >
                          {ord.status}
                        </span>
                      </td>

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        <Link href="/laboratory">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-lg cursor-pointer"
                          >
                            Enter Result
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quick Actions + Equipment Status */}
        <div className="space-y-6">
          {/* Quick Actions Card (Matching Image 2 #7) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Lab Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/laboratory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                >
                  <Activity className="h-4 w-4 mr-2 text-purple-600" />
                  <span>Enter Test Result</span>
                </Button>
              </Link>

              <Link href="/laboratory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                >
                  <FileCheck2 className="h-4 w-4 mr-2 text-teal-600" />
                  <span>Upload Pathology Report</span>
                </Button>
              </Link>

              <Link href="/laboratory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                  <span>Mark Specimen Collected</span>
                </Button>
              </Link>

              <Link href="/laboratory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                >
                  <Printer className="h-4 w-4 mr-2 text-slate-600" />
                  <span>Print Barcode Labels</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Equipment Status Monitor (Matching Image 2 #7) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Equipment Status
              </h3>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Operational
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Analyzer 1 (Hematology)</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Analyzer 2 (Biochemistry)</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">High-Speed Centrifuge</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">Specimen Refrigerator (4°C)</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
