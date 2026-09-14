import farmService from '../services/farmService.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AsyncHandler } from '../types/handlers.js';

export const createFarm: AsyncHandler = async (req, res, next) => {
  try {
    const farm = await farmService.createFarm(req.user!.id, req.body);
    return ApiResponse.created(res, 'Farm created successfully', { farm });
  } catch (err) {
    return next(err);
  }
};

export const getFarms: AsyncHandler = async (req, res, next) => {
  try {
    const farms = await farmService.getFarmsByUser(req.user!.id);
    return ApiResponse.success(res, 200, 'Farms retrieved successfully', { farms });
  } catch (err) {
    return next(err);
  }
};

export const getFarmById: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await farmService.getFarmById(req.user!.id, farmId);
    return ApiResponse.success(res, 200, 'Farm retrieved successfully', { farm });
  } catch (err) {
    return next(err);
  }
};

export const updateFarm: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await farmService.updateFarm(req.user!.id, farmId, req.body);
    return ApiResponse.success(res, 200, 'Farm updated successfully', { farm });
  } catch (err) {
    return next(err);
  }
};

export const deleteFarm: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const result = await farmService.deleteFarm(req.user!.id, farmId);
    return ApiResponse.success(res, 200, 'Farm and associated fields/zones deleted successfully', result);
  } catch (err) {
    return next(err);
  }
};

export const getFarmOverview: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const overview = await farmService.getFarmOverview(req.user!.id, farmId);
    return ApiResponse.success(res, 200, 'Farm overview retrieved successfully', { farm: overview });
  } catch (err) {
    return next(err);
  }
};

export default {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  deleteFarm,
  getFarmOverview,
};
