'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Bed,
  FlaskConical,
  Pill,
  Package,
  Receipt,
  ShieldAlert,
  FileSpreadsheet,
  Activity,
  X,
  Info,
  Sparkles,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  isReady: boolean;
  milestoneNotice?: string;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        isReady: true,
      },
    ],
  },
  {
    title: 'Clinical',
    items: [
      {
        name: 'Patients',
        href: '/patients',
        icon: Users,
        isReady: false,
        badge: 'Next',
        milestoneNotice: 'Patient Management (UHID, demographics & registration) is scheduled for Milestone 3.',
      },
      {
        name: 'Appointments & OPD',
        href: '/appointments',
        icon: Calendar,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Appointments & OPD queue management is scheduled for Milestone 4.',
      },
      {
        name: 'Doctor EMR',
        href: '/emr',
        icon: Stethoscope,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Doctor Consultation, clinical notes, and e-prescriptions are scheduled for Milestone 5.',
      },
      {
        name: 'IPD & Wards',
        href: '/ipd',
        icon: Bed,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'IPD admissions, bed allocation, and nursing charts are scheduled for Milestone 6.',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        name: 'Laboratory',
        href: '/laboratory',
        icon: FlaskConical,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Laboratory investigation orders and result verification are scheduled for Milestone 7.',
      },
      {
        name: 'Pharmacy',
        href: '/pharmacy',
        icon: Pill,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Pharmacy dispensing and medication verification are scheduled for Milestone 8.',
      },
      {
        name: 'Inventory',
        href: '/inventory',
        icon: Package,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Stock tracking, purchase orders, and procurement are scheduled for Milestone 9.',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        name: 'Billing & Invoicing',
        href: '/billing',
        icon: Receipt,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Patient tariffs, billing, and receipts processing are scheduled for Milestone 10.',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        name: 'Staff & Users',
        href: '/staff',
        icon: Users,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Hospital staff records and departmental assignments are scheduled for upcoming administrative milestone.',
      },
      {
        name: 'Reports & Census',
        href: '/reports',
        icon: FileSpreadsheet,
        isReady: false,
        badge: 'Phase 1',
        milestoneNotice: 'Hospital census, financial summaries, and clinical analytics are scheduled for Milestone 11.',
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        name: 'Audit & Security',
        href: '/dashboard#audit',
        icon: ShieldAlert,
        isReady: true,
        badge: 'Live',
      },
    ],
  },
];

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [scheduledNotice, setScheduledNotice] = useState<{ name: string; notice: string } | null>(null);

  const handleScheduledClick = (e: React.MouseEvent, item: NavItem) => {
    if (!item.isReady) {
      e.preventDefault();
      setScheduledNotice({
        name: item.name,
        notice: item.milestoneNotice || 'This module is scheduled for an upcoming milestone.',
      });
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden cursor-pointer"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') onClose();
          }}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white shadow-xs">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-white">HMS MedCore</span>
              <span className="block text-[11px] font-medium text-slate-400">Enterprise Healthcare</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* System Version & Connection Indicator */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Atlas v1.0.0
          </span>
          <span className="text-slate-400">Node 22 / React 19</span>
        </div>

        {/* Nav Items list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </h2>

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.isReady && pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={(e) => handleScheduledClick(e, item)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-teal-50 text-teal-900 font-semibold shadow-2xs border border-teal-200/60'
                            : item.isReady
                            ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                            aria-hidden="true"
                          />
                          <span>{item.name}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              item.isReady
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer info box */}
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="rounded-lg bg-teal-50/70 border border-teal-200/60 p-3 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-teal-900 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
              <span>Phase 1 Architecture</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Auth & RBAC active. Clinical modules populate in upcoming milestones.
            </p>
          </div>
        </div>
      </aside>

      {/* Scheduled Module Modal Notice */}
      {scheduledNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scheduled-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Info className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="scheduled-title" className="text-sm font-semibold text-slate-900">
                  {scheduledNotice.name}
                </h3>
                <span className="text-xs text-amber-700 font-medium">Scheduled Module</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {scheduledNotice.notice}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setScheduledNotice(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
