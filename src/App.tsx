/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScreenType,
  Language,
  DiagnosisRecord,
  ActionItem,
  AppNotification,
  WeatherCondition,
  HourlyForecast,
  DailyForecast,
  IrrigationZone,
  SustainabilityMetric,
} from './types';
import {
  farmService,
  diagnosisService,
  weatherService,
  irrigationService,
  sustainabilityService,
} from './services';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { DiagnoseScreen } from './components/screens/DiagnoseScreen';
import { DiagnosisResultScreen } from './components/screens/DiagnosisResultScreen';
import { WeatherScreen } from './components/screens/WeatherScreen';
import { IrrigationScreen } from './components/screens/IrrigationScreen';
import { SustainabilityScreen } from './components/screens/SustainabilityScreen';
import { AssistantScreen } from './components/screens/AssistantScreen';
import { NotFoundScreen } from './components/screens/NotFoundScreen';
import { LandingScreen } from './components/screens/LandingScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { SignupScreen } from './components/screens/SignupScreen';
import { LoadingState } from './components/common/LoadingState';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useToast } from './context/ToastContext';
import { useAuth } from './context/AuthContext';
import { getStoredItem, setStoredItem } from './utils/storage';

// Mobile bottom navigation icons
import {
  LayoutDashboard,
  ScanLine,
  CloudSun,
  Droplets,
  MessageSquareHeart,
} from 'lucide-react';

function screenToPath(screen: ScreenType): string {
  switch (screen) {
    case 'landing':
      return '/';
    case 'login':
      return '/login';
    case 'landing':
      return '/landing';
    case 'signup':
      return '/signup';
    case 'dashboard':
      return '/dashboard';
    case 'diagnose':
    case 'diagnosis':
      return '/diagnosis';
    case 'diagnosis-result':
    case 'diagnosis/result':
      return '/diagnosis/result';
    case 'weather':
      return '/weather';
    case 'irrigation':
      return '/irrigation';
    case 'sustainability':
      return '/sustainability';
    case 'assistant':
      return '/assistant';
    default:
      return '/login';
      return '/';
  }
}

function pathToScreen(pathname: string, hash: string): ScreenType {
  const cleanPath = (hash && hash.startsWith('#/') ? hash.replace('#', '') : pathname).toLowerCase();
  
  if (cleanPath === '/' || cleanPath === '' || cleanPath === '/login') {
  if (cleanPath === '/' || cleanPath === '' || cleanPath === '/landing' || cleanPath === '/hero') {
    return 'landing';
  }
  if (cleanPath === '/login') {
    return 'login';
  }
  if (cleanPath === '/landing' || cleanPath === '/hero') {
    return 'landing';
  }
  if (cleanPath === '/signup') {
    return 'signup';
  }
  if (cleanPath === '/dashboard') {
    return 'dashboard';
  }
  if (cleanPath === '/diagnose' || cleanPath === '/diagnosis') {
    return 'diagnose';
  }
  if (cleanPath === '/diagnosis/result' || cleanPath === '/diagnosis-result') {
    return 'diagnosis-result';
  }
  if (cleanPath === '/weather') {
    return 'weather';
  }
  if (cleanPath === '/irrigation') {
    return 'irrigation';
  }
  if (cleanPath === '/sustainability') {
    return 'sustainability';
  }
  if (cleanPath === '/assistant') {
    return 'assistant';
  }
  return 'not-found';
  return 'landing';
}

const PROTECTED_SCREENS: ScreenType[] = [
  'dashboard',
  'diagnose',
  'diagnosis',
  'diagnosis-result',
  'diagnosis/result',
  'weather',
  'irrigation',
  'sustainability',
  'assistant',
];

const LANG_STORAGE_KEY = 'selected_language';

export default function App() {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  // App navigation and view state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    const initial = pathToScreen(window.location.pathname, window.location.hash);
    const session = getStoredItem<{ isAuthenticated: boolean } | null>('agrismart_auth_session', null);
    const authed = session?.isAuthenticated === true;
    if (!authed && PROTECTED_SCREENS.includes(initial)) {
      return 'login';
    }
    return initial;
  });

  const [currentLanguage, setCurrentLanguage] = useState<Language>(() =>
    getStoredItem<Language>(LANG_STORAGE_KEY, 'en')
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);

  // Core agricultural data states
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([]);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<DiagnosisRecord | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [assistantQuery, setAssistantQuery] = useState<string>('');

  // Telemetry data from services
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZone[]>([]);
  const [sustainability, setSustainability] = useState<SustainabilityMetric | null>(null);

  // URL synchronization
  const handleNavigate = useCallback(
    (screen: ScreenType) => {
      let resolved = screen;
      if (!isAuthenticated && PROTECTED_SCREENS.includes(screen)) {
        resolved = 'login';
      }

      const targetPath = screenToPath(resolved);
      if (window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ screen: resolved }, '', targetPath);
        } catch {
          window.location.hash = targetPath;
        }
      }
      setCurrentScreen(resolved);
    },
    [isAuthenticated]
  );

  // Synchronize URL on popstate/hashchange & auth updates
  useEffect(() => {
    const initialScreen = pathToScreen(window.location.pathname, window.location.hash);
    if (!isAuthenticated && PROTECTED_SCREENS.includes(initialScreen)) {
      setCurrentScreen('login');
      try {
        window.history.replaceState({ screen: 'login' }, '', '/login');
      } catch {}
    } else {
      setCurrentScreen(initialScreen);
    }

    const handlePopState = () => {
      const target = pathToScreen(window.location.pathname, window.location.hash);
      if (!isAuthenticated && PROTECTED_SCREENS.includes(target)) {
        handleNavigate('login');
      } else {
        setCurrentScreen(target);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [isAuthenticated, handleNavigate]);

  // Auth guard effect for screen transitions
  useEffect(() => {
    if (!isAuthenticated && PROTECTED_SCREENS.includes(currentScreen)) {
      handleNavigate('login');
    } else if (isAuthenticated && (currentScreen === 'login' || currentScreen === 'signup')) {
      handleNavigate('dashboard');
    }
  }, [isAuthenticated, currentScreen, handleNavigate]);

  // Load initial data through service architecture
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [
          diagList,
          actList,
          notifList,
          currentW,
          hourlyW,
          dailyW,
          zones,
          sust,
        ] = await Promise.all([
          diagnosisService.getDiagnosisHistory(),
          farmService.getTodayActions(),
          farmService.getNotifications(),
          weatherService.getCurrentWeather(),
          weatherService.getHourlyForecast(),
          weatherService.getDailyForecast(),
          irrigationService.getIrrigationZones(),
          sustainabilityService.getSustainabilityMetrics(),
        ]);

        if (isMounted) {
          setDiagnoses(diagList);
          if (diagList.length > 0) {
            setCurrentDiagnosis(diagList[0]);
          }
          setActions(actList);
          setNotifications(notifList);
          setWeather(currentW);
          setHourlyForecast(hourlyW);
          setDailyForecast(dailyW);
          setIrrigationZones(zones);
          setSustainability(sust);
        }
      } catch (err) {
        console.error('[App] Failed to load farm data:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle language change and persist
  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    setStoredItem(LANG_STORAGE_KEY, lang);
  };

  // Toggle action completion through service
  const handleToggleAction = async (id: string) => {
    try {
      const updated = await farmService.toggleAction(id);
      setActions(updated);
    } catch (err) {
      console.error('[App] Action toggle failed:', err);
    }
  };

  // When a new diagnosis is generated from DiagnoseScreen
  const handleDiagnosisComplete = async (newRecord: DiagnosisRecord) => {
    setCurrentDiagnosis(newRecord);
    setDiagnoses((prev) => [newRecord, ...prev.filter((d) => d.id !== newRecord.id)]);

    if (!newRecord.isHealthy) {
      const newAction: ActionItem = {
        id: `act-${Date.now()}`,
        title: `Treat ${newRecord.diseaseName} on ${newRecord.crop}`,
        category: 'crop_protection',
        priority: 'urgent',
        actionText: newRecord.recommendedActions[0]?.description || 'Prune affected foliage.',
        reason: 'Prevent spore germination and rain-splash spread.',
        cropAffected: `${newRecord.crop} (${newRecord.fieldLocation})`,
        completed: false,
        timeframe: 'Target today before rain',
        actionRoute: 'diagnosis-result',
      };
      const updatedActions = await farmService.addAction(newAction);
      setActions(updatedActions);
    }
  };

  const handleAskAssistant = (query: string) => {
    setAssistantQuery(query);
    handleNavigate('assistant');
  };

  // Notifications operations
  const handleMarkAsRead = async (id: string) => {
    const updated = await farmService.markNotificationAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = async () => {
    const updated = await farmService.markAllNotificationsAsRead();
    setNotifications(updated);
  };

  // Demo reset mechanism (Section 24)
  const handleResetDemoData = async () => {
    try {
      await farmService.resetDemoData();
      const [diagList, actList, notifList] = await Promise.all([
        diagnosisService.getDiagnosisHistory(),
        farmService.getTodayActions(),
        farmService.getNotifications(),
      ]);
      setDiagnoses(diagList);
      if (diagList.length > 0) {
        setCurrentDiagnosis(diagList[0]);
      }
      setActions(actList);
      setNotifications(notifList);
      setCurrentLanguage('en');
      setStoredItem(LANG_STORAGE_KEY, 'en');
      setAssistantQuery('');
      handleNavigate('dashboard');
      showToast('Demo data restored to initial Patel Farm state.', 'success');
    } catch (err) {
      console.error('[App] Demo reset failed:', err);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // 1. Public non-authenticated screens render full-bleed without app shell
  if (currentScreen === 'landing') {
    return <LandingScreen onNavigate={handleNavigate} />;
  }

  if (currentScreen === 'login') {
    return <LoginScreen onNavigate={handleNavigate} />;
  }

  if (currentScreen === 'signup') {
    return <SignupScreen onNavigate={handleNavigate} />;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#080808] text-[#1E293B] dark:text-[#EDEDED] overflow-hidden transition-colors">
      {/* 1. Desktop & Mobile Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        hasActiveDiagnosis={Boolean(currentDiagnosis)}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent Top Header */}
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          unreadCount={unreadNotificationsCount}
          onResetDemo={handleResetDemoData}
        />

        {/* Scrollable Screen Viewport with Error Boundary */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-8 bg-[#F8F9FA] dark:bg-[#080808] transition-colors">
          <ErrorBoundary>
            {currentScreen === 'dashboard' && (
              weather ? (
                <DashboardScreen
                  onNavigate={handleNavigate}
                  actions={actions}
                  onToggleAction={handleToggleAction}
                  diagnoses={diagnoses}
                  onSelectDiagnosis={(diag) => {
                    setCurrentDiagnosis(diag);
                    handleNavigate('diagnosis-result');
                  }}
                  weather={weather}
                />
              ) : (
                <LoadingState message="Loading farm operations console..." />
              )
            )}

            {currentScreen === 'diagnose' && (
              <DiagnoseScreen
                onDiagnosisComplete={handleDiagnosisComplete}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'diagnosis-result' && (
              <DiagnosisResultScreen
                diagnosis={currentDiagnosis || diagnoses[0]}
                onNavigate={handleNavigate}
                onAskAssistantWithContext={handleAskAssistant}
              />
            )}

            {currentScreen === 'weather' && weather && (
              <WeatherScreen
                weather={weather}
                hourly={hourlyForecast}
                daily={dailyForecast}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'irrigation' && sustainability && (
              <IrrigationScreen
                zones={irrigationZones}
                totalSavedLitres={sustainability.waterSavedMonthLitres}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'sustainability' && sustainability && (
              <SustainabilityScreen
                metrics={sustainability}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'assistant' && (
              <AssistantScreen
                initialQuery={assistantQuery}
                onClearInitialQuery={() => setAssistantQuery('')}
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                onNavigate={handleNavigate}
                activeDiagnosis={currentDiagnosis || undefined}
                weather={weather || undefined}
              />
            )}

            {currentScreen === 'not-found' && (
              <NotFoundScreen onNavigate={handleNavigate} />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* 3. Notifications Slideout Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onNavigate={handleNavigate}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {/* 4. Responsive Mobile Bottom Navigation Bar (Touch Optimized) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xs border-t border-slate-200 dark:border-[#222222] px-2 py-1 flex items-center justify-around shadow-lg transition-colors">
        <button
          type="button"
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            currentScreen === 'dashboard' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Home"
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('diagnose')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            currentScreen === 'diagnose' || currentScreen === 'diagnosis-result'
              ? 'text-emerald-800 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Crop Diagnosis"
        >
          <ScanLine className="w-4 h-4 mb-0.5" />
          <span>Diagnose</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('weather')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            currentScreen === 'weather' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Weather Intelligence"
        >
          <CloudSun className="w-4 h-4 mb-0.5" />
          <span>Weather</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('irrigation')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            currentScreen === 'irrigation' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Smart Irrigation"
        >
          <Droplets className="w-4 h-4 mb-0.5" />
          <span>Irrigation</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('assistant')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            currentScreen === 'assistant' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Farmer Assistant"
        >
          <MessageSquareHeart className="w-4 h-4 mb-0.5" />
          <span>Advisor</span>
        </button>
      </div>
    </div>
  );
}
