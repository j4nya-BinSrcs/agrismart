import assert from 'node:assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Field from '../src/models/Field.js';
import Zone from '../src/models/Zone.js';
import authService from '../src/services/authService.js';
import farmService from '../src/services/farmService.js';
import fieldService from '../src/services/fieldService.js';
import zoneService from '../src/services/zoneService.js';
import { authenticate } from '../src/middleware/auth.js';
import {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  getFarmOverview,
} from '../src/controllers/farmController.js';
import {
  createField,
  getFields,
  getFieldById,
  updateField,
} from '../src/controllers/fieldController.js';
import {
  createZone,
  getZones,
  getZoneById,
  updateZone,
} from '../src/controllers/zoneController.js';

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
console.log('  AGRISMART AI — FARM / FIELD / ZONE PERSISTENCE TEST SUITE      ');
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

// Create two test users: User A and User B for multi-user isolation / IDOR testing
const userAReg = await authService.registerUser({
  name: 'Grower User A',
  email: `grower_a_${Date.now()}@agrismart.ai`,
  password: 'PasswordA@2026',
});
const userA = userAReg.user;

const userBReg = await authService.registerUser({
  name: 'Grower User B',
  email: `grower_b_${Date.now()}@agrismart.ai`,
  password: 'PasswordB@2026',
});
const userB = userBReg.user;

let farmA: any = null;
let fieldA: any = null;
let zoneA: any = null;

// ==========================================
// 1. AUTHENTICATION PROTECTION
// ==========================================

await runTest('Test 1: GET /farms without JWT returns 401 Unauthorized', async () => {
  const req: any = { headers: {} };
  const res = createMockRes();
  let caughtError: any = null;

  await authenticate(req, res, (err) => { caughtError = err; });

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 401);
});

await runTest('Test 2: POST /farms without JWT returns 401 Unauthorized', async () => {
  const req: any = { headers: {}, body: { name: 'Test Farm' } };
  const res = createMockRes();
  let caughtError: any = null;

  await authenticate(req, res, (err) => { caughtError = err; });

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 401);
});

// ==========================================
// 2. FARM CRUD & VALIDATION
// ==========================================

await runTest('Test 3: User A creates Farm successfully with valid payload (201)', async () => {
  const req: any = {
    user: userA,
    body: {
      name: 'Patel Organic Farm',
      totalAreaAcres: 25.5,
      location: {
        latitude: 22.5645,
        longitude: 72.9289,
        address: 'Anand, Gujarat, India',
      },
      description: 'Primary organic tomato and cotton farm',
    },
  };
  const res = createMockRes();
  await createFarm(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.success, true);
  assert(res.body.data.farm);
  assert.strictEqual(res.body.data.farm.name, 'Patel Organic Farm');
  assert.strictEqual(res.body.data.farm.totalAreaAcres, 25.5);
  assert.strictEqual(res.body.data.farm.owner, userA.id);

  farmA = res.body.data.farm;
});

await runTest('Test 4: User A gets own farms list (200)', async () => {
  const req: any = { user: userA };
  const res = createMockRes();
  await getFarms(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert(Array.isArray(res.body.data.farms));
  assert(res.body.data.farms.some((f: any) => f.id === farmA.id));
});

await runTest('Test 5: User A gets farm by ID (200)', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id } };
  const res = createMockRes();
  await getFarmById(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.farm.id, farmA.id);
  assert.strictEqual(res.body.data.farm.name, 'Patel Organic Farm');
});

await runTest('Test 6: User A updates farm details (200)', async () => {
  const req: any = {
    user: userA,
    params: { farmId: farmA.id },
    body: {
      name: 'Patel Smart Agro Farm',
      totalAreaAcres: 30.0,
      description: 'Updated description for smart farming',
    },
  };
  const res = createMockRes();
  await updateFarm(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.farm.name, 'Patel Smart Agro Farm');
  assert.strictEqual(res.body.data.farm.totalAreaAcres, 30.0);
  farmA = res.body.data.farm;
});

await runTest('Test 7: Farm creation with empty name or negative area is rejected with 400 Bad Request', async () => {
  let err1: any = null;
  try {
    await farmService.createFarm(userA.id, { name: '  ', totalAreaAcres: 10 });
  } catch (err) {
    err1 = err;
  }
  assert(err1 !== null && err1.statusCode === 400);

  let err2: any = null;
  try {
    await farmService.createFarm(userA.id, { name: 'Valid Name', totalAreaAcres: -5 });
  } catch (err) {
    err2 = err;
  }
  assert(err2 !== null && err2.statusCode === 400);
});

await runTest('Test 8: Farm creation with invalid coordinates is rejected with 400 Bad Request', async () => {
  let errLat: any = null;
  try {
    await farmService.createFarm(userA.id, {
      name: 'Invalid Lat Farm',
      totalAreaAcres: 10,
      location: { latitude: 95.5, longitude: 72.0 },
    });
  } catch (err) {
    errLat = err;
  }
  assert(errLat !== null && errLat.statusCode === 400);

  let errLng: any = null;
  try {
    await farmService.createFarm(userA.id, {
      name: 'Invalid Lng Farm',
      totalAreaAcres: 10,
      location: { latitude: 22.0, longitude: 195.0 },
    });
  } catch (err) {
    errLng = err;
  }
  assert(errLng !== null && errLng.statusCode === 400);
});

// ==========================================
// 3. FIELD CRUD & VALIDATION
// ==========================================

await runTest('Test 9: User A creates Field under own farm (201)', async () => {
  const req: any = {
    user: userA,
    params: { farmId: farmA.id },
    body: {
      name: 'Field A (North Plot)',
      areaAcres: 12.0,
      crop: 'Tomato',
      variety: 'Abhinav Hybrid',
      growthStage: 'Fruiting Stage',
      soilType: 'Sandy Loam',
      irrigationMethod: 'Drip',
      soilMoisture: 32.5,
    },
  };
  const res = createMockRes();
  await createField(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.success, true);
  assert(res.body.data.field);
  assert.strictEqual(res.body.data.field.name, 'Field A (North Plot)');
  assert.strictEqual(res.body.data.field.farm, farmA.id);
  assert.strictEqual(res.body.data.field.owner, userA.id);
  assert.strictEqual(res.body.data.field.soilMoisture, 32.5);

  fieldA = res.body.data.field;
});

await runTest('Test 10: User A lists fields under own farm (200)', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id } };
  const res = createMockRes();
  await getFields(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert(Array.isArray(res.body.data.fields));
  assert(res.body.data.fields.some((f: any) => f.id === fieldA.id));
});

await runTest('Test 11: User A gets field by ID (200)', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id, fieldId: fieldA.id } };
  const res = createMockRes();
  await getFieldById(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.field.id, fieldA.id);
  assert.strictEqual(res.body.data.field.crop, 'Tomato');
});

await runTest('Test 12: User A updates field (200)', async () => {
  const req: any = {
    user: userA,
    params: { farmId: farmA.id, fieldId: fieldA.id },
    body: {
      crop: 'Tomato (Organic)',
      soilMoisture: 35.0,
    },
  };
  const res = createMockRes();
  await updateField(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.field.crop, 'Tomato (Organic)');
  assert.strictEqual(res.body.data.field.soilMoisture, 35.0);
  fieldA = res.body.data.field;
});

await runTest('Test 13: Field creation with invalid soil moisture (<0 or >100) is rejected with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await fieldService.createField(userA.id, farmA.id, {
      name: 'Bad Moisture Field',
      areaAcres: 5.0,
      soilMoisture: 125, // Invalid > 100
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null && caughtError.statusCode === 400);
});

await runTest('Test 14: Field creation under non-existent farm is rejected with 404 Not Found', async () => {
  let caughtError: any = null;
  const fakeFarmId = '654321654321654321654321';
  try {
    await fieldService.createField(userA.id, fakeFarmId, {
      name: 'Orphan Field',
      areaAcres: 4.0,
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null && caughtError.statusCode === 404);
});

// ==========================================
// 4. ZONE CRUD & VALIDATION
// ==========================================

await runTest('Test 15: User A creates Zone under own field and farm (201)', async () => {
  const req: any = {
    user: userA,
    params: { farmId: farmA.id, fieldId: fieldA.id },
    body: {
      name: 'Zone 1 - High Density Beds',
      areaAcres: 6.0,
      irrigationMethod: 'Micro-Drip',
      soilMoisture: 31.0,
      description: 'Tomato seedbed cluster 1',
    },
  };
  const res = createMockRes();
  await createZone(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 201);
  assert.strictEqual(res.body.success, true);
  assert(res.body.data.zone);
  assert.strictEqual(res.body.data.zone.name, 'Zone 1 - High Density Beds');
  assert.strictEqual(res.body.data.zone.field, fieldA.id);
  assert.strictEqual(res.body.data.zone.farm, farmA.id);
  assert.strictEqual(res.body.data.zone.owner, userA.id);

  zoneA = res.body.data.zone;
});

await runTest('Test 16: User A lists zones under field (200)', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id, fieldId: fieldA.id } };
  const res = createMockRes();
  await getZones(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert(Array.isArray(res.body.data.zones));
  assert(res.body.data.zones.some((z: any) => z.id === zoneA.id));
});

await runTest('Test 17: User A gets zone by ID (200)', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id, fieldId: fieldA.id, zoneId: zoneA.id } };
  const res = createMockRes();
  await getZoneById(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.zone.id, zoneA.id);
  assert.strictEqual(res.body.data.zone.name, 'Zone 1 - High Density Beds');
});

await runTest('Test 18: User A updates zone (200)', async () => {
  const req: any = {
    user: userA,
    params: { farmId: farmA.id, fieldId: fieldA.id, zoneId: zoneA.id },
    body: {
      soilMoisture: 38.0,
      description: 'Updated zone sensor reading',
    },
  };
  const res = createMockRes();
  await updateZone(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.data.zone.soilMoisture, 38.0);
});

await runTest('Test 19: Zone creation with invalid soil moisture is rejected with 400 Bad Request', async () => {
  let caughtError: any = null;
  try {
    await zoneService.createZone(userA.id, farmA.id, fieldA.id, {
      name: 'Bad Moisture Zone',
      areaAcres: 2.0,
      soilMoisture: -10, // Invalid < 0
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null && caughtError.statusCode === 400);
});

// ==========================================
// 5. FARM HIERARCHY / OVERVIEW ENDPOINT
// ==========================================

await runTest('Test 20: GET /farms/:farmId/overview returns complete farm hierarchy with grouped fields and zones', async () => {
  const req: any = { user: userA, params: { farmId: farmA.id } };
  const res = createMockRes();
  await getFarmOverview(req, res, (err) => { if (err) throw err; });

  assert.strictEqual(res.statusCode, 200);
  assert(res.body.data.farm);
  assert(Array.isArray(res.body.data.farm.fields));
  assert(res.body.data.farm.fields.length >= 1);
  assert.strictEqual(res.body.data.farm.fields[0].id, fieldA.id);
  assert(Array.isArray(res.body.data.farm.fields[0].zones));
  assert(res.body.data.farm.fields[0].zones.some((z: any) => z.id === zoneA.id));
});

// ==========================================
// 6. SECURITY & ANTI-IDOR / MULTI-USER ISOLATION
// ==========================================

await runTest('Test 21: User B cannot access User A\'s farm (returns 404 Not Found)', async () => {
  let caughtError: any = null;
  try {
    await farmService.getFarmById(userB.id, farmA.id);
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 404);
});

await runTest('Test 22: User B cannot access User A\'s fields (returns 404 Not Found)', async () => {
  let caughtError: any = null;
  try {
    await fieldService.getFieldsByFarm(userB.id, farmA.id);
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 404);
});

await runTest('Test 23: User B cannot access User A\'s zones (returns 404 Not Found)', async () => {
  let caughtError: any = null;
  try {
    await zoneService.getZonesByField(userB.id, farmA.id, fieldA.id);
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert.strictEqual(caughtError.statusCode, 404);
});

await runTest('Test 24: User B cannot update or delete User A\'s farm (returns 404 Not Found)', async () => {
  let updateErr: any = null;
  try {
    await farmService.updateFarm(userB.id, farmA.id, { name: 'Hacked Farm' });
  } catch (err) {
    updateErr = err;
  }
  assert(updateErr !== null && updateErr.statusCode === 404);

  let deleteErr: any = null;
  try {
    await farmService.deleteFarm(userB.id, farmA.id);
  } catch (err) {
    deleteErr = err;
  }
  assert(deleteErr !== null && deleteErr.statusCode === 404);
});

await runTest('Test 25: User B cannot manipulate URL path with User A\'s resource IDs (returns 404 Not Found)', async () => {
  // User B creates their own farm
  const farmB = await farmService.createFarm(userB.id, {
    name: 'User B Farm',
    totalAreaAcres: 10,
  });

  // User B tries to access User A's field using farmB.id in URL
  let pathTamperErr: any = null;
  try {
    await fieldService.getFieldById(userB.id, farmB.id, fieldA.id);
  } catch (err) {
    pathTamperErr = err;
  }
  assert(pathTamperErr !== null && pathTamperErr.statusCode === 404);

  // User B tries to access User A's zone using farmB.id and fieldA.id in URL
  let zoneTamperErr: any = null;
  try {
    await zoneService.getZoneById(userB.id, farmB.id, fieldA.id, zoneA.id);
  } catch (err) {
    zoneTamperErr = err;
  }
  assert(zoneTamperErr !== null && zoneTamperErr.statusCode === 404);

  // Cleanup Farm B
  await farmService.deleteFarm(userB.id, farmB.id);
});

// ==========================================
// 7. CASCADE DELETION VERIFICATION
// ==========================================

await runTest('Test 26: Deleting a Field cascades deletion to all of its child Zones', async () => {
  // Create a separate field with 2 zones for cascade test
  const tempField = await fieldService.createField(userA.id, farmA.id, {
    name: 'Temporary Field for Cascade Test',
    areaAcres: 8.0,
    crop: 'Tomato',
  });

  await zoneService.createZone(userA.id, farmA.id, tempField.id, {
    name: 'Temp Zone 1',
    areaAcres: 4.0,
  });

  await zoneService.createZone(userA.id, farmA.id, tempField.id, {
    name: 'Temp Zone 2',
    areaAcres: 4.0,
  });

  // Verify zones exist in MongoDB
  const zonesBefore = await Zone.find({ field: tempField.id });
  assert.strictEqual(zonesBefore.length, 2);

  // Delete field
  const deleteResult = await fieldService.deleteField(userA.id, farmA.id, tempField.id);
  assert.strictEqual(deleteResult.cascadedZonesCount, 2);

  // Verify field and child zones are deleted from MongoDB
  const fieldAfter = await Field.findById(tempField.id);
  const zonesAfter = await Zone.find({ field: tempField.id });
  assert.strictEqual(fieldAfter, null);
  assert.strictEqual(zonesAfter.length, 0);
});

await runTest('Test 27: Deleting a Farm cascades deletion to all child Fields and Zones', async () => {
  // Create a separate farm with fields and zones
  const tempFarm = await farmService.createFarm(userA.id, {
    name: 'Temporary Farm for Farm Cascade Test',
    totalAreaAcres: 50.0,
  });

  const tempField = await fieldService.createField(userA.id, tempFarm.id, {
    name: 'Temp Field in Temp Farm',
    areaAcres: 20.0,
    crop: 'Tomato',
  });

  await zoneService.createZone(userA.id, tempFarm.id, tempField.id, {
    name: 'Temp Zone in Temp Farm',
    areaAcres: 10.0,
  });

  // Delete farm
  const deleteResult = await farmService.deleteFarm(userA.id, tempFarm.id);
  assert.strictEqual(deleteResult.cascadedFieldsCount, 1);
  assert.strictEqual(deleteResult.cascadedZonesCount, 1);

  // Verify MongoDB is clean
  const farmAfter = await Farm.findById(tempFarm.id);
  const fieldsAfter = await Field.find({ farm: tempFarm.id });
  const zonesAfter = await Zone.find({ farm: tempFarm.id });
  assert.strictEqual(farmAfter, null);
  assert.strictEqual(fieldsAfter.length, 0);
  assert.strictEqual(zonesAfter.length, 0);
});

// Clean up remaining test data
try {
  await farmService.deleteFarm(userA.id, farmA.id);
  await User.deleteMany({ email: { $regex: /grower_[ab]_\d+@agrismart\.ai/i } });
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
