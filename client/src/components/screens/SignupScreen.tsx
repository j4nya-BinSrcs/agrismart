import React, { useMemo, useState } from 'react';
import {
  Leaf,
  AlertCircle,
  Sun,
  Moon,
  ArrowRight,
  User as UserIcon,
  Mail,
  Lock,
  Sprout,
  ExternalLink,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { ScreenType, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { INDIA_LOCATIONS } from '../../data/indiaLocationData';
import { ProductShowcase } from '../auth/ProductShowcase';

interface SignupScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'owner', label: 'Owner', hint: 'Full farm control' },
  { value: 'farmer', label: 'Farmer', hint: 'Field operations' },
  { value: 'manager', label: 'Manager', hint: 'Day-to-day oversight' },
  { value: 'agronomist', label: 'Agronomist', hint: 'Crop advisory' },
];

const selectClassName =
  'w-full pl-9 pr-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors disabled:opacity-50 appearance-none';

const inputClassName =
  'w-full pl-9 pr-3 py-2 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 transition-colors disabled:opacity-50';

export const SignupScreen: React.FC<SignupScreenProps> = ({ onNavigate }) => {
  const { signup, loginAsDemo } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'owner' as UserRole,
    farmName: '',
    state: '',
    district: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const districts = useMemo(() => {
    const state = INDIA_LOCATIONS.find((s) => s.state === formData.state);
    return state?.districts ?? [];
  }, [formData.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'state') {
        return { ...prev, state: value, district: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formData.password.trim() || formData.password.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!formData.farmName.trim()) {
      setErrorMessage('Please enter your farm name.');
      return;
    }
    if (!formData.state) {
      setErrorMessage('Please select your state.');
      return;
    }
    if (!formData.district) {
      setErrorMessage('Please select your district.');
      return;
    }

    setIsLoading(true);
    try {
      const location = `${formData.district}, ${formData.state}`;
      const result = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        farmName: formData.farmName,
        state: formData.state,
        district: formData.district,
        location,
      });
      if (result.success) {
        showToast(`Workspace initialized for ${formData.farmName}.`, 'success');
        onNavigate('dashboard');
      } else {
        setErrorMessage(result.error || 'Failed to create account.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
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
        <div className="flex items-center justify-between gap-2 mb-6">
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

        <div className="my-auto py-3">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Create your account
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Set up a farm workspace with your India location for weather and advisories.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Patel"
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@farm.com"
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={selectClassName}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.hint}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={inputClassName}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="farmName" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Farm Name
              </label>
              <div className="relative">
                <Sprout className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="farmName"
                  name="farmName"
                  type="text"
                  value={formData.farmName}
                  onChange={handleChange}
                  placeholder="e.g. Patel Farm"
                  disabled={isLoading}
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="state" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={selectClassName}
                  >
                    <option value="">Select state</option>
                    {INDIA_LOCATIONS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="district" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  District
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={isLoading || !formData.state}
                    className={selectClassName}
                  >
                    <option value="">{formData.state ? 'Select district' : 'Select state first'}</option>
                    {districts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? <span>Creating workspace...</span> : <span>Create Account</span>}
            </button>
          </form>

          <div className="relative my-5">
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

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold transition-colors cursor-pointer"
            >
              Sign in
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
