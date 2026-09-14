import Diagnosis from '../models/Diagnosis.js';
import type { IDiagnosis, RecommendedActionStep, RelatedInsights, TreatmentProtocols } from '../models/Diagnosis.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Verified, honest label used across frontend and assistant grounding whenever
 * no automated image-based disease classification is performed.
 */
export const EXPERT_ADVISORY_ASSESSMENT_LABEL = 'Expert Advisory Assessment';

export interface DiagnosisRequestInput {
  crop?: string;
  variety?: string;
  growthStage?: string;
  fieldLocation?: string;
  imageUrl?: string;
  soilMoistureContext?: string;
}

export interface ExpertAdvisoryRecord {
  id: string;
  crop: string;
  variety: string;
  growthStage: string;
  diseaseName: string;
  pathogenName: string;
  isHealthy: boolean;
  confidence: number;
  severity: 'low';
  detectedAt: string;
  imageUrl: string;
  fieldLocation: string;
  shortExplanation: string;
  symptomsMatched: string[];
  symptomsRuledOut: string[];
  treatmentProtocols: TreatmentProtocols;
  precautions: string[];
  recommendedActions: RecommendedActionStep[];
  relatedInsights: RelatedInsights;
  source: 'expert_rules';
  isMlPrediction: false;
  rawModelOutput: null;
}

export interface SaveDiagnosisInput extends Partial<IDiagnosis> {
  id: string;
}

interface ScoutingRules {
  seasonNotes: string;
  focusAreas: string[];
  prevention: string[];
}

/**
 * Rule-based scouting guidance keyed by crop. Every entry is preventive/
 * production advice — never a claimed disease diagnosis.
 */
const CROP_SCOUTING_RULES: Record<string, ScoutingRules> = {
  tomato: {
    seasonNotes:
      'Monitor for foliar spots, wilting, and fruit-rot organisms, especially during humid spells and after rain splash from bare soil.',
    focusAreas: [
      'Inspect lower canopy leaves for concentric ring spots with a yellow halo (soil-splash borne).',
      'Check for vascular wilting and stem browning during hot afternoons.',
      'Hunt for sucking pest clusters (aphids, whiteflies) on leaf undersides.',
    ],
    prevention: [
      'Keep beds mulched (5cm organic straw) to prevent soil splash onto lower foliage.',
      'Prune and remove symptomatic lower leaves from the canopy; do not compost infected debris.',
      'Maintain drip irrigation and avoid over-head watering that wets foliage overnight.',
    ],
  },
  cotton: {
    seasonNotes:
      'Watch feeding damage on squares and bolls (bollworm complex) and foliar spotting during squaring.',
    focusAreas: [
      'Check terminal buds and squares for bollworm entry holes and frass.',
      'Inspect lower leaves for phloem-feeding pest clusters and associated sooty mould.',
      'Look for leaf yellowing or reddening indicating nutrient stress rather than disease.',
    ],
    prevention: [
      'Install pheromone traps and maintain weekly scouting records during peak squaring.',
      'Remove crop residues and volunteer plants between seasons to break pest cycles.',
      'Stagger watering to avoid prolonged canopy wetness during boll development.',
    ],
  },
  wheat: {
    seasonNotes:
      'Watch for rust-type pustules and powdery mildew when mornings stay damp and dense canopies reduce airflow.',
    focusAreas: [
      'Inspect flag leaves for linear orange/yellow pustules during tillering to flowering.',
      'Check for white superficial mycelial patches under humid, low-light canopies.',
      'Confirm adequate zinc by checking for discrete longitudinal bleached bands on younger leaves.',
    ],
    prevention: [
      'Match nitrogen top-dressing to stage; excessive lodging-prone canopies invite foliar pathogens.',
      'Ensure row ventilation and avoid late-evening irrigation.',
      'Rogue out heavily infected patches early and burn off-site.',
    ],
  },
  potato: {
    seasonNotes:
      'Humid, cool spells favour blight-type foliar diseases; dense lush canopies accelerate spread.',
    focusAreas: [
      'Inspect leaf margins for water-soaked, darkened patches following prolonged leaf wetness.',
      'Look for tuber discolouration risk from excess late-season soil moisture.',
      'Check for early dying / wilting symptoms during canopy closure.',
    ],
    prevention: [
      'Hill soil around plants well and avoid frequent overhead irrigation once canopy closes.',
      'Remove and bag symptomatic leaves promptly; do not compost them.',
      'Plan harvest-time soil moisture to avoid tuber bruising and rot organisms.',
    ],
  },
};

const DEFAULT_SCOUTING_RULES: ScoutingRules = {
  seasonNotes: 'Schedule regular field scouting — walk the block diagonally and inspect representative plants from canopy bottom to top.',
  focusAreas: [
    'Record any unusual leaf discolouration, spotting, or growth deviation.',
    'Check both leaf surfaces and stem bases for pests and fungal growth.',
    'Note soil moisture, drainage, and recent weather to interpret findings.',
  ],
  prevention: [
    'Maintain balanced irrigation and avoid prolonged foliage wetness.',
    'Keep working tools and pruning equipment clean between rows.',
    'Escalate suspected pathogen outbreaks to the local Krishi Vigyan Kendra (KVK) for lab confirmation.',
  ],
};

const getScoutingRules = (crop = ''): ScoutingRules => {
  if (!crop) return DEFAULT_SCOUTING_RULES;
  return CROP_SCOUTING_RULES[crop.trim().toLowerCase()] || DEFAULT_SCOUTING_RULES;
};

/**
 * Validates image data URL / format and size
 */
export const validateImagePayload = (imageUrl: unknown): boolean => {
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
 * Generates a deterministic, explainable expert advisory record built from
 * the exact details the farmer entered (crop, growth stage, field, soil
 * moisture). It never fabricates a disease name or confidence rating.
 */
const createExpertAdvisoryRecord = (input: DiagnosisRequestInput): ExpertAdvisoryRecord => {
  const crop = input.crop || 'Crop';
  const variety = input.variety || 'Standard Variety';
  const growthStage = input.growthStage || 'Active Growth';
  const fieldLocation = input.fieldLocation || 'Field A';
  const soilContext = input.soilMoistureContext || '';

  const rules = getScoutingRules(crop);
  const now = new Date();

  const soilAdvice =
    typeof soilContext === 'string' && /\d{1,2}\s*%/i.test(soilContext)
      ? `Reading of ${soilContext} recorded for ${fieldLocation}. Re-verify moisture at root zone before any irrigation decision.`
      : `Soil moisture reading for ${fieldLocation} was not available; verify root-zone moisture before irrigating.`;

  return {
    id: `diag-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
    crop,
    variety,
    growthStage,
    diseaseName: EXPERT_ADVISORY_ASSESSMENT_LABEL,
    pathogenName: '',
    isHealthy: false,
    confidence: 0,
    severity: 'low',
    detectedAt: now.toISOString(),
    imageUrl: input.imageUrl || '',
    fieldLocation,
    shortExplanation:
      `AgriSmart is running in expert advisory mode. Automated image-based disease classification is not performed in this build; ` +
      `the guidance below is generated from validated agronomic rules applied to the details you entered (${crop}, ${growthStage}, ${fieldLocation}). ` +
      'Follow it as a scouting checklist — it is not an automated disease prediction.',
    symptomsMatched: [
      `Field cluster assessed: ${fieldLocation} — ${crop} at ${growthStage} stage`,
      `Foliage imagery registered for ${crop} (${variety})`,
      soilAdvice,
      ...rules.focusAreas,
    ],
    symptomsRuledOut: [
      'No specific pathogen is named or ruled out — microscopic/lab confirmation was not performed.',
      'Automated image classification is not part of this build, so no disease probability is reported.',
    ],
    treatmentProtocols: {
      organic: 'Apply neem oil (5ml/L) or a botanical bio-fungicide as a preventive foliar spray during high-humidity periods.',
      conventional:
        'Before considering any synthetic treatment, consult the district Krishi Vigyan Kendra (KVK) for a lab-confirmed diagnosis.',
      dosage: 'Use a preventive spray rate of 2-3 ml per litre of water only if target pests/pathogens are observed.',
      applicationTiming: 'Early morning or late afternoon during clear, calm weather; never spray before rain.',
    },
    precautions: [
      ...rules.prevention,
      'Isolate symptomatic leaf clippings and avoid overhead irrigation to slow spore / pest spread.',
      'Check undersides of leaves during routine scouting for early pest clusters.',
      'Do not apply blanket fungicides without a confirmed pest or pathogen presence.',
    ],
    recommendedActions: [
      {
        step: 1,
        title: 'Conduct a structured field scouting walk',
        description: `Walk diagonally across ${fieldLocation} inspecting 10-15 random plants for chlorosis, necrotic spotting, or pest damage.`,
        timing: 'Within 24 hours',
      },
      {
        step: 2,
        title: 'Verify soil moisture and drainage',
        description: 'Confirm the root zone is not waterlogged and moisture matches the recorded reading before the next irrigation cycle.',
        timing: 'Within 48 hours',
      },
      {
        step: 3,
        title: 'Record observations and escalate if needed',
        description:
          'Log any rapid leaf browning, wilting, or spreading lesions and share fresh, close-up photos with a local extension officer.',
        timing: 'Within 3 days',
      },
    ],
    relatedInsights: {
      weatherRisk: `${rules.seasonNotes} High humidity or morning dew may accelerate fungal germination if beds remain unventilated and leaves stay wet.`,
      irrigationAdvice: soilContext ? soilAdvice : 'Maintain recommended drip cycles; avoid wet foliage overnight.',
      sustainabilityImpact:
        'Preventive, targeted scouting avoids blanket chemical spraying, saving on runoff and preserving beneficial insects.',
    },
    source: 'expert_rules',
    isMlPrediction: false,
    rawModelOutput: null,
  };
};

export const diagnosisService = {
  /**
   * Produces an explainable agronomic advisory assessment for a submitted crop image.
   */
  async analyzeCrop(requestData: DiagnosisRequestInput): Promise<ExpertAdvisoryRecord> {
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

    const record = createExpertAdvisoryRecord({
      crop,
      variety,
      growthStage,
      fieldLocation,
      imageUrl,
      soilMoistureContext,
    });

    // Persist to MongoDB if database is connected
    if (mongoose.connection.readyState === 1) {
      try {
        await Diagnosis.create(record);
        logger.info(`Persisted diagnosis record ${record.id} to MongoDB.`);
      } catch (err) {
        logger.warn(`Failed to persist diagnosis record to MongoDB: ${getErrorMessage(err)}`);
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
          .limit(limit)
          .lean();

        return records.map((r) => {
          const { _id, __v, ...rest } = r;
          return rest;
        });
      } catch (err) {
        logger.warn(`Error querying MongoDB diagnosis history: ${getErrorMessage(err)}`);
      }
    }
    return [];
  },

  /**
   * Retrieves single diagnosis by ID
   */
  async getById(id: string) {
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
  async saveDiagnosis(recordData: SaveDiagnosisInput) {
    if (!recordData || !recordData.id) {
      throw ApiError.badRequest('Valid diagnosis record with ID is required.');
    }

    if (mongoose.connection.readyState === 1) {
      const updated = await Diagnosis.findOneAndUpdate(
        { id: recordData.id },
        { $set: recordData },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      ).lean();
      if (!updated) {
        return recordData;
      }
      const { _id, __v, ...rest } = updated;
      return rest;
    }
    return recordData;
  },
};

export default diagnosisService;