import { IrrigationZone, IrrigationPlan } from '../types';
import { apiRequest } from './apiClient';

export interface IrrigationPlanRequest {
  latitude?: number;
  longitude?: number;
  crop?: string;
  growthStage?: string;
  soilMoisture?: number;
  soilMoistureCurrent?: number;
  soilMoistureTarget?: number;
  soilType?: string;
  areaAcres?: number;
  irrigationMethod?: string;
  allowDemoDefaults?: boolean;
  zones?: Array<{
    id?: string;
    name?: string;
    crop?: string;
    growthStage?: string;
    soilMoistureCurrent?: number;
    soilMoistureTarget?: number;
    soilType?: string;
    rootDepth?: string;
    areaAcres?: number;
    irrigationMethod?: string;
    lastIrrigated?: string;
  }>;
}

export const irrigationService = {
  /**
   * Generates or fetches live explainable irrigation plan from backend POST /api/v1/irrigation/plan
   */
  async getIrrigationPlan(options?: IrrigationPlanRequest): Promise<IrrigationPlan> {
    const payload: IrrigationPlanRequest = options || {};
    const plan = await apiRequest<IrrigationPlan>('/irrigation/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return plan;
  },

  /**
   * Fetches evaluated irrigation zones from the backend irrigation engine
   */
  async getIrrigationZones(options?: IrrigationPlanRequest): Promise<IrrigationZone[]> {
    const plan = await this.getIrrigationPlan(options);
    return plan.zones || [];
  },
};

export default irrigationService;
