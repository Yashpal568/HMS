'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Truck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Calendar,
  Layers,
  Search,
  PlusCircle,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  GoodsReceipt,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@hms/types';
import { useCurrency } from '@/context/currency-context';

function GoodsReceiptContent() {
  const { symbol } = useCurrency();
  const searchParams = useSearchParams();
  const initialPoId = searchParams.get('poId') || '';

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>(initialPoId);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check-In Modal / Receiving Form State
  const [isCheckInOpen, setIsCheckInOpen] = useState(Boolean(initialPoId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [receiptLines, setReceiptLines] = useState<
    { itemId: string; quantityReceived: number; lotNumber: string; expiryDate: string }[]
  >([]);
  const [grnNotes, setGrnNotes] = useState('');

  const initReceiptLines = useCallback((po: PurchaseOrder) => {
    const lines = po.items
      .filter((i) => i.quantityReceived < i.quantityOrdered)
      .map((i) => ({
        itemId: (i.itemId as any)?._id || (i.itemId as any) || '',
        quantityReceived: i.quantityOrdered - i.quantityReceived,
        lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
    setReceiptLines(lines);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [receiptsRes, ordersRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: GoodsReceipt[] }>('/inventory/grn'),
        apiClient.get<{ success: boolean; data: PurchaseOrder[] }>('/inventory/purchase-orders'),
      ]);

      if (receiptsRes.success && receiptsRes.data) {
        setReceipts(receiptsRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        const eligible = ordersRes.data.filter(
          (o) =>
            o.status === PurchaseOrderStatus.APPROVED ||
            o.status === PurchaseOrderStatus.PARTIALLY_RECEIVED,
        );
        setApprovedOrders(eligible);

        // Pre-select PO if specified
        if (initialPoId) {
          const matched = eligible.find((o) => (o._id || o.id) === initialPoId);
          if (matched) {
            setSelectedPo(matched);
            initReceiptLines(matched);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load goods receipt data:', err);
      setError(err?.message || 'Error loading goods receipt workstation.');
    } finally {
      setIsLoading(false);
    }
  }, [initialPoId, initReceiptLines]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectPo = (poId: string) => {
    setSelectedPoId(poId);
    const po = approvedOrders.find((o) => (o._id || o.id) === poId);
    if (po) {
      setSelectedPo(po);
      initReceiptLines(po);
      setIsCheckInOpen(true);
    } else {
      setSelectedPo(null);
      setReceiptLines([]);
    }
  };

  const handleSubmitGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        poId: selectedPo._id || selectedPo.id,
        items: receiptLines,
        notes: grnNotes,
      };

      const res = await apiClient.post<{ success: boolean; data: GoodsReceipt }>(
        '/inventory/grn',
        payload,
      );

      if (res.success) {
        setIsCheckInOpen(false);
        setSelectedPo(null);
        setSelectedPoId('');
        setGrnNotes('');
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to submit GRN:', err);
      setFormError(err?.message || 'Error processing goods receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            Goods Receiving Note (GRN) Delivery Workstation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Check-in vendor deliveries against approved purchase orders, record manufacturer lot numbers and expiry dates, and update central stock on hand automatically.
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
        </div>
      </div>

      {/* PO Delivery Intake Selector Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Receive Shipment Against Approved Purchase Order
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Select an authorized purchase order to verify delivered quantities, inspect packaging, and log lot numbers.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
          <select
            value={selectedPoId}
            onChange={(e) => handleSelectPo(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">-- Choose Approved Purchase Order --</option>
            {approvedOrders.map((po) => (
              <option key={po._id || po.id} value={po._id || po.id}>
                {po.poNumber} — {(po.supplierId as any)?.name} ({symbol}{po.totalAmount}) [{po.status}]
              </option>
            ))}
          </select>

          {selectedPo && (
            <button
              onClick={() => setIsCheckInOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Open Delivery Worksheet</span>
            </button>
          )}
        </div>
      </div>

      {/* Delivery Check-In Modal */}
      {isCheckInOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-teal-800 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <h3 className="text-sm font-bold">Delivery Intake Check-In: {selectedPo.poNumber}</h3>
                </div>
                <span className="text-[11px] text-teal-200">
                  Vendor: {(selectedPo.supplierId as any)?.name}
                </span>
              </div>
              <button
                onClick={() => setIsCheckInOpen(false)}
                className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-700/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrn} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Shipment Line Items Reconciliation
                </h4>

                <div className="space-y-3">
                  {selectedPo.items.map((line, idx) => {
                    const remaining = line.quantityOrdered - line.quantityReceived;
                    const rLine = receiptLines[idx];
                    if (!rLine) return null;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {line.itemName || 'Medical Item'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Code: {line.itemCode || 'ITM'} • UOM: {line.uom || 'Unit'}
                            </span>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-slate-500 block">
                              Ordered: <span className="font-bold text-slate-800">{line.quantityOrdered}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Already Received: {line.quantityReceived} | Pending: <span className="font-bold text-teal-700">{remaining}</span>
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Quantity Receiving Now *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={remaining}
                              required
                              value={rLine.quantityReceived}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceiptLines((prev) => {
                                  const copy = [...prev];
                                  copy[idx].quantityReceived = val;
                                  return copy;
                                });
                              }}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Lot / Batch Number *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. LOT-GLV-991"
                              value={rLine.lotNumber}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReceiptLines((prev) => {
                                  const copy = [...prev];
                                  copy[idx].lotNumber = val;
                                  return copy;
                                });
                              }}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Manufacturer Expiry Date
                            </label>
                            <input
                              type="date"
                              value={rLine.expiryDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReceiptLines((prev) => {
                                  const copy = [...prev];
                                  copy[idx].expiryDate = val;
                                  return copy;
                                });
                              }}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving Inspection Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  placeholder="e.g. Clean delivery, seals intact. Placed into Central Store Shelf B-12."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? 'Confirming Delivery...' : 'Confirm Delivery & Update Stock on Hand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Goods Receipts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Goods Receiving Historical Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit record of verified delivery shipments, lot tracking, and stock-on-hand additions.
          </p>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
            Loading historical goods receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No goods receiving notes recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Select an approved PO above to log incoming shipments
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Received Items & Lot Details</th>
                  <th className="py-3 px-4">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {receipts.map((grn) => {
                  const po = grn.poId as PurchaseOrder;
                  const supplier = grn.supplierId as any;

                  return (
                    <tr key={grn._id || grn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-900">
                        {grn.grnNumber}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {po?.poNumber || 'PO-Direct'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-800">
                        {supplier?.name || 'Vendor'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {grn.items.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {line.itemName}
                              </span>
                              <span className="text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono font-medium">
                                +{line.quantityReceived} units
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Lot: {line.lotNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoodsReceiptPage() {
  return (
    <AppShell
      title="Goods Receiving Note (GRN)"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Goods Receiving (GRN)' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading goods receipt workstation...</div>}>
        <GoodsReceiptContent />
      </Suspense>
    </AppShell>
  );
}
