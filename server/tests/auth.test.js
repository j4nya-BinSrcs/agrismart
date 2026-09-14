import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';
import config from '../src/config/env.js';
import User from '../src/models/User.js';
import authService, { generateToken } from '../src/services/authService.js';
import { authenticate } from '../src/middleware/auth.js';
import { register, login, getMe } from '../src/controllers/authController.js';

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
console.log('  AGRISMART AI — BACKEND AUTHENTICATION TEST SUITE               ');
console.log('==================================================================\n');

// Mock Express response helper
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

// Setup DB connection
await connectDB();

// Clean up any existing test accounts before testing
const TEST_EMAIL = `test_farmer_${Date.now()}@agrismart.ai`;
const TEST_PASSWORD = 'TestPassword@2026';
const TEST_NAME = 'Ramesh Patel Test';

// Test 1: Successful Registration
let registeredUser = null;
let authToken = null;

await runTest('Test 1: Successful registration creates user with hashed password and returns JWT', async () => {
  const result = await authService.registerUser({
    name: TEST_NAME,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: 'farmer',
  });

  assert(result.user, 'Result must contain user object');
  assert(result.token, 'Result must contain JWT token');
  assert.strictEqual(result.user.name, TEST_NAME);
  assert.strictEqual(result.user.email, TEST_EMAIL.toLowerCase());
  assert.strictEqual(result.user.role, 'farmer');
  assert.strictEqual(result.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
  assert.strictEqual(result.user.password, undefined, 'password must NEVER be returned');

  // Verify decoded token
  const decoded = jwt.verify(result.token, config.jwt.secret);
  assert.strictEqual(decoded.userId, result.user.id);
  assert.strictEqual(decoded.role, 'farmer');

  registeredUser = result.user;
  authToken = result.token;
});

// Test 2: Rejection of Duplicate Email Registration
await runTest('Test 2: Duplicate email registration is strictly rejected with 400 Bad Request', async () => {
  let caughtError = null;
  try {
    await authService.registerUser({
      name: 'Duplicate Grower',
      email: TEST_EMAIL.toUpperCase(), // Test case-insensitivity
      password: 'AnotherPassword123',
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Should have thrown error on duplicate email');
  assert.strictEqual(caughtError.statusCode, 400);
  assert(caughtError.message.toLowerCase().includes('already exists'));
});

// Test 3: Weak Password Rejection (<6 characters)
await runTest('Test 3: Weak password (<6 characters) is rejected with 400 Bad Request', async () => {
  let caughtError = null;
  try {
    await authService.registerUser({
      name: 'Weak Pass User',
      email: `weak_${Date.now()}@example.com`,
      password: '12345',
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Should throw on weak password');
  assert.strictEqual(caughtError.statusCode, 400);
  assert(caughtError.message.includes('at least 6 characters'));
});

// Test 4: Missing Name or Invalid Email Rejection
await runTest('Test 4: Invalid email format and empty name are rejected with 400 Bad Request', async () => {
  let nameError = null;
  try {
    await authService.registerUser({
      name: '   ',
      email: `valid_${Date.now()}@example.com`,
      password: 'validPassword123',
    });
  } catch (err) {
    nameError = err;
  }
  assert(nameError !== null && nameError.statusCode === 400);

  let emailError = null;
  try {
    await authService.registerUser({
      name: 'Valid Name',
      email: 'invalid-email-format-without-at',
      password: 'validPassword123',
    });
  } catch (err) {
    emailError = err;
  }
  assert(emailError !== null && emailError.statusCode === 400);
});

// Test 5: Successful Login
await runTest('Test 5: Successful login with correct credentials returns safe user and valid JWT', async () => {
  const result = await authService.loginUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  assert(result.user, 'Login must return user');
  assert(result.token, 'Login must return JWT token');
  assert.strictEqual(result.user.email, TEST_EMAIL.toLowerCase());
  assert.strictEqual(result.user.passwordHash, undefined, 'passwordHash must NEVER be returned on login');

  const decoded = jwt.verify(result.token, config.jwt.secret);
  assert.strictEqual(decoded.userId, result.user.id);
});

// Test 6: Wrong Password Rejection
await runTest('Test 6: Wrong password is rejected with 401 Unauthorized', async () => {
  let caughtError = null;
  try {
    await authService.loginUser({
      email: TEST_EMAIL,
      password: 'WrongPassword@999',
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Should throw error on wrong password');
  assert.strictEqual(caughtError.statusCode, 401);
  assert(caughtError.message.toLowerCase().includes('invalid email or password'));
});

// Test 7: Unknown Email Login Rejection
await runTest('Test 7: Non-existent email login is rejected with 401 Unauthorized', async () => {
  let caughtError = null;
  try {
    await authService.loginUser({
      email: 'nonexistent_farmer_404@agrismart.ai',
      password: 'AnyPassword123',
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null, 'Should throw error on non-existent email');
  assert.strictEqual(caughtError.statusCode, 401);
});

// Test 8: Valid JWT /me Access via Middleware
await runTest('Test 8: Valid JWT Bearer token allows access and populates req.user', async () => {
  const req = {
    headers: {
      authorization: `Bearer ${authToken}`,
    },
  };
  const res = createMockRes();
  let nextCalled = false;
  let nextError = null;

  await authenticate(req, res, (err) => {
    nextCalled = true;
    nextError = err || null;
  });

  assert(nextCalled, 'next() must be called');
  assert.strictEqual(nextError, null, 'next() should not receive an error');
  assert(req.user, 'req.user must be populated');
  assert.strictEqual(req.user.id, registeredUser.id);
  assert.strictEqual(req.user.email, registeredUser.email);
  assert.strictEqual(req.user.passwordHash, undefined);
});

// Test 9: Missing JWT on Protected Route
await runTest('Test 9: Missing Authorization header on protected route returns 401 Unauthorized', async () => {
  const req = { headers: {} };
  const res = createMockRes();
  let nextError = null;

  await authenticate(req, res, (err) => {
    nextError = err;
  });

  assert(nextError !== null, 'Should return error when auth header is missing');
  assert.strictEqual(nextError.statusCode, 401);
  assert(nextError.message.includes('token is required'));
});

// Test 10: Invalid / Malformed JWT Token Rejection
await runTest('Test 10: Invalid or tampered JWT token returns 401 Unauthorized without leaking secret', async () => {
  const req = {
    headers: {
      authorization: 'Bearer invalid.tampered.token.payload',
    },
  };
  const res = createMockRes();
  let nextError = null;

  await authenticate(req, res, (err) => {
    nextError = err;
  });

  assert(nextError !== null);
  assert.strictEqual(nextError.statusCode, 401);
  assert(nextError.message.includes('Invalid authentication token'));
  assert(!nextError.message.includes(config.jwt.secret), 'Must never leak JWT secret in error');
});

// Test 11: Expired Token Handling
await runTest('Test 11: Expired JWT token returns 401 Unauthorized with clear expiration message', async () => {
  // Generate token that expired 10 seconds ago
  const expiredToken = jwt.sign(
    { userId: registeredUser.id, role: 'farmer' },
    config.jwt.secret,
    { expiresIn: '-10s' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${expiredToken}`,
    },
  };
  const res = createMockRes();
  let nextError = null;

  await authenticate(req, res, (err) => {
    nextError = err;
  });

  assert(nextError !== null);
  assert.strictEqual(nextError.statusCode, 401);
  assert(nextError.message.includes('expired'));
});

// Test 12: PasswordHash is Never Exposed in Controller Endpoints
await runTest('Test 12: Controller endpoints (register, login, me) never leak passwordHash', async () => {
  // Test Controller register
  const regReq = {
    body: {
      name: 'Controller Test Farmer',
      email: `controller_${Date.now()}@agrismart.ai`,
      password: 'SafePassword2026',
    },
  };
  const regRes = createMockRes();
  await register(regReq, regRes, (err) => { if (err) throw err; });

  assert.strictEqual(regRes.statusCode, 201);
  assert.strictEqual(regRes.body.success, true);
  assert(regRes.body.data.user);
  assert(regRes.body.data.token);
  assert.strictEqual(regRes.body.data.user.passwordHash, undefined);

  // Test Controller login
  const loginReq = {
    body: {
      email: regReq.body.email,
      password: regReq.body.password,
    },
  };
  const loginRes = createMockRes();
  await login(loginReq, loginRes, (err) => { if (err) throw err; });

  assert.strictEqual(loginRes.statusCode, 200);
  assert.strictEqual(loginRes.body.success, true);
  assert.strictEqual(loginRes.body.data.user.passwordHash, undefined);

  // Test Controller getMe
  const meReq = { user: regRes.body.data.user };
  const meRes = createMockRes();
  await getMe(meReq, meRes, (err) => { if (err) throw err; });

  assert.strictEqual(meRes.statusCode, 200);
  assert.strictEqual(meRes.body.success, true);
  assert.strictEqual(meRes.body.data.user.passwordHash, undefined);
});

// Cleanup test user
try {
  await User.deleteMany({ email: { $regex: /agrismart\.ai/i } });
} catch {
  // ignore cleanup errors in test
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
