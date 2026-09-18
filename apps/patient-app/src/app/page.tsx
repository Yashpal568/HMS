import React from "react";
import {
  HeartPulse,
  Building2,
  Stethoscope,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

export default function PatientAppHomePage() {
  return (
    <main className="min-h-screen max-w-md mx-auto bg-white border-x border-slate-200/80 shadow-sm flex flex-col pb-12">
      {/* Header Bar */}
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
              Patient Care
            </h1>
            <p className="text-[10px] text-teal-600 font-medium tracking-wide uppercase mt-0.5">
              HMS Healthcare Platform
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80 text-[11px] font-semibold">
          Mobile App Surface
        </span>
      </header>

      {/* Hero Content */}
      <section className="p-5 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white shadow-md shadow-teal-700/10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-medium text-teal-100">
            <Smartphone className="w-3.5 h-3.5" />
            Dedicated Patient Healthcare Surface
          </div>
          <h2 className="text-xl font-bold leading-snug">
            Your Health Journey, Simplified & Connected
          </h2>
          <p className="text-xs text-teal-100/90 leading-relaxed">
            Discover verified hospitals, book specialist doctor appointments, track your OPD queue position in real-time, and access personal medical records securely.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Feature 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Hospital Discovery</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Search verified network clinics, departments, facilities, and contact points.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Doctor Profiles</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Explore consultant specialties, credentials, verified reviews, and OPD schedules.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Easy Booking</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Reserve guaranteed consultation slots, reschedule, or manage appointment history.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Real-Time Queue</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Live token tracker, patients ahead count, estimated wait time, and turn alerts.
            </p>
          </div>
        </div>

        {/* Real-time Queue Demo Card */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Live OPD Queue Tracking Architecture</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-semibold">
              Phase 1 Architecture
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Your OPD Token</p>
              <p className="text-lg font-mono font-bold text-teal-400">A-027</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-400">Currently Serving</p>
              <p className="text-lg font-mono font-bold text-amber-400">A-019</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Patients Ahead</p>
              <p className="text-lg font-mono font-bold text-slate-200">8</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            Estimated wait time: ~42 minutes (Dr. Rajesh Sharma, Cardiology)
          </p>
        </div>

        {/* Security & Confidentiality */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Confidential & Sovereign Healthcare Records</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Patient health records, prescriptions, and lab reports are encrypted and strictly confidential. Patient medical records are never publicly discoverable.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-5 pt-4 text-center text-xs text-slate-400 border-t border-slate-100">
        <p>HMS MedCore Multi-Tenant SaaS Platform</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Application Surface: apps/patient-app</p>
      </footer>
    </main>
  );
}
