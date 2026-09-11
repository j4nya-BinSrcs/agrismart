import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  FileCheck2,
  CloudSun,
  Droplets,
  Leaf,
  MessageSquareHeart,
  X,
  LogOut,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  hasActiveDiagnosis: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  hasActiveDiagnosis,
}) => {
  const { logout } = useAuth();
  const navItems = [
    {
      id: 'dashboard' as ScreenType,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'diagnose' as ScreenType,
      label: 'Crop Diagnosis',
      icon: ScanLine,
    },
    ...(hasActiveDiagnosis
      ? [
          {
            id: 'diagnosis-result' as ScreenType,
            label: 'Diagnosis Result',
            icon: FileCheck2,
          }
        ]
      : []),
    {
      id: 'weather' as ScreenType,
      label: 'Weather Intelligence',
      icon: CloudSun,
    },
    {
      id: 'irrigation' as ScreenType,
      label: 'Smart Irrigation',
      icon: Droplets,
    },
    {
      id: 'sustainability' as ScreenType,
      label: 'Sustainability',
      icon: Leaf,
    },
    {
      id: 'assistant' as ScreenType,
      label: 'Farmer Assistant',
      icon: MessageSquareHeart,
    },
  ];

  const handleItemClick = (screen: ScreenType) => {
    onNavigate(screen);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#242424] dark:bg-[#0f0f0f] text-white transition-colors">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-zinc-700/60 dark:border-[#222222] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-800 border border-emerald-700/60 text-white flex items-center justify-center shadow-xs">
            <Leaf className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white tracking-tight">
              AGRI SMART
            </div>
            <div className="text-[10px] text-emerald-300/80">Operations Console</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentScreen === item.id ||
            (item.id === 'diagnose' && currentScreen === 'diagnosis') ||
            (item.id === 'diagnosis-result' &&
              (currentScreen === 'diagnosis/result' || currentScreen === 'diagnosis-result'));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/70 dark:hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-emerald-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1 h-3.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Simplified Quiet Sensor Panel */}
      <div className="p-3 border-t border-zinc-700/60 dark:border-[#222222] text-xs">
        <div className="p-3 rounded-lg bg-zinc-800/80 dark:bg-[#161616] border border-zinc-700/60 dark:border-[#262626] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium">
            <span>FARM STATUS</span>
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sensors online
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 text-[11px]">
            <span>Soil moisture</span>
            <span className="font-mono text-white font-medium">31%</span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 text-[11px]">
            <span>Rain probability</span>
            <span className="font-mono text-white font-medium">82%</span>
          </div>

          <div className="pt-2 border-t border-zinc-700/60 dark:border-[#262626] text-[11px] text-emerald-300 font-medium flex items-center justify-between">
            <span>Irrigation delayed</span>
          </div>
        </div>
      </div>

      {/* Direct Log Out in Sidebar */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            logout();
            onNavigate('landing');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/30 transition-colors cursor-pointer"
          title="Sign out of operations console"
        >
          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0 border-r border-zinc-800 dark:border-[#222222] bg-[#242424] dark:bg-[#0f0f0f] transition-colors">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-xl z-10 bg-[#242424] dark:bg-[#0f0f0f] border-r border-zinc-800 dark:border-[#222222]">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

