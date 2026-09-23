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
  ShieldCheck,
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
  KeyRound,
  UserCog,
  Layers,
  Briefcase,
  UploadCloud,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/context/workspace-context';

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

const getSectionsForWorkspace = (workspaceCode: string): NavSection[] => {
  switch (workspaceCode) {
    case 'DOCTOR':
      return [
        {
          title: 'Clinical Cockpit',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'My Schedule', href: '/appointments', icon: Calendar, isReady: true },
            { name: 'OPD Queue', href: '/appointments', icon: Clock, isReady: true },
            { name: 'My Patients', href: '/patients', icon: Users, isReady: true },
            { name: 'EMR & Encounters', href: '/emr', icon: Stethoscope, isReady: true },
            { name: 'Lab Orders', href: '/laboratory', icon: FlaskConical, isReady: true },
          ],
        },
        {
          title: 'Collaboration',
          items: [
            { name: 'Shift Roster', href: '/staff?tab=schedules', icon: Calendar, isReady: true },
            { name: 'Diagnostic Reports', href: '/reports', icon: FileSpreadsheet, isReady: true },
          ],
        },
      ];

    case 'PHARMACIST':
      return [
        {
          title: 'Dispensary',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Prescriptions', href: '/pharmacy', icon: Pill, isReady: true },
            { name: 'Dispensing Counter', href: '/pharmacy', icon: CheckSquare, isReady: true },
          ],
        },
        {
          title: 'Inventory & Stock',
          items: [
            { name: 'Batch Stock', href: '/inventory', icon: Package, isReady: true },
            { name: 'Bulk Import', href: '/inventory/import', icon: UploadCloud, isReady: true },
          ],
        },
      ];

    case 'ACCOUNTANT':
      return [
        {
          title: 'Finance & Cashier',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Billing & Invoices', href: '/billing', icon: Receipt, isReady: true },
            { name: 'Financial Reports', href: '/reports', icon: FileSpreadsheet, isReady: true },
          ],
        },
      ];

    case 'INVENTORY_MANAGER':
      return [
        {
          title: 'Store & Warehouse',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Stock Master', href: '/inventory', icon: Package, isReady: true },
            { name: 'Bulk Migration', href: '/inventory/import', icon: UploadCloud, isReady: true },
            { name: 'Valuation & Audit', href: '/reports', icon: FileSpreadsheet, isReady: true },
          ],
        },
      ];

    case 'RECEPTIONIST':
      return [
        {
          title: 'OPD Reception',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Patient Registration', href: '/patients', icon: Users, isReady: true },
            { name: 'Appointments & Tokens', href: '/appointments', icon: Calendar, isReady: true },
            { name: 'OPD Queue', href: '/appointments', icon: Clock, isReady: true },
            { name: 'Billing Counter', href: '/billing', icon: Receipt, isReady: true },
          ],
        },
      ];

    case 'NURSE':
      return [
        {
          title: 'Inpatient Station',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'IPD Wards & Beds', href: '/ipd', icon: Bed, isReady: true },
            { name: 'Assigned Patients', href: '/patients', icon: Users, isReady: true },
            { name: 'EMR Charts', href: '/emr', icon: Stethoscope, isReady: true },
          ],
        },
      ];

    case 'LAB_TECHNICIAN':
      return [
        {
          title: 'Diagnostic Station',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Specimen Orders', href: '/laboratory', icon: FlaskConical, isReady: true },
            { name: 'Results Verification', href: '/laboratory', icon: CheckSquare, isReady: true },
          ],
        },
      ];

    case 'DEPARTMENT_MANAGER':
      return [
        {
          title: 'Department Operations',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Department & Teams', href: '/departments', icon: Building2, isReady: true },
            { name: 'Workforce Directory', href: '/employees', icon: Users, isReady: true },
            { name: 'Shift Schedules', href: '/staff?tab=schedules', icon: Calendar, isReady: true },
            { name: 'Daily Attendance', href: '/staff?tab=attendance', icon: UserCheck, isReady: true },
            { name: 'Leave Approvals', href: '/staff?tab=leave', icon: CheckSquare, isReady: true },
            { name: 'Operational Reports', href: '/reports', icon: FileSpreadsheet, isReady: true },
          ],
        },
      ];

    case 'HOSPITAL_ADMIN':
    default:
      return [
        {
          title: 'Core Management',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, isReady: true },
            { name: 'Patients', href: '/patients', icon: Users, isReady: true },
            { name: 'Appointments', href: '/appointments', icon: Calendar, isReady: true },
            { name: 'OPD & Queue', href: '/appointments', icon: Clock, isReady: true },
            { name: 'IPD & Wards', href: '/ipd', icon: Bed, isReady: true },
          ],
        },
        {
          title: 'Clinical & Operations',
          items: [
            { name: 'Laboratory', href: '/laboratory', icon: FlaskConical, isReady: true },
            { name: 'Pharmacy', href: '/pharmacy', icon: Pill, isReady: true },
            { name: 'Inventory', href: '/inventory', icon: Package, isReady: true },
            { name: 'Bulk Migration', href: '/inventory/import', icon: UploadCloud, isReady: true },
            { name: 'Billing & Payments', href: '/billing', icon: Receipt, isReady: true },
            { name: 'Reports & Analytics', href: '/reports', icon: FileSpreadsheet, isReady: true },
          ],
        },
        {
          title: 'Hospital Administration',
          items: [
            { name: 'Organization & Teams', href: '/departments', icon: Building2, isReady: true },
            { name: 'Employees', href: '/employees', icon: Users, isReady: true },
            { name: 'Users & Access', href: '/users', icon: UserCog, isReady: true },
            { name: 'Roles', href: '/roles', icon: ShieldCheck, isReady: true },
            { name: 'Permissions', href: '/permissions', icon: KeyRound, isReady: true },
            { name: 'Workspaces', href: '/workspaces', icon: Layers, isReady: true },
            { name: 'Workspace Assignments', href: '/workspace-assignments', icon: Briefcase, isReady: true },
            { name: 'Schedules', href: '/staff?tab=schedules', icon: Calendar, isReady: true },
            { name: 'Attendance', href: '/staff?tab=attendance', icon: UserCheck, isReady: true },
            { name: 'Leave Management', href: '/staff?tab=leave', icon: CheckSquare, isReady: true },
            { name: 'Audit & Security', href: '/audit', icon: Settings, isReady: true },
          ],
        },
      ];
  }
};

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
  const { activeWorkspace } = useWorkspace();
  const [scheduledNotice, setScheduledNotice] = useState<{ name: string; notice: string } | null>(null);

  const sections = getSectionsForWorkspace(activeWorkspace.code);

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

      {/* Scheduled feature modal notification */}
      {scheduledNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2.5 text-teal-700">
              <Info className="h-5 w-5" />
              <h3 className="font-semibold text-sm">{scheduledNotice.name}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {scheduledNotice.notice}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setScheduledNotice(null)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl',
          isCollapsed ? 'w-18' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-900/30">
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

        {/* Facility Selector Card */}
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
          </div>
        )}

        {/* Active Workspace Indicator */}
        {(!isCollapsed || isOpen) && (
          <div className="mx-3 mt-1.5 mb-2 px-2.5 py-1.5 rounded-xl bg-teal-950/70 border border-teal-800/60 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span className="text-[11px] font-semibold text-teal-200 truncate">
                {activeWorkspace.name.replace(' Workspace', '')}
              </span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
        )}

        {/* Navigation items list */}
        <nav
          className="flex-1 space-y-4 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-slate-800"
          aria-label="Sidebar navigation"
        >
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              {(!isCollapsed || isOpen) && (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                  {section.title}
                </p>
              )}
              {isCollapsed && !isOpen && (
                <div className="my-2 border-t border-slate-800/60" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleScheduledClick(e, item)}
                      title={isCollapsed && !isOpen ? item.name : undefined}
                      className={cn(
                        'group flex items-center rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-150',
                        isCollapsed && !isOpen ? 'justify-center' : 'gap-3',
                        isActive
                          ? 'bg-teal-600 text-white font-semibold shadow-xs shadow-teal-900/30'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200',
                        !item.isReady && 'opacity-65',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-200',
                        )}
                        aria-hidden="true"
                      />
                      {(!isCollapsed || isOpen) && (
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="ml-auto inline-block rounded-md bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-400 uppercase tracking-wider">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with collapse toggle and support */}
        <div className="border-t border-slate-800/80 p-3 space-y-2">
          {(!isCollapsed || isOpen) && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-400 select-none">
              <Headphones className="h-4 w-4 text-teal-500 shrink-0" />
              <div className="min-w-0">
                <span className="block font-medium text-slate-300 truncate">
                  HMS 24/7 Support
                </span>
                <span className="block text-[10px] text-slate-500 truncate">
                  support@medcore.health
                </span>
              </div>
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 rounded-xl p-2 text-xs text-slate-400 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span className="text-xs font-medium">Collapse Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
