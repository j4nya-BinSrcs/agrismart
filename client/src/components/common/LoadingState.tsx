import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  variant?: 'spinner' | 'skeleton';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  subtext,
  variant = 'spinner',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className="w-full space-y-4 animate-pulse p-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800" />
          <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex flex-col items-center justify-center text-center">
      <Loader2 className="w-6 h-6 text-emerald-800 dark:text-emerald-400 animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{message}</p>
      {subtext && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm">{subtext}</p>}
    </div>
  );
};
