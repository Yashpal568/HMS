'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, CurrencyConfig } from '@/context/currency-context';
import { ChevronDown, Check, Coins } from 'lucide-react';

export function CurrencySelector({ className = '' }: { className?: string }) {
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/90 text-[11px] font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        title="Select system display currency"
        aria-label="Change currency"
        aria-expanded={isOpen}
      >
        <span className="font-bold text-sky-700">{currency.symbol.trim()}</span>
        <span className="text-slate-600 font-mono tracking-tight">{currency.code}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white p-1.5 shadow-lg border border-slate-200 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-2 mb-1">
            <Coins className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Display Currency
            </span>
          </div>

          <div className="space-y-0.5">
            {supportedCurrencies.map((c: CurrencyConfig) => {
              const isSelected = c.code === currency.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrency(c.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-900 font-semibold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-slate-800 font-bold text-xs">
                      {c.symbol.trim()}
                    </span>
                    <div>
                      <div className="text-slate-900 font-medium">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.code}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
