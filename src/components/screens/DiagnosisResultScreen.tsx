import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Droplets,
  CloudRain,
  Leaf,
  MessageSquareHeart,
  CheckSquare,
  Square,
  ArrowLeft,
  Share2,
  Printer,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Camera,
  Layers,
  FlaskConical,
  Microscope,
  Check,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
  X,
} from 'lucide-react';
import { DiagnosisRecord, ScreenType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

interface DiagnosisResultScreenProps {
  diagnosis: DiagnosisRecord;
  onNavigate: (screen: ScreenType) => void;
  onAskAssistantWithContext: (query: string) => void;
}

export const DiagnosisResultScreen: React.FC<DiagnosisResultScreenProps> = ({
  diagnosis,
  onNavigate,
  onAskAssistantWithContext,
}) => {
  const { showToast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedProtocolTab, setSelectedProtocolTab] = useState<'organic' | 'conventional'>('organic');
  const [reportSaved, setReportSaved] = useState<boolean>(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'accurate' | 'inaccurate' | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  const toggleStep = (stepNumber: number) => {
    if (completedSteps.includes(stepNumber)) {
      setCompletedSteps(completedSteps.filter((s) => s !== stepNumber));
    } else {
      setCompletedSteps([...completedSteps, stepNumber]);
    }
  };

  const handleAskAssistant = () => {
    onAskAssistantWithContext(
      `I need guidance on treating ${diagnosis.diseaseName} in my ${diagnosis.crop} (${diagnosis.fieldLocation}). What is the exact spray schedule considering the 82% rain forecast?`
    );
    onNavigate('assistant');
  };

  const handlePrintOrSave = () => {
    setReportSaved(true);
    showToast('Diagnostic advisory report saved and exported as PDF.', 'success');
    setTimeout(() => setReportSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Zoom / Full Inspection Modal */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white rounded-lg overflow-hidden border border-slate-200 shadow-xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Microscope className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-semibold text-slate-900">{diagnosis.crop} Leaf Detail Inspection</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mt-3 rounded overflow-hidden flex items-center justify-center bg-slate-100 min-h-[340px]">
              <img
                src={diagnosis.imageUrl}
                alt={diagnosis.crop}
                className="max-h-[420px] w-auto object-contain"
              />
              {showBoundingBoxes && !diagnosis.isHealthy && (
                <div className="absolute inset-12 border border-rose-500 rounded pointer-events-none flex items-start justify-start p-1.5">
                  <span className="bg-rose-700 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                    Lesion ({diagnosis.confidence}%)
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer text-xs"
              >
                {showBoundingBoxes ? 'Hide Lesion Highlights' : 'Show Lesion Highlights'}
              </button>
              <span className="text-[11px]">Feature extraction verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => onNavigate('diagnose')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scanner</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOrSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>{reportSaved ? 'Saved ✓' : 'Export Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Primary Diagnosis Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Diagnostic Report</span>
              <span>•</span>
              <span>{diagnosis.fieldLocation}</span>
              <span>•</span>
              <span>{diagnosis.detectedAt}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {diagnosis.diseaseName}
              </h1>
            </div>

            {/* Scientific Pathogen Classification */}
            {diagnosis.pathogenName && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                <Microscope className="w-3 h-3 text-slate-500" />
                <span>Pathogen: <span className="text-slate-900 font-medium">{diagnosis.pathogenName}</span></span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <StatusBadge
                status={diagnosis.isHealthy ? 'healthy' : 'warning'}
                label={diagnosis.isHealthy ? 'Healthy' : `${diagnosis.confidence}% Confidence`}
                size="md"
              />

              {!diagnosis.isHealthy && (
                <button
                  type="button"
                  onClick={() => setShowWhyModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>Why this diagnosis?</span>
                </button>
              )}

              <span className="text-slate-300">|</span>

              <span className="text-slate-600">
                Crop: <strong className="text-slate-900 font-medium">{diagnosis.crop}</strong> {diagnosis.variety ? `(${diagnosis.variety})` : ''}
              </span>

              <span className="text-slate-300">|</span>

              <span className="text-slate-600">
                Stage: <strong className="text-slate-900 font-medium">{diagnosis.growthStage}</strong>
              </span>

              <span className="text-slate-300">|</span>

              <span className="text-slate-600 flex items-center gap-1">
                <span>Severity:</span>
                <span className={`capitalize font-medium ${
                  diagnosis.severity === 'low' ? 'text-emerald-800' :
                  diagnosis.severity === 'moderate' ? 'text-amber-800' : 'text-rose-800'
                }`}>
                  {diagnosis.severity}
                </span>
              </span>
            </div>

            {/* Explanation */}
            <div className="mt-4 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                Observation Summary
              </div>
              <p className="text-slate-700 leading-relaxed">
                {diagnosis.shortExplanation}
              </p>
            </div>
          </div>

          {/* Leaf Visual Inspection Window */}
          <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative w-full h-44 rounded-md overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group"
            >
              <img
                src={diagnosis.imageUrl}
                alt={diagnosis.crop}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                <span className="px-2 py-1 rounded bg-slate-900/80 text-white text-[11px] font-medium flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  <span>Enlarge</span>
                </span>
              </div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center justify-between font-mono">
                <span>{diagnosis.crop}</span>
                <span>{diagnosis.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainability Section: Symptoms Matched vs Symptoms Ruled Out */}
      {(diagnosis.symptomsMatched || diagnosis.symptomsRuledOut) && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900">
              Diagnostic Differentiation
            </h3>
            <p className="text-[11px] text-slate-500">
              Identified symptom markers and ruled-out conditions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Symptoms Matched */}
            {diagnosis.symptomsMatched && (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Matched Symptoms ({diagnosis.symptomsMatched.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {diagnosis.symptomsMatched.map((symptom, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-700 mt-1.5 shrink-0" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Symptoms Ruled Out */}
            {diagnosis.symptomsRuledOut && (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-medium text-xs">
                  <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Ruled-out Conditions ({diagnosis.symptomsRuledOut.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {diagnosis.symptomsRuledOut.map((ruledOut, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>{ruledOut}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dual Treatment Protocols: Organic / Biological vs Conventional Chemical */}
      {diagnosis.treatmentProtocols && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Treatment Protocols
              </h3>
              <p className="text-[11px] text-slate-500">
                Compare biological management and conventional treatment options
              </p>
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-200 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedProtocolTab('organic')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedProtocolTab === 'organic'
                    ? 'bg-white text-emerald-800 font-medium shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Organic / Bio
              </button>
              <button
                type="button"
                onClick={() => setSelectedProtocolTab('conventional')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedProtocolTab === 'conventional'
                    ? 'bg-white text-slate-900 font-medium shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Conventional
              </button>
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 bg-slate-50 space-y-2.5">
            <div className="text-xs text-slate-800 leading-relaxed">
              {selectedProtocolTab === 'organic' ? (
                <div className="space-y-1">
                  <div className="font-medium text-emerald-900 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Biological Treatment</span>
                  </div>
                  <p className="text-slate-700 text-xs">{diagnosis.treatmentProtocols.organic}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-slate-700" />
                    <span>Conventional Chemical</span>
                  </div>
                  <p className="text-slate-700 text-xs">{diagnosis.treatmentProtocols.conventional}</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="font-medium text-slate-900 block text-[11px]">Dosage:</span>
                <span className="text-slate-600 text-xs">{diagnosis.treatmentProtocols.dosage}</span>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200">
                <span className="font-medium text-slate-900 block text-[11px]">Application Window:</span>
                <span className="text-slate-600 text-xs">{diagnosis.treatmentProtocols.applicationTiming}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Section: Recommended Actions & Precautions (Left) + Multi-Module Insights (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Actionable Protocol (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step-by-Step Action Plan */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  Action Steps
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recommended order of field execution
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-800">
                {completedSteps.length} of {diagnosis.recommendedActions.length} Complete
              </span>
            </div>

            <div className="space-y-2">
              {diagnosis.recommendedActions.map((action) => {
                const isDone = completedSteps.includes(action.step);
                return (
                  <div
                    key={action.step}
                    onClick={() => toggleStep(action.step)}
                    className={`p-3 rounded-md border transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        className="mt-0.5 text-slate-400"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={`text-xs font-medium ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            Step {action.step}: {action.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {action.timing}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Essential Precautions */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Field Precautions</span>
            </h3>

            <ul className="space-y-1.5">
              {diagnosis.precautions.map((precaution, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-600 p-2 rounded bg-slate-50 border border-slate-200/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                  <span>{precaution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Farmer Feedback Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-medium text-slate-900">Was this diagnosis accurate?</h4>
              <p className="text-[11px] text-slate-400">Refines local crop model calibration</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFeedbackGiven('accurate')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackGiven === 'accurate'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ThumbsUp className="w-3 h-3" />
                <span>Accurate</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackGiven('inaccurate')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackGiven === 'inaccurate'
                    ? 'bg-rose-800 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ThumbsDown className="w-3 h-3" />
                <span>Review</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Related Cross-System Insights (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Related Cross-Module Intelligence Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold text-slate-900">
                Cross-System Implications
              </h3>
              <p className="text-[11px] text-slate-500">
                Correlated impact on weather, irrigation, and sustainability
              </p>
            </div>

            {/* Weather Consideration */}
            <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <CloudRain className="w-3.5 h-3.5 text-sky-700" />
                <span>Weather Correlation</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                {diagnosis.relatedInsights.weatherRisk}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="text-[11px] text-emerald-800 hover:underline cursor-pointer pt-1 block"
              >
                View rainfall timeline →
              </button>
            </div>

            {/* Irrigation Consideration */}
            <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <Droplets className="w-3.5 h-3.5 text-emerald-700" />
                <span>Irrigation Guidance</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                {diagnosis.relatedInsights.irrigationAdvice}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('irrigation')}
                className="text-[11px] text-emerald-800 hover:underline cursor-pointer pt-1 block"
              >
                Inspect soil sensor data →
              </button>
            </div>

            {/* Sustainability Implication */}
            <div className="p-2.5 rounded-md border border-slate-200 bg-slate-50 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                <span>Sustainability Impact</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                {diagnosis.relatedInsights.sustainabilityImpact}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('sustainability')}
                className="text-[11px] text-emerald-800 hover:underline cursor-pointer pt-1 block"
              >
                View chemical reduction tracker →
              </button>
            </div>
          </div>

          {/* Ask AgriSmart Advisor CTA */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
            <div>
              <h4 className="text-xs font-semibold text-slate-900">Questions about treatment?</h4>
              <p className="text-[11px] text-slate-500">
                Consult AgriSmart Assistant in English, Hindi, or Gujarati
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Get dilution instructions, spray interval advice, and disposal safety protocols.
            </p>

            <button
              type="button"
              onClick={handleAskAssistant}
              className="w-full py-2 px-3 rounded-md bg-emerald-800 text-white hover:bg-emerald-900 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Ask Advisor About This Diagnosis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Why This Diagnosis Modal */}
      {showWhyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-xl border border-slate-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Why {diagnosis.diseaseName}?</h3>
                <p className="text-xs text-slate-500">Diagnostic reasoning & pathogen differentiation</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block">1. Morphological Pattern Recognition</span>
                <p className="text-slate-600 leading-relaxed">
                  Concentric target-board rings (3–12 mm diameter) with distinct dark brown margins and a chlorotic halo on mature leaves match the definitive phenotype of <em>Alternaria solani</em>.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block">2. Canopy Distribution & Soil Splash</span>
                <p className="text-slate-600 leading-relaxed">
                  Lesions are restricted to the lower 20% canopy tier, indicating early transmission via rain and soil splash rather than airborne late-season blight.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block">3. Differential Diagnosis & Exclusions</span>
                <p className="text-slate-600 leading-relaxed">
                  • <strong>Septoria Leaf Spot:</strong> Excluded because spots exceed 3 mm and lack light gray necrotic centers.<br />
                  • <strong>Bacterial Canker:</strong> Excluded due to absence of vascular browning and fruit lesions.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowWhyModal(false);
                  handleAskAssistant();
                }}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                Ask Assistant for second opinion →
              </button>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 text-white text-xs font-medium hover:bg-emerald-900 cursor-pointer"
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
