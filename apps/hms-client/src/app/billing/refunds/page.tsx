'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Filter,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Refund, RefundStatus } from '@hms/types';
import { useCurrency } from '@/context/currency-context';

export default function RefundsQueuePage() {
  const { formatCurrency } = useCurrency();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval modal
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = selectedStatus !== 'ALL' ? `?status=${selectedStatus}` : '';
      const res = await apiClient.get<{ success: boolean; data: Refund[]; total: number }>(
        `/billing/refunds${statusParam}`,
      );
      if (res.success && res.data) {
        setRefunds(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load refunds:', err);
      setError(err?.message || 'Error loading refund requests.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;

    setIsProcessing(true);
    setModalError(null);

    try {
      const refundId = selectedRefund._id || selectedRefund.id;
      const res = await apiClient.post<{ success: boolean; data: Refund }>(
        `/billing/refunds/${refundId}/approve`,
        {
          action: approvalAction,
          notes: approvalNotes.trim() || undefined,
        },
      );

      if (res.success) {
        setSelectedRefund(null);
        setApprovalNotes('');
        await fetchRefunds();
      }
    } catch (err: any) {
      console.error('Refund decision failed:', err);
      setModalError(err?.message || 'Error executing refund authorization decision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const q = searchQuery.toLowerCase();
    const refNum = r.refundNumber.toLowerCase();
    const reason = r.reason.toLowerCase();
    const invoiceNum =
      typeof r.invoiceId === 'object' && r.invoiceId
        ? r.invoiceId.invoiceNumber.toLowerCase()
        : '';
    return !searchQuery || refNum.includes(q) || reason.includes(q) || invoiceNum.includes(q);
  });

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.DISBURSED:
      case RefundStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Disbursed
          </span>
        );
      case RefundStatus.REQUESTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Pending Authorization
          </span>
        );
      case RefundStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <AppShell title="Permission-Controlled Refunds Queue">
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
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Permission-Controlled Refunds Queue
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited authorization gate before cash or electronic disbursement
              </p>
            </div>
          </div>

          <button
            onClick={fetchRefunds}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            {['ALL', 'requested', 'disbursed', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors uppercase ${
                  selectedStatus === s
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search refund, reason, invoice..."
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
                  <th className="py-3 px-4">Refund #</th>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Reason / Justification</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Authorizer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading refund requests...
                    </td>
                  </tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RotateCcw className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No refund records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((ref) => {
                    const invoice = typeof ref.invoiceId === 'object' ? ref.invoiceId : null;
                    const requester = typeof ref.requestedBy === 'object' ? ref.requestedBy : null;
                    const approver = typeof ref.approvedBy === 'object' ? ref.approvedBy : null;

                    return (
                      <tr
                        key={ref._id || ref.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {ref.refundNumber}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {invoice ? (
                            <Link
                              href={`/billing/invoices/${invoice._id || invoice.id}`}
                              className="text-indigo-600 hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                          {ref.reason}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {requester ? `${requester.firstName} ${requester.lastName}` : 'Staff'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {approver ? `${approver.firstName} ${approver.lastName}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-purple-600">
                          {formatCurrency(ref.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(ref.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ref.status === RefundStatus.REQUESTED ? (
                            <button
                              onClick={() => {
                                setSelectedRefund(ref);
                                setApprovalAction('approve');
                                setApprovalNotes('');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm shadow-purple-600/30 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Authorize
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Authorize / Reject Refund */}
        {selectedRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Authorize Refund #{selectedRefund.refundNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Refund Amount:</span>
                  <span className="font-bold text-purple-600 text-sm">
                    {formatCurrency(selectedRefund.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Clinical Justification:</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedRefund.reason}
                  </p>
                </div>
              </div>

              <form onSubmit={handleDecisionSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Authorization Decision
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApprovalAction('approve')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                        approvalAction === 'approve'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Approve & Disburse
                    </button>

                    <button
                      type="button"
                      onClick={() => setApprovalAction('reject')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
                        approvalAction === 'reject'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Reject Request
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Audited Authorization Notes
                  </label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Enter approval comments, accounting voucher ref..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRefund(null)}
                    className="w-1/2 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`w-1/2 py-2 text-xs font-semibold text-white rounded-xl shadow-md flex items-center justify-center gap-1.5 ${
                      approvalAction === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    }`}
                  >
                    {isProcessing ? 'Recording...' : 'Confirm Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
