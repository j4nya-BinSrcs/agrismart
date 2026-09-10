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

interface IrrigationScreenProps {
  zones: IrrigationZone[];
  totalSavedLitres: number;
  onNavigate: (screen: ScreenType) => void;
}

type IrrigationScenario = 'rain_imminent' | 'dry_spell' | 'post_rain';

export const IrrigationScreen: React.FC<IrrigationScreenProps> = ({
  zones,
  totalSavedLitres,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0].id);
  const [manualOverrideActive, setManualOverrideActive] = useState<Record<string, boolean>>({});
  const [showReasoningModal, setShowReasoningModal] = useState<boolean>(false);
  const [scenario, setScenario] = useState<IrrigationScenario>('rain_imminent');

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

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
      label: 'Current: Rain Imminent (82%)',
      status: 'IRRIGATION NOT REQUIRED',
      statusBadge: 'delay',
      badgeLabel: 'Delay Advised',
      moistureMultiplier: 1.0,
      rainProb: 82,
      rainfallMm: 14.5,
      recommendation: 'Delay pump cycles until tomorrow. Rainfall will replenish moisture naturally to 48%, preventing waterlogging and saving pump power.',
      waterSavedToday: '1,850 L',
      reasonSummary: 'Rainfall will recharge soil without artificial pumping.',
    },
    dry_spell: {
      label: 'Simulation: Dry Spell (0% Rain)',
      status: 'IRRIGATION REQUIRED',
      statusBadge: 'urgent',
      badgeLabel: 'Pumping Required',
      moistureMultiplier: 0.72,
      rainProb: 0,
      rainfallMm: 0.0,
      recommendation: 'Run Drip Line Zone A for 45 minutes at 06:00 AM. Evaporation deficit requires replenishment to sustain flowering.',
      waterSavedToday: '0 L (Irrigating)',
      reasonSummary: 'Soil moisture depleted below threshold (22%). Rain probability is 0%.',
    },
    post_rain: {
      label: 'Simulation: Post-Rain (+24 hrs)',
      status: 'SOIL RECHARGED (MONITORING)',
      statusBadge: 'optimal',
      badgeLabel: 'Optimal Saturated',
      moistureMultiplier: 1.55,
      rainProb: 15,
      rainfallMm: 0.0,
      recommendation: 'Keep all pumps suspended. Allow natural gravitational drainage and root aeration. Next sensor evaluation Saturday 07:00.',
      waterSavedToday: '2,400 L',
      reasonSummary: 'Soil moisture is optimal at 48% following rainfall event.',
    },
  };

  const currentScen = scenarioConfig[scenario];
  const dynamicMoisture = Math.round(selectedZone.soilMoistureCurrent * currentScen.moistureMultiplier);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* "Why Delay Irrigation?" Agronomic Reasoning Modal */}
      {showReasoningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Why Delay Irrigation?</h3>
                <p className="text-xs text-slate-500">Telemetry inputs & agronomic decision calculation</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReasoningModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Structured Telemetry Table */}
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 block">Current Soil Moisture</span>
                  <span className="text-base font-semibold text-slate-900">{dynamicMoisture}%</span>
                  <span className="text-[10px] text-slate-500 block">Field A Tomato root zone</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 block">Precipitation Forecast</span>
                  <span className="text-base font-semibold text-slate-900">{currentScen.rainProb}%</span>
                  <span className="text-[10px] text-slate-500 block">~{currentScen.rainfallMm} mm expected today</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-[10px] uppercase font-medium text-slate-500 block">Agronomic Evaluation</span>
                <p className="text-slate-700 leading-relaxed">
                  Field A current soil moisture is <strong>{dynamicMoisture}%</strong>, which is safely above the permanent wilting point (18%) and within acceptable vegetative range.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  The forecasted <strong>{currentScen.rainfallMm} mm</strong> rainfall will naturally infiltrate and raise root-zone moisture to approximately <strong>48%</strong> without electrical pump consumption.
                </p>
                <p className="text-emerald-900 font-medium pt-1">
                  <strong>Conclusion:</strong> Irrigation can be delayed today. Running pumps now would saturate soil, starve fine roots of oxygen, and cause nitrogen fertilizer leaching.
                </p>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
                <span>Calculated resource conservation:</span>
                <span className="font-semibold">{currentScen.waterSavedToday} saved</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowReasoningModal(false);
                  onNavigate('weather');
                }}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
              >
                Inspect rainfall timeline →
              </button>
              <button
                type="button"
                onClick={() => setShowReasoningModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 text-white font-medium text-xs hover:bg-emerald-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Smart Irrigation Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Soil sensor telemetry correlated with local precipitation forecast
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('weather')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Weather Forecast
          </button>
          <button
            type="button"
            onClick={() => onNavigate('sustainability')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-800 text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            Water Savings
          </button>
        </div>
      </div>

      {/* Scenario Simulator Selector */}
      <div className="bg-white border border-slate-200 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Droplets className="w-3.5 h-3.5 text-slate-400" />
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
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {scenarioConfig[scenKey].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Irrigation Advisory */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Current Status
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 font-sans">
                <span className={`w-2 h-2 rounded-full ${scenario === 'dry_spell' ? 'bg-amber-600' : 'bg-emerald-700'}`} />
                {currentScen.status}
              </span>
              {/* [ View reasoning ] button */}
              <button
                type="button"
                onClick={() => setShowReasoningModal(true)}
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                <span>View reasoning</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-semibold text-slate-900">
                {dynamicMoisture}%
              </span>
              <span className="text-xs text-slate-500">
                Average Soil Moisture ({selectedZone.crop})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                <CloudRain className="w-3.5 h-3.5 text-slate-600" />
                Rain forecast: {currentScen.rainProb}% (~{currentScen.rainfallMm} mm)
              </span>
              <span>•</span>
              <span>Root Zone: {selectedZone.rootDepth}</span>
              <span>•</span>
              <span>Soil: {selectedZone.soilType}</span>
            </div>
          </div>

          <div className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                Recommendation
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {currentScen.waterSavedToday} Saved
              </span>
            </div>

            <p className="text-slate-700 font-medium leading-relaxed">
              {currentScen.recommendation}
            </p>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>Next evaluation:</span>
              <span className="font-medium text-slate-700">Tomorrow, 07:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field / Zone Switcher Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900">
            Field Zones
          </h2>
          <span className="text-[11px] text-slate-400">
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
                className={`p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-800 bg-white ring-1 ring-emerald-800/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {zone.name}
                    </span>
                    <StatusBadge
                      status={isManuallyOn ? 'warning' : scenario === 'dry_spell' ? 'urgent' : 'optimal'}
                      label={isManuallyOn ? 'Manual ON' : currentScen.badgeLabel}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-semibold text-slate-900">
                      {zoneMoisture}%
                    </span>
                    <span className="text-xs text-slate-500">
                      (Target: {zone.soilMoistureTarget}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        zoneMoisture < 30
                          ? 'bg-amber-600'
                          : zoneMoisture > 45
                          ? 'bg-emerald-700'
                          : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min(100, zoneMoisture * 1.8)}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {scenario === 'dry_spell'
                      ? 'Depleted root zone requires 45 min drip cycle.'
                      : zone.recommendation}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
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
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
