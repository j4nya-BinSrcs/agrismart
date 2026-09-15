import mongoose from 'mongoose';
import geminiService from '../services/geminiService.js';
import farmService from '../services/farmService.js';
import fieldService from '../services/fieldService.js';
import diagnosisService from '../services/diagnosisService.js';
import weatherService from '../services/weatherService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import type { AsyncHandler } from '../types/handlers.js';
import type { AssistantContext } from '../services/geminiService.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Augments the client-provided context with authoritative backend data for the
 * authenticated user: every farm they belong to, every field/plot with its
 * current crop & soil state, recent scan history, and fallback live weather
 * for the first farm. This lets the assistant answer questions about ALL the
 * farmer's farms, not just the single context the screen happens to hold.
 */
const enrichContextWithUserData = async (
  context: Record<string, unknown>,
  userId?: string
): Promise<Record<string, unknown>> => {
  if (!userId || mongoose.connection.readyState !== 1) {
    return context;
  }

  try {
    const farms = await farmService.getFarmsByUser(userId);
    if (!farms || farms.length === 0) {
      return context;
    }

    const farmsSummary = farms.map((f) => ({
      id: f.id,
      name: f.name,
      district: f.district ?? '',
      state: f.state ?? '',
      totalAreaAcres: f.totalAreaAcres ?? 0,
    }));

    const fields: Array<Record<string, unknown>> = [];
    for (const farm of farms) {
      try {
        const farmFields = await fieldService.getFieldsByFarm(userId, farm.id);
        for (const f of farmFields) {
          fields.push({
            id: f.id,
            farmId: farm.id,
            name: f.name,
            crop: f.crop,
            variety: f.variety ?? '',
            growthStage: f.growthStage ?? '',
            soilType: f.soilType ?? '',
            soilMoisture: f.soilMoisture ?? null,
            areaAcres: f.areaAcres ?? 0,
          });
        }
      } catch (err) {
        logger.warn(`[assistant] Failed to list fields for farm ${farm.id}: ${getErrorMessage(err)}`);
      }
    }

    const diagnoses = await diagnosisService.getHistory(10, userId).catch(() => []);

    // Only fill weather from the backend when the client did not supply it.
    const merged: Record<string, unknown> = { ...context };
    merged.farms = farmsSummary;
    merged.fields = fields;
    merged.diagnoses = Array.isArray(diagnoses) ? diagnoses : [];

    if (!merged.weather) {
      const firstFarm = farms[0];
      if (
        firstFarm.location?.latitude != null &&
        firstFarm.location?.longitude != null
      ) {
        try {
          const forecast = await weatherService.getForecast(
            firstFarm.location.latitude,
            firstFarm.location.longitude
          );
          merged.weather = {
            condition: forecast.current?.condition ?? undefined,
            temperature: forecast.current?.temperature ?? undefined,
            humidity: forecast.current?.humidity ?? undefined,
            precipitationProbability: forecast.current?.rainProbability ?? undefined,
            precipitationMm: forecast.current?.rainfallExpectedMm ?? undefined,
          };
        } catch (err) {
          logger.warn(`[assistant] Weather enrichment skipped: ${getErrorMessage(err)}`);
        }
      }
    }

    return merged;
  } catch (err) {
    logger.warn(`[assistant] Context enrichment failed: ${getErrorMessage(err)}`);
    return context;
  }
};

/**
 * Controller to handle POST /api/v1/assistant
 */
export const handleAssistantQuery: AsyncHandler = async (req, res, next) => {
  try {
    const { message, language = 'en', context = {}, languageExplicit = false } = req.body || {};

    // 1. Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw ApiError.badRequest('Message is required and must be a non-empty string.');
    }

    if (message.length > 2000) {
      throw ApiError.badRequest('Message is too long. Maximum allowed length is 2000 characters.');
    }

    // 2. Validate language
    const validLanguages = ['en', 'hi', 'gu'];
    if (language && !validLanguages.includes(language)) {
      throw ApiError.badRequest(`Invalid language '${language}'. Supported languages: ${validLanguages.join(', ')}.`);
    }

    // 3. Validate context (must be an object if provided)
    if (context !== null && typeof context !== 'object') {
      throw ApiError.badRequest('Context must be a valid JSON object if provided.');
    }

    // 4. Enrich with the user's full farm data when authenticated (optional auth)
    const enriched = await enrichContextWithUserData(
      (context || {}) as Record<string, unknown>,
      req.user?.id
    );

    // 5. Invoke grounded Gemini service
    const responseData = await geminiService.generateAssistantResponse({
      message: message.trim(),
      language: language || 'en',
      context: (enriched || {}) as AssistantContext,
      explicit: languageExplicit === true,
    });

    return ApiResponse.success(
      res,
      200,
      'Assistant response generated successfully',
      responseData
    );
  } catch (error) {
    next(error);
  }
};

export default {
  handleAssistantQuery,
};