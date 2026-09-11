import React, { useState } from 'react';
import {
  Droplets,
  Leaf,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  ArrowRight,
  X,
  CloudRain,
  ExternalLink,
} from 'lucide-react';
import { SustainabilityMetric, ScreenType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { BackButton } from '../common/BackButton';

interface SustainabilityScreenProps {
  metrics: SustainabilityMetric;
  onNavigate: (screen: ScreenType) => void;
}

export const SustainabilityScreen: React.FC<SustainabilityScreenProps> = ({
  metrics,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [showCalculationModal, setShowCalculationModal] = useState(false);
  const [showWaterConnectionModal, setShowWaterConnectionModal] = useState(false);

  if (!metrics) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <Leaf className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Sustainability Data Pending</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Sustainability scores are calculated after logging field operations, smart irrigation cycles, and treatment history.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium cursor-pointer transition-all shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0"
        >
          {t('sustainability.backToDashboard', 'Back to Dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <BackButton label={t('sustainability.backToDashboard', 'Back to Dashboard')} onClick={() => onNavigate('dashboard')} />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('sustainability.title', 'Sustainability Scorecard')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Resource conservation accounting: water savings, reduced chemical load, and agricultural carbon footprint
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCalculationModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>{t('sustainability.howCalculated', 'How is this calculated?')}</span>
        </button>
      </div>

      {/* Primary Score Overview Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-md bg-emerald-800 dark:bg-emerald-700 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-2xl font-bold font-sans leading-none">
                {metrics.overallScore}
              </span>
              <span className="text-[10px] uppercase font-medium tracking-wider text-emerald-200 dark:text-emerald-100 mt-0.5">
                / 100
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t('sustainability.ecoScore', 'Overall Sustainability Index')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400" />
                  Eco-Compliant Grade A
                </span>
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Operating in the top 15% of water-efficient farms in Anand district.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated through soil moisture telemetry, weather sync, and targeted disease spot treatment.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col md:items-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Benchmark comparison</span>
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
              +28% above regional flood-irrigation baseline
            </span>
          </div>
        </div>
      </div>

      {/* 3 Measurable Core Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pillar 1: Water Efficiency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Water Efficiency (40% weight)
              </span>
              <Droplets className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-sans mb-1">
              {metrics.waterEfficiencyScore}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Derived from automated drip scheduling and rain-hold logic, minimizing evaporation and runoff.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Regional Avg:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">64%</span>
          </div>
        </div>

        {/* Pillar 2: Chemical & Fungicide Reduction */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chemical Reduction (30% weight)
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-sans mb-1">
              {metrics.chemicalReductionScore}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Targeted leaf spot treatment over affected rows rather than blanket calendar chemical spray.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Runoff Prevented:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{metrics.runoffPreventedKg} kg Active</span>
          </div>
        </div>

        {/* Pillar 3: Soil Health & Conservation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Soil Health Index (30% weight)
              </span>
              <Leaf className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-sans mb-1">
              {metrics.soilHealthScore}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Organic carbon retention, minimal machinery compaction on wet soil, and microbial preservation.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Organic Carbon:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">0.72% (Target 0.8%)</span>
          </div>
        </div>
      </div>

      {/* Cross-Page Context Card: Water saved through delayed irrigation */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0 mt-0.5">
            <CloudRain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Water saved through delayed irrigation
              </h3>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 px-2 py-0.2 rounded">
                14,200 L Total
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Correlating 82% rain forecast with root-zone soil sensors prevented 6 unnecessary pumping cycles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowWaterConnectionModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
          >
            Explain Connection
          </button>
          <button
            type="button"
            onClick={() => onNavigate('irrigation')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
          >
            <span>{t('sustainability.viewIrrigationPlan', 'View Irrigation Plan')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Concrete Measurable Savings Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {t('sustainability.resourceAccounting', 'Measurable Resource Savings (Current Month)')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Verified reductions recorded through AgriSmart AI operational advisories
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => setShowWaterConnectionModal(true)}
            className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sustainability.waterConserved', 'Estimated Water Saved')}</div>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans my-1">
              {metrics.waterSavedMonthLitres.toLocaleString()} L
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Achieved by delaying irrigation pump cycles ahead of natural precipitation events. <span className="text-emerald-800 dark:text-emerald-400 font-medium underline">Inspect link</span>
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sustainability.carbonOffset', 'Carbon Offset (Pumping Power)')}</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans my-1">
              {metrics.carbonOffsetKg} kg CO₂e
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Energy reduction from eliminating 34 unnecessary pump runtime hours.
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Chemical Runoff Prevented</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-sans my-1">
              {metrics.runoffPreventedKg} kg
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Selective spot application prevented synthetic wash-off into regional drainage canals.
            </p>
          </div>
        </div>
      </div>

      {/* Practical Improvement Opportunities */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Targeted Sustainability Actions
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Agronomic upgrades recommended to reach higher efficiency targets
          </p>
        </div>

        <div className="space-y-2">
          {metrics.improvements.map((imp) => (
            <div
              key={imp.id}
              className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{imp.title}</h4>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded">
                    {imp.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{imp.impact}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                  +{imp.potentialPoints} Score Pts
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('assistant')}
                  className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ask Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "How is this calculated?" Methodology Modal */}
      {showCalculationModal && (
        <div
          onClick={() => setShowCalculationModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 shadow-xl z-10 border border-slate-200 dark:border-slate-800 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  How is the Sustainability Score Calculated?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Transparent mathematical derivation from farm telemetry</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Derivation Breakdown */}
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">1. Water Efficiency Factor</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">92 / 100 (Weight: 40%)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Calculated by comparing actual water applied versus optimal crop evapotranspiration (ETc). The 14,200 L saved via rain holds prevented excess aquifer pumping.
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  Contribution: 92 × 0.40 = +36.8 points
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">2. Chemical Reduction & Runoff</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">78 / 100 (Weight: 30%)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Calculated from targeted spot pruning instead of blanket prophylactic spraying. 4.8 kg active chemical load spared from drainage channels.
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  Contribution: 78 × 0.30 = +23.4 points
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">3. Soil Health & Compaction Index</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-400">81 / 100 (Weight: 30%)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Calculated from soil carbon content (0.72%) and halting tractor passes when clay loam moisture reaches plastic threshold.
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                  Contribution: 81 × 0.30 = +24.3 points
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                <span>Total Aggregated Index:</span>
                <span>36.8 + 23.4 + 24.3 = 84.5 ≈ 84 / 100</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md cursor-pointer shadow-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "Water saved through delayed irrigation" Connection Modal */}
      {showWaterConnectionModal && (
        <div
          onClick={() => setShowWaterConnectionModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 shadow-xl z-10 border border-slate-200 dark:border-slate-800 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  How Delayed Irrigation Delivers 14,200 L Water Savings
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cross-system synergy: Weather + Soil Telemetry + Pumping Control</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWaterConnectionModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                  <CloudRain className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <span>1. Weather Forecast Detection (82% Rain)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                  When the Anand district radar signals ≥70% rainfall probability with ≥10 mm expected accumulation, AgriSmart AI flags pending irrigation tasks.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                  <Droplets className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <span>2. Soil Sensor Verification (Field A: 31% Moisture)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                  Root-zone capacitance probes confirm that soil moisture is sufficient to sustain crop transpiration until natural precipitation arrives.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                  <span>3. Pump Cycle Suspension & Cumulative Impact</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                  A 5HP agricultural pump draws ~45,000 liters/hr across multiple plots. Canceling 6 unnecessary rain-coincident irrigation sessions preserved <strong>14,200 Liters</strong> and eliminated 34 pump runtime hours (52 kg CO₂e offset).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowWaterConnectionModal(false);
                  onNavigate('irrigation');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 cursor-pointer"
              >
                <span>Go to Smart Irrigation Telemetry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowWaterConnectionModal(false)}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
