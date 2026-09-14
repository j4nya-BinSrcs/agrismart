import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'optimal' | 'warning' | 'moderate' | 'urgent' | 'severe' | 'info' | 'delay';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-600';
  let defaultText = 'Information';

  switch (status) {
    case 'healthy':
    case 'optimal':
      dotColor = 'bg-emerald-600 dark:bg-emerald-400';
      textColor = 'text-emerald-800 dark:text-emerald-400';
      defaultText = status === 'healthy' ? 'Healthy' : 'Optimal';
      break;
    case 'warning':
    case 'moderate':
    case 'delay':
      dotColor = 'bg-amber-500 dark:bg-amber-400';
      textColor = 'text-amber-800 dark:text-amber-400';
      defaultText = status === 'delay' ? 'Delay Advised' : 'Attention';
      break;
    case 'urgent':
    case 'severe':
      dotColor = 'bg-rose-600 dark:bg-rose-400';
      textColor = 'text-rose-800 dark:text-rose-400';
      defaultText = 'Critical';
      break;
    case 'info':
    default:
      dotColor = 'bg-slate-400 dark:bg-slate-500';
      textColor = 'text-slate-700 dark:text-slate-300';
      defaultText = 'Info';
      break;
  }

  const textSizes = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <span
      id={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 font-medium ${textColor} ${textSizes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label || defaultText}</span>
    </span>
  );
};

