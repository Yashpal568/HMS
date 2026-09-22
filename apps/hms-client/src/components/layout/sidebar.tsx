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
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Clock,
  Building2,
  UserCheck,
  Headphones,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  isReady: boolean;
  milestoneNotice?: string;
  badge?: string;
  roles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: 'Core Management',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        isReady: true,
      },
      {
        name: 'Patients',
        href: '/patients',
        icon: Users,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN'],
      },
      {
        name: 'Appointments',
        href: '/appointments',
        icon: Calendar,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'],
      },
      {
        name: 'OPD & Queue',
        href: '/appointments',
        icon: Clock,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
      },
      {
        name: 'IPD & Wards',
        href: '/ipd',
        icon: Bed,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'],
      },
    ],
  },
  {
    title: 'Clinical & Staff',
    items: [
      {
        name: 'Doctors',
        href: '/staff?role=DOCTOR',
        icon: Stethoscope,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST'],
      },
      {
        name: 'Departments',
        href: '/departments',
        icon: Building2,
        isReady: true,
        roles: ['HOSPITAL_ADMIN'],
      },
      {
        name: 'Staff Directory',
        href: '/staff',
        icon: UserCheck,
        isReady: true,
        roles: ['HOSPITAL_ADMIN'],
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
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'LAB_TECHNICIAN'],
      },
      {
        name: 'Pharmacy',
        href: '/pharmacy',
        icon: Pill,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST'],
      },
      {
        name: 'Inventory',
        href: '/inventory',
        icon: Package,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER'],
      },
    ],
  },
  {
    title: 'Finance & Analytics',
    items: [
      {
        name: 'Billing & Payments',
        href: '/billing',
        icon: Receipt,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'],
      },
      {
        name: 'Reports & Analytics',
        href: '/reports',
        icon: FileSpreadsheet,
        isReady: true,
        roles: ['HOSPITAL_ADMIN', 'ACCOUNTANT', 'DOCTOR'],
      },
      {
        name: 'Settings & Security',
        href: '/audit',
        icon: Settings,
        isReady: true,
        roles: ['HOSPITAL_ADMIN'],
      },
    ],
  },
];

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [scheduledNotice, setScheduledNotice] = useState<{ name: string; notice: string } | null>(null);

  const visibleSections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles || !user?.role) return true;
      if (user.role === 'HOSPITAL_ADMIN') return true;
      return item.roles.includes(user.role);
    }),
  })).filter((section) => section.items.length > 0);

  const handleScheduledClick = (e: React.MouseEvent, item: NavItem) => {
    if (!item.isReady) {
      e.preventDefault();
      setScheduledNotice({
        name: item.name,
        notice: item.milestoneNotice || 'This module is scheduled for an upcoming milestone.',
      });
      return;
    }
    if (isOpen && onClose) {
      onClose();
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden cursor-pointer"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') onClose();
          }}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out',
          // Desktop sizing
          isCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
          // Mobile translation
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Main Navigation"
      >
        {/* Brand Header (Matching Image 3) */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm shadow-teal-500/20">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="block text-sm font-bold tracking-tight text-white truncate">
                  MedCore
                </span>
                <span className="block text-[10px] font-medium text-slate-400 truncate">
                  Hospital Management
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Facility Selector Card (Matching Image 3) */}
        {(!isCollapsed || isOpen) && (
          <div className="mx-3 mt-3 mb-1 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between shadow-xs select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.hospitalId && !/^[0-9a-fA-F]{24}$/.test(user.hospitalId)
                    ? user.hospitalId
                    : 'CityCare Hospital'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Main Campus</p>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </div>
        )}

        {/* Nav Items list */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              {(!isCollapsed || isOpen) ? (
                <h2 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h2>
              ) : (
                <div className="my-1 border-t border-slate-100" />
              )}

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const baseHref = item.href.split('?')[0];
                  let isActive = false;
                  if (item.isReady) {
                    if (item.href === '/dashboard') {
                      isActive = pathname === '/dashboard';
                    } else if (item.name === 'Doctors') {
                      isActive =
                        pathname === '/staff' &&
                        typeof window !== 'undefined' &&
                        window.location.search.includes('role=DOCTOR');
                    } else if (item.name === 'Staff Directory') {
                      isActive =
                        pathname === '/staff' &&
                        (typeof window === 'undefined' ||
                          !window.location.search.includes('role=DOCTOR'));
                    } else {
                      isActive =
                        pathname === baseHref ||
                        (baseHref !== '/' && pathname.startsWith(baseHref + '/'));
                    }
                  }
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={(e) => handleScheduledClick(e, item)}
                        aria-current={isActive ? 'page' : undefined}
                        title={isCollapsed && !isOpen ? item.name : undefined}
                        className={cn(
                          'group flex items-center rounded-xl text-xs font-medium transition-all duration-150 relative select-none',
                          isCollapsed && !isOpen ? 'justify-center p-2.5' : 'justify-between px-3 py-2',
                          isActive
                            ? 'bg-teal-50 text-teal-900 font-semibold shadow-2xs border border-teal-200/80'
                            : item.isReady
                            ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 opacity-75',
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors',
                              isActive
                                ? 'text-teal-600'
                                : item.isReady
                                ? 'text-slate-500 group-hover:text-slate-800'
                                : 'text-slate-400',
                            )}
                            aria-hidden="true"
                          />
                          {(!isCollapsed || isOpen) && (
                            <span className="truncate">{item.name}</span>
                          )}
                        </div>

                        {(!isCollapsed || isOpen) && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 font-semibold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Need Help Card (Matching Image 3) */}
        {(!isCollapsed || isOpen) && (
          <div className="mx-3 my-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0 border border-teal-100">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800">Need Help?</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Get support or view docs
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer text-center"
            >
              Contact Support
            </button>
            <div className="mt-2 text-center text-[10px] font-mono text-slate-400">
              v1.0.0
            </div>
          </div>
        )}

        {/* Desktop Collapse / Expand Bottom Bar */}
        <div className="hidden lg:flex p-2 border-t border-slate-100 bg-slate-50/50 items-center justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer select-none',
              isCollapsed ? 'justify-center' : 'justify-between px-3',
            )}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4 text-slate-500" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 text-slate-500" />
                  <span>Collapse Menu</span>
                </>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-slate-400 font-mono">⌘B</span>
            )}
          </button>
        </div>
      </aside>

      {/* Scheduled Milestone Modal Notice */}
      {scheduledNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">{scheduledNotice.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {scheduledNotice.notice}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setScheduledNotice(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
