import assert from 'node:assert';
import config from '../src/config/env.js';
import geminiService, {
  buildSystemPrompt,
  formatContextForPrompt,
  extractIrrigationDecision,
  generateDeterministicGroundedResponse,
  validateGrounding,
} from '../src/services/geminiService.js';
import { handleAssistantQuery } from '../src/controllers/assistantController.js';

let passed = 0;
let failed = 0;

const runTest = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n')}`);
    failed++;
  }
};

console.log('\n==================================================================');
console.log('  AGRISMART AI — DUAL-LAYER GROUNDING & ASSISTANT TEST SUITE     ');
console.log('==================================================================\n');

// Mock helper
const createMockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

// Test 1: Input irrigation decision = "Delay Irrigation" -> Must NOT recommend irrigation
await runTest('Test 1: Irrigation decision "Delay Irrigation" strictly prevents irrigation recommendation', async () => {
  const context = {
    farmName: 'Patel Farm',
    crop: 'Tomato',
    weather: { rainProbability: 82, precipitationMm: 14.5 },
    irrigation: {
      overallDecision: 'Delay Irrigation',
      overallReason: 'Significant rain forecasted',
      totalEstimatedAvoidedIrrigationLitres: 1850,
    }
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'Should I irrigate my fields today?',
    language: 'en',
    context,
  });

  const replyLower = response.reply.toLowerCase();
  assert(
    replyLower.includes('no') || replyLower.includes('delay') || replyLower.includes('hold') || replyLower.includes('do not irrigate'),
    'Response must advise holding or delaying irrigation'
  );
  assert(
    !replyLower.includes('yes, you should irrigate') && !replyLower.includes('start the pump'),
    'Response must NOT recommend irrigating'
  );
});

// Test 2: Input rain probability = 82%, precipitation = 14.5 mm -> Preserves exact numbers
await runTest('Test 2: Input rain probability = 82%, precipitation = 14.5 mm are accurately preserved', async () => {
  const context = {
    farmName: 'Patel Farm',
    weather: { precipitationProbability: 82, precipitationMm: 14.5 },
    irrigation: { overallDecision: 'Delay Irrigation' }
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'What is the weather impact?',
    language: 'en',
    context,
  });

  assert(response.reply.includes('82%') || response.reply.includes('82'), 'Must preserve 82% rain probability');
  assert(response.reply.includes('14.5'), 'Must preserve 14.5 mm precipitation');
  assert(!response.reply.includes('0 mm') && !response.reply.includes('0mm'), 'Must NOT claim 0 mm when 14.5 mm is expected');
});

// Test 3: Input estimated avoided irrigation = 1850 litres -> Preserves 1850 L without fabricating
await runTest('Test 3: Input estimated avoided irrigation = 1850 litres is strictly grounded', async () => {
  const context = {
    farmName: 'Patel Farm',
    weather: { rainProbability: 82, precipitationMm: 14.5 },
    irrigation: {
      overallDecision: 'Delay Irrigation',
      totalEstimatedAvoidedIrrigationLitres: 1850,
    }
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'How much water will I save?',
    language: 'en',
    context,
  });

  assert(response.reply.includes('1,850') || response.reply.includes('1850'), 'Must contain 1850 litres');
  assert(!response.reply.includes('14,56,868'), 'Must NOT hallucinate arbitrary water volume like 14,56,868');
});

// Test 4: ML classification unavailable -> Must NOT name a disease
await runTest('Test 4: When ML classification is unavailable, assistant strictly does not name a disease', async () => {
  const context = {
    farmName: 'Patel Farm',
    crop: 'Tomato',
    activeDiagnosis: {
      isMlPrediction: false,
      diseaseName: 'ML Classification Unavailable',
    },
    weather: { rainProbability: 82, precipitationMm: 14.5 },
    irrigation: { overallDecision: 'Delay Irrigation' },
  };

  const prompt = formatContextForPrompt(context);
  assert(prompt.includes('ML Classification Unavailable'), 'Prompt must indicate ML unavailable');
  assert(prompt.includes('Do NOT speculate or name any disease name'), 'Must forbid disease speculation');

  const validation = validateGrounding('Your tomato plants have Early Blight and you must spray fungicide.', context);
  assert.strictEqual(validation.isValid, false, 'Validator must catch and reject hallucinated disease names');
});

// Test 5: Conflicting LLM generation -> Dual-layer interceptor triggers safe deterministic explanation
await runTest('Test 5: Conflicting LLM output is intercepted and replaced with safe grounded response', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Simulate a rogue LLM response that hallucinates irrigation and disease
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Yes, you should irrigate your fields today with 14,56,868 Litres because of Early Blight.' }
              ]
            }
          }
        ]
      })
    });

    const context = {
      farmName: 'Patel Farm',
      crop: 'Tomato',
      activeDiagnosis: { isMlPrediction: false, diseaseName: 'ML Classification Unavailable' },
      weather: { rainProbability: 82, precipitationMm: 14.5, temperature: 28 },
      irrigation: {
        overallDecision: 'Delay Irrigation',
        totalEstimatedAvoidedIrrigationLitres: 1850,
      },
      soilMoisture: 31,
    };

    const response = await geminiService.generateAssistantResponse({
      message: 'Should I irrigate today?',
      language: 'en',
      context,
    });

    // Interceptor must have corrected the response
    assert(!response.reply.includes('Yes, you should irrigate'), 'Interceptor must remove affirmative irrigation');
    assert(response.reply.includes('No, you should not irrigate'), 'Interceptor must enforce Delay Irrigation');
    assert(response.reply.includes('1,850') || response.reply.includes('1850'), 'Must enforce correct avoided litres');
    assert(!response.reply.includes('14,56,868'), 'Must eliminate fabricated volume');
    assert(!response.reply.includes('Early Blight'), 'Must eliminate hallucinated disease');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Test 6: Multilingual Hindi Grounding & Auto-Detection Validation
await runTest('Test 6: Hindi input auto-detects and returns grounded Hindi response avoiding irrigation', async () => {
  const context = {
    farmName: 'Patel Farm',
    weather: { rainProbability: 80, precipitationMm: 3.2, temperature: 30 },
    irrigation: {
      overallDecision: 'Delay Irrigation',
      totalEstimatedAvoidedIrrigationLitres: 1850,
      averageSoilMoisture: 31,
    },
    soilMoisture: 31,
  };

  // Even if language parameter is omitted or 'en', Hindi script is detected
  const response = await geminiService.generateAssistantResponse({
    message: 'क्या आज मेरे खेत में सिंचाई करनी चाहिए?',
    language: 'en',
    context,
  });

  assert.strictEqual(response.language, 'hi', 'Should auto-detect language as Hindi');
  assert(/[\u0900-\u097F]/.test(response.reply), 'Must contain Devanagari/Hindi script');
  assert(response.reply.includes('नहीं') || response.reply.includes('सिंचाई टालने') || response.reply.includes('रोक'), 'Must advise against irrigation in Hindi');
  assert(response.reply.includes('80%') || response.reply.includes('80'), 'Must preserve 80% rain probability');
  assert(response.reply.includes('3.2'), 'Must preserve 3.2 mm rainfall');
  assert(response.reply.includes('31%') || response.reply.includes('31'), 'Must preserve 31% soil moisture');
});

// Test 7: Multilingual Gujarati Grounding & Auto-Detection Validation
await runTest('Test 7: Gujarati input "આજે મારા ખેતરમાં સિંચાઈ કરવી જોઈએ?" returns complete Gujarati response with live context', async () => {
  const liveContext = {
    farmName: 'Patel Farm',
    weather: { rainProbability: 80, rainfallExpectedMm: 3.2, temperature: 30 },
    irrigation: {
      overallDecision: 'Delay Irrigation',
      totalEstimatedAvoidedIrrigationLitres: 1850,
      averageSoilMoisture: 31,
    },
    soilMoisture: 31,
  };

  // Even when request language parameter is 'en', Gujarati script is detected
  const response = await geminiService.generateAssistantResponse({
    message: 'આજે મારા ખેતરમાં સિંચાઈ કરવી જોઈએ?',
    language: 'en',
    context: liveContext,
  });

  assert.strictEqual(response.language, 'gu', 'Should auto-detect language as Gujarati');
  assert(/[\u0A80-\u0AFF]/.test(response.reply), 'Must contain Gujarati script');
  assert(response.reply.includes('ના') || response.reply.includes('મોકૂફ') || response.reply.includes('પિયત આપવાની જરૂર નથી'), 'Must advise against irrigation in Gujarati');
  assert(response.reply.includes('80%') || response.reply.includes('80'), 'Must preserve 80% rain probability in Gujarati response');
  assert(response.reply.includes('3.2'), 'Must preserve 3.2 mm rainfall in Gujarati response');
  assert(response.reply.includes('31%') || response.reply.includes('31'), 'Must preserve 31% soil moisture in Gujarati response');
});

// Test 8: English Grounding with Live Context
await runTest('Test 8: English input returns complete English response with live context', async () => {
  const liveContext = {
    farmName: 'Patel Farm',
    weather: { rainProbability: 80, precipitationMm: 3.2, temperature: 30 },
    irrigation: {
      overallDecision: 'Delay Irrigation',
      totalEstimatedAvoidedIrrigationLitres: 1850,
      averageSoilMoisture: 31,
    },
    soilMoisture: 31,
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'Should I irrigate my fields today?',
    language: 'en',
    context: liveContext,
  });

  assert.strictEqual(response.language, 'en', 'Should return English language');
  assert(response.reply.includes('No') || response.reply.includes('not irrigate') || response.reply.includes('Delay Irrigation'), 'Must advise against irrigation in English');
  assert(response.reply.includes('80%') || response.reply.includes('80'), 'Must preserve 80% rain probability');
  assert(response.reply.includes('3.2'), 'Must preserve 3.2 mm rainfall');
  assert(response.reply.includes('31%') || response.reply.includes('31'), 'Must preserve 31% soil moisture');
});

// Test 9: Language Isolation — Repeating English after Hindi must still return English
await runTest('Test 9: Repeating English after Hindi returns 100% English response (no language leak)', async () => {
  const context = {
    weather: { rainProbability: 80, precipitationMm: 3.2, temperature: 30 },
    irrigation: { overallDecision: 'Delay Irrigation', totalEstimatedAvoidedIrrigationLitres: 1850, averageSoilMoisture: 31 },
  };

  // User previously used Hindi, but now asks in English with language header still pointing to 'hi'
  const response = await geminiService.generateAssistantResponse({
    message: 'Should I irrigate today?',
    language: 'hi', // previous language in session
    context,
  });

  assert.strictEqual(response.language, 'en', 'Must resolve to English based on dominant script');
  assert(response.reply.toLowerCase().includes('no') || response.reply.toLowerCase().includes('delay'), 'Must be English response');
  assert(!/[\u0900-\u097F]/.test(response.reply), 'Must NOT contain Hindi/Devanagari text in English response');
});

// Test 10: Language Isolation — Repeating Gujarati after English must return Gujarati
await runTest('Test 10: Repeating Gujarati after English returns 100% Gujarati response (no language leak)', async () => {
  const context = {
    weather: { rainProbability: 80, precipitationMm: 3.2, temperature: 30 },
    irrigation: { overallDecision: 'Delay Irrigation', totalEstimatedAvoidedIrrigationLitres: 1850, averageSoilMoisture: 31 },
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'આજે મારા ખેતરમાં સિંચાઈ કરવી જોઈએ?',
    language: 'en', // previous language in session
    context,
  });

  assert.strictEqual(response.language, 'gu', 'Must resolve to Gujarati based on dominant script');
  assert(/[\u0A80-\u0AFF]/.test(response.reply), 'Must contain Gujarati script');
});

// Test 11: Formatting Cleanliness & Separate Action Suggestions
await runTest('Test 11: Response reply contains clean format without raw heading hashes and suggestions are separated', async () => {
  const context = {
    weather: { rainProbability: 80, precipitationMm: 3.2, temperature: 30 },
    irrigation: { overallDecision: 'Delay Irrigation', totalEstimatedAvoidedIrrigationLitres: 1850, averageSoilMoisture: 31 },
  };

  const response = await geminiService.generateAssistantResponse({
    message: 'Should I irrigate today?',
    language: 'en',
    context,
  });

  // Check no raw ### or ## heading hashes
  assert(!/^#{1,6}\s+/m.test(response.reply), 'Must not contain raw markdown heading hashes (###)');
  // Check action suggestions are array in response.actionSuggestions
  assert(Array.isArray(response.actionSuggestions) && response.actionSuggestions.length > 0, 'actionSuggestions must be array');
  // Check no "Related suggestions" section inside reply text
  assert(!response.reply.includes('Related suggestions:'), 'Suggestions must not duplicate in reply text');
});

// Test 12: Controller input validation (400 on empty message)
await runTest('Test 12: Controller returns 400 Bad Request on empty message', async () => {
  let caughtError = null;
  await handleAssistantQuery({ body: { message: '' } }, createMockRes(), (err) => {
    caughtError = err;
  });
  assert(caughtError !== null && caughtError.statusCode === 400);
});

// Test 13: Controller input validation (400 on invalid language)
await runTest('Test 13: Controller returns 400 Bad Request on invalid language', async () => {
  let caughtError = null;
  await handleAssistantQuery({ body: { message: 'Hi', language: 'fr' } }, createMockRes(), (err) => {
    caughtError = err;
  });
  assert(caughtError !== null && caughtError.statusCode === 400);
});

console.log('\n------------------------------------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log('------------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
