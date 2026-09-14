import React from 'react';
import { Leaf, Droplets, CloudSun, ScanLine } from 'lucide-react';

/**
 * Non-interactive product preview framed like a desktop window.
 * Used on sign-in / sign-up to keep auth pages minimal.
 */
export const ProductShowcase: React.FC = () => {
  return (
    <div className="hidden lg:flex flex-1 min-h-screen items-center justify-center p-10 xl:p-14 bg-slate-100 dark:bg-[#0a0a0a] relative overflow-hidden pointer-events-none select-none">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(148,163,184,0.18), transparent 40%)',
        }}
      />

      <div className="relative w-full max-w-md xl:max-w-lg">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500 mb-3 text-center">
          Product preview
        </p>

        {/* Window chrome */}
        <div className="rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-2 flex-1 h-5 rounded bg-slate-200/70 dark:bg-slate-800 flex items-center px-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                agrismart.ai/dashboard
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-800 text-white flex items-center justify-center">
                  <Leaf className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">AgriSmart AI</div>
                  <div className="text-[10px] text-slate-500">Farm operations at a glance</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                Demo view
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/80 dark:bg-slate-950/40">
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                  <span>Moisture</span>
                  <Droplets className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">—</div>
                <div className="text-[9px] text-slate-400 mt-0.5">IoT required</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/80 dark:bg-slate-950/40">
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                  <span>Weather</span>
                  <CloudSun className="w-3 h-3 text-amber-500" />
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Live</div>
                <div className="text-[9px] text-slate-400 mt-0.5">By farm location</div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/80 dark:bg-slate-950/40">
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                  <span>Scan</span>
                  <ScanLine className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Leaf</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Crop diagnosis</div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Diagnose · Weather · Irrigation
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Connect your fields, capture leaf images, and get location-based weather advisories in one console.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
