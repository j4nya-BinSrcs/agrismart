import React from 'react';
import { Compass, ArrowLeft, Home, LogIn } from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NotFoundScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-full max-w-lg mx-auto py-16 sm:py-24 px-4 text-center">
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <Compass className="w-7 h-7" />
        </div>
        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
          404 · Route Not Found
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
          Plot or Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
          The requested coordinate or operations route does not exist in your farm workspace. Use the actions below to get back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Farm Dashboard</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Operator Sign In</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
