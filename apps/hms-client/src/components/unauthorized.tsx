'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UnauthorizedProps {
  requiredPermission?: string;
}

export function Unauthorized({ requiredPermission }: UnauthorizedProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-amber-50/50 border border-amber-200 rounded-lg text-center max-w-md mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Access Restricted</h3>
      <p className="text-sm text-slate-600 mb-4">
        Your assigned hospital role does not have permission to access this resource
        {requiredPermission ? ` (${requiredPermission})` : ''}.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Overview
      </Link>
    </div>
  );
}
