import React, { useState } from 'react';
import {
  Leaf,
  AlertCircle,
  KeyRound,
  Sun,
  Moon,
  ArrowRight,
  User as UserIcon,
  Lock,
  CloudSun,
  Droplets,
  ScanLine,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

interface LoginScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { login, loginAsDemo } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!usernameOrEmail.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(usernameOrEmail, password);
      if (result.success) {
        showToast('Signed in successfully.', 'success');
        onNavigate('dashboard');
      } else {
        setErrorMessage(result.error || 'Invalid username or password.');
      }
    } catch {
      setErrorMessage('An error occurred while signing in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofillDemo = () => {
    setUsernameOrEmail('AgriSmartDemo');
    setPassword('Agri@2026');
    setErrorMessage(null);
  };

  const handleOpenDemo = () => {
    loginAsDemo();
    showToast('Loaded AgriSmartDemo workspace (Patel Farm).', 'info');
    onNavigate('dashboard');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] dark:bg-[#080808] text-[#1E293B] dark:text-[#EDEDED] flex flex-col lg:flex-row font-sans antialiased transition-colors duration-200">
      {/* 1. LEFT PANEL: Full-Height Authentication Column (100% width on mobile, 480-540px on desktop) */}
      <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 min-h-screen p-6 sm:p-10 xl:p-12 flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors z-10">
        {/* Top bar: Brand + Theme Toggle + Landing Page Link */}
        <div className="flex items-center justify-between gap-2 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-800 dark:bg-emerald-900/60 border border-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Leaf className="w-4 h-4 text-emerald-200 dark:text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                AGRISMART AI
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Operations Console
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Landing page link */}
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Product Tour</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: Sign in Form */}
        <div className="my-auto py-4">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sign in to AgriSmart AI
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your grower credentials or open the live demo workspace.
            </p>
          </div>

          {/* Demo Account Credentials Banner */}
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <KeyRound className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                Demo: <strong className="font-mono text-emerald-800 dark:text-emerald-400">AgriSmartDemo</strong> · <strong className="font-mono text-slate-900 dark:text-slate-100">Agri@2026</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutofillDemo}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer ml-2 shrink-0"
            >
              Autofill
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="usernameOrEmail"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="AgriSmartDemo"
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">
                Direct Workspace Access
              </span>
            </div>
          </div>

          {/* Open Demo Shortcut Button */}
          <button
            type="button"
            onClick={handleOpenDemo}
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Open Demo (AgriSmartDemo)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Switch to Signup */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Don&apos;t have an account? </span>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold transition-colors cursor-pointer"
            >
              Create account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center lg:text-left text-[11px] text-slate-400 dark:text-slate-500 pt-4">
          AgriSmart AI · Intelligent Agricultural Decision Support
        </div>
      </div>

      {/* 2. RIGHT PANEL: 100% Screen Width Operations Console Showcase (Desktop) */}
      <div className="hidden lg:flex flex-1 min-h-screen p-8 xl:p-12 flex-col justify-between bg-[#F8F9FA] dark:bg-[#080808] transition-colors relative overflow-hidden">
        {/* Right Header: Farm Context */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Patel Farm (Anand, Gujarat)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              18.5 Acres • Tomato, Cotton, Wheat
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Online</span>
          </div>
        </div>

        {/* Center: Interactive Live Operations Grid (Using 100% of remaining width) */}
        <div className="my-auto py-6 space-y-5 max-w-4xl w-full">
          {/* 4-Stat Metric Row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>SOIL MOISTURE</span>
                <Droplets className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">31%</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Target: 45% · Sandy Loam</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>WEATHER FORECAST</span>
                <CloudSun className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">28°C</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">82% Rain Expected · Evening</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>IRRIGATION ADVISORY</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  DELAYED
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">4,200 L</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Water saved this week</div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>SUSTAINABILITY</span>
                <Leaf className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">88 / 100</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Tier 1 · Low Runoff</div>
            </div>
          </div>

          {/* Active Diagnosis Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <ScanLine className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Active Crop Health Alert: Early Blight (Alternaria solani)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium">
                      94% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Target: North Block Tomato (Flowering stage). High spore risk due to evening precipitation. Recommendations: Prune affected lower foliage and postpone foliar spray until rain clears.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenDemo}
                className="px-3.5 py-1.5 rounded-md text-xs bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white font-medium transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
              >
                <span>View Diagnosis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Synchronized Intelligence Strip */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>
                Cross-system sync: Soil moisture telemetry delayed Zone 2 irrigation due to incoming 14.5mm rain forecast.
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Optimal Action</span>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Built for growers, agronomists, and precision farm operators.
          </div>
          <button
            type="button"
            onClick={handleOpenDemo}
            className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Launch Live Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
