'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health-check', { method: 'HEAD', cache: 'no-cache' }).catch(() => null);
      if (res && res.ok) {
        setIsOffline(false);
      } else if (navigator.onLine) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[10000] bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between transition-all duration-300 animate-in slide-in-from-top text-xs sm:text-sm font-medium"
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse text-white" />
        <span>
          <strong>Network Disconnected:</strong> You are currently working offline. Clinical orders and patient records
          will not sync until connectivity is restored.
        </span>
      </div>
      <button
        onClick={handleManualCheck}
        disabled={isChecking}
        className="ml-4 shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        <span>{isChecking ? 'Checking...' : 'Retry'}</span>
      </button>
    </div>
  );
}
