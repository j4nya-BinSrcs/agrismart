import { SustainabilityMetric } from '../types';
import { SUSTAINABILITY_DATA } from '../data/mockData';
import { apiRequestWithAuth, ApiError } from './apiClient';

interface BackendSustainabilitySummary {
  scope: {
    farmsCount: number;
    fieldsCount: number;
    zonesCount: number;
    totalAreaAcres: number;
    cropsRepresented: string[];
    farmIds: string[];
    fieldIds: string[];
  };
  dataAvailability: {
    farmPersistence: boolean;
    irrigationEngine: boolean;
    weatherTelemetry: boolean;
    iotSensors: boolean;
    historicalSensorLogs: boolean;
  };
  metrics: {
    recommendedIrrigationLitres: { value: number; unit: string; source: string; method: string; formula?: string };
    estimatedAvoidedIrrigationLitres: { value: number; unit: string; source: string; method: string; formula?: string };
    weightedIrrigationEfficiencyPercent: { value: number | null; unit: string; source: string; method: string; formula?: string };
    fieldsCovered: { value: number; unit: string; source: string; method: string };
    zonesCovered: { value: number; unit: string; source: string; method: string };
  };
  insights: string[];
  limitations: string[];
}

function mapBackendSustainabilityToClient(backend: BackendSustainabilitySummary): SustainabilityMetric {
  const waterEfficiency = backend.metrics.weightedIrrigationEfficiencyPercent.value || 0;
  const waterSaved = backend.metrics.estimatedAvoidedIrrigationLitres.value || 0;
  const fieldsCovered = backend.metrics.fieldsCovered.value || 0;
  
  return {
    overallScore: Math.round((waterEfficiency + 70) / 2), // Composite score
    waterEfficiencyScore: waterEfficiency,
    chemicalReductionScore: 65, // Not tracked by backend yet
    soilHealthScore: 70, // Not tracked by backend yet
    waterSavedMonthLitres: waterSaved,
    carbonOffsetKg: Math.round(waterSaved * 0.0005), // Rough estimate
    runoffPreventedKg: Math.round(waterSaved * 0.001), // Rough estimate
    improvements: [
      {
        id: 'irrigation-efficiency',
        title: 'Optimize Irrigation Efficiency',
        impact: `Current area-weighted efficiency: ${waterEfficiency}%`,
        potentialPoints: 100 - waterEfficiency,
        category: 'water',
      },
      {
        id: 'field-coverage',
        title: 'Expand Sensor Coverage',
        impact: `${fieldsCovered} fields monitored`,
        potentialPoints: fieldsCovered > 0 ? 20 : 50,
        category: 'monitoring',
      },
    ],
  };
}

export const sustainabilityService = {
  async getSustainabilityMetrics(token: string | null): Promise<SustainabilityMetric> {
    if (token) {
      try {
        const backendData = await apiRequestWithAuth<BackendSustainabilitySummary>(
          '/sustainability/summary',
          {},
          token
        );
        return mapBackendSustainabilityToClient(backendData);
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 0) {
          // Network error - backend unavailable, fall back to local
        } else if (err instanceof ApiError && err.statusCode === 401) {
          // Unauthorized - token invalid, fall back to local
        }
      }
    }
    // Offline fallback or no token
    return SUSTAINABILITY_DATA;
  },
};
