'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Users,
  UserPlus,
  ShieldAlert,
  Calendar,
  Stethoscope,
  Bed,
  Receipt,
  X,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isReady: boolean;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const items: CommandItem[] = [
    {
      id: 'dashboard',
      title: 'Hospital Dashboard',
      subtitle: 'System telemetry, active users, database metrics',
      href: '/dashboard',
      icon: LayoutDashboard,
      isReady: true,
    },
    {
      id: 'patients',
      title: 'Patient Directory',
      subtitle: 'Authoritative patient registry, search by UHID/phone',
      href: '/patients',
      icon: Users,
      badge: 'Active',
      isReady: true,
    },
    {
      id: 'register-patient',
      title: 'Register New Patient',
      subtitle: 'Create sovereign patient record with atomic UHID',
      href: '/patients/register',
      icon: UserPlus,
      badge: 'Create',
      isReady: true,
    },
    {
      id: 'audit-logs',
      title: 'Security Audit Trail',
      subtitle: 'Live authenticated events and access history',
      href: '/dashboard#audit',
      icon: ShieldAlert,
      isReady: true,
    },
    {
      id: 'appointments',
      title: 'Appointments & OPD Queue',
      subtitle: 'Token dispatching and doctor scheduling',
      href: '/patients',
      icon: Calendar,
      badge: 'M04',
      isReady: false,
    },
    {
      id: 'emr',
      title: 'Doctor EMR & Consultations',
      subtitle: 'SOAP clinical encounters & electronic prescriptions',
      href: '/patients',
      icon: Stethoscope,
      badge: 'M05',
      isReady: false,
    },
    {
      id: 'ipd',
      title: 'IPD & Ward Management',
      subtitle: 'Bed admissions and nursing census',
      href: '/patients',
      icon: Bed,
      badge: 'M06',
      isReady: false,
    },
    {
      id: 'billing',
      title: 'Billing & Invoicing Ledger',
      subtitle: 'Charge items, patient ledger, payment receipts',
      href: '/patients',
      icon: Receipt,
      badge: 'M10',
      isReady: false,
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (item: CommandItem) => {
    if (item.isReady) {
      router.push(item.href);
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle from parent or internal
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Command Palette"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search hospital module..."
            className="w-full py-4 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching modules or clinical destinations found.
            </div>
          ) : (
            filteredItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  disabled={!item.isReady}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    item.isReady
                      ? 'hover:bg-teal-50/70 hover:text-teal-950 cursor-pointer group'
                      : 'opacity-60 cursor-not-allowed bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                        item.isReady
                          ? 'bg-slate-100 text-slate-700 group-hover:bg-teal-600 group-hover:text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-950">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              item.badge === 'Create'
                                ? 'bg-teal-100 text-teal-800'
                                : item.badge === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block line-clamp-1">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {item.isReady && (
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-teal-600" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with mouse or enter</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] shadow-2xs">ESC</kbd>
            <span>to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
}
