'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pill,
  ArrowLeft,
  PlusCircle,
  Search,
  RefreshCw,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { DosageForm, DrugSchedule } from '@hms/types';

export default function MedicinesCatalogPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');

  // Add Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    brandName: '',
    genericName: '',
    dosageForm: DosageForm.TABLET,
    strength: '',
    category: '',
    schedule: DrugSchedule.PRESCRIPTION,
    storageConditions: 'Store in a cool, dry place',
    minStockLevel: 50,
  });

  const fetchMedicines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/pharmacy/medicines');
      if (res.success) {
        setMedicines(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load medicines:', err);
      setError(err?.message || 'Error loading medication catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/pharmacy/medicines', {
        ...formData,
        minStockLevel: Number(formData.minStockLevel),
      });

      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          brandName: '',
          genericName: '',
          dosageForm: DosageForm.TABLET,
          strength: '',
          category: '',
          schedule: DrugSchedule.PRESCRIPTION,
          storageConditions: 'Store in a cool, dry place',
          minStockLevel: 50,
        });
        await fetchMedicines();
      }
    } catch (err: any) {
      console.error('Failed to create medicine:', err);
      setModalError(err?.message || 'Error registering new medicine in catalog.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    if (selectedSchedule !== 'all' && m.schedule !== selectedSchedule) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.brandName.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getScheduleBadge = (schedule: DrugSchedule) => {
    switch (schedule) {
      case DrugSchedule.NARCOTIC:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Narcotic / Controlled
          </span>
        );
      case DrugSchedule.SCHEDULE_H:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Schedule H
          </span>
        );
      case DrugSchedule.PRESCRIPTION:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Rx Prescription
          </span>
        );
      case DrugSchedule.OTC:
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            OTC
          </span>
        );
    }
  };

  return (
    <AppShell
      title="Drug Master Catalog"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Pharmacy', href: '/pharmacy' },
        { label: 'Drug Master Catalog' },
      ]}
    >
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
            Drug Master Formulary & Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard hospital drug database with generic compositions, dosage strengths, drug schedules, and storage guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMedicines}
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
            Add Medicine Master
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Schedule Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium text-[11px] uppercase mr-1">Schedule:</span>
          {['all', 'otc', 'prescription', 'schedule_h', 'narcotic'].map((sch) => (
            <button
              key={sch}
              onClick={() => setSelectedSchedule(sch)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors font-medium ${
                selectedSchedule === sch
                  ? 'bg-teal-700 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sch.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, generic name, category..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-full sm:w-72"
          />
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading medicine catalog...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600 text-xs bg-rose-50/50">
              {error}
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No medicines found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search criteria or add a new medicine to the hospital catalog.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Brand & Generic Name</th>
                  <th className="py-3 px-4">Dosage Form & Strength</th>
                  <th className="py-3 px-4">Therapeutic Category</th>
                  <th className="py-3 px-4">Schedule Category</th>
                  <th className="py-3 px-4">Current Stock / Min Level</th>
                  <th className="py-3 px-4">Storage Guidelines</th>
                  <th className="py-3 px-4 text-right">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredMedicines.map((m) => {
                  const isLow = m.isLowStock;
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{m.brandName}</div>
                        <div className="text-[11px] text-teal-700 font-mono mt-0.5">{m.genericName}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 capitalize">{m.dosageForm}</div>
                        <div className="text-slate-500 text-[11px]">{m.strength}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {m.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">{getScheduleBadge(m.schedule)}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {m.totalStock ?? 0} units
                          </span>
                          {isLow && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">Min Alert: {m.minStockLevel}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {m.storageConditions || 'Standard room temperature'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/pharmacy/batches?medicineId=${m._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <Layers className="h-3 w-3 text-teal-600" />
                          <span>{m.activeBatchesCount || 0} Batches</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Medicine Master Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                  <Pill className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Medicine Master</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g. Augmentin 625"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Generic Composition *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Amoxicillin + Clavulanic Acid"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Dosage Form *
                  </label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value as DosageForm })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none capitalize"
                  >
                    {Object.values(DosageForm).map((form) => (
                      <option key={form} value={form} className="capitalize">
                        {form}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Strength / Concentration *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g. 500 mg or 10 mg/5ml"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Therapeutic Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Antibiotic, Analgesic"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Drug Schedule *
                  </label>
                  <select
                    value={formData.schedule}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value as DrugSchedule })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value={DrugSchedule.OTC}>Over The Counter (OTC)</option>
                    <option value={DrugSchedule.PRESCRIPTION}>Prescription Only (Rx)</option>
                    <option value={DrugSchedule.SCHEDULE_H}>Schedule H Prescription</option>
                    <option value={DrugSchedule.NARCOTIC}>Narcotic / Controlled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Min Stock Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Storage Guidelines
                  </label>
                  <input
                    type="text"
                    value={formData.storageConditions}
                    onChange={(e) => setFormData({ ...formData, storageConditions: e.target.value })}
                    placeholder="e.g. Store below 25°C"
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
                  {isSubmitting ? 'Saving...' : 'Register Medicine'}
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
