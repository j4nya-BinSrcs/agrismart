import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import { ScreenType } from '../../types';

interface NotFoundScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-4">
        <Compass className="w-6 h-6" />
      </div>
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">404 Error</span>
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1 mb-2">Page not found</h1>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
        The requested screen or URL does not exist or has been moved. Use the navigation sidebar or return to your farm dashboard.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Farm Dashboard</span>
      </button>
    </div>
  );
};
