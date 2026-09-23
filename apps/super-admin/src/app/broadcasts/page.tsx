'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SuperAdminAppShell } from '../../components/layout/super-admin-app-shell';
import { apiClient } from '../../lib/api-client';
import type { PlatformBroadcast, CreateBroadcastDto } from '@hms/types';
import {
  Megaphone,
  PlusCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Send,
} from 'lucide-react';

export default function PlatformBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Broadcast Form State
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateBroadcastDto>({
    title: '',
    message: '',
    severity: 'INFO',
    targetAudience: 'ALL',
  });

  const fetchBroadcasts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get<{ success: boolean; data: PlatformBroadcast[] }>(
        '/super-admin/broadcasts',
      );
      setBroadcasts(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load system broadcasts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setErrorMessage('Broadcast title and message are required.');
      return;
    }

    try {
      setIsPosting(true);
      setErrorMessage(null);
      await apiClient.post('/super-admin/broadcasts', formData);
      setSuccessMessage('System broadcast successfully dispatched across hospital tenants.');
      setFormData({
        title: '',
        message: '',
        severity: 'INFO',
        targetAudience: 'ALL',
      });
      await fetchBroadcasts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await apiClient.patch(`/super-admin/broadcasts/${id}/dismiss`);
      setSuccessMessage('Broadcast dismissed.');
      await fetchBroadcasts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dismiss broadcast.');
    }
  };

  return (
    <SuperAdminAppShell
      title="System Maintenance & Global Broadcasts"
      description="Publish platform-wide announcements, scheduled maintenance notifications, and incident alerts across all hospital tenants."
      breadcrumbs={[{ label: 'Platform Console', href: '/dashboard' }, { label: 'Broadcasts' }]}
    >
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successMessage}
          </span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Dispatch Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                Dispatch New Broadcast
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Announcements appear immediately in hospital tenant header bars.
              </p>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Broadcast Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Atlas Maintenance"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as 'INFO' | 'WARNING' | 'CRITICAL',
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INFO">Info (Blue)</option>
                    <option value="WARNING">Warning (Amber)</option>
                    <option value="CRITICAL">Critical (Red)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetAudience: e.target.value as 'ALL' | 'HOSPITAL_ADMINS' | 'CLINICIANS',
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Hospital Staff</option>
                    <option value="HOSPITAL_ADMINS">Hospital Admins Only</option>
                    <option value="CLINICIANS">Clinicians Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Provide precise details, maintenance window timestamps, or operational instructions..."
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPosting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isPosting ? (
                  <span>Dispatching...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Broadcast</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Active & Recent Broadcasts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Active System Broadcasts</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Currently rendered in hospital user sessions
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                {broadcasts.length} active
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading broadcasts...</div>
            ) : broadcasts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-300">No active platform broadcasts</p>
                <p className="text-slate-500">All tenant systems are operating normally without banners.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((b: any) => {
                  const broadcastId = b.id || b._id;
                  return (
                  <div
                    key={broadcastId}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                      b.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : b.severity === 'WARNING'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-indigo-500/10 border-indigo-500/30'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            b.severity === 'CRITICAL'
                              ? 'bg-rose-500 text-white'
                              : b.severity === 'WARNING'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {b.severity}
                        </span>
                        <h4 className="text-sm font-bold text-white">{b.title}</h4>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">{b.message}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Users className="w-3 h-3 text-slate-500" />
                          Audience: {b.targetAudience}
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          Published: {new Date(b.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismiss(broadcastId)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-rose-400 border border-slate-700/60 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminAppShell>
  );
}
