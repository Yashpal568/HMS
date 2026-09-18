'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Wallet,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/context/currency-context';
import type { FinancialReport } from '@hms/types';

export default function FinancialReportPage() {
  const { formatCurrency } = useCurrency();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: FinancialReport }>(
        `/reports/financial?startDate=${startDate}&endDate=${endDate}`,
      );
      if (res?.data) {
        setFinancial(res.data);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load financial report data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchFinancial();
  }, [fetchFinancial]);

  const handleExportCsv = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/export?type=financial&startDate=${startDate}&endDate=${endDate}`;
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
          <span className="font-semibold text-foreground">Financial & Revenue Analytics</span>
        </div>

        {/* Header Title & Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Revenue & Financial Reconciliation
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Institutional collections, accounts receivable ageing matrix, payment methods, and cashier shift registers.
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
              <Download className="h-3.5 w-3.5 text-emerald-600" />
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
              onClick={fetchFinancial}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Primary Financial Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Total Invoiced</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(financial?.summary?.totalInvoiced || 0)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Discounts: {isLoading ? '...' : formatCurrency(financial?.summary?.totalDiscountGiven || 0)}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Realized Collections</span>
              <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(financial?.summary?.totalCollected || 0)}
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              100% atomic payment reconciliation
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Outstanding Receivables</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(financial?.summary?.totalOutstanding || 0)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Unsettled patient account balances
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Disbursed Refunds</span>
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-foreground">
              {isLoading ? '...' : formatCurrency(financial?.summary?.totalRefunded || 0)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Authorized clinical credit disbursements
            </div>
          </div>
        </div>

        {/* Accounts Receivable Ageing Matrix Section */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Accounts Receivable (AR) Ageing Matrix</h3>
              <p className="text-xs text-muted-foreground">Outstanding patient liability categorized by overdue duration</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
              Active Ageing Watch
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">0 - 30 Days</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Current
                </span>
              </div>
              <div className="mt-3 text-xl font-bold text-foreground">
                {isLoading ? '...' : formatCurrency(financial?.ageingBuckets?.current || 0)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Within standard hospital credit terms</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">31 - 60 Days</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  Follow-up
                </span>
              </div>
              <div className="mt-3 text-xl font-bold text-foreground">
                {isLoading ? '...' : formatCurrency(financial?.ageingBuckets?.thirtyToSixty || 0)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Automated reminder notification cycle</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">61 - 90 Days</span>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                  Overdue
                </span>
              </div>
              <div className="mt-3 text-xl font-bold text-foreground">
                {isLoading ? '...' : formatCurrency(financial?.ageingBuckets?.sixtyToNinety || 0)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Billing desk formal outreach required</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">&gt; 90 Days</span>
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                  High Risk
                </span>
              </div>
              <div className="mt-3 text-xl font-bold text-rose-600">
                {isLoading ? '...' : formatCurrency(financial?.ageingBuckets?.overNinety || 0)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Delinquent accounts escalated to finance</p>
            </div>
          </div>
        </div>

        {/* Payment Channels & Cashier Collections Register */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Payment Methods */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4">Payment Methods Realization</h3>
            <div className="space-y-3">
              {financial?.paymentMethodBreakdown &&
                Object.entries(financial.paymentMethodBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="uppercase">{method.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Cashier Shift Reconciliation Table */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4">Duty Cashier Shift Reconciliation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-semibold">Cashier Name</th>
                    <th className="pb-2.5 font-semibold text-center">Receipts Issued</th>
                    <th className="pb-2.5 font-semibold text-right">Collections</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {financial?.cashierCollections && financial.cashierCollections.length > 0 ? (
                    financial.cashierCollections.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-3 font-semibold text-foreground">{c.cashierName}</td>
                        <td className="py-3 text-center font-medium text-foreground">{c.transactionCount}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">
                          {formatCurrency(c.totalCollected)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No cashier receipts recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Departmental Revenue Attribution */}
        {financial?.departmentalRevenue && financial.departmentalRevenue.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold text-foreground mb-4">Departmental Revenue Attribution</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {financial.departmentalRevenue.map((d, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-3.5">
                  <div className="text-xs font-semibold text-muted-foreground">{d.department}</div>
                  <div className="mt-1.5 text-base font-bold text-foreground">{formatCurrency(d.amount)}</div>
                  <div className="mt-1 text-[11px] text-primary font-medium">{d.percentage}% of total revenue</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
