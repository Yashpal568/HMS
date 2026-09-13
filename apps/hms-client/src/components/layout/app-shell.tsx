'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, title, breadcrumbs }: AppShellProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

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
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
