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
      dotColor = 'bg-emerald-600';
      textColor = 'text-emerald-800';
      defaultText = status === 'healthy' ? 'Healthy' : 'Optimal';
      break;
    case 'warning':
    case 'moderate':
    case 'delay':
      dotColor = 'bg-amber-500';
      textColor = 'text-amber-800';
      defaultText = status === 'delay' ? 'Delay Advised' : 'Attention';
      break;
    case 'urgent':
    case 'severe':
      dotColor = 'bg-rose-600';
      textColor = 'text-rose-800';
      defaultText = 'Critical';
      break;
    case 'info':
    default:
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-700';
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

