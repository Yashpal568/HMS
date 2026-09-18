'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ArrowLeft,
  PlusCircle,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Filter,
  Tag,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { InventoryCategory, InventoryItem } from '@hms/types';
import { useCurrency } from '@/context/currency-context';

export default function ItemMasterCatalogPage() {
  const { formatCurrency, symbol } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Register Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: InventoryCategory.CONSUMABLE,
    uom: 'Box of 50',
    reorderLevel: 20,
    reorderQuantity: 50,
    initialStock: 50,
    unitCost: 10.0,
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/inventory/items';
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (lowStockOnly) params.append('lowStock', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiClient.get<{ success: boolean; data: InventoryItem[] }>(url);
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load inventory items:', err);
      setError(err?.message || 'Error loading item catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, lowStockOnly, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRegisterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: InventoryItem }>(
        '/inventory/items',
        formData,
      );

      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          category: InventoryCategory.CONSUMABLE,
          uom: 'Box of 50',
          reorderLevel: 20,
          reorderQuantity: 50,
          initialStock: 50,
          unitCost: 10.0,
        });
        fetchItems();
      }
    } catch (err: any) {
      console.error('Failed to register item:', err);
      setModalError(err?.message || 'Error creating inventory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (category: InventoryCategory) => {
    switch (category) {
      case InventoryCategory.SURGICAL:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case InventoryCategory.REAGENT:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case InventoryCategory.LINEN:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case InventoryCategory.EQUIPMENT:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case InventoryCategory.CONSUMABLE:
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  return (
    <AppShell
      title="Item Master Catalog"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Item Master Catalog' },
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
              Item Master Catalog
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Standard central inventory formulary, categorized consumables, units of measurement, and safety reorder levels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchItems}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Register New Item
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium text-[11px] uppercase mr-1">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  selectedCategory === 'all'
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {Object.values(InventoryCategory).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize font-medium ${
                    selectedCategory === cat
                      ? 'bg-teal-700 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Low Stock Toggle */}
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                lowStockOnly
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Low Stock Alerts Only</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by code or product name (e.g. gloves, saline, mask)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Catalog Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading item catalog...
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No inventory items found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? 'Try clearing your search filters' : 'Register your first item to begin tracking stock'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4">Stock on Hand</th>
                    <th className="py-3 px-4">Safety Threshold</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item) => {
                    const isLow = item.stockOnHand <= item.reorderLevel;

                    return (
                      <tr key={item._id || item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.itemCode}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block text-xs">
                            {item.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${getCategoryBadge(
                              item.category,
                            )}`}
                          >
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {item.uom}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`text-sm font-extrabold ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                            {item.stockOnHand}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          Min: <span className="font-bold text-slate-700">{item.reorderLevel}</span> (Reorder: {item.reorderQuantity || item.reorderLevel * 2})
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {formatCurrency(item.unitCost || 0)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="h-3 w-3" />
                              Reorder Due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Register New Item Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Register New Inventory Item</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterItem} className="p-5 space-y-4">
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Name & Specifications *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sterile Surgical Gloves - Size 7.5"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryCategory })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none capitalize"
                    >
                      {Object.values(InventoryCategory).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unit of Measurement (UOM) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.uom}
                      onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                      placeholder="e.g. Box of 50, Piece, Roll"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reorder Safety Threshold *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Suggested Reorder Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorderQuantity}
                      onChange={(e) => setFormData({ ...formData, reorderQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Stock on Hand
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Unit Purchase Cost ({symbol.trim()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Register Item'}
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
