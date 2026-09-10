export type ScreenType = 
  | 'dashboard'
  | 'diagnose'
  | 'diagnosis'
  | 'diagnosis-result'
  | 'diagnosis/result'
  | 'weather'
  | 'irrigation'
  | 'sustainability'
  | 'assistant';

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  status: 'delay' | 'urgent' | 'warning' | 'healthy';
  statusLabel: string;
  actionScreen: ScreenType;
  actionLabel: string;
  read: boolean;
}

export type Language = 'en' | 'hi' | 'gu';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'severe';
export type ActionPriority = 'urgent' | 'recommended' | 'informational';

export interface ActionItem {
  id: string;
  title: string;
  category: 'irrigation' | 'crop_protection' | 'weather' | 'field_work';
  priority: ActionPriority;
  actionText: string;
  reason: string;
  cropAffected?: string;
  completed: boolean;
  timeframe: string;
  actionRoute?: ScreenType;
}

export interface DiagnosisRecord {
  id: string;
  crop: string;
  variety?: string;
  growthStage: string;
  diseaseName: string;
  pathogenName?: string;
  isHealthy: boolean;
  confidence: number;
  severity: SeverityLevel;
  detectedAt: string;
  imageUrl: string;
  fieldLocation: string;
  shortExplanation: string;
  symptomsMatched?: string[];
  symptomsRuledOut?: string[];
  treatmentProtocols?: {
    organic: string;
    conventional: string;
    dosage: string;
    applicationTiming: string;
  };
  precautions: string[];
  recommendedActions: {
    step: number;
    title: string;
    description: string;
    timing: string;
  }[];
  relatedInsights: {
    weatherRisk: string;
    irrigationAdvice: string;
    sustainabilityImpact: string;
  };
}

export interface WeatherCondition {
  temperature: number;
  feelsLike: number;
  condition: string;
  rainProbability: number;
  humidity: number;
  windSpeedKmH: number;
  uvIndex: number;
  forecastSummary: string;
  agriculturalAdvice: string;
  rainfallExpectedMm: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  rainProbability: number;
  condition: string;
  spraySuitability: 'optimal' | 'caution' | 'unfavorable';
  sprayNote: string;
}

export interface DailyForecast {
  day: string;
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  rainProbability: number;
  rainfallMm: number;
  farmAdvisory: string;
}

export interface IrrigationZone {
  id: string;
  name: string;
  crop: string;
  growthStage: string;
  soilMoistureCurrent: number;
  soilMoistureTarget: number;
  status: 'optimal' | 'delay_recommended' | 'needs_irrigation' | 'scheduled';
  rainProbability: number;
  soilType: string;
  rootDepth: string;
  lastIrrigated: string;
  recommendation: string;
  waterSavedLitres: number;
}

export interface SustainabilityMetric {
  overallScore: number; // 0-100
  waterEfficiencyScore: number;
  chemicalReductionScore: number;
  soilHealthScore: number;
  waterSavedMonthLitres: number;
  carbonOffsetKg: number;
  runoffPreventedKg: number;
  improvements: {
    id: string;
    title: string;
    impact: string;
    potentialPoints: number;
    category: string;
  }[];
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  contextTag?: string;
  actionSuggestions?: string[];
  language?: Language;
}
