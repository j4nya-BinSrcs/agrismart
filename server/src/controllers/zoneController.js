import zoneService from '../services/zoneService.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createZone = async (req, res, next) => {
  try {
    const { farmId, fieldId } = req.params;
    const zone = await zoneService.createZone(req.user.id, farmId, fieldId, req.body);
    return ApiResponse.created(res, 'Zone created successfully', { zone });
  } catch (err) {
    return next(err);
  }
};

export const getZones = async (req, res, next) => {
  try {
    const { farmId, fieldId } = req.params;
    const zones = await zoneService.getZonesByField(req.user.id, farmId, fieldId);
    return ApiResponse.success(res, 200, 'Zones retrieved successfully', { zones });
  } catch (err) {
    return next(err);
  }
};

export const getZoneById = async (req, res, next) => {
  try {
    const { farmId, fieldId, zoneId } = req.params;
    const zone = await zoneService.getZoneById(req.user.id, farmId, fieldId, zoneId);
    return ApiResponse.success(res, 200, 'Zone retrieved successfully', { zone });
  } catch (err) {
    return next(err);
  }
};

export const updateZone = async (req, res, next) => {
  try {
    const { farmId, fieldId, zoneId } = req.params;
    const zone = await zoneService.updateZone(req.user.id, farmId, fieldId, zoneId, req.body);
    return ApiResponse.success(res, 200, 'Zone updated successfully', { zone });
  } catch (err) {
    return next(err);
  }
};

export const deleteZone = async (req, res, next) => {
  try {
    const { farmId, fieldId, zoneId } = req.params;
    const result = await zoneService.deleteZone(req.user.id, farmId, fieldId, zoneId);
    return ApiResponse.success(res, 200, 'Zone deleted successfully', result);
  } catch (err) {
    return next(err);
  }
};

export default {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone,
};
