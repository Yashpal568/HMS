'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { ShieldAlert, Lock, Mail, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const { login, error: authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both platform email and master password.');
      return;
    }

    await login(email, password, totpCode);
  };

  const handleFillDemo = () => {
    setEmail('platform@hmsmedcore.com');
    setPassword('Platform@Admin2026');
    setTotpCode('849201');
    setLocalError(null);
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-600/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              SaaS Control Plane
            </h1>
            <p className="text-xs font-mono text-indigo-400 mt-1 uppercase tracking-wider">
              Platform Super Admin Authentication
            </p>
            <p className="text-xs text-slate-400 mt-1">
              HMS MedCore Multi-Tenant Cloud Operating System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Platform Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="platform@hmsmedcore.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  TOTP 2FA Security Token
                </label>
                <span className="text-[10px] text-slate-500 font-mono">RFC 6238</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit authenticator code"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all tracking-wider"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Cryptographic Session...</span>
                </>
              ) : (
                <span>Access Platform Control Plane</span>
              )}
            </button>
          </form>

          {/* Seeded Super Admin Credentials helper */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-500 text-center mb-2 font-mono">
              Seeded Platform Super Admin Credentials:
            </p>
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800/80 text-slate-300 text-xs font-mono rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <span>platform@hmsmedcore.com</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-sans font-medium">(Auto-fill demo)</span>
            </button>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center space-y-1 text-[11px] text-slate-500">
          <p>Strict Zero-PHI Invariant Enforced • Unauthorized Probes Audited</p>
          <p>Hospital staff must authenticate at their dedicated hospital domain</p>
        </div>
      </div>
    </div>
  );
}
