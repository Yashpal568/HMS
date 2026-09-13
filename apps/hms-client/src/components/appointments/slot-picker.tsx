'use client';

import React from 'react';
import { AvailableSlot } from '@hms/types';
import { cn } from '@/lib/utils';
import { Clock, Sun, Sunset, Check, Ban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SlotPickerProps {
  slots: AvailableSlot[];
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
  disabled = false,
}: SlotPickerProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Clock className="w-4 h-4 animate-spin text-teal-600" />
          <span>Loading doctor schedule & available slots...</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <Ban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">No time slots available</p>
        <p className="text-xs text-slate-500 mt-1">
          The doctor is not scheduled for outpatient consultations on this date. Please select another date or doctor.
        </p>
      </div>
    );
  }

  // Split into Morning (< 12:00) and Afternoon (>= 12:00)
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.timeSlot.split(':')[0], 10);
    return hour < 12;
  });

  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.timeSlot.split(':')[0], 10);
    return hour >= 12;
  });

  const availableCount = slots.filter((s) => s.isAvailable).length;
  const bookedCount = slots.length - availableCount;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
        <span>Click a slot to reserve your appointment time</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{availableCount} Available</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span>{bookedCount} Booked</span>
          </span>
        </div>
      </div>

      {morningSlots.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Morning Session</span>
            <span className="text-slate-400 font-normal">({morningSlots.filter((s) => s.isAvailable).length} open)</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {morningSlots.map((slot) => {
              const isSelected = selectedSlot === slot.timeSlot;
              const isAvail = slot.isAvailable;

              return (
                <button
                  key={slot.timeSlot}
                  type="button"
                  disabled={!isAvail || disabled}
                  onClick={() => onSelectSlot(slot.timeSlot)}
                  className={cn(
                    'relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border shadow-xs',
                    isAvail && !isSelected &&
                      'bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:text-teal-900 active:scale-98',
                    isAvail && isSelected &&
                      'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/20 ring-2 ring-teal-600/20 scale-[1.02]',
                    !isAvail &&
                      'bg-slate-100/70 border-slate-200/80 text-slate-400 cursor-not-allowed line-through'
                  )}
                >
                  <Clock className={cn('w-3.5 h-3.5', isSelected ? 'text-teal-100' : 'text-slate-400')} />
                  <span>{slot.timeSlot}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {afternoonSlots.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Sunset className="w-4 h-4 text-orange-500" />
            <span>Afternoon & Evening Session</span>
            <span className="text-slate-400 font-normal">({afternoonSlots.filter((s) => s.isAvailable).length} open)</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {afternoonSlots.map((slot) => {
              const isSelected = selectedSlot === slot.timeSlot;
              const isAvail = slot.isAvailable;

              return (
                <button
                  key={slot.timeSlot}
                  type="button"
                  disabled={!isAvail || disabled}
                  onClick={() => onSelectSlot(slot.timeSlot)}
                  className={cn(
                    'relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border shadow-xs',
                    isAvail && !isSelected &&
                      'bg-white border-slate-200 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:text-teal-900 active:scale-98',
                    isAvail && isSelected &&
                      'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/20 ring-2 ring-teal-600/20 scale-[1.02]',
                    !isAvail &&
                      'bg-slate-100/70 border-slate-200/80 text-slate-400 cursor-not-allowed line-through'
                  )}
                >
                  <Clock className={cn('w-3.5 h-3.5', isSelected ? 'text-teal-100' : 'text-slate-400')} />
                  <span>{slot.timeSlot}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
