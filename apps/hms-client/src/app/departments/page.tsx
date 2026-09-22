'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Stethoscope,
  Bed,
  Users,
  Search,
  Activity,
  ArrowRight,
  Shield,
  FlaskConical,
  Pill,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  code: string;
  hod: string;
  hodRole: string;
  activePatients: number;
  totalBeds: number;
  occupiedBeds: number;
  doctorsCount: number;
  status: 'On Track' | 'Busy' | 'Normal';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  route: string;
}

const DEPARTMENTS: Department[] = [
  {
    id: 'dept-gen-med',
    name: 'General Medicine',
    code: 'GMED',
    hod: 'Dr. Rajesh Sharma',
    hodRole: 'Chief Medical Officer',
    activePatients: 18,
    totalBeds: 15,
    occupiedBeds: 11,
    doctorsCount: 4,
    status: 'On Track',
    description: 'Comprehensive adult outpatient care, internal disorders & acute diagnostic triage.',
    icon: Stethoscope,
    color: 'teal',
    route: '/appointments',
  },
  {
    id: 'dept-cardio',
    name: 'Cardiology',
    code: 'CARD',
    hod: 'Dr. Rajesh Sharma',
    hodRole: 'Lead Cardiologist',
    activePatients: 24,
    totalBeds: 10,
    occupiedBeds: 9,
    doctorsCount: 3,
    status: 'Busy',
    description: 'Cardiac catheterization, electrophysiology, echocardiography & heart failure management.',
    icon: Activity,
    color: 'rose',
    route: '/appointments',
  },
  {
    id: 'dept-ortho',
    name: 'Orthopedics & Joint Care',
    code: 'ORTH',
    hod: 'Dr. Priya Nair',
    hodRole: 'Orthopedic Consultant',
    activePatients: 12,
    totalBeds: 12,
    occupiedBeds: 8,
    doctorsCount: 2,
    status: 'On Track',
    description: 'Musculoskeletal surgery, trauma fracture reduction, joint arthroplasty & rehabilitation.',
    icon: Shield,
    color: 'blue',
    route: '/appointments',
  },
  {
    id: 'dept-pedia',
    name: 'Pediatrics & Neonatology',
    code: 'PED',
    hod: 'Dr. Amit Khan',
    hodRole: 'Pediatric Specialist',
    activePatients: 15,
    totalBeds: 8,
    occupiedBeds: 7,
    doctorsCount: 3,
    status: 'Busy',
    description: 'Specialized healthcare from neonates through adolescents including immunization schedules.',
    icon: Users,
    color: 'amber',
    route: '/appointments',
  },
  {
    id: 'dept-derma',
    name: 'Dermatology & Skin',
    code: 'DERM',
    hod: 'Dr. Sneha Iyer',
    hodRole: 'Consultant Dermatologist',
    activePatients: 9,
    totalBeds: 4,
    occupiedBeds: 2,
    doctorsCount: 2,
    status: 'On Track',
    description: 'Dermatopathology, clinical skin disorders, allergy patch tests & outpatient procedures.',
    icon: Sparkles,
    color: 'purple',
    route: '/appointments',
  },
  {
    id: 'dept-ipd',
    name: 'Inpatient Wards & ICU',
    code: 'IPD',
    hod: 'Anita Roy',
    hodRole: 'Ward Nursing Superintendent',
    activePatients: 48,
    totalBeds: 60,
    occupiedBeds: 48,
    doctorsCount: 6,
    status: 'Normal',
    description: '24/7 continuous nursing monitoring, post-operative suites, critical care and step-down beds.',
    icon: Bed,
    color: 'indigo',
    route: '/ipd',
  },
  {
    id: 'dept-lab',
    name: 'Diagnostic Pathology & Lab',
    code: 'LAB',
    hod: 'Neha Kapoor',
    hodRole: 'Chief Laboratory Technologist',
    activePatients: 36,
    totalBeds: 0,
    occupiedBeds: 0,
    doctorsCount: 2,
    status: 'On Track',
    description: 'Automated hematology, clinical chemistry, microbiological cultures & biopsy evaluations.',
    icon: FlaskConical,
    color: 'emerald',
    route: '/laboratory',
  },
  {
    id: 'dept-pharm',
    name: 'Central Hospital Pharmacy',
    code: 'PHAR',
    hod: 'Vikram Malhotra',
    hodRole: 'Superintending Pharmacist',
    activePatients: 42,
    totalBeds: 0,
    occupiedBeds: 0,
    doctorsCount: 2,
    status: 'Normal',
    description: 'Inpatient medication carts, ambulatory dispensary, narcotics vault & FEFO inventory allocation.',
    icon: Pill,
    color: 'teal',
    route: '/pharmacy',
  },
];

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');

  const filteredDepts = DEPARTMENTS.filter(
    (dept) =>
      dept.name.toLowerCase().includes(search.toLowerCase()) ||
      dept.code.toLowerCase().includes(search.toLowerCase()) ||
      dept.hod.toLowerCase().includes(search.toLowerCase()) ||
      dept.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppShell
      title="Clinical Departments"
      breadcrumbs={[
        { label: 'Clinical & Staff' },
        { label: 'Departments' },
      ]}
    >
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        {/* HERO BANNER */}
        <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-teal-900 via-slate-900 to-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                <Building2 className="h-4 w-4" />
                <span>Hospital Organizational Architecture</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Clinical Departments & Specialty Services
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl">
                Review operational clinical divisions, active patient volumes, departmental heads,
                and bed occupancy quotas for CityCare Hospital Main Campus.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/staff">
                <Button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  <span>View Department Staff</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Active Departments</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">8</div>
            <p className="text-[11px] text-teal-600 font-medium mt-1">Full clinical coverage</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Total Inpatient Beds</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">60</div>
            <p className="text-[11px] text-slate-400 mt-1">80% occupied (48/60)</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Consultants & Clinicians</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">25</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Active on shifts</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Active Patient Flow</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">126</div>
            <p className="text-[11px] text-slate-400 mt-1">In consultation & admitted</p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search department by name, code, or head of department..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* DEPARTMENTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => {
            const Icon = dept.icon;
            return (
              <div
                key={dept.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between hover:border-teal-300 hover:shadow-xs transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100 group-hover:scale-105 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {dept.name}
                          </h3>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {dept.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Head: <span className="text-slate-700 font-medium">{dept.hod}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        dept.status === 'Busy'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      )}
                    >
                      {dept.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {dept.description}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Patients</p>
                      <p className="text-xs font-bold text-slate-800">{dept.activePatients}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Doctors</p>
                      <p className="text-xs font-bold text-slate-800">{dept.doctorsCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Beds</p>
                      <p className="text-xs font-bold text-slate-800">
                        {dept.totalBeds > 0 ? `${dept.occupiedBeds}/${dept.totalBeds}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/staff?department=${encodeURIComponent(dept.name)}`}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    View Roster
                  </Link>

                  <Link
                    href={dept.route}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
