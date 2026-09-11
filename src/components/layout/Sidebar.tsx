import React, { useState } from 'react';
import {
  LayoutDashboard,
  ScanLine,
  FileCheck2,
  CloudSun,
  Droplets,
  Leaf,
  MessageSquareHeart,
  X,
  ChevronDown,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface SidebarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  hasActiveDiagnosis: boolean;
  onResetDemo?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  hasActiveDiagnosis,
  onResetDemo,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user?.name || 'AgriSmartDemo';
  const displayFarm = user?.farmName || 'Patel Farm';
  const displayLocation = user?.location || 'Anand, Gujarat';
  const displayRole = user?.role || 'Lead Grower';
  const initials =
    displayName.includes(' ')
      ? displayName
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : displayName.slice(0, 2).toUpperCase() || 'AG';

  const handleLogout = () => {
    setShowUserMenu(false);
    onCloseMobile();
    logout();
    showToast('Logged out of workspace.', 'info');
    onNavigate('landing');
  };

  const handleResetDemo = () => {
    setShowUserMenu(false);
    if (onResetDemo) {
      onResetDemo();
      showToast('Reset Patel Farm demo dataset.', 'info');
    }
  };
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

      {/* Pinned Bottom Section: Farm Status + User Profile & Logout */}
      <div className="mt-auto shrink-0 border-t border-zinc-700/60 dark:border-[#222222] bg-[#222222]/40 dark:bg-[#0c0c0c]/60 text-xs">
        {/* Farm Status Card */}
        <div className="p-3 pb-2">
          <div className="p-2.5 rounded-lg bg-zinc-800/80 dark:bg-[#161616] border border-zinc-700/60 dark:border-[#262626] space-y-1.5">
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

            <div className="pt-1.5 border-t border-zinc-700/60 dark:border-[#262626] text-[10px] text-emerald-300 font-medium flex items-center justify-between">
              <span>Irrigation delayed</span>
            </div>
          </div>
        </div>

        {/* User Profile & Logout Section */}
        <div className="px-3 pb-3 relative">
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute left-3 right-3 bottom-full mb-1.5 rounded-lg bg-zinc-900 dark:bg-[#181818] border border-zinc-700/80 dark:border-[#282828] shadow-2xl p-2 z-50 text-xs">
                <div className="px-2 py-1.5 border-b border-zinc-800 dark:border-[#262626]">
                  <div className="font-semibold text-white truncate text-xs">{displayName}</div>
                  {user?.username && (
                    <div className="text-[10px] font-mono text-emerald-400">@{user.username}</div>
                  )}
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">{displayFarm} • {displayLocation}</div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-0.5">{displayRole}</div>
                </div>
                {onResetDemo && (
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="w-full text-left px-2 py-1.5 mt-1 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 dark:hover:bg-[#242424] flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Reset Demo Data</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-1.5 mt-0.5 rounded-md text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}

          {/* Compact Profile Row */}
          <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-zinc-800/60 dark:bg-[#161616] border border-zinc-700/50 dark:border-[#262626]">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 min-w-0 flex-1 text-left p-1 rounded-md hover:bg-zinc-700/40 dark:hover:bg-[#202020] transition-colors cursor-pointer"
              aria-label="User profile settings"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 flex items-center justify-center font-semibold text-[11px] shrink-0 shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-medium text-white truncate">{displayName}</div>
                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">@{user?.username || 'AgriSmartDemo'}</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-emerald-400' : ''} shrink-0`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-md text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="Log Out of workspace"
              aria-label="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
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

