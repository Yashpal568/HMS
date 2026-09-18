'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowLeft,
  RefreshCw,
  PlusCircle,
  SlidersHorizontal,
  X,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  InventoryItem,
  StockMovement,
  StockMovementType,
} from '@hms/types';

const HOSPITAL_DEPARTMENTS = [
  'Operating Theater (OT)',
  'Emergency Room (ER)',
  'Intensive Care Unit (ICU)',
  'Outpatient Department (OPD)',
  'Maternity & Labor Ward',
  'Pediatric Ward',
  'Central Diagnostic Laboratory',
  'General Inpatient Wards',
];

export default function StockTransfersPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferData, setTransferData] = useState({
    itemId: '',
    quantity: 5,
    toDepartment: HOSPITAL_DEPARTMENTS[0],
    reason: '',
  });

  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isAdjustmentSubmitting, setIsAdjustmentSubmitting] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    itemId: '',
    quantity: 1,
    type: 'loss' as 'loss' | 'gain',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [movementsRes, itemsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: StockMovement[] }>('/inventory/movements'),
        apiClient.get<{ success: boolean; data: InventoryItem[] }>('/inventory/items'),
      ]);

      if (movementsRes.success && movementsRes.data) {
        setMovements(movementsRes.data);
      }
      if (itemsRes.success && itemsRes.data) {
        setItems(itemsRes.data);
        if (itemsRes.data.length > 0) {
          const firstId = itemsRes.data[0]._id || itemsRes.data[0].id;
          setTransferData((prev) => (prev.itemId ? prev : { ...prev, itemId: firstId }));
          setAdjustmentData((prev) => (prev.itemId ? prev : { ...prev, itemId: firstId }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
      setError(err?.message || 'Error loading stock movements ledger.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTransferSubmitting(true);
    setTransferError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: StockMovement }>(
        '/inventory/transfers',
        transferData,
      );

      if (res.success) {
        setIsTransferModalOpen(false);
        setTransferData((prev) => ({ ...prev, reason: '', quantity: 5 }));
        fetchData();
      }
    } catch (err: any) {
      console.error('Transfer failed:', err);
      setTransferError(err?.message || 'Failed to process departmental transfer.');
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdjustmentSubmitting(true);
    setAdjustmentError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: StockMovement }>(
        '/inventory/adjustments',
        adjustmentData,
      );

      if (res.success) {
        setIsAdjustmentModalOpen(false);
        setAdjustmentData((prev) => ({ ...prev, reason: '', quantity: 1 }));
        fetchData();
      }
    } catch (err: any) {
      console.error('Adjustment failed:', err);
      setAdjustmentError(err?.message || 'Failed to record stock adjustment.');
    } finally {
      setIsAdjustmentSubmitting(false);
    }
  };

  const getMovementBadge = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.GRN_RECEIPT:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownRight className="h-3 w-3" />
            GRN Receipt
          </span>
        );
      case StockMovementType.DEPT_TRANSFER:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowLeftRight className="h-3 w-3" />
            Dept Transfer
          </span>
        );
      case StockMovementType.ADJUSTMENT_LOSS:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="h-3 w-3" />
            Audit Loss / Spoilage
          </span>
        );
      case StockMovementType.ADJUSTMENT_GAIN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowDownRight className="h-3 w-3" />
            Audit Surplus
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <AppShell
      title="Department Transfers & Ledger"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Department Transfers & Movements' },
      ]}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Inventory Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Departmental Transfers & Stock Movement Ledger
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Issue consumables to hospital sub-stores (ER, OT, ICU, Wards), log physical audit write-offs, and inspect immutable movement history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
              Stock Adjustment
            </button>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Issue to Department
            </button>
          </div>
        </div>

        {/* Movement Ledger Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chronological Stock Movement Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every stock addition, departmental transfer, and audit correction with verified running balance.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">Showing last 200 transactions</span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading stock ledger...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No stock movements recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Receive deliveries or issue supplies to departments to populate the ledger
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Transfer Route / Locations</th>
                    <th className="py-3 px-4">Quantity Change</th>
                    <th className="py-3 px-4">Running Balance After</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {movements.map((m) => {
                    const item = m.itemId as InventoryItem;
                    const isPositive = m.quantity > 0;

                    return (
                      <tr key={m._id || m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block text-xs">
                            {item?.name || 'Item'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item?.itemCode} ({item?.uom})
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {getMovementBadge(m.type)}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {m.fromLocation && m.toLocation ? (
                            <span>{m.fromLocation} &rarr; <span className="font-bold text-slate-900">{m.toLocation}</span></span>
                          ) : m.toLocation ? (
                            <span>To: <span className="font-bold text-slate-900">{m.toLocation}</span></span>
                          ) : m.fromLocation ? (
                            <span>From: <span className="font-bold text-slate-900">{m.fromLocation}</span></span>
                          ) : (
                            <span className="text-slate-400">Central Store</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isPositive ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : `${m.quantity}`} {item?.uom?.split(' ')[0] || 'units'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-slate-900">
                          {m.balanceAfter} {item?.uom?.split(' ')[0] || 'units'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {m.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Issue to Department Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Issue Supplies to Department</h3>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
                {transferError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{transferError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Inventory Item *
                  </label>
                  <select
                    required
                    value={transferData.itemId}
                    onChange={(e) => setTransferData({ ...transferData, itemId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {items.map((it) => (
                      <option key={it._id || it.id} value={it._id || it.id}>
                        {it.name} ({it.itemCode}) — Avail: {it.stockOnHand} {it.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity to Issue *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={transferData.quantity}
                      onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Department *
                    </label>
                    <select
                      value={transferData.toDepartment}
                      onChange={(e) => setTransferData({ ...transferData, toDepartment: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      {HOSPITAL_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requisition Reason / Voucher Reference
                  </label>
                  <input
                    type="text"
                    value={transferData.reason}
                    onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                    placeholder="e.g. Daily ward replenishment requisition #REQ-889"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferSubmitting}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isTransferSubmitting ? 'Transferring...' : 'Confirm Stock Issue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {isAdjustmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Physical Stock Audit Adjustment</h3>
                </div>
                <button
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="p-5 space-y-4">
                {adjustmentError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{adjustmentError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Item to Adjust *
                  </label>
                  <select
                    required
                    value={adjustmentData.itemId}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, itemId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {items.map((it) => (
                      <option key={it._id || it.id} value={it._id || it.id}>
                        {it.name} ({it.itemCode}) — Avail: {it.stockOnHand} {it.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Adjustment Type *
                    </label>
                    <select
                      value={adjustmentData.type}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="loss">Loss / Spoilage / Damage</option>
                      <option value="gain">Surplus / Found Count</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={adjustmentData.quantity}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Justification / Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={adjustmentData.reason}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                    placeholder="e.g. Packaging water damaged during warehouse pipe inspection."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjustmentSubmitting}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isAdjustmentSubmitting ? 'Recording...' : 'Record Adjustment'}
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
