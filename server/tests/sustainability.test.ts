import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import authService from '../src/services/authService.js';
import farmService from '../src/services/farmService.js';
import fieldService from '../src/services/fieldService.js';
import zoneService from '../src/services/zoneService.js';
import sustainabilityService from '../src/services/sustainabilityService.js';
import { authenticate } from '../src/middleware/auth.js';
import { getSustainabilitySummary } from '../src/controllers/sustainabilityController.js';

let passed = 0;
let failed = 0;

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

const runTest = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${getErrorMessage(err)}`);
    if (err instanceof Error && err.stack) console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n')}`);
    failed++;
  }
};

console.log('\n==================================================================');
console.log('  AGRISMART AI — SUSTAINABILITY DATA & CALCULATIONS TEST SUITE    ');
console.log('==================================================================\n');

// Mock Express response helper
const createMockRes = (): any => ({
  statusCode: 200,
  body: null,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(payload: any) {
    this.body = payload;
    return this;
  },
});

// Setup DB connection
await connectDB();

// Create two test users: User A and User B
const userAReg = await authService.registerUser({
  name: 'Sustainability User A',
  email: `sust_a_${Date.now()}@agrismart.ai`,
  password: 'PasswordA@2026',
});
const userA = userAReg.user;

const userBReg = await authService.registerUser({
  name: 'Sustainability User B',
  email: `sust_b_${Date.now()}@agrismart.ai`,
  password: 'PasswordB@2026',
});
const userB = userBReg.user;

// User A creates a farm, 2 fields, and 2 zones
const farmA = await farmService.createFarm(userA.id, {
  name: 'Green Agro Farm',
  totalAreaAcres: 20.0,
  location: { latitude: 22.5645, longitude: 72.9289, address: 'Anand, Gujarat' },
});

const field1 = await fieldService.createField(userA.id, farmA.id, {
  name: 'Field 1 (Tomato)',
  areaAcres: 10.0,
  crop: 'Tomato',
  soilType: 'sandy loam',
  irrigationMethod: 'Drip',
  soilMoisture: 30,
});

await fieldService.createField(userA.id, farmA.id, {
  name: 'Field 2 (Wheat)',
  areaAcres: 10.0,
  crop: 'Wheat',
  soilType: 'loam',
  irrigationMethod: 'Sprinkler',
  soilMoisture: 35,
});

await zoneService.createZone(userA.id, farmA.id, field1.id, {
  name: 'Zone 1A',
  areaAcres: 5.0,
  irrigationMethod: 'Drip',
  soilMoisture: 28,
});

await zoneService.createZone(userA.id, farmA.id, field1.id, {
  name: 'Zone 1B',
  areaAcres: 5.0,
  irrigationMethod: 'Drip',
  soilMoisture: 32,
});

// ==========================================
// 1. AUTHENTICATION
// ==========================================

await runTest('Test 1: Request without JWT returns 401 Unauthorized', async () => {
  const req: any = { headers: {} };
  const res = createMockRes();
  let caughtError: any = null;
  await authenticate(req, res, (err) => { caughtError = err; });

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 401);
});

await runTest('Test 2: Request with invalid JWT returns 401 Unauthorized', async () => {
  const req: any = { headers: { authorization: 'Bearer invalid.token.payload' } };
  const res = createMockRes();
  let caughtError: any = null;
  await authenticate(req, res, (err) => { caughtError = err; });

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 401);
});

// ==========================================
// 2. AUTHORIZATION & ANTI-IDOR
// ==========================================

await runTest('Test 3: User A can retrieve sustainability summary for own farm (200)', async () => {
  const req: any = {
    user: userA,
    query: { farmId: farmA.id },
  };
  const res = createMockRes();
  await getSustainabilitySummary(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert(res.body.data.metrics);
  assert.strictEqual(res.body.data.scope.farmsCount, 1);
  assert(res.body.data.scope.farmIds.includes(farmA.id));
});

await runTest('Test 4: User B cannot access User A\'s farm sustainability (404 Not Found)', async () => {
  let caughtError: any = null;
  try {
    await sustainabilityService.getSustainabilitySummary(userB.id, { farmId: farmA.id });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 404);
  assert(caughtError.message.includes('Farm not found'));
});

await runTest('Test 5: Invalid farm ID format rejects with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: 'invalid-id-format' });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 400);
});

await runTest('Test 6: Nonexistent farm ID returns 404 Not Found', async () => {
  let caughtError: any = null;
  const fakeId = '654321654321654321654321';
  try {
    await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: fakeId });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 404);
});

await runTest('Test 7: Providing fieldId without farmId rejects with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await sustainabilityService.getSustainabilitySummary(userA.id, { fieldId: field1.id });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 400);
});

// ==========================================
// 3. CALCULATION ACCURACY & ZERO-FABRICATION
// ==========================================

await runTest('Test 8: Summary correctly counts own farms, fields, and zones', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id });

  assert.strictEqual(summary.scope.farmsCount, 1);
  assert.strictEqual(summary.scope.fieldsCount, 2);
  assert.strictEqual(summary.scope.zonesCount, 2);
  assert(summary.scope.totalAreaAcres > 0);
  assert(summary.scope.cropsRepresented!.includes('Tomato'));
  assert(summary.scope.cropsRepresented!.includes('Wheat'));
});

await runTest('Test 9: Irrigation-derived values use actual calculation engine outputs and document formulas', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id });

  const { recommendedIrrigationLitres, estimatedAvoidedIrrigationLitres } = summary.metrics;
  assert(typeof recommendedIrrigationLitres.value === 'number');
  assert.strictEqual(recommendedIrrigationLitres.unit, 'litres');
  assert.strictEqual(recommendedIrrigationLitres.source, 'irrigation_engine');
  assert.strictEqual(recommendedIrrigationLitres.method, 'fao56_hargreaves_samani');
  assert(recommendedIrrigationLitres.formula);

  assert(typeof estimatedAvoidedIrrigationLitres.value === 'number');
  assert.strictEqual(estimatedAvoidedIrrigationLitres.unit, 'litres');
  assert.strictEqual(estimatedAvoidedIrrigationLitres.source, 'irrigation_engine');
  assert.strictEqual(estimatedAvoidedIrrigationLitres.method, 'no_precipitation_counterfactual');
});

await runTest('Test 10: Area-weighted water efficiency calculation is mathematically derived from FAO standards', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id, fieldId: field1.id });

  // Field 1 has 2 zones of 5 acres each, both configured as 'Drip' (efficiency 90%)
  const { weightedIrrigationEfficiencyPercent } = summary.metrics;
  assert.strictEqual(weightedIrrigationEfficiencyPercent.value, 90);
  assert.strictEqual(weightedIrrigationEfficiencyPercent.source, 'fao_irrigation_method_standards');
});

await runTest('Test 11: Missing IoT sensor data is explicitly represented as unavailable (no fake sensor data)', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id });

  assert.strictEqual(summary.dataAvailability.iotSensors, false);
  assert.strictEqual(summary.dataAvailability.historicalSensorLogs, false);
  assert(summary.limitations.some((l) => l.toLowerCase().includes('iot')));
});

await runTest('Test 12: Zero fabricated metrics (no fake CO2 kg, no fake chemical reduction kg)', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id });

  // Verify that fake metrics are NOT present in output
  assert.strictEqual((summary as any).metrics.carbonOffsetKg, undefined);
  assert.strictEqual((summary as any).metrics.chemicalReductionKg, undefined);
  assert.strictEqual((summary as any).metrics.overallScore, undefined);
  assert(summary.limitations.some((l) => l.toLowerCase().includes('chemical')));
});

// ==========================================
// 4. BOUNDARY & DATE VALIDATION
// ==========================================

await runTest('Test 13: Invalid date string in query param is rejected with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await sustainabilityService.getSustainabilitySummary(userA.id, {
      farmId: farmA.id,
      startDate: 'invalid-date-not-a-day',
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 400);
});

await runTest('Test 14: Invalid date range (startDate > endDate) is rejected with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await sustainabilityService.getSustainabilitySummary(userA.id, {
      farmId: farmA.id,
      startDate: '2026-09-30',
      endDate: '2026-09-01', // End date before start date
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 400);
  assert(caughtError.message.includes('startDate cannot be after endDate'));
});

await runTest('Test 15: User with zero farms gets a valid data-unavailable response without fabricating numbers', async () => {
  // User B has 0 farms
  const summary = await sustainabilityService.getSustainabilitySummary(userB.id);

  assert.strictEqual(summary.scope.farmsCount, 0);
  assert.strictEqual(summary.scope.fieldsCount, 0);
  assert.strictEqual(summary.scope.totalAreaAcres, 0);
  assert.strictEqual(summary.dataAvailability.farmPersistence, false);
  assert.strictEqual(summary.metrics.recommendedIrrigationLitres.value, 0);
  assert.strictEqual(summary.metrics.weightedIrrigationEfficiencyPercent.value, null);
  assert(summary.insights.some((i) => i.includes('No farm fields')));
});

await runTest('Test 16: Insights use model-estimate and counterfactual wording avoiding misleading "pumping today" claims', async () => {
  const summary = await sustainabilityService.getSustainabilitySummary(userA.id, { farmId: farmA.id });

  const allInsightsText = summary.insights.join(' ');
  // Must NOT claim literal physical pumping occurred today
  assert(!allInsightsText.includes('pumping today'), 'Must not claim literal pumping today');
  // Must include model-estimated or counterfactual phrasing
  assert(allInsightsText.toLowerCase().includes('model-estimated') || allInsightsText.toLowerCase().includes('calculated'));
  // Limitations must clarify counterfactual nature
  assert(summary.limitations.some((l) => l.toLowerCase().includes('counterfactual')));
});

// Cleanup test data
try {
  await farmService.deleteFarm(userA.id, farmA.id);
  await User.deleteMany({ email: { $regex: /sust_[ab]_\d+@agrismart\.ai/i } });
} catch {
  // ignore cleanup error
}

await disconnectDB();

console.log('\n------------------------------------------------------------------');
console.log(`SUMMARY: ${passed} passed, ${failed} failed.`);
console.log('------------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
