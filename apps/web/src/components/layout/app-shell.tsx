'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Activity } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, title, breadcrumbs }: AppShellProps) {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-teal-400 shadow-md animate-pulse">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-slate-800">Verifying HMS Session</h2>
            <p className="text-xs text-slate-500">Connecting to secure medical backend...</p>
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
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Layout Container (Offset by sidebar width on desktop) */}
      <div className="flex flex-col lg:pl-64 min-h-screen">
        {/* Header bar */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
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
