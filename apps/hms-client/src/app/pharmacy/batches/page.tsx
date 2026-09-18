'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  PlusCircle,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Pill,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { useCurrency } from '@/context/currency-context';

function BatchesLedgerContent() {
  const { symbol } = useCurrency();
  const searchParams = useSearchParams();
  const initialMedicineId = searchParams.get('medicineId') || '';

  const [batches, setBatches] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(initialMedicineId);
  const [alertFilter, setAlertFilter] = useState<'all' | 'near_expiry' | 'expired' | 'low_stock'>('all');

  // Receive Batch Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    medicineId: '',
    batchNumber: '',
    expiryDate: '',
    manufactureDate: '',
    initialQuantity: 100,
    unitCostPrice: 30,
    unitSalePrice: 50,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/pharmacy/batches';
      const params = new URLSearchParams();
      if (selectedMedicineId) params.append('medicineId', selectedMedicineId);
      if (alertFilter !== 'all') params.append('alert', alertFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [batchesRes, medsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>(url),
        apiClient.get<{ success: boolean; data: any[] }>('/pharmacy/medicines'),
      ]);

      if (batchesRes.success) {
        setBatches(batchesRes.data || []);
      }
      if (medsRes.success) {
        setMedicines(medsRes.data || []);
        if (!formData.medicineId && medsRes.data && medsRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, medicineId: medsRes.data[0]._id }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load batch stock ledger:', err);
      setError(err?.message || 'Error loading batch inventory.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMedicineId, alertFilter, formData.medicineId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/pharmacy/batches', {
        ...formData,
        initialQuantity: Number(formData.initialQuantity),
        unitCostPrice: Number(formData.unitCostPrice),
        unitSalePrice: Number(formData.unitSalePrice),
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setFormData((prev) => ({
          ...prev,
          batchNumber: '',
          expiryDate: '',
          manufactureDate: '',
          initialQuantity: 100,
        }));
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to create batch:', err);
      setModalError(err?.message || 'Error adding batch stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const medName = (b.medicineId?.brandName || '').toLowerCase();
      const batchNum = (b.batchNumber || '').toLowerCase();
      return medName.includes(q) || batchNum.includes(q);
    }
    return true;
  });

  const getExpiryBadge = (batch: any) => {
    if (batch.isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="h-3 w-3 text-rose-600" />
          EXPIRED ({Math.abs(batch.daysToExpiry)}d ago)
        </span>
      );
    }
    if (batch.isNearExpiry) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          NEAR EXPIRY ({batch.daysToExpiry}d left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        Valid ({batch.daysToExpiry}d left)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/pharmacy"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Pharmacy Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Batch Stock Ledger & Expiry Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            FEFO (First Expiry, First Out) batch inventory control, expiration monitoring, and unit stock balances.
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
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Receive Batch Stock
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium text-[11px] uppercase mr-1">Filter:</span>
          <button
            onClick={() => setAlertFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
              alertFilter === 'all'
                ? 'bg-teal-700 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Batches
          </button>
          <button
            onClick={() => setAlertFilter('near_expiry')}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
              alertFilter === 'near_expiry'
                ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Near Expiry (&lt; 60 Days)
          </button>
          <button
            onClick={() => setAlertFilter('expired')}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
              alertFilter === 'expired'
                ? 'bg-rose-700 text-white font-semibold shadow-2xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => setAlertFilter('low_stock')}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
              alertFilter === 'low_stock'
                ? 'bg-purple-700 text-white font-semibold shadow-2xs'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            Low Stock (&le; 20 units)
          </button>
        </div>

        {/* Medicine Dropdown & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMedicineId}
            onChange={(e) => setSelectedMedicineId(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="">All Medicines ({medicines.length})</option>
            {medicines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.brandName} ({m.strength})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch #..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading batch ledger...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-xs bg-rose-50/50">
              {error}
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No batches match filters</p>
              <p className="text-xs text-slate-500 mt-1">
                Receive new batch stock to replenish inventory.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Medicine Item</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Unit Pricing</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Expiry Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredBatches.map((b) => {
                  const med = b.medicineId;
                  const isLow = b.currentQuantity <= 20;

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{med?.brandName}</div>
                        <div className="text-[11px] text-teal-700 font-mono">
                          {med?.genericName} • {med?.strength}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {b.batchNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {b.currentQuantity} units
                          </span>
                          <span className="text-[11px] text-slate-400">/ {b.initialQuantity} init</span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] font-medium text-rose-600">Stock Running Low</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">MRP: {symbol}{b.unitSalePrice}</div>
                        <div className="text-[10px] text-slate-400">Cost: {symbol}{b.unitCostPrice || 0}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {new Date(b.expiryDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        {b.manufactureDate && (
                          <div className="text-[10px] text-slate-400">
                            Mfg: {new Date(b.manufactureDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">{getExpiryBadge(b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Receive Batch Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Receive Batch Stock</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Medicine *
                </label>
                <select
                  required
                  value={formData.medicineId}
                  onChange={(e) => setFormData({ ...formData, medicineId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="" disabled>Choose medication from catalog</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.brandName} — {m.genericName} ({m.strength})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. BATCH-2026-X1"
                    className="w-full text-xs font-mono uppercase px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Received Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.initialQuantity}
                    onChange={(e) => setFormData({ ...formData, initialQuantity: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Manufacture Date
                  </label>
                  <input
                    type="date"
                    value={formData.manufactureDate}
                    onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitCostPrice}
                    onChange={(e) => setFormData({ ...formData, unitCostPrice: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit MRP / Sale Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.unitSalePrice}
                    onChange={(e) => setFormData({ ...formData, unitSalePrice: Number(e.target.value) })}
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
                  {isSubmitting ? 'Recording...' : 'Record Batch Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchesLedgerPage() {
  return (
    <AppShell
      title="Batch Stock Ledger"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Pharmacy', href: '/pharmacy' },
        { label: 'Batch Stock Ledger' },
      ]}
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading batch ledger...</div>}>
        <BatchesLedgerContent />
      </Suspense>
    </AppShell>
  );
}
