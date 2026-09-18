'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Users,
  Activity,
  Bed,
  CreditCard,
  DollarSign,
  Pill,
  Download,
  Printer,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  BarChart3,
  Stethoscope,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/context/currency-context';
import type { CensusReport, FinancialReport, InventoryPharmacyReport } from '@hms/types';

export default function ReportsHubPage() {
  const { formatCurrency } = useCurrency();
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'census' | 'financial' | 'inventory'>('census');

  const [census, setCensus] = useState<CensusReport | null>(null);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [inventory, setInventory] = useState<InventoryPharmacyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute dates based on preset
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);

    if (datePreset === 'today') {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (datePreset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (datePreset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().slice(0, 10));
      setEndDate(endStr);
    }
  }, [datePreset]);

  const fetchReports = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const [censusRes, finRes, invRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: CensusReport }>(`/reports/census?startDate=${startDate}&endDate=${endDate}`),
        apiClient.get<{ success: boolean; data: FinancialReport }>(`/reports/financial?startDate=${startDate}&endDate=${endDate}`),
        apiClient.get<{ success: boolean; data: InventoryPharmacyReport }>(`/reports/inventory?startDate=${startDate}&endDate=${endDate}`),
      ]);

      if (censusRes.status === 'fulfilled' && censusRes.value?.data) {
        setCensus(censusRes.value.data);
      }
      if (finRes.status === 'fulfilled' && finRes.value?.data) {
        setFinancial(finRes.value.data);
      }
      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        setInventory(invRes.value.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load report metrics');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [startDate, endDate, fetchReports]);

  const handleExportCsv = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export?type=${activeTab}&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Hospital Reports & Analytics
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Institutional census, operational footfall, revenue analytics, and supply chain telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
              title="Download formatted CSV spreadsheet"
            >
              <Download className="h-4 w-4 text-teal-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
              title="Print official report"
            >
              <Printer className="h-4 w-4 text-primary" />
              <span>Print Report</span>
            </button>
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Date Presets Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Time Period:
            </span>
            {(['today', 'yesterday', '7days', 'month', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  datePreset === preset
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {preset === 'today' && 'Today'}
                {preset === 'yesterday' && 'Yesterday'}
                {preset === '7days' && 'Last 7 Days'}
                {preset === 'month' && 'Month to Date'}
                {preset === 'custom' && 'Custom Range'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Top Executive KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Revenue Invoiced
              </span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(financial?.summary?.totalInvoiced || 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Collected: {isLoading ? '...' : formatCurrency(financial?.summary?.totalCollected || 0)}</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Gross</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Inpatient Bed Occupancy
              </span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                <Bed className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${census?.ipdCensus?.bedOccupancyRate || 0}%`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {census?.ipdCensus?.occupiedBeds || 0} / {census?.ipdCensus?.totalBeds || 0} Beds Active
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                ALOS: {census?.ipdCensus?.averageLengthOfStayDays || 0}d
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                OPD Patient Footfall
              </span>
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : (census?.opdWorkload?.attended || 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{census?.opdWorkload?.totalAppointments || 0} Total Booked</span>
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                {census?.patientVolume?.totalRegistrations || 0} New Intake
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Near Expiry Batches
              </span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Pill className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : (inventory?.pharmacy?.nearExpiryBatchesCount || 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>≤ 90 Days to Expiration</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {inventory?.pharmacy?.stockoutRiskMedicines?.length || 0} Low Stock
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Domain Report Sections Navigation */}
        <div className="flex items-center gap-3 border-b border-border">
          <button
            onClick={() => setActiveTab('census')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'census'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Clinical & Operational Census</span>
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'financial'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Financial & Revenue Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'inventory'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
            }`}
          >
            <Pill className="h-4 w-4" />
            <span>Pharmacy & Inventory Risks</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'census' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Operational Footfall & Capacity Overview</h2>
              <Link
                href="/reports/census"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open Dedicated Census Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Ward Occupancy Breakdown */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">Ward Bed Occupancy Rates</h3>
                <div className="space-y-4">
                  {census?.ipdCensus?.wardBreakdown && census.ipdCensus.wardBreakdown.length > 0 ? (
                    census.ipdCensus.wardBreakdown.map((w, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{w.wardName}</span>
                          <span className="text-muted-foreground">
                            {w.occupiedBeds} of {w.totalBeds} beds ({w.occupancyRate}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              w.occupancyRate >= 85
                                ? 'bg-rose-500'
                                : w.occupancyRate >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.min(100, w.occupancyRate)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No inpatient ward census recorded for this period.
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Intake Demographics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Gender Distribution</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.genderDistribution?.male || 0}</div>
                        <div className="text-[11px] text-muted-foreground">Male</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.genderDistribution?.female || 0}</div>
                        <div className="text-[11px] text-muted-foreground">Female</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.genderDistribution?.other || 0}</div>
                        <div className="text-[11px] text-muted-foreground">Other</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Age Classification</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.ageDistribution?.pediatric || 0}</div>
                        <div className="text-[11px] text-muted-foreground">&lt; 18 Yrs</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.ageDistribution?.adult || 0}</div>
                        <div className="text-[11px] text-muted-foreground">18-60 Yrs</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-base font-bold text-foreground">{census?.patientVolume?.ageDistribution?.geriatric || 0}</div>
                        <div className="text-[11px] text-muted-foreground">&gt; 60 Yrs</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Revenue Realization & Accounts Receivable</h2>
              <Link
                href="/reports/financial"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open Dedicated Financial Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Accounts Receivable Ageing Matrix */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Accounts Receivable Ageing Matrix</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                    <div className="text-[11px] font-semibold text-muted-foreground">0-30 Days</div>
                    <div className="mt-1.5 text-base font-bold text-foreground">
                      {formatCurrency(financial?.ageingBuckets?.current || 0)}
                    </div>
                    <div className="mt-1 text-[10px] text-emerald-600 font-medium">Current</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                    <div className="text-[11px] font-semibold text-muted-foreground">31-60 Days</div>
                    <div className="mt-1.5 text-base font-bold text-foreground">
                      {formatCurrency(financial?.ageingBuckets?.thirtyToSixty || 0)}
                    </div>
                    <div className="mt-1 text-[10px] text-amber-600 font-medium">Due Soon</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                    <div className="text-[11px] font-semibold text-muted-foreground">61-90 Days</div>
                    <div className="mt-1.5 text-base font-bold text-foreground">
                      {formatCurrency(financial?.ageingBuckets?.sixtyToNinety || 0)}
                    </div>
                    <div className="mt-1 text-[10px] text-orange-600 font-medium">Overdue</div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                    <div className="text-[11px] font-semibold text-muted-foreground">&gt;90 Days</div>
                    <div className="mt-1.5 text-base font-bold text-rose-600">
                      {formatCurrency(financial?.ageingBuckets?.overNinety || 0)}
                    </div>
                    <div className="mt-1 text-[10px] text-rose-600 font-medium">Critical</div>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Collections by Payment Method</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {financial?.paymentMethodBreakdown &&
                    Object.entries(financial.paymentMethodBreakdown).map(([method, amount]) => (
                      <div key={method} className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {method.replace(/_/g, ' ')}
                        </div>
                        <div className="mt-1 text-sm font-bold text-foreground">{formatCurrency(amount)}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Supply Chain & Expiry Risk Governance</h2>
              <Link
                href="/reports/pharmacy-inventory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>Open Dedicated Supply Chain Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">Critical Expiration Watch (≤ 90 Days)</h3>
              {inventory?.pharmacy?.nearExpiryBatches && inventory.pharmacy.nearExpiryBatches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2.5 font-medium">Batch Number</th>
                        <th className="pb-2.5 font-medium">Medication</th>
                        <th className="pb-2.5 font-medium">Expiry Date</th>
                        <th className="pb-2.5 font-medium">Days Left</th>
                        <th className="pb-2.5 font-medium text-right">Remaining Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inventory.pharmacy.nearExpiryBatches.map((b, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="py-2.5 font-mono font-semibold text-foreground">{b.batchNumber}</td>
                          <td className="py-2.5 font-medium text-foreground">{b.medicineName}</td>
                          <td className="py-2.5 text-muted-foreground">{b.expiryDate}</td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                b.daysUntilExpiry <= 30
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {b.daysUntilExpiry} days
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-foreground">{b.stock} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                  All active medicine batches have compliant shelf lives (&gt;90 days).
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
