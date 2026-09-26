'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';

export interface WorkspaceDefinition {
  code: string;
  name: string;
  description: string;
  defaultScope: 'HOSPITAL_WIDE' | 'DEPARTMENT_ONLY' | 'TEAM_ONLY' | 'ASSIGNED_RESOURCES';
  navigation: string[];
  allowedActions: string[];
  badgeColor: string;
}

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  departmentId?: string;
  scope: string;
}

export interface WorkspaceContextType {
  activeWorkspace: WorkspaceDefinition;
  availableWorkspaces: WorkspaceDefinition[];
  employee: EmployeeProfile | null;
  scope: string;
  isLoading: boolean;
  switchWorkspace: (workspaceCode: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
}

const STANDARD_WORKSPACES_CLIENT: Record<string, WorkspaceDefinition> = {
  HOSPITAL_ADMIN: {
    code: 'HOSPITAL_ADMIN',
    name: 'Hospital Administrator Workspace',
    description: 'Executive clinical governance, operational capacity, and resource management',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: ['dashboard', 'patients', 'appointments', 'emr', 'ipd', 'laboratory', 'pharmacy', 'inventory', 'billing', 'reports', 'staff', 'departments', 'audit'],
    allowedActions: ['users.manage', 'hospital.manage', 'departments.manage', 'reports.view', 'audit.view'],
    badgeColor: 'teal',
  },
  DOCTOR: {
    code: 'DOCTOR',
    name: 'Doctor Clinical Workspace',
    description: 'Outpatient consultation cockpit, electronic medical records, and diagnostic requisitions',
    defaultScope: 'ASSIGNED_RESOURCES',
    navigation: ['dashboard', 'appointments', 'emr', 'patients', 'laboratory'],
    allowedActions: ['emr.create', 'emr.update', 'prescriptions.create', 'lab.order'],
    badgeColor: 'teal',
  },
  PHARMACIST: {
    code: 'PHARMACIST',
    name: 'Pharmacy & Dispensary Center',
    description: 'e-Prescription fulfillment, FEFO batch selection, expiry watch, and drug dispensing',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'pharmacy', 'inventory'],
    allowedActions: ['pharmacy.dispense', 'inventory.view'],
    badgeColor: 'emerald',
  },
  ACCOUNTANT: {
    code: 'ACCOUNTANT',
    name: 'Billing & Cashier Command',
    description: 'Invoice settlements, cashier balance, payment reconciliation, and claims',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: ['dashboard', 'billing', 'reports'],
    allowedActions: ['billing.create', 'billing.collect', 'billing.refund'],
    badgeColor: 'amber',
  },
  RECEPTIONIST: {
    code: 'RECEPTIONIST',
    name: 'OPD Reception & Queue Hub',
    description: 'Patient check-in, token distribution, appointment scheduling, and registration',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'patients', 'appointments', 'billing'],
    allowedActions: ['patients.create', 'appointments.create', 'queue.checkin'],
    badgeColor: 'sky',
  },
  LAB_TECHNICIAN: {
    code: 'LAB_TECHNICIAN',
    name: 'Laboratory Diagnostic Station',
    description: 'Specimen accessioning, analyzer telemetry, test result entry, and pathology verification',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'laboratory'],
    allowedActions: ['lab.accession', 'lab.results.enter'],
    badgeColor: 'purple',
  },
  NURSE: {
    code: 'NURSE',
    name: 'Inpatient Ward Station',
    description: 'Bedside telemetry, vitals recording, inpatient care tasks, and medication administration',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'ipd', 'emr', 'patients', 'pharmacy'],
    allowedActions: ['vitals.record', 'nursing.notes', 'ipd.manage'],
    badgeColor: 'rose',
  },
  INVENTORY_MANAGER: {
    code: 'INVENTORY_MANAGER',
    name: 'Store & Inventory Management',
    description: 'Warehouse GRN receipt, purchase orders, reorder point alarms, and supplier ledger',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: ['dashboard', 'inventory', 'reports'],
    allowedActions: ['inventory.grn', 'inventory.po', 'inventory.adjust'],
    badgeColor: 'indigo',
  },
  DEPARTMENT_MANAGER: {
    code: 'DEPARTMENT_MANAGER',
    name: 'Department Operational Management',
    description: 'Departmental staff scheduling, shift assignments, attendance approvals, and metrics',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'staff', 'appointments', 'reports'],
    allowedActions: ['schedules.manage', 'attendance.approve', 'leave.approve'],
    badgeColor: 'cyan',
  },
};

const resolveDefaultWorkspace = (role?: string): WorkspaceDefinition => {
  if (role && STANDARD_WORKSPACES_CLIENT[role]) {
    return STANDARD_WORKSPACES_CLIENT[role];
  }
  return {
    code: 'NONE',
    name: 'Unassigned Workspace',
    description: 'Staff account awaiting operational workspace assignment',
    defaultScope: 'ASSIGNED_RESOURCES',
    navigation: ['dashboard'],
    allowedActions: [],
    badgeColor: 'slate',
  };
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const initialWs = resolveDefaultWorkspace(user?.role);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDefinition>(initialWs);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceDefinition[]>([initialWs]);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [scope, setScope] = useState<string>('HOSPITAL_WIDE');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync with user role when user changes
  useEffect(() => {
    if (user?.role) {
      const defaultForRole = resolveDefaultWorkspace(user.role);
      setActiveWorkspace((prev) => (prev.code === 'NONE' || prev.code === 'HOSPITAL_ADMIN' ? defaultForRole : prev));
    }
  }, [user?.role]);

  const fetchWorkspaces = useCallback(async () => {
    if (!token) {
      const defaultWs = resolveDefaultWorkspace(user?.role);
      setActiveWorkspace(defaultWs);
      setAvailableWorkspaces([defaultWs]);
      setIsLoading(false);
      return;
    }

    try {
      const savedWorkspaceCode = typeof window !== 'undefined' ? localStorage.getItem('hms_active_workspace') : null;
      const url = savedWorkspaceCode
        ? `${API_BASE_URL}/workspaces/my-workspaces?active=${encodeURIComponent(savedWorkspaceCode)}`
        : `${API_BASE_URL}/workspaces/my-workspaces`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data;

        if (data.availableWorkspaces && data.availableWorkspaces.length > 0) {
          setAvailableWorkspaces(data.availableWorkspaces);
        } else {
          setAvailableWorkspaces([resolveDefaultWorkspace(user?.role)]);
        }

        if (data.activeWorkspace) {
          setActiveWorkspace(data.activeWorkspace);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hms_active_workspace', data.activeWorkspace.code);
          }
        } else {
          setActiveWorkspace(resolveDefaultWorkspace(user?.role));
        }

        if (data.employee) {
          setEmployee(data.employee);
        }

        if (data.scope) {
          setScope(data.scope);
        }
      }
    } catch {
      // Keep fallbacks on network error
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces, user]);

  const switchWorkspace = async (workspaceCode: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/workspaces/switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceCode }),
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        const newWs = json.data?.activeWorkspace;
        if (newWs) {
          setActiveWorkspace(newWs);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hms_active_workspace', newWs.code);
          }
        }
        return true;
      }
    } catch {
      // Local fallback if server unreachable
    }

    // Fallback: search available workspaces locally
    const target = availableWorkspaces.find((ws) => ws.code === workspaceCode);
    if (target || user?.role === 'HOSPITAL_ADMIN') {
      const selected = target || resolveDefaultWorkspace(workspaceCode);
      setActiveWorkspace(selected);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hms_active_workspace', workspaceCode);
      }
      return true;
    }

    return false;
  };

  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        availableWorkspaces,
        employee,
        scope,
        isLoading,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
