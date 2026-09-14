import diagnosisService from '../services/diagnosisService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import type { AsyncHandler } from '../types/handlers.js';

export const analyzeCrop: AsyncHandler = async (req, res, next) => {
  try {
    const record = await diagnosisService.analyzeCrop({
      ...req.body,
      userId: req.user!.id,
      farmId: req.body.farmId,
      fieldId: req.body.fieldId,
    });
    return ApiResponse.success(
      res,
      200,
      'Crop assessment completed with expert agronomic advisory guidance',
      record
    );
  } catch (error) {
    next(error);
  }
};

export const getHistory: AsyncHandler = async (req, res, next) => {
  try {
    const rawLimit = req.query.limit;
    const limit = parseInt(typeof rawLimit === 'string' ? rawLimit : '20', 10);
    const history = await diagnosisService.getHistory(limit, req.user!.id);
    return ApiResponse.success(res, 200, 'Diagnosis history retrieved', history);
  } catch (error) {
    next(error);
  }
};

export const getById: AsyncHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await diagnosisService.getById(id, req.user!.id);

    if (!record) {
      throw ApiError.notFound(`Diagnosis record '${id}' not found.`);
    }

    return ApiResponse.success(res, 200, 'Diagnosis details retrieved', record);
  } catch (error) {
    next(error);
  }
};

export const saveDiagnosis: AsyncHandler = async (req, res, next) => {
  try {
    const saved = await diagnosisService.saveDiagnosis(req.body, req.user!.id);
    return ApiResponse.success(res, 200, 'Diagnosis record saved successfully', saved);
  } catch (error) {
    next(error);
  }
};

export default {
  analyzeCrop,
  getHistory,
  getById,
  saveDiagnosis,
};
