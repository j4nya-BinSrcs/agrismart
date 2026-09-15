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
import { useAuth } from '../../context/AuthContext';
import diagnosisService from '../../services/diagnosisService';
import { BackButton } from '../common/BackButton';

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
  const { token } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedProtocolTab, setSelectedProtocolTab] = useState<'organic' | 'conventional'>('organic');
  const [reportSaved, setReportSaved] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
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
      `I need guidance on treating ${diagnosis.diseaseName} in my ${diagnosis.crop} (${diagnosis.fieldLocation}). What is the exact spray schedule considering the impending rain forecast?`
    );
    onNavigate('assistant');
  };

  const handlePrintOrSave = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await diagnosisService.exportReportPdf(diagnosis, token);
      setReportSaved(true);
      showToast('Diagnostic report downloaded as PDF.', 'success');
      setTimeout(() => setReportSaved(false), 3000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export the report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Zoom / Full Inspection Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl p-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Microscope className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{diagnosis.crop} Leaf Detail Inspection</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mt-3 rounded overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 min-h-[340px]">
              <img
                src={diagnosis.imageUrl}
                alt={`${diagnosis.crop} - ${diagnosis.diseaseName}`}
                loading="lazy"
                decoding="async"
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

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs"
              >
                {showBoundingBoxes ? 'Hide Lesion Highlights' : 'Show Lesion Highlights'}
              </button>
              <span className="text-[11px]">Feature extraction verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <BackButton label="Back to Scanner" onClick={() => onNavigate('diagnose')} className="-ml-2.5" />
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <BackButton label="Back to Dashboard" onClick={() => onNavigate('dashboard')} className="-ml-1" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOrSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{isExporting ? 'Preparing PDF…' : reportSaved ? 'Saved ✓' : 'Export Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('diagnose')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-px active:translate-y-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Primary Diagnosis Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        {/* Expert Advisory Mode Banner */}
        {diagnosis.isMlPrediction === false && (
          <div className="p-3.5 rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-950 dark:text-amber-100">
                Expert Advisory Mode (ML Model Offline — Automated Classification Not Performed)
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                The Chloromap computer-vision classifier is currently offline, so this assessment used rule-based agronomic guidance derived from the crop, growth stage and soil details you provided — treat it as a scouting checklist, not an automated disease prediction.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Diagnostic Report</span>
              <span>•</span>
              <span>{diagnosis.fieldLocation}</span>
              <span>•</span>
              <span>{diagnosis.detectedAt}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {diagnosis.diseaseName}
              </h1>
            </div>

            {/* Scientific Pathogen Classification */}
            {diagnosis.pathogenName && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <Microscope className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>Pathogen: <span className="text-slate-900 dark:text-slate-200 font-medium">{diagnosis.pathogenName}</span></span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <StatusBadge
                status={diagnosis.isMlPrediction === false ? 'delay' : diagnosis.isHealthy ? 'healthy' : 'warning'}
                label={
                  diagnosis.isMlPrediction === false
                    ? 'Expert Advisory Guidance'
                    : diagnosis.isHealthy
                    ? 'Healthy'
                    : `${diagnosis.confidence}% Confidence`
                }
                size="md"
              />

              {!diagnosis.isHealthy && diagnosis.isMlPrediction !== false && (
                <button
                  type="button"
                  onClick={() => setShowWhyModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>Why this diagnosis?</span>
                </button>
              )}

              <span className="text-slate-300 dark:text-slate-700">|</span>

              <span className="text-slate-600 dark:text-slate-400">
                Crop: <strong className="text-slate-900 dark:text-slate-200 font-medium">{diagnosis.crop}</strong> {diagnosis.variety ? `(${diagnosis.variety})` : ''}
              </span>

              <span className="text-slate-300 dark:text-slate-700">|</span>

              <span className="text-slate-600 dark:text-slate-400">
                Stage: <strong className="text-slate-900 dark:text-slate-200 font-medium">{diagnosis.growthStage}</strong>
              </span>

              <span className="text-slate-300 dark:text-slate-700">|</span>

              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span>Severity:</span>
                <span className={`capitalize font-medium ${
                  diagnosis.severity === 'low' ? 'text-emerald-800 dark:text-emerald-400' :
                  diagnosis.severity === 'moderate' ? 'text-amber-800 dark:text-amber-400' : 'text-rose-800 dark:text-rose-400'
                }`}>
                  {diagnosis.severity}
                </span>
              </span>
            </div>

            {/* Explanation */}
            <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Observation Summary
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {diagnosis.shortExplanation}
              </p>
            </div>
          </div>

          {/* Leaf Visual Inspection Window */}
          <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
            <div
              onClick={() => setIsZoomOpen(true)}
              className="relative w-full h-44 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer group"
            >
              <img
                src={diagnosis.imageUrl}
                alt={`${diagnosis.crop} - ${diagnosis.diseaseName}`}
                loading="lazy"
                decoding="async"
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
                <span>{diagnosis.isMlPrediction === false ? 'Advisory Mode' : `${diagnosis.confidence}%`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainability Section: Symptoms Matched vs Symptoms Ruled Out */}
      {(diagnosis.symptomsMatched || diagnosis.symptomsRuledOut) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Diagnostic Differentiation
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Identified symptom markers and ruled-out conditions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Symptoms Matched */}
            {diagnosis.symptomsMatched && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Matched Symptoms ({diagnosis.symptomsMatched.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {diagnosis.symptomsMatched.map((symptom, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-700 dark:bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Symptoms Ruled Out */}
            {diagnosis.symptomsRuledOut && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium text-xs">
                  <XCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Ruled-out Conditions ({diagnosis.symptomsRuledOut.length})</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {diagnosis.symptomsRuledOut.map((ruledOut, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Treatment Protocols
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Compare biological management and conventional treatment options
              </p>
            </div>

            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedProtocolTab('organic')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedProtocolTab === 'organic'
                    ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Organic / Bio
              </button>
              <button
                type="button"
                onClick={() => setSelectedProtocolTab('conventional')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  selectedProtocolTab === 'conventional'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Conventional
              </button>
            </div>
          </div>

          <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2.5">
            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
              {selectedProtocolTab === 'organic' ? (
                <div className="space-y-1">
                  <div className="font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Biological Treatment</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">{diagnosis.treatmentProtocols.organic}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Conventional Chemical</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">{diagnosis.treatmentProtocols.conventional}</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-medium text-slate-900 dark:text-slate-100 block text-[11px]">Dosage:</span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">{diagnosis.treatmentProtocols.dosage}</span>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="font-medium text-slate-900 dark:text-slate-100 block text-[11px]">Application Window:</span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">{diagnosis.treatmentProtocols.applicationTiming}</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Action Steps
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Recommended order of field execution
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
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
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        className="mt-0.5 text-slate-400 dark:text-slate-500"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={`text-xs font-medium ${
                              isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            Step {action.step}: {action.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {action.timing}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Field Precautions</span>
            </h3>

            <ul className="space-y-1.5">
              {diagnosis.precautions.map((precaution, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
                  <span>{precaution}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Farmer Feedback Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100">Was this diagnosis accurate?</h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Refines local crop model calibration</p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFeedbackGiven('accurate')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  feedbackGiven === 'accurate'
                    ? 'bg-emerald-800 dark:bg-emerald-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
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
                    ? 'bg-rose-800 dark:bg-rose-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Cross-System Implications
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Correlated impact on weather, irrigation, and sustainability
              </p>
            </div>

            {/* Weather Consideration */}
            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                <CloudRain className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                <span>Weather Correlation</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {diagnosis.relatedInsights.weatherRisk}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="text-[11px] text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer pt-1 block"
              >
                View rainfall timeline →
              </button>
            </div>

            {/* Irrigation Consideration */}
            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                <Droplets className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Irrigation Guidance</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {diagnosis.relatedInsights.irrigationAdvice}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('irrigation')}
                className="text-[11px] text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer pt-1 block"
              >
                Inspect soil sensor data →
              </button>
            </div>

            {/* Sustainability Implication */}
            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                <Leaf className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Sustainability Impact</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {diagnosis.relatedInsights.sustainabilityImpact}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('sustainability')}
                className="text-[11px] text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer pt-1 block"
              >
                View chemical reduction tracker →
              </button>
            </div>
          </div>

          {/* Ask AgriSmart Advisor CTA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Questions about treatment?</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Consult AgriSmart Assistant in English, Hindi, or Gujarati
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Get dilution instructions, spray interval advice, and disposal safety protocols.
            </p>

            <button
              type="button"
              onClick={handleAskAssistant}
              className="w-full py-2 px-3 rounded-md bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Ask Advisor About This Diagnosis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Why This Diagnosis Modal */}
      {showWhyModal && (
        <div
          onClick={() => setShowWhyModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Why {diagnosis.diseaseName}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Diagnostic reasoning & pathogen differentiation</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">1. Model Classification Output</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  The Chloromap computer-vision model assigned the top probability to{' '}
                  <strong>{diagnosis.diseaseName}</strong>
                  {diagnosis.pathogenName ? <> (causative agent: <em>{diagnosis.pathogenName}</em>)</> : null}{' '}
                  with <strong>{diagnosis.confidence}%</strong> confidence. Confidence is a ranking signal, not verified certainty.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">2. Matched Symptom Markers</span>
                {diagnosis.symptomsMatched && diagnosis.symptomsMatched.length > 0 ? (
                  <ul className="text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                    {diagnosis.symptomsMatched.slice(0, 4).map((symptom, idx) => (
                      <li key={idx}>• {symptom}</li>
                    ))}
                    {diagnosis.symptomsMatched.length > 4 && (
                      <li className="text-slate-500">…and {diagnosis.symptomsMatched.length - 4} more markers.</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Field morphology and scouting markers were registered for {diagnosis.crop} at {diagnosis.growthStage} stage in {diagnosis.fieldLocation}.
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block">3. Differential Diagnosis & Exclusions</span>
                {diagnosis.symptomsRuledOut && diagnosis.symptomsRuledOut.length > 0 ? (
                  <ul className="text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                    {diagnosis.symptomsRuledOut.slice(0, 4).map((ruledOut, idx) => (
                      <li key={idx}>• {ruledOut}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Confirm the condition in the field and arrange lab confirmation via the nearest Krishi Vigyan Kendra (KVK) for severe cases.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowWhyModal(false);
                  handleAskAssistant();
                }}
                className="text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 cursor-pointer"
              >
                Ask Assistant for second opinion →
              </button>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                className="px-3.5 py-1.5 rounded-md bg-emerald-800 dark:bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-900 dark:hover:bg-emerald-600 cursor-pointer shadow-xs"
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
