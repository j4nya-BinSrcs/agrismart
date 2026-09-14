import React, { useState } from 'react';
import {
  Leaf,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
  User as UserIcon,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { ProductShowcase } from '../auth/ProductShowcase';

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

  const handleOpenDemo = () => {
    loginAsDemo();
    showToast('Opened demo workspace with simulated farm data.', 'info');
    onNavigate('dashboard');
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] dark:bg-[#080808] text-[#1E293B] dark:text-[#EDEDED] flex flex-col lg:flex-row font-sans antialiased transition-colors duration-200">
      <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 min-h-screen p-6 sm:p-10 xl:p-12 flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors z-10">
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

        <div className="my-auto py-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sign in
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Access your farm workspace or try the demo.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                  placeholder="you@farm.com"
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
              {isLoading ? <span>Signing in...</span> : <span>Sign In</span>}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500">
                Or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenDemo}
            disabled={isLoading}
            className="w-full py-2.5 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Open Demo</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>

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

        <div className="text-center lg:text-left text-[11px] text-slate-400 dark:text-slate-500 pt-4">
          AgriSmart AI · Intelligent Agricultural Decision Support
        </div>
      </div>

      <ProductShowcase />
    </div>
  );
};
