import diagnosisService from '../services/diagnosisService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

export const analyzeCrop = async (req, res, next) => {
  try {
    const record = await diagnosisService.analyzeCrop(req.body);
    const message = record.isMlPrediction
      ? 'Crop image successfully analyzed with ML classifier'
      : 'Crop assessment completed (ML service offline - baseline guidance provided)';

    return ApiResponse.success(res, 200, message, record);
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const history = await diagnosisService.getHistory(limit);
    return ApiResponse.success(res, 200, 'Diagnosis history retrieved', history);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await diagnosisService.getById(id);

    if (!record) {
      throw ApiError.notFound(`Diagnosis record '${id}' not found.`);
    }

    return ApiResponse.success(res, 200, 'Diagnosis details retrieved', record);
  } catch (error) {
    next(error);
  }
};

export const saveDiagnosis = async (req, res, next) => {
  try {
    const saved = await diagnosisService.saveDiagnosis(req.body);
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
