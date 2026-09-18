'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Receipt,
  User,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  Patient,
  HospitalService,
  InvoiceItemType,
  UnbilledChargeItem,
  CreateInvoiceItemInput,
} from '@hms/types';
import { useCurrency } from '@/context/currency-context';

interface LineItemFormState {
  id: string;
  serviceId?: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRatePercent: number;
  referenceId?: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { formatCurrency, symbol } = useCurrency();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [tariffs, setTariffs] = useState<HospitalService[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [isScanningUnbilled, setIsScanningUnbilled] = useState(false);
  const [unbilledCharges, setUnbilledCharges] = useState<UnbilledChargeItem[]>([]);

  const [items, setItems] = useState<LineItemFormState[]>([
    {
      id: 'item-1',
      itemType: InvoiceItemType.CONSULTATION,
      description: 'Specialist OPD Consultation',
      quantity: 1,
      unitPrice: 500,
      discountAmount: 0,
      taxRatePercent: 0,
    },
  ]);

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load patients and tariffs
  useEffect(() => {
    async function loadData() {
      try {
        const [patientsRes, tariffsRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: Patient[] }>('/patients'),
          apiClient.get<{ success: boolean; data: HospitalService[] }>('/billing/tariffs'),
        ]);

        if (patientsRes.success && patientsRes.data) {
          setPatients(patientsRes.data);
          if (patientsRes.data.length > 0) {
            setSelectedPatientId(patientsRes.data[0]._id || patientsRes.data[0].id);
          }
        }

        if (tariffsRes.success && tariffsRes.data) {
          setTariffs(tariffsRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial invoice dependencies:', err);
      }
    }
    loadData();
  }, []);

  // Scan unbilled charges when patient selection changes
  const scanUnbilledCharges = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setIsScanningUnbilled(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: UnbilledChargeItem[] }>(
        `/billing/unbilled-charges/${patientId}`,
      );
      if (res.success && Array.isArray(res.data)) {
        setUnbilledCharges(res.data);
      } else {
        setUnbilledCharges([]);
      }
    } catch (err) {
      console.error('Error fetching unbilled charges:', err);
      setUnbilledCharges([]);
    } finally {
      setIsScanningUnbilled(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      scanUnbilledCharges(selectedPatientId);
    }
  }, [selectedPatientId, scanUnbilledCharges]);

  // Add tariff line item
  const handleAddTariff = (tariffId: string) => {
    const tariff = tariffs.find((t) => (t._id || t.id) === tariffId);
    if (!tariff) return;

    let itemType = InvoiceItemType.OTHER;
    if (tariff.category === 'consultation') itemType = InvoiceItemType.CONSULTATION;
    else if (tariff.category === 'bed_charge') itemType = InvoiceItemType.BED_CHARGE;
    else if (tariff.category === 'procedure') itemType = InvoiceItemType.PROCEDURE;
    else if (tariff.category === 'diagnostic') itemType = InvoiceItemType.DIAGNOSTIC;
    else if (tariff.category === 'nursing') itemType = InvoiceItemType.NURSING;

    const newItem: LineItemFormState = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      serviceId: tariff._id || tariff.id,
      itemType,
      description: tariff.name,
      quantity: 1,
      unitPrice: tariff.standardRate,
      discountAmount: 0,
      taxRatePercent: tariff.taxRatePercent || 0,
    };

    setItems((prev) => [...prev, newItem]);
  };

  // Import unbilled charge
  const handleImportUnbilledCharge = (charge: UnbilledChargeItem) => {
    const newItem: LineItemFormState = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemType: charge.itemType,
      description: charge.description,
      quantity: charge.quantity,
      unitPrice: charge.unitPrice,
      discountAmount: 0,
      taxRatePercent: 0,
      referenceId: charge.referenceId,
    };

    setItems((prev) => [...prev, newItem]);
    setUnbilledCharges((prev) => prev.filter((c) => c.referenceId !== charge.referenceId));
  };

  // Add blank custom item
  const handleAddBlankItem = () => {
    const newItem: LineItemFormState = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemType: InvoiceItemType.OTHER,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRatePercent: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update item field
  const updateItem = (id: string, updates: Partial<LineItemFormState>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const calculations = items.reduce(
    (acc, item) => {
      const gross = item.unitPrice * item.quantity;
      const discount = Math.min(gross, Math.max(0, item.discountAmount || 0));
      const taxable = gross - discount;
      const tax = (taxable * (item.taxRatePercent || 0)) / 100;
      const net = taxable + tax;

      acc.subtotal += gross;
      acc.discountTotal += discount;
      acc.taxTotal += tax;
      acc.grandTotal += net;
      return acc;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 },
  );

  // Submit invoice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setErrorMessage('Please select a patient for this invoice.');
      return;
    }

    if (items.some((i) => !i.description.trim())) {
      setErrorMessage('All line items must have a clear description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        patientId: selectedPatientId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          serviceId: i.serviceId,
          itemType: i.itemType,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountAmount: Number(i.discountAmount || 0),
          taxRatePercent: Number(i.taxRatePercent || 0),
          referenceId: i.referenceId,
        })),
      };

      const res = await apiClient.post<{ success: boolean; data: { _id: string; id?: string } }>(
        '/billing/invoices',
        payload,
      );

      if (res.success && res.data) {
        const invId = res.data._id || res.data.id;
        router.push(`/billing/invoices/${invId}`);
      }
    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      setErrorMessage(err?.message || 'Failed to create patient invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const raw = p as any;
    const name = raw.name ? `${raw.name.first || ''} ${raw.name.last || ''}`.toLowerCase() : `${raw.firstName || ''} ${raw.lastName || ''}`.toLowerCase();
    const uhid = p.uhid.toLowerCase();
    return name.includes(patientSearch.toLowerCase()) || uhid.includes(patientSearch.toLowerCase());
  });

  const selectedPatient = patients.find((p) => (p._id || p.id) === selectedPatientId) as any;

  return (
    <AppShell title="Create Patient Invoice">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/billing"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Generate Patient Invoice
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Itemize consultations, hospital tariffs, diagnostic tests, and medications
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Items Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Selection Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Select Patient
                </div>
                {selectedPatient && (
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                    {selectedPatient.uhid}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Patient Directory
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {patients.map((p) => {
                      const raw = p as any;
                      const pName = raw.name ? `${raw.name.first || ''} ${raw.name.last || ''}`.trim() : `${raw.firstName || ''} ${raw.lastName || ''}`.trim();
                      return (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {pName} ({p.uhid})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quick Filter Patient
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search by name or UHID..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {selectedPatient && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedPatient.name
                        ? `${selectedPatient.name.first || ''} ${selectedPatient.name.last || ''}`.trim()
                        : `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim()}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {selectedPatient.gender}, {selectedPatient.contacts?.phone || selectedPatient.phone || 'No Phone'}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Registered Patient • Scoped Hospital Record
                  </div>
                </div>
              )}
            </div>

            {/* Unbilled Charges Scanner Banner */}
            {unbilledCharges.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Unbilled Clinical Charges Detected ({unbilledCharges.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                    Click to auto-import into invoice
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unbilledCharges.map((charge) => (
                    <div
                      key={charge.referenceId}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="overflow-hidden">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {charge.description}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Qty: {charge.quantity} • {formatCurrency(charge.totalAmount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportUnbilledCharge(charge)}
                        className="px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-lg border border-amber-300 dark:border-amber-800/80 transition-colors whitespace-nowrap"
                      >
                        + Import
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items Editor */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Itemized Line Charges
                </div>

                {/* Quick Add from Tariff */}
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddTariff(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="" disabled>
                      + Add from Tariff Master...
                    </option>
                    {tariffs.map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name} ({formatCurrency(t.standardRate)})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddBlankItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Custom Item
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, index) => {
                  const gross = item.unitPrice * item.quantity;
                  const discount = Math.min(gross, Math.max(0, item.discountAmount || 0));
                  const taxable = gross - discount;
                  const tax = (taxable * (item.taxRatePercent || 0)) / 100;
                  const lineNet = taxable + tax;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400 mt-1.5">
                          #{index + 1}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1">
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Category
                            </label>
                            <select
                              value={item.itemType}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  itemType: e.target.value as InvoiceItemType,
                                })
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              <option value={InvoiceItemType.CONSULTATION}>Consultation</option>
                              <option value={InvoiceItemType.BED_CHARGE}>Bed & Room</option>
                              <option value={InvoiceItemType.DIAGNOSTIC}>Diagnostic / Lab</option>
                              <option value={InvoiceItemType.PHARMACY}>Pharmacy</option>
                              <option value={InvoiceItemType.PROCEDURE}>Procedure</option>
                              <option value={InvoiceItemType.NURSING}>Nursing</option>
                              <option value={InvoiceItemType.OTHER}>Other / Supply</option>
                            </select>
                          </div>

                          <div className="sm:col-span-9">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Service or medicine description..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                              required
                            />
                          </div>
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Number inputs: Quantity, Unit Price, Discount, Tax Rate */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Rate ({symbol.trim()})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Discount ({symbol.trim()})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discountAmount}
                            onChange={(e) =>
                              updateItem(item.id, { discountAmount: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Line Total ({symbol.trim()})
                          </label>
                          <div className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg text-right">
                            {formatCurrency(lineNet)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Invoice Summary Sidebar */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                Financial Breakdown
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Gross Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculations.subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Discount</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    - {formatCurrency(calculations.discountTotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Applicable Tax (GST/VAT)</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    + {formatCurrency(calculations.taxTotal)}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Net Grand Total
                  </span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(calculations.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Due Date & Billing Notes */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Notes / Reference
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter discharge notes, insurance pre-auth, or comments..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Generating Official Invoice...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Generate Invoice ({formatCurrency(calculations.grandTotal)})
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
