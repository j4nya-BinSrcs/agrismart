import React, { useMemo, useState } from 'react';
import {
  Camera,
  ArrowRight,
  HelpCircle,
  X,
  Check,
  CloudRain,
  ShieldCheck,
  Droplets,
  Sprout,
  Leaf,
  ArrowUpRight,
  ScanLine,
  Wifi,
  Info,
} from 'lucide-react';
import {
  ActionItem,
  DiagnosisRecord,
  ScreenType,
  WeatherCondition,
  SUPPORTED_CROPS,
} from '../../types';
import { ActionCard } from '../common/ActionCard';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  actions: ActionItem[];
  onToggleAction: (id: string) => void;
  diagnoses: DiagnosisRecord[];
  onSelectDiagnosis: (record: DiagnosisRecord) => void;
  weather: WeatherCondition;
  irrigationPlan?: import('../../types').IrrigationPlan;
}

function cropLabel(crop: string): string {
  return SUPPORTED_CROPS.find((c) => c.value === crop)?.label || crop;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  actions,
  onToggleAction,
  diagnoses,
  onSelectDiagnosis,
  weather,
  irrigationPlan,
}) => {
  const [actionFilter, setActionFilter] = useState<'all' | 'urgent' | 'pending' | 'completed'>('all');
  const [showWhyModal, setShowWhyModal] = useState(false);

  const { isDemo } = useAuth();
  const { activeFarm, locationLabel } = useFarm();

  const displayFarmName = activeFarm?.name || 'Your Farm';
  const displayLocation = locationLabel || activeFarm?.location || 'Location not set';

  const hasDiagnoses = diagnoses.length > 0;
  const latestDiagnosis = diagnoses[0];
  const unhealthyCount = diagnoses.filter((d) => !d.isHealthy).length;
  const healthyCount = diagnoses.filter((d) => d.isHealthy).length;

  const farmHealth = useMemo(() => {
    if (!hasDiagnoses) {
      return {
        known: false as const,
        label: 'Unknown',
        detail: 'Scan leaves to establish farm health from real diagnoses.',
        pct: null as number | null,
      };
    }
    const total = diagnoses.length;
    const pct = Math.round((healthyCount / total) * 100);
    return {
      known: true as const,
      label: unhealthyCount > 0 ? 'Needs attention' : 'Stable',
      detail:
        unhealthyCount > 0
          ? `${unhealthyCount} of ${total} recent scan(s) flagged issues. Latest: ${latestDiagnosis?.diseaseName}.`
          : `All ${total} recent scan(s) look healthy.`,
      pct,
    };
  }, [hasDiagnoses, healthyCount, unhealthyCount, diagnoses.length, latestDiagnosis]);

  const hasIotMoisture =
    isDemo ||
    (activeFarm?.plots.some((p) => p.currentMoisture > 0) ?? false) ||
    (irrigationPlan?.zones?.some((z) => z.soilMoistureCurrent > 0) && !irrigationPlan?.isDemoDefault);

  const moistureDisplay = useMemo(() => {
    if (isDemo && irrigationPlan?.zones?.[0]) {
      return {
        value: `${irrigationPlan.zones[0].soilMoistureCurrent}%`,
        target: `Target: ${irrigationPlan.zones[0].soilMoistureTarget}%`,
        note: 'Simulated demo moisture — not from live sensors.',
        simulated: true,
      };
    }
    if (hasIotMoisture && irrigationPlan?.zones?.[0]?.soilMoistureCurrent != null) {
      return {
        value: `${irrigationPlan.zones[0].soilMoistureCurrent}%`,
        target: `Target: ${irrigationPlan.zones[0].soilMoistureTarget}%`,
        note: 'Field moisture from your recorded field data. Integrate IoT for live accuracy.',
        simulated: false,
      };
    }
    // Weather-based estimate only
    const rain = weather.rainfallExpectedMm ?? 0;
    const hint =
      rain >= 2 || weather.rainProbability >= 60
        ? 'Rain forecast suggests root-zone recharge without irrigation.'
        : 'Low rain chance — monitor fields; IoT sensors needed for exact moisture.';
    return {
      value: 'Est.',
      target: 'No IoT sensors',
      note: hint,
      simulated: false,
    };
  }, [isDemo, hasIotMoisture, irrigationPlan, weather]);

  const sustainabilityDisplay = useMemo(() => {
    if (isDemo) {
      return {
        known: true,
        score: '84',
        note: 'Simulated demo score — not calculated from your farm activity.',
      };
    }
    const avoided = irrigationPlan?.totalEstimatedAvoidedIrrigationLitres;
    if (avoided && avoided > 0) {
      return {
        known: true,
        score: '—',
        note: `Weather-based estimate: ~${avoided.toLocaleString()} L potentially avoided by delaying irrigation. Full scoring needs IoT + activity history.`,
      };
    }
    return {
      known: false,
      score: '—',
      note: 'Sustainability score unavailable until irrigation decisions and IoT data accumulate.',
    };
  }, [isDemo, irrigationPlan]);

  // Only surface actions that are weather-driven or diagnosis-driven — skip fake crop-health demos when no scans
  const relevantActions = useMemo(() => {
    if (isDemo) return actions;
    return actions.filter((a) => {
      if (a.category === 'weather' || a.category === 'irrigation') return true;
      if (a.category === 'crop_protection' && hasDiagnoses) return true;
      return false;
    });
  }, [actions, isDemo, hasDiagnoses]);

  const pendingActions = relevantActions.filter((a) => !a.completed);
  const urgentCount = pendingActions.filter((a) => a.priority === 'urgent').length;
  const completedCount = relevantActions.filter((a) => a.completed).length;

  const filteredActions = relevantActions.filter((a) => {
    if (actionFilter === 'urgent') return a.priority === 'urgent' && !a.completed;
    if (actionFilter === 'pending') return !a.completed;
    if (actionFilter === 'completed') return a.completed;
    return true;
  });

  const fields = activeFarm?.plots ?? [];

  return (
    <div className="space-y-7 xl:space-y-8 pb-8">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Based on live weather for {displayLocation}</p>
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
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>
                    Rain forecast ({weather.rainfallExpectedMm ?? 0} mm, {weather.rainProbability}% probability)
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Advisory uses Open-Meteo weather for your farm location. Exact root-zone moisture requires IoT sensors.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Spray adhesion window</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Foliar sprays need a dry period after application. High rain probability increases wash-off risk.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white font-medium text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IoT tip */}
      <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/30 px-3.5 py-2.5 text-xs text-sky-900 dark:text-sky-200">
        <Wifi className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
        <p>
          Integrate IoT soil and weather devices for more accurate moisture, farm health, and irrigation details.
          Without sensors, moisture and sustainability figures are estimates or unavailable.
        </p>
      </div>

      {isDemo && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Demo workspace: simulated farm telemetry is shown for illustration only.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {displayFarmName} Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {displayLocation} ·{' '}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {farmHealth.known ? ` · Health ${farmHealth.pct}%` : ' · Farm health unknown'}
          </p>
        </div>
      </div>

      {/* Today's decision — weather driven */}
      <div className="rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-900 dark:text-amber-400">
              Today&apos;s Decision
            </span>
            <StatusBadge status="warning" label={`Rain: ${weather.rainProbability}%`} size="sm" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {irrigationPlan?.overallRecommendation ||
              (weather.rainProbability >= 50
                ? `Rain likely (${weather.rainProbability}%, ${weather.rainfallExpectedMm ?? 0} mm). Consider delaying irrigation.`
                : `Low rain chance (${weather.rainProbability}%). Review field moisture before irrigating.`)}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
            {irrigationPlan?.decisionReason ||
              'Advisory based on live weather for your farm location. Confirm with field checks or IoT sensors.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowWhyModal(true)}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Why this decision?</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('irrigation')}
            className="px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 text-white text-xs font-medium cursor-pointer"
          >
            View Irrigation Plan
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div id="farm-overview" className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Farm Overview
          </h2>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
            {isDemo ? 'Simulated data' : 'Live weather · diagnosis-backed health'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
          {/* Farm Health */}
          <div
            onClick={() => onNavigate('diagnose')}
            className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                    <Sprout className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Farm Health</span>
                </div>
                <StatusBadge
                  status={farmHealth.known ? (unhealthyCount > 0 ? 'warning' : 'healthy') : 'moderate'}
                  label={farmHealth.label}
                  size="sm"
                />
              </div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {farmHealth.known && farmHealth.pct != null ? `${farmHealth.pct}%` : '—'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {farmHealth.known ? `${diagnoses.length} scan(s)` : 'No diagnoses yet'}
                </span>
              </div>
              {farmHealth.known && farmHealth.pct != null ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${unhealthyCount > 0 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                    style={{ width: `${farmHealth.pct}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-2" />
              )}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{farmHealth.detail}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
              <span className="font-medium">{farmHealth.known ? 'View scans' : 'Scan leaves'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Root Moisture */}
          <div
            onClick={() => onNavigate('irrigation')}
            className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Root Moisture</span>
                </div>
                <StatusBadge status="moderate" label={moistureDisplay.simulated ? 'Simulated' : 'Estimate'} size="sm" />
              </div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{moistureDisplay.value}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{moistureDisplay.target}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{moistureDisplay.note}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
              <span className="font-medium">Irrigation Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Rain Forecast — real weather */}
          <div
            onClick={() => onNavigate('weather')}
            className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                    <CloudRain className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Rain Forecast</span>
                </div>
                <StatusBadge status="urgent" label={`${weather.rainProbability}% Prob`} size="sm" />
              </div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {weather.rainfallExpectedMm ?? 0} mm
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{displayLocation}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${weather.rainProbability}%` }} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {weather.forecastSummary || weather.condition || 'Live weather for your farm district.'}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
              <span className="font-medium">Hourly Forecast</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Sustainability */}
          <div
            onClick={() => onNavigate('sustainability')}
            className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Sustainability</span>
                </div>
                <StatusBadge status="moderate" label={isDemo ? 'Simulated' : 'Limited'} size="sm" />
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sustainabilityDisplay.score}</span>
                {isDemo && <span className="text-xs text-slate-400 font-medium">/100</span>}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sustainabilityDisplay.note}</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-400">
              <span className="font-medium">Sustainability</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-7">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recommended Actions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasDiagnoses || isDemo
                  ? 'Prioritized from weather and diagnosis data'
                  : 'Weather-based only until you complete a leaf scan'}
              </p>
            </div>
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 self-start text-xs">
              {(['all', 'urgent', 'pending', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActionFilter(f)}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    actionFilter === f
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f === 'all' && `All (${relevantActions.length})`}
                  {f === 'urgent' && `Critical (${urgentCount})`}
                  {f === 'pending' && `Pending (${pendingActions.length})`}
                  {f === 'completed' && `Done (${completedCount})`}
                </button>
              ))}
            </div>
          </div>

          {filteredActions.length > 0 ? (
            <div className="space-y-2.5">
              {filteredActions.map((act) => {
                const dynamicAct =
                  act.category === 'irrigation' || act.id === 'act-1'
                    ? {
                        ...act,
                        actionText: `Review irrigation. ${weather.rainProbability}% rain probability with ${weather.rainfallExpectedMm ?? 0} mm expected.`,
                        reason: irrigationPlan?.totalEstimatedAvoidedIrrigationLitres
                          ? `Weather-based estimate: delaying pumps may avoid ~${irrigationPlan.totalEstimatedAvoidedIrrigationLitres.toLocaleString()} L (not sensor-verified).`
                          : act.reason,
                      }
                    : act;
                return (
                  <ActionCard
                    key={act.id}
                    action={dynamicAct}
                    onToggleComplete={onToggleAction}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center">
              <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mx-auto mb-2" />
              <div className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-0.5">No actions in this view</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan a crop leaf or wait for weather-driven advisories.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Fields / crop status — no fake health */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Your Fields</h3>
              <button
                type="button"
                onClick={() => onNavigate('management')}
                className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium cursor-pointer"
              >
                Manage →
              </button>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-2">
                {fields.map((field) => {
                  const fieldDiag = diagnoses.find(
                    (d) =>
                      d.fieldLocation?.toLowerCase().includes(field.name.toLowerCase()) ||
                      d.crop === field.crop
                  );
                  return (
                    <div
                      key={field.id}
                      onClick={() => onNavigate(fieldDiag ? 'diagnosis-result' : 'diagnose')}
                      className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/60 cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {field.name} — {cropLabel(field.crop)}
                        </span>
                        {fieldDiag ? (
                          <StatusBadge
                            status={fieldDiag.isHealthy ? 'healthy' : 'warning'}
                            label={fieldDiag.isHealthy ? 'Healthy' : fieldDiag.diseaseName}
                            size="sm"
                          />
                        ) : (
                          <StatusBadge status="moderate" label="No scan yet" size="sm" />
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px]">
                        <span>
                          {[
                            field.acres > 0 ? `${field.acres} Ac` : null,
                            field.growthStage || 'Stage not set',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        <span className="text-emerald-800 dark:text-emerald-400 font-medium">
                          {fieldDiag ? 'View diagnosis' : 'Scan leaf'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  No fields configured. Add fields with crop types in Management.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('management')}
                  className="text-xs font-medium text-emerald-800 dark:text-emerald-400 cursor-pointer"
                >
                  Open Management
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Weather Impact</h3>
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Forecast →
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Location</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{displayLocation}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Temperature / Humidity</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {weather.temperature}°C / {weather.humidity}%
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Expected Rain</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {weather.rainfallExpectedMm ?? 0} mm ({weather.rainProbability}%)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">
                <strong className="text-slate-800 dark:text-slate-200">Operational meaning:</strong>{' '}
                {weather.rainProbability >= 50
                  ? `Elevated wash-off risk (${weather.rainProbability}% rain). Prefer dry windows for foliar spray.`
                  : 'Favorable dry window for field work and spraying if wind is moderate.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent diagnoses */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Recent Crop Diagnoses</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">From your leaf scans only</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="text-xs text-emerald-800 dark:text-emerald-400 font-medium cursor-pointer flex items-center gap-1"
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
                className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:border-slate-300 cursor-pointer"
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="w-12 h-12 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    <img
                      src={diag.imageUrl}
                      alt={`${diag.crop} - ${diag.diseaseName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {cropLabel(diag.crop)}
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
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{diag.shortExplanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-800">
            <ScanLine className="w-5 h-5 text-emerald-700 dark:text-emerald-400 mx-auto mb-2.5" />
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">No crop diagnoses yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3.5">
              Scan a leaf to populate farm health and treatment guidance. We do not invent crop health without a scan.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('diagnose')}
              className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
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
