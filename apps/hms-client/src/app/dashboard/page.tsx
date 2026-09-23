'use client';

import React from 'react';
import { AppShell } from '../../components/layout/app-shell';
import { useAuth } from '../../context/auth-context';
import { useWorkspace } from '../../context/workspace-context';
import { HospitalAdminDashboard } from '@/components/dashboard/hospital-admin-dashboard';
import { DoctorDashboard } from '@/components/dashboard/doctor-dashboard';
import { ReceptionistDashboard } from '@/components/dashboard/receptionist-dashboard';
import { NurseDashboard } from '@/components/dashboard/nurse-dashboard';
import { PharmacyDashboard } from '@/components/dashboard/pharmacy-dashboard';
import { LabDashboard } from '@/components/dashboard/lab-dashboard';
import { AccountantDashboard } from '@/components/dashboard/accountant-dashboard';
import { InventoryDashboard } from '@/components/dashboard/inventory-dashboard';
import { DepartmentManagerDashboard } from '@/components/dashboard/department-manager-dashboard';
import {
  Building2,
  Stethoscope,
  Users,
  HeartPulse,
  Pill,
  FlaskConical,
  Receipt,
  Package,
  Layers,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ALL_WORKSPACES: WorkspaceOption[] = [
  { id: 'HOSPITAL_ADMIN', label: 'Hospital Admin', icon: Building2, color: 'text-teal-600' },
  { id: 'DOCTOR', label: 'Doctor', icon: Stethoscope, color: 'text-teal-600' },
  { id: 'RECEPTIONIST', label: 'Receptionist', icon: Users, color: 'text-sky-600' },
  { id: 'NURSE', label: 'Nurse', icon: HeartPulse, color: 'text-rose-600' },
  { id: 'PHARMACIST', label: 'Pharmacist', icon: Pill, color: 'text-emerald-600' },
  { id: 'LAB_TECHNICIAN', label: 'Laboratory', icon: FlaskConical, color: 'text-purple-600' },
  { id: 'ACCOUNTANT', label: 'Billing / Finance', icon: Receipt, color: 'text-emerald-600' },
  { id: 'INVENTORY_MANAGER', label: 'Inventory / Store', icon: Package, color: 'text-amber-600' },
  { id: 'DEPARTMENT_MANAGER', label: 'Dept Manager', icon: Briefcase, color: 'text-cyan-600' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeWorkspace, availableWorkspaces, switchWorkspace } = useWorkspace();

  const isAdmin = !user?.role || user.role === 'HOSPITAL_ADMIN';
  const hasMultipleWorkspaces = availableWorkspaces.length > 1;

  // Workspace configuration metadata
  const getWorkspaceMeta = () => {
    switch (activeWorkspace.code) {
      case 'DOCTOR':
        return {
          title: 'Doctor Clinical Workspace',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Doctor Cockpit' }],
          component: <DoctorDashboard />,
        };
      case 'RECEPTIONIST':
        return {
          title: 'OPD Reception & Queue Hub',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Front Desk' }],
          component: <ReceptionistDashboard />,
        };
      case 'NURSE':
        return {
          title: 'Inpatient Ward Station',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Nurse Station' }],
          component: <NurseDashboard />,
        };
      case 'PHARMACIST':
        return {
          title: 'Pharmacy & Dispensary Center',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Dispensary' }],
          component: <PharmacyDashboard />,
        };
      case 'LAB_TECHNICIAN':
        return {
          title: 'Laboratory Diagnostic Station',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Diagnostic Lab' }],
          component: <LabDashboard />,
        };
      case 'ACCOUNTANT':
        return {
          title: 'Billing & Cashier Command',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Cashier Center' }],
          component: <AccountantDashboard />,
        };
      case 'INVENTORY_MANAGER':
        return {
          title: 'Store & Inventory Management',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Store Inventory' }],
          component: <InventoryDashboard />,
        };
      case 'DEPARTMENT_MANAGER':
        return {
          title: 'Department Operational Management',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Department Cockpit' }],
          component: <DepartmentManagerDashboard />,
        };
      case 'HOSPITAL_ADMIN':
      default:
        return {
          title: 'Hospital Administrator Workspace',
          breadcrumbs: [{ label: 'Overview', href: '/dashboard' }, { label: 'Hospital Overview' }],
          component: <HospitalAdminDashboard />,
        };
    }
  };

  const currentMeta = getWorkspaceMeta();

  // Determine which options to show in the switcher bar:
  // If admin, show all standard templates for immediate inspection
  // If user with assigned multiple workspaces, show their authorized workspaces
  const displayedWorkspaces = isAdmin
    ? ALL_WORKSPACES
    : ALL_WORKSPACES.filter((ws) =>
        availableWorkspaces.some((authWs) => authWs.code === ws.id),
      );

  return (
    <AppShell
      title={currentMeta.title}
      breadcrumbs={currentMeta.breadcrumbs}
    >
      <div className="space-y-4">
        {/* Workspace Switcher Bar (Visible for Admin and users with multiple workspaces) */}
        {(isAdmin || hasMultipleWorkspaces) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-700 shrink-0">
              <Layers className="h-4 w-4 text-teal-600" />
              <span>Workspace:</span>
              <span className="text-2xs font-normal text-slate-400">
                {isAdmin ? '(Admin Preview)' : `(${availableWorkspaces.length} authorized)`}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {displayedWorkspaces.map((ws) => {
                const Icon = ws.icon;
                const isActive = activeWorkspace.code === ws.id;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => switchWorkspace(ws.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-teal-400' : ws.color)} />
                    <span>{ws.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Role Workspace Dashboard */}
        {currentMeta.component}
      </div>
    </AppShell>
  );
}
