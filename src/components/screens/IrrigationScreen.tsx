import React, { useState } from 'react';
import {
  Droplets,
  CloudRain,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  X,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { IrrigationZone, ScreenType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { BackButton } from '../common/BackButton';

interface IrrigationScreenProps {
  zones: IrrigationZone[];
  plan?: import('../../types').IrrigationPlan;
  totalSavedLitres: number;
  onNavigate: (screen: ScreenType) => void;
}

type IrrigationScenario = 'rain_imminent' | 'dry_spell' | 'post_rain';

export const IrrigationScreen: React.FC<IrrigationScreenProps> = ({
  zones,
  plan,
  totalSavedLitres,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones && zones.length > 0 ? zones[0].id : '');
  const [manualOverrideActive, setManualOverrideActive] = useState<Record<string, boolean>>({});
  const [showReasoningModal, setShowReasoningModal] = useState<boolean>(false);
  const [scenario, setScenario] = useState<IrrigationScenario>('rain_imminent');

  if (!zones || zones.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <Droplets className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">No Irrigation Zones Configured</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Add sensor-monitored plots to view soil moisture and automated weather-synced pump holds.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const calcDetails = selectedZone.calculationDetails;

  const handleTogglePump = (zoneId: string) => {
    const isOverridden = manualOverrideActive[zoneId];
    if (!isOverridden) {
      setManualOverrideActive({ ...manualOverrideActive, [zoneId]: true });
      showToast(`Manual pump activated for ${zones.find((z) => z.id === zoneId)?.crop}. Smart delay overridden.`, 'warning');
    } else {
      setManualOverrideActive({ ...manualOverrideActive, [zoneId]: false });
      showToast(`Smart delay resumed. Weather-synced schedule active.`, 'success');
    }
  };

  const scenarioConfig = {
    rain_imminent: {
      label: 'Current: Live Weather Assessment',
      status: selectedZone.status === 'delay_recommended' ? 'IRRIGATION NOT REQUIRED (DELAY ADVISED)' : 'IRRIGATION SCHEDULE EVALUATED',
      statusBadge: selectedZone.status === 'delay_recommended' ? 'delay' : 'optimal',
      badgeLabel: selectedZone.status === 'delay_recommended' ? 'Delay Advised' : 'Optimal',
      moistureMultiplier: 1.0,
      rainProb: selectedZone.rainProbability || plan?.rainProbability || 80,
      rainfallMm: selectedZone.calculationDetails?.forecastRainMm ?? plan?.forecastedRainMm ?? 0,
      recommendation: selectedZone.recommendation || 'Delay pump cycles. Imminent rainfall will replenish root zone naturally.',
      waterSavedToday: `${(selectedZone.estimatedAvoidedIrrigationLitres || selectedZone.waterSavedLitres || plan?.totalEstimatedAvoidedIrrigationLitres || 0).toLocaleString()} L (Estimated Avoided)`,
      reasonSummary: plan?.decisionReason || 'Rainfall will recharge soil without artificial pumping.',
    },
    dry_spell: {
      label: 'Simulation: Dry Spell (0% Rain)',
      status: 'IRRIGATION REQUIRED',
      statusBadge: 'urgent',
      badgeLabel: 'Pumping Required',
      moistureMultiplier: 0.72,
      rainProb: 0,
      rainfallMm: 0.0,
      recommendation: `Run Drip Line for 45 minutes at 06:00 AM. Evaporation deficit requires replenishment to sustain active growth.`,
      waterSavedToday: '0 L (Irrigating)',
      reasonSummary: 'Soil moisture depleted below threshold. Rain probability is 0%.',
    },
    post_rain: {
      label: 'Simulation: Post-Rain (+24 hrs)',
      status: 'SOIL RECHARGED (MONITORING)',
      statusBadge: 'optimal',
      badgeLabel: 'Optimal Saturated',
      moistureMultiplier: 1.55,
      rainProb: 15,
      rainfallMm: 0.0,
      recommendation: 'Keep all pumps suspended. Allow natural gravitational drainage and root aeration.',
      waterSavedToday: `${(selectedZone.estimatedAvoidedIrrigationLitres ? Math.round(selectedZone.estimatedAvoidedIrrigationLitres * 1.3) : 2400).toLocaleString()} L (Estimated Avoided)`,
      reasonSummary: 'Soil moisture is optimal following rainfall event.',
    },
  };

  const currentScen = scenarioConfig[scenario];
  const dynamicMoisture = Math.round(selectedZone.soilMoistureCurrent * currentScen.moistureMultiplier);

  return (
    <div className="space-y-5 pb-12">
      {/* "Why Delay Irrigation?" Agronomic Reasoning Modal */}
      {showReasoningModal && (
        <div
          onClick={() => setShowReasoningModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Why Delay Irrigation?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Explainable FAO-56 telemetry & soil deficit calculations</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReasoningModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Structured Telemetry Table */}
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">Current Soil Moisture</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{dynamicMoisture}%</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{selectedZone.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">Precipitation Forecast</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{currentScen.rainProb}%</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">~{currentScen.rainfallMm} mm expected</span>
                </div>
              </div>

              {/* Agronomic calculation breakdowns */}
              {calcDetails && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[11px]">
                  <span className="text-[10px] uppercase font-sans font-medium text-slate-500 dark:text-slate-400 block">Calculation Parameters</span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-700 dark:text-slate-300">
                    <div>Reference ET₀: <strong className="text-slate-900 dark:text-slate-100">{calcDetails.referenceEt0Mm ?? plan?.et0MmDay ?? 4.8} mm/day</strong></div>
                    <div>Crop Demand ETc: <strong className="text-slate-900 dark:text-slate-100">{calcDetails.dailyWaterDemandEtcMm ?? 5.5} mm/day</strong></div>
                    <div>Crop Coeff (Kc): <strong className="text-slate-900 dark:text-slate-100">{calcDetails.cropCoefficientKc ?? 1.15}</strong></div>
                    <div>Effective Rain: <strong className="text-slate-900 dark:text-slate-100">{calcDetails.effectiveRainHeuristicMm ?? 8.1} mm</strong></div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400 block">Agronomic Evaluation</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedZone.crop} current soil moisture is <strong>{dynamicMoisture}%</strong>, which is safely above the permanent wilting point and buffered within the root zone.
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  The forecasted <strong>{currentScen.rainfallMm} mm</strong> rainfall will naturally infiltrate and satisfy daily crop evapotranspiration without supplemental pumping.
                </p>
                <p className="text-emerald-900 dark:text-emerald-300 font-medium pt-1">
                  <strong>Conclusion:</strong> Irrigation delayed. Postponing pump cycles prevents soil saturation, preserves root aeration, and prevents nitrogen leaching.
                </p>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-[11px] text-emerald-900 dark:text-emerald-300">
                <span>Estimated avoided irrigation volume:</span>
                <span className="font-semibold">{currentScen.waterSavedToday}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowReasoningModal(false);
                  onNavigate('weather');
                }}
                className="text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Inspect rainfall timeline →
              </button>
              <button
                type="button"
                onClick={() => setShowReasoningModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 text-white font-medium text-xs hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <BackButton label="Back to Dashboard" onClick={() => onNavigate('dashboard')} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Smart Irrigation Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Soil sensor telemetry correlated with local precipitation forecast
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('weather')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-xs"
          >
            Weather Forecast
          </button>
          <button
            type="button"
            onClick={() => onNavigate('sustainability')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-xs"
          >
            Water Savings
          </button>
        </div>
      </div>

      {/* Scenario Simulator Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Droplets className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Decision Context & Scenario:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['rain_imminent', 'dry_spell', 'post_rain'] as IrrigationScenario[]).map((scenKey) => {
            const isSelected = scenario === scenKey;
            return (
              <button
                key={scenKey}
                type="button"
                onClick={() => setScenario(scenKey)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 dark:bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {scenarioConfig[scenKey].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Irrigation Advisory */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Current Status
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 font-sans">
                <span className={`w-2 h-2 rounded-full ${scenario === 'dry_spell' ? 'bg-amber-600' : 'bg-emerald-700 dark:bg-emerald-400'}`} />
                {currentScen.status}
              </span>
              {/* [ View reasoning ] button */}
              <button
                type="button"
                onClick={() => setShowReasoningModal(true)}
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>View reasoning</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {dynamicMoisture}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Average Soil Moisture ({selectedZone.crop})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                <CloudRain className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                Rain forecast: {currentScen.rainProb}% (~{currentScen.rainfallMm} mm)
              </span>
              <span>•</span>
              <span>Root Zone: {selectedZone.rootDepth}</span>
              <span>•</span>
              <span>Soil: {selectedZone.soilType}</span>
            </div>
          </div>

          <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Recommendation
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {currentScen.waterSavedToday} Saved
              </span>
            </div>

            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {currentScen.recommendation}
            </p>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Next evaluation:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Tomorrow, 07:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field / Zone Switcher Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Field Zones
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Select a zone to inspect depth telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {zones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            const isManuallyOn = manualOverrideActive[zone.id];
            const zoneMoisture = Math.round(zone.soilMoistureCurrent * currentScen.moistureMultiplier);

            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-xs ${
                  isSelected
                    ? 'border-emerald-800 dark:border-emerald-500 bg-white dark:bg-slate-900 ring-1 ring-emerald-800/30 dark:ring-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {zone.name}
                    </span>
                    <StatusBadge
                      status={isManuallyOn ? 'warning' : scenario === 'dry_spell' ? 'urgent' : 'optimal'}
                      label={isManuallyOn ? 'Manual ON' : currentScen.badgeLabel}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {zoneMoisture}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      (Target: {zone.soilMoistureTarget}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        zoneMoisture < 30
                          ? 'bg-amber-600 dark:bg-amber-500'
                          : zoneMoisture > 45
                          ? 'bg-emerald-700 dark:bg-emerald-500'
                          : 'bg-slate-500 dark:bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, zoneMoisture * 1.8)}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {scenario === 'dry_spell'
                      ? 'Depleted root zone requires 45 min drip cycle.'
                      : zone.recommendation}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saved: ~{zone.waterSavedLitres} L
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePump(zone.id);
                    }}
                    className={`text-xs font-medium px-2 py-1 rounded border transition-colors cursor-pointer ${
                      isManuallyOn
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isManuallyOn ? 'Stop Pump' : 'Manual Run'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
