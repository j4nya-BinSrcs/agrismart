import diagnosisService from '../services/diagnosisService.js';
import { buildDiagnosisReportPdf } from '../services/pdfReportService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import type { AsyncHandler } from '../types/handlers.js';

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-z0-9\-_.]/gi, '_').slice(0, 80) || 'diagnosis-report';

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
      record.isMlPrediction
        ? 'Crop leaf image classified by the machine-learning disease model'
        : 'Crop assessment completed with expert agronomic advisory guidance',
      record
    );
  } catch (error) {
    next(error);
  }
};

export const exportReport: AsyncHandler = async (req, res, next) => {
  try {
    const record = req.body ?? {};
    if (!record || typeof record !== 'object') {
      throw ApiError.badRequest('A diagnosis record is required to generate a report.');
    }
    if (!record.crop && !record.diseaseName) {
      throw ApiError.badRequest('Invalid diagnosis record: missing crop or disease details.');
    }

    const pdfBuffer = await buildDiagnosisReportPdf(record as Parameters<typeof buildDiagnosisReportPdf>[0]);

    const fileBase = sanitizeFilename(
      `${record.crop || 'crop'}-${(record.diseaseName || 'diagnosis').replace(/\s+/g, '-')}`
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}-report.pdf"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getHistory: AsyncHandler = async (req, res, next) => {
  try {
    const rawLimit = req.query.limit;
    const limit = parseInt(typeof rawLimit === 'string' ? rawLimit : '20', 10);
    const rawFarmId = req.query.farmId;
    const farmId = typeof rawFarmId === 'string' && rawFarmId ? rawFarmId : undefined;
    const history = await diagnosisService.getHistory(limit, req.user!.id, farmId);
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
  exportReport,
};
