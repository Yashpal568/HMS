import React from "react";
import {
  ShieldAlert,
  Building,
  CreditCard,
  BarChart3,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Headphones,
} from "lucide-react";

export default function SuperAdminHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Platform Super Admin
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-semibold uppercase tracking-wider">
                SaaS Sovereign Scope
              </span>
            </div>
            <p className="text-xs text-slate-400">
              HMS MedCore Multi-Tenant Cloud Operating System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Platform Core: Healthy
          </span>
        </div>
      </header>

      {/* Main Command Dashboard */}
      <main className="max-w-7xl mx-auto w-full p-8 space-y-8 flex-1">
        {/* Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-8 border border-slate-800 shadow-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            Dedicated SaaS Owner Command Surface
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Global Tenant Lifecycle & Multi-Hospital SaaS Governance
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Platform Super Admins maintain sovereign administrative authority over hospital tenants, subscription plans, usage quotas, and infrastructure telemetry with strict, cryptographic isolation from private hospital patient data.
          </p>
        </section>

        {/* 5 Core Super Admin Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Pillar 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Tenant Management</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create, provision, configure, activate, and deactivate hospital tenant instances.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">SaaS Subscriptions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tiered pricing plans, bed-count entitlements, feature flags, and billing cycle controls.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Platform Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              System-wide throughput, active tenant census, MongoDB Atlas cluster health, and API latency.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Security Ledger</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cross-tenant security logs, authentication event monitors, and administrative action audit trails.
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Support & Announcements</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global system maintenance banners, tenant support dispatch, and platform version releases.
            </p>
          </div>
        </section>

        {/* Security Boundary Warning Card */}
        <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              Strict Super Admin Authorization Boundary
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hospital Administrators are sovereign within their hospital and have zero platform permissions. Platform Super Admins govern SaaS plans and global tenant lifecycle with zero access to private hospital medical charts or clinical consultation data.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
        <p>HMS MedCore Multi-Tenant SaaS Platform — Super Admin Surface</p>
        <p className="font-mono text-[11px]">Surface: apps/super-admin</p>
      </footer>
    </div>
  );
}
