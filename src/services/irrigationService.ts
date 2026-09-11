import { IrrigationZone, IrrigationPlan } from '../types';
import { IRRIGATION_ZONES } from '../data/mockData';

export const irrigationService = {
  async getIrrigationZones(): Promise<IrrigationZone[]> {
    return IRRIGATION_ZONES;
  },

  async getIrrigationPlan(): Promise<IrrigationPlan> {
    const zones = IRRIGATION_ZONES;
    const totalSavedLitres = zones.reduce((acc, z) => acc + (z.waterSavedLitres || 0), 0);
    return {
      zones,
      overallRecommendation: 'Delay all scheduled drip irrigation across Field A & Field C.',
      totalSavedLitres,
      forecastedRainMm: 14.5,
      decisionReason: 'Imminent rainfall (82% probability, 14.5 mm) will naturally replenish the root zone. Postponing pump cycles prevents waterlogging and nitrogen runoff.',
    };
  },
};
