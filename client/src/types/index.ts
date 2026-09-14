export type ScreenType =
  | 'landing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'management'
  | 'diagnose'
  | 'diagnosis'
  | 'diagnosis-result'
  | 'weather'
  | 'irrigation'
  | 'sustainability'
  | 'assistant'
  | 'not-found';

export type UserRole = 'owner' | 'farmer' | 'manager' | 'agronomist' | 'admin';

export type SupportedCrop = 'pepper_bell' | 'potato' | 'tomato';

export const SUPPORTED_CROPS: { value: SupportedCrop; label: string }[] = [
  { value: 'pepper_bell', label: 'Pepper Bell' },
  { value: 'potato', label: 'Potato' },
  { value: 'tomato', label: 'Tomato' },
];

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isDemo?: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: () => void;
  signup: (data: {
    name: string;
    username?: string;
    email: string;
    password: string;
    confirmPassword?: string;
    role?: UserRole;
    state?: string;
    district?: string;
    farmName: string;
    location?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser?: (updated: Partial<User>) => void;
  consumePendingFarm?: () => {
    name: string;
    state: string;
    district: string;
    location: string;
    latitude: number;
    longitude: number;
    totalAreaAcres?: number;
  } | null;
}

export type Language = 'en' | 'hi' | 'gu';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'severe';
export type ActionPriority = 'urgent' | 'recommended' | 'informational';
export type ActionCategory = 'irrigation' | 'crop_protection' | 'weather' | 'field_work';

export interface FarmPlot {
  id: string;
  name: string;
  crop: SupportedCrop;
  variety: string;
  acres: number;
  growthStage: string;
  soilType: string;
  rootDepth: string;
  healthStatus: 'optimal' | 'attention' | 'critical';
  currentMoisture: number;
  targetMoisture: number;
}

export interface FarmMember {
  user: string;
  role: UserRole;
  addedAt?: string;
}

export interface Farm {
  id: string;
  name: string;
  members: FarmMember[];
  location: string;
  state?: string;
  district?: string;
  totalAcres: number;
  primaryCrops: SupportedCrop[];
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
  crop: SupportedCrop;
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
  source?: 'expert_rules' | 'ml_unavailable' | string;
  isMlPrediction?: boolean;
  rawModelOutput?: unknown;
}

export interface DiagnosisAnalysisRequest {
  imageUrl: string;
  imageName?: string;
  crop: SupportedCrop;
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
  agriculturalAdvice?: string;
  rainfallExpectedMm: number;
  precipitationMm?: number;
  weatherCode?: number;
  location?: {
    latitude: number;
    longitude: number;
    timezone: string;
    elevationMeters?: number | null;
  };
  provider?: string;
  updatedAt?: string;
}

export interface HourlyForecast {
  time: string;
  isoTime?: string;
  temp: number;
  rainProbability: number;
  precipitationMm?: number;
  humidity?: number | null;
  windSpeedKmH?: number | null;
  condition: string;
  weatherCode?: number;
  spraySuitability: 'optimal' | 'caution' | 'unfavorable';
  sprayNote: string;
}

export interface DailyForecast {
  day: string;
  date: string;
  isoDate?: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  weatherCode?: number;
  rainProbability: number;
  rainfallMm: number;
  uvIndexMax?: number | null;
  farmAdvisory: string;
}

export interface IrrigationCalculationDetails {
  cropCoefficientKc?: number;
  kcSource?: string;
  stageCategory?: string;
  dailyWaterDemandEtcMm?: number;
  referenceEt0Mm?: number;
  rootDepthMm?: number;
  soilMoistureDeficitPct?: number;
  soilDeficitDepthMm?: number;
  effectiveRainHeuristicMm?: number;
  forecastRainMm?: number;
  rainProbability?: number;
  recommendedGrossDepthMm?: number;
  recommendedGrossVolumeLitres?: number;
  rainDelayHours?: number;
  estimatedAvoidedIrrigationLitres?: number;
  irrigationEfficiency?: number;
  managementAllowedDepletionAssumptionP?: number;
  factors?: string[];
}

export interface IrrigationZone {
  id: string;
  name: string;
  crop: SupportedCrop;
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
  recommendedWaterMm?: number;
  recommendedIrrigationLitres?: number;
  estimatedAvoidedIrrigationLitres?: number;
  calculationDetails?: IrrigationCalculationDetails;
}

export interface IrrigationPlan {
  zones: IrrigationZone[];
  overallRecommendation: string;
  totalSavedLitres: number;
  totalRecommendedIrrigationLitres?: number;
  totalEstimatedAvoidedIrrigationLitres?: number;
  forecastedRainMm: number;
  rainProbability?: number;
  decisionReason: string;
  et0MmDay?: number;
  weatherContext?: unknown;
  isDemoDefault?: boolean;
  modelMetadata?: {
    evapotranspirationMethod?: string;
    cropCoefficientsSource?: string;
    effectiveRainfallMethod?: string;
    managementAllowedDepletionAssumptionP?: number;
    isEstimate?: boolean;
    disclaimer?: string;
    avoidedWaterBaselineAssumption?: string;
  };
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
  crop?: SupportedCrop;
  growthStage?: string;
  activeDiagnosis?: DiagnosisRecord;
  weather?: WeatherCondition;
  irrigation?: IrrigationPlan;
  soilMoisture?: number;
}
