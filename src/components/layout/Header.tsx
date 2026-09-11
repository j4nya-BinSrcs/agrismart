import React, { useState } from 'react';
import {
  Bell,
  MapPin,
  ChevronDown,
  Camera,
  Check,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { ScreenType, Language } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onToggleMobileSidebar: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onResetDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  currentLanguage,
  onLanguageChange,
  onToggleMobileSidebar,
  onOpenNotifications,
  unreadCount,
}) => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [showFarmMenu, setShowFarmMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [selectedFarm, setSelectedFarm] = useState('Patel Farm (Anand, Gujarat)');

  const farms = [
    { id: 'f1', name: 'Patel Farm (Anand, Gujarat)', size: '18.5 Acres', crops: 'Tomato, Cotton, Wheat' },
    { id: 'f2', name: 'Narmada Valley Plot (Bharuch)', size: '12.0 Acres', crops: 'Sugarcane, Banana' },
  ];

  const languages = [
    { code: 'en' as Language, label: 'English', native: 'English' },
    { code: 'hi' as Language, label: 'Hindi', native: 'हिन्दी' },
    { code: 'gu' as Language, label: 'Gujarati', native: 'ગુજરાતી' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle + Farm Selector */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Farm Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFarmMenu(!showFarmMenu)}
              className="flex items-center gap-2 text-left transition-colors cursor-pointer py-1"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                  <span>{selectedFarm.split('(')[0].trim()}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span>Anand, Gujarat · 18.5 Ac</span>
                </div>
              </div>
            </button>

            {/* Farm Switcher Menu */}
            {showFarmMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFarmMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-72 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-20">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Select Farm
                  </div>
                  {farms.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFarm(f.name);
                        setShowFarmMenu(false);
                        showToast(`Switched active farm to ${f.name.split('(')[0].trim()}`, 'info');
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors flex items-start justify-between ${
                        selectedFarm === f.name
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{f.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {f.size} · Crops: {f.crops}
                        </div>
                      </div>
                      {selectedFarm === f.name && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Clean current farm/weather context */}
        <div
          onClick={() => onNavigate('weather')}
          className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors"
          title="View Weather details"
        >
          <span className="font-medium text-slate-900 dark:text-slate-200">28°C</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>82% Rain expected</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-amber-700 dark:text-amber-400 font-medium">Irrigation delayed</span>
        </div>

        {/* Right: Language, Notifications, Theme Toggle, Primary Action, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Primary CTA: Diagnose Crop */}
          {currentScreen !== 'diagnose' && currentScreen !== 'diagnosis-result' && (
            <button
              type="button"
              onClick={() => onNavigate('diagnose')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Diagnose Crop</span>
              <span className="sm:hidden">Diagnose</span>
            </button>
          )}

          {/* Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="px-1.5 sm:px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Select language"
            >
              <span className="hidden sm:inline">{languages.find((l) => l.code === currentLanguage)?.native}</span>
              <span className="sm:hidden font-mono uppercase text-[11px] font-semibold">{currentLanguage}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-40 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1 z-20">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        onLanguageChange(l.code);
                        setShowLangMenu(false);
                        showToast(`Language set to ${l.native} (${l.label})`, 'info');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                        currentLanguage === l.code
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Farm notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Dark / Light Theme Toggle (Right side of Notification Icon) */}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              showToast(theme === 'dark' ? 'Switched to Light Mode' : 'Switched to Dark Mode', 'info');
            }}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

