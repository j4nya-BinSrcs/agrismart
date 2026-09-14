import sustainabilityService from '../services/sustainabilityService.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AsyncHandler } from '../types/handlers.js';

export const getSustainabilitySummary: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId, fieldId, startDate, endDate } = req.query || {};
    const summary = await sustainabilityService.getSustainabilitySummary(req.user!.id, {
      farmId: typeof farmId === 'string' ? farmId : undefined,
      fieldId: typeof fieldId === 'string' ? fieldId : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });
    return ApiResponse.success(res, 200, 'Sustainability summary retrieved successfully', summary);
  } catch (err) {
    return next(err);
  }
};

export default {
  getSustainabilitySummary,
};
