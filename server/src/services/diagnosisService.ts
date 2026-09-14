import Diagnosis from '../models/Diagnosis.js';
import CropKnowledge from '../models/CropKnowledge.js';
import type { DiseaseInfo, SupportedCrop } from '../models/CropKnowledge.js';
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
  userId?: string;
  farmId?: string;
  fieldId?: string;
}

export interface ExpertAdvisoryRecord {
  id: string;
  user?: string;
  farm?: string;
  field?: string;
  crop: string;
  variety: string;
  growthStage: string;
  diseaseName: string;
  pathogenName: string;
  isHealthy: boolean;
  confidence: number;
  severity: 'low' | 'moderate' | 'high' | 'severe';
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

/**
 * Maps free-form crop labels to CropKnowledge keys.
 * Examples: "Tomato"/"tomato" → tomato, "Potato" → potato,
 * "Pepper"/"Pepper Bell"/"pepper_bell" → pepper_bell.
 */
export const normalizeCropKey = (crop: string): SupportedCrop | null => {
  const key = crop.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'tomato') return 'tomato';
  if (key === 'potato') return 'potato';
  if (
    key === 'pepper_bell' ||
    key === 'pepper' ||
    key === 'bell_pepper' ||
    key === 'pepperbell'
  ) {
    return 'pepper_bell';
  }
  return null;
};

const uniqueStrings = (items: string[]) => [...new Set(items.map((s) => s.trim()).filter(Boolean))];

/**
 * Builds expert-advisory fields from persisted CropKnowledge disease entries
 * without claiming an automated disease classification.
 */
const buildAdvisoryFromCropKnowledge = (
  diseases: DiseaseInfo[],
  context: {
    cropLabel: string;
    growthStage: string;
    fieldLocation: string;
    variety: string;
    soilAdvice: string;
  }
) => {
  const healthy = diseases.find((d) => d.isHealthy);
  const pathogenEntries = diseases.filter((d) => !d.isHealthy);
  const referenceEntries = pathogenEntries.length > 0 ? pathogenEntries : diseases;

  const diseaseNames = pathogenEntries.map((d) => d.diseaseName);
  const pathogenNames = uniqueStrings(pathogenEntries.map((d) => d.pathogenName));

  const symptomChecklist = referenceEntries.flatMap((disease) =>
    disease.symptoms.map((symptom) => `${disease.diseaseName}: ${symptom.name} — ${symptom.description}`)
  );

  const precautions = uniqueStrings([
    ...(healthy?.precautions ?? []),
    ...pathogenEntries.flatMap((d) => d.precautions),
  ]);

  const treatmentSource = healthy ?? pathogenEntries[0] ?? diseases[0];
  const treatmentProtocols: TreatmentProtocols = {
    organic: treatmentSource.treatmentProtocols.organic,
    conventional: treatmentSource.treatmentProtocols.conventional,
    dosage: treatmentSource.treatmentProtocols.dosage,
    applicationTiming: treatmentSource.treatmentProtocols.applicationTiming,
  };

  // Prefer healthy scouting actions; otherwise surface the first pathogen playbook.
  const actionSource = healthy ?? pathogenEntries[0] ?? diseases[0];
  const recommendedActions: RecommendedActionStep[] = actionSource.recommendedActions.map((action) => ({
    step: action.step,
    title: action.title,
    description: action.description,
    timing: action.timing,
  }));

  const insightSources = [healthy, ...pathogenEntries].filter(Boolean) as DiseaseInfo[];
  const relatedInsights: RelatedInsights = {
    weatherRisk: uniqueStrings(insightSources.map((d) => d.relatedInsights.weatherRisk)).join(' '),
    irrigationAdvice:
      uniqueStrings(insightSources.map((d) => d.relatedInsights.irrigationAdvice)).join(' ') ||
      context.soilAdvice,
    sustainabilityImpact: uniqueStrings(
      insightSources.map((d) => d.relatedInsights.sustainabilityImpact)
    ).join(' '),
  };

  const monitoredList =
    diseaseNames.length > 0
      ? diseaseNames.join(', ')
      : diseases.map((d) => d.diseaseName).join(', ');

  return {
    diseaseName: EXPERT_ADVISORY_ASSESSMENT_LABEL,
    pathogenName: '',
    isHealthy: false,
    confidence: 0,
    severity: 'low' as const,
    shortExplanation:
      `AgriSmart is running in expert advisory mode for ${context.cropLabel} (${context.growthStage}, ${context.fieldLocation}). ` +
      `Automated image-based disease classification is not performed; guidance below is drawn from CropKnowledge entries covering: ${monitoredList}. ` +
      `Use it as a scouting and response checklist — not as a confirmed pathogen diagnosis.` +
      (pathogenNames.length ? ` Known pathogens in the knowledge base include ${pathogenNames.join('; ')}.` : ''),
    symptomsMatched: [
      `Field cluster assessed: ${context.fieldLocation} — ${context.cropLabel} at ${context.growthStage} stage`,
      `Foliage imagery registered for ${context.cropLabel} (${context.variety})`,
      context.soilAdvice,
      ...symptomChecklist.slice(0, 12),
    ],
    symptomsRuledOut: [
      'No specific pathogen is named or ruled out — microscopic/lab confirmation was not performed.',
      'Automated image classification is not part of this build, so no disease probability is reported.',
      ...diseaseNames.map((name) => `${name} is catalogued for scouting reference only until field/lab confirmation.`),
    ],
    treatmentProtocols,
    precautions: precautions.slice(0, 12),
    recommendedActions,
    relatedInsights,
  };
};

/**
 * Validates image data URL / format and size
 */
export const validateImagePayload = (imageUrl: unknown): boolean => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw ApiError.badRequest('Image payload is required and must be a string.');
  }

  // Reject SVG / illustration reference samples — only real field photos
  if (imageUrl.startsWith('data:image/svg') || imageUrl.includes('image/svg+xml')) {
    throw ApiError.badRequest(
      'Reference or illustration images cannot be analyzed. Upload a JPEG, PNG, or WebP photo captured from the field.'
    );
  }

  // Base64 Data URI check
  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (!matches) {
      throw ApiError.badRequest('Invalid image data URI format. Supported formats: JPEG, PNG, WebP.');
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
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
 * Gets crop knowledge from database for the given crop key
 */
async function getCropKnowledge(cropKey: SupportedCrop) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }
  try {
    const knowledge = await CropKnowledge.findOne({ crop: cropKey }).lean();
    return knowledge;
  } catch (err) {
    logger.warn(`Failed to fetch crop knowledge: ${getErrorMessage(err)}`);
    return null;
  }
}

/**
 * Creates a diagnosis record based on crop knowledge and expert rules
 */
const createDiagnosisRecord = async (input: DiagnosisRequestInput): Promise<ExpertAdvisoryRecord> => {
  const crop = input.crop || 'Crop';
  const variety = input.variety || 'Standard Variety';
  const growthStage = input.growthStage || 'Active Growth';
  const fieldLocation = input.fieldLocation || 'Field A';
  const soilContext = input.soilMoistureContext || '';
  const now = new Date();

  const cropKey = normalizeCropKey(crop);
  const cropKnowledge = cropKey ? await getCropKnowledge(cropKey) : null;
  const rules = getScoutingRules(cropKey || crop);

  const soilAdvice =
    typeof soilContext === 'string' && /\d{1,2}\s*%/i.test(soilContext)
      ? `Reading of ${soilContext} recorded for ${fieldLocation}. Re-verify moisture at root zone before any irrigation decision.`
      : `Soil moisture reading for ${fieldLocation} was not available; verify root-zone moisture before irrigating.`;

  let diseaseName = EXPERT_ADVISORY_ASSESSMENT_LABEL;
  let pathogenName = '';
  let isHealthy = false;
  let confidence = 0;
  let severity: 'low' | 'moderate' | 'high' | 'severe' = 'low';
  let shortExplanation = `AgriSmart is running in expert advisory mode. Automated image-based disease classification is not performed in this build; the guidance below is generated from validated agronomic rules applied to the details you entered (${crop}, ${growthStage}, ${fieldLocation}). Follow it as a scouting checklist — it is not an automated disease prediction.`;
  let symptomsMatched: string[] = [
    `Field cluster assessed: ${fieldLocation} — ${crop} at ${growthStage} stage`,
    `Foliage imagery registered for ${crop} (${variety})`,
    soilAdvice,
    ...rules.focusAreas,
  ];
  let symptomsRuledOut: string[] = [
    'No specific pathogen is named or ruled out — microscopic/lab confirmation was not performed.',
    'Automated image classification is not part of this build, so no disease probability is reported.',
  ];
  let treatmentProtocols: TreatmentProtocols = {
    organic: 'Apply neem oil (5ml/L) or a botanical bio-fungicide as a preventive foliar spray during high-humidity periods.',
    conventional: 'Before considering any synthetic treatment, consult the district Krishi Vigyan Kendra (KVK) for a lab-confirmed diagnosis.',
    dosage: 'Use a preventive spray rate of 2-3 ml per litre of water only if target pests/pathogens are observed.',
    applicationTiming: 'Early morning or late afternoon during clear, calm weather; never spray before rain.',
  };
  let precautions: string[] = [
    ...rules.prevention,
    'Isolate symptomatic leaf clippings and avoid overhead irrigation to slow spore / pest spread.',
    'Check undersides of leaves during routine scouting for early pest clusters.',
    'Do not apply blanket fungicides without a confirmed pest or pathogen presence.',
  ];
  let recommendedActions: RecommendedActionStep[] = [
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
      description: 'Log any rapid leaf browning, wilting, or spreading lesions and share fresh, close-up photos with a local extension officer.',
      timing: 'Within 3 days',
    },
  ];
  let relatedInsights: RelatedInsights = {
    weatherRisk: `${rules.seasonNotes} High humidity or morning dew may accelerate fungal germination if beds remain unventilated and leaves stay wet.`,
    irrigationAdvice: soilContext ? soilAdvice : 'Maintain recommended drip cycles; avoid wet foliage overnight.',
    sustainabilityImpact: 'Preventive, targeted scouting avoids blanket chemical spraying, saving on runoff and preserving beneficial insects.',
  };

  if (cropKnowledge && cropKnowledge.diseases.length > 0) {
    const fromDb = buildAdvisoryFromCropKnowledge(cropKnowledge.diseases as DiseaseInfo[], {
      cropLabel: crop,
      growthStage,
      fieldLocation,
      variety,
      soilAdvice,
    });
    diseaseName = fromDb.diseaseName;
    pathogenName = fromDb.pathogenName;
    isHealthy = fromDb.isHealthy;
    confidence = fromDb.confidence;
    severity = fromDb.severity;
    shortExplanation = fromDb.shortExplanation;
    symptomsMatched = fromDb.symptomsMatched;
    symptomsRuledOut = fromDb.symptomsRuledOut;
    treatmentProtocols = fromDb.treatmentProtocols;
    precautions = fromDb.precautions;
    recommendedActions = fromDb.recommendedActions;
    relatedInsights = fromDb.relatedInsights;
  }

  return {
    id: `diag-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
    ...(input.userId ? { user: input.userId } : {}),
    ...(input.farmId ? { farm: input.farmId } : {}),
    ...(input.fieldId ? { field: input.fieldId } : {}),
    crop,
    variety,
    growthStage,
    diseaseName,
    pathogenName,
    isHealthy,
    confidence,
    severity,
    detectedAt: now.toISOString(),
    imageUrl: input.imageUrl || '',
    fieldLocation,
    shortExplanation,
    symptomsMatched,
    symptomsRuledOut,
    treatmentProtocols,
    precautions,
    recommendedActions,
    relatedInsights,
    source: 'expert_rules',
    isMlPrediction: false,
    rawModelOutput: null,
  };
};

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
  pepper_bell: {
    seasonNotes:
      'Watch for bacterial spot, anthracnose, and blossom end rot during warm humid periods.',
    focusAreas: [
      'Inspect leaves for small, water-soaked lesions with yellow halos.',
      'Check fruit for sunken, dark lesions with concentric rings (anthracnose).',
      'Monitor for blossom end rot during rapid fruit growth and calcium deficiency.',
    ],
    prevention: [
      'Use disease-free seeds and resistant varieties.',
      'Avoid overhead irrigation; use drip irrigation instead.',
      'Rotate crops with non-solanaceous crops for 2-3 years.',
      'Apply calcium nitrate foliar sprays for blossom end rot prevention.',
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
      'Use certified disease-free seed tubers.',
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
  const key = normalizeCropKey(crop) || crop.trim().toLowerCase();
  return CROP_SCOUTING_RULES[key] || DEFAULT_SCOUTING_RULES;
};

export const diagnosisService = {
  /**
   * Produces an explainable agronomic advisory assessment for a submitted crop image.
   */
  async analyzeCrop(requestData: DiagnosisRequestInput): Promise<ExpertAdvisoryRecord> {
    const { crop, growthStage, fieldLocation, imageUrl, variety, soilMoistureContext, userId, farmId, fieldId } =
      requestData;

    if (!crop || typeof crop !== 'string' || !crop.trim()) {
      throw ApiError.badRequest('Crop name is required (e.g. "Tomato", "Pepper Bell", "Potato").');
    }
    if (!growthStage || typeof growthStage !== 'string' || !growthStage.trim()) {
      throw ApiError.badRequest('Growth stage is required (e.g. "Fruiting Stage", "Tillering").');
    }
    if (!fieldLocation || typeof fieldLocation !== 'string' || !fieldLocation.trim()) {
      throw ApiError.badRequest('Field location is required (e.g. "Field A (Plot 2)").');
    }

    validateImagePayload(imageUrl);

    const record = await createDiagnosisRecord({
      crop,
      variety,
      growthStage,
      fieldLocation,
      imageUrl,
      soilMoistureContext,
      userId,
      farmId,
      fieldId,
    });

    // Persist to MongoDB if database is connected
    if (mongoose.connection.readyState === 1) {
      try {
        const persistPayload: Record<string, unknown> = { ...record };
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          persistPayload.user = new mongoose.Types.ObjectId(userId);
        }
        if (farmId && mongoose.Types.ObjectId.isValid(farmId)) {
          persistPayload.farm = new mongoose.Types.ObjectId(farmId);
        }
        if (fieldId && mongoose.Types.ObjectId.isValid(fieldId)) {
          persistPayload.field = new mongoose.Types.ObjectId(fieldId);
        }
        await Diagnosis.create(persistPayload);
        logger.info(`Persisted diagnosis record ${record.id} to MongoDB.`);
      } catch (err) {
        logger.warn(`Failed to persist diagnosis record to MongoDB: ${getErrorMessage(err)}`);
      }
    }

    return record;
  },

  /**
   * Retrieves diagnosis history for a user (falls back to unscoped only when no userId)
   */
  async getHistory(limit = 20, userId?: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter: Record<string, unknown> = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
          filter.user = new mongoose.Types.ObjectId(userId);
        } else if (userId) {
          // Non-ObjectId local/demo ids — match string user field if any
          filter.user = userId;
        } else {
          return [];
        }

        const records = await Diagnosis.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return records.map((r) => {
          const { _id, __v, ...rest } = r;
          return {
            ...rest,
            user: rest.user?.toString?.() ?? rest.user,
            farm: rest.farm?.toString?.() ?? rest.farm,
            field: rest.field?.toString?.() ?? rest.field,
          };
        });
      } catch (err) {
        logger.warn(`Error querying MongoDB diagnosis history: ${getErrorMessage(err)}`);
      }
    }
    return [];
  },

  /**
   * Retrieves single diagnosis by ID (scoped to user when provided)
   */
  async getById(id: string, userId?: string) {
    if (!id) {
      throw ApiError.badRequest('Diagnosis ID is required.');
    }

    if (mongoose.connection.readyState === 1) {
      const filter: Record<string, unknown> = { id };
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = new mongoose.Types.ObjectId(userId);
      }
      const record = await Diagnosis.findOne(filter).lean();
      if (record) {
        const { _id, __v, ...rest } = record;
        return {
          ...rest,
          user: rest.user?.toString?.() ?? rest.user,
          farm: rest.farm?.toString?.() ?? rest.farm,
          field: rest.field?.toString?.() ?? rest.field,
        };
      }
    }
    return null;
  },

  /**
   * Saves or bookmarks a diagnosis record
   */
  async saveDiagnosis(recordData: SaveDiagnosisInput, userId?: string) {
    if (!recordData || !recordData.id) {
      throw ApiError.badRequest('Valid diagnosis record with ID is required.');
    }

    if (mongoose.connection.readyState === 1) {
      const payload: Record<string, unknown> = { ...recordData };
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        payload.user = new mongoose.Types.ObjectId(userId);
      }

      const filter: Record<string, unknown> = { id: recordData.id };
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        filter.user = new mongoose.Types.ObjectId(userId);
      }

      const updated = await Diagnosis.findOneAndUpdate(
        filter,
        { $set: payload },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      ).lean();
      if (!updated) {
        return recordData;
      }
      const { _id, __v, ...rest } = updated;
      return {
        ...rest,
        user: rest.user?.toString?.() ?? rest.user,
        farm: rest.farm?.toString?.() ?? rest.farm,
        field: rest.field?.toString?.() ?? rest.field,
      };
    }
    return recordData;
  },
};

export default diagnosisService;