import React from 'react';
import { ActionItem } from '../../types';
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface ActionCardProps {
  action: ActionItem;
  onToggleComplete: (id: string) => void;
  onNavigate?: (route: ActionItem['actionRoute']) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onToggleComplete,
  onNavigate,
}) => {
  const getStatusMapping = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return { status: 'urgent' as const, label: 'Critical' };
      case 'recommended':
        return { status: 'warning' as const, label: 'Attention' };
      case 'informational':
      default:
        return { status: 'info' as const, label: 'Routine' };
    }
  };

  const statusInfo = getStatusMapping(action.priority);

  return (
    <div
      id={`action-item-${action.id}`}
      className={`rounded-lg border p-4 transition-all ${
        action.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleComplete(action.id)}
          className="mt-0.5 text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
          title={action.completed ? 'Mark pending' : 'Mark completed'}
        >
          {action.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5 text-xs text-slate-500 dark:text-slate-400">
            <StatusBadge status={statusInfo.status} label={statusInfo.label} size="sm" />
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="capitalize">{action.category.replace('_', ' ')}</span>
            {action.cropAffected && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-700 dark:text-slate-300">{action.cropAffected}</span>
              </>
            )}
            <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {action.timeframe}
            </span>
          </div>

          <h4
            className={`text-sm font-semibold mb-1 ${
              action.completed ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {action.title}
          </h4>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-2 font-normal">
            {action.actionText}
          </p>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 py-1">
            <span className="text-slate-700 dark:text-slate-300 font-medium shrink-0">Reason:</span>
            <span>{action.reason}</span>
          </div>

          {action.actionRoute && onNavigate && !action.completed && (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate(action.actionRoute)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <span>
                  {action.actionRoute === 'diagnosis-result'
                    ? 'View Diagnosis Report'
                    : action.actionRoute === 'irrigation'
                    ? 'View Irrigation Plan'
                    : action.actionRoute === 'weather'
                    ? 'View Weather Timeline'
                    : `View ${action.actionRoute.replace('-', ' ')}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

