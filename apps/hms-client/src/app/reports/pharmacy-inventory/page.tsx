'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Pill,
  Package,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingDown,
  Boxes,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/context/currency-context';
import type { InventoryPharmacyReport } from '@hms/types';

export default function PharmacyInventoryReportPage() {
  const { formatCurrency } = useCurrency();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [report, setReport] = useState<InventoryPharmacyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: InventoryPharmacyReport }>(
        `/reports/inventory?startDate=${startDate}&endDate=${endDate}`,
      );
      if (res?.data) {
        setReport(res.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load inventory report');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export?type=inventory&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            <span>Reports Hub</span>
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">Pharmacy & Inventory Risk Analytics</span>
        </div>

        {/* Header Title & Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Pill className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Supply Chain & Batch Expiry Governance
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Near-expiry batch risk matrix, formulary stockout alerts, total inventory valuation, and procurement queues.
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
              <Download className="h-3.5 w-3.5 text-amber-600" />
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
              onClick={fetchReport}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Primary Supply Chain Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Inventory Valuation</span>
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(report?.inventory?.totalValuation || 0)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Active consumable & surgical stock</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Near Expiry Batches</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : report?.pharmacy?.nearExpiryBatchesCount || 0}
            </div>
            <div className="mt-1 text-xs text-amber-600 font-medium">Expiring within 90 calendar days</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Low Safety Stock Alerts</span>
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-rose-600">
              {isLoading ? '...' : (report?.pharmacy?.stockoutRiskMedicines?.length || 0) + (report?.inventory?.lowStockItemCount || 0)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Items requiring immediate reorder</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Prescriptions Dispensed</span>
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600">
                <Pill className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : report?.pharmacy?.dispenseCount || 0}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {report?.inventory?.openPurchaseOrdersCount || 0} active purchase orders open
            </div>
          </div>
        </div>

        {/* Near Expiry Batches Table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Critical Expiry Watch (≤ 90 Days)</h3>
              <p className="text-xs text-muted-foreground">Batches requiring First-Expiry, First-Out (FEFO) prioritization or vendor return</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
              FEFO Priority Queue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Batch Number</th>
                  <th className="pb-3 font-semibold">Medication Formulation</th>
                  <th className="pb-3 font-semibold">Expiry Date</th>
                  <th className="pb-3 font-semibold text-center">Days Remaining</th>
                  <th className="pb-3 font-semibold text-right">Available Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report?.pharmacy?.nearExpiryBatches && report.pharmacy.nearExpiryBatches.length > 0 ? (
                  report.pharmacy.nearExpiryBatches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-3 font-mono font-bold text-foreground">{b.batchNumber}</td>
                      <td className="py-3 font-medium text-foreground">{b.medicineName}</td>
                      <td className="py-3 text-muted-foreground">{b.expiryDate}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            b.daysUntilExpiry <= 30
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {b.daysUntilExpiry} days left
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-foreground">{b.stock} units</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      All medicine batches have compliant shelf lives (&gt;90 days).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stockout Risk Formulary Table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Formulary Stockout Alert List</h3>
              <p className="text-xs text-muted-foreground">Medicines currently below minimum safety stock threshold</p>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
              Procurement Alert
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Medicine Formulation</th>
                  <th className="pb-3 font-semibold text-center">Stock On Hand</th>
                  <th className="pb-3 font-semibold text-center">Min Safety Threshold</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report?.pharmacy?.stockoutRiskMedicines && report.pharmacy.stockoutRiskMedicines.length > 0 ? (
                  report.pharmacy.stockoutRiskMedicines.map((m, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-3 font-semibold text-foreground">{m.name}</td>
                      <td className="py-3 text-center font-bold text-rose-600">{m.stockOnHand} units</td>
                      <td className="py-3 text-center text-muted-foreground">{m.minStock} units</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                          {m.stockOnHand === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                      All hospital medicines are safely above minimum reorder levels.
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
