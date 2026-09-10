declare module 'react/jsx-runtime' {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

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
} from 'lucide-react';
import { ScreenType } from '../../types';

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
    <div className="flex flex-col h-full bg-[#242424] text-white">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-emerald-900/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-emerald-800 border border-emerald-700/60 text-white flex items-center justify-center shadow-xs">
            <Leaf className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="font-semibold text-sm text-white tracking-tight">
              AGRI SMART
            </div>
            <div className="text-[10px] text-emerald-200/70">Operations Console</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-900/60 transition-colors"
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
                  : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-emerald-300/80'
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
      <div className="p-3 border-t border-emerald-900/70 text-xs">
        <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-emerald-300/90 font-medium">
            <span>FARM STATUS</span>
            <span className="flex items-center gap-1 text-emerald-300 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Sensors online
            </span>
          </div>

          <div className="flex items-center justify-between text-emerald-200/80 text-[11px]">
            <span>Soil moisture</span>
            <span className="font-mono text-white font-medium">31%</span>
          </div>

          <div className="flex items-center justify-between text-emerald-200/80 text-[11px]">
            <span>Rain probability</span>
            <span className="font-mono text-white font-medium">82%</span>
          </div>

          <div className="pt-2 border-t border-emerald-800/60 text-[11px] text-emerald-100 font-medium flex items-center justify-between">
            <span>Irrigation delayed</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0 border-r border-[#042d22] bg-[#05382b]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[85vw] h-full shadow-xl z-10 bg-[#05382b] border-r border-[#042d22]">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

