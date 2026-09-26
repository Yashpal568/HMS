'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Activity, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

const RESTRICTED_ROUTES: Record<string, { permissions: string[]; roles: string[]; title: string }> = {
  '/users': {
    permissions: ['users.read'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'User Management & Access Control',
  },
  '/roles': {
    permissions: ['roles.read'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'Roles & Privileges',
  },
  '/permissions': {
    permissions: ['roles.read', 'users.read'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'Permissions Catalog',
  },
  '/workspaces': {
    permissions: ['hospital.manage'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'Workspaces Catalog',
  },
  '/workspace-assignments': {
    permissions: ['hospital.manage', 'users.update'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'Workspace Assignments Matrix',
  },
  '/audit': {
    permissions: ['audit.read', 'audit.logs.read'],
    roles: ['HOSPITAL_ADMIN'],
    title: 'Security & Audit Trail',
  },
};

export function AppShell({ children, title, breadcrumbs, requiredPermissions, requiredRoles }: AppShellProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Initialize collapse preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hms_sidebar_collapsed');
      if (saved === 'true') {
        window.requestAnimationFrame(() => {
          setIsCollapsed(true);
        });
      }
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hms_sidebar_collapsed', String(next));
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Cmd+B / Ctrl+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [isLoading, token, router]);

  // Authorization evaluation
  let isAuthorized = true;
  let accessDeniedReason = '';

  if (user) {
    const userRole = (user.role || '').toUpperCase();
    const userPerms = (user.permissions || []).map((p: string) => p.toLowerCase());
    const hasWildcard = userPerms.includes('*');

    // 1. Check pathname rules
    const routeRule = pathname ? RESTRICTED_ROUTES[pathname] : undefined;
    if (routeRule) {
      const roleMatches = routeRule.roles.includes(userRole);
      const permMatches = hasWildcard || routeRule.permissions.some((reqPerm) => userPerms.includes(reqPerm.toLowerCase()));
      if (!roleMatches && !permMatches) {
        isAuthorized = false;
        accessDeniedReason = `Your staff role (${user.role}) does not have permission to view ${routeRule.title}.`;
      }
    }

    // 2. Check component-level explicit props
    if (isAuthorized && requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userRole)) {
        isAuthorized = false;
        accessDeniedReason = `This view requires one of the following roles: ${requiredRoles.join(', ')}.`;
      }
    }

    if (isAuthorized && requiredPermissions && requiredPermissions.length > 0) {
      const permMatches = hasWildcard || requiredPermissions.some((p) => userPerms.includes(p.toLowerCase()));
      if (!permMatches) {
        isAuthorized = false;
        accessDeniedReason = `Missing required permission: ${requiredPermissions.join(', ')}.`;
      }
    }
  }

  // Loading state while verifying authentication token
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-teal-400 shadow-md animate-pulse">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-slate-800">Verifying HMS Session</h2>
            <p className="text-xs text-slate-500 mt-0.5">Connecting to secure medical backend...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated fallback (handled by useEffect redirect)
  if (!token && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Layout Container (Dynamically adapts based on sidebar state) */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300 ease-in-out',
          isCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64',
        )}
      >
        {/* Header bar */}
        <Header
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
          title={title}
          breadcrumbs={breadcrumbs}
        />

        {/* Main Content Area */}
        <main id="main-content" role="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {!isAuthorized ? (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs">
                <ShieldAlert className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  403 Forbidden
                </span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {accessDeniedReason || 'You do not have sufficient privileges to access this operational module.'}
                </p>
                <p className="text-2xs text-slate-400">
                  If you require elevated clinical or administrative access, please contact your Hospital Administrator.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Return to Authorized Dashboard</span>
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
