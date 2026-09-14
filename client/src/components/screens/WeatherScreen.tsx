import React, { useState } from 'react';
import {
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  WeatherCondition,
  HourlyForecast,
  DailyForecast,
  ScreenType,
} from '../../types';
import { BackButton } from '../common/BackButton';

interface WeatherScreenProps {
  weather: WeatherCondition;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  onNavigate: (screen: ScreenType) => void;
}

type TimeHorizon = 'today' | 'tomorrow' | 'next3days';

export const WeatherScreen: React.FC<WeatherScreenProps> = ({
  weather,
  hourly,
  daily,
  onNavigate,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizon>('today');

  if (!weather || !hourly || !daily) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CloudRain className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Weather Telemetry Unavailable</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Local meteorological station telemetry is connecting. Check sensor online status or return to dashboard.
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

  const todayDaily = daily[0];
  const tomorrowDaily = daily[1];
  const next3Daily = daily[2];

  const horizonData = {
    today: {
      label: todayDaily ? `Today (${todayDaily.day}, ${todayDaily.date})` : 'Today',
      temp: weather.temperature,
      feelsLike: weather.feelsLike,
      rainProb: weather.rainProbability,
      rainfallMm: todayDaily?.rainfallMm ?? weather.rainfallExpectedMm,
      humidity: weather.humidity,
      windSpeed: weather.windSpeedKmH,
      uvIndex: weather.uvIndex,
      sprayStatus: weather.rainProbability >= 60 ? 'Unfavorable' : weather.rainProbability >= 30 ? 'Caution' : 'Optimal',
      sprayDotColor: weather.rainProbability >= 60 ? 'bg-rose-600' : weather.rainProbability >= 30 ? 'bg-amber-600' : 'bg-emerald-600',
      headline: todayDaily?.farmAdvisory || weather.forecastSummary,
      irrigationTag: weather.rainProbability >= 60 ? 'Irrigation Delayed' : 'Irrigation Evaluated',
      irrigationCta: weather.rainProbability >= 60 ? 'Irrigation delayed → View Irrigation Plan' : 'View Irrigation Plan',
      pillars: [
        {
          num: '1. Irrigation',
          title: weather.rainProbability >= 60 ? 'Hold scheduled irrigation cycles' : 'Maintain calibrated drip schedule',
          desc: weather.rainProbability >= 60
            ? `Rain (~${todayDaily?.rainfallMm ?? weather.rainfallExpectedMm} mm) will naturally replenish root zones, preventing root hypoxia.`
            : 'Evaporation deficit is steady. Deliver target moisture.',
        },
        {
          num: '2. Spray Operations',
          title: weather.rainProbability >= 60 ? 'Postpone chemical spray' : 'Foliar spray window open',
          desc: weather.rainProbability >= 60
            ? 'Rainfall will wash away foliar fungicides and cause pesticide runoff.'
            : `Favorable winds (<${weather.windSpeedKmH} km/h) and low rain risk.`,
        },
        {
          num: '3. Disease Prevention',
          title: 'Scout foliage for moisture stress',
          desc: 'High relative humidity encourages spore germination. Inspect lower canopy.',
        },
      ],
    },
    tomorrow: {
      label: tomorrowDaily ? `Tomorrow (${tomorrowDaily.day}, ${tomorrowDaily.date})` : 'Tomorrow',
      temp: tomorrowDaily?.maxTemp ?? 30,
      feelsLike: (tomorrowDaily?.maxTemp ?? 30) + 2,
      rainProb: tomorrowDaily?.rainProbability ?? 35,
      rainfallMm: tomorrowDaily?.rainfallMm ?? 1.2,
      humidity: 62,
      windSpeed: 11,
      uvIndex: tomorrowDaily?.uvIndexMax ?? 6,
      sprayStatus: (tomorrowDaily?.rainProbability ?? 0) >= 50 ? 'Caution' : 'Optimal Window',
      sprayDotColor: (tomorrowDaily?.rainProbability ?? 0) >= 50 ? 'bg-amber-600' : 'bg-emerald-600',
      headline: tomorrowDaily?.farmAdvisory || 'Forecast clearing conditions with moderate morning winds.',
      irrigationTag: 'Soil Monitored',
      irrigationCta: 'Soil moisture adequate → Check Sensors',
      pillars: [
        {
          num: '1. Irrigation',
          title: 'Monitor root moisture',
          desc: 'Check sensor telemetry before initiating secondary pump cycle.',
        },
        {
          num: '2. Spray Operations',
          title: 'Morning spray application',
          desc: 'Optimal early morning window before midday heat.',
        },
        {
          num: '3. Field Operations',
          title: 'Scout active crop plots',
          desc: 'Check newly expanded leaves for any initial disease symptoms.',
        },
      ],
    },
    next3days: {
      label: next3Daily ? `Upcoming (${next3Daily.day}, ${next3Daily.date})` : 'Next 3 Days',
      temp: next3Daily?.maxTemp ?? 32,
      feelsLike: (next3Daily?.maxTemp ?? 32) + 3,
      rainProb: next3Daily?.rainProbability ?? 10,
      rainfallMm: next3Daily?.rainfallMm ?? 0.0,
      humidity: 52,
      windSpeed: 9,
      uvIndex: next3Daily?.uvIndexMax ?? 7,
      sprayStatus: 'Optimal Conditions',
      sprayDotColor: 'bg-emerald-600',
      headline: next3Daily?.farmAdvisory || 'Sustained sunshine and dry weather across Anand cluster.',
      irrigationTag: 'Scheduled Drip',
      irrigationCta: 'Scheduled cycle → View Schedule',
      pillars: [
        {
          num: '1. Irrigation',
          title: 'Standard drip cycle',
          desc: 'Evapotranspiration will steadily deplete root zones.',
        },
        {
          num: '2. Spray Operations',
          title: 'Full operational flexibility',
          desc: 'Dry weather allows protective or curative foliar applications.',
        },
        {
          num: '3. Field Work',
          title: 'Safe for tractor transit',
          desc: 'Dry topsoil prevents subsoil compaction.',
        },
      ],
    },
  };

  const currentH = horizonData[activeHorizon];

  const agriculturalRisks = [
    {
      id: 'risk-1',
      title: 'High Fungal Spore Spread Risk',
      severity: 'high',
      crops: 'Tomato (Field A) & Potato (Field D)',
      explanation: `Warm temperatures (${Math.round(weather.temperature)}°C) combined with impending rain (${weather.rainfallExpectedMm !== undefined ? `${weather.rainfallExpectedMm} mm` : 'forecasted'} at ${weather.rainProbability}%) and high ambient humidity (${weather.humidity}%) create peak germination conditions for Alternaria solani and Phytophthora spores.`,
      actionableAdvice: 'Prune infected lower foliage immediately before rain begins. Do not spray chemicals before rain to avoid wash-off into irrigation channels.'
    },
    {
      id: 'risk-2',
      title: 'Foliar Spray Chemical Wash-off Window',
      severity: 'urgent',
      crops: 'All active plots',
      explanation: `Fungicides or foliar micronutrients require a minimum 4-hour dry rainfast window. Impending precipitation (${weather.rainProbability}% rain forecast) will wash away active compounds applied today.`,
      actionableAdvice: 'Close all spray operations until the next dry window opens with clear weather.'
    },
    {
      id: 'risk-3',
      title: 'Tractor Soil Compaction Advisory',
      severity: 'moderate',
      crops: 'Field B (Cotton Clay Loam)',
      explanation: `Clay loam in Field B will reach plastic limit with ${weather.rainfallExpectedMm !== undefined ? `${weather.rainfallExpectedMm} mm` : 'forecasted'} rain, causing heavy subsoil compaction if heavy machinery traverses rows.`,
      actionableAdvice: 'Restrict tractor transit and heavy wheel sprayers on Field B until topsoil dries.'
    }
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <BackButton label="Back to Dashboard" onClick={() => onNavigate('dashboard')} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Weather Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Regional Anand district meteorological data with agronomic advisory implications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('irrigation')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-xs"
          >
            Irrigation Status
          </button>
          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-xs"
          >
            Disease Scanner
          </button>
        </div>
      </div>

      {/* Time Horizon Selector (Today | Tomorrow | Next 3 Days) */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Forecast Horizon:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['today', 'tomorrow', 'next3days'] as TimeHorizon[]).map((horizon) => {
            const isSelected = activeHorizon === horizon;
            const labels = {
              today: 'Today',
              tomorrow: 'Tomorrow',
              next3days: 'Next 3 Days',
            };
            return (
              <button
                key={horizon}
                type="button"
                onClick={() => setActiveHorizon(horizon)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 dark:bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {labels[horizon]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Weather Advisory Callout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Agronomic Assessment · {currentH.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500" />
                {currentH.irrigationTag}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {currentH.headline}
            </h3>

            {/* Cross-system navigation CTA */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('irrigation')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 transition-colors cursor-pointer bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded"
              >
                <span>{currentH.irrigationCta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              {currentH.pillars.map((p) => (
                <div key={p.num} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase block mb-0.5">
                    {p.num}
                  </span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {p.title}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Current Conditions Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">Temperature</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{currentH.temp}°C</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Feels {currentH.feelsLike}°C</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">Rain Probability</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{currentH.rainProb}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">~{currentH.rainfallMm} mm expected</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">Relative Humidity</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{currentH.humidity}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{currentH.humidity > 65 ? 'Elevated humidity' : 'Optimal range'}</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">Wind Speed</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{currentH.windSpeed} km/h</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Breeze from SW</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">UV Index</div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{currentH.uvIndex}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{currentH.uvIndex > 5 ? 'High' : 'Moderate'}</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase mb-0.5">Spray Suitability</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${currentH.sprayDotColor}`} />
            <span className="truncate">{currentH.sprayStatus}</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {activeHorizon === 'today' ? 'Wait for dry window' : 'Window clear'}
          </div>
        </div>
      </div>

      {/* Hourly Spraying Window & Rain Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Hourly Advisory & Spray Windows
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              24-hour operational conditions and precipitation likelihood
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-500" /> Optimal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-500" /> Caution
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500" /> Unfavorable
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {hourly.map((h, i) => {
            const dotColor =
              h.spraySuitability === 'optimal'
                ? 'bg-emerald-700 dark:bg-emerald-500'
                : h.spraySuitability === 'caution'
                ? 'bg-amber-600 dark:bg-amber-500'
                : 'bg-rose-600 dark:bg-rose-500';

            return (
              <div
                key={i}
                className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{h.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  </div>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100 my-0.5">{h.temp}°C</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>{h.rainProbability}%</span>
                  </div>
                </div>

                <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                  {h.sprayNote}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Day Farm Operational Outlook */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            5-Day Farm Operational Outlook
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Medium-term planning for planting, spraying, and cultivation tasks
          </p>
        </div>

        <div className="space-y-1.5">
          {daily.map((day, idx) => (
            <div
              key={day.day}
              className={`p-3 rounded-md border transition-colors ${
                idx === 0
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 w-40 shrink-0">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {day.day}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">({day.date})</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono ml-auto">
                    {day.maxTemp}° / {day.minTemp}°
                  </span>
                </div>

                <div className="flex items-center gap-1 w-28 shrink-0 text-slate-600 dark:text-slate-400">
                  <CloudRain className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{day.rainProbability}%</span>
                  {day.rainfallMm > 0 && (
                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">({day.rainfallMm}mm)</span>
                  )}
                </div>

                <div className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-medium text-slate-900 dark:text-slate-100 mr-1">Advisory:</span>
                  {day.farmAdvisory}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crop-Specific Meteorological Risks */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Crop-Specific Weather Risks & Mitigations
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Actionable mitigations by crop plot
          </p>
        </div>

        <div className="space-y-2.5">
          {agriculturalRisks.map((risk) => (
            <div
              key={risk.id}
              className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{risk.title}</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                  {risk.crops}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {risk.explanation}
              </p>
              <div className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Recommended Action: </span>
                {risk.actionableAdvice}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
