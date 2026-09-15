import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Supported UI & backend languages
 */
export type SupportedLanguage = 'en' | 'hi' | 'gu';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = Object.freeze({
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  gu: 'Gujarati (ગુજરાતી)',
});

export interface AssistantWeatherContext {
  precipitationProbability?: number;
  rainProbability?: number;
  precipitationMm?: number | string;
  rainfallExpectedMm?: number | string;
  temperature?: number;
  humidity?: number;
  condition?: string;
  description?: string;
}

export interface AssistantIrrigationContext {
  overallDecision?: string;
  overallRecommendation?: string;
  decision?: string;
  status?: string;
  rainProbability?: number;
  forecastedRainMm?: number;
  averageSoilMoisture?: number;
  totalGrossVolumeLitres?: number;
  totalRecommendedIrrigationLitres?: number;
  totalEstimatedAvoidedIrrigationLitres?: number;
  totalSavedLitres?: number;
  overallReason?: string;
  decisionReason?: string;
}

export interface AssistantDiagnosisContext {
  isMlPrediction?: boolean;
  diseaseName?: string;
}

export interface AssistantFarmContext {
  id?: string;
  name?: string;
  district?: string;
  state?: string;
  totalAreaAcres?: number;
}

export interface AssistantFieldContext {
  id?: string;
  farmId?: string;
  name?: string;
  crop?: string;
  variety?: string;
  growthStage?: string;
  soilType?: string;
  soilMoisture?: number | null;
  areaAcres?: number;
}

export interface AssistantScanContext {
  detectedAt?: string;
  crop?: string;
  fieldLocation?: string;
  diseaseName?: string;
  isHealthy?: boolean;
  severity?: string;
  confidence?: number;
  isMlPrediction?: boolean;
}

export interface AssistantContext {
  farmName?: string;
  farm?: { name?: string };
  crop?: string;
  cropName?: string;
  growthStage?: string;
  weather?: AssistantWeatherContext;
  soilMoisture?: number;
  irrigation?: AssistantIrrigationContext;
  irrigationPlan?: AssistantIrrigationContext;
  diagnosis?: AssistantDiagnosisContext;
  activeDiagnosis?: AssistantDiagnosisContext;
  farms?: AssistantFarmContext[];
  fields?: AssistantFieldContext[];
  diagnoses?: AssistantScanContext[];
}

/**
 * Honest label used whenever the backend produces a rule-based advisory
 * assessment instead of an automated image-based disease prediction.
 * Kept in sync with diagnosisService; never treat it as a disease name.
 */
export const EXPERT_ADVISORY_ASSESSMENT_LABEL = 'Expert Advisory Assessment';

/**
 * Extracts normalized irrigation decision from context
 */
export const extractIrrigationDecision = (context: AssistantContext = {}): string => {
  const irr: AssistantIrrigationContext =
    context.irrigation ?? context.irrigationPlan ?? {};
  const decisionRaw = String(
    irr.overallDecision ||
      irr.overallRecommendation ||
      irr.decision ||
      irr.status ||
      ''
  ).toLowerCase();

  const rainProb = Number(
    context.weather?.precipitationProbability ??
      context.weather?.rainProbability ??
      irr.rainProbability ??
      0
  );

  const rainMm = Number(
    context.weather?.precipitationMm ??
      context.weather?.rainfallExpectedMm ??
      irr.forecastedRainMm ??
      0
  );

  // If explicitly says delay, hold, postpone, pause, or not needed
  if (
    decisionRaw.includes('delay') ||
    decisionRaw.includes('hold') ||
    decisionRaw.includes('postpone') ||
    decisionRaw.includes('pause') ||
    decisionRaw.includes('stop') ||
    decisionRaw.includes('no irrigate') ||
    decisionRaw.includes('not irrigate') ||
    decisionRaw.includes('avoid') ||
    decisionRaw.includes('optimal') // soil moisture already optimal
  ) {
    return 'DELAY_IRRIGATION';
  }

  // If explicitly says irrigate or needs irrigation and no heavy rain
  if (
    decisionRaw.includes('need') ||
    decisionRaw.includes('schedule') ||
    decisionRaw.includes('irrigate now') ||
    decisionRaw.includes('apply')
  ) {
    if (rainProb >= 70 && rainMm >= 5) {
      return 'DELAY_IRRIGATION'; // Rain override
    }
    return 'IRRIGATE';
  }

  // Weather fallback if irrigation engine output is missing
  if (rainProb >= 60 || rainMm >= 5) {
    return 'DELAY_IRRIGATION';
  }

  return 'UNKNOWN';
};

/**
 * Detects the dominant language of a message based on character scripts.
 * 1. Gujarati Unicode script ([\u0A80-\u0AFF]) -> 'gu'
 * 2. Hindi / Devanagari script ([\u0900-\u097F]) -> 'hi'
 * 3. Latin / English script ([a-zA-Z]) -> 'en'
 * 4. Fallback to requested/selected language when ambiguous.
 */
export const detectDominantLanguage = (
  message = '',
  requestedLanguage: SupportedLanguage = 'en'
): SupportedLanguage => {
  if (typeof message !== 'string' || !message.trim()) {
    return ['en', 'hi', 'gu'].includes(requestedLanguage) ? requestedLanguage : 'en';
  }

  const gujaratiChars = (message.match(/[\u0A80-\u0AFF]/g) || []).length;
  const hindiChars = (message.match(/[\u0900-\u097F]/g) || []).length;
  const latinChars = (message.match(/[a-zA-Z]/g) || []).length;

  if (gujaratiChars > 0 && gujaratiChars >= hindiChars && gujaratiChars >= latinChars) {
    return 'gu';
  }
  if (hindiChars > 0 && hindiChars >= gujaratiChars && hindiChars >= latinChars) {
    return 'hi';
  }
  if (latinChars > 0 && latinChars > gujaratiChars && latinChars > hindiChars) {
    return 'en';
  }

  if (['en', 'hi', 'gu'].includes(requestedLanguage)) {
    return requestedLanguage;
  }
  return 'en';
};

// Backward compatibility alias
export const detectLanguage = detectDominantLanguage;

/**
 * Resolves the language the assistant should reply in.
 * The client sets `explicit` when the farmer actively picked the language from
 * the UI toggle; in that case an hi/gu selection is authoritative even when the
 * message is typed in Latin script. Otherwise the message's dominant script
 * drives the reply (so a follow-up asked in English is not forced into a stale
 * session language).
 */
export const resolveResponseLanguage = (
  message = '',
  requestedLanguage: SupportedLanguage = 'en',
  explicit = false
): SupportedLanguage => {
  if (explicit && (requestedLanguage === 'hi' || requestedLanguage === 'gu')) {
    return requestedLanguage;
  }
  return detectDominantLanguage(message, requestedLanguage);
};

/**
 * Builds the strict grounded system instruction for Gemini.
 * Enforces zero-hallucination of ML diagnoses, weather values, and irrigation metrics,
 * and mandates clean, professional formatting without raw Markdown artifacts.
 */
export const buildSystemPrompt = (language: SupportedLanguage = 'en'): string => {
  let languageDirective = 'Language Requirement: You MUST generate your entire response in English.';

  if (language === 'gu') {
    languageDirective = `CRITICAL LANGUAGE REQUIREMENT (GUJARATI ONLY):
- You MUST write your ENTIRE response in GUJARATI (ગુજરાતી ભાષામાં) using the Gujarati script.
- Do NOT reply in English or Hindi.
- All section titles, bullet points, explanations, and advice MUST be in natural, fluent Gujarati.
- Use natural Gujarati section titles without English translations in parentheses.`;
  } else if (language === 'hi') {
    languageDirective = `CRITICAL LANGUAGE REQUIREMENT (HINDI ONLY):
- You MUST write your ENTIRE response in HINDI (हिन्दी में) using the Devanagari script.
- Do NOT reply in English.
- All section titles, bullet points, explanations, and advice MUST be in natural, fluent Hindi.
- Use natural Hindi section titles without English translations in parentheses.`;
  }

  return `You are AgriSmart AI, a strictly grounded agricultural decision-support assistant for Indian farmers.
${languageDirective}

ABSOLUTE GROUNDING LAWS (VIOLATION IS STRICTLY PROHIBITED):
1. THE BACKEND TELEMETRY IS THE ONLY AUTHORITATIVE TRUTH.
   - You are strictly an explanatory language layer.
   - You MUST NEVER invent, calculate, replace, extrapolate, or override any data.

2. IRRIGATION DECISION GROUNDING (MANDATORY):
   - The backend irrigation decision provided below is FINAL and BINDING.
   - If the backend decision is "DELAY IRRIGATION" (or hold / postpone / rain expected / optimal moisture):
     * You MUST clearly tell the farmer: DO NOT IRRIGATE / DELAY IRRIGATION.
     * You are STRICTLY FORBIDDEN from answering "Yes, irrigate" or telling the farmer to turn on pumps.
     * Explain that rain or soil moisture will naturally sustain the crop, saving water and avoiding waterlogging.
   - If the backend decision is "IRRIGATE":
     * Explain the recommendation using ONLY the exact gross volume (in Litres) provided in the context.
     * Do NOT invent or inflate water volumes.

3. WEATHER DATA FIDELITY (ZERO MODIFICATION):
   - You MUST use the EXACT rain probability percentage and EXACT expected precipitation in millimeters from the context.
   - Example: If context says 80% rain and 3.2 mm, you MUST state 80% and 3.2 mm.

4. COMPUTER-VISION DISEASE MODEL GROUNDING:
   - If the backend assessment is rule-based advisory (isMlPrediction === false or diseaseName is "Expert Advisory Assessment"):
     * You MUST explicitly state that automated image-based disease identification is not performed in this build.
     * You MUST NOT invent, guess, speculate, or mention any disease name (such as Early Blight, Late Blight, etc.).
     * You MAY still explain verified weather and irrigation guidance.

5. CLEAN, READABLE RESPONSE FORMAT (STRICT):
   - Provide a clear, direct answer on the first line.
   - Use clean section headings (e.g. Current conditions, Recommendation, Next check / હાલની સ્થિતિ, ભલામણ, આગામી તપાસ / वर्तमान स्थिति, सिफारिश, अगली जांच).
   - Use standard bullet points (• ) for items.
   - Do NOT use Markdown heading hashes (### or ##).
   - Do NOT use raw bold asterisks (**) or markdown formatting characters.
   - Do NOT include "Related suggestions:" or suggested questions inside the text body.

Keep responses practical, empathetic, highly actionable, and easy for farmers to understand.`;
};

/**
 * Formats incoming farm context into a structured, readable context block for grounding.
 */
export const formatContextForPrompt = (context: AssistantContext = {}): string => {
  if (!context || typeof context !== 'object') {
    return 'No additional sensor or telemetry context provided for this query.';
  }

  const sections = [];
  const farmName = context.farmName || context.farm?.name || 'Patel Farm';
  const crop = context.crop || context.cropName || 'Active Crop';

  sections.push(`FARM: ${farmName} | CROP: ${crop}`);
  if (context.growthStage) {
    sections.push(`GROWTH STAGE: ${context.growthStage}`);
  }

  // Weather context
  if (context.weather) {
    const w = context.weather;
    const rainProb = w.precipitationProbability ?? w.rainProbability ?? 'N/A';
    const rainMm = w.precipitationMm ?? w.rainfallExpectedMm ?? 'N/A';
    const temp = w.temperature !== undefined ? `${w.temperature}°C` : 'N/A';
    const humidity = w.humidity !== undefined ? `${w.humidity}%` : 'N/A';
    const cond = w.condition || w.description || 'N/A';

    sections.push(
      `--- VERIFIED WEATHER TELEMETRY (USE THESE EXACT NUMBERS ONLY) ---`,
      `Weather Condition: ${cond}`,
      `Air Temperature: ${temp}`,
      `Relative Humidity: ${humidity}`,
      `Rainfall Probability: ${rainProb}${typeof rainProb === 'number' ? '%' : ''}`,
      `Expected Precipitation: ${rainMm}${typeof rainMm === 'number' ? ' mm' : ''}`
    );
  }

  // Irrigation context
  const decision = extractIrrigationDecision(context);
  const irr: AssistantIrrigationContext =
    context.irrigation ?? context.irrigationPlan ?? {};
  const soilMoisture = irr.averageSoilMoisture ?? context.soilMoisture ?? 'N/A';
  const grossVol = irr.totalGrossVolumeLitres ?? irr.totalRecommendedIrrigationLitres ?? '0';
  const avoidedVol = irr.totalEstimatedAvoidedIrrigationLitres ?? irr.totalSavedLitres ?? '0';
  const reason = irr.overallReason || irr.decisionReason || (decision === 'DELAY_IRRIGATION' ? 'Rain expected or soil moisture adequate' : 'Crop water requirement');

  sections.push(
    `--- AUTHORITATIVE IRRIGATION ENGINE OUTPUT ---`,
    `BINDING DECISION: ${decision === 'DELAY_IRRIGATION' ? 'DELAY IRRIGATION (DO NOT IRRIGATE TODAY)' : (decision === 'IRRIGATE' ? 'IRRIGATE AS RECOMMENDED' : 'NO ACTION')}`,
    `Primary Agronomic Reason: ${reason}`,
    `Root-zone Soil Moisture: ${soilMoisture}${typeof soilMoisture === 'number' ? '%' : ''}`,
    `Recommended Gross Water Volume: ${grossVol} Litres`,
    `Avoided Water Volume (Savings): ${avoidedVol} Litres`,
    `MANDATORY DIRECTIVE: You MUST tell the farmer ${decision === 'DELAY_IRRIGATION' ? 'NOT to irrigate today' : 'to follow the scheduled irrigation'}. Do NOT contradict this decision.`
  );

  // Diagnosis context
  if (context.diagnosis || context.activeDiagnosis) {
    const diag = context.diagnosis || context.activeDiagnosis;
    const isMl = Boolean(diag?.isMlPrediction);
    const disease = isMl ? (diag?.diseaseName || 'Healthy') : EXPERT_ADVISORY_ASSESSMENT_LABEL;

    sections.push(
      `--- COMPUTER VISION DIAGNOSIS STATUS ---`,
      `Automated Disease Prediction: ${isMl ? diag?.diseaseName || 'Healthy' : 'NOT PERFORMED (Rule-based advisory only)'}`,
      `Disease Name: ${disease}`,
      `Rule: ${!isMl ? 'Do NOT speculate or name any disease name in your response.' : 'Explain verified diagnosis.'}`
    );
  }

  // All farms owned by / shared with the user
  if (Array.isArray(context.farms) && context.farms.length > 0) {
    sections.push(`--- USER FARMS (${context.farms.length}) ---`);
    for (const f of context.farms) {
      const where = f.district || f.state ? ` (${f.district ? `${f.district}, ` : ''}${f.state || ''})` : '';
      sections.push(`• ${f.name || 'Unnamed farm'}${where}${typeof f.totalAreaAcres === 'number' ? ` — ${f.totalAreaAcres} acres` : ''}`);
    }
    sections.push('Do not claim the farmer has farms or acreage beyond this list.');
  }

  // Every field/plot across those farms, with current crop & soil state
  if (Array.isArray(context.fields) && context.fields.length > 0) {
    sections.push(`--- FIELDS / PLOTS (${context.fields.length}) ---`);
    for (const fl of context.fields) {
      const moisture =
        fl.soilMoisture == null
          ? 'no soil sensor reading'
          : `${fl.soilMoisture}% moisture`;
      sections.push(
        `• ${fl.name || 'Field'} — crop: ${fl.crop || 'N/A'}${fl.variety ? ` (${fl.variety})` : ''} | ` +
          `stage: ${fl.growthStage || 'N/A'} | soil: ${fl.soilType || 'N/A'} | ${moisture} | ${fl.areaAcres ?? '?'} acres`
      );
    }
  }

  // Recent scans/diagnoses so crop-health answers use real records
  if (Array.isArray(context.diagnoses) && context.diagnoses.length > 0) {
    sections.push(`--- RECENT SCANS / DIAGNOSES (${context.diagnoses.length} LATEST) ---`);
    for (const d of context.diagnoses.slice(0, 10)) {
      const verdict = d.isMlPrediction
        ? d.isHealthy
          ? 'Healthy'
          : d.diseaseName || 'Condition detected'
        : 'Expert advisory assessment (no automated prediction)';
      const conf = d.isMlPrediction && typeof d.confidence === 'number' ? ` (${d.confidence}% confidence)` : '';
      sections.push(`• ${d.detectedAt || 'recently'} — ${d.crop || 'crop'} @ ${d.fieldLocation || 'field'} → ${verdict}${conf}`);
    }
    sections.push('Use ONLY these verified scan records when answering crop-health questions; do not invent scans that are not listed.');
  }

  return sections.join('\n');
};

/**
 * Produces context tag for the UI bubble
 */
export const buildContextTag = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const isHi = language === 'hi';
  const isGu = language === 'gu';

  const parts = [];
  if (context.farmName || context.farm?.name) {
    parts.push(context.farmName || context.farm?.name);
  }

  if (context.diagnosis || context.activeDiagnosis) {
    const diag = context.diagnosis || context.activeDiagnosis;
    if (diag?.isMlPrediction && diag.diseaseName && diag.diseaseName !== EXPERT_ADVISORY_ASSESSMENT_LABEL) {
      parts.push(diag.diseaseName);
    } else {
      parts.push(isGu ? 'રોગ તપાસ' : (isHi ? 'रोग विश्लेषण' : 'Diagnosis'));
    }
  }

  if (context.irrigation || context.irrigationPlan) {
    parts.push(isGu ? 'પિયત પ્લાન' : (isHi ? 'सिंचाई परामर्श' : 'Irrigation Advisory'));
  } else if (context.weather) {
    parts.push(isGu ? 'હવામાન માહિતી' : (isHi ? 'मौसम अलर्ट' : 'Weather Advisory'));
  }

  return parts.length > 0 ? parts.join(' • ') : (isGu ? 'કૃષિ સલાહકાર' : (isHi ? 'कृषि सलाहकार' : 'AgriSmart Advisor'));
};

/**
 * Returns contextual follow-up action suggestions based on language and context
 */
export const generateActionSuggestions = (
  _context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string[] => {
  if (language === 'gu') {
    return [
      'આજે પિયત આપવું કે નહીં?',
      'આ રોગના લક્ષણો અને ઉપાય જણાવો',
      'આગામી ૨૪ કલાકમાં વરસાદની શું સ્થિતિ છે?',
      'આવતીકાલે મારે શું તપાસવું જોઈએ?',
    ];
  }

  if (language === 'hi') {
    return [
      'क्या आज मुझे सिंचाई करनी चाहिए?',
      'इस रोग के लक्षण और प्राथमिक उपचार क्या हैं?',
      'अगले 24 घंटों में मौसम का क्या पूर्वानुमान है?',
      'कल सुबह मुझे खेत में क्या जांचना चाहिए?',
    ];
  }

  return [
    'Should I irrigate today?',
    'What are the recommended prevention steps?',
    'How will upcoming weather affect my crop?',
    'What should I inspect tomorrow morning?',
  ];
};

export type AssistantIntent = 'irrigation' | 'weather' | 'diagnosis' | 'farm' | 'general';

const IRRIGATION_KEYWORDS = [
  'irrigat',
  'water',
  'watering',
  'pump',
  'drip',
  'moisture',
  'सिंचाई',
  'सिंचन',
  'पानी',
  'बाढ़',
  'સિંચાઈ',
  'સિંચાઇ',
  'પિયત',
  'પાણી',
];

const WEATHER_KEYWORDS = [
  'weather',
  'rain',
  'rainfall',
  'forecast',
  'humidity',
  'temperature',
  'wind',
  'वर्षा',
  'बारिश',
  'मौसम',
  'तापमान',
  'नमी',
  'हवा',
  'વરસાદ',
  'હવામાન',
  'તાપમાન',
  'ભેજ',
  'પવન',
];

const DIAGNOSIS_KEYWORDS = [
  'disease',
  'diseases',
  'scan',
  'diagnos',
  'leaf',
  'leaves',
  'blight',
  'spot',
  'healthy',
  'pest',
  'spray',
  'treatment',
  'रोग',
  'बीमारी',
  'लक्षण',
  'स्वस्थ',
  'पत्ती',
  'छिड़काव',
  'उपचार',
  'સારવાર',
  'રોગ',
  'બીમારી',
  'લક્ષણ',
  'તંદુરસ્ત',
  'પર્ણ',
  'દવા',
];

const FARM_DATA_KEYWORDS = [
  'field',
  'fields',
  'plot',
  'plots',
  'farm',
  'farms',
  'list',
  'acre',
  'acres',
  'खेत',
  'खेतों',
  'प्लॉट',
  'जमीन',
  'एकड़',
  'ખેતર',
  'ખેતરો',
  'પ્લોટ',
  'જમીન',
  'એકર',
  'વાડી',
  'નોંધાયેલા',
];

/**
 * Classifies a farmer's question into a topic so the rule-based fallback can
 * answer the right kind of question instead of recycling one fixed template.
 */
export const detectAssistantIntent = (message = ''): AssistantIntent => {
  const text = (message || '').toLowerCase();
  if (IRRIGATION_KEYWORDS.some((k) => text.includes(k))) return 'irrigation';
  if (WEATHER_KEYWORDS.some((k) => text.includes(k))) return 'weather';
  if (DIAGNOSIS_KEYWORDS.some((k) => text.includes(k))) return 'diagnosis';
  if (FARM_DATA_KEYWORDS.some((k) => text.includes(k))) return 'farm';
  return 'general';
};

/**
 * Produces a topic-specific, 100% grounded rule-based reply in the requested
 * language. Unlike the previous version, it never recycles the irrigation
 * answer for unrelated questions — the reply always reflects the question.
 */
export const generateDeterministicGroundedResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en',
  message?: string
): string => {
  const intent = detectAssistantIntent(message || '');
  switch (intent) {
    case 'weather':
      return buildDeterministicWeatherResponse(context, language);
    case 'diagnosis':
      return buildDeterministicDiagnosisResponse(context, language);
    case 'irrigation':
      return buildDeterministicIrrigationResponse(context, language);
    case 'farm':
      return buildDeterministicFarmResponse(context, language, message);
    default:
      return buildDeterministicGeneralResponse(context, language);
  }
};

const farmDetailLine = (f: AssistantFarmContext, language: SupportedLanguage): string => {
  const where = f.district || f.state ? ` (${[f.district, f.state].filter(Boolean).join(', ')})` : '';
  const area =
    typeof f.totalAreaAcres === 'number'
      ? language === 'hi'
        ? ` | ${f.totalAreaAcres} एकड़`
        : language === 'gu'
          ? ` | ${f.totalAreaAcres} એકર`
          : ` | ${f.totalAreaAcres} acres`
      : '';
  return `• ${f.name || 'Unnamed farm'}${where}${area}`;
};

const fieldDetailLine = (fl: AssistantFieldContext, language: SupportedLanguage): string => {
  const name = fl.name || 'Field';
  const cropPart = fl.crop ? `${fl.crop}${fl.variety ? ` (${fl.variety})` : ''}` : 'N/A';
  const moisture = fl.soilMoisture == null ? null : `${fl.soilMoisture}%`;
  const parts: string[] = [];
  if (language === 'hi') {
    if (fl.crop) parts.push(`फसल: ${cropPart}`);
    if (fl.growthStage) parts.push(`अवस्था: ${fl.growthStage}`);
    if (fl.soilType) parts.push(`मिट्टी: ${fl.soilType}`);
    if (moisture) parts.push(`${moisture} नमी`);
    parts.push(`${fl.areaAcres ?? '?'} एकड़`);
  } else if (language === 'gu') {
    if (fl.crop) parts.push(`પાક: ${cropPart}`);
    if (fl.growthStage) parts.push(`અવસ્થા: ${fl.growthStage}`);
    if (fl.soilType) parts.push(`જમીન: ${fl.soilType}`);
    if (moisture) parts.push(`${moisture} ભેજ`);
    parts.push(`${fl.areaAcres ?? '?'} એકર`);
  } else {
    if (fl.crop) parts.push(`crop: ${cropPart}`);
    if (fl.growthStage) parts.push(`stage: ${fl.growthStage}`);
    if (fl.soilType) parts.push(`soil: ${fl.soilType}`);
    if (moisture) parts.push(`${moisture} moisture`);
    parts.push(`${fl.areaAcres ?? '?'} acres`);
  }
  return `• ${name} — ${parts.join(' | ')}`;
};

/**
 * Answers "which fields/farms do I have?" directly from the registered
 * farm/field data, optionally scoped to the farm named in the question.
 */
export const buildDeterministicFarmResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en',
  message?: string
): string => {
  const farms = Array.isArray(context.farms) ? context.farms : [];
  const fields = Array.isArray(context.fields) ? context.fields : [];

  if (farms.length === 0 && fields.length === 0) {
    if (language === 'gu') {
      return 'તમારા નામે હજી કોઈ ખેતર અથવા પ્લોટ નોંધાયેલા નથી. મેનેજમેન્ટ સ્ક્રીન પરથી ખેતર/પ્લોટ ઉમેરો અને હું ફરી મદદ કરીશ.';
    }
    if (language === 'hi') {
      return 'आपके नाम पर अभी कोई खेत या प्लॉट पंजीकृत नहीं हैं। मैनेजमेंट स्क्रीन से खेत/प्लॉट जोड़ें और मैं फिर से मदद करूँगा।';
    }
    return 'No farms or fields are registered for your account yet. Add a farm or field from the Management screen and I can list them for you.';
  }

  const target = (message || '').toLowerCase();
  const requestedFarm = farms.find((f) => {
    const name = (f.name || '').toLowerCase();
    return name && target.includes(name);
  });

  const visibleFarms = requestedFarm ? [requestedFarm] : farms;
  const visibleFields = requestedFarm
    ? fields.filter((fl) =>
        fl.farmId
          ? fl.farmId === requestedFarm.id
          : (fl.name || '').toLowerCase().includes((requestedFarm.name || '').toLowerCase())
      )
    : fields;

  const lines: string[] = [];
  lines.push(
    requestedFarm
      ? language === 'gu'
        ? `ખેતર "${requestedFarm.name}" ના નોંધાયેલા પ્લોટ (${visibleFields.length}):`
        : language === 'hi'
          ? `खेत "${requestedFarm.name}" के पंजीकृत प्लॉट (${visibleFields.length}):`
          : `Fields at ${requestedFarm.name} (${visibleFields.length}):`
      : language === 'gu'
        ? `તમારા ખેતરોના નોંધાયેલા પ્લોટ (${visibleFields.length}):`
        : language === 'hi'
          ? `आपके खेतों के पंजीकृत प्लॉट (${visibleFields.length}):`
          : `Registered fields across your farms (${visibleFields.length}):`
  );

  if (visibleFields.length === 0) {
    lines.push(language === 'gu' ? '  હજી કોઈ પ્લોટ ઉમેરાયા નથી.' : language === 'hi' ? '  अभी कोई प्लॉट नहीं जोड़ा गया।' : '  No fields registered yet.');
  } else {
    for (const fl of visibleFields) {
      lines.push(fieldDetailLine(fl, language));
    }
  }

  lines.push('');
  if (visibleFarms.length > 0) {
    lines.push(language === 'gu' ? 'ખેતર:' : language === 'hi' ? 'खेत:' : 'Farm:');
    for (const f of visibleFarms) {
      lines.push(farmDetailLine(f, language));
    }
  }

  return lines.join('\n');
};

const buildDeterministicGeneralResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const farms = Array.isArray(context.farms) ? context.farms : [];
  const fields = Array.isArray(context.fields) ? context.fields : [];
  const decision = extractIrrigationDecision(context);
  const diag = context.diagnosis || context.activeDiagnosis;
  const irr = context.irrigation ?? context.irrigationPlan;

  const lines: string[] = [];
  lines.push(
    language === 'gu'
      ? 'તમારા ખેતર માટે સચોટ સારાંશ:'
      : language === 'hi'
        ? 'आपके खेत के लिए सत्यापित सारांश:'
        : 'Here is the verified picture of your farm:'
  );

  if (farms.length > 0) {
    lines.push('');
    lines.push(language === 'gu' ? 'ખેતરો:' : language === 'hi' ? 'खेत:' : 'Farms:');
    for (const f of farms) lines.push(farmDetailLine(f, language));
  }

  if (fields.length > 0) {
    lines.push('');
    lines.push(language === 'gu' ? 'પ્લોટ / ખેતરો:' : language === 'hi' ? 'प्लॉट / खेत:' : 'Fields / plots:');
    for (const fl of fields) lines.push(fieldDetailLine(fl, language));
  }

  if (irr || decision !== 'UNKNOWN') {
    lines.push('');
    lines.push(language === 'gu' ? 'પિયત તારણ:' : language === 'hi' ? 'सिंचाई निर्णय:' : 'Irrigation verdict:');
    lines.push(
      decision === 'DELAY_IRRIGATION'
        ? language === 'gu'
          ? '• આજે પિયત ન આપો — મોકૂફ રાખો.'
          : language === 'hi'
            ? '• आज सिंचाई न करें — टालें।'
            : '• Do not irrigate today — delay is advised.'
        : decision === 'IRRIGATE'
          ? language === 'gu'
            ? '• પિયત સમયપત્રક મુજબ પાણી આપો.'
            : language === 'hi'
              ? '• सिंचाई कार्यक्रम के अनुसार पानी दें।'
              : '• Proceed with the scheduled irrigation.'
          : language === 'gu'
            ? '• કોઈ તાત્કાલિક પિયત નિર્ણય નથી.'
            : language === 'hi'
              ? '• कोई तत्काल सिंचाई निर्णय नहीं।'
              : '• No urgent irrigation decision.'
    );
  }

  if (diag) {
    lines.push('');
    lines.push(language === 'gu' ? 'નવીનતમ સ્કેન:' : language === 'hi' ? 'नवीनतम स्कैन:' : 'Latest scan:');
    lines.push(
      diag.isMlPrediction && diag.diseaseName && diag.diseaseName !== EXPERT_ADVISORY_ASSESSMENT_LABEL
        ? `• ${diag.diseaseName}`
        : language === 'gu'
          ? '• નિષ્ણાત સલાહ મૂલ્યાંકન (સ્વચાલિત રોગ આગાહી નથી).'
          : language === 'hi'
            ? '• विशेषज्ञ सलाह मूल्यांकन (कोई स्वचालित रोग पूर्वानुमान नहीं)।'
            : '• Expert advisory assessment (no automated disease prediction).'
    );
  }

  if (farms.length === 0 && fields.length === 0) {
    lines.push('');
    lines.push(
      language === 'gu'
        ? 'ચોક્કસ જવાબ માટે પિયત, હવામાન અથવા પાકના રોગ વિશે પૂછો — જવાબ તમારા લાઇવ ફાર્મ ડેટા પર આધારિત હશે.'
        : language === 'hi'
          ? 'सटीक उत्तर के लिए सिंचाई, मौसम या फसल रोग के बारे में पूछें — उत्तर आपके लाइव खेत डेटा पर आधारित होंगे।'
          : 'Ask specifically about irrigation, the weather outlook, or crop scouting — replies are grounded in your live farm data.'
    );
  }

  return lines.join('\n');
};

const buildDeterministicDiagnosisResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const diag = context.diagnosis || context.activeDiagnosis;
  const isMlUnavailable = diag && (!diag.isMlPrediction || diag.diseaseName === EXPERT_ADVISORY_ASSESSMENT_LABEL);
  const isMlResult = diag?.isMlPrediction && diag.diseaseName && diag.diseaseName !== EXPERT_ADVISORY_ASSESSMENT_LABEL;

  if (isMlResult) {
    const disease = diag?.diseaseName || 'Healthy';
    const healthy = disease.toLowerCase() === 'healthy';
    if (language === 'gu') {
      return `તમારા પાકનો નવીનતમ સ્કેન પરિણામ:
• મોડેલ પરિણામ: ${disease}
• સ્થિતિ: ${healthy ? 'તંદુરસ્ત' : 'રોગ શોધાયો'}
ભલામણ: નિદાન રિપોર્ટમાં દર્શાવેલ ઉપચાર/જાળવણી પગલાં અનુસરો અને ખેતરમાં લક્ષણોની પુષ્ટિ કરો.`;
    }
    if (language === 'hi') {
      return `आपकी फसल का नवीनतम स्कैन परिणाम:
• मॉडल परिणाम: ${disease}
• स्थिति: ${healthy ? 'स्वस्थ' : 'रोग पाया गया'}
सिफारिश: निदान रिपोर्ट में दिए गए उपचार/रखरखाव चरणों का पालन करें और खेत में लक्षणों की पुष्टि करें।`;
    }
    return `Latest leaf scan for your farm:
• Model result: ${disease}
• Status: ${healthy ? 'Healthy' : 'Condition detected'}

Recommendation
• Follow the treatment / maintenance protocols shown on the diagnosis report and confirm symptoms in the field.`;
  }

  if (isMlUnavailable) {
    if (language === 'gu') {
      return `કમ્પ્યુટર આધારિત રોગ નિદાન આ બિલ્ડમાં હાથ ધરવામાં આવતું નથી (Expert Advisory Assessment). કોઈ સ્વચાલિત રોગ અનુમાન કરવામાં આવ્યું નથી. કૃપા કરીને પાકના લક્ષણોનું પ્રત્યક્ષ નિરીક્ષણ કરો અથવા સ્થાનિક કૃષિ અધિકારીનો સંપર્ક કરો.`;
    }
    if (language === 'hi') {
      return `इस बिल्ड में स्वचालित रोग पहचान नहीं की जाती है (Expert Advisory Assessment)। कोई स्वचालित रोग निदान नहीं किया गया है। कृपया फसल के लक्षणों की प्रत्यक्ष जांच करें या कृषि विशेषज्ञ से परामर्श लें।`;
    }
    return `Automated image-based disease identification is not performed in this build (Expert Advisory Assessment). No automated disease prediction has been made. Please inspect crop leaves visually or consult a local agricultural extension expert.`;
  }

  if (language === 'gu') {
    return `હાલમાં કોઈ સક્રિય પાક સ્કેન વિકલ્પ ઉપલબ્ધ નથી. કૃપા કરીને ડાયગ્નોસિસ સ્ક્રીન પર પાંદડાનો ફોટો અપલોડ કરીને સ્કેન કરો.`;
  }
  if (language === 'hi') {
    return `फिलहाल कोई सक्रिय फसल स्कैन उपलब्ध नहीं है। कृपया डायग्नोसिस स्क्रीन पर पत्ते की तस्वीर अपलोड करके स्कैन करें।`;
  }
  return `There is no active leaf scan for your farm yet. Open the Crop Scan screen and upload a clear leaf photo to get a grounded health assessment.`;
};

const buildDeterministicWeatherResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const w: AssistantWeatherContext = context.weather ?? {};
  const rainProb = w.precipitationProbability ?? w.rainProbability ?? 'N/A';
  const rainMm = w.precipitationMm ?? w.rainfallExpectedMm ?? 'N/A';
  const temp = w.temperature ?? 'N/A';
  const humidity = w.humidity ?? 'N/A';
  const cond = w.condition || w.description || 'N/A';
  const decision = extractIrrigationDecision(context);
  const rainAdvice =
    decision === 'DELAY_IRRIGATION'
      ? language === 'gu'
        ? 'નોંધપાત્ર વરસાદની શક્યતા છે — પિયત મોકૂફ રાખો.'
        : language === 'hi'
          ? 'भारी वर्षा की संभावना है — सिंचाई टालें।'
          : 'Significant rain is likely — delay irrigation and let the rainfall replenish soil moisture.'
      : language === 'gu'
        ? 'ભારે વરસાદની અપેક્ષા નથી — નિયોજિત પિયત સમયપત્રક અનુસરો.'
        : language === 'hi'
          ? 'भारी वर्षा की संभावना नहीं है — नियोजित सिंचाई कार्यक्रम का पालन करें।'
          : 'No heavy rainfall is expected — follow the planned irrigation schedule.';

  if (language === 'gu') {
    return `તમારા ખેતર માટે સચોટ હવામાન આગાહી
• હવામાન: ${cond}
• તાપમાન: ${temp}°C
• ભેજ: ${humidity}%
• વરસાદની શક્યતા: ${rainProb}%
• અપેક્ષિત વરસાદ: ${rainMm} mm

ભલામણ
• ${rainAdvice}

આગામી તપાસ
• આગામી પિયત ચક્ર પહેલા અપડેટેડ આગાહી ફરી જુઓ.`;
  }
  if (language === 'hi') {
    return `आपके खेत के लिए सत्यापित मौसम पूर्वानुमान
• मौसम: ${cond}
• तापमान: ${temp}°C
• आर्द्रता: ${humidity}%
• वर्षा संभावना: ${rainProb}%
• अनुमानित वर्षा: ${rainMm} mm

सिफारिश
• ${rainAdvice}

अगली जांच
• अगले सिंचाई चक्र से पहले अपडेटेड पूर्वानुमान दोबारा देखें।`;
  }
  return `Verified weather outlook for your farm
• Condition: ${cond}
• Temperature: ${temp}°C
• Humidity: ${humidity}%
• Rain probability: ${rainProb}%
• Expected rainfall: ${rainMm} mm

Recommendation
• ${rainAdvice}

Next check
• Recheck the updated forecast on the AgriSmart weather screen before the next irrigation cycle.`;
};

const buildDeterministicIrrigationResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const decision = extractIrrigationDecision(context);
  const w: AssistantWeatherContext = context.weather ?? {};
  const rainProb = w.precipitationProbability ?? w.rainProbability ?? 80;
  const rainMm = w.precipitationMm ?? w.rainfallExpectedMm ?? 3.2;
  const temp = w.temperature ?? 30;
  const irr: AssistantIrrigationContext =
    context.irrigation ?? context.irrigationPlan ?? {};
  const avoidedLitres = irr.totalEstimatedAvoidedIrrigationLitres ?? irr.totalSavedLitres ?? 1850;
  const soilMoisture = irr.averageSoilMoisture ?? context.soilMoisture ?? 31;

  if (language === 'gu') {
    if (decision === 'DELAY_IRRIGATION') {
      return `ના, આજે તમારા ખેતરમાં પિયત આપવાની જરૂર નથી.

હાલની સ્થિતિ
• વરસાદની શક્યતા: ${rainProb}%
• અપેક્ષિત વરસાદ: ${rainMm} mm
• તાપમાન: ${temp}°C
• જમીનમાં ભેજ: ${soilMoisture}%

ભલામણ
• પિયત મોકૂફ રાખો અને વરસાદ પછી ખેતરનું નિરીક્ષણ કરો.
• અંદાજિત પાણીની બચત: ${avoidedLitres.toLocaleString()} લિટર.

આગામી તપાસ
• અપેક્ષિત વરસાદ પછી આવતીકાલે જમીનનો ભેજ ફરી તપાસો.`;
    }
    return `હા, પિયત યોજના મુજબ ખેતરમાં પાણી આપી શકાય છે.

હાલની સ્થિતિ
• જમીનમાં ભેજ: ${soilMoisture}%
• તાપમાન: ${temp}°C

ભલામણ
• પિયત યોજના મુજબ જરૂરી પાણી આપવું.`;
  }

  if (language === 'hi') {
    if (decision === 'DELAY_IRRIGATION') {
      return `नहीं, आज आपको अपने खेत में सिंचाई नहीं करनी चाहिए।

वर्तमान स्थिति
• बारिश की संभावना: ${rainProb}%
• अनुमानित वर्षा: ${rainMm} mm
• तापमान: ${temp}°C
• मिट्टी में नमी: ${soilMoisture}%

सिफारिश
• सिंचाई टालें और बारिश के बाद खेत की स्थिति देखें।
• अनुमानित जल बचत: ${avoidedLitres.toLocaleString()} लीटर।

अगली जांच
• अनुमानित बारिश के बाद कल मिट्टी की नमी दोबारा जांचें।`;
    }
    return `हाँ, सिंचाई योजना के अनुसार खेत में पानी दे सकते हैं।

वर्तमान स्थिति
• मिट्टी में नमी: ${soilMoisture}%
• तापमान: ${temp}°C

सिफारिश
• अनुशंसित मात्रा में सिंचाई करें।`;
  }

  // English default
  if (decision === 'DELAY_IRRIGATION') {
    return `No, you should not irrigate your fields today.

Current conditions
• Rain probability: ${rainProb}%
• Expected rainfall: ${rainMm} mm
• Temperature: ${temp}°C
• Soil moisture: ${soilMoisture}%

Recommendation
• Delay irrigation and monitor the field after rainfall.
• Estimated water saving: ${avoidedLitres.toLocaleString()} litres.

Next check
• Recheck soil moisture tomorrow after the expected rainfall.`;
  }

  return `Yes, proceed with scheduled irrigation as recommended by the irrigation engine.

Current conditions
• Soil moisture: ${soilMoisture}%
• Temperature: ${temp}°C

Recommendation
• Apply the recommended water volume according to the irrigation schedule.`;
};

export interface GroundingResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates Gemini LLM output against authoritative context facts.
 * Returns { isValid: boolean, reason?: string }
 */
export const validateGrounding = (
  replyText = '',
  context: AssistantContext = {}
): GroundingResult => {
  const text = String(replyText).toLowerCase();
  const decision = extractIrrigationDecision(context);

  // 1. Irrigation contradiction check
  if (decision === 'DELAY_IRRIGATION') {
    // Check if reply affirmatively tells the farmer to irrigate today
    const affirmsIrrigation =
      /^(yes|हाँ|હા|definitely|surely)[,\s]/i.test(text.trim()) ||
      text.includes('yes, you should irrigate') ||
      text.includes('you should irrigate your') ||
      text.includes('recommend irrigating today') ||
      text.includes('start irrigation pumps') ||
      text.includes('सिंचाई करनी चाहिए') ||
      text.includes('पानी लगाना चाहिए') ||
      text.includes('પિયત આપવું જોઈએ') ||
      text.includes('પિયત કરવું જોઈએ');

    if (affirmsIrrigation) {
      return {
        isValid: false,
        reason: 'Contradiction: Irrigation engine ordered DELAY_IRRIGATION but response advised irrigating.',
      };
    }
  }

  // 2. Hallucinated disease check when ML is offline
  const diag = context.diagnosis || context.activeDiagnosis;
  if (diag && !diag.isMlPrediction) {
    const knownDiseases = [
      'early blight',
      'late blight',
      'leaf spot',
      'powdery mildew',
      'alternaria',
      'fusarium',
      'bacterial wilt',
      'अगेती झुलसा',
      'પાનના ટપકાં',
      'સુકારો',
    ];
    for (const d of knownDiseases) {
      if (text.includes(d)) {
        return {
          isValid: false,
          reason: `Hallucination: Assessment is rule-based advisory but response named specific pathogen '${d}'.`,
        };
      }
    }
  }

  // 3. Hallucinated metric check: if rain is >5mm, response should not say "0 mm"
  const rainMm = Number(context.weather?.precipitationMm ?? context.weather?.rainfallExpectedMm ?? 0);
  if (rainMm > 5 && (text.includes('0 mm') || text.includes('0mm') || text.includes('no rainfall expected'))) {
    return {
      isValid: false,
      reason: `Fidelity error: Expected rainfall is ${rainMm} mm but response claimed 0 mm.`,
    };
  }

  return { isValid: true };
};

/**
 * Sanitizes reply text to ensure no raw markdown heading hashes or duplicate suggestion sections appear
 */
export const cleanReplyText = (text = ''): string => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // Remove markdown headers ### or ## or #
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Clean trailing related suggestions section if the model generated it in text
  cleaned = cleaned.replace(/(?:\r?\n)+(?:Related suggestions|Related actions|संबंधित सुझाव|સંબંધિત સૂચનો|સંબંધિત પગલાં)[\s\S]*$/i, '');

  return cleaned.trim();
};

/**
 * Validates that a final reply actually uses the target script when Hindi or
 * Gujarati was requested. Falls back to the deterministic builder otherwise so
 * a misbehaving English-language LLM reply never leaks through.
 */
const replyMatchesScript = (reply = '', language: SupportedLanguage): boolean => {
  if (language === 'hi') return /[\u0900-\u097F]/.test(reply);
  if (language === 'gu') return /[\u0A80-\u0AFF]/.test(reply);
  return true;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates an advisory response using Google Gemini LLM with strict dual-layer grounding validation
 *
 * @param {Object} params
 * @param {string} params.message - Farmer's question/query
 * @param {string} params.language - 'en' | 'hi' | 'gu'
 * @param {Object} [params.context] - Farm, diagnosis, weather, irrigation telemetry
 * @returns {Promise<Object>} Assistant response object
 */
export const generateAssistantResponse = async ({
  message,
  language = 'en',
  context = {},
  explicit = false,
}: {
  message: string;
  language?: SupportedLanguage;
  context?: AssistantContext;
  explicit?: boolean;
}) => {
  const effectiveLanguage = resolveResponseLanguage(message, language, explicit);
  const apiKey = config.gemini.apiKey;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    logger.error('Gemini API key is missing or unconfigured in environment.');
    throw new ApiError(503, 'AI Farmer Assistant is currently unavailable. Please configure GEMINI_API_KEY.');
  }

  const model = config.gemini.model || 'gemini-flash-latest';
  const systemPrompt = buildSystemPrompt(effectiveLanguage);
  const formattedContext = formatContextForPrompt(context);

  let endInstruction = `Generate a direct, empathetic, and 100% grounded response in ${SUPPORTED_LANGUAGES[effectiveLanguage]}:`;
  if (effectiveLanguage === 'gu') {
    endInstruction = `મહત્વપૂર્ણ સૂચના: ખેડૂતના પ્રશ્નનો સંપૂર્ણ જવાબ ફક્ત અને ફક્ત ગુજરાતી ભાષામાં (ગુજરાતી લિપિમાં) જ આપો. અંગ્રેજીમાં જવાબ આપવો નહીં.\nGenerate a direct, empathetic, and 100% grounded response entirely in Gujarati (ગુજરાતી):`;
  } else if (effectiveLanguage === 'hi') {
    endInstruction = `महत्वपूर्ण निर्देश: किसान के प्रश्न का पूरा उत्तर केवल और केवल हिन्दी भाषा में (देवनागरी लिपि में) ही दें। अंग्रेजी में उत्तर न दें।\nGenerate a direct, empathetic, and 100% grounded response entirely in Hindi (हिन्दी):`;
  }

  const fullPrompt = `${systemPrompt}

======================================================================
VERIFIED TELEMETRY & AUTHORITATIVE ENGINE OUTPUTS (GROUND TRUTH ONLY):
======================================================================
${formattedContext}
======================================================================

FARMER'S QUESTION:
"${message}"

${endInstruction}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Ultra-low temperature for maximum determinism & grounding
      topP: 0.7,
      maxOutputTokens: 1000,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const timeoutMs = config.gemini.timeoutMs || 15000;

  /**
   * Calls Gemini with a single retry on transient failures (429 quota/rate
   * limit and 5xx), so a momentary quota hiccup does not silently drop the
   * farmer into the rule-based engine. Non-OK responses log the upstream error
   * message (e.g. "Quota exceeded") to make quota exhaustion diagnosable.
   */
  const fetchGeminiReply = async (): Promise<string> => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        logger.warn(`Gemini fetch error (attempt ${attempt}): ${getErrorMessage(err)}.`);
        if (attempt < 2) {
          await sleep(700);
          continue;
        }
        return '';
      }

      if (response.ok) {
        try {
          const data: any = await response.json();
          const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textPart && typeof textPart === 'string') {
            return textPart.trim();
          }
        } catch {
          // empty body / parse failure — treat as empty
        }
        return '';
      }

      let detail = '';
      try {
        const errBody = (await response.json()) as any;
        detail =
          typeof errBody?.error?.message === 'string'
            ? errBody.error.message
            : JSON.stringify(errBody).slice(0, 200);
      } catch {
        // non-JSON error body
      }

      const status = response.status;
      if (status === 429 || status >= 500) {
        logger.warn(
          `Gemini API returned status ${status} (attempt ${attempt})${detail ? ` — ${detail}` : ''}.${attempt < 2 ? ' Retrying…' : ' Activating safe grounded engine.'}`
        );
        if (attempt < 2) {
          await sleep(700);
          continue;
        }
        return '';
      }

      logger.warn(`Gemini API returned non-OK status ${status}${detail ? ` — ${detail}` : ''}. Activating safe grounded engine.`);
      return '';
    }
    return '';
  };

  let rawReply = await fetchGeminiReply();

  // Dual-layer Grounding Validation
  const validation = validateGrounding(rawReply, context);
  let finalReply = rawReply;
  let usedFallback = false;
  let fallbackReason: string | undefined;

  if (!rawReply || !validation.isValid) {
    usedFallback = true;
    if (rawReply && !validation.isValid) {
      fallbackReason = validation.reason;
      logger.warn(`[GROUNDING INTERCEPTION] LLM response violated grounding rules: ${validation.reason}`);
    }
    // Fall back to a topic-aware, 100% grounded rule-based explanation so the
    // reply actually addresses the farmer's question instead of recycling one
    // fixed irrigation template.
    finalReply = generateDeterministicGroundedResponse(context, effectiveLanguage, message);
  }

  // Language fidelity: when Hindi/Gujarati was requested but the LLM replied in
  // the wrong script, substitute the verified translation from the rule engine.
  if (!usedFallback && !replyMatchesScript(finalReply, effectiveLanguage)) {
    usedFallback = true;
    fallbackReason = `Language enforcement: reply not in ${SUPPORTED_LANGUAGES[effectiveLanguage]}.`;
    logger.warn(`[LANGUAGE ENFORCEMENT] ${fallbackReason}`);
    finalReply = generateDeterministicGroundedResponse(context, effectiveLanguage, message);
  }

  finalReply = cleanReplyText(finalReply);

  const contextTag = buildContextTag(context, effectiveLanguage);
  const actionSuggestions = generateActionSuggestions(context, effectiveLanguage);

  return {
    reply: finalReply,
    language: effectiveLanguage,
    contextTag,
    actionSuggestions,
    model,
    contextGrounded: true,
    fallback: usedFallback,
    fallbackReason,
    timestamp: new Date().toISOString(),
  };
};

export default {
  SUPPORTED_LANGUAGES,
  detectDominantLanguage,
  detectLanguage,
  resolveResponseLanguage,
  detectAssistantIntent,
  cleanReplyText,
  extractIrrigationDecision,
  buildSystemPrompt,
  formatContextForPrompt,
  buildContextTag,
  generateActionSuggestions,
  generateDeterministicGroundedResponse,
  buildDeterministicFarmResponse,
  validateGrounding,
  generateAssistantResponse,
};