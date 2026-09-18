'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  Printer,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  User,
  Calendar,
  DollarSign,
  X,
  FileCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Invoice,
  InvoiceStatus,
  Payment,
  Refund,
  PaymentMethod,
} from '@hms/types';
import { useCurrency } from '@/context/currency-context';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const { formatCurrency, symbol } = useCurrency();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { invoice: Invoice; payments: Payment[]; refunds: Refund[] };
      }>(`/billing/invoices/${invoiceId}`);

      if (res.success && res.data) {
        setInvoice(res.data.invoice);
        setPayments(res.data.payments || []);
        setRefunds(res.data.refunds || []);
        if (res.data.invoice.balanceDue > 0) {
          setPaymentAmount(res.data.invoice.balanceDue.toString());
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch invoice:', err);
      setError(err?.message || 'Invoice could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Handle Payment Submit
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (amountNum > invoice.balanceDue) {
      setPaymentError(`Payment amount cannot exceed outstanding balance of ${formatCurrency(invoice.balanceDue)}.`);
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: Payment }>('/billing/payments', {
        invoiceId: invoice._id || invoice.id,
        amount: amountNum,
        method: paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      if (res.success) {
        setShowPaymentModal(false);
        setTransactionRef('');
        setPaymentNotes('');
        await fetchInvoice();
      }
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      setPaymentError(err?.message || 'Error processing payment transaction.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle Refund Submit
  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const amountNum = parseFloat(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setRefundError('Please enter a valid refund amount.');
      return;
    }

    if (amountNum > invoice.paidAmount) {
      setRefundError(`Refund amount cannot exceed total settled amount of ${formatCurrency(invoice.paidAmount)}.`);
      return;
    }

    if (!refundReason.trim()) {
      setRefundError('Clinical or administrative justification reason is mandatory.');
      return;
    }

    setIsProcessingRefund(true);
    setRefundError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: Refund }>('/billing/refunds', {
        invoiceId: invoice._id || invoice.id,
        amount: amountNum,
        reason: refundReason.trim(),
      });

      if (res.success) {
        setShowRefundModal(false);
        setRefundReason('');
        setRefundAmount('');
        await fetchInvoice();
      }
    } catch (err: any) {
      console.error('Refund request failed:', err);
      setRefundError(err?.message || 'Error submitting refund request.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            FULLY SETTLED
          </span>
        );
      case InvoiceStatus.PARTIALLY_PAID:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Clock className="w-4 h-4" />
            PARTIALLY PAID
          </span>
        );
      case InvoiceStatus.ISSUED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertCircle className="w-4 h-4" />
            PAYMENT DUE
          </span>
        );
      case InvoiceStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <RotateCcw className="w-4 h-4" />
            REFUNDED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Invoice Statement">
        <div className="py-20 text-center text-slate-400">
          <Receipt className="w-8 h-8 animate-pulse mx-auto mb-2 text-indigo-500" />
          Loading invoice details...
        </div>
      </AppShell>
    );
  }

  if (error || !invoice) {
    return (
      <AppShell title="Invoice Not Found">
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-rose-800 dark:text-rose-200">
            Invoice Not Found
          </h2>
          <p className="text-xs text-rose-600 dark:text-rose-300">{error || 'Unable to locate invoice record.'}</p>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Billing
          </Link>
        </div>
      </AppShell>
    );
  }

  const patient = typeof invoice.patientId === 'object' && invoice.patientId ? (invoice.patientId as any) : null;
  const patientFullName = patient
    ? patient.name
      ? `${patient.name.first || ''} ${patient.name.last || ''}`.trim()
      : `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
    : 'Guest Patient';

  return (
    <AppShell title={`Invoice #${invoice.invoiceNumber}`}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/billing"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {invoice.invoiceNumber}
                </h1>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Issued on {new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Receipt
            </button>

            {invoice.paidAmount > 0 && invoice.status !== InvoiceStatus.REFUNDED && (
              <button
                onClick={() => {
                  setRefundAmount(invoice.paidAmount.toString());
                  setShowRefundModal(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl hover:bg-purple-100 transition-colors shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Request Refund
              </button>
            )}

            {invoice.balanceDue > 0 && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.balanceDue.toString());
                  setShowPaymentModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Collect Payment ({formatCurrency(invoice.balanceDue)})
              </button>
            )}
          </div>
        </div>

        {/* Invoice Letterhead Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                <Building2 className="w-6 h-6" />
                <span>HMS MedCore Central Hospital</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Clinical Healthcare, Inpatient & Outpatient Care
              </p>
              <p className="text-xs text-slate-400 font-mono">
                GSTIN / Tax ID: 27AABCM8923P1Z2
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Tax Invoice / Official Bill
              </span>
              <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-slate-500">
                Date: {new Date(invoice.createdAt || Date.now()).toLocaleDateString()}
              </div>
              {invoice.dueDate && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Due: {new Date(invoice.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Patient Details Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To (Patient)
              </span>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {patientFullName}
              </div>
              <div className="text-slate-500 font-mono mt-0.5">UHID: {patient?.uhid || '—'}</div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Patient Contact
              </span>
              <div className="text-slate-700 dark:text-slate-300 font-medium">
                {patient?.contacts?.phone || patient?.phone || 'No phone recorded'}
              </div>
              <div className="text-slate-500 mt-0.5 capitalize">{patient?.gender || '—'}</div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Payment Status
              </span>
              <div>{getStatusBadge(invoice.status)}</div>
              <div className="text-slate-500 mt-1">
                Outstanding:{' '}
                <strong className={invoice.balanceDue > 0 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                  {formatCurrency(invoice.balanceDue)}
                </strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Tax</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.itemType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.description}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                      {item.discountAmount > 0 ? `- ${formatCurrency(item.discountAmount)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {item.taxAmount > 0 ? `+ ${formatCurrency(item.taxAmount)}` : '0.00'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.netAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 space-y-1 max-w-sm">
              {invoice.notes && (
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">Notes:</strong> {invoice.notes}
                </div>
              )}
              <p className="text-[11px] text-slate-400">
                This is a computer-generated tax invoice. Amounts in Indian Rupees (INR) unless converted.
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Discount:</span>
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  - {formatCurrency(invoice.totalDiscount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Tax:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  + {formatCurrency(invoice.totalTax)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Paid Amount:</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-900 dark:text-slate-100">Balance Due:</span>
                <span className={invoice.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                  {formatCurrency(invoice.balanceDue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payments History Ledger */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Settlement Receipts & Payments ({payments.length})
            </h3>
            {invoice.balanceDue > 0 && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.balanceDue.toString());
                  setShowPaymentModal(true);
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Collect Payment
              </button>
            )}
          </div>

          {payments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No payments recorded against this invoice yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {payments.map((pay) => (
                <div key={pay._id || pay.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pay.receiptNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 uppercase">
                        {pay.method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(pay.paidAt).toLocaleString()} • Ref: {pay.transactionReference || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(pay.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400">Verified Settlement</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refunds History (if any) */}
        {refunds.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-purple-600">
              <RotateCcw className="w-4 h-4" />
              Refund Requests & Adjustments ({refunds.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {refunds.map((ref) => (
                <div key={ref._id || ref.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {ref.refundNumber}
                    </div>
                    <div className="text-slate-500 mt-0.5">{ref.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-600">
                      - {formatCurrency(ref.amount)}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {ref.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Process Payment */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Collect Settlement Payment
                  </h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <form onSubmit={handleProcessPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Outstanding Balance: {formatCurrency(invoice.balanceDue)}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.balanceDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    placeholder={`Tender amount (${symbol.trim()})`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value={PaymentMethod.UPI}>UPI / Instant QR Code</option>
                    <option value={PaymentMethod.CASH}>Cash Currency</option>
                    <option value={PaymentMethod.CREDIT_CARD}>Credit Card</option>
                    <option value={PaymentMethod.DEBIT_CARD}>Debit Card</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Wire / NEFT / RTGS</option>
                    <option value={PaymentMethod.INSURANCE_CLAIM}>Third-Party Insurance Claim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Reference / Approval Code
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI Ref, Card Authorization AuthCode..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cashier Remarks
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional cashier notes..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="w-1/2 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="w-1/2 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Confirm Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Request Refund */}
        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <RotateCcw className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Submit Refund Request
                  </h3>
                </div>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {refundError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              <form onSubmit={handleRequestRefund} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Refund Amount (Max: {formatCurrency(invoice.paidAmount)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.paidAmount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Justification Reason
                  </label>
                  <textarea
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter reason (e.g. cancelled laboratory investigation, early discharge)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="w-1/2 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingRefund}
                    className="w-1/2 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5"
                  >
                    {isProcessingRefund ? 'Submitting...' : 'Request Refund'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Official Receipt Print Preview */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-slate-900">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-mono font-bold">OFFICIAL HOSPITAL RECEIPT PREVIEW</span>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="border border-dashed p-6 rounded-xl space-y-4 font-mono text-xs">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm">HMS MEDCORE HOSPITAL</div>
                  <div>100 Clinical Way, Medical District</div>
                  <div>GSTIN: 27AABCM8923P1Z2</div>
                </div>

                <div className="border-t border-b py-2 space-y-1">
                  <div>Invoice: {invoice.invoiceNumber}</div>
                  <div>Patient: {patientFullName}</div>
                  <div>UHID: {patient?.uhid || '—'}</div>
                  <div>Date: {new Date().toLocaleString()}</div>
                </div>

                <div className="space-y-1">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {item.description.substring(0, 20)} x {item.quantity}
                      </span>
                      <span>{formatCurrency(item.netAmount)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span>GRAND TOTAL:</span>
                    <span>{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>AMOUNT PAID:</span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BALANCE DUE:</span>
                    <span>{formatCurrency(invoice.balanceDue)}</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[10px] text-slate-500">
                  *** THANK YOU FOR VISITING HMS MEDCORE ***
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-1/2 py-2 text-xs font-medium bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-1/2 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
