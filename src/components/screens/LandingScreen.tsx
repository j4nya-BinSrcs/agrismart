import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Leaf,
  ScanLine,
  CloudSun,
  Droplets,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { ScreenType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { Variants } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Aurora from '../common/Aurora';

interface LandingScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const LandingScreen: React.FC<LandingScreenProps> = ({ onNavigate }) => {
  const { isAuthenticated, loginAsDemo, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenDemo = () => {
    loginAsDemo();
    showToast('Loaded AgriSmartDemo workspace (Patel Farm).', 'info');
    onNavigate('dashboard');
  };

  const handleLoginClick = () => {
    if (isAuthenticated) {
      logout();
    }
    onNavigate('login');
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#080808] text-[#1E293B] dark:text-[#EDEDED] font-sans antialiased transition-colors duration-200">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#080808]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 transition-colors w-full">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-md bg-emerald-800 dark:bg-emerald-900/60 border border-emerald-700/60 dark:border-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Leaf className="w-4 h-4 text-emerald-200 dark:text-emerald-400" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                AGRISMART AI
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                Operations Console
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              How it Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('product-preview')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              Preview
            </button>
          </nav>

          {/* Desktop Right Actions: Theme Toggle + Open Demo -> + Login */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dark/Light Mode Switcher: ONLY Lucide icon, no text */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* 1. Open Demo -> button */}
            <button
              type="button"
              onClick={handleOpenDemo}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>Open Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* 2. Login button */}
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Login
            </button>
          </div>

          {/* Mobile Right Controls: Theme + Hamburger */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="w-full text-left py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              How it Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('product-preview')}
              className="w-full text-left py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Preview
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenDemo}
                className="w-full py-2.5 text-xs text-center rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Open Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLoginClick}
                className="w-full py-2 text-xs text-center rounded-md border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-14 pb-14 sm:pt-20 sm:pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 transition-colors overflow-hidden">
        {/* Background Aurora WebGL Animation */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60 overflow-hidden">
          <Aurora
            colorStops={["#075c45", "#1e896c", "#075c45"]}
            blend={0.5}
            amplitude={1.0}
            speed={0.5}
            lightMode={theme === 'light'}
          />
        </div>

        <motion.div
          className="relative z-10 max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {/* Tag */}
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-[11px] font-medium uppercase tracking-wider mb-6">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>AGRISMART AI</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.15] mb-6"
          >
            Smarter decisions.
            <br />
            Healthier farms.
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            variants={fadeInUp}
            className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-8"
          >
            AI-powered crop diagnosis, weather intelligence, irrigation guidance and sustainability insights — brought together in one simple agricultural decision-support platform.
          </motion.p>

          {/* Action CTAs: Open Demo -> and Login / Signup */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={handleOpenDemo}
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <span>Open Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleLoginClick}
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            >
              Login / Signup
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('product-preview')}
              className="w-full sm:w-auto px-4 py-3 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Explore Platform ↓
            </button>
          </motion.div>
        </motion.div>

        {/* 3. HERO VISUAL: UI Preview of Patel Farm */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 w-full max-w-6xl mx-auto mt-12 sm:mt-16"
        >
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-colors">
            {/* Window bar */}
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  Patel Farm (Anand, Gujarat) • Operations Console
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sensors Online • 18.5 Acres</span>
              </div>
            </div>

            {/* Mock Dashboard Grid */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 transition-colors">
              {/* Telemetry 1: Soil Moisture */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>SOIL MOISTURE</span>
                  <Droplets className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">31%</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Target: 45% · Sandy Loam</div>
              </div>

              {/* Telemetry 2: Weather */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>WEATHER FORECAST</span>
                  <CloudSun className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">28°C</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">82% Rain chance · Evening</div>
              </div>

              {/* Telemetry 3: Irrigation Status */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>IRRIGATION ADVISORY</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    DELAYED
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">4,200 L</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Water saved this week</div>
              </div>

              {/* Telemetry 4: Sustainability */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>SUSTAINABILITY</span>
                  <Leaf className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">88 / 100</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Tier 1 · Low Runoff</div>
              </div>

              {/* Active Diagnosis Card Preview */}
              <div className="md:col-span-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Active Diagnosis: Early Blight (Alternaria solani)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-medium">
                        94% Confidence
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Target: North Block Tomato • Pruning protocol and bio-fungicide recommended prior to anticipated rainfall.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDemo}
                  className="px-3.5 py-1.5 rounded-md text-xs bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                >
                  <span>Open Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 4. SECTION 2 — HOW AGRISMART WORKS (OBSERVE -> UNDERSTAND -> ACT) */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
              OPERATIONAL WORKFLOW
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Observe → Understand → Act
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Transform raw field observations and ambient telemetry into confident daily actions.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 01 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-400 mb-3">
                01 — OBSERVE
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Monitor Crop & Conditions
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Monitor crop, field and weather conditions through leaf photography, telemetry, and regional meteorological tracking.
              </p>
            </motion.div>

            {/* Step 02 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-400 mb-3">
                02 — UNDERSTAND
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Identify Risks & Needs
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                AgriSmart combines available information to identify risks, diagnose crop stresses, and detect moisture deficits early.
              </p>
            </motion.div>

            {/* Step 03 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-400 mb-3">
                03 — ACT
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Clear Field Direction
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive clear recommendations for what to do next — with precise dosages, irrigation delays, and spray suitability windows.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 3 — CORE CAPABILITIES */}
      <section id="capabilities" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
              CORE CAPABILITIES
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Essential Tools for Agricultural Operations
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Four focused modules designed to address daily crop protection and resource decisions.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Capability 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-xs"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <ScanLine className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Crop Diagnosis
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Identify diseases, nutritional deficiencies, and pests from leaf photographs with actionable organic and conventional treatment protocols.
                </p>
              </div>
            </motion.div>

            {/* Capability 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-xs"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <CloudSun className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Weather Intelligence
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hyperlocal hourly forecasts with agricultural spray suitability windows and rain risk alerts calibrated for field work.
                </p>
              </div>
            </motion.div>

            {/* Capability 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-xs"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Smart Irrigation
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Automated zone-by-zone watering schedules coordinated with live soil moisture telemetry and incoming precipitation.
                </p>
              </div>
            </motion.div>

            {/* Capability 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-xs"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Sustainability
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Track water conservation, soil carbon health, and chemical reduction with quantifiable impact metrics.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 4 — PRODUCT PREVIEW ("One view of your farm") */}
      <section id="product-preview" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
              UNIFIED OPERATIONS
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              One view of your farm.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Farm health, crop diagnosis, weather, irrigation, and sustainability working seamlessly together.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm transition-colors"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Health & Diagnosis */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Farm Health & Diagnosis</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Immediate health alerts on crop blights, nutrient stress, and leaf spots with step-by-step treatment roadmaps.
                </p>
              </div>

              {/* Box 2: Weather & Spray Advisory */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  <CloudSun className="w-4 h-4 text-amber-500" />
                  <span>Weather & Spray Windows</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hyperlocal rain tracking prevents wasted chemical applications and protects foliage from fungal spread.
                </p>
              </div>

              {/* Box 3: Irrigation & Conservation */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  <Droplets className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Irrigation & Sustainability</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Avoid over-irrigation before precipitation events, conserving thousands of liters while preserving root health.
                </p>
              </div>
            </div>

            {/* Quick action strip */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Preloaded with Patel Farm Anand operations demo data</span>
              </div>
              <button
                type="button"
                onClick={handleOpenDemo}
                className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Open Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. SECTION 5 — FINAL CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            Make your next farm decision with better information.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
            Access crop protection protocols, live moisture tracking, and weather intelligence in your dedicated workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenDemo}
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Open Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLoginClick}
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Login / Signup
            </button>
          </div>
        </motion.div>
      </section>

      {/* 8. COMPREHENSIVE AGRICULTURAL OPERATIONS FOOTER */}
      <footer className="w-full bg-white dark:bg-[#080808] border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
        {/* Main Multi-Column Footer Grid */}
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Column 1: Brand & Operational Summary (spans 2 columns on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-800 dark:bg-emerald-900/60 border border-emerald-700/60 text-white flex items-center justify-center shadow-xs">
                  <Leaf className="w-4 h-4 text-emerald-200 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                    AGRISMART AI
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-none">
                    Operations Console
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                Agricultural decision support platform delivering computer-vision crop pathology diagnostics, hyper-local meteorological forecasts, precision irrigation schedules, and field sustainability tracking.
              </p>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Field Telemetry & Edge AI Operational</span>
              </div>
            </div>

            {/* Column 2: Platform Capabilities */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Capabilities
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      loginAsDemo();
                      onNavigate('diagnose');
                    }}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    Crop Diagnosis AI
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      loginAsDemo();
                      onNavigate('weather');
                    }}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    Weather & Spray Windows
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      loginAsDemo();
                      onNavigate('irrigation');
                    }}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    Precision Irrigation
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      loginAsDemo();
                      onNavigate('sustainability');
                    }}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    Sustainability Scores
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      loginAsDemo();
                      onNavigate('assistant');
                    }}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    Agronomy Assistant
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Agricultural Standards */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Field Standards
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-500 dark:text-slate-400">Patel Farm (Anand, Gujarat)</li>
                <li className="text-slate-500 dark:text-slate-400">ICAR Pathology Database</li>
                <li className="text-slate-500 dark:text-slate-400">IMD Weather Models</li>
                <li className="text-slate-500 dark:text-slate-400">CPCB Environmental Metrics</li>
                <li className="text-slate-500 dark:text-slate-400">Multilingual: EN · GU · HI</li>
              </ul>
            </div>

            {/* Column 4: Access & Workspace */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Direct Access
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={handleOpenDemo}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>Open Demo Console</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Operator Login
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('signup')}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Register New Farm
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Operational Workflow
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Full-width Sub-footer Bar */}
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 AgriSmart AI. Agricultural Intelligence Platform. Designed for modern Indian agriculture.
          </div>
          <div className="flex items-center gap-4">
            <span>Confidential & Proprietary</span>
            <span>·</span>
            <span>v1.0.0 Frontend Lock</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
