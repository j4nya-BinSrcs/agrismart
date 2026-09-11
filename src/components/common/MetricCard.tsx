import React from 'react';
import { LucideIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface MetricCardProps {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'optimal' | 'warning' | 'moderate' | 'urgent' | 'severe' | 'info' | 'delay';
  statusLabel?: string;
  icon?: LucideIcon;
  insight: string;
  actionText?: string;
  onClickAction?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  unit,
  status,
  statusLabel,
  insight,
  actionText,
  onClickAction,
}) => {
  return (
    <div
      id={id}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-xs transition-colors"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <StatusBadge status={status} label={statusLabel} size="sm" />
        </div>

        <div className="flex items-baseline gap-1 mb-1.5">
          <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </span>
          {unit && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{unit}</span>}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {insight}
        </p>
      </div>

      {actionText && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between text-xs">
          <span className="text-emerald-800 dark:text-emerald-400 font-medium">{actionText}</span>
          {onClickAction && (
            <button
              type="button"
              onClick={onClickAction}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Details
            </button>
          )}
        </div>
      )}
    </div>
  );
};

