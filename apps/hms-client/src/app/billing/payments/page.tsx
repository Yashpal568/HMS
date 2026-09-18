'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  ArrowLeft,
  RefreshCw,
  Calendar,
  CheckCircle2,
  FileText,
  Filter,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Payment, PaymentMethod } from '@hms/types';
import { useCurrency } from '@/context/currency-context';

export default function PaymentsPage() {
  const { formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const methodParam = selectedMethod !== 'ALL' ? `?method=${selectedMethod}` : '';
      const res = await apiClient.get<{ success: boolean; data: Payment[]; total: number }>(
        `/billing/payments${methodParam}`,
      );
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load payments:', err);
      setError(err?.message || 'Error loading payments register.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMethod]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = payments.filter((p) => {
    const receipt = p.receiptNumber.toLowerCase();
    const ref = (p.transactionReference || '').toLowerCase();
    const rawPatient = typeof p.patientId === 'object' && p.patientId ? (p.patientId as any) : null;
    const patientName = rawPatient
      ? rawPatient.name
        ? `${rawPatient.name.first || ''} ${rawPatient.name.last || ''}`.toLowerCase()
        : `${rawPatient.firstName || ''} ${rawPatient.lastName || ''}`.toLowerCase()
      : '';
    const q = searchQuery.toLowerCase();
    return !searchQuery || receipt.includes(q) || ref.includes(q) || patientName.includes(q);
  });

  const totalSettled = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <AppShell title="Payments & Receipts Register">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/billing"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Payments & Receipts Register
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit trail of multi-method financial settlements across all hospital cashiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-right">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                Total Volume Filtered
              </span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                {formatCurrency(totalSettled)}
              </span>
            </div>

            <button
              onClick={fetchPayments}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Method:</span>
            {['ALL', 'cash', 'upi', 'credit_card', 'debit_card', 'bank_transfer', 'insurance_claim'].map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors uppercase ${
                    selectedMethod === m
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ),
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt, ref, patient..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Invoice Ref</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Ref / Notes</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading settlement receipts...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No payments found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const patient = typeof p.patientId === 'object' ? p.patientId : null;
                    const invoice = typeof p.invoiceId === 'object' ? p.invoiceId : null;
                    const cashier = typeof p.cashierId === 'object' ? p.cashierId : null;

                    return (
                      <tr
                        key={p._id || p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4">
                          {invoice ? (
                            <Link
                              href={`/billing/invoices/${invoice._id || invoice.id}`}
                              className="font-mono text-indigo-600 hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          ) : (
                            <span className="font-mono text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {patient ? (
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {(patient as any).name
                                  ? `${(patient as any).name.first || ''} ${(patient as any).name.last || ''}`.trim()
                                  : `${(patient as any).firstName || ''} ${(patient as any).lastName || ''}`.trim()}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {patient.uhid}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 uppercase">
                            {p.method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {p.transactionReference || p.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {cashier ? `${cashier.firstName} ${cashier.lastName}` : 'System'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(p.paidAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
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
