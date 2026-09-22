'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import {
  Menu,
  LogOut,
  ChevronDown,
  Building2,
  Search,
  Bell,
  PanelLeft,
  PanelLeftClose,
  ChevronRight,
  Home,
  CheckCircle2,
  User,
  Copy,
  Check,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/ui/command-palette';
import { UserProfileModal } from '@/components/profile/user-profile-modal';
import { CurrencySelector } from '@/components/common/currency-selector';

export interface HeaderProps {
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: 'system' | 'security' | 'clinical';
  read: boolean;
}

export function Header({
  onMenuClick,
  onToggleCollapse,
  isCollapsed = false,
  title = 'Hospital Dashboard',
  breadcrumbs = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Dashboard' },
  ],
}: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedTenant, setCopiedTenant] = useState(false);

  const copyTenantId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(user?.hospitalId || 'tenant_main_campus');
    setCopiedTenant(true);
    setTimeout(() => setCopiedTenant(false), 2000);
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      title: 'Emergency triage protocol active for Ward A & B',
      time: 'Just now',
      type: 'system',
      read: false,
    },
    {
      id: '2',
      title: 'New patient encounter registered in Cardiology OPD',
      time: '12m ago',
      type: 'clinical',
      read: false,
    },
    {
      id: '3',
      title: 'Daily financial settlement reconciled with Cashier Desk',
      time: '1h ago',
      type: 'security',
      read: true,
    },
  ]);

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

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayName = user
    ? user.firstName && user.lastName && user.firstName !== 'System'
      ? `${user.firstName} ${user.lastName}`
      : user.firstName && user.firstName !== 'System'
      ? user.firstName
      : 'Rahul Sharma'
    : 'Rahul Sharma';

  const formatRoleTitle = (role?: string) => {
    if (!role) return 'Hospital Staff';
    if (role === 'HOSPITAL_ADMIN') return 'Hospital Administrator';
    if (role === 'DOCTOR') return 'Doctor';
    if (role === 'RECEPTIONIST') return 'Receptionist';
    if (role === 'NURSE') return 'Staff Nurse';
    if (role === 'PHARMACIST') return 'Pharmacist';
    if (role === 'LAB_TECHNICIAN') return 'Lab Technician';
    if (role === 'ACCOUNTANT') return 'Billing Officer';
    if (role === 'INVENTORY_MANAGER') return 'Inventory Manager';
    return role.replace(/_/g, ' ');
  };

  const roleLabel = formatRoleTitle(user?.role);

  return (
    <>
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-4 sm:px-6 transition-all">
        {/* Left side: Sidebar Toggle + Breadcrumb trail */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Desktop sidebar collapse/expand button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer select-none"
            title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div className="h-4 w-px bg-slate-200 hidden lg:block" />

          {/* Breadcrumb Navigation & Page Title */}
          <div className="flex flex-col">
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-800 transition-colors flex items-center gap-1">
                <Home className="h-3 w-3" />
                <span>HMS</span>
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.label}>
                  <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-slate-800 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        index === breadcrumbs.length - 1
                          ? 'font-semibold text-slate-800'
                          : 'text-slate-500',
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>

            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate max-w-[150px] sm:max-w-xs md:max-w-none">
              {title}
            </h1>
          </div>
        </div>

        {/* Center: Quick Command Palette Trigger (shadcn studio style) */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-slate-400 hover:text-slate-700 text-xs transition-all shadow-2xs cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span>Search modules, patients...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] text-slate-500 shadow-2xs">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right side: Telemetry indicators, Notifications & User menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile search icon trigger */}
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
          </button>
          {/* Hospital Branch Pill (Matching Image 3) */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer transition-colors select-none">
            <MapPin className="h-3.5 w-3.5 text-teal-600" />
            <span>Main Campus</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </div>

          {/* Display Currency Selector */}
          <CurrencySelector />

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsProfileOpen(false);
              }}
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-2xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {isNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsNotificationsOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-40 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        System Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-medium text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs transition-colors',
                          notif.read
                            ? 'bg-slate-50/50 border-slate-100 text-slate-600'
                            : 'bg-teal-50/40 border-teal-100 text-slate-800 font-medium',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className={cn(
                              'h-4 w-4 shrink-0 mt-0.5',
                              notif.read ? 'text-slate-400' : 'text-teal-600',
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-2 leading-relaxed">{notif.title}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                              {notif.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Help Button (Matching Image 3) */}
          <button
            type="button"
            className="hidden sm:flex rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Help & Documentation"
            aria-label="Help and Documentation"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* User profile dropdown trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen((prev) => !prev);
                setIsNotificationsOpen(false);
              }}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              className="group flex items-center gap-2 rounded-2xl p-1 sm:p-1.5 hover:bg-slate-100/90 border border-transparent hover:border-slate-200 transition-all cursor-pointer select-none"
            >
              <div className="relative">
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 text-xs font-bold text-white shadow-xs group-hover:scale-105 transition-transform">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>

              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>

              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200',
                  isProfileOpen ? 'rotate-180' : '',
                )}
                aria-hidden="true"
              />
            </button>

            {/* Profile dropdown menu (Executive Shadcn Studio style) */}
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
                  className="absolute right-0 mt-2 w-80 sm:w-88 rounded-3xl border border-slate-200/90 bg-white p-2.5 shadow-2xl z-40 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Banner Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-4 text-white shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-bold text-white shadow-md ring-2 ring-white/30">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white leading-tight truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-teal-200/90 truncate font-mono mt-0.5">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40 uppercase">
                        {roleLabel}
                      </span>
                    </div>

                    {/* Tenant context ribbon */}
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-teal-400" />
                        <span>Main Campus</span>
                      </span>
                      <button
                        type="button"
                        onClick={copyTenantId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-teal-100 font-mono transition-colors cursor-pointer"
                        title="Copy sovereign tenant ID"
                      >
                        {copiedTenant ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-300" />
                            <span>{user?.hospitalId || 'tenant_main_campus'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick Details Ribbon */}
                  <div className="grid grid-cols-2 gap-1.5 px-1 py-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Access Scope
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 font-mono">
                        {user?.permissions?.length ?? 0} Privileges
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Session Guard
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active (JWT)
                      </span>
                    </div>
                  </div>

                  {/* Menu Actions */}
                  <div className="space-y-1 px-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        <span>View Full Clinical Profile</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Details
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsCommandOpen(true);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                        <span>Command & Shortcuts</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        ⌘K
                      </kbd>
                    </button>
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-slate-100 pt-1.5 px-1 pb-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
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

      {/* Full Clinical Profile & Permissions Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
