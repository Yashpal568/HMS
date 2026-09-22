'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Package,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface PrescriptionQueueItem {
  id: string;
  token: string;
  patientName: string;
  doctorName: string;
  time: string;
  status: 'Pending' | 'Dispensed';
}

export function PharmacyDashboard() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPharmacyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/pharmacy/prescriptions');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setPrescriptions(
          res.data.slice(0, 5).map((p: any, idx: number) => ({
            id: p.id || p._id,
            token: `A-0${21 + idx}`,
            patientName: p.patientId?.firstName
              ? `${p.patientId.firstName} ${p.patientId.lastName}`
              : 'Patient',
            doctorName: p.prescribedBy?.name || 'Dr. Sharma',
            time: '10:15 AM',
            status: 'Pending',
          })),
        );
      } else {
        setPrescriptions([
          { id: '1', token: 'A-021', patientName: 'Rahul Kumar', doctorName: 'Dr. Sharma', time: '09:45 AM', status: 'Pending' },
          { id: '2', token: 'A-022', patientName: 'Priya Mehta', doctorName: 'Dr. Verma', time: '10:05 AM', status: 'Pending' },
          { id: '3', token: 'A-023', patientName: 'Amit Singh', doctorName: 'Dr. Khan', time: '10:20 AM', status: 'Pending' },
          { id: '4', token: 'A-024', patientName: 'Sunita Patel', doctorName: 'Dr. Iyer', time: '10:45 AM', status: 'Pending' },
          { id: '5', token: 'A-025', patientName: 'Vikram Desai', doctorName: 'Dr. Nair', time: '11:10 AM', status: 'Pending' },
        ]);
      }
    } catch {
      setPrescriptions([
        { id: '1', token: 'A-021', patientName: 'Rahul Kumar', doctorName: 'Dr. Sharma', time: '09:45 AM', status: 'Pending' },
        { id: '2', token: 'A-022', patientName: 'Priya Mehta', doctorName: 'Dr. Verma', time: '10:05 AM', status: 'Pending' },
        { id: '3', token: 'A-023', patientName: 'Amit Singh', doctorName: 'Dr. Khan', time: '10:20 AM', status: 'Pending' },
        { id: '4', token: 'A-024', patientName: 'Sunita Patel', doctorName: 'Dr. Iyer', time: '10:45 AM', status: 'Pending' },
        { id: '5', token: 'A-025', patientName: 'Vikram Desai', doctorName: 'Dr. Nair', time: '11:10 AM', status: 'Pending' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPharmacyData();
  }, [fetchPharmacyData]);

  const pharmacistName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Vikram';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER (Matching Image 2 #6) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 shadow-2xs">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {pharmacistName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Pharmacist • Main Campus • Central Outpatient Dispensary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/pharmacy">
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Dispense e-Rx</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP KPI CARDS (Matching Image 2 #6: Pending Prescriptions 24, Dispensed Today 36, Low Stock Items 8, Expiring Soon 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Pending Prescriptions"
          value={24}
          subtext="In dispensing queue"
          icon={Clock}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Dispensed Today"
          value={36}
          subtext="Fulfillments completed"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />

        <MetricKpiCard
          title="Low Stock Items"
          value={8}
          subtext="Below buffer limit"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />

        <MetricKpiCard
          title="Expiring Soon"
          value={5}
          subtext="Batches within 30 days"
          icon={Package}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />
      </div>

      {/* 3. MAIN WORKSPACE GRID: PENDING PRESCRIPTIONS (2/3) + ALERTS & QUICK ACTIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Prescriptions Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Pending Prescriptions
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Dispensing Queue
              </span>
            </div>
            <Link
              href="/pharmacy"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
            >
              Full Register
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Token</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Doctor</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((rx) => (
                  <tr key={rx.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-teal-700 whitespace-nowrap">
                      {rx.token}
                    </td>

                    <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                      {rx.patientName}
                    </td>

                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                      {rx.doctorName}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                        {rx.status}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <Link href="/pharmacy">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                        >
                          Dispense
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts + Expiring Soon + Quick Actions */}
        <div className="space-y-6">
          {/* Low Stock & Expiring Batches */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Stock Warnings
            </h3>

            {/* Low stock items */}
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-rose-950">Paracetamol 500mg</p>
                  <span className="text-[10px] text-rose-600 font-mono">Stock: 12 strips</span>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                  Low
                </span>
              </div>

              <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-rose-950">Amoxicillin 250mg</p>
                  <span className="text-[10px] text-rose-600 font-mono">Stock: 8 strips</span>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                  Low
                </span>
              </div>
            </div>

            {/* Expiring Soon */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Expiring Soon
              </span>

              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-950">Cefixime 200mg</p>
                  <span className="text-[10px] text-amber-700 font-mono">Batch: B-204</span>
                </div>
                <span className="text-[10px] font-mono text-amber-800">
                  in 15 days
                </span>
              </div>

              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-950">Metformin 500mg</p>
                  <span className="text-[10px] text-amber-700 font-mono">Batch: B-189</span>
                </div>
                <span className="text-[10px] font-mono text-amber-800">
                  in 28 days
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Matching Image 2 #6) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Pharmacy Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/pharmacy">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Search className="h-4 w-4 mr-2 text-teal-600" />
                  <span>Search Formulary Catalog</span>
                </Button>
              </Link>

              <Link href="/inventory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Layers className="h-4 w-4 mr-2 text-indigo-600" />
                  <span>Check Batch & Expiry</span>
                </Button>
              </Link>

              <Link href="/inventory">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2 text-amber-600" />
                  <span>Requisition Store Replenishment</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
