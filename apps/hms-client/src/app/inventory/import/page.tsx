'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  Check,
  ShieldAlert,
  Download,
  Building2,
  FileCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImportStage, InventoryImportJob } from '@hms/types';

const SAMPLE_CSV = `Brand Name,Generic Name,Dosage Form,Strength,Category,Batch Number,Expiry Date,Quantity,Unit Cost,Unit Sale Price
Paracetamol 500mg,Paracetamol,TABLET,500mg,Analgesics,BATCH-2026-A,2028-12-31,1000,2.5,5.0
Amoxicillin 250mg,Amoxicillin,CAPSULE,250mg,Antibiotics,AMX-994,2027-06-30,500,4.0,8.5
Pantoprazole 40mg,Pantoprazole,TABLET,40mg,Antacids,PAN-112,2028-09-15,800,3.0,7.0
Ceftriaxone 1g Inj,Ceftriaxone,INJECTION,1g,Antibiotics,CEF-008,2027-11-20,200,45.0,90.0`;

export default function InventoryImportPage() {
  const [jobs, setJobs] = useState<InventoryImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<InventoryImportJob | null>(null);
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [fileName, setFileName] = useState('hospital_medicines_initial_stock.csv');
  const [isUploading, setIsUploading] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: InventoryImportJob[] }>(
        '/inventory-migration/imports',
      );
      if (res.success && res.data) {
        setJobs(res.data);
        if (!activeJob && res.data.length > 0) {
          setActiveJob(res.data[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load import jobs:', err);
    }
  }, [activeJob]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleUpload = async () => {
    if (!csvText.trim()) {
      setErrorMsg('Please paste or load valid CSV content.');
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: InventoryImportJob }>(
        '/inventory-migration/upload',
        {
          fileName,
          fileSizeBytes: new Blob([csvText]).size,
          csvContent: csvText,
        },
      );
      if (res.success && res.data) {
        setActiveJob(res.data);
        setMapping((res.data.columnMapping as unknown as Record<string, string>) || {});
        setSuccessMsg(`CSV uploaded successfully! ${res.data.totalRows} rows identified.`);
        fetchJobs();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload CSV file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!activeJob) return;
    setIsMapping(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: InventoryImportJob }>(
        `/inventory-migration/imports/${activeJob.id || (activeJob as any)._id}/map`,
        { mapping },
      );
      if (res.success && res.data) {
        setActiveJob(res.data);
        setSuccessMsg(
          `Mapping validated! ${res.data.validRowsCount} rows are ready for import approval.`,
        );
        fetchJobs();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to validate column mapping.');
    } finally {
      setIsMapping(false);
    }
  };

  const handleApprove = async () => {
    if (!activeJob) return;
    setIsApproving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: InventoryImportJob }>(
        `/inventory-migration/imports/${activeJob.id || (activeJob as any)._id}/approve`,
        {},
      );
      if (res.success && res.data) {
        setActiveJob(res.data);
        setSuccessMsg(
          `Import executed! ${res.data.importedRowsCount} medicine items and batches imported into system.`,
        );
        fetchJobs();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to approve and execute bulk import.');
    } finally {
      setIsApproving(false);
    }
  };

  const requiredFields = [
    { key: 'brandName', label: 'Brand Name *' },
    { key: 'genericName', label: 'Generic Name *' },
    { key: 'dosageForm', label: 'Dosage Form' },
    { key: 'strength', label: 'Strength' },
    { key: 'category', label: 'Category' },
    { key: 'batchNumber', label: 'Batch Number *' },
    { key: 'expiryDate', label: 'Expiry Date (YYYY-MM-DD) *' },
    { key: 'quantity', label: 'Opening Quantity *' },
    { key: 'unitCostPrice', label: 'Unit Cost Price' },
    { key: 'unitSalePrice', label: 'Unit Sale Price' },
  ];

  return (
    <AppShell
      title="Bulk Inventory Migration"
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Inventory', href: '/inventory' },
        { label: 'Bulk Migration Center' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Automated Data Onboarding Pipeline</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bulk Inventory & Medicine Migration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Seamlessly import 10,000+ to 50,000+ medicine master records, batches, and opening stock without manual data entry.
            </p>
          </div>

          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Inventory
          </Link>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 4-Step Pipeline Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              !activeJob ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Upload CSV</p>
              <p className="text-[11px] text-slate-500">File & headers analysis</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              activeJob?.stage === ImportStage.MAPPING
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-200'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Column Mapping</p>
              <p className="text-[11px] text-slate-500">Match hospital fields</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              activeJob?.stage === ImportStage.READY_FOR_APPROVAL
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-200'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Validate & Preview</p>
              <p className="text-[11px] text-slate-500">Error detection & count</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              activeJob?.stage === ImportStage.COMPLETED ||
              activeJob?.stage === ImportStage.COMPLETED_WITH_ERRORS
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              4
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Import & Ledger</p>
              <p className="text-[11px] text-slate-500">Stock balance records</p>
            </div>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Active Stage Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Upload or View Current */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-teal-600" />
                  <span>1. CSV Data Input</span>
                </h3>
                <span className="text-xs text-slate-400">RFC 4180 format</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Paste CSV Content (or use sample standard hospital inventory below)
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCsvText(SAMPLE_CSV)}
                  className="text-xs text-teal-700 hover:underline"
                >
                  Load Standard Sample Data
                </button>

                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Analyzing Columns...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                      Analyze & Detect Columns
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step 2: Mapping Configuration (when activeJob exists) */}
            {activeJob && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-teal-600" />
                    <span>2. Column Mapping & Validation</span>
                  </h3>
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    Stage: {activeJob.stage}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500">
                  Detected {activeJob.detectedColumns.length} columns in file. Map each required HMS field to your source column.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {requiredFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        {field.label}
                      </label>
                      <select
                        value={mapping[field.key] || ''}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        <option value="">-- Do Not Import / Not In File --</option>
                        {activeJob.detectedColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    onClick={handleSaveMapping}
                    disabled={isMapping}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs"
                  >
                    {isMapping ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Validating Data...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Save Mapping & Run Validation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Approval & Execution Card */}
            {activeJob && activeJob.validRowsCount > 0 && (
              <div className="bg-white rounded-xl border border-teal-200 bg-teal-50/20 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      3. Ready for Hospital Execution
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeJob.validRowsCount} valid medicine batches ready to be imported into live master inventory.
                    </p>
                  </div>

                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || activeJob.stage === ImportStage.COMPLETED}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs px-4"
                  >
                    {isApproving ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Importing Batches...
                      </>
                    ) : activeJob.stage === ImportStage.COMPLETED ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Completed ({activeJob.importedRowsCount} Imported)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Approve & Execute Import
                      </>
                    )}
                  </Button>
                </div>

                {/* Validation Summary Metrics */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Total Rows</span>
                    <p className="text-lg font-bold text-slate-900 font-mono">{activeJob.totalRows}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-teal-200">
                    <span className="text-[10px] uppercase text-teal-700 font-semibold">Valid Batches</span>
                    <p className="text-lg font-bold text-teal-700 font-mono">{activeJob.validRowsCount}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-200">
                    <span className="text-[10px] uppercase text-rose-700 font-semibold">Invalid / Errors</span>
                    <p className="text-lg font-bold text-rose-700 font-mono">{activeJob.invalidRowsCount}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Migration History */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Migration History</span>
                <button onClick={fetchJobs} className="text-slate-400 hover:text-slate-700">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </h3>

              {jobs.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No past migrations yet.</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((j) => (
                    <button
                      key={j.id || (j as any)._id}
                      onClick={() => {
                        setActiveJob(j);
                        setMapping((j.columnMapping as unknown as Record<string, string>) || {});
                      }}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                        (activeJob?.id || (activeJob as any)?._id) === (j.id || (j as any)._id)
                          ? 'border-teal-500 bg-teal-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="truncate max-w-[140px]">{j.fileName}</span>
                        <Badge
                          variant="outline"
                          className={
                            j.stage === ImportStage.COMPLETED
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }
                        >
                          {j.stage}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {j.totalRows} rows • {j.importedRowsCount} imported
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invariant Alert */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-2 text-xs">
              <span className="font-bold text-teal-400 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Zero Manual Typing Invariant
              </span>
              <p className="text-slate-400 leading-relaxed">
                Hospital staff should never manually type 10,000+ medicine master records. Automated column detection and asynchronous batch execution safely loads entire inventories in minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
