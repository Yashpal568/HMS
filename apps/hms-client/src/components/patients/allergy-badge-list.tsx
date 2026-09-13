'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { PatientAllergy, AllergySeverity } from '@hms/types';

interface AllergyBadgeListProps {
  allergies?: PatientAllergy[];
  compact?: boolean;
  showNone?: boolean;
}

export function AllergyBadgeList({
  allergies = [],
  compact = false,
  showNone = true,
}: AllergyBadgeListProps) {
  if (!allergies || allergies.length === 0) {
    if (!showNone) return null;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 bg-slate-100/70 border border-dashed border-slate-300">
        <Info className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        No known allergies recorded (NKDA)
      </span>
    );
  }

  // Sort severe allergies first for clinical safety
  const sorted = [...allergies].sort((a, b) => {
    const order: Record<AllergySeverity, number> = {
      [AllergySeverity.SEVERE]: 0,
      [AllergySeverity.MODERATE]: 1,
      [AllergySeverity.MILD]: 2,
    };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sorted.map((allergy, idx) => {
        const isSevere = allergy.severity === AllergySeverity.SEVERE;
        const isModerate = allergy.severity === AllergySeverity.MODERATE;

        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        let IconComponent = Info;

        if (isSevere) {
          badgeStyle = 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-500/20 font-semibold';
          IconComponent = AlertTriangle;
        } else if (isModerate) {
          badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
          IconComponent = AlertCircle;
        }

        return (
          <span
            key={`${allergy.allergen}-${idx}`}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs transition-colors ${badgeStyle}`}
            title={allergy.notes ? `${allergy.notes} (${allergy.category})` : `${allergy.severity.toUpperCase()} (${allergy.category})`}
          >
            <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSevere ? 'text-red-600 animate-pulse' : isModerate ? 'text-amber-600' : 'text-slate-500'}`} aria-hidden="true" />
            <span>{allergy.allergen}</span>
            {!compact && (
              <span className="text-[10px] opacity-75 uppercase tracking-wider font-mono">
                ({allergy.severity})
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
