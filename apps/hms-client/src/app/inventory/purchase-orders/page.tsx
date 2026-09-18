'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Plus,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  InventoryItem,
} from '@hms/types';
import { useCurrency } from '@/context/currency-context';

function PurchaseOrdersContent() {
  const { formatCurrency, symbol } = useCurrency();
  const searchParams = useSearchParams();
  const initialSupplierId = searchParams.get('supplierId') || 'all';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(initialSupplierId);

  // Create PO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [poSupplierId, setPoSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<
    { itemId: string; quantityOrdered: number; unitPrice: number }[]
  >([
    { itemId: '', quantityOrdered: 10, unitPrice: 0 },
  ]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/inventory/purchase-orders';
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (selectedSupplierId !== 'all') params.append('supplierId', selectedSupplierId);
      if (params.toString()) url += `?${params.toString()}`;

      const [ordersRes, suppliersRes, itemsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: PurchaseOrder[] }>(url),
        apiClient.get<{ success: boolean; data: Supplier[] }>('/inventory/suppliers'),
        apiClient.get<{ success: boolean; data: InventoryItem[] }>('/inventory/items'),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(suppliersRes.data);
        if (suppliersRes.data.length > 0) {
          setPoSupplierId((prev) => prev || (suppliersRes.data[0]._id || suppliersRes.data[0].id));
        }
      }
      if (itemsRes.success && itemsRes.data) {
        setItems(itemsRes.data);
        if (itemsRes.data.length > 0) {
          setPoLines((prev) => {
            if (prev.length === 1 && !prev[0].itemId) {
              return [
                {
                  itemId: itemsRes.data[0]._id || itemsRes.data[0].id,
                  quantityOrdered: 10,
                  unitPrice: itemsRes.data[0].unitCost || 10,
                },
              ];
            }
            return prev;
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load purchase orders:', err);
      setError(err?.message || 'Error loading purchase orders.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedSupplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddLine = () => {
    const firstItem = items[0];
    setPoLines((prev) => [
      ...prev,
      {
        itemId: firstItem ? (firstItem._id || firstItem.id) : '',
        quantityOrdered: 10,
        unitPrice: firstItem?.unitCost || 10,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (poLines.length <= 1) return;
    setPoLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineItemChange = (idx: number, itemId: string) => {
    const item = items.find((it) => (it._id || it.id) === itemId);
    setPoLines((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        itemId,
        unitPrice: item?.unitCost || copy[idx].unitPrice || 10,
      };
      return copy;
    });
  };

  const handleLineQtyChange = (idx: number, quantityOrdered: number) => {
    setPoLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], quantityOrdered };
      return copy;
    });
  };

  const handleLinePriceChange = (idx: number, unitPrice: number) => {
    setPoLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], unitPrice };
      return copy;
    });
  };

  const calculatedTotal = poLines.reduce(
    (acc, line) => acc + (line.quantityOrdered || 0) * (line.unitPrice || 0),
    0,
  );

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: PurchaseOrder }>(
        '/inventory/purchase-orders',
        {
          supplierId: poSupplierId,
          items: poLines,
          notes: poNotes,
        },
      );

      if (res.success) {
        setIsCreateModalOpen(false);
        setPoNotes('');
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to create purchase order:', err);
      setModalError(err?.message || 'Error creating purchase order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePo = async (id: string) => {
    if (!window.confirm('Confirm administrative authorization for this Purchase Order?')) return;
    try {
      await apiClient.post(`/inventory/purchase-orders/${id}/approve`, {});
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve purchase order');
    }
  };

  const handleCancelPo = async (id: string) => {
    const reason = window.prompt('Specify reason for order cancellation:');
    if (reason === null) return;
    try {
      await apiClient.post(`/inventory/purchase-orders/${id}/cancel`, { reason });
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel purchase order');
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.SUBMITTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="h-3 w-3" />
            Submitted
          </span>
        );
      case PurchaseOrderStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="h-3 w-3" />
            Partially Received
          </span>
        );
      case PurchaseOrderStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Completed (Fulfilled)
          </span>
        );
      case PurchaseOrderStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      case PurchaseOrderStatus.DRAFT:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
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
            Purchase Orders & Procurement
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Requisition medical supplies, track multi-tier administrative approvals, and manage vendor deliveries.
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
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Raise Purchase Order
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium text-[11px] uppercase mr-1">Status:</span>
          {['all', 'submitted', 'approved', 'partially_received', 'completed', 'cancelled'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition-colors capitalize font-medium ${
                  statusFilter === st
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ),
          )}
        </div>

        {/* Supplier Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-medium">Vendor:</span>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s._id || s.id} value={s._id || s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No purchase orders found</p>
            <p className="text-xs text-slate-400 mt-1">
              Raise a new order to replenish low safety stock supplies
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Ordered Items & Fulfillment</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((po) => {
                  const supplier = po.supplierId as Supplier;
                  const canApprove =
                    po.status === PurchaseOrderStatus.SUBMITTED ||
                    po.status === PurchaseOrderStatus.DRAFT;
                  const canReceive =
                    po.status === PurchaseOrderStatus.APPROVED ||
                    po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED;
                  const canCancel =
                    po.status !== PurchaseOrderStatus.COMPLETED &&
                    po.status !== PurchaseOrderStatus.CANCELLED;

                  return (
                    <tr key={po._id || po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {po.poNumber}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {supplier?.name || 'Unknown Supplier'}
                        </span>
                        {supplier?.phone && (
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {supplier.phone}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {po.items.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="text-slate-800 font-semibold">
                                {line.itemName || 'Item'}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({line.quantityReceived} of {line.quantityOrdered} received)
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(po.totalAmount || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(po.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove && (
                            <button
                              onClick={() => handleApprovePo(po._id || po.id)}
                              className="px-2.5 py-1 rounded text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-2xs"
                            >
                              Approve
                            </button>
                          )}

                          {canReceive && (
                            <Link
                              href={`/inventory/grn?poId=${po._id || po.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs"
                            >
                              <Truck className="h-3 w-3" />
                              <span>Check-In GRN</span>
                            </Link>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => handleCancelPo(po._id || po.id)}
                              className="px-2 py-1 rounded text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raise Purchase Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Raise New Purchase Order</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-5 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Supplier / Vendor *
                </label>
                <select
                  required
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name} ({s.paymentTerms || 'Net 30'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Order Line Items ({poLines.length}) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {poLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-2"
                    >
                      <div className="flex-1 w-full">
                        <select
                          required
                          value={line.itemId}
                          onChange={(e) => handleLineItemChange(idx, e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {items.map((it) => (
                            <option key={it._id || it.id} value={it._id || it.id}>
                              {it.name} ({it.itemCode}) — Stock: {it.stockOnHand} {it.uom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-24">
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Qty"
                            value={line.quantityOrdered}
                            onChange={(e) => handleLineQtyChange(idx, parseInt(e.target.value) || 1)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder={`Rate (${symbol.trim()})`}
                            value={line.unitPrice}
                            onChange={(e) => handleLinePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-right font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="w-24 text-right font-mono font-bold text-xs text-slate-800">
                          {formatCurrency(((line.quantityOrdered || 0) * (line.unitPrice || 0)))}
                        </div>

                        {poLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-900">Total Purchase Commitment:</span>
                <span className="text-base font-extrabold font-mono text-teal-950">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes & Instructions
                </label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Urgent fulfillment for OT replenishment. Deliver to Central Medical Warehouse Gate 2."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Raising Order...' : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <AppShell
      title="Purchase Orders"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Purchase Orders' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading purchase orders...</div>}>
        <PurchaseOrdersContent />
      </Suspense>
    </AppShell>
  );
}
