'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { useWorkspace } from '@/context/workspace-context';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
  CheckCircle2,
  X,
  ExternalLink,
  Building2,
  Stethoscope,
  Users,
  HeartPulse,
  Pill,
  FlaskConical,
  Receipt,
  Package,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const WORKSPACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HOSPITAL_ADMIN: Building2,
  DOCTOR: Stethoscope,
  RECEPTIONIST: Users,
  NURSE: HeartPulse,
  PHARMACIST: Pill,
  LAB_TECHNICIAN: FlaskConical,
  ACCOUNTANT: Receipt,
  INVENTORY_MANAGER: Package,
  DEPARTMENT_MANAGER: Briefcase,
};

export default function WorkspacesCatalogPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const { activeWorkspace, switchWorkspace } = useWorkspace();
  const router = useRouter();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>('/workspaces/templates');
      if (res?.data) {
        setTemplates(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Keep empty defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSwitchAndNavigate = async (code: string) => {
    await switchWorkspace(code);
    router.push('/dashboard');
  };

  return (
    <AppShell
      title="Workspaces Catalog"
      breadcrumbs={[
        { label: 'Hospital Administration', href: '/dashboard' },
        { label: 'Workspaces' },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Hospital Operational Workspaces</h1>
            <p className="text-xs text-slate-500">
              Pre-configured, role-specialized operational workstations tailored to clinical and operational workflows.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Active Workspace: {activeWorkspace.name.replace(' Workspace', '')}</span>
          </div>
        </div>

        {/* Workspaces Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/90">
            Loading workspaces catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((ws) => {
              const Icon = WORKSPACE_ICONS[ws.code] || Layers;
              const isActive = activeWorkspace.code === ws.code;

              return (
                <div
                  key={ws.code}
                  className={cn(
                    'rounded-3xl bg-white border p-6 flex flex-col justify-between space-y-5 transition-all shadow-2xs hover:shadow-md',
                    isActive ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-200/90 hover:border-slate-300',
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs',
                            isActive
                              ? 'bg-gradient-to-br from-teal-600 to-teal-800'
                              : 'bg-slate-900',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{ws.name}</h3>
                          <span className="font-mono text-2xs font-semibold text-teal-700">{ws.code}</span>
                        </div>
                      </div>

                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {ws.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Scope</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{ws.defaultScope}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation Modules</span>
                        <span className="font-semibold text-teal-700 text-[11px]">{ws.navigation?.length || 0} Modules</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Navigation Scope
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(ws.navigation || []).map((nav: string) => (
                          <span
                            key={nav}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {nav}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTemplate(ws)}
                      className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
                    >
                      Inspect
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleSwitchAndNavigate(ws.code)}
                      className={cn(
                        'text-xs font-semibold',
                        isActive
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-teal-600 text-white hover:bg-teal-700',
                      )}
                    >
                      {isActive ? 'Current Active' : 'Switch & Open'}
                      {!isActive && <ArrowRight className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inspect Workspace Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTemplate.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedTemplate.code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purpose & Cockpit</span>
                  <p className="text-slate-700 mt-0.5">{selectedTemplate.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Scope</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{selectedTemplate.defaultScope}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge Accent</span>
                    <p className="font-semibold text-teal-700 capitalize mt-0.5">{selectedTemplate.badgeColor}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Allowed Actions & Capabilities
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    {(selectedTemplate.allowedActions || []).map((action: string) => (
                      <div key={action} className="flex items-center gap-2 text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span className="font-mono text-[11px]">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleSwitchAndNavigate(selectedTemplate.code);
                    setSelectedTemplate(null);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  Activate Workspace
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
