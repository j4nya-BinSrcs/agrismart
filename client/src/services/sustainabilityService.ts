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
    sustainabilityScore: { value: number | null; unit: string; source: string; method: string; formula?: string };
    carbonOffsetKg: { value: number; unit: string; source: string; method: string; formula?: string };
    runoffPreventedKg: { value: number; unit: string; source: string; method: string; formula?: string };
    chemicalReductionScore: { value: number | null; unit: string; source: string; method: string; status?: string; note?: string };
    soilHealthScore: { value: number | null; unit: string; source: string; method: string; status?: string; note?: string };
    fieldsCovered: { value: number; unit: string; source: string; method: string };
    zonesCovered: { value: number; unit: string; source: string; method: string };
  };
  insights: string[];
  limitations: string[];
}

/**
 * Maps the honest backend summary into the client metric shape.
 *
 * The backend only ever scores axes backed by persisted data (FAO-56 water
 * efficiency). Chemical-reduction and soil-health axes are reported as
 * "not_tracked" and surface as `null` so the UI never displays fabricated
 * numbers. When the backend is unreachable the client falls back to clearly
 * labelled *estimated* values from the local demo dataset.
 */
function mapBackendSustainabilityToClient(backend: BackendSustainabilitySummary): SustainabilityMetric {
  const { metrics } = backend;
  const waterEfficiency = metrics.weightedIrrigationEfficiencyPercent.value;
  const waterSaved = metrics.estimatedAvoidedIrrigationLitres.value || 0;
  const fieldsCovered = metrics.fieldsCovered.value || 0;

  const estimatedAxes: string[] = [];
  if (waterEfficiency === null) estimatedAxes.push('water-efficiency');
  if (metrics.chemicalReductionScore.value === null) estimatedAxes.push('chemical-reduction');
  if (metrics.soilHealthScore.value === null) estimatedAxes.push('soil-health');

  const base: SustainabilityMetric = {
    overallScore: metrics.sustainabilityScore.value ?? 0,
    waterEfficiencyScore: waterEfficiency ?? 0,
    chemicalReductionScore: metrics.chemicalReductionScore.value,
    soilHealthScore: metrics.soilHealthScore.value,
    waterSavedMonthLitres: waterSaved,
    carbonOffsetKg: metrics.carbonOffsetKg.value || 0,
    runoffPreventedKg: metrics.runoffPreventedKg.value || 0,
    isEstimate: false,
    estimatedAxes,
    improvements: [
      {
        id: 'irrigation-efficiency',
        title: 'Optimize Irrigation Efficiency',
        impact: waterEfficiency !== null
          ? `Current area-weighted efficiency: ${waterEfficiency}%`
          : 'Configure fields with irrigation methods to enable efficiency scoring',
        potentialPoints: waterEfficiency !== null ? 100 - waterEfficiency : 50,
        category: 'water',
      },
      {
        id: 'field-coverage',
        title: 'Expand Monitoring Coverage',
        impact: `${fieldsCovered} fields monitored`,
        potentialPoints: fieldsCovered > 0 ? 20 : 50,
        category: 'monitoring',
      },
    ],
  };

  return base;
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
        const mapped = mapBackendSustainabilityToClient(backendData);
        // Graceful fallback: if the backend could not compute any axis value,
        // keep the app fully functional by showing clearly-estimated values.
        if (mapped.waterEfficiencyScore === 0 && mapped.waterSavedMonthLitres === 0 && mapped.chemicalReductionScore === null) {
          return { ...SUSTAINABILITY_DATA, isEstimate: true, estimatedAxes: ['all-axes'] };
        }
        return mapped;
      } catch (err) {
        if (err instanceof ApiError && (err.statusCode === 0 || err.statusCode === 401 || err.statusCode >= 500)) {
          // Backend unavailable / auth issue / server fault → estimated local fallback.
          return { ...SUSTAINABILITY_DATA, isEstimate: true, estimatedAxes: ['all-axes'] };
        }
        throw err;
      }
    }
    // Offline fallback or no token → clearly-labelled estimated demo values.
    return { ...SUSTAINABILITY_DATA, isEstimate: true, estimatedAxes: ['all-axes'] };
  },
};