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

const DEFAULT_WORKSPACE: WorkspaceDefinition = {
  code: 'HOSPITAL_ADMIN',
  name: 'Hospital Administrator Workspace',
  description: 'Executive clinical governance, operational capacity, and resource management',
  defaultScope: 'HOSPITAL_WIDE',
  navigation: ['dashboard', 'patients', 'appointments', 'emr', 'ipd', 'laboratory', 'pharmacy', 'inventory', 'billing', 'reports', 'staff', 'departments', 'audit'],
  allowedActions: ['users.manage', 'hospital.manage', 'departments.manage', 'reports.view', 'audit.view'],
  badgeColor: 'teal',
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDefinition>(DEFAULT_WORKSPACE);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceDefinition[]>([DEFAULT_WORKSPACE]);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [scope, setScope] = useState<string>('HOSPITAL_WIDE');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!token) {
      setActiveWorkspace(DEFAULT_WORKSPACE);
      setAvailableWorkspaces([DEFAULT_WORKSPACE]);
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
        }

        if (data.activeWorkspace) {
          setActiveWorkspace(data.activeWorkspace);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hms_active_workspace', data.activeWorkspace.code);
          }
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
  }, [token]);

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
      const selected = target || {
        ...DEFAULT_WORKSPACE,
        code: workspaceCode,
        name: `${workspaceCode} Workspace`,
      };
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
