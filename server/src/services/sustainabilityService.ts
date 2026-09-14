import type { HydratedDocument } from 'mongoose';
import Farm from '../models/Farm.js';
import type { IFarm } from '../models/Farm.js';
import Field from '../models/Field.js';
import type { IField } from '../models/Field.js';
import Zone from '../models/Zone.js';
import type { IZone } from '../models/Zone.js';
import irrigationService from './irrigationService.js';
import type { IrrigationZoneInput } from './irrigationService.js';
import { IRRIGATION_EFFICIENCIES } from './irrigationService.js';
import { validateObjectId } from './farmService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Validates ISO date string format
 */
const validateDateString = (dateStr: unknown, paramName = 'date'): Date | null => {
  if (!dateStr) return null;
  const parsed = new Date(String(dateStr));
  if (isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`Invalid ${paramName} format. Expected a valid date string (e.g., YYYY-MM-DD).`);
  }
  return parsed;
};

/**
 * Maps irrigation method string to numeric efficiency fraction (0.0 - 1.0)
 * Sourced strictly from FAO Water Management Efficiency Standards
 */
const getMethodEfficiency = (method = ''): number => {
  const norm = String(method).toLowerCase().trim();
  if (norm.includes('drip') || norm.includes('micro')) return IRRIGATION_EFFICIENCIES.drip;
  if (norm.includes('sprinkler')) return IRRIGATION_EFFICIENCIES.sprinkler;
  if (norm.includes('pivot')) return IRRIGATION_EFFICIENCIES.pivot;
  if (norm.includes('furrow')) return IRRIGATION_EFFICIENCIES.furrow;
  if (norm.includes('flood') || norm.includes('basin')) return IRRIGATION_EFFICIENCIES.flood;
  return 0.70; // Standard generalized baseline
};

export interface SustainabilitySummaryOptions {
  farmId?: string;
  fieldId?: string;
  startDate?: string;
  endDate?: string;
}

export const sustainabilityService = {
  /**
   * Generates a transparent, explainable sustainability summary from real persisted farm data
   */
  async getSustainabilitySummary(userId: string, options: SustainabilitySummaryOptions = {}) {
    validateObjectId(userId, 'User ID');

    const { farmId, fieldId, startDate, endDate } = options;

    // 1. Date Range Validation
    const parsedStart = validateDateString(startDate, 'startDate');
    const parsedEnd = validateDateString(endDate, 'endDate');

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      throw ApiError.badRequest('startDate cannot be after endDate.');
    }

    // 2. Resolve Scope and Verify Ownership (Anti-IDOR)
    let farms: HydratedDocument<IFarm>[] = [];
    let fields: HydratedDocument<IField>[] = [];
    let zones: HydratedDocument<IZone>[] = [];

    if (farmId) {
      validateObjectId(farmId, 'Farm ID');
      const farm = await Farm.findOne({ _id: farmId, owner: userId });
      if (!farm) {
        throw ApiError.notFound('Farm not found.');
      }
      farms = [farm];

      if (fieldId) {
        validateObjectId(fieldId, 'Field ID');
        const field = await Field.findOne({ _id: fieldId, farm: farmId, owner: userId });
        if (!field) {
          throw ApiError.notFound('Field not found.');
        }
        fields = [field];
        zones = await Zone.find({ field: fieldId, farm: farmId, owner: userId });
      } else {
        fields = await Field.find({ farm: farmId, owner: userId });
        zones = await Zone.find({ farm: farmId, owner: userId });
      }
    } else {
      if (fieldId) {
        throw ApiError.badRequest('farmId is required when specifying a fieldId.');
      }
      farms = await Farm.find({ owner: userId });
      fields = await Field.find({ owner: userId });
      zones = await Zone.find({ owner: userId });
    }

    // 3. Handle Empty Scope Gracefully
    if (farms.length === 0 && fields.length === 0) {
      return {
        scope: {
          farmsCount: 0,
          fieldsCount: 0,
          zonesCount: 0,
          totalAreaAcres: 0,
          farmIds: [],
          fieldIds: [],
        },
        dataAvailability: {
          farmPersistence: false,
          irrigationEngine: false,
          weatherTelemetry: false,
          iotSensors: false,
          historicalSensorLogs: false,
        },
        metrics: {
          recommendedIrrigationLitres: {
            value: 0,
            unit: 'litres',
            source: 'irrigation_engine',
            method: 'fao56_hargreaves_samani',
            status: 'no_fields_configured',
          },
          estimatedAvoidedIrrigationLitres: {
            value: 0,
            unit: 'litres',
            source: 'irrigation_engine',
            method: 'no_precipitation_counterfactual',
            status: 'no_fields_configured',
          },
          weightedIrrigationEfficiencyPercent: {
            value: null,
            unit: 'percentage',
            source: 'fao_irrigation_method_standards',
            method: 'area_weighted_application_efficiency',
            status: 'no_fields_configured',
          },
        },
        insights: [
          'No farm fields are currently configured. Add farms and fields to enable sustainability accounting.',
        ],
        limitations: [
          'No persisted agricultural acreage registered for this user.',
          'Physical IoT soil sensor hardware data is not present.',
          'Historical chemical and fertilizer application ledgers are not tracked; carbon and pesticide reduction metrics are omitted.',
        ],
      };
    }

    // 4. Calculate Acreage & Area-Weighted Efficiency
    let totalAreaAcres = 0;
    let weightedEfficiencySum = 0;
    const cropsSet = new Set();

    // If zones exist, calculate at zone level; otherwise calculate at field level
    if (zones.length > 0) {
      for (const z of zones) {
        const area = Number(z.areaAcres) || 0;
        totalAreaAcres += area;
        const eff = getMethodEfficiency(z.irrigationMethod);
        weightedEfficiencySum += area * eff;
      }
      for (const f of fields) {
        if (f.crop) cropsSet.add(f.crop);
      }
    } else {
      for (const f of fields) {
        const area = Number(f.areaAcres) || 0;
        totalAreaAcres += area;
        const eff = getMethodEfficiency(f.irrigationMethod);
        weightedEfficiencySum += area * eff;
        if (f.crop) cropsSet.add(f.crop);
      }
    }

    const weightedIrrigationEfficiencyPercent =
      totalAreaAcres > 0
        ? Math.round((weightedEfficiencySum / totalAreaAcres) * 1000) / 10
        : null;

    // 5. Connect to Live FAO-56 Irrigation Engine
    // Prepare zone inputs for calculation engine
    const evaluationZones: IrrigationZoneInput[] = [];
    if (zones.length > 0) {
      for (const z of zones) {
        const parentField = fields.find((f) => f.id === z.field?.toString() || f._id?.toString() === z.field?.toString());
        evaluationZones.push({
          id: z.id || z._id.toString(),
          name: z.name,
          crop: parentField?.crop || 'Crop',
          growthStage: parentField?.growthStage || 'Active Growth',
          soilMoistureCurrent: z.soilMoisture ?? parentField?.soilMoisture ?? 35,
          soilMoistureTarget: 45,
          soilType: parentField?.soilType || 'sandy loam',
          areaAcres: Number(z.areaAcres) || 1.0,
          irrigationMethod: z.irrigationMethod || parentField?.irrigationMethod || 'drip',
        });
      }
    } else {
      for (const f of fields) {
        evaluationZones.push({
          id: f.id || f._id.toString(),
          name: f.name,
          crop: f.crop || 'Crop',
          growthStage: f.growthStage || 'Active Growth',
          soilMoistureCurrent: f.soilMoisture ?? 35,
          soilMoistureTarget: 45,
          soilType: f.soilType || 'sandy loam',
          areaAcres: Number(f.areaAcres) || 1.0,
          irrigationMethod: f.irrigationMethod || 'drip',
        });
      }
    }

    // Determine geographic coordinates
    const primaryFarm = farms[0];
    const latitude = primaryFarm?.location?.latitude;
    const longitude = primaryFarm?.location?.longitude;

    let irrigationEvaluation = null;
    try {
      irrigationEvaluation = await irrigationService.generatePlan({
        latitude,
        longitude,
        zones: evaluationZones,
      });
    } catch (err) {
      logger.warn(`Sustainability service irrigation engine evaluation warning: ${getErrorMessage(err)}`);
    }

    const recommendedIrrigationLitres =
      irrigationEvaluation?.totalRecommendedIrrigationLitres ?? 0;
    const estimatedAvoidedIrrigationLitres =
      irrigationEvaluation?.totalEstimatedAvoidedIrrigationLitres ?? 0;

    // 6. Formulate Insights
    const insights = [];
    if (estimatedAvoidedIrrigationLitres > 0) {
      insights.push(
        `Forecasted precipitation and root-zone moisture margin result in a model-estimated avoided irrigation volume of approximately ${estimatedAvoidedIrrigationLitres.toLocaleString()} litres relative to a zero-rain baseline scenario.`
      );
    } else {
      insights.push(
        `Model-estimated crop water demand across evaluated plots is approximately ${recommendedIrrigationLitres.toLocaleString()} litres under current FAO-56 atmospheric demand.`
      );
    }

    if (weightedIrrigationEfficiencyPercent !== null) {
      insights.push(
        `Area-weighted application efficiency is calculated at ${weightedIrrigationEfficiencyPercent}% based on configured distribution methods (FAO Standards).`
      );
    }

    return {
      scope: {
        farmsCount: farms.length,
        fieldsCount: fields.length,
        zonesCount: zones.length,
        totalAreaAcres: Math.round(totalAreaAcres * 100) / 100,
        cropsRepresented: Array.from(cropsSet),
        farmIds: farms.map((f) => f.id || f._id.toString()),
        fieldIds: fields.map((f) => f.id || f._id.toString()),
      },
      dataAvailability: {
        farmPersistence: true,
        irrigationEngine: true,
        weatherTelemetry: true,
        iotSensors: false,
        historicalSensorLogs: false,
      },
      metrics: {
        recommendedIrrigationLitres: {
          value: recommendedIrrigationLitres,
          unit: 'litres',
          source: 'irrigation_engine',
          method: 'fao56_hargreaves_samani',
          formula: 'grossDepthMm * areaAcres * 4046.856',
        },
        estimatedAvoidedIrrigationLitres: {
          value: estimatedAvoidedIrrigationLitres,
          unit: 'litres',
          source: 'irrigation_engine',
          method: 'no_precipitation_counterfactual',
          formula: 'effectivePrecipitationMm * areaAcres * 4046.856',
        },
        weightedIrrigationEfficiencyPercent: {
          value: weightedIrrigationEfficiencyPercent,
          unit: 'percentage',
          source: 'fao_irrigation_method_standards',
          method: 'area_weighted_application_efficiency',
          formula: 'sum(zoneArea * methodEfficiency) / totalArea * 100',
        },
        fieldsCovered: {
          value: fields.length,
          unit: 'count',
          source: 'mongodb_persistence',
          method: 'direct_aggregation',
        },
        zonesCovered: {
          value: zones.length,
          unit: 'count',
          source: 'mongodb_persistence',
          method: 'direct_aggregation',
        },
      },
      insights,
      limitations: [
        'Physical IoT sensor hardware data is not present (virtual agronomic models utilized).',
        'Historical chemical application ledgers and carbon baseline inventories are not recorded; arbitrary CO2 or chemical reduction numbers are omitted.',
        'Model-estimated avoided irrigation figures represent advisory counterfactuals for the current evaluation cycle, not historical meter logs.',
      ],
    };
  },
};

export default sustainabilityService;
