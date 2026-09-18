'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  FileText,
  Truck,
  ArrowRight,
  RefreshCw,
  TrendingDown,
  Building2,
  ArrowLeftRight,
  ShieldAlert,
  Boxes,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { InventoryDashboardMetrics, InventoryItem } from '@hms/types';
import { useCurrency } from '@/context/currency-context';

export default function InventoryDashboardPage() {
  const { formatCurrency } = useCurrency();
  const [metrics, setMetrics] = useState<InventoryDashboardMetrics | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, lowStockRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: InventoryDashboardMetrics }>('/inventory/dashboard'),
        apiClient.get<{ success: boolean; data: InventoryItem[] }>('/inventory/items?lowStock=true'),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (lowStockRes.success && lowStockRes.data) {
        setLowStockItems(lowStockRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load inventory dashboard:', err);
      setError(err?.message || 'Error loading central inventory operational metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <AppShell
      title="Inventory & Procurement"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Central Inventory Workstation' },
      ]}
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <Package className="h-4 w-4" />
              <span>Supply Chain & Procurement Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Central Inventory & Procurement
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage hospital consumables, purchase orders, goods receipt (GRN), and departmental stock distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <Link
              href="/inventory/items"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Boxes className="h-3.5 w-3.5 text-teal-600" />
              Item Master
            </Link>

            <Link
              href="/inventory/purchase-orders"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Purchase Orders
            </Link>
          </div>
        </div>

        {/* Operational Metrics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stock Valuation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Stock Valuation
              </span>
              <span className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Package className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(metrics?.totalValuation || 0)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across {metrics?.totalItemsCount ?? 0} registered item catalog entries
            </p>
          </div>

          {/* Critical Low Stock Alerts */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Low Safety Stock
              </span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {metrics?.lowStockCount ?? 0}
              </span>
              {(metrics?.lowStockCount ?? 0) > 0 && (
                <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                  Reorder Due
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.outOfStockCount ?? 0} stock items completely depleted
            </p>
          </div>

          {/* Active Purchase Orders */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Active Purchase Orders
              </span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {metrics?.activePurchaseOrdersCount ?? 0}
              </span>
              <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                In Procurement
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending vendor fulfillment or receipt</p>
          </div>

          {/* Recent Deliveries & Movements */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                7-Day Stock Activity
              </span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {metrics?.recentMovementsCount ?? 0}
              </span>
              <span className="text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                Movements
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">GRN receipts, transfers & adjustments</p>
          </div>
        </div>

        {/* Quick Access Module Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/inventory/items"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Boxes className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Item Master</h3>
                <p className="text-[11px] text-slate-500">Categories, UOMs, safety thresholds</p>
              </div>
            </div>
          </Link>

          <Link
            href="/inventory/suppliers"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Supplier Directory</h3>
                <p className="text-[11px] text-slate-500">Vendor contacts, GST & credit terms</p>
              </div>
            </div>
          </Link>

          <Link
            href="/inventory/grn"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Goods Receiving (GRN)</h3>
                <p className="text-[11px] text-slate-500">Lot check-in & automated stock update</p>
              </div>
            </div>
          </Link>

          <Link
            href="/inventory/transfers"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ArrowLeftRight className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Department Transfers</h3>
                <p className="text-[11px] text-slate-500">Sub-store issues & audit adjustments</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Critical Low-Stock Alerts Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Critical Safety Stock Alerts
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Consumables and surgical items at or below minimum threshold requiring replenishment.
              </p>
            </div>

            <Link
              href="/inventory/purchase-orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              <span>Manage All Purchase Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Scanning stock levels...
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">All Stock Levels Healthy</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                No items have crossed their minimum safety reorder thresholds.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Current Stock on Hand</th>
                    <th className="py-3 px-4">Reorder Threshold</th>
                    <th className="py-3 px-4">Stock Level Gauge</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lowStockItems.map((item) => {
                    const ratio = item.reorderLevel > 0 ? (item.stockOnHand / item.reorderLevel) * 100 : 100;
                    const percent = Math.min(Math.round(ratio), 100);

                    return (
                      <tr key={item._id || item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {item.itemCode}
                          </span>
                          <span className="font-bold text-slate-900 block text-xs">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            UOM: {item.uom}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-sm font-extrabold ${item.stockOnHand === 0 ? 'text-rose-600' : 'text-amber-700'}`}>
                            {item.stockOnHand} {item.uom}
                          </span>
                          {item.stockOnHand === 0 && (
                            <span className="block text-[10px] text-rose-600 font-bold uppercase">
                              Depleted
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          Min: <span className="font-bold text-slate-800">{item.reorderLevel}</span> (Suggested Reorder: {item.reorderQuantity || item.reorderLevel * 2})
                        </td>

                        <td className="py-3.5 px-4 w-44">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{percent}% threshold</span>
                              <span className="font-mono">{item.stockOnHand}/{item.reorderLevel}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.stockOnHand === 0
                                    ? 'bg-rose-600'
                                    : percent < 50
                                    ? 'bg-rose-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(percent, 5)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href="/inventory/purchase-orders"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs"
                          >
                            <span>Raise PO</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
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
    </AppShell>
  );
}
