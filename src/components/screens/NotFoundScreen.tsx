/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Compass, MapPin, ArrowLeft, Home, LogIn, ScanLine, CloudSun, Droplets, MessageSquareHeart } from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Aurora from '../common/Aurora';

interface NotFoundScreenProps {
  onNavigate: (screen: ScreenType) => void;
  /** The raw path the browser attempted to load, shown for operator context. */
  requestedPath?: string;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate, requestedPath }) => {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const path = requestedPath || (typeof window !== 'undefined' ? window.location.pathname : '/');

  const quickLinks: { screen: ScreenType; label: string; icon: typeof ScanLine }[] = [
    { screen: 'diagnose', label: t('notFound.scanner', 'Scanner'), icon: ScanLine },
    { screen: 'weather', label: t('notFound.weather', 'Weather'), icon: CloudSun },
    { screen: 'irrigation', label: t('notFound.irrigation', 'Irrigation'), icon: Droplets },
    { screen: 'assistant', label: t('notFound.advisor', 'Advisor'), icon: MessageSquareHeart },
  ];

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      onNavigate(isAuthenticated ? 'dashboard' : 'landing');
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto py-16 sm:py-24 px-4 text-center overflow-hidden">
      {/* Same Aurora/background system used across the rest of the product —
          the 404 page never feels visually disconnected from the app. */}
      <div className="absolute inset-0 pointer-events-none opacity-10 sm:opacity-14 dark:opacity-14 dark:sm:opacity-22 overflow-hidden -z-10">
        <Aurora
          colorStops={['#075c45', '#1e896c', '#075c45']}
          blend={0.5}
          amplitude={0.8}
          speed={0.4}
          lightMode={theme === 'light'}
        />
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
        {/* Farm-themed compass badge with a subtle animated pulse ring */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <span className="absolute inset-0 rounded-full bg-emerald-400/30 dark:bg-emerald-500/20 animate-ping [animation-duration:2.5s]" />
          <div className="relative w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>
        </div>

        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-3">
          {t('notFound.badge', '404 · Route Not Found')}
        </span>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
          {t('notFound.title', 'Page Not Found')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed break-words">
          {t(
            'notFound.description',
            'The requested coordinate or operations route does not exist in your farm workspace. Use the actions below to get back on track.'
          )}
        </p>

        {/* Requested path indicator */}
        {path && (
          <div className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-6">
            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate max-w-[240px]" title={path}>
              {path}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('notFound.returnDashboard', 'Return to Farm Dashboard')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0"
            >
              <Home className="w-4 h-4" />
              <span>{t('notFound.returnHome', 'Return to Home')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('notFound.goBack', 'Go Back')}</span>
          </button>

          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all cursor-pointer active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('notFound.signIn', 'Operator Sign In')}</span>
            </button>
          )}
        </div>

        {/* Quick links to core modules — always available regardless of auth
            state; unauthenticated visitors land on login and continue there. */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            {t('notFound.quickLinks', 'Quick Links')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.screen}
                  type="button"
                  onClick={() => onNavigate(link.screen)}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:-translate-y-0.5 hover:shadow-xs text-slate-600 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-400 transition-all cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{link.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
