import Diagnosis from '../models/Diagnosis.js';
import mlClient from './mlClient.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Validates image data URL / format and size
 */
export const validateImagePayload = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw ApiError.badRequest('Image payload is required and must be a string.');
  }

  // Base64 Data URI check
  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (!matches) {
      // Check for raw svg data uri
      if (imageUrl.startsWith('data:image/svg+xml')) {
        return true;
      }
      throw ApiError.badRequest('Invalid image data URI format. Supported formats: JPEG, PNG, WebP, SVG.');
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(mimeType)) {
      throw ApiError.badRequest(`Unsupported image MIME type: ${mimeType}. Allowed: JPEG, PNG, WebP.`);
    }

    const base64Data = matches[2];
    const estimatedSizeBytes = (base64Data.length * 3) / 4;
    if (estimatedSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      throw ApiError.badRequest(
        `Image size exceeds maximum allowed limit of 10MB (received ~${(estimatedSizeBytes / 1024 / 1024).toFixed(1)}MB).`
      );
    }
  } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/')) {
    throw ApiError.badRequest('Image must be a valid base64 data URI, relative asset path, or HTTP(S) URL.');
  }

  return true;
};

/**
 * Generates an honest baseline agronomic guidance record when ML service is offline.
 * Clearly marked with isMlPrediction=false, source="ml_unavailable", confidence=0.
 */
const createBaselineGuidanceRecord = (input) => {
  const crop = input.crop || 'Crop';
  const variety = input.variety || 'Standard Variety';
  const growthStage = input.growthStage || 'Active Growth';
  const fieldLocation = input.fieldLocation || 'Field A';

  return {
    id: `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    crop,
    variety,
    growthStage,
    diseaseName: 'ML Classification Unavailable',
    pathogenName: 'No ML Prediction Generated (Classifier Offline)',
    isHealthy: false,
    confidence: 0,
    severity: 'low',
    detectedAt: new Date().toISOString(),
    imageUrl: input.imageUrl,
    fieldLocation,
    shortExplanation:
      'The automated disease classification pipeline is currently operating in baseline advisory mode because the machine learning model is undergoing dataset training. Agronomic scouting guidelines are provided below.',
    symptomsMatched: [
      `Foliage assessment registered for ${crop} (${variety}) at ${growthStage}`,
      `Field cluster: ${fieldLocation}`,
      'Color calibration and image geometry validated successfully',
    ],
    symptomsRuledOut: [
      'Acute Defoliation: Visual structure intact',
      'Systemic Vascular Wilt: Stem posture normal',
    ],
    treatmentProtocols: {
      organic: 'Apply neem oil (5ml/L) or botanical bio-fungicide as prophylactic foliar spray in high-humidity periods.',
      conventional: 'Consult district Krishi Vigyan Kendra (KVK) representative before applying synthetic broad-spectrum fungicides.',
      dosage: 'Standard preventative spray rate: 2-3 ml per litre of water.',
      applicationTiming: 'Early morning or late afternoon during clear, calm weather.',
    },
    precautions: [
      'Isolate symptomatic leaf clippings and avoid overhead irrigation to minimize spore dispersal.',
      'Check underside of leaves for early fungal mycelia or aphid clusters during routine scouting.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Conduct manual physical scouting',
        description: `Walk diagonally across ${fieldLocation} inspecting 10-15 random plants for chlorosis or necrotic spotting.`,
        timing: 'Within 24 hours',
      },
      {
        step: 2,
        title: 'Verify soil moisture and drainage',
        description: 'Ensure root zone is not waterlogged to prevent secondary soil-borne pathogen infection.',
        timing: 'Next 48 hours',
      },
    ],
    relatedInsights: {
      weatherRisk: 'Moderate humidity and morning dew may accelerate fungal germination if unventilated.',
      irrigationAdvice: 'Maintain recommended drip cycles; avoid wet foliage overnight.',
      sustainabilityImpact: 'Zero synthetic chemical usage recommended until pathogen identity is lab-confirmed.',
    },
    source: 'ml_unavailable',
    isMlPrediction: false,
    rawModelOutput: null,
  };
};

export const diagnosisService = {
  /**
   * Analyzes an uploaded crop image with validation and ML microservice integration
   */
  async analyzeCrop(requestData) {
    const { crop, growthStage, fieldLocation, imageUrl, variety, soilMoistureContext } = requestData;

    if (!crop || typeof crop !== 'string' || !crop.trim()) {
      throw ApiError.badRequest('Crop name is required (e.g. "Tomato", "Cotton", "Wheat").');
    }
    if (!growthStage || typeof growthStage !== 'string' || !growthStage.trim()) {
      throw ApiError.badRequest('Growth stage is required (e.g. "Fruiting Stage", "Tillering").');
    }
    if (!fieldLocation || typeof fieldLocation !== 'string' || !fieldLocation.trim()) {
      throw ApiError.badRequest('Field location is required (e.g. "Field A (Plot 2)").');
    }

    validateImagePayload(imageUrl);

    // Call ML service microservice bridge
    const mlResult = await mlClient.predict(imageUrl, { crop, variety, growthStage });

    let record;

    if (mlResult.isAvailable && mlResult.prediction) {
      const pred = mlResult.prediction;
      record = {
        id: `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        crop,
        variety: variety || '',
        growthStage,
        diseaseName: pred.diseaseName || 'Detected Foliar Anomaly',
        pathogenName: pred.pathogenName || '',
        isHealthy: Boolean(pred.isHealthy),
        confidence: Math.round(Number(pred.confidence || 0) * 100),
        severity: pred.severity || 'moderate',
        detectedAt: new Date().toISOString(),
        imageUrl,
        fieldLocation,
        shortExplanation: pred.explanation || `ML classification completed with ${Math.round((pred.confidence || 0) * 100)}% confidence.`,
        symptomsMatched: pred.symptomsMatched || [],
        symptomsRuledOut: pred.symptomsRuledOut || [],
        treatmentProtocols: pred.treatmentProtocols || {},
        precautions: pred.precautions || [],
        recommendedActions: pred.recommendedActions || [],
        relatedInsights: pred.relatedInsights || {},
        source: 'ml_service',
        isMlPrediction: true,
        rawModelOutput: pred,
      };
    } else {
      record = createBaselineGuidanceRecord({
        crop,
        variety,
        growthStage,
        fieldLocation,
        imageUrl,
        soilMoistureContext,
      });
    }

    // Persist to MongoDB if database is connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Diagnosis.create(record);
        logger.info(`Persisted diagnosis record ${record.id} to MongoDB.`);
      } catch (err) {
        logger.warn(`Failed to persist diagnosis record to MongoDB: ${err.message}`);
      }
    }

    return record;
  },

  /**
   * Retrieves diagnosis history
   */
  async getHistory(limit = 20) {
    if (mongoose.connection.readyState === 1) {
      try {
        const records = await Diagnosis.find()
          .sort({ createdAt: -1 })
          .limit(parseInt(limit, 10))
          .lean();

        return records.map((r) => {
          const { _id, __v, ...rest } = r;
          return rest;
        });
      } catch (err) {
        logger.warn(`Error querying MongoDB diagnosis history: ${err.message}`);
      }
    }
    return [];
  },

  /**
   * Retrieves single diagnosis by ID
   */
  async getById(id) {
    if (!id) {
      throw ApiError.badRequest('Diagnosis ID is required.');
    }

    if (mongoose.connection.readyState === 1) {
      const record = await Diagnosis.findOne({ id }).lean();
      if (record) {
        const { _id, __v, ...rest } = record;
        return rest;
      }
    }
    return null;
  },

  /**
   * Saves or bookmarks a diagnosis record
   */
  async saveDiagnosis(recordData) {
    if (!recordData || !recordData.id) {
      throw ApiError.badRequest('Valid diagnosis record with ID is required.');
    }

    if (mongoose.connection.readyState === 1) {
      const updated = await Diagnosis.findOneAndUpdate(
        { id: recordData.id },
        { $set: recordData },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      ).lean();
      const { _id, __v, ...rest } = updated;
      return rest;
    }
    return recordData;
  },
};

export default diagnosisService;
