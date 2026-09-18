'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Barcode,
  RefreshCw,
  Lock,
  Building2,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import {
  LabOrderStatus,
  LabOrderPriority,
  LabResultFlag,
} from '@hms/types';

export default function DiagnosticReportPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pathologist Sign-Off Form
  const [remarks, setRemarks] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(
        `/lab/orders/${orderId}`,
      );
      if (res.success && res.data) {
        setOrder(res.data);
        setRemarks(res.data.pathologistRemarks || '');
      } else {
        setError('Laboratory report not found.');
      }
    } catch (err: any) {
      console.error('Failed to load lab report:', err);
      setError(err?.message || 'Unable to retrieve laboratory report.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleVerify = async () => {
    setIsSigning(true);
    setSignError(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/lab/orders/${orderId}/verify`,
        {
          pathologistRemarks: remarks.trim() || undefined,
        },
      );
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (err: any) {
      console.error('Failed to verify lab report:', err);
      setSignError(err?.message || 'Verification failed.');
    } finally {
      setIsSigning(false);
    }
  };

  const hasCritical =
    order?.results?.some((r: any) => r.flag === LabResultFlag.CRITICAL) ?? false;

  const isVerified = order?.status === LabOrderStatus.VERIFIED;

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Laboratory', href: '/laboratory' },
        { label: order ? `Report ${order.orderNumber}` : 'Diagnostic Report' },
      ]}
    >
      <div className="space-y-6">
        {/* Screen Action Bar (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <Link
            href="/laboratory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Laboratory Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Official Diagnostic Report</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
            <span className="font-semibold text-slate-700">
              Retrieving Diagnostic Laboratory Report...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-700 shadow-xs max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-900">Report Unavailable</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
            <Link href="/laboratory">
              <button
                type="button"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Return to Laboratory Registry
              </button>
            </Link>
          </div>
        )}

        {/* Loaded Diagnostic Report Document */}
        {order && !isLoading && (
          <div className="space-y-6">
            {/* The Formal Report Card (Printable) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 text-slate-800 print:border-none print:shadow-none print:p-0">
              {/* Hospital Diagnostic Letterhead Header */}
              <div className="pb-6 border-b-2 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      HMS MedCore Diagnostics & Pathology
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Accredited Clinical Pathology & Diagnostic Services • ISO 15189 / NABL Certified
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <div className="font-mono text-sm font-bold text-teal-700">
                    {order.orderNumber}
                  </div>
                  <div className="flex items-center sm:justify-end gap-1.5 font-mono text-[11px] text-slate-500 mt-0.5">
                    <Barcode className="w-3.5 h-3.5" />
                    <span>Accession: {order.accessionNumber || 'ACC-PENDING'}</span>
                  </div>
                </div>
              </div>

              {/* Patient Demographic & Requisition Metadata Grid */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Patient Name
                  </span>
                  <strong className="text-slate-900 text-sm">
                    {order.patientId?.name?.first} {order.patientId?.name?.last}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Patient UHID
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {order.patientId?.uhid}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Gender / Age
                  </span>
                  <span className="capitalize font-semibold text-slate-800">
                    {order.patientId?.gender || '-'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Blood Group
                  </span>
                  <span className="font-bold text-rose-600">
                    {order.patientId?.bloodGroup && order.patientId.bloodGroup !== 'unknown'
                      ? order.patientId.bloodGroup
                      : 'Not Tested'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Referring Doctor
                  </span>
                  <span className="font-semibold text-slate-800">
                    Dr. {order.doctorId?.name || 'Attending Physician'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Requisition Date
                  </span>
                  <span className="text-slate-700">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Specimen Drawn
                  </span>
                  <span className="text-slate-700">
                    {order.sampleCollectedAt
                      ? new Date(order.sampleCollectedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Pending Draw'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Report Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      isVerified ? 'text-emerald-700' : 'text-purple-700'
                    }`}
                  >
                    {isVerified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>VERIFIED</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="capitalize">{order.status.replace('_', ' ')}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Critical Value Alert Banner */}
              {hasCritical && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-3.5 flex items-center gap-3 text-xs text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                  <div>
                    <span className="font-bold block uppercase tracking-wide">
                      Critical Lab Alert (Physician Notification Mandatory)
                    </span>
                    <span>
                      One or more tested parameters deviate significantly into critical panic limits. Immediate clinical correlation and therapeutic action indicated.
                    </span>
                  </div>
                </div>
              )}

              {/* Structured Test Results Table */}
              <div className="space-y-6">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Test Investigation / Parameter</th>
                        <th className="py-3 px-4 text-right">Measured Value</th>
                        <th className="py-3 px-4">Standard Unit</th>
                        <th className="py-3 px-4">Normal Biological Reference</th>
                        <th className="py-3 px-4 text-center">Diagnostic Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!order.results || order.results.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            No bench parameter results entered yet. Specimen is pending analysis.
                          </td>
                        </tr>
                      ) : (
                        order.results.map((res: any, idx: number) => {
                          const isHigh = res.flag === LabResultFlag.HIGH;
                          const isLow = res.flag === LabResultFlag.LOW;
                          const isCrit = res.flag === LabResultFlag.CRITICAL;

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/50 ${
                                isCrit
                                  ? 'bg-rose-50/60 font-semibold'
                                  : isHigh || isLow
                                  ? 'bg-amber-50/30'
                                  : ''
                              }`}
                            >
                              {/* Parameter Name */}
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {res.parameterName}
                              </td>

                              {/* Value */}
                              <td className="py-3 px-4 text-right font-mono text-sm font-bold">
                                <span
                                  className={
                                    isCrit
                                      ? 'text-rose-700 underline font-black'
                                      : isHigh
                                      ? 'text-amber-700 font-bold'
                                      : isLow
                                      ? 'text-blue-700 font-bold'
                                      : 'text-slate-900'
                                  }
                                >
                                  {res.value}
                                </span>
                              </td>

                              {/* Unit */}
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {res.unit || '-'}
                              </td>

                              {/* Reference Range */}
                              <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                {res.referenceRange || 'Descriptive'}
                              </td>

                              {/* Flag */}
                              <td className="py-3 px-4 text-center">
                                {isCrit ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                    CRITICAL
                                  </span>
                                ) : isHigh ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    HIGH
                                  </span>
                                ) : isLow ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                    LOW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    NORMAL
                                  </span>
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

              {/* Technician Remarks */}
              {order.technicianNotes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">
                    Technician Bench Remarks
                  </span>
                  <p className="text-slate-600 mt-0.5 italic">{order.technicianNotes}</p>
                </div>
              )}

              {/* Pathologist Verification & Digital Signature Block */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Clinical Interpretation Remarks */}
                <div>
                  <span className="font-bold text-slate-700 block text-xs uppercase tracking-wider mb-1">
                    Pathologist Clinical Commentary & Interpretation
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 leading-relaxed min-h-[5rem]">
                    {order.pathologistRemarks || (
                      <span className="text-slate-400 italic">
                        {isVerified
                          ? 'No specific commentary required; findings reviewed and correlated.'
                          : 'Awaiting pathologist sign-off and clinical correlation remarks...'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Digital Signature Seal Block */}
                <div className="flex flex-col justify-end items-start sm:items-end text-right">
                  {isVerified ? (
                    <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 space-y-1 text-right max-w-xs">
                      <div className="flex items-center justify-end gap-1.5 text-emerald-800 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4" />
                        <span>ELECTRONICALLY SIGNED & VERIFIED</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        Dr. {order.verifiedBy?.name || 'Chief Pathologist'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        MD Clinical Pathology • Reg # MED-44029
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Verified:{' '}
                        {new Date(order.verifiedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="pt-1 text-[9px] text-emerald-700 font-mono border-t border-emerald-200">
                        SHA-256 Verified Multi-Tenant Audit Record
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs text-center w-full max-w-xs">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                      <span>Electronic Signature Pending Pathologist Authorization</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Regulatory Footer */}
              <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  * This is an official digital diagnostic report issued by HMS MedCore Laboratory Information System.
                </span>
                <span className="font-mono">Page 1 of 1 • System Verified</span>
              </div>
            </div>

            {/* Pathologist Review & Sign-Off Authorization Form (Screen only, for unverified reports) */}
            {!isVerified && order.status === LabOrderStatus.RESULT_ENTERED && (
              <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-xs space-y-4 print:hidden">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Pathologist / Medical Director Review & Sign-Off
                    </h3>
                    <p className="text-xs text-slate-500">
                      Authorize this diagnostic report, add clinical remarks, and seal as an immutable medical record.
                    </p>
                  </div>
                </div>

                {signError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{signError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pathologist Clinical Remarks & Recommendations
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter diagnostic interpretation (e.g. Findings indicate mild microcytic anemia; repeat iron studies recommended in 3 weeks)..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Report will be permanently locked against all subsequent edits.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isSigning}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-xs inline-flex items-center gap-2"
                  >
                    {isSigning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing & Sealing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sign & Authorize Diagnostic Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
