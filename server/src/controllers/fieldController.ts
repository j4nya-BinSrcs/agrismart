import fieldService from '../services/fieldService.js';
import ApiResponse from '../utils/ApiResponse.js';
import type { AsyncHandler } from '../types/handlers.js';

export const createField: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const field = await fieldService.createField(req.user!.id, farmId, req.body);
    return ApiResponse.created(res, 'Field created successfully', { field });
  } catch (err) {
    return next(err);
  }
};

export const getFields: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const fields = await fieldService.getFieldsByFarm(req.user!.id, farmId);
    return ApiResponse.success(res, 200, 'Fields retrieved successfully', { fields });
  } catch (err) {
    return next(err);
  }
};

export const getFieldById: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId, fieldId } = req.params;
    const field = await fieldService.getFieldById(req.user!.id, farmId, fieldId);
    return ApiResponse.success(res, 200, 'Field retrieved successfully', { field });
  } catch (err) {
    return next(err);
  }
};

export const updateField: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId, fieldId } = req.params;
    const field = await fieldService.updateField(req.user!.id, farmId, fieldId, req.body);
    return ApiResponse.success(res, 200, 'Field updated successfully', { field });
  } catch (err) {
    return next(err);
  }
};

export const deleteField: AsyncHandler = async (req, res, next) => {
  try {
    const { farmId, fieldId } = req.params;
    const result = await fieldService.deleteField(req.user!.id, farmId, fieldId);
    return ApiResponse.success(res, 200, 'Field and associated zones deleted successfully', result);
  } catch (err) {
    return next(err);
  }
};

export default {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField,
};
