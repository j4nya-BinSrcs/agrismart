import { SustainabilityMetric } from '../types';
import { SUSTAINABILITY_DATA } from '../data/mockData';

export const sustainabilityService = {
  async getSustainabilityMetrics(): Promise<SustainabilityMetric> {
    return SUSTAINABILITY_DATA;
  },
};
