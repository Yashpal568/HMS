'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Activity } from 'lucide-react';

export default function RootPage() {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [token, isLoading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg animate-pulse">
          <Activity className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight">HMS MedCore Enterprise</h1>
          <p className="text-xs text-slate-400 mt-1">Routing to secure hospital workspace...</p>
        </div>
      </div>
    </div>
  );
}
