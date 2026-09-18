'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  Bed,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  ArrowLeft,
  Clock,
  FlaskConical,
  Stethoscope,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import type { CensusReport } from '@hms/types';

export default function CensusReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [census, setCensus] = useState<CensusReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCensus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: CensusReport }>(
        `/reports/census?startDate=${startDate}&endDate=${endDate}`,
      );
      if (res?.data) {
        setCensus(res.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load census data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCensus();
  }, [fetchCensus]);

  const handleExportCsv = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export?type=census&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            <span>Reports Hub</span>
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">Operational & Clinical Census</span>
        </div>

        {/* Header Title & Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Clinical Census & Capacity Telemetry
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Patient volume, outpatient clinic footfall, inpatient bed occupancy, and diagnostic laboratory turnaround.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-sm text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-foreground focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-sky-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              <span>Print PDF</span>
            </button>
            <button
              onClick={fetchCensus}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Primary Operational Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Patient Registry</span>
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : census?.patientVolume?.activePatients || 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-sky-600">+{census?.patientVolume?.totalRegistrations || 0}</span> new registrations in period
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">OPD Clinic Attendance</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : census?.opdWorkload?.attended || 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Out of {census?.opdWorkload?.totalAppointments || 0} scheduled (
              {census?.opdWorkload?.totalAppointments
                ? Math.round(((census.opdWorkload.attended || 0) / census.opdWorkload.totalAppointments) * 100)
                : 0}
              % attendance)
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Bed Occupancy Rate</span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
                <Bed className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${census?.ipdCensus?.bedOccupancyRate || 0}%`}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {census?.ipdCensus?.occupiedBeds || 0} of {census?.ipdCensus?.totalBeds || 0} beds currently occupied
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Average Length of Stay</span>
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${census?.ipdCensus?.averageLengthOfStayDays || 0} days`}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {census?.ipdCensus?.totalDischarges || 0} discharges in selected period
            </div>
          </div>
        </div>

        {/* Inpatient Ward Breakdown & OPD Workload Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Ward Bed Matrix Occupancy */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Inpatient Ward Bed Occupancy Breakdown</h3>
              <span className="text-xs text-muted-foreground">Live Hospital Census</span>
            </div>
            <div className="space-y-4">
              {census?.ipdCensus?.wardBreakdown && census.ipdCensus.wardBreakdown.length > 0 ? (
                census.ipdCensus.wardBreakdown.map((w, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{w.wardName}</span>
                      <span className="text-muted-foreground">
                        {w.occupiedBeds} occupied / {w.totalBeds} total ({w.occupancyRate}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          w.occupancyRate >= 80
                            ? 'bg-rose-500'
                            : w.occupancyRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, w.occupancyRate)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No ward bed census recorded.
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Laboratory Workload */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Diagnostic Lab Workload</h3>
              <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-600">
                <FlaskConical className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
                <span className="text-sm font-bold text-foreground">{census?.labWorkload?.totalOrdered || 0}</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Verified & Sealed</span>
                <span className="text-sm font-bold text-emerald-600">{census?.labWorkload?.verified || 0}</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending in Queue</span>
                <span className="text-sm font-bold text-amber-600">{census?.labWorkload?.pending || 0}</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Average Turnaround (TAT)</span>
                <span className="text-sm font-bold text-foreground">{census?.labWorkload?.averageTatHours || 0} hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor OPD Workload Ledger Table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Clinician OPD Consultation Load</h3>
              <p className="text-xs text-muted-foreground">Throughput and completed consultations by physician</p>
            </div>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Doctor Name</th>
                  <th className="pb-3 font-semibold">Specialty / Department</th>
                  <th className="pb-3 font-semibold text-center">Consultations Scheduled</th>
                  <th className="pb-3 font-semibold text-center">Completed</th>
                  <th className="pb-3 font-semibold text-right">Throughput %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {census?.opdWorkload?.doctorWorkload && census.opdWorkload.doctorWorkload.length > 0 ? (
                  census.opdWorkload.doctorWorkload.map((doc, idx) => {
                    const rate = doc.count > 0 ? Math.round((doc.completed / doc.count) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-3 font-semibold text-foreground">{doc.doctorName}</td>
                        <td className="py-3 text-muted-foreground">{doc.department}</td>
                        <td className="py-3 text-center font-medium text-foreground">{doc.count}</td>
                        <td className="py-3 text-center font-semibold text-emerald-600">{doc.completed}</td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              rate >= 75
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : rate >= 50
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No clinician consultation workload recorded for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
