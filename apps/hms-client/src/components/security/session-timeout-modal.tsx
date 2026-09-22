'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';

const IDLE_WARNING_MS = 25 * 60 * 1000; // 25 minutes
const IDLE_LOGOUT_MS = 30 * 60 * 1000;  // 30 minutes
const COUNTDOWN_SECONDS = Math.floor((IDLE_LOGOUT_MS - IDLE_WARNING_MS) / 1000); // 300s (5 min)

export function SessionTimeoutModal() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isWarningVisible) {
      setIsWarningVisible(false);
      setSecondsRemaining(COUNTDOWN_SECONDS);
    }
  }, [isWarningVisible]);

  const extendSession = () => {
    lastActivityRef.current = Date.now();
    setIsWarningVisible(false);
    setSecondsRemaining(COUNTDOWN_SECONDS);
  };

  const executeLogout = useCallback(async () => {
    setIsWarningVisible(false);
    await logout();
    router.push('/login?expired=true');
  }, [logout, router]);

  useEffect(() => {
    if (!user) {
      setIsWarningVisible(false);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const onUserAction = () => {
      // If modal is not active, just update activity timestamp
      if (!isWarningVisible) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, onUserAction, { passive: true }));

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_LOGOUT_MS) {
        void executeLogout();
      } else if (elapsed >= IDLE_WARNING_MS) {
        setIsWarningVisible(true);
        const remaining = Math.max(0, Math.floor((IDLE_LOGOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        setIsWarningVisible(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onUserAction));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, isWarningVisible, executeLogout]);

  if (!isWarningVisible || !user) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-amber-200 text-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Session Inactivity Warning</h3>
            <p className="text-xs text-slate-500">HIPAA & Healthcare Data Protection</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-50/70 p-4 border border-amber-200/80">
          <p className="text-sm text-slate-700 leading-relaxed">
            You have been inactive for over 25 minutes. For patient data privacy and security, your workstation will
            automatically lock in:
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 px-4 border border-amber-300 shadow-xs">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <span className="text-2xl font-black tracking-wider text-amber-700">{formattedCountdown}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-end">
          <Button variant="outline" size="sm" onClick={() => void executeLogout()} className="text-slate-600">
            Log Out Now
          </Button>
          <Button variant="teal" size="sm" onClick={extendSession} className="font-semibold shadow-xs">
            Extend Session
          </Button>
        </div>
      </div>
    </div>
  );
}
