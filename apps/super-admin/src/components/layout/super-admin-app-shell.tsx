'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Layers,
  Activity,
  Lock,
  Megaphone,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SuperAdminAppShellProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Tenants',
    href: '/tenants',
    icon: Building2,
  },
  {
    name: 'Subscription Plans',
    href: '/plans',
    icon: Layers,
  },
  {
    name: 'Billing & Subscriptions',
    href: '/subscriptions',
    icon: CreditCard,
  },
  {
    name: 'Infrastructure Telemetry',
    href: '/telemetry',
    icon: Activity,
  },
  {
    name: 'Security & Audit Trail',
    href: '/audit',
    icon: Lock,
  },
  {
    name: 'System Broadcasts',
    href: '/broadcasts',
    icon: Megaphone,
  },
];

export function SuperAdminAppShell({
  children,
  title,
  description,
  breadcrumbs,
  actions,
}: SuperAdminAppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Platform Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  HMS MedCore
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-semibold uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                SaaS Owner Control Plane
              </p>
            </div>
          </Link>
        </div>

        {/* Header Right Status & Profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/telemetry"
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono hover:bg-emerald-500/15 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Atlas Cluster: Healthy</span>
          </Link>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'Platform Admin'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {user?.email || 'platform@hmsmedcore.com'}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out of Platform Console"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 space-y-6 shrink-0">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Control Plane
            </p>
            <nav className="space-y-1 pt-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/60">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Zero-PHI Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Platform Super Admin has zero clinical data access. All actions are immutably audited.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm flex">
            <div className="w-64 bg-slate-900 p-5 space-y-6 flex flex-col h-full border-r border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${
                        isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-slate-400">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-slate-200 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-200 font-medium">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Title and Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {title}
              </h1>
              {description && (
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>

          {/* Page Body */}
          {children}
        </main>
      </div>
    </div>
  );
}
