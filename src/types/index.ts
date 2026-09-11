export type ScreenType =
  | 'landing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'diagnose'
  | 'diagnosis'
  | 'diagnosis-result'
  | 'diagnosis/result'
  | 'weather'
  | 'irrigation'
  | 'sustainability'
  | 'assistant'
  | 'not-found';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: string;
  farmName: string;
  location: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => void;
  signup: (data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    farmName: string;
    location: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export type Language = 'en' | 'hi' | 'gu';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'severe';
export type ActionPriority = 'urgent' | 'recommended' | 'informational';
export type ActionCategory = 'irrigation' | 'crop_protection' | 'weather' | 'field_work';

export interface FarmPlot {
  id: string;
  name: string;
  crop: string;
  variety: string;
  acres: number;
  growthStage: string;
  soilType: string;
  rootDepth: string;
  healthStatus: 'optimal' | 'attention' | 'critical';
  currentMoisture: number;
  targetMoisture: number;
}

export interface Farm {
  id: string;
  name: string;
  owner: string;
  location: string;
  totalAcres: number;
  primaryCrops: string[];
  plots: FarmPlot[];
}

export interface ActionItem {
  id: string;
  title: string;
  category: ActionCategory;
  priority: ActionPriority;
  actionText: string;
  reason: string;
  cropAffected?: string;
  completed: boolean;
  timeframe: string;
  actionRoute?: ScreenType;
}

export interface TreatmentProtocols {
  organic: string;
  conventional: string;
  dosage: string;
  applicationTiming: string;
}

export interface RecommendedActionStep {
  step: number;
  title: string;
  description: string;
  timing: string;
}

export interface RelatedInsights {
  weatherRisk: string;
  irrigationAdvice: string;
  sustainabilityImpact: string;
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
  treatmentProtocols?: TreatmentProtocols;
  precautions: string[];
  recommendedActions: RecommendedActionStep[];
  relatedInsights: RelatedInsights;
}

export interface DiagnosisAnalysisRequest {
  imageUrl: string;
  imageName?: string;
  crop: string;
  variety?: string;
  growthStage?: string;
  fieldLocation?: string;
  soilMoistureContext?: string;
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

export interface IrrigationPlan {
  zones: IrrigationZone[];
  overallRecommendation: string;
  totalSavedLitres: number;
  forecastedRainMm: number;
  decisionReason: string;
}

export interface SustainabilityImprovement {
  id: string;
  title: string;
  impact: string;
  potentialPoints: number;
  category: string;
}

export interface SustainabilityMetric {
  overallScore: number;
  waterEfficiencyScore: number;
  chemicalReductionScore: number;
  soilHealthScore: number;
  waterSavedMonthLitres: number;
  carbonOffsetKg: number;
  runoffPreventedKg: number;
  improvements: SustainabilityImprovement[];
}

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

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  contextTag?: string;
  actionSuggestions?: string[];
  language?: Language;
}

export interface AssistantContext {
  farmName?: string;
  crop?: string;
  activeDiagnosis?: DiagnosisRecord;
  weather?: WeatherCondition;
  soilMoisture?: number;
}
