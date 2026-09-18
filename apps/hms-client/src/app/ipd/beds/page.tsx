'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bed as BedIcon,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Wrench,
  AlertCircle,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { Bed, Ward, BedStatus } from '@hms/types';

export default function VisualBedMatrixPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedWardId, setSelectedWardId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Housekeeping action loading
  const [updatingBedId, setUpdatingBedId] = useState<string | null>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [activeAdmissionForTransfer, setActiveAdmissionForTransfer] = useState<any | null>(null);
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wardsRes, bedsRes, admissionsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: Ward[] }>('/ipd/wards'),
        apiClient.get<{ success: boolean; data: any[] }>('/ipd/beds'),
        apiClient.get<{ success: boolean; data: any[] }>('/ipd/admissions?status=admitted'),
      ]);

      if (wardsRes.success && wardsRes.data) {
        setWards(wardsRes.data);
      }
      if (bedsRes.success && bedsRes.data) {
        setBeds(bedsRes.data);
      }
      if (admissionsRes.success && admissionsRes.data) {
        setAdmissions(admissionsRes.data);
      }
    } catch (err) {
      console.error('Failed to load bed matrix:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to hospital server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Housekeeping: Mark Clean & Available
  const handleMarkClean = async (bedId: string) => {
    setUpdatingBedId(bedId);
    try {
      const res = await apiClient.patch<{ success: boolean; data: any }>(
        `/ipd/beds/${bedId}/status`,
        { status: BedStatus.AVAILABLE },
      );
      if (res.success) {
        setBeds((prev) =>
          prev.map((b) => ((b._id || b.id) === bedId ? { ...b, status: BedStatus.AVAILABLE } : b)),
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update bed status');
    } finally {
      setUpdatingBedId(null);
    }
  };

  // Open Transfer Modal
  const openTransferModal = (bed: any) => {
    const admission = admissions.find((a) => (a.bedId === (bed._id || bed.id)) || (a.bed?._id === (bed._id || bed.id)) || (a.bed?.id === (bed._id || bed.id)));
    if (admission) {
      setActiveAdmissionForTransfer(admission);
      setTargetBedId('');
      setTransferReason('');
      setTransferError(null);
      setTransferModalOpen(true);
    } else {
      alert('Could not find active admission for this occupied bed.');
    }
  };

  // Submit Bed Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdmissionForTransfer || !targetBedId) return;

    setIsSubmittingTransfer(true);
    setTransferError(null);

    try {
      const admId = activeAdmissionForTransfer._id || activeAdmissionForTransfer.id;
      const res = await apiClient.post<{ success: boolean; data: any }>(
        `/ipd/admissions/${admId}/transfer`,
        {
          destinationBedId: targetBedId,
          reason: transferReason || 'Internal clinical or ward transfer',
        },
      );

      if (res.success) {
        setTransferModalOpen(false);
        fetchData(); // Refresh all beds and admissions
      }
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Bed transfer failed');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Available beds for transfer dropdown
  const availableBedsForTransfer = beds.filter(
    (b) =>
      b.status === BedStatus.AVAILABLE &&
      (b._id || b.id) !== activeAdmissionForTransfer?.bedId,
  );

  // Filtered beds
  const filteredBeds = beds.filter((b) => {
    const isWardMatch =
      selectedWardId === 'ALL' ||
      b.wardId === selectedWardId ||
      b.ward?._id === selectedWardId ||
      b.ward?.id === selectedWardId;

    const isStatusMatch = statusFilter === 'ALL' || b.status === statusFilter;

    return isWardMatch && isStatusMatch;
  });

  // Count summaries
  const availableCount = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
  const occupiedCount = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
  const cleaningCount = beds.filter((b) => b.status === BedStatus.CLEANING).length;
  const maintenanceCount = beds.filter((b) => b.status === BedStatus.MAINTENANCE).length;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Breadcrumb & Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Link href="/ipd" className="hover:text-teal-700 transition-colors">
                IPD
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">Bed Matrix</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Visual Ward & Bed Matrix
            </h1>
            <p className="text-sm text-slate-500">
              Interactive ward floor view. Green: Available for intake &bull; Red: Occupied &bull; Amber: Turnover &bull; Gray: Maintenance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Matrix</span>
            </button>

            <Link href="/ipd/admissions/new">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Admit Inpatient</span>
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={fetchData}
              className="text-xs font-semibold text-rose-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Toolbar: Wards & Status Counters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
          {/* Ward Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold uppercase text-slate-400 shrink-0 mr-1">
              Wards:
            </span>
            <button
              onClick={() => setSelectedWardId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedWardId === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Wards ({beds.length})
            </button>

            {wards.map((w) => {
              const wardBeds = beds.filter(
                (b) => b.wardId === (w._id || w.id) || b.ward?._id === (w._id || w.id),
              );
              return (
                <button
                  key={w._id || w.id}
                  onClick={() => setSelectedWardId(w._id || w.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    selectedWardId === (w._id || w.id)
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w.name} ({wardBeds.length})
                </button>
              );
            })}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-slate-400 mr-1">
                Status:
              </span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({beds.length})
              </button>
              <button
                onClick={() => setStatusFilter(BedStatus.AVAILABLE)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === BedStatus.AVAILABLE
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Available ({availableCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter(BedStatus.OCCUPIED)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === BedStatus.OCCUPIED
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span>Occupied ({occupiedCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter(BedStatus.CLEANING)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === BedStatus.CLEANING
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Cleaning ({cleaningCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter(BedStatus.MAINTENANCE)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === BedStatus.MAINTENANCE
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Maintenance ({maintenanceCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Visual Bed Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-teal-600" />
            Loading ward beds matrix...
          </div>
        ) : filteredBeds.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <BedIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Beds Match Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Adjust your selected ward or bed status filter to view other hospital beds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBeds.map((bed) => {
              const isAvailable = bed.status === BedStatus.AVAILABLE;
              const isOccupied = bed.status === BedStatus.OCCUPIED;
              const isCleaning = bed.status === BedStatus.CLEANING;
              const isMaintenance = bed.status === BedStatus.MAINTENANCE;

              // Find active admission if occupied
              const activeAdm = isOccupied
                ? admissions.find(
                    (a) =>
                      a.bedId === (bed._id || bed.id) ||
                      a.bed?._id === (bed._id || bed.id) ||
                      a.bed?.id === (bed._id || bed.id),
                  )
                : null;

              const wardName =
                bed.ward?.name ||
                wards.find((w) => (w._id || w.id) === bed.wardId)?.name ||
                'Ward';

              return (
                <div
                  key={bed._id || bed.id}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between shadow-xs ${
                    isAvailable
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                      : isOccupied
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                      : isCleaning
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top row: Bed # & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BedIcon
                          className={`w-4 h-4 ${
                            isAvailable
                              ? 'text-emerald-600'
                              : isOccupied
                              ? 'text-rose-600'
                              : isCleaning
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        />
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {bed.bedNumber}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOccupied
                            ? 'bg-rose-100 text-rose-800'
                            : isCleaning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {bed.status}
                      </span>
                    </div>

                    {/* Ward label */}
                    <div className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{wardName}</span>
                    </div>

                    {/* Dynamic state card content */}
                    {isOccupied && activeAdm && (
                      <div className="p-2.5 rounded-lg bg-white/90 border border-rose-100 text-xs space-y-1">
                        <div className="font-semibold text-slate-900 truncate">
                          {activeAdm.patient?.name?.first} {activeAdm.patient?.name?.last}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          UHID: {activeAdm.patient?.uhid || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate" title={activeAdm.admittingDiagnosis}>
                          Dx: {activeAdm.admittingDiagnosis}
                        </div>
                      </div>
                    )}

                    {isCleaning && (
                      <div className="p-2.5 rounded-lg bg-amber-100/50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                        <span className="text-[11px] font-medium">
                          Sanitization & linens turnover in progress
                        </span>
                      </div>
                    )}

                    {isAvailable && (
                      <div className="p-2.5 rounded-lg bg-emerald-100/40 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-medium">
                          Clean & prepared for patient intake
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    {isAvailable && (
                      <Link
                        href={`/ipd/admissions/new?bedId=${bed._id || bed.id}&wardId=${bed.wardId}`}
                        className="w-full"
                      >
                        <button className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs">
                          Admit Patient
                        </button>
                      </Link>
                    )}

                    {isOccupied && activeAdm && (
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          onClick={() => openTransferModal(bed)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors shadow-2xs flex items-center justify-center gap-1"
                          title="Transfer to another available bed"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                          <span>Transfer</span>
                        </button>

                        <Link
                          href={`/ipd/admissions/${activeAdm._id || activeAdm.id}/discharge`}
                          className="flex-1"
                        >
                          <button className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs">
                            Discharge
                          </button>
                        </Link>
                      </div>
                    )}

                    {isCleaning && (
                      <button
                        onClick={() => handleMarkClean(bed._id || bed.id)}
                        disabled={updatingBedId === (bed._id || bed.id)}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {updatingBedId === (bed._id || bed.id)
                            ? 'Updating...'
                            : 'Mark Clean & Ready'}
                        </span>
                      </button>
                    )}

                    {isMaintenance && (
                      <button
                        onClick={() => handleMarkClean(bed._id || bed.id)}
                        disabled={updatingBedId === (bed._id || bed.id)}
                        className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                      >
                        Restore to Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Internal Bed Transfer Modal */}
        {transferModalOpen && activeAdmissionForTransfer && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Internal Bed Transfer
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {activeAdmissionForTransfer.admissionNumber}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                {/* Current Patient & Bed Information */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <strong className="text-slate-900">
                      {activeAdmissionForTransfer.patient?.name?.first}{' '}
                      {activeAdmissionForTransfer.patient?.name?.last}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Origin Bed:</span>
                    <strong className="font-mono text-rose-700">
                      {activeAdmissionForTransfer.bed?.bedNumber || 'Current Bed'} (
                      {activeAdmissionForTransfer.ward?.name || 'Ward'})
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    Note: The origin bed will automatically transition to{' '}
                    <strong className="text-amber-600">cleaning</strong> status upon transfer.
                  </div>
                </div>

                {/* Target Bed Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Destination Bed <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetBedId}
                    onChange={(e) => setTargetBedId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">-- Choose an Available Bed --</option>
                    {availableBedsForTransfer.map((b) => {
                      const wName =
                        b.ward?.name ||
                        wards.find((w) => (w._id || w.id) === b.wardId)?.name ||
                        'Ward';
                      return (
                        <option key={b._id || b.id} value={b._id || b.id}>
                          {wName} &bull; Bed {b.bedNumber}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Transfer Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Transfer <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    required
                    placeholder="e.g. Patient stepped down from ICU to General Medicine, isolation protocol, etc."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTransfer || !targetBedId}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isSubmittingTransfer ? 'Transferring...' : 'Execute Bed Transfer'}
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
