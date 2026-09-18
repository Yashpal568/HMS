'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  ClipboardList,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Microscope,
  Check,
  X,
  FileCheck2,
  Barcode,
  Save,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  LabOrderStatus,
  LabOrderPriority,
  LabResultFlag,
} from '@hms/types';

export default function LaboratoryWorklistPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active worklist tab: 'phlebotomy' (ordered) vs 'testing' (sample_collected / in_process)
  const [activeTab, setActiveTab] = useState<'phlebotomy' | 'testing'>('phlebotomy');
  const [searchQuery, setSearchQuery] = useState('');

  // Specimen Collection Modal State
  const [collectingOrder, setCollectingOrder] = useState<any | null>(null);
  const [containerType, setContainerType] = useState('EDTA Vacutainer (Lavender)');
  const [phlebotomyNotes, setPhlebotomyNotes] = useState('');
  const [isCollecting, setIsCollecting] = useState(false);

  // Result Entry Modal State
  const [testingOrder, setTestingOrder] = useState<any | null>(null);
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [isSubmittingResults, setIsSubmittingResults] = useState(false);
  const [resultModalError, setResultModalError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/lab/orders');
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load lab worklist:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to hospital server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Orders filtered by tab
  const phlebotomyQueue = orders.filter((o) => o.status === LabOrderStatus.ORDERED);
  const benchQueue = orders.filter(
    (o) =>
      o.status === LabOrderStatus.SAMPLE_COLLECTED ||
      o.status === LabOrderStatus.IN_PROCESS ||
      o.status === LabOrderStatus.RESULT_ENTERED,
  );

  const currentList = activeTab === 'phlebotomy' ? phlebotomyQueue : benchQueue;

  const filteredOrders = currentList.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orderNum = (order.orderNumber || '').toLowerCase();
    const accession = (order.accessionNumber || '').toLowerCase();
    const patientName = order.patientId?.name
      ? `${order.patientId.name.first} ${order.patientId.name.last}`.toLowerCase()
      : '';
    const patientUhid = (order.patientId?.uhid || '').toLowerCase();

    return (
      orderNum.includes(q) ||
      accession.includes(q) ||
      patientName.includes(q) ||
      patientUhid.includes(q)
    );
  });

  // Handle Specimen Collection submission
  const handleConfirmCollection = async () => {
    if (!collectingOrder) return;
    setIsCollecting(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/lab/orders/${collectingOrder._id || collectingOrder.id}/sample`,
        {
          containerType,
          phlebotomistNotes: phlebotomyNotes.trim() || undefined,
        },
      );

      if (res.success) {
        setCollectingOrder(null);
        setPhlebotomyNotes('');
        await fetchOrders();
        // Switch to testing tab to see the order ready for bench results
        setActiveTab('testing');
      }
    } catch (err: any) {
      console.error('Failed to collect sample:', err);
      alert(err?.message || 'Error recording sample collection.');
    } finally {
      setIsCollecting(false);
    }
  };

  // Open Result Entry modal
  const handleOpenResultEntry = (order: any) => {
    setTestingOrder(order);
    setResultModalError(null);
    setTechnicianNotes(order.technicianNotes || '');

    // Pre-populate any existing results
    const initial: Record<string, string> = {};
    if (order.results && order.results.length > 0) {
      order.results.forEach((r: any) => {
        const testId = r.testId?._id || r.testId;
        initial[`${testId}_${r.parameterName}`] = r.value;
      });
    }
    setResultValues(initial);
  };

  // Compute live flag for input
  const getParamFlag = (valStr: string, param: any): LabResultFlag => {
    const num = parseFloat(valStr?.trim() || '');
    if (isNaN(num)) return LabResultFlag.NORMAL;

    if (param.criticalLow !== undefined && num < param.criticalLow) {
      return LabResultFlag.CRITICAL;
    }
    if (param.criticalHigh !== undefined && num > param.criticalHigh) {
      return LabResultFlag.CRITICAL;
    }
    if (param.referenceMin !== undefined && num < param.referenceMin) {
      return LabResultFlag.LOW;
    }
    if (param.referenceMax !== undefined && num > param.referenceMax) {
      return LabResultFlag.HIGH;
    }
    return LabResultFlag.NORMAL;
  };

  // Handle Result Entry submission
  const handleSaveResults = async () => {
    if (!testingOrder) return;

    // Collect all parameters
    const resultsPayload: { testId: string; parameterName: string; value: string }[] = [];

    const tests = testingOrder.testIds || [];
    for (const test of tests) {
      const tId = test._id || test.id;
      for (const param of test.parameters || []) {
        const val = resultValues[`${tId}_${param.name}`];
        if (val !== undefined && val.trim() !== '') {
          resultsPayload.push({
            testId: tId,
            parameterName: param.name,
            value: val.trim(),
          });
        }
      }
    }

    if (resultsPayload.length === 0) {
      setResultModalError('Please enter measured values for at least one parameter.');
      return;
    }

    setIsSubmittingResults(true);
    setResultModalError(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/lab/orders/${testingOrder._id || testingOrder.id}/results`,
        {
          results: resultsPayload,
          technicianNotes: technicianNotes.trim() || undefined,
        },
      );

      if (res.success) {
        setTestingOrder(null);
        await fetchOrders();
      }
    } catch (err: any) {
      console.error('Failed to save lab results:', err);
      setResultModalError(err?.message || 'Error saving laboratory results.');
    } finally {
      setIsSubmittingResults(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Laboratory', href: '/laboratory' },
        { label: 'Technician Worklist' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/laboratory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-teal-600" />
              Technician & Phlebotomy Worklist
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bench worksheet for specimen accessioning, tube container assignment, and parameter value entry with real-time flag evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Workbench Queue Switcher Tabs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('phlebotomy')}
            className={`flex-1 p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'phlebotomy'
                ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                  activeTab === 'phlebotomy'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Phlebotomy Bench
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Pending Specimen Collection
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {phlebotomyQueue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testing')}
            className={`flex-1 p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
              activeTab === 'testing'
                ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                  activeTab === 'testing'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Microscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Analytical Bench
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Testing & Result Entry
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
              {benchQueue.length}
            </span>
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter current worklist by patient, UHID, or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Worklist Orders List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Order / Requisition</th>
                  <th className="py-3 px-4">Patient Information</th>
                  <th className="py-3 px-4">Requested Panels</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Accession Barcode</th>
                  <th className="py-3 px-4">Bench Status</th>
                  <th className="py-3 px-4 text-right">Worksheet Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                        <span>Loading technician worklist...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2" />
                        <span className="font-semibold text-slate-700">
                          {activeTab === 'phlebotomy'
                            ? 'All specimen collection requisitions cleared!'
                            : 'All bench tests completed! No pending result entry.'}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          New orders will appear automatically as clinicians submit requisitions.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const patient = order.patientId;
                    const tests = order.testIds || [];

                    return (
                      <tr key={order._id || order.id} className="hover:bg-slate-50/50">
                        {/* Order info */}
                        <td className="py-3.5 px-4 font-medium">
                          <span className="font-mono font-bold text-teal-700 block">
                            {order.orderNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* Patient info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {patient?.name?.first} {patient?.name?.last}
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                            <span>{patient?.uhid}</span>
                            <span>•</span>
                            <span className="capitalize">{patient?.gender}</span>
                          </div>
                        </td>

                        {/* Tests */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {tests.map((t: any) => (
                              <span
                                key={t._id || t.code}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {t.code}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4">
                          {order.priority === LabOrderPriority.STAT ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              STAT
                            </span>
                          ) : order.priority === LabOrderPriority.URGENT ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Urgent
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Routine</span>
                          )}
                        </td>

                        {/* Accession Barcode */}
                        <td className="py-3.5 px-4">
                          {order.accessionNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-50 text-slate-800 border border-slate-300">
                              <Barcode className="w-3.5 h-3.5 text-slate-500" />
                              <span>{order.accessionNumber}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Pending Draw</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-slate-700 capitalize">
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          {order.status === LabOrderStatus.ORDERED ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCollectingOrder(order);
                                setContainerType(tests[0]?.specimenType || 'EDTA Vacutainer (Lavender)');
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-xs"
                            >
                              Collect Specimen &rarr;
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenResultEntry(order)}
                                className="px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-xs"
                              >
                                {order.status === LabOrderStatus.RESULT_ENTERED
                                  ? 'Edit Results'
                                  : 'Enter Results'} &rarr;
                              </button>

                              <Link href={`/laboratory/reports/${order._id || order.id}`}>
                                <button
                                  type="button"
                                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors"
                                >
                                  Report
                                </button>
                              </Link>
                            </div>
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

        {/* Modal 1: Phlebotomy Specimen Collection */}
        {collectingOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Record Specimen Collection
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Order: {collectingOrder.orderNumber}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectingOrder(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Banner */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Patient
                </span>
                <strong className="text-slate-800">
                  {collectingOrder.patientId?.name?.first} {collectingOrder.patientId?.name?.last}
                </strong>{' '}
                <span className="text-slate-500 font-mono">
                  ({collectingOrder.patientId?.uhid})
                </span>
              </div>

              {/* Container / Tube Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Container / Tube Type *
                </label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Venous Blood (EDTA Vacutainer - Lavender Top)">
                    Venous Blood (EDTA Vacutainer - Lavender Top)
                  </option>
                  <option value="Serum (Clot Activator / SST - Yellow/Gold Top)">
                    Serum (Clot Activator / SST - Yellow/Gold Top)
                  </option>
                  <option value="Plasma (Sodium Citrate - Light Blue Top)">
                    Plasma (Sodium Citrate - Light Blue Top)
                  </option>
                  <option value="Blood (Sodium Fluoride / Potassium Oxalate - Gray Top)">
                    Blood (Sodium Fluoride / Potassium Oxalate - Gray Top)
                  </option>
                  <option value="Plain Serum (Red Top No Additive)">
                    Plain Serum (Red Top No Additive)
                  </option>
                  <option value="Clean Catch Midstream Urine Container">
                    Clean Catch Midstream Urine Container
                  </option>
                  <option value="Sterile Sputum Container">
                    Sterile Sputum Container
                  </option>
                </select>
              </div>

              {/* Phlebotomy Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phlebotomy Collection Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Left antecubital vein, fast flow, 4ml drawn..."
                  value={phlebotomyNotes}
                  onChange={(e) => setPhlebotomyNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  System will automatically assign a unique accession barcode number (
                  <strong className="font-mono">ACC-2026-XXXXX</strong>) on confirmation.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCollection}
                  disabled={isCollecting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  {isCollecting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Generate Accession & Confirm</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Bench Result Entry Workbench */}
        {testingOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Microscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Laboratory Bench Result Entry
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                      <span>Order: {testingOrder.orderNumber}</span>
                      <span>•</span>
                      <span className="font-bold text-teal-700">
                        {testingOrder.accessionNumber || 'ACC-2026-XXXXX'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTestingOrder(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Patient Banner */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Patient Details
                  </span>
                  <span className="font-bold text-slate-900">
                    {testingOrder.patientId?.name?.first} {testingOrder.patientId?.name?.last}
                  </span>{' '}
                  <span className="text-slate-500 font-mono">
                    ({testingOrder.patientId?.uhid})
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-500">
                  <span>Specimen: {testingOrder.containerType || 'Venous Blood'}</span>
                </div>
              </div>

              {/* Modal Error */}
              {resultModalError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resultModalError}</span>
                </div>
              )}

              {/* Parameter Input Matrix */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {(testingOrder.testIds || []).map((test: any) => {
                  const tId = test._id || test.id;

                  return (
                    <div
                      key={tId}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {test.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                            {test.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {test.category}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {(test.parameters || []).map((param: any, pIdx: number) => {
                          const key = `${tId}_${param.name}`;
                          const currentVal = resultValues[key] || '';
                          const flag = getParamFlag(currentVal, param);

                          return (
                            <div
                              key={pIdx}
                              className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              {/* Parameter Name & Range */}
                              <div className="flex-1">
                                <span className="font-bold text-slate-800 block">
                                  {param.name}
                                </span>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  Ref:{' '}
                                  {param.referenceMin !== undefined && param.referenceMax !== undefined
                                    ? `${param.referenceMin} - ${param.referenceMax} ${param.unit}`
                                    : 'Qualitative'}
                                </div>
                              </div>

                              {/* Value Input */}
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Enter value"
                                    value={currentVal}
                                    onChange={(e) =>
                                      setResultValues((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    className="w-28 text-xs font-mono font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 w-12">
                                  {param.unit}
                                </span>

                                {/* Real-time Flag Badge */}
                                <div className="w-20 text-center">
                                  {currentVal.trim() ? (
                                    flag === LabResultFlag.CRITICAL ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                        CRITICAL
                                      </span>
                                    ) : flag === LabResultFlag.HIGH ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        HIGH
                                      </span>
                                    ) : flag === LabResultFlag.LOW ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                        LOW
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        NORMAL
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[11px] text-slate-300 font-mono">-</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Technician Observation Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technician Bench Notes (Microscopy observations, specimen clarity, etc.)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter bench findings or analyzer calibration remarks..."
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveResults}
                  disabled={isSubmittingResults}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  {isSubmittingResults ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Route to Pathologist</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
