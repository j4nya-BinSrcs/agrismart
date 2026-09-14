import React, { useState } from 'react';
import {
  CloudRain,
  AlertTriangle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import {
  WeatherCondition,
  HourlyForecast,
  DailyForecast,
  ScreenType,
  SUPPORTED_CROPS,
} from '../../types';
import { BackButton } from '../common/BackButton';
import { useFarm } from '../../context/FarmContext';

interface WeatherScreenProps {
  weather: WeatherCondition;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  onNavigate: (screen: ScreenType) => void;
}

type TimeHorizon = 'today' | 'tomorrow' | 'next3days';

function sprayFromRain(rainProb: number): { status: string; dot: string } {
  if (rainProb >= 60) return { status: 'Unfavorable', dot: 'bg-rose-600' };
  if (rainProb >= 30) return { status: 'Caution', dot: 'bg-amber-600' };
  return { status: 'Optimal', dot: 'bg-emerald-600' };
}

function cropLabel(crop: string): string {
  return SUPPORTED_CROPS.find((c) => c.value === crop)?.label || crop;
}

export const WeatherScreen: React.FC<WeatherScreenProps> = ({
  weather,
  hourly,
  daily,
  onNavigate,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizon>('today');
  const { locationLabel, activeFarm } = useFarm();
  const farmLocation = locationLabel || activeFarm?.location || 'Farm location';
  const fieldSummary =
    activeFarm?.plots?.length
      ? activeFarm.plots.map((p) => `${p.name} (${cropLabel(p.crop)})`).join(', ')
      : 'Your registered fields';

  if (!weather || !hourly || !daily) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CloudRain className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Weather data unavailable</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Could not load the Open-Meteo forecast for your farm location. Check your connection and try again.
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
  const todaySpray = sprayFromRain(weather.rainProbability);
  const tomorrowRain = tomorrowDaily?.rainProbability ?? 0;
  const next3Rain = next3Daily?.rainProbability ?? 0;
  const tomorrowSpray = sprayFromRain(tomorrowRain);
  const next3Spray = sprayFromRain(next3Rain);

  const buildPillars = (rainProb: number, rainfallMm: number, wind: number) => [
    {
      num: '1. Irrigation',
      title: rainProb >= 60 ? 'Hold scheduled irrigation cycles' : 'Review drip schedule against ET demand',
      desc:
        rainProb >= 60
          ? `Forecast rain (~${rainfallMm} mm, ${rainProb}% probability) can recharge the root zone — confirm with field checks or IoT sensors.`
          : 'Low rain chance. Use weather-based ET estimates; IoT moisture sensors give exact root-zone readings.',
    },
    {
      num: '2. Spray Operations',
      title: rainProb >= 60 ? 'Postpone foliar spray' : rainProb >= 30 || wind >= 13 ? 'Spray with caution' : 'Spray window open',
      desc:
        rainProb >= 60
          ? 'Rain within the rainfast period washes off foliar products.'
          : wind >= 20
            ? `High wind (${wind} km/h) increases drift risk.`
            : `Guidance uses rain probability and wind (${wind} km/h). Prefer early morning when foliage is dry.`,
    },
    {
      num: '3. Disease Prevention',
      title: weather.humidity >= 70 ? 'Scout for foliar disease pressure' : 'Routine canopy scouting',
      desc:
        weather.humidity >= 70
          ? `Elevated humidity (${weather.humidity}% RH) favors fungal spore germination on tomato, potato, and pepper.`
          : 'Inspect lower canopy after dew nights; humidity and leaf wetness drive disease risk.',
    },
  ];

  const horizonData = {
    today: {
      label: todayDaily ? `Today (${todayDaily.day}, ${todayDaily.date})` : 'Today',
      temp: weather.temperature,
      feelsLike: weather.feelsLike,
      rainProb: weather.rainProbability,
      rainfallMm: todayDaily?.rainfallMm ?? weather.rainfallExpectedMm ?? 0,
      humidity: weather.humidity,
      windSpeed: weather.windSpeedKmH,
      uvIndex: weather.uvIndex,
      sprayStatus: todaySpray.status,
      sprayDotColor: todaySpray.dot,
      headline: todayDaily?.farmAdvisory || weather.forecastSummary,
      irrigationTag: weather.rainProbability >= 60 ? 'Irrigation Delayed' : 'Irrigation Evaluated',
      irrigationCta: weather.rainProbability >= 60 ? 'Irrigation delayed → View plan' : 'View Irrigation Plan',
      pillars: buildPillars(
        weather.rainProbability,
        todayDaily?.rainfallMm ?? weather.rainfallExpectedMm ?? 0,
        weather.windSpeedKmH
      ),
    },
    tomorrow: {
      label: tomorrowDaily ? `Tomorrow (${tomorrowDaily.day}, ${tomorrowDaily.date})` : 'Tomorrow',
      temp: tomorrowDaily?.maxTemp ?? weather.temperature,
      feelsLike: tomorrowDaily?.maxTemp ?? weather.feelsLike,
      rainProb: tomorrowRain,
      rainfallMm: tomorrowDaily?.rainfallMm ?? 0,
      humidity: weather.humidity,
      windSpeed: weather.windSpeedKmH,
      uvIndex: tomorrowDaily?.uvIndexMax ?? weather.uvIndex,
      sprayStatus: tomorrowSpray.status,
      sprayDotColor: tomorrowSpray.dot,
      headline:
        tomorrowDaily?.farmAdvisory ||
        `Forecast for ${farmLocation}: ${tomorrowDaily?.condition || weather.condition}.`,
      irrigationTag: tomorrowRain >= 60 ? 'Likely rain hold' : 'Plan from forecast',
      irrigationCta: 'View Irrigation Plan',
      pillars: buildPillars(tomorrowRain, tomorrowDaily?.rainfallMm ?? 0, weather.windSpeedKmH),
    },
    next3days: {
      label: next3Daily ? `Upcoming (${next3Daily.day}, ${next3Daily.date})` : 'Next 3 Days',
      temp: next3Daily?.maxTemp ?? weather.temperature,
      feelsLike: next3Daily?.maxTemp ?? weather.feelsLike,
      rainProb: next3Rain,
      rainfallMm: next3Daily?.rainfallMm ?? 0,
      humidity: weather.humidity,
      windSpeed: weather.windSpeedKmH,
      uvIndex: next3Daily?.uvIndexMax ?? weather.uvIndex,
      sprayStatus: next3Spray.status,
      sprayDotColor: next3Spray.dot,
      headline:
        next3Daily?.farmAdvisory ||
        `Outlook for ${farmLocation}: ${next3Daily?.condition || 'see 5-day forecast below'}.`,
      irrigationTag: next3Rain >= 60 ? 'Rain in outlook' : 'Schedule from outlook',
      irrigationCta: 'View Irrigation Plan',
      pillars: buildPillars(next3Rain, next3Daily?.rainfallMm ?? 0, weather.windSpeedKmH),
    },
  };

  const currentH = horizonData[activeHorizon];

  const agriculturalRisks = [
    ...(weather.rainProbability >= 40 || weather.humidity >= 70
      ? [
          {
            id: 'risk-1',
            title: 'Fungal disease pressure window',
            severity: weather.humidity >= 80 ? 'high' : 'moderate',
            crops: fieldSummary,
            explanation: `At ${Math.round(weather.temperature)}°C with ${weather.humidity}% RH and ${weather.rainProbability}% rain probability (~${weather.rainfallExpectedMm ?? 0} mm), leaf wetness favors early blight and late blight on solanaceous crops.`,
            actionableAdvice:
              'Scout lower leaves before rain. Delay protective sprays if rain is imminent (wash-off). Prefer dry windows from the hourly spray table.',
          },
        ]
      : []),
    ...(weather.rainProbability >= 30
      ? [
          {
            id: 'risk-2',
            title: 'Foliar spray wash-off risk',
            severity: weather.rainProbability >= 60 ? 'urgent' : 'moderate',
            crops: fieldSummary,
            explanation: `Products need a dry rainfast period. Current forecast shows ${weather.rainProbability}% rain probability for ${farmLocation}.`,
            actionableAdvice:
              'Use the hourly spray suitability row (rain + wind). Avoid application when suitability is unfavorable.',
          },
        ]
      : []),
    ...(weather.rainfallExpectedMm !== undefined && weather.rainfallExpectedMm >= 5
      ? [
          {
            id: 'risk-3',
            title: 'Field traffic after heavy rain',
            severity: 'moderate',
            crops: fieldSummary,
            explanation: `~${weather.rainfallExpectedMm} mm rain expected near ${farmLocation}. Wet soils compact easily under tractor weight.`,
            actionableAdvice: 'Postpone heavy machinery until surface soil firms. Prefer light scouting on foot first.',
          },
        ]
      : []),
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
            Live Open-Meteo forecast for {farmLocation} with spray and irrigation advisories
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
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">From live forecast</div>
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
          {agriculturalRisks.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
              No elevated weather-driven risks for {farmLocation} right now based on rain probability and humidity.
              Keep using the hourly spray windows for day-to-day decisions.
            </p>
          ) : (
            agriculturalRisks.map((risk) => (
              <div
                key={risk.id}
                className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{risk.title}</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded truncate max-w-[50%]">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
