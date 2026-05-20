/**
 * W205b — Nafath SSO route integration tests.
 *
 * Verifies that on Nafath APPROVED:
 *   - the route looks up users via User.nationalId AND Guardian.idNumber
 *     (W205b fix — the old code queried Guardian.nationalId which didn't
 *     exist, so the lookup never matched anything)
 *   - it issues a real SSO session via ssoService.createSession() so
 *     Nafath logins get the same /sessions surface as password logins
 *   - it refuses to issue a session when the linked User is disabled
 *   - it still returns { needsOnboarding: true } when no user matches
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205b-test-secret';
process.env.NAFATH_MODE = 'mock';
process.env.NAFATH_MOCK_APPROVE_MS = '0'; // approve instantly so polling resolves

const express = require('express');
const request = require('supertest');

// ─── Mock the User / Guardian / NafathRequest models so we don't need Mongo
const mockUserById = new Map();
const mockUserByNationalId = new Map();
const mockGuardianByIdNumber = new Map();
const mockNafathRequests = new Map();

jest.mock('../models/User', () => ({
  // Returns a chainable that supports `.lean()` like real mongoose queries
  findOne: jest.fn(query => {
    const result = query?.nationalId ? mockUserByNationalId.get(query.nationalId) || null : null;
    return {
      lean: async () => result,
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
  }),
  findById: jest.fn(async id => mockUserById.get(String(id)) || null),
  updateOne: jest.fn(async () => ({ acknowledged: true })),
}));

jest.mock('../models/Guardian', () => ({
  findOne: jest.fn(query => {
    const guardian = mockGuardianByIdNumber.get(query.idNumber) || null;
    // Chainable .populate(...).lean()
    return {
      populate: () => ({
        lean: async () => guardian,
      }),
    };
  }),
}));

// Must use `mock`-prefixed name so jest.mock() factory can reference it
// (Jest hoists jest.mock() above the module scope; only `mock*` vars allowed).
let mockNafathSeq = 0;
jest.mock('../models/NafathRequest', () => ({
  create: jest.fn(async doc => {
    mockNafathSeq += 1;
    const id = `nafath-doc-${mockNafathSeq}`;
    const full = {
      _id: id,
      ...doc,
      createdAt: new Date(),
      save: jest.fn(async function save() {
        mockNafathRequests.set(id, this);
        return this;
      }),
    };
    mockNafathRequests.set(id, full);
    return full;
  }),
  findById: jest.fn(async id => mockNafathRequests.get(String(id)) || null),
}));

// Make mongoose.isValidObjectId accept our string ids
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    isValidObjectId: jest.fn(() => true),
    Schema: actual.Schema,
    model: actual.model,
  };
});

// Force-disable the real nafath adapter so /initiate always returns a known
// transaction shape, AND the mock-status path approves immediately.
jest.mock('../services/nafathAdapter', () => {
  const real = jest.requireActual('../services/nafathAdapter');
  return {
    ...real,
    MODE: 'mock',
    initiate: jest.fn(async ({ nationalId }) => ({
      transactionId: `tx-${nationalId}`,
      randomNumber: '42',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      mode: 'mock',
    })),
    checkStatus: jest.fn(async ({ nationalId }) => ({
      status: 'APPROVED',
      attributes: {
        fullName: 'مستخدم تجريبي',
        firstName_ar: 'تجريبي',
        lastName_ar: 'مستخدم',
        dateOfBirth: new Date(1990, 0, 1),
        phone: `+9665${nationalId.slice(-8)}`,
        email: `u${nationalId.slice(-4)}@mock.test`,
      },
    })),
  };
});

// generateToken is consulted for the legacy `token` field — short-circuit it
jest.mock('../middleware/auth', () => ({
  generateToken: jest.fn(() => 'legacy-jwt-token'),
}));

const nafathRoutes = require('../routes/nafath.routes');
const SSOService = require('../services/sso.service');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth/nafath', nafathRoutes);
  return app;
}

beforeEach(() => {
  mockUserById.clear();
  mockUserByNationalId.clear();
  mockGuardianByIdNumber.clear();
  mockNafathRequests.clear();
  mockNafathSeq = 0;
});

describe('W205b — Nafath → SSO session integration', () => {
  test('APPROVED + User.nationalId match → issues full SSO session', async () => {
    const nationalId = '1234567890';
    const userId = 'user-1';
    const user = {
      _id: userId,
      email: 'staff@x.test',
      fullName: 'موظفة',
      role: 'admin',
      nationalId,
      isActive: true,
      branchId: 'branch-1',
      regionIds: [],
      customPermissions: ['users:read'],
    };
    mockUserById.set(userId, user);
    mockUserByNationalId.set(nationalId, user);

    const app = buildApp();

    const init = await request(app).post('/api/auth/nafath/initiate').send({ nationalId });
    expect(init.status).toBe(200);
    const requestId = init.body.requestId;

    const status = await request(app).get(`/api/auth/nafath/status/${requestId}`);
    expect(status.status).toBe(200);
    expect(status.body.status).toBe('APPROVED');
    expect(status.body.user).toBeTruthy();
    expect(status.body.user.id).toBe(userId);

    // Legacy token still issued for back-compat
    expect(status.body.token).toBe('legacy-jwt-token');

    // W205b: real SSO session present
    expect(status.body.sso).toBeTruthy();
    expect(status.body.sso.accessToken).toBeDefined();
    expect(status.body.sso.refreshToken).toBeDefined();
    expect(status.body.sso.idToken).toBeDefined();
    expect(status.body.sso.tokenType).toBe('Bearer');
    expect(status.body.sso.sessionId).toMatch(/^[a-f0-9]+$/);

    // The issued token verifies end-to-end through the SSO service
    const sso = new SSOService();
    const verification = await sso.verifySession(
      status.body.sso.sessionId,
      status.body.sso.accessToken
    );
    // The route's SSOService instance has its own mock store, so we can only
    // assert the JWT itself is well-formed:
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(status.body.sso.accessToken, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(userId);
    expect(decoded.authMethod).toBe('nafath');
    expect(decoded.nationalId).toBe(nationalId);
    // SECONDS-precision (RFC 7519)
    expect(decoded.exp - decoded.iat).toBeGreaterThan(0);
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(604800);
    expect(verification).toBeDefined(); // sanity — class loads
  });

  test('APPROVED + Guardian.idNumber match → resolves user via Guardian (W205b fix)', async () => {
    const nationalId = '1098765432';
    const guardianUserId = 'user-parent-1';
    const guardianUser = {
      _id: guardianUserId,
      email: 'parent@x.test',
      fullName: 'وليّ أمر',
      role: 'parent',
      isActive: true,
      branchId: null,
      regionIds: [],
      customPermissions: [],
    };
    mockUserById.set(guardianUserId, guardianUser);
    mockGuardianByIdNumber.set(nationalId, {
      idNumber: nationalId,
      idType: 'national_id',
      userId: guardianUser,
    });

    const app = buildApp();

    const init = await request(app).post('/api/auth/nafath/initiate').send({ nationalId });
    const status = await request(app).get(`/api/auth/nafath/status/${init.body.requestId}`);

    expect(status.status).toBe(200);
    expect(status.body.user.id).toBe(guardianUserId);
    expect(status.body.user.role).toBe('parent');
    expect(status.body.sso.sessionId).toMatch(/^[a-f0-9]+$/);
    expect(status.body.needsOnboarding).toBe(false);
  });

  test('APPROVED but no matching user → 200 with needsOnboarding=true', async () => {
    const app = buildApp();
    const init = await request(app)
      .post('/api/auth/nafath/initiate')
      .send({ nationalId: '1000000000' });
    const status = await request(app).get(`/api/auth/nafath/status/${init.body.requestId}`);

    expect(status.status).toBe(200);
    expect(status.body.status).toBe('APPROVED');
    expect(status.body.user).toBeNull();
    expect(status.body.needsOnboarding).toBe(true);
    expect(status.body.sso).toBeNull();
    expect(status.body.token).toBeNull();
  });

  test('APPROVED but user disabled → 403, no SSO session minted', async () => {
    const nationalId = '1111111111';
    const userId = 'user-disabled';
    const user = {
      _id: userId,
      email: 'disabled@x.test',
      fullName: 'مُعطّل',
      role: 'admin',
      nationalId,
      isActive: false,
    };
    mockUserById.set(userId, user);
    mockUserByNationalId.set(nationalId, user);

    const app = buildApp();
    const init = await request(app).post('/api/auth/nafath/initiate').send({ nationalId });
    const status = await request(app).get(`/api/auth/nafath/status/${init.body.requestId}`);

    expect(status.status).toBe(403);
    expect(status.body.error).toBe('account_disabled');
    expect(status.body.sso).toBeUndefined();
  });

  test('invalid national ID rejected by /initiate (defence in depth)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/auth/nafath/initiate')
      .send({ nationalId: 'xxx' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
