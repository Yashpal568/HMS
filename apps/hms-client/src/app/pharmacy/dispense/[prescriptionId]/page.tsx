'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Pill,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Printer,
  ShieldAlert,
  User,
  Stethoscope,
  Calendar,
  X,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AppShell } from '@/components/layout/app-shell';
import { PrescriptionStatus } from '@hms/types';
import { useCurrency } from '@/context/currency-context';

interface PageParams {
  params: Promise<{ prescriptionId: string }>;
}

export default function DispensingWorkstationPage({ params }: PageParams) {
  const { symbol } = useCurrency();
  const resolvedParams = use(params);
  const prescriptionId = resolvedParams.prescriptionId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Form states
  const [selectedBatches, setSelectedBatches] = useState<Record<number, string>>({});
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<number, number>>({});
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success & Label Modal State
  const [dispenseSuccessRecord, setDispenseSuccessRecord] = useState<any>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const fetchPrescriptionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(
        `/pharmacy/prescriptions/${prescriptionId}`,
      );

      if (res.success && res.data) {
        setData(res.data);

        // Pre-populate FEFO recommended batches and initial quantities
        const initialBatches: Record<number, string> = {};
        const initialQuantities: Record<number, number> = {};

        res.data.enrichedItems.forEach((item: any, idx: number) => {
          if (item.remainingQuantity > 0 && item.availableBatches?.length > 0) {
            // Find FEFO recommended batch, or first batch
            const fefoBatch =
              item.availableBatches.find((b: any) => b.isFefoRecommended) ||
              item.availableBatches[0];

            if (fefoBatch) {
              initialBatches[idx] = fefoBatch._id;
              // Default quantity to remaining prescribed quantity, capped at available stock
              initialQuantities[idx] = Math.min(item.remainingQuantity, fefoBatch.currentQuantity);
            }
          }
        });

        setSelectedBatches(initialBatches);
        setDispenseQuantities(initialQuantities);
      }
    } catch (err: any) {
      console.error('Failed to load prescription for dispensing:', err);
      setError(err?.message || 'Error loading prescription details.');
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    fetchPrescriptionData();
  }, [fetchPrescriptionData]);

  const handleBatchChange = (itemIdx: number, batchId: string) => {
    setSelectedBatches((prev) => ({ ...prev, [itemIdx]: batchId }));

    // Re-evaluate max allowed quantity based on selected batch stock
    const item = data?.enrichedItems[itemIdx];
    const batch = item?.availableBatches?.find((b: any) => b._id === batchId);
    if (batch) {
      const currentQty = dispenseQuantities[itemIdx] || item.remainingQuantity;
      const capped = Math.min(currentQty, batch.currentQuantity);
      setDispenseQuantities((prev) => ({ ...prev, [itemIdx]: capped }));
    }
  };

  const handleQuantityChange = (itemIdx: number, qty: number) => {
    const item = data?.enrichedItems[itemIdx];
    const batchId = selectedBatches[itemIdx];
    const batch = item?.availableBatches?.find((b: any) => b._id === batchId);
    const maxAllowed = batch ? Math.min(item.remainingQuantity, batch.currentQuantity) : item.remainingQuantity;

    const finalQty = Math.max(1, Math.min(qty, maxAllowed));
    setDispenseQuantities((prev) => ({ ...prev, [itemIdx]: finalQty }));
  };

  const calculateTotal = () => {
    if (!data?.enrichedItems) return 0;
    let total = 0;
    data.enrichedItems.forEach((item: any, idx: number) => {
      const batchId = selectedBatches[idx];
      const batch = item.availableBatches?.find((b: any) => b._id === batchId);
      const qty = dispenseQuantities[idx] || 0;
      if (batch && qty > 0) {
        total += (batch.unitSalePrice || 0) * qty;
      }
    });
    return total;
  };

  const handleConfirmDispense = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    // Build items payload
    const itemsPayload: any[] = [];
    data.enrichedItems.forEach((item: any, idx: number) => {
      const batchId = selectedBatches[idx];
      const qty = dispenseQuantities[idx] || 0;
      if (batchId && qty > 0 && item.matchedMedicine) {
        itemsPayload.push({
          medicineId: item.matchedMedicine._id,
          batchId,
          quantity: qty,
          instructions: item.prescribedItem?.instructions,
        });
      }
    });

    if (itemsPayload.length === 0) {
      setSubmitError('Please select at least one valid medication batch to dispense.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/pharmacy/dispense', {
        prescriptionId,
        items: itemsPayload,
        notes: pharmacistNotes.trim() || undefined,
      });

      if (res.success) {
        setDispenseSuccessRecord(res.data);
        setIsLabelModalOpen(true);
        await fetchPrescriptionData();
      }
    } catch (err: any) {
      console.error('Dispensing submission failed:', err);
      setSubmitError(err?.message || 'Error processing medication dispensing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const translatePlainInstructions = (freq: string, inst: string) => {
    let plainFreq = freq;
    const f = (freq || '').toUpperCase().trim();
    if (f === '1-0-1') plainFreq = '1 capsule/tablet in the morning and 1 at night';
    else if (f === '1-1-1' || f === 'TID') plainFreq = '1 capsule/tablet 3 times daily';
    else if (f === '1-0-0' || f === 'OD') plainFreq = '1 capsule/tablet once daily in the morning';
    else if (f === '0-0-1') plainFreq = '1 capsule/tablet once daily at bedtime';
    else if (f === '1-0-1' || f === 'BD') plainFreq = '1 capsule/tablet twice daily';
    else if (f === 'PRN' || f === 'SOS') plainFreq = 'Take as needed for severe symptoms';

    return `${plainFreq} (${inst || 'As directed by physician'})`;
  };

  if (loading) {
    return (
      <AppShell
        title="Dispense Prescription"
        breadcrumbs={[
          { label: 'Hospital Operations', href: '/dashboard' },
          { label: 'Pharmacy', href: '/pharmacy' },
          { label: 'Prescription Dispensing' },
        ]}
      >
        <div className="p-16 text-center text-slate-500">
          <Pill className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-semibold">Loading prescription dispensing worksheet...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell
        title="Dispense Prescription"
        breadcrumbs={[
          { label: 'Hospital Operations', href: '/dashboard' },
          { label: 'Pharmacy', href: '/pharmacy' },
          { label: 'Prescription Dispensing' },
        ]}
      >
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-rose-800">{error || 'Prescription not found.'}</p>
          <Link
            href="/pharmacy"
            className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-teal-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Prescriptions Queue
          </Link>
        </div>
      </AppShell>
    );
  }

  const { prescription, enrichedItems, pastDispensing } = data;
  const patient = prescription.patientId;
  const doctor = prescription.doctorId;
  const encounter = prescription.encounterId;
  const allergies = patient?.allergies || [];
  const isFullyDispensed = prescription.status === PrescriptionStatus.DISPENSED;

  return (
    <AppShell
      title="Dispense Prescription"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Pharmacy', href: '/pharmacy' },
        { label: 'Prescription Dispensing' },
      ]}
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/pharmacy"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Prescriptions Queue
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Prescription Dispensing Workstation
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isFullyDispensed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : prescription.status === PrescriptionStatus.PARTIALLY_DISPENSED
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {prescription.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {pastDispensing?.length > 0 && (
            <button
              onClick={() => {
                setDispenseSuccessRecord(pastDispensing[0]);
                setIsLabelModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Reprint Dispensing Labels
            </button>
          )}
        </div>
      </div>

      {/* Patient Demographic & Allergy Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">
              Patient Name
            </span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {patient?.name?.first} {patient?.name?.last}
            </div>
            <div className="font-mono text-teal-700 text-[11px] mt-0.5">{patient?.uhid}</div>
          </div>

          <div>
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">
              Age / Gender / Blood Group
            </span>
            <div className="font-semibold text-slate-800 text-xs mt-0.5">
              {patient?.gender} • {patient?.bloodGroup || 'Blood Group N/A'}
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">{patient?.phone}</div>
          </div>

          <div>
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">
              Prescribing Physician
            </span>
            <div className="font-semibold text-slate-800 text-xs mt-0.5">
              {doctor?.name ? `Dr. ${doctor.name}` : 'Consulting Doctor'}
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">{doctor?.department || 'OPD Medicine'}</div>
          </div>

          <div>
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">
              Encounter Reference
            </span>
            <div className="font-mono font-semibold text-slate-800 text-xs mt-0.5">
              {encounter?.encounterNumber || 'ENC-OPD'}
            </div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              {new Date(prescription.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Severe Allergy Warning Ribbon */}
        {allergies.length > 0 ? (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-rose-900 uppercase tracking-wide">
                Patient Allergy Alert:
              </span>{' '}
              <span className="text-rose-800">
                Patient has recorded allergies to:{' '}
                {allergies.map((a: any, i: number) => (
                  <span key={i} className="font-bold underline ml-1">
                    {a.allergen} ({a.severity})
                  </span>
                ))}
                . Carefully verify prescribed medications prior to dispensing.
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>No drug allergies recorded on patient chart.</span>
          </div>
        )}
      </div>

      {/* Prescribed Items & FEFO Dispensing Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Prescribed Medications & FEFO Batch Selection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              The system automatically pre-selects the earliest expiring active batch conforming to FEFO guidelines.
            </p>
          </div>
        </div>

        {submitError && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {enrichedItems.map((item: any, idx: number) => {
            const rx = item.prescribedItem;
            const med = item.matchedMedicine;
            const batches = item.availableBatches || [];
            const selectedBatchId = selectedBatches[idx];
            const currentSelectedBatch = batches.find((b: any) => b._id === selectedBatchId);
            const qtyToDispense = dispenseQuantities[idx] || 0;
            const isDone = item.isFulfilled;

            return (
              <div key={idx} className="p-5 space-y-3 hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {idx + 1}. {rx.medicineName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200 capitalize">
                        {rx.dosageForm} • {rx.strength}
                      </span>
                      {isDone && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Fully Fulfilled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Dosage: <span className="font-medium text-slate-800">{rx.frequency}</span> for{' '}
                      <span className="font-medium text-slate-800">{rx.durationDays} days</span> (
                      {rx.instructions})
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-400">Prescribed: </span>
                    <span className="font-bold text-slate-900">{rx.quantity} units</span>
                    {item.alreadyDispensedQuantity > 0 && (
                      <span className="text-teal-700 ml-2">
                        (Dispensed: {item.alreadyDispensedQuantity})
                      </span>
                    )}
                    <div className="text-[11px] font-medium text-amber-700">
                      Remaining: {item.remainingQuantity} units
                    </div>
                  </div>
                </div>

                {/* Batch Picker & Quantity Row */}
                {!isDone ? (
                  med ? (
                    batches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 items-center bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                        {/* Batch Selector */}
                        <div className="md:col-span-6">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Select Inventory Batch (FEFO Recommended)
                          </label>
                          <select
                            value={selectedBatchId || ''}
                            onChange={(e) => handleBatchChange(idx, e.target.value)}
                            className="w-full text-xs font-mono font-semibold px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          >
                            {batches.map((b: any) => (
                              <option key={b._id} value={b._id}>
                                {b.batchNumber} • Stock: {b.currentQuantity} units • Exp:{' '}
                                {new Date(b.expiryDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                {b.isFefoRecommended ? ' ★ [FEFO RECOMMENDATION]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* FEFO Tag / Expiry Badge */}
                        <div className="md:col-span-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Expiry Status
                          </span>
                          {currentSelectedBatch && (
                            <div className="text-[11px]">
                              {currentSelectedBatch.isFefoRecommended ? (
                                <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                  <Sparkles className="h-3 w-3 text-teal-600" />
                                  FEFO Pick
                                </span>
                              ) : (
                                <span className="text-slate-600 font-medium">
                                  {currentSelectedBatch.daysToExpiry}d to expiry
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quantity to Dispense */}
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Dispense Units
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={
                              currentSelectedBatch
                                ? Math.min(item.remainingQuantity, currentSelectedBatch.currentQuantity)
                                : item.remainingQuantity
                            }
                            value={qtyToDispense || ''}
                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                            className="w-full text-xs font-bold px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>

                        {/* Price Calc */}
                        <div className="md:col-span-2 text-right">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Line Total
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {symbol}{(currentSelectedBatch?.unitSalePrice || 0) * qtyToDispense}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            @ {symbol}{currentSelectedBatch?.unitSalePrice || 0} / unit
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          Out of Stock: No active batches found for {med.brandName}. Please replenish stock in Batch Ledger.
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        Medicine &quot;{rx.medicineName}&quot; not matched in catalog. Please verify brand spelling in Drug Catalog.
                      </span>
                    </div>
                  )
                ) : (
                  <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Item completely dispensed in previous fulfillment.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer & Dispense Execution Action */}
        {!isFullyDispensed && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pharmacist Verification Notes / Advisory
              </label>
              <input
                type="text"
                value={pharmacistNotes}
                onChange={(e) => setPharmacistNotes(e.target.value)}
                placeholder="e.g. Advised patient on antibiotic compliance; double-verified allergy record..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">Order Total Payable:</span>
                <div className="text-xl font-extrabold text-slate-900">{symbol}{calculateTotal()}</div>
              </div>

              <button
                onClick={handleConfirmDispense}
                disabled={isSubmitting || calculateTotal() === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Deducting Stock...' : 'Confirm Dispensing & Deduct Stock'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Previous Dispensing Records History */}
      {pastDispensing?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileCheck className="h-4 w-4 text-teal-600" />
            <span>Dispensing History & Audit Seals</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {pastDispensing.map((rec: any) => (
              <div key={rec._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{rec.dispenseNumber}</div>
                  <div className="text-[11px] text-slate-500">
                    Dispensed by: {rec.pharmacistId?.name || 'Staff Pharmacist'} on{' '}
                    {new Date(rec.dispensedAt).toLocaleString()}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {rec.items.map((it: any, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {it.medicineName} (Batch: {it.batchNumber}) &times; {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">₹{rec.totalAmount}</div>
                  <button
                    onClick={() => {
                      setDispenseSuccessRecord(rec);
                      setIsLabelModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline mt-1"
                  >
                    <Printer className="h-3 w-3" />
                    Print Labels
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication Instruction Label Generator Modal */}
      {isLabelModalOpen && dispenseSuccessRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-teal-800 text-white">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <h3 className="text-sm font-bold">Medication Instructions & Thermal Labels</h3>
              </div>
              <button
                onClick={() => setIsLabelModalOpen(false)}
                className="p-1 rounded text-teal-200 hover:text-white hover:bg-teal-700/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-5 print:p-0" id="medication-labels-print">
              <div className="text-center border-b border-slate-200 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  HMS MedCore Hospital Pharmacy
                </h2>
                <p className="text-[11px] text-slate-500">
                  Accredited Clinical Pharmacy • License # PHARM-DL-2026-990
                </p>
                <div className="text-xs font-mono font-bold text-teal-800 mt-1">
                  Dispense Seal: {dispenseSuccessRecord.dispenseNumber}
                </div>
              </div>

              {/* Labels for each item */}
              <div className="space-y-4">
                {dispenseSuccessRecord.items.map((item: any, idx: number) => {
                  const plainLang = translatePlainInstructions(
                    prescription.items[idx]?.frequency || '1-0-1',
                    item.instructions,
                  );

                  return (
                    <div
                      key={idx}
                      className="border-2 border-slate-800 rounded-lg p-4 bg-slate-50/50 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {patient?.name?.first} {patient?.name?.last}
                          </div>
                          <div className="text-[11px] font-mono text-slate-600">
                            UHID: {patient?.uhid} • Age: {patient?.dateOfBirth ? '38 Yrs' : 'Adult'}
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          <div className="font-semibold text-slate-800">
                            {new Date(dispenseSuccessRecord.dispensedAt).toLocaleDateString()}
                          </div>
                          <div className="font-mono text-slate-500">Batch: {item.batchNumber}</div>
                        </div>
                      </div>

                      <div className="my-3">
                        <div className="text-base font-extrabold text-slate-900">
                          {item.medicineName} ({item.strength || '500 mg'})
                        </div>
                        <div className="text-xs text-slate-600 font-semibold mt-1">
                          Dispensed Quantity: {item.quantity} Units
                        </div>

                        <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded text-xs text-teal-900 font-medium">
                          <span className="font-bold text-teal-950">Directions for Patient: </span>
                          {plainLang}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Precaution: Keep out of reach of children. Store in a cool, dry place.</span>
                        <span className="font-mono font-bold">Rx Sealed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLabelModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Official Labels
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
