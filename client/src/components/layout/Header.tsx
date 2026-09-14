import React, { useState } from 'react';
import {
  Bell,
  MapPin,
  ChevronDown,
  Check,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { ScreenType, WeatherCondition, IrrigationPlan } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onToggleMobileSidebar: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  weather?: WeatherCondition;
  irrigationPlan?: IrrigationPlan;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onToggleMobileSidebar,
  onOpenNotifications,
  unreadCount,
  weather,
  irrigationPlan,
}) => {
  const { isDemo } = useAuth();
  const { farms, activeFarm, setActiveFarmId, locationLabel } = useFarm();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [showFarmMenu, setShowFarmMenu] = useState(false);

  const displayFarmName = activeFarm?.name || 'No farm selected';
  const displayLocation = locationLabel || 'Set location in Management';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFarmMenu(!showFarmMenu)}
              className="flex items-center gap-2 text-left transition-colors cursor-pointer py-1"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                  <span>{displayFarmName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{displayLocation}</span>
                </div>
              </div>
            </button>

            {showFarmMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFarmMenu(false)} />
                <div className="absolute left-0 mt-2 w-72 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-20">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Select Farm
                  </div>
                  {farms.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowFarmMenu(false);
                        onNavigate('management');
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-md text-xs text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Add a farm in Management
                    </button>
                  ) : (
                    farms.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setActiveFarmId(f.id);
                          setShowFarmMenu(false);
                          showToast(`Switched to ${f.name}`, 'info');
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors flex items-start justify-between cursor-pointer ${
                          activeFarm?.id === f.id
                            ? 'bg-slate-100 dark:bg-slate-800 font-medium'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{f.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{f.location}</div>
                        </div>
                        {activeFarm?.id === f.id && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowFarmMenu(false);
                      onNavigate('management');
                    }}
                    className="w-full text-left px-2.5 py-2 mt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-400 cursor-pointer"
                  >
                    Manage farms & fields
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          onClick={() => onNavigate('weather')}
          className="hidden md:flex relative items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
          title="View Weather details"
        >
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {weather?.temperature !== undefined ? `${weather.temperature}°C` : '—'}
          </span>
          <span className="text-slate-300">·</span>
          <span>
            {weather?.rainProbability !== undefined
              ? `${weather.rainProbability}% rain`
              : 'Loading weather'}
          </span>
          {isDemo && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium">Demo</span>
            </>
          )}
          {!isDemo && irrigationPlan?.overallRecommendation && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium truncate max-w-[140px]">
                {irrigationPlan.overallRecommendation.toLowerCase().includes('delay')
                  ? 'Irrigation delayed'
                  : irrigationPlan.overallRecommendation.toLowerCase().includes('irrigat')
                    ? 'Check irrigation'
                    : 'Weather advisory'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Farm notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              toggleTheme();
              showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode', 'info');
            }}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
