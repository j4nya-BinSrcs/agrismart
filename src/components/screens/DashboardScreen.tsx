import React, { useState } from 'react';
import {
  Camera,
  ArrowRight,
  HelpCircle,
  X,
  Check,
  CloudRain,
  AlertTriangle,
  ShieldCheck,
  Droplets,
  Sprout,
  Leaf,
  ArrowUpRight,
  ScanLine,
} from 'lucide-react';
import {
  ActionItem,
  DiagnosisRecord,
  ScreenType,
  WeatherCondition,
} from '../../types';
import { ActionCard } from '../common/ActionCard';
import { StatusBadge } from '../common/StatusBadge';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  actions: ActionItem[];
  onToggleAction: (id: string) => void;
  diagnoses: DiagnosisRecord[];
  onSelectDiagnosis: (record: DiagnosisRecord) => void;
  weather: WeatherCondition;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  actions,
  onToggleAction,
  diagnoses,
  onSelectDiagnosis,
  weather,
}) => {
  const [actionFilter, setActionFilter] = useState<'all' | 'urgent' | 'pending' | 'completed'>('all');
  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  const pendingActions = actions.filter((a) => !a.completed);
  const urgentCount = pendingActions.filter((a) => a.priority === 'urgent').length;
  const completedCount = actions.filter((a) => a.completed).length;

  const filteredActions = actions.filter((a) => {
    if (actionFilter === 'urgent') return a.priority === 'urgent' && !a.completed;
    if (actionFilter === 'pending') return !a.completed;
    if (actionFilter === 'completed') return a.completed;
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* 'Why This Decision?' Agronomic Interplay Modal */}
      {showWhyModal && (
        <div
          onClick={() => setShowWhyModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Why this recommendation?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cross-system weather and crop synchronization</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>1. Rain Forecast (14.5mm at 2:00 PM)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Field A current root-zone moisture is 31% (target 45%). Running drip pumps today would saturate the root zone just before 14.5mm of rain arrives, risking soil waterlogging and wasted pump energy.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>2. Fungal Rain-Splash Transmission</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Early blight spores on lower tomato foliage spread to healthy canopy when struck by raindrops. Pruning affected foliage before showers prevents spore aerosolization.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>3. Spray Adhesion Window</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Chemical applications require a 4-hour dry window. Postponing foliar spraying prevents product wash-off into drainage furrows.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header: Operational Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Patel Farm Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Anand, Gujarat · Thursday, September 10 · 88% overall health
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('diagnose')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Diagnose Crop</span>
        </button>
      </div>

      {/* 2. Today's Core Decision (Focused, calm, not a panic banner) */}
      <div className="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-900 dark:text-amber-400">
              Today's Decision
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <StatusBadge status="warning" label="Rain in 4h" size="sm" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Rain expected this afternoon (82% probability, 14.5mm). Delay irrigation.
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
            Prune affected leaves on Tomato Plot 2 before rainfall to prevent spore wash-off into upper foliage.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowWhyModal(true)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Why this decision?</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('irrigation')}
            className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            View Irrigation Plan
          </button>
        </div>
      </div>

      {/* 3. Farm Overview: 4 Distinct Telemetry & Field Cards */}
      <div id="farm-overview" className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Farm Overview
            </h2>
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
              • Real-time crop telemetry & field metrics
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 px-2 py-0.5 rounded">
            Live Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Farm Health */}
          <div
            id="overview-card-health"
            onClick={() => onNavigate('diagnose')}
            className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Farm Health</span>
                </div>
                <StatusBadge status="warning" label="Attention" size="sm" />
              </div>

              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">88%</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">2 of 3 plots optimal</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-amber-600 dark:bg-amber-500 h-full rounded-full" style={{ width: '88%' }} />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Field A Tomato Plot 2 under active treatment for Early Blight.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
              <span className="font-medium">Inspect Field A</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 2: Root-Zone Moisture */}
          <div
            id="overview-card-moisture"
            onClick={() => onNavigate('irrigation')}
            className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/50 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Root Moisture</span>
                </div>
                <StatusBadge status="delay" label="Delay Pump" size="sm" />
              </div>

              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">31%</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Target: 45%</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-sky-600 dark:bg-sky-500 h-full rounded-full" style={{ width: '68%' }} />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Rain will naturally recharge root zone without pump power.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
              <span className="font-medium">Irrigation Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 3: Rain Forecast */}
          <div
            id="overview-card-weather"
            onClick={() => onNavigate('weather')}
            className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Rain in 4h</span>
                </div>
                <StatusBadge status="urgent" label={`${weather.rainProbability}% Prob`} size="sm" />
              </div>

              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">14.5 mm</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">~2:00 PM onset</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: `${weather.rainProbability}%` }} />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Showers starting ~2:00 PM. Complete leaf pruning beforehand.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
              <span className="font-medium">Hourly Forecast</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>

          {/* Card 4: Sustainability Score */}
          <div
            id="overview-card-sustainability"
            onClick={() => onNavigate('sustainability')}
            className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Sustainability</span>
                </div>
                <StatusBadge status="healthy" label="Grade A" size="sm" />
              </div>

              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-2xl font-bold font-sans text-slate-900 dark:text-slate-100">84</span>
                <span className="text-xs text-slate-400 font-medium">/100</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5">Top 15%</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-emerald-700 dark:bg-emerald-600 h-full rounded-full" style={{ width: '84%' }} />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                14,200 L water conserved through weather-synced pump holds.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
              <span className="font-medium">Sustainability Scorecard</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Actions + Crop Health/Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Today's Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recommended Actions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prioritized operations for today</p>
            </div>

            {/* Clean, compact Filter Tabs */}
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setActionFilter('all')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  actionFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({actions.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('urgent')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  actionFilter === 'urgent'
                    ? 'bg-white dark:bg-slate-700 text-rose-800 dark:text-rose-300 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Critical ({urgentCount})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('pending')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  actionFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Pending ({pendingActions.length})
              </button>
              <button
                type="button"
                onClick={() => setActionFilter('completed')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  actionFilter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Done ({completedCount})
              </button>
            </div>
          </div>

          {/* Action List */}
          {filteredActions.length > 0 ? (
            <div className="space-y-2.5">
              {filteredActions.map((act) => (
                <ActionCard
                  key={act.id}
                  action={act}
                  onToggleComplete={onToggleAction}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-0.5">
                {actionFilter === 'urgent' ? 'No critical actions pending' : 'No matching tasks'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All prioritized items in this view are completed.
              </p>
            </div>
          )}
        </div>

        {/* Right: Crop Health Overview + Weather Advisory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Crop Health Overview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Crop Health Overview</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">3 Plots · 18.5 Ac</span>
            </div>

            <div className="space-y-2">
              {/* Field A */}
              <div
                onClick={() => onNavigate('diagnosis-result')}
                className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Field A — Tomato (Plot 2)</span>
                  <StatusBadge status="warning" label="Early Blight (91%)" size="sm" />
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px]">
                  <span>6.0 Acres · Fruiting</span>
                  <span className="text-emerald-800 dark:text-emerald-400 font-medium">Action: Prune leaves</span>
                </div>
              </div>

              {/* Field B */}
              <div
                onClick={() => onNavigate('diagnose')}
                className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Field B — Cotton (Block 1)</span>
                  <StatusBadge status="moderate" label="Bacterial Spot" size="sm" />
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px]">
                  <span>7.5 Acres · Squaring</span>
                  <span className="text-slate-700 dark:text-slate-300">Action: Scout squares</span>
                </div>
              </div>

              {/* Field C */}
              <div
                onClick={() => onNavigate('diagnose')}
                className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">Field C — Wheat (East)</span>
                  <StatusBadge status="healthy" label="Healthy" size="sm" />
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px]">
                  <span>5.0 Acres · Tillering</span>
                  <span className="text-slate-700 dark:text-slate-300">Action: Routine scout</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Impact Advisory */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Weather Impact</h3>
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Forecast →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Temperature / Humidity</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">28°C / 68%</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Expected Rain</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">14.5 mm (~2:00 PM)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                <strong className="font-medium text-slate-800 dark:text-slate-200">Operational Meaning:</strong> High wash-off risk. Postpone all chemical spray applications until dry spell Friday morning.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recent Crop Diagnoses Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Recent Crop Diagnoses</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Leaf inspections with confidence and action plans</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="text-xs text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 font-medium cursor-pointer flex items-center gap-1"
          >
            <span>Scan New</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {diagnoses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {diagnoses.map((diag) => (
              <div
                key={diag.id}
                onClick={() => {
                  onSelectDiagnosis(diag);
                  onNavigate('diagnosis-result');
                }}
                className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-12 h-12 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <img
                        src={diag.imageUrl}
                        alt={`${diag.crop} - ${diag.diseaseName}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {diag.crop}
                        </span>
                        <StatusBadge
                          status={diag.isHealthy ? 'healthy' : 'warning'}
                          label={diag.isHealthy ? 'Healthy' : `${diag.confidence}%`}
                          size="sm"
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {diag.diseaseName}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {diag.fieldLocation}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {diag.shortExplanation}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {diag.recommendedActions.length} Actions
                  </span>
                  <span className="text-emerald-800 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                    View Details <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-2.5">
              <ScanLine className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
              No Crop Diagnoses Recorded
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3.5 leading-relaxed">
              Upload or photograph a crop leaf to identify pathologies early and receive targeted intervention schedules.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('diagnose')}
              className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Crop Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

