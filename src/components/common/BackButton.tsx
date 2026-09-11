/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

/**
 * Consistent in-app "Back to X" affordance used across Diagnose, Weather,
 * Irrigation, Sustainability, and Diagnosis Result screens (Section 8 of the
 * navigation plan). Shares one hover/active/focus treatment everywhere.
 */
export const BackButton: React.FC<BackButtonProps> = ({ label, onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 -ml-2.5 rounded-md transition-all cursor-pointer active:scale-[0.98] ${className}`}
    >
      <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </button>
  );
};
