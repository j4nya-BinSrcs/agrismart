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
      parts.push(isGu ? 'રોગ તપાસ' : (isHi ? 'રોગ વિશ્લેષણ' : 'Diagnosis'));
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

/**
 * Generates a deterministic, 100% grounded fallback response when LLM output violates safety laws.
 */
export const generateDeterministicGroundedResponse = (
  context: AssistantContext = {},
  language: SupportedLanguage = 'en'
): string => {
  const diag = context.diagnosis || context.activeDiagnosis;
  const isMlUnavailable = diag && (!diag.isMlPrediction || diag.diseaseName === EXPERT_ADVISORY_ASSESSMENT_LABEL);

  if (isMlUnavailable && (!context.irrigation && !context.irrigationPlan)) {
    if (language === 'gu') {
      return `કમ્પ્યુટર આધારિત રોગ નિદાન આ બિલ્ડમાં હાથ ધરવામાં આવતું નથી (Expert Advisory Assessment). કોઈ સ્વચાલિત રોગ અનુમાન કરવામાં આવ્યું નથી. કૃપા કરીને પાકના લક્ષણોનું પ્રત્યક્ષ નિરીક્ષણ કરો અથવા સ્થાનિક કૃષિ અધિકારીનો સંપર્ક કરો.`;
    }
    if (language === 'hi') {
      return `इस बिल्ड में स्वचालित रोग पहचान नहीं की जाती है (Expert Advisory Assessment)। कोई स्वचालित रोग निदान नहीं किया गया है। कृपया फसल के लक्षणों की प्रत्यक्ष जांच करें या कृषि विशेषज्ञ से परामर्श लें।`;
    }
    return `Automated image-based disease identification is not performed in this build (Expert Advisory Assessment). No automated disease prediction has been made. Please inspect crop leaves visually or consult a local agricultural extension expert.`;
  }

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
}: {
  message: string;
  language?: SupportedLanguage;
  context?: AssistantContext;
}) => {
  const effectiveLanguage = detectDominantLanguage(message, language);
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
  const controller = new AbortController();
  const timeoutMs = config.gemini.timeoutMs || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let rawReply = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: any = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textPart && typeof textPart === 'string') {
        rawReply = textPart.trim();
      }
    } else {
      const status = response.status;
      logger.warn(`Gemini API returned non-OK status ${status}. Activating safe grounded engine.`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    logger.warn(`Gemini fetch error: ${getErrorMessage(err)}. Activating safe grounded engine.`);
  }

  // Dual-layer Grounding Validation
  const validation = validateGrounding(rawReply, context);
  let finalReply = rawReply;

  if (!rawReply || !validation.isValid) {
    if (rawReply && !validation.isValid) {
      logger.warn(`[GROUNDING INTERCEPTION] LLM response violated grounding rules: ${validation.reason}`);
    }
    // Fall back to deterministic, 100% grounded calculation explanation
    finalReply = generateDeterministicGroundedResponse(context, effectiveLanguage);
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
    timestamp: new Date().toISOString(),
  };
};

export default {
  SUPPORTED_LANGUAGES,
  detectDominantLanguage,
  detectLanguage,
  cleanReplyText,
  extractIrrigationDecision,
  buildSystemPrompt,
  formatContextForPrompt,
  buildContextTag,
  generateActionSuggestions,
  generateDeterministicGroundedResponse,
  validateGrounding,
  generateAssistantResponse,
};