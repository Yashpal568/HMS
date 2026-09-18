'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  BookOpen,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { apiClient } from '@/lib/api-client';
import { LabTest, LabTestCategory } from '@hms/types';

export default function LabTestCatalogPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/lab/tests');
      if (res.success && res.data) {
        setTests(res.data);
        // Expand all by default
        const initialExpanded: Record<string, boolean> = {};
        res.data.forEach((t) => {
          initialExpanded[t._id || t.id] = true;
        });
        setExpandedTestIds(initialExpanded);
      }
    } catch (err) {
      console.error('Failed to load test catalog:', err);
      setError(err instanceof Error ? err.message : 'Unable to load test catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const toggleExpand = (id: string) => {
    setExpandedTestIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredTests = tests.filter((test) => {
    if (categoryFilter !== 'all' && test.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (test.code || '').toLowerCase();
      const name = (test.name || '').toLowerCase();
      const specimen = (test.specimenType || '').toLowerCase();
      const params = (test.parameters || [])
        .map((p: any) => p.name.toLowerCase())
        .join(' ');

      if (
        !code.includes(q) &&
        !name.includes(q) &&
        !specimen.includes(q) &&
        !params.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case LabTestCategory.HEMATOLOGY:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case LabTestCategory.BIOCHEMISTRY:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case LabTestCategory.MICROBIOLOGY:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case LabTestCategory.PATHOLOGY:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Hospital Operations', href: '/dashboard' },
        { label: 'Laboratory', href: '/laboratory' },
        { label: 'Diagnostic Test Master Catalog' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/laboratory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-teal-600" />
              Diagnostic Test Master Catalog
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative hospital directory of laboratory panels, specimen container requirements, normal reference intervals, and critical thresholds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/laboratory/orders/new">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
              >
                Order Test Requisition &rarr;
              </button>
            </Link>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchCatalog}
              className="px-3 py-1 bg-white border border-red-200 rounded-md font-semibold hover:bg-red-50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by test name, code, parameter, or specimen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={fetchCatalog}
              disabled={isLoading}
              className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors self-end md:self-auto"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
            {[
              { key: 'all', label: 'All Categories' },
              { key: LabTestCategory.HEMATOLOGY, label: 'Hematology' },
              { key: LabTestCategory.BIOCHEMISTRY, label: 'Biochemistry' },
              { key: LabTestCategory.MICROBIOLOGY, label: 'Microbiology' },
              { key: LabTestCategory.PATHOLOGY, label: 'Pathology' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat.key
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tests List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                <span>Loading diagnostic test catalog...</span>
              </div>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span className="font-semibold text-slate-600">No diagnostic tests matched your search criteria</span>
            </div>
          ) : (
            filteredTests.map((test) => {
              const testId = test._id || test.id;
              const isExpanded = expandedTestIds[testId] ?? true;

              return (
                <div
                  key={testId}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-colors hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(testId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleExpand(testId);
                    }}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-slate-50/40 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0 font-mono font-bold text-xs">
                        {test.code}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{test.name}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getCategoryColor(
                              test.category,
                            )}`}
                          >
                            {test.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Specimen: <strong className="text-slate-700">{test.specimenType}</strong></span>
                          <span>•</span>
                          <span>{test.parameters?.length || 0} measured parameters</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tariff Price</span>
                        <span className="text-sm font-bold text-slate-900 font-mono">₹{test.tariffPrice}</span>
                      </div>

                      <div className="p-1 rounded-md text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Parameter Matrix */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-white">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                        Configured Parameter Thresholds & Normal Ranges
                      </h4>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                              <th className="py-2 px-3">Parameter Name</th>
                              <th className="py-2 px-3">Standard Unit</th>
                              <th className="py-2 px-3">Normal Reference Interval</th>
                              <th className="py-2 px-3">Critical Alert Limits</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {test.parameters?.map((param: any, idx: number) => {
                              const hasNormal =
                                param.referenceMin !== undefined && param.referenceMax !== undefined;
                              const hasCrit =
                                param.criticalLow !== undefined || param.criticalHigh !== undefined;

                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                                    {param.name}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">
                                    {param.unit}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {hasNormal ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {param.referenceMin} – {param.referenceMax} {param.unit}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Descriptive / Qualitative</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {hasCrit ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                                        <AlertTriangle className="w-3 h-3" />
                                        &lt; {param.criticalLow ?? '-'} or &gt; {param.criticalHigh ?? '-'} {param.unit}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
