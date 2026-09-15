/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  ScreenType,
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
import { ManagementScreen } from './components/screens/ManagementScreen';
import { LoadingState } from './components/common/LoadingState';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { useFarm } from './context/FarmContext';
import { getStoredItem } from './utils/storage';

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
    case 'signup':
      return '/signup';
    case 'dashboard':
      return '/dashboard';
    case 'management':
      return '/management';
    case 'diagnose':
    case 'diagnosis':
      return '/diagnosis';
    case 'diagnosis-result':
      return '/diagnosis/result';
    case 'weather':
      return '/weather';
    case 'irrigation':
      return '/irrigation';
    case 'sustainability':
      return '/sustainability';
    case 'assistant':
      return '/assistant';
    case 'not-found':
      return '/404';
    default:
      return '/';
  }
}

/**
 * Normalize a raw pathname/hash pair into a canonical route string.
 *
 * Handles (Section 6/7 of the localization + routing plan):
 *  - hash-based fallback routing ("#/weather")
 *  - stray query strings or fragments leaking into the path segment
 *  - trailing slashes ("/weather/" -> "/weather")
 *  - case differences
 *
 * so that "/weather", "/weather/", "/weather?test=true", and
 * "/weather#section" all resolve to the same canonical "/weather" route
 * instead of accidentally falling through to the 404 screen.
 */
function normalizePath(pathname: string, hash: string): string {
  let path = hash && hash.startsWith('#/') ? hash.slice(1) : pathname;

  // Strip any query string / fragment that ended up inside the path segment.
  path = path.split('?')[0].split('#')[0];

  path = path.toLowerCase().trim();

  // Collapse a trailing slash, but keep the root "/" intact.
  if (path.length > 1 && path.endsWith('/')) {
    path = path.replace(/\/+$/, '');
  }

  return path || '/';
}

function pathToScreen(pathname: string, hash: string): ScreenType {
  const cleanPath = normalizePath(pathname, hash);

  if (cleanPath === '/' || cleanPath === '' || cleanPath === '/landing' || cleanPath === '/hero') {
    return 'landing';
  }
  if (cleanPath === '/login') {
    return 'login';
  }
  if (cleanPath === '/signup') {
    return 'signup';
  }
  if (cleanPath === '/dashboard') {
    return 'dashboard';
  }
  if (cleanPath === '/management') {
    return 'management';
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
  if (cleanPath === '/404' || cleanPath === '/not-found') {
    return 'not-found';
  }
  return 'not-found';
}

const VALID_SCREENS: ScreenType[] = [
  'landing',
  'login',
  'signup',
  'dashboard',
  'management',
  'diagnose',
  'diagnosis',
  'diagnosis-result',
  'weather',
  'irrigation',
  'sustainability',
  'assistant',
  'not-found',
];

function isValidScreen(value: unknown): value is ScreenType {
  return typeof value === 'string' && VALID_SCREENS.includes(value as ScreenType);
}

const PROTECTED_SCREENS: ScreenType[] = [
  'dashboard',
  'management',
  'diagnose',
  'diagnosis',
  'diagnosis-result',
  'weather',
  'irrigation',
  'sustainability',
  'assistant',
];

export default function App() {
  const { isAuthenticated, token, isDemo, user } = useAuth();
  const { farmCoordinates, activeFarm } = useFarm();
  const mainScrollRef = useRef<HTMLElement>(null);

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
  const [irrigationPlan, setIrrigationPlan] = useState<import('./types').IrrigationPlan | null>(null);
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

    // Browser Back/Forward handler (Section 7 of the routing plan):
    //  1. Prefer the screen recorded in history.state when it is present and
    //     still a valid screen — this survives cases where the same
    //     normalized path can represent more than one in-app screen variant.
    //  2. Otherwise fall back to resolving the (normalized) current URL.
    //  3. Route unauthenticated users away from protected screens.
    //  4. Only ever land on "not-found" when the route is genuinely unknown
    //     — normalization already absorbs trailing slashes, query strings,
    //     and fragments before this point, so those never misfire a 404.
    const handlePopState = (event: PopStateEvent) => {
      const stateScreen = event.state?.screen;
      const target = isValidScreen(stateScreen)
        ? stateScreen
        : pathToScreen(window.location.pathname, window.location.hash);

      if (!isAuthenticated && PROTECTED_SCREENS.includes(target)) {
        setCurrentScreen('login');
        try {
          window.history.replaceState({ screen: 'login' }, '', '/login');
        } catch {}
      } else {
        setCurrentScreen(target);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState as EventListener);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState as EventListener);
    };
    // Only re-bind when auth state changes — handleNavigate is stable enough
    // that including it here would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Auth guard effect for screen transitions
  useEffect(() => {
    if (!isAuthenticated && PROTECTED_SCREENS.includes(currentScreen)) {
      handleNavigate('login');
    } else if (isAuthenticated && (currentScreen === 'login' || currentScreen === 'signup')) {
      handleNavigate('dashboard');
    }
  }, [isAuthenticated, currentScreen, handleNavigate]);

  // Dynamic meaningful page titles
  useEffect(() => {
    const titles: Record<ScreenType, string> = {
      landing: 'AgriSmart AI — Intelligent Agriculture for a Sustainable Future',
      login: 'Operator Sign In — AgriSmart AI Operations Console',
      signup: 'Register Farm — AgriSmart AI',
      dashboard: 'Farm Operations Dashboard — AgriSmart AI',
      management: 'Farm Management — AgriSmart AI',
      diagnose: 'Crop Disease Diagnosis — AgriSmart AI',
      diagnosis: 'Crop Disease Diagnosis — AgriSmart AI',
      'diagnosis-result': 'Diagnosis Report & Advisory — AgriSmart AI',
      weather: 'Weather Intelligence & Spray Windows — AgriSmart AI',
      irrigation: 'Smart Irrigation & Soil Moisture — AgriSmart AI',
      sustainability: 'Sustainability & Resource Accounting — AgriSmart AI',
      assistant: 'Farmer Advisor & AI Agronomist — AgriSmart AI',
      'not-found': 'Page Not Found (404) — AgriSmart AI',
    };

    document.title = titles[currentScreen] || 'AgriSmart AI — Agricultural Intelligence Platform';
  }, [currentScreen]);

  // Reset scroll position on every screen change. Without this, a new
  // screen can render already scrolled to wherever the previous one left
  // off — the document scroll for Landing/Login/Signup/404 (which scroll
  // the window), or the app shell's internal <main> scroll for the
  // authenticated screens (Dashboard, Diagnose, Weather, ...) — instead of
  // starting at the top on laptop, tablet, and mobile alike. Runs via
  // useLayoutEffect so the jump happens before paint, with no visible
  // flash of the old scroll position. Fires for sidebar/header/bottom-nav
  // clicks, CTA navigation, and browser Back/Forward alike, since all of
  // them go through the same currentScreen state change.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [currentScreen]);

  // Load initial data through service architecture — weather uses active farm coords
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const coords = {
          latitude: farmCoordinates.lat,
          longitude: farmCoordinates.lon,
        };

        const fieldZones =
          activeFarm?.plots.map((plot) => ({
            id: plot.id,
            name: plot.name,
            crop: plot.crop,
            growthStage: plot.growthStage || 'vegetative',
            soilMoistureCurrent: plot.currentMoisture ?? 30,
            soilMoistureTarget: plot.targetMoisture ?? 45,
            soilType: plot.soilType || 'loam',
            areaAcres: plot.acres,
          })) || [];

        const [
          diagList,
          actList,
          notifList,
          weatherBundle,
          irrigPlan,
          sust,
        ] = await Promise.all([
          isDemo
            ? diagnosisService.getDiagnosisHistory(null, user?.id, 30, activeFarm?.id)
            : diagnosisService.getDiagnosisHistory(token, user?.id, 30, activeFarm?.id),
          farmService.getTodayActions(isDemo),
          farmService.getNotifications(isDemo),
          weatherService.getFullForecast(coords),
          fieldZones.length > 0 || isDemo
            ? irrigationService.getIrrigationPlan({
                latitude: coords.latitude,
                longitude: coords.longitude,
                zones: fieldZones.length > 0 ? fieldZones : undefined,
                allowDemoDefaults: isDemo,
              })
            : Promise.resolve(null),
          sustainabilityService.getSustainabilityMetrics(token),
        ]);

        if (isMounted) {
          // Non-demo: only show this user's diagnoses (backend already scopes; also filter demo seeds)
          const userDiags = isDemo
            ? diagList
            : diagList.filter((d) => !d.id?.startsWith('demo-') && !d.imageUrl?.includes('sample'));

          setDiagnoses(userDiags);
          if (userDiags.length > 0) {
            setCurrentDiagnosis(userDiags[0]);
          } else {
            setCurrentDiagnosis(null);
          }
          setActions(isDemo ? actList : []);
          setNotifications(isDemo ? notifList : []);
          setWeather(weatherBundle.current);
          setHourlyForecast(weatherBundle.hourly);
          setDailyForecast(weatherBundle.daily);
          if (irrigPlan && !(!isDemo && irrigPlan.isDemoDefault)) {
            setIrrigationPlan(irrigPlan);
            setIrrigationZones(irrigPlan.zones || []);
          } else {
            setIrrigationPlan(null);
            setIrrigationZones([]);
          }
          setSustainability(sust);
        }
      } catch (err) {
        console.error('[App] Failed to load farm data:', err);
      }
    }

    if (isAuthenticated) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [token, isAuthenticated, isDemo, user?.id, farmCoordinates.lat, farmCoordinates.lon, activeFarm?.id, activeFarm?.plots]);

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
        reason: 'Based on your leaf scan advisory.',
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

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // 1. Public non-authenticated screens render full-bleed without app shell.
  // Each is keyed by screen so route changes between them replay the
  // page-transition-enter animation (Section 2.2 of the motion plan).
  if (currentScreen === 'landing') {
    return (
      <div key="landing" className="page-transition-enter">
        <LandingScreen onNavigate={handleNavigate} />
      </div>
    );
  }

  if (currentScreen === 'login') {
    return (
      <div key="login" className="page-transition-enter">
        <LoginScreen onNavigate={handleNavigate} />
      </div>
    );
  }

  if (currentScreen === 'signup') {
    return (
      <div key="signup" className="page-transition-enter">
        <SignupScreen onNavigate={handleNavigate} />
      </div>
    );
  }

  if (currentScreen === 'not-found' && !isAuthenticated) {
    return (
      <div
        key="not-found"
        className="page-transition-enter min-h-screen bg-[#F8F9FA] dark:bg-[#080808] text-[#1E293B] dark:text-[#EDEDED] flex items-center justify-center p-4 transition-colors"
      >
        <NotFoundScreen onNavigate={handleNavigate} requestedPath={window.location.pathname} />
      </div>
    );
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
        weather={weather || undefined}
        irrigationPlan={irrigationPlan || undefined}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent Top Header */}
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          unreadCount={unreadNotificationsCount}
          weather={weather || undefined}
          irrigationPlan={irrigationPlan || undefined}
        />

        {/* Scrollable Screen Viewport with Error Boundary */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-7 xl:py-8 pb-20 sm:pb-8 bg-[#F8F9FA] dark:bg-[#080808] transition-colors"
        >
          <ErrorBoundary>
          {/* Keyed by screen so navigating between routes (sidebar, header,
              bottom nav, CTAs, or browser Back/Forward) replays a subtle
              fade + upward-motion page-transition instead of an abrupt
              content swap (Section 2.2 of the motion plan). */}
          <div key={currentScreen} className="page-transition-enter">
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
                  irrigationPlan={irrigationPlan || undefined}
                />
              ) : (
                <LoadingState message="Loading farm operations console..." />
              )
            )}

            {currentScreen === 'management' && (
              <ManagementScreen onNavigate={handleNavigate} />
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

            {currentScreen === 'irrigation' && (
              <IrrigationScreen
                zones={irrigationZones}
                plan={irrigationPlan || undefined}
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
                onNavigate={handleNavigate}
                activeDiagnosis={currentDiagnosis || undefined}
                weather={weather || undefined}
                irrigation={irrigationPlan || undefined}
              />
            )}

            {currentScreen === 'not-found' && (
              <NotFoundScreen onNavigate={handleNavigate} requestedPath={window.location.pathname} />
            )}
          </div>
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
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer active:scale-95 hover:bg-slate-100 dark:hover:bg-white/5 ${
            currentScreen === 'dashboard' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Home"
          aria-current={currentScreen === 'dashboard' ? 'page' : undefined}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('diagnose')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer active:scale-95 hover:bg-slate-100 dark:hover:bg-white/5 ${
            currentScreen === 'diagnose' || currentScreen === 'diagnosis-result'
              ? 'text-emerald-800 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Crop Diagnosis"
          aria-current={currentScreen === 'diagnose' ? 'page' : undefined}
        >
          <ScanLine className="w-4 h-4 mb-0.5" />
          <span>Diagnose</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('weather')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer active:scale-95 hover:bg-slate-100 dark:hover:bg-white/5 ${
            currentScreen === 'weather' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Weather Intelligence"
          aria-current={currentScreen === 'weather' ? 'page' : undefined}
        >
          <CloudSun className="w-4 h-4 mb-0.5" />
          <span>Weather</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('irrigation')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer active:scale-95 hover:bg-slate-100 dark:hover:bg-white/5 ${
            currentScreen === 'irrigation' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Smart Irrigation"
          aria-current={currentScreen === 'irrigation' ? 'page' : undefined}
        >
          <Droplets className="w-4 h-4 mb-0.5" />
          <span>Irrigation</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavigate('assistant')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer active:scale-95 hover:bg-slate-100 dark:hover:bg-white/5 ${
            currentScreen === 'assistant' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-label="Navigate to Farmer Assistant"
          aria-current={currentScreen === 'assistant' ? 'page' : undefined}
        >
          <MessageSquareHeart className="w-4 h-4 mb-0.5" />
          <span>Advisor</span>
        </button>
      </div>
    </div>
  );
}
