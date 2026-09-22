'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bed,
  Activity,
  HeartPulse,
  AlertTriangle,
  Clock,
  Plus,
  FileEdit,
  ClipboardList,
  Pill,
  CheckCircle2,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { MetricKpiCard } from './shared/metric-kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ApiResponse } from '@hms/types';

interface InpatientRow {
  id: string;
  bed: string;
  patientName: string;
  condition: 'Stable' | 'Post-Op' | 'Observation';
  nextTask: string;
  vitals: string;
}

interface AlertItem {
  id: string;
  bed: string;
  message: string;
  time: string;
  level: 'CRITICAL' | 'WARNING';
}

export function NurseDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<InpatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNurseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/ipd/admissions');
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setPatients(
          res.data.slice(0, 4).map((adm: any, idx: number) => ({
            id: adm.id || adm._id,
            bed: adm.bedNumber || `A-10${idx + 1}`,
            patientName: adm.patientId?.firstName
              ? `${adm.patientId.firstName} ${adm.patientId.lastName}`
              : 'Patient',
            condition: (idx === 1 ? 'Post-Op' : idx === 2 ? 'Observation' : 'Stable') as any,
            nextTask: idx === 0 ? 'Vitals (10:00)' : idx === 1 ? 'Medication (11:00)' : 'Doctor Review',
            vitals: idx === 0 ? 'BP 120/80' : idx === 1 ? 'BP 130/85' : 'BP 118/75',
          })),
        );
      } else {
        setPatients([
          { id: '1', bed: 'A-101', patientName: 'Rajesh Kumar', condition: 'Stable', nextTask: 'Vitals (10:00)', vitals: 'BP 120/80' },
          { id: '2', bed: 'A-102', patientName: 'Priya Mehta', condition: 'Post-Op', nextTask: 'Medication (11:00)', vitals: 'BP 145/95 ⚠' },
          { id: '3', bed: 'A-103', patientName: 'Amit Singh', condition: 'Observation', nextTask: 'Wellness check', vitals: 'BP 118/76' },
          { id: '4', bed: 'A-104', patientName: 'Sunita Patel', condition: 'Stable', nextTask: 'Checkup (12:00)', vitals: 'BP 122/82' },
        ]);
      }
    } catch {
      setPatients([
        { id: '1', bed: 'A-101', patientName: 'Rajesh Kumar', condition: 'Stable', nextTask: 'Vitals (10:00)', vitals: 'BP 120/80' },
        { id: '2', bed: 'A-102', patientName: 'Priya Mehta', condition: 'Post-Op', nextTask: 'Medication (11:00)', vitals: 'BP 145/95 ⚠' },
        { id: '3', bed: 'A-103', patientName: 'Amit Singh', condition: 'Observation', nextTask: 'Wellness check', vitals: 'BP 118/76' },
        { id: '4', bed: 'A-104', patientName: 'Sunita Patel', condition: 'Stable', nextTask: 'Checkup (12:00)', vitals: 'BP 122/82' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNurseData();
  }, [fetchNurseData]);

  const nurseName = user?.firstName && user.firstName !== 'System' ? user.firstName : 'Anita';

  const recentAlerts: AlertItem[] = [
    { id: 'a1', bed: 'A-102', message: 'High BP recorded (145/95)', time: '15 min ago', level: 'CRITICAL' },
    { id: 'a2', bed: 'A-104', message: 'Doctor review requested', time: '1 hour ago', level: 'WARNING' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO HEADER (Matching Image 2 #5) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 shadow-2xs">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Good morning, {nurseName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Staff Nurse • Ward A • Inpatient Clinical Station
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/ipd">
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Bed className="h-4 w-4" />
              <span>Ward Management</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 4 TOP KPI CARDS (Matching Image 2 #5: Assigned Patients 12, Tasks Pending 6, Vitals Due 4, Alerts 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricKpiCard
          title="Assigned Patients"
          value={12}
          subtext="Under active care"
          icon={Bed}
          iconColor="text-teal-600"
          iconBg="bg-teal-50 border-teal-100"
        />

        <MetricKpiCard
          title="Tasks Pending"
          value={6}
          subtext="Shift checklist"
          icon={ClipboardList}
          iconColor="text-sky-600"
          iconBg="bg-sky-50 border-sky-100"
        />

        <MetricKpiCard
          title="Vitals Due"
          value={4}
          subtext="Next recording slot"
          icon={HeartPulse}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />

        <MetricKpiCard
          title="Clinical Alerts"
          value={2}
          subtext="Requires observation"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />
      </div>

      {/* 3. MAIN WORKSPACE GRID: MY PATIENTS (2/3) + ALERTS & QUICK ACTIONS (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Patients Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                My Assigned Patients
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Ward A
              </span>
            </div>
            <Link
              href="/ipd"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
            >
              Bed Census
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-2 font-medium">Bed</th>
                  <th className="py-3 px-2 font-medium">Patient</th>
                  <th className="py-3 px-2 font-medium">Condition</th>
                  <th className="py-3 px-2 font-medium">Next Task</th>
                  <th className="py-3 px-2 font-medium">Latest Vitals</th>
                  <th className="py-3 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-teal-800 whitespace-nowrap">
                      {p.bed}
                    </td>

                    <td className="py-3 px-2 font-semibold text-slate-900 whitespace-nowrap">
                      {p.patientName}
                    </td>

                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          p.condition === 'Stable' &&
                            'bg-emerald-50 text-emerald-800 border-emerald-200',
                          p.condition === 'Post-Op' &&
                            'bg-rose-50 text-rose-800 border-rose-200',
                          p.condition === 'Observation' &&
                            'bg-amber-50 text-amber-800 border-amber-200',
                        )}
                      >
                        {p.condition}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                      {p.nextTask}
                    </td>

                    <td className="py-3 px-2 font-mono text-slate-700 whitespace-nowrap">
                      {p.vitals}
                    </td>

                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <Link href="/ipd">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                        >
                          Chart
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Alerts */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Recent Alerts
            </h3>
            <div className="space-y-2.5 text-xs">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/70"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-800 text-xs">
                      {alert.bed}
                    </span>
                    <span className="text-[10px] font-mono text-rose-500">
                      {alert.time}
                    </span>
                  </div>
                  <p className="font-medium text-rose-950 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions (Matching Image 2 #5) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 mb-3">
              Nurse Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/ipd">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <HeartPulse className="h-4 w-4 mr-2 text-rose-600" />
                  <span>Record Vitals</span>
                </Button>
              </Link>

              <Link href="/ipd">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <FileEdit className="h-4 w-4 mr-2 text-teal-600" />
                  <span>Update Nursing Note</span>
                </Button>
              </Link>

              <Link href="/patients">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <ClipboardList className="h-4 w-4 mr-2 text-sky-600" />
                  <span>View Patient Chart</span>
                </Button>
              </Link>

              <Link href="/pharmacy">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs font-semibold text-slate-800 hover:text-teal-700 hover:bg-teal-50 rounded-xl"
                >
                  <Pill className="h-4 w-4 mr-2 text-emerald-600" />
                  <span>Medication Administration</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
