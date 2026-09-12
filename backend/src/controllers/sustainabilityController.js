import sustainabilityService from '../services/sustainabilityService.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getSustainabilitySummary = async (req, res, next) => {
  try {
    const { farmId, fieldId, startDate, endDate } = req.query || {};
    const summary = await sustainabilityService.getSustainabilitySummary(req.user.id, {
      farmId,
      fieldId,
      startDate,
      endDate,
    });
    return ApiResponse.success(res, 200, 'Sustainability summary retrieved successfully', summary);
  } catch (err) {
    return next(err);
  }
};

export default {
  getSustainabilitySummary,
};
