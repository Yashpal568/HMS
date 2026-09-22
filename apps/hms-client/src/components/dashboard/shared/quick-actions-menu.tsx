'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  UserPlus,
  CalendarPlus,
  UserCheck,
  FileSpreadsheet,
  BedDouble,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    {
      title: 'Register Patient',
      desc: 'Create new patient UHID file',
      href: '/patients/register',
      icon: UserPlus,
      color: 'text-teal-600 bg-teal-50',
    },
    {
      title: 'Invite / Add Staff User',
      desc: 'Provision doctor, nurse or staff',
      href: '/staff?action=invite',
      icon: UserCheck,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      title: 'Create Appointment',
      desc: 'Book OPD slot & queue token',
      href: '/appointments',
      icon: CalendarPlus,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      title: 'Admit Patient (IPD)',
      desc: 'Assign bed and inpatient ward',
      href: '/ipd/admissions/new',
      icon: BedDouble,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Order Lab Test',
      desc: 'Create diagnostic requisition',
      href: '/laboratory/orders/new',
      icon: FlaskConical,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Generate Census Report',
      desc: 'Operational & clinical summary',
      href: '/reports',
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl px-4 py-2 shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
      >
        <span>Quick Actions</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hospital Operations
            </p>
          </div>
          <div className="mt-1 space-y-1">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <Link
                  key={act.title}
                  href={act.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-start gap-2.5 rounded-xl p-2 hover:bg-slate-50 transition-colors"
                >
                  <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', act.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {act.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
