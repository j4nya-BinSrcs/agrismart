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

  const horizonData = {
    today: {
      label: 'Today (Thu, Sep 11)',
      temp: 28,
      feelsLike: 31,
      rainProb: 82,
      rainfallMm: 14.5,
      humidity: 68,
      windSpeed: 14,
      uvIndex: 4,
      sprayStatus: 'Unfavorable',
      sprayDotColor: 'bg-rose-600',
      headline: 'Heavy precipitation event expected this afternoon (~14.5 mm, 82% probability).',
      irrigationTag: 'Irrigation Delayed',
      irrigationCta: 'Irrigation delayed → View Irrigation Plan',
      pillars: [
        {
          num: '1. Irrigation',
          title: 'Hold scheduled irrigation cycles',
          desc: 'Rain will naturally replenish root zones to 48%, preventing root hypoxia and saving 1,850 L.',
        },
        {
          num: '2. Spray Operations',
          title: 'Postpone chemical spray',
          desc: 'Rainfall arriving ~2:00 PM will wash away foliar fungicides. Hold until Friday morning.',
        },
        {
          num: '3. Disease Prevention',
          title: 'Prune infected leaves before rain',
          desc: 'Removes Alternaria spore source before raindrop impact splashes pathogens upward.',
        },
      ],
    },
    tomorrow: {
      label: 'Tomorrow (Fri, Sep 12)',
      temp: 30,
      feelsLike: 33,
      rainProb: 35,
      rainfallMm: 1.2,
      humidity: 62,
      windSpeed: 11,
      uvIndex: 6,
      sprayStatus: 'Optimal Window (7–11:30 AM)',
      sprayDotColor: 'bg-emerald-600',
      headline: 'Post-rain clearing conditions. Favorable 4-hour morning application window.',
      irrigationTag: 'Irrigation Paused',
      irrigationCta: 'Soil moisture adequate → Check Sensors',
      pillars: [
        {
          num: '1. Irrigation',
          title: 'Keep pumps idle',
          desc: 'Soil moisture remains above 42% after yesterday’s rainfall. No supplemental water required.',
        },
        {
          num: '2. Spray Operations',
          title: 'Foliar spray window open',
          desc: 'Calm morning winds (<11 km/h) and dry foliage make 7:00–11:30 AM ideal for protective spray.',
        },
        {
          num: '3. Disease Prevention',
          title: 'Scout Field A for secondary spots',
          desc: 'Check newly expanded tomato leaves for any initial pinhead chlorotic spots.',
        },
      ],
    },
    next3days: {
      label: 'Next 3 Days (Sat–Mon, Sep 13–15)',
      temp: 32,
      feelsLike: 35,
      rainProb: 10,
      rainfallMm: 0.0,
      humidity: 52,
      windSpeed: 9,
      uvIndex: 7,
      sprayStatus: 'Optimal Conditions',
      sprayDotColor: 'bg-emerald-600',
      headline: 'Sustained sunshine and dry weather. Evapotranspiration will steadily deplete root zones.',
      irrigationTag: 'Scheduled for Sunday',
      irrigationCta: 'Sunday cycle scheduled → View Schedule',
      pillars: [
        {
          num: '1. Irrigation',
          title: 'Schedule Sunday morning cycle',
          desc: 'Evaporation rate of ~4.8 mm/day will bring Field A moisture down to 26% by Sunday morning.',
        },
        {
          num: '2. Spray Operations',
          title: 'Full operational flexibility',
          desc: 'Zero rain risk. Excellent conditions for bio-fungicide or nutrient foliar feeding.',
        },
        {
          num: '3. Field Work',
          title: 'Safe for tractor cultivation',
          desc: 'Topsoil will dry past plastic limit by Saturday afternoon, preventing subsoil compaction.',
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
      explanation: 'Warm temperatures (28°C) combined with impending heavy rain (14.5mm) and high ambient humidity (68%) create peak germination conditions for Alternaria solani and Phytophthora spores.',
      actionableAdvice: 'Prune infected lower foliage immediately before rain begins. Do not spray chemicals before rain to avoid wash-off into irrigation channels.'
    },
    {
      id: 'risk-2',
      title: 'Foliar Spray Chemical Wash-off Window',
      severity: 'urgent',
      crops: 'All active plots',
      explanation: 'Fungicides or foliar micronutrients require a minimum 4-hour dry rainfast window. Rainfall starting around 2:00 PM will wash away any active compounds applied today.',
      actionableAdvice: 'Close all spray operations until the dry window opens Friday morning (Sep 12, 7:00 AM).'
    },
    {
      id: 'risk-3',
      title: 'Tractor Soil Compaction Advisory',
      severity: 'moderate',
      crops: 'Field B (Cotton Clay Loam)',
      explanation: 'Clay loam in Field B will reach plastic limit with 14mm rain, causing heavy subsoil compaction if heavy machinery traverses rows.',
      actionableAdvice: 'Restrict tractor transit and heavy wheel sprayers on Field B until Saturday.'
    }
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Weather Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Regional Anand district meteorological data with agronomic advisory implications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('irrigation')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Irrigation Status
          </button>
          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-800 text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            Disease Scanner
          </button>
        </div>
      </div>

      {/* Time Horizon Selector (Today | Tomorrow | Next 3 Days) */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white border border-slate-200 p-2 rounded-lg">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {labels[horizon]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Weather Advisory Callout */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Agronomic Assessment · {currentH.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                {currentH.irrigationTag}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {currentH.headline}
            </h3>

            {/* Cross-system navigation CTA */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('irrigation')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded"
              >
                <span>{currentH.irrigationCta}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
              {currentH.pillars.map((p) => (
                <div key={p.num} className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-medium text-slate-500 uppercase block mb-0.5">
                    {p.num}
                  </span>
                  <p className="font-medium text-slate-900">
                    {p.title}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
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
        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">Temperature</div>
          <div className="text-xl font-semibold text-slate-900">{currentH.temp}°C</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Feels {currentH.feelsLike}°C</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">Rain Probability</div>
          <div className="text-xl font-semibold text-slate-900">{currentH.rainProb}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">~{currentH.rainfallMm} mm expected</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">Relative Humidity</div>
          <div className="text-xl font-semibold text-slate-900">{currentH.humidity}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{currentH.humidity > 65 ? 'Elevated humidity' : 'Optimal range'}</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">Wind Speed</div>
          <div className="text-xl font-semibold text-slate-900">{currentH.windSpeed} km/h</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Breeze from SW</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">UV Index</div>
          <div className="text-xl font-semibold text-slate-900">{currentH.uvIndex}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{currentH.uvIndex > 5 ? 'High' : 'Moderate'}</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200">
          <div className="text-[10px] font-medium text-slate-500 uppercase mb-0.5">Spray Suitability</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${currentH.sprayDotColor}`} />
            <span className="truncate">{currentH.sprayStatus}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {activeHorizon === 'today' ? 'Wait for dry window' : 'Window clear'}
          </div>
        </div>
      </div>

      {/* Hourly Spraying Window & Rain Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-semibold text-slate-900">
              Hourly Advisory & Spray Windows
            </h3>
            <p className="text-[11px] text-slate-500">
              24-hour operational conditions and precipitation likelihood
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" /> Optimal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Caution
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Unfavorable
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {hourly.map((h, i) => {
            const dotColor =
              h.spraySuitability === 'optimal'
                ? 'bg-emerald-700'
                : h.spraySuitability === 'caution'
                ? 'bg-amber-600'
                : 'bg-rose-600';

            return (
              <div
                key={i}
                className="p-2.5 rounded-md border border-slate-200 bg-slate-50/60 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{h.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                  </div>
                  <div className="text-base font-semibold text-slate-900 my-0.5">{h.temp}°C</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-slate-400" />
                    <span>{h.rainProbability}%</span>
                  </div>
                </div>

                <div className="pt-2 mt-1 border-t border-slate-200/60 text-[10px] text-slate-600 leading-tight">
                  {h.sprayNote}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-Day Farm Operational Outlook */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900">
            5-Day Farm Operational Outlook
          </h3>
          <p className="text-[11px] text-slate-500">
            Medium-term planning for planting, spraying, and cultivation tasks
          </p>
        </div>

        <div className="space-y-1.5">
          {daily.map((day, idx) => (
            <div
              key={day.day}
              className={`p-3 rounded-md border transition-colors ${
                idx === 0
                  ? 'border-slate-300 bg-slate-50/80'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 w-40 shrink-0">
                  <span className="font-semibold text-slate-900">
                    {day.day}
                  </span>
                  <span className="text-slate-400 text-[11px]">({day.date})</span>
                  <span className="text-slate-600 font-mono ml-auto">
                    {day.maxTemp}° / {day.minTemp}°
                  </span>
                </div>

                <div className="flex items-center gap-1 w-28 shrink-0 text-slate-600">
                  <CloudRain className="w-3.5 h-3.5 text-slate-500" />
                  <span>{day.rainProbability}%</span>
                  {day.rainfallMm > 0 && (
                    <span className="text-slate-400 text-[11px]">({day.rainfallMm}mm)</span>
                  )}
                </div>

                <div className="flex-1 text-slate-700 leading-relaxed">
                  <span className="font-medium text-slate-900 mr-1">Advisory:</span>
                  {day.farmAdvisory}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crop-Specific Meteorological Risks */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900">
            Crop-Specific Weather Risks & Mitigations
          </h3>
          <p className="text-[11px] text-slate-500">
            Actionable mitigations by crop plot
          </p>
        </div>

        <div className="space-y-2.5">
          {agriculturalRisks.map((risk) => (
            <div
              key={risk.id}
              className="p-3 rounded-md border border-slate-200 bg-slate-50 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">{risk.title}</span>
                <span className="text-[11px] text-slate-600 font-medium bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {risk.crops}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {risk.explanation}
              </p>
              <div className="text-xs text-slate-800 bg-white border border-slate-200 p-2 rounded">
                <span className="font-semibold text-slate-900">Recommended Action: </span>
                {risk.actionableAdvice}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
