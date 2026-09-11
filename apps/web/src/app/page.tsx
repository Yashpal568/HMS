'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  Activity,
  ShieldCheck,
  UserCheck,
  Lock,
  LogOut,
  LogIn,
  Key,
  Database,
  CheckCircle2,
  Server,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function HomePage() {
  const { user, token, isLoading, logout } = useAuth();
  const [healthData, setHealthData] = useState<{ status: string; database?: string } | null>(null);
  const [rbacTestResult, setRbacTestResult] = useState<{
    endpoint: string;
    status: number;
    data: unknown;
  } | null>(null);
  const [isTestingRbac, setIsTestingRbac] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch(() => setHealthData({ status: 'offline', database: 'unreachable' }));
  }, []);

  const handleTestRbac = async (endpoint: string) => {
    setIsTestingRbac(true);
    setRbacTestResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      setRbacTestResult({
        endpoint,
        status: res.status,
        data,
      });
    } catch (err: unknown) {
      setRbacTestResult({
        endpoint,
        status: 500,
        data: { error: err instanceof Error ? err.message : 'Request failed' },
      });
    } finally {
      setIsTestingRbac(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Hospital Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-700 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">HMS</span>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">Hospital Management System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {healthData && (
              <div className="hidden md:flex items-center gap-2 text-xs font-medium bg-slate-100 py-1.5 px-3 rounded-full text-slate-600">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>MongoDB Atlas:</span>
                <span className={healthData.database === 'connected' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                  {healthData.database || 'checking...'}
                </span>
              </div>
            )}

            {isLoading ? (
              <div className="text-xs text-slate-400">Verifying session...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{user.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium py-1.5 px-4 rounded-lg bg-sky-700 hover:bg-sky-800 text-white transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Staff Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          /* Unauthenticated Landing / Sign In Prompt */
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                Authentication & Role-Based Access Control Foundation
              </h1>
              <p className="text-slate-600 text-sm max-w-xl mx-auto mb-6">
                This foundation securely controls access to all clinical, administrative, and operational modules in the Hospital Management System.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-sm font-medium transition-colors shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Access Staff Portal</span>
                </Link>
                <button
                  onClick={() => handleTestRbac('/auth/protected-test')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Test Guard (Unauthenticated)</span>
                </button>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Argon2 / Bcrypt Storage</h3>
                <p className="text-xs text-slate-500">
                  Passwords salted and hashed securely with account lockout protection.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Fine-Grained RBAC</h3>
                <p className="text-xs text-slate-500">
                  Granular permission bundles enforced across NestJS controller guards.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Audit Logging in Atlas</h3>
                <p className="text-xs text-slate-500">
                  All authentication events (login, failed login, logout) recorded without secrets.
                </p>
              </div>
            </div>

            {/* Unauthenticated RBAC Test Output */}
            {rbacTestResult && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Test Probe: {rbacTestResult.endpoint}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      rbacTestResult.status === 200
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    HTTP {rbacTestResult.status}
                  </span>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                  {JSON.stringify(rbacTestResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* Authenticated Staff Session View */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Staff Profile Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-lg">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                    <UserCheck className="w-3.5 h-3.5" />
                    {user.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active Session
                  </span>
                </div>
              </div>

              {/* Granted Permissions */}
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Effective Permissions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="text-xs font-mono py-1 px-2.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Live RBAC Test Deck */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Live RBAC Enforcement Deck</h3>
              <p className="text-xs text-slate-500 mb-4">
                Verify that your active session token satisfies server-side permission checks.
              </p>

              <div className="flex flex-wrap gap-3 mb-5">
                <button
                  onClick={() => handleTestRbac('/auth/protected-test')}
                  disabled={isTestingRbac}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Probe /auth/protected-test (users.read)</span>
                </button>

                <button
                  onClick={() => handleTestRbac('/roles')}
                  disabled={isTestingRbac}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5 text-sky-200" />
                  <span>Fetch All Roles (/roles)</span>
                </button>
              </div>

              {rbacTestResult && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Response for {rbacTestResult.endpoint}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        rbacTestResult.status === 200
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      HTTP {rbacTestResult.status}
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                    {JSON.stringify(rbacTestResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
