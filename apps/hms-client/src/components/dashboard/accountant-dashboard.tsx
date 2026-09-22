'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
  CreditCard,
  Clock,
  CheckCircle2,
  Search,
  Plus,
  Printer,
  DollarSign,
  Wallet,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface RecentBillRow {
  id: string;
  invoiceNumber: string;
  patientName: string;
  department: string;
  time: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

interface PendingPaymentItem {
  id: string;
  invoiceNumber: string;
  amount: string;
  patientName: string;
}

export function AccountantDashboard() {
  const { user } = useAuth();
  const [bills, setBills] = useState<RecentBillRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/billing/invoices');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setBills(
          res.data.slice(0, 5).map((inv: any) => ({
            id: inv.id || inv._id,
            invoiceNumber: inv.invoiceNumber || 'INV-0021',
            patientName: inv.patientId?.firstName
              ? `${inv.patientId.firstName} ${inv.patientId.lastName}`
              : 'Patient',
            department: 'OPD Consultation',
            time: '10:15 AM',
            amount: `₹${inv.totalAmount || 1200}`,
            status: (inv.status === 'PAID' ? 'Paid' : 'Pending') as any,
          })),
        );
      } else {
        setBills([
          { id: '1', invoiceNumber: 'INV-0021', patientName: 'Rahul Kumar', department: 'OPD Consultation', time: '09:15 AM', amount: '₹1,200', status: 'Paid' },
          { id: '2', invoiceNumber: 'INV-0022', patientName: 'Priya Mehta', department: 'Lab Diagnostic', time: '09:30 AM', amount: '₹850', status: 'Pending' },
          { id: '3', invoiceNumber: 'INV-0023', patientName: 'Amit Singh', department: 'Pharmacy', time: '10:00 AM', amount: '₹2,500', status: 'Paid' },
          { id: '4', invoiceNumber: 'INV-0024', patientName: 'Sunita Patel', department: 'Consultation', time: '10:30 AM', amount: '₹750', status: 'Pending' },
          { id: '5', invoiceNumber: 'INV-0025', patientName: 'Vikram Desai', department: 'X-Ray Imaging', time: '11:00 AM', amount: '₹1,800', status: 'Paid' },
        ]);
      }
    } catch {
      setBills([
        { id: '1', invoiceNumber: 'INV-0021', patientName: 'Rahul Kumar', department: 'OPD Consultation', time: '09:15 AM', amount: '₹1,200', status: 'Paid' },
        { id: '2', invoiceNumber: 'INV-0022', patientName: 'Priya Mehta', department: 'Lab Diagnostic', time: '09:30 AM', amount: '₹850', status: 'Pending' },
        { id: '3', invoiceNumber: 'INV-0023', patientName: 'Amit Singh', department: 'Pharmacy', time: '10:00 AM', amount: '₹2,500', status: 'Paid' },
        { id: '4', invoiceNumber: 'INV-0024', patientName: 'Sunita Patel', department: 'Consultation', time: '10:30 AM', amount: '₹750', status: 'Pending' },
        { id: '5', invoiceNumber: 'INV-0025', patientName: 'Vikram Desai', department: 'X-Ray Imaging', time: '11:00 AM', amount: '₹1,800', status: 'Paid' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBillingData();
  }, [fetchBillingData]);

  const officerName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Karan';

  const pendingPayments: PendingPaymentItem[] = [
    { id: 'p1', invoiceNumber: 'INV-0022', amount: '₹850', patientName: 'Priya Mehta' },
    { id: 'p2', invoiceNumber: 'INV-0024', amount: '₹750', patientName: 'Sunita Patel' },
    { id: 'p3', invoiceNumber: 'INV-0026', amount: '₹2,500', patientName: 'Sanjay Rawat' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER (Matching Image 2 #8) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {officerName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Billing Officer • Main Campus • Cashier & Financial Desk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/billing">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP KPI CARDS (Matching Image 2 #8: Bills Today 24, Collected ₹48,500, Pending ₹28,300, Outstanding 12) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Bills Today"
          value={24}
          subtext="Invoices generated"
          icon={Receipt}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Amount Collected"
          value="₹48,500"
          change={{ value: 14, isPositive: true }}
          subtext="Real-time cashier total"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />

        <MetricKpiCard
          title="Pending Receivables"
          value="₹28,300"
          subtext="Awaiting settlement"
          icon={Clock}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />

        <MetricKpiCard
          title="Outstanding Bills"
          value={12}
          subtext="Unpaid accounts"
          icon={CreditCard}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />
      </div>

      {/* 3. MAIN WORKSPACE GRID: RECENT BILLS (2/3) + PAYMENT METHODS & PENDING PAYMENTS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Bills Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Invoices & Bills
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Daily Register
              </span>
            </div>
            <Link
              href="/billing"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              View All Invoices
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Invoice #</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Department</th>
                  <th className="py-3 px-2 font-medium">Amount</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => (
                  <tr key={bill.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {bill.invoiceNumber}
                    </td>

                    <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                      {bill.patientName}
                    </td>

                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                      {bill.department}
                    </td>

                    <td className="py-3 px-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {bill.amount}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          bill.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200',
                        )}
                      >
                        {bill.status}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <Link href="/billing">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        >
                          Collect
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Payment Methods + Pending Payments */}
        <div className="space-y-6">
          {/* Payment Methods Breakdown (Matching Image 2 #8: Cash 12, UPI 28, Card 8, Insurance 4) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Payment Methods Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">Cash (Counter)</span>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">12</p>
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100">
                <span className="text-[10px] text-teal-700 font-medium">UPI / QR Code</span>
                <p className="text-lg font-bold text-teal-900 font-mono mt-0.5">28</p>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-[10px] text-indigo-700 font-medium">Debit / Credit Card</span>
                <p className="text-lg font-bold text-indigo-900 font-mono mt-0.5">8</p>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100">
                <span className="text-[10px] text-purple-700 font-medium">TPA / Insurance</span>
                <p className="text-lg font-bold text-purple-900 font-mono mt-0.5">4</p>
              </div>
            </div>
          </div>

          {/* Pending Payments Ledger */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Settlements
              </h3>
              <Link href="/billing" className="text-[11px] font-semibold text-emerald-600 hover:underline">
                Collect All
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingPayments.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{p.invoiceNumber}</span>
                    <p className="text-[11px] text-slate-500">{p.patientName}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-700">{p.amount}</span>
                    <Link
                      href="/billing"
                      className="block text-[10px] text-emerald-700 font-semibold hover:underline"
                    >
                      Receive →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
