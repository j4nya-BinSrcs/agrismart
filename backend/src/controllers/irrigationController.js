import irrigationService from '../services/irrigationService.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getIrrigationPlan = async (req, res, next) => {
  try {
    const plan = await irrigationService.generatePlan(req.body);
    return ApiResponse.success(res, 200, 'Smart irrigation plan generated successfully', plan);
  } catch (error) {
    next(error);
  }
};

export default {
  getIrrigationPlan,
};
