/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ScreenType,
  Language,
  DiagnosisRecord,
  ActionItem,
} from './types';
import {
  INITIAL_DIAGNOSES,
  TODAY_ACTIONS,
  CURRENT_WEATHER,
  HOURLY_FORECASTS,
  DAILY_FORECASTS,
  IRRIGATION_ZONES,
  SUSTAINABILITY_DATA,
} from './data/mockData';
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

// Mobile bottom navigation icons
import {
  LayoutDashboard,
  ScanLine,
  CloudSun,
  Droplets,
  MessageSquareHeart,
} from 'lucide-react';

export default function App() {
  // App state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3);

  // Core agricultural data states
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>(INITIAL_DIAGNOSES);
  const [currentDiagnosis, setCurrentDiagnosis] = useState<DiagnosisRecord>(INITIAL_DIAGNOSES[0]);
  const [actions, setActions] = useState<ActionItem[]>(TODAY_ACTIONS);
  const [assistantQuery, setAssistantQuery] = useState<string>('');

  // Toggle action completion
  const handleToggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((act) =>
        act.id === id ? { ...act, completed: !act.completed } : act
      )
    );
  };

  // When a new diagnosis is generated from DiagnoseScreen
  const handleDiagnosisComplete = (newRecord: DiagnosisRecord) => {
    setCurrentDiagnosis(newRecord);
    setDiagnoses((prev) => [newRecord, ...prev]);
    // Also create a relevant action item for Today's actions if not healthy
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
      setActions((prev) => [newAction, ...prev]);
    }
  };

  const handleAskAssistant = (query: string) => {
    setAssistantQuery(query);
    setCurrentScreen('assistant');
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1E293B] overflow-hidden">
      {/* 1. Desktop & Mobile Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        hasActiveDiagnosis={Boolean(currentDiagnosis)}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent Top Header */}
        <Header
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenNotifications={() => {
            setIsNotificationDrawerOpen(true);
            setUnreadNotifications(0);
          }}
          unreadCount={unreadNotifications}
        />

        {/* Scrollable Screen Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-8">
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setCurrentScreen}
              actions={actions}
              onToggleAction={handleToggleAction}
              diagnoses={diagnoses}
              onSelectDiagnosis={(diag) => {
                setCurrentDiagnosis(diag);
                setCurrentScreen('diagnosis-result');
              }}
              weather={CURRENT_WEATHER}
            />
          )}

          {currentScreen === 'diagnose' && (
            <DiagnoseScreen
              onDiagnosisComplete={handleDiagnosisComplete}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'diagnosis-result' && (
            <DiagnosisResultScreen
              diagnosis={currentDiagnosis}
              onNavigate={setCurrentScreen}
              onAskAssistantWithContext={handleAskAssistant}
            />
          )}

          {currentScreen === 'weather' && (
            <WeatherScreen
              weather={CURRENT_WEATHER}
              hourly={HOURLY_FORECASTS}
              daily={DAILY_FORECASTS}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'irrigation' && (
            <IrrigationScreen
              zones={IRRIGATION_ZONES}
              totalSavedLitres={SUSTAINABILITY_DATA.waterSavedMonthLitres}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'sustainability' && (
            <SustainabilityScreen
              metrics={SUSTAINABILITY_DATA}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'assistant' && (
            <AssistantScreen
              initialQuery={assistantQuery}
              onClearInitialQuery={() => setAssistantQuery('')}
              currentLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
              onNavigate={setCurrentScreen}
            />
          )}
        </main>
      </div>

      {/* 3. Notifications Slideout Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onNavigate={setCurrentScreen}
      />

      {/* 4. Responsive Mobile Bottom Navigation Bar (Touch Optimized) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setCurrentScreen('dashboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors ${
            currentScreen === 'dashboard' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen('diagnose')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors ${
            currentScreen === 'diagnose' || currentScreen === 'diagnosis-result'
              ? 'text-emerald-800'
              : 'text-slate-500'
          }`}
        >
          <ScanLine className="w-4 h-4 mb-0.5" />
          <span>Diagnose</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen('weather')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors ${
            currentScreen === 'weather' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <CloudSun className="w-4 h-4 mb-0.5" />
          <span>Weather</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen('irrigation')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors ${
            currentScreen === 'irrigation' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <Droplets className="w-4 h-4 mb-0.5" />
          <span>Irrigation</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen('assistant')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-semibold transition-colors ${
            currentScreen === 'assistant' ? 'text-emerald-800' : 'text-slate-500'
          }`}
        >
          <MessageSquareHeart className="w-4 h-4 mb-0.5" />
          <span>Advisor</span>
        </button>
      </div>
    </div>
  );
}
