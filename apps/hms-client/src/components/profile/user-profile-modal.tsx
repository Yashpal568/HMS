'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import {
  X,
  Shield,
  ShieldCheck,
  Building2,
  Lock,
  Copy,
  Check,
  Activity,
  Key,
  Database,
  Calendar,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'security'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [permissionQuery, setPermissionQuery] = useState('');

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email.split('@')[0];

  const roleLabel = user.role ? user.role.replace(/_/g, ' ') : 'Staff Member';

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredPermissions = (user.permissions || []).filter((p) =>
    p.toLowerCase().includes(permissionQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Banner Header */}
        <div className="relative h-28 sm:h-32 bg-gradient-to-r from-teal-700 via-teal-600 to-slate-900 p-6 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20">
              <Activity className="h-3 w-3 text-teal-200" />
              HMS Sovereign Healthcare ID
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Avatar Ribbon */}
        <div className="px-6 pb-4 sm:px-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-14 gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-2xl sm:text-3xl font-bold text-white shadow-lg ring-4 ring-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span
                  className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-white"
                  title="Session Active"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {displayName}
                  </h2>
                  <Badge variant="teal" className="text-xs uppercase tracking-wider font-bold">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-end">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Session Guarded
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2',
                activeTab === 'overview'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Overview & Affiliation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2',
                activeTab === 'permissions'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Clinical Privileges</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
                {user.permissions?.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={cn(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2',
                activeTab === 'security'
                  ? 'border-teal-600 text-teal-800 bg-teal-50/40 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Security Posture</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Hospital Facility
                  </span>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <span>HMS Main Campus (Block A)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Department & Role
                  </span>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                    <Shield className="h-4 w-4 text-teal-600" />
                    <span>Hospital Administration • {roleLabel}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Sovereign Tenant Context
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-800 truncate">
                      {user.hospitalId || 'tenant_main_campus'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user.hospitalId || 'tenant_main_campus', 'tenant')}
                      className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-white transition-colors cursor-pointer"
                      title="Copy Tenant ID"
                    >
                      {copiedField === 'tenant' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    User Subject ID
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-800 truncate">
                      {user.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user.id, 'userId')}
                      className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-white transition-colors cursor-pointer"
                      title="Copy User ID"
                    >
                      {copiedField === 'userId' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/80 to-emerald-50/50 border border-teal-100/80 flex items-start gap-3">
                <Database className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900 mb-0.5">
                    Multi-Tenant Sovereign Partition
                  </p>
                  This session is bound to the isolated MongoDB Atlas healthcare partition. Access to
                  other hospital tenants is strictly isolated and forbidden at the database driver level.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLINICAL & ADMINISTRATIVE PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={permissionQuery}
                    onChange={(e) => setPermissionQuery(e.target.value)}
                    placeholder="Search granted permissions..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                  {filteredPermissions.length} of {user.permissions?.length ?? 0} matches
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 max-h-56 overflow-y-auto">
                {filteredPermissions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {filteredPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        <Key className="h-3 w-3 text-teal-600 shrink-0" />
                        <span>{perm}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No permissions match &ldquo;{permissionQuery}&rdquo;
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Permissions are verified server-side on every request via cryptographic JWT guards.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY POSTURE */}
          {activeTab === 'security' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs text-slate-600 font-medium">Password Hashing Algorithm</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    bcryptjs (Cost 12)
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs text-slate-600 font-medium">Account Lockout Policy</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    5 Failed Attempts (15-min Lock)
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs text-slate-600 font-medium">Session Token Transport</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    HttpOnly Cookie + SameSite=lax
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Audit Ledger Status</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Immutable audit_logs Active
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Healthcare data protection standards require all sessions to automatically terminate
                  upon inactivity. Always sign out when leaving your workstation unattended.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 sm:px-8 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Active Cloud Session: {new Date().toLocaleDateString()}</span>
          </div>

          <Button variant="teal" size="sm" onClick={onClose} className="shadow-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
