'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import {
  Menu,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Database,
  Building2,
} from 'lucide-react';

export interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({
  onMenuClick,
  title = 'Hospital Dashboard',
  breadcrumbs = [
    { label: 'HMS Core', href: '/dashboard' },
    { label: 'Overview', href: '/dashboard' },
    { label: 'Dashboard' },
  ],
}: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email.split('@')[0]
    : 'Hospital User';

  const roleLabel = user?.role ? user.role.replace(/_/g, ' ') : 'Staff';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left side: Hamburger button + Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex flex-col">
          {/* Breadcrumb row */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.label}>
                {index > 0 && <span className="text-slate-300">/</span>}
                <span className={index === breadcrumbs.length - 1 ? 'font-medium text-slate-800' : 'hover:text-slate-700'}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Page title */}
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right side: Database status indicator & User Account Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* MongoDB Atlas Live Indicator */}
        <div
          title="Connected to MongoDB Atlas Live Cluster"
          className="hidden md:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
        >
          <Database className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          <span>MongoDB Atlas Active</span>
        </div>

        {/* User profile dropdown trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-xs font-semibold text-white shadow-2xs">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
                isProfileOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Profile dropdown menu */}
          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsProfileOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-40 space-y-1"
              >
                {/* User info box */}
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      {roleLabel}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Account
                    </span>
                  </div>
                </div>

                {/* Quick details */}
                <div className="px-3 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Branch
                  </span>
                  <span className="font-medium text-slate-800">Main Facility</span>
                </div>

                <div className="px-3 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Permissions
                  </span>
                  <span className="font-medium text-slate-800">
                    {user?.permissions?.length ?? 0} granted
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{isLoggingOut ? 'Signing out...' : 'Sign out of HMS'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
