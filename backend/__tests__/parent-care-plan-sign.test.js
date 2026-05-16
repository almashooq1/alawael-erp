/**
 * parent-care-plan-sign.test.js — Wave 8 smoke test.
 *
 * Boots the parent-v2 router with mocked Guardian / Beneficiary /
 * CarePlan models + a fake nafathSigningService so we cover the new
 * sign-request / mark-signed endpoints end-to-end without touching
 * Mongo or the real Nafath adapter.
 *
 * Note on the mocking pattern: Jest forbids `jest.mock()` factories
 * from closing over local variables. We stash the shared state on
 * `globalThis` (under a namespaced key) so the factories stay
 * self-referential while individual tests can still mutate state.
 */

'use strict';

// ─── Shared mock state — lives on globalThis for jest.mock() access ──
globalThis.__waveEightMockState = {
  guardian: null,
  carePlans: new Map(),
  nafath: { nextRequestSignature: null, nextPollResult: null },
};

const M = () => globalThis.__waveEightMockState;

// The route uses Mongoose query chains (`.lean()`, then `await`).
// Each mock model factory returns a thenable + chainable wrapper
// that resolves to the seeded value through either path.

jest.mock('../models/Guardian', () => ({
  findOne: jest.fn(() => {
    const { __waveEightMockState: state } = globalThis;
    return {
      lean: () => Promise.resolve(state.guardian),
      then: (resolve, reject) => Promise.resolve(state.guardian).then(resolve, reject),
    };
  }),
}));

jest.mock('../models/Beneficiary', () => ({
  findOne: jest.fn(({ _id, guardians }) => {
    const { __waveEightMockState: state } = globalThis;
    let value = null;
    if (state.guardian) {
      if (!guardians || String(guardians) === String(state.guardian._id)) {
        value = { _id, branchId: 'br-1' };
      }
    }
    return {
      lean: () => Promise.resolve(value),
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
  }),
  findById: jest.fn(id => ({
    lean: () => Promise.resolve({ _id: id, branchId: 'br-1' }),
    then: (resolve, reject) => Promise.resolve({ _id: id, branchId: 'br-1' }).then(resolve, reject),
  })),
}));

jest.mock('../models/TherapySession', () => ({}));
jest.mock('../models/ClinicalAssessment', () => ({}));
jest.mock('../models/Complaint', () => ({}));
jest.mock('../models/PortalNotification', () => ({}));
jest.mock('../models/HomeAssignment', () => ({}));
jest.mock('../services/parentReportService', () => ({}));
jest.mock('../models/blockchain.model', () => ({ BlockchainCertificate: {} }));
jest.mock('../services/blockchainPdfService', () => ({ generateCertificatePdf: () => null }));
jest.mock('../services/blockchainCertService', () => ({}));

jest.mock('../models/CarePlan', () => ({
  findOne: jest.fn(q => {
    const value = globalThis.__waveEightMockState.carePlans.get(String(q._id)) || null;
    return {
      lean: () => Promise.resolve(value),
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
  }),
  findOneAndUpdate: jest.fn((q, update) => {
    const plans = globalThis.__waveEightMockState.carePlans;
    const existing = plans.get(String(q._id));
    let value = null;
    if (existing && !existing.signedAt) {
      value = { ...existing, ...(update.$set || {}) };
      plans.set(String(q._id), value);
    }
    return {
      lean: () => Promise.resolve(value),
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
  }),
}));

jest.mock('../services/nafathSigningService', () => ({
  createService: () => ({
    requestSignature: jest.fn(
      async () => globalThis.__waveEightMockState.nafath.nextRequestSignature
    ),
    pollSignature: jest.fn(async () => globalThis.__waveEightMockState.nafath.nextPollResult),
  }),
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = req.user || {
      id: '507f1f77bcf86cd799439011',
      role: 'guardian',
    };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const router = require('../routes/parent-portal-v2.routes');

function mountApp({ user } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use('/api/parent-v2', router);
  return app;
}

const VALID_PLAN_ID = '507f1f77bcf86cd799439001';
const VALID_CHILD_ID = '507f1f77bcf86cd799439002';
const VALID_GUARDIAN_ID = '507f1f77bcf86cd799439010';
const VALID_REQUEST_ID = '507f1f77bcf86cd799439099';
const VALID_HASH = 'a'.repeat(64);

function seedPlan(overrides = {}) {
  M().carePlans.set(VALID_PLAN_ID, {
    _id: VALID_PLAN_ID,
    beneficiary: VALID_CHILD_ID,
    requiresSignature: true,
    signedAt: null,
    ...overrides,
  });
}

function seedGuardian(overrides = {}) {
  M().guardian = {
    _id: VALID_GUARDIAN_ID,
    userId: '507f1f77bcf86cd799439011',
    nationalId: '1234567890',
    ...overrides,
  };
}

beforeEach(() => {
  M().carePlans.clear();
  M().guardian = null;
  M().nafath.nextRequestSignature = null;
  M().nafath.nextPollResult = null;
});

// ─── /sign-request ───────────────────────────────────────────────
describe('POST /children/:id/care-plan/:planId/sign-request', () => {
  test('happy path: returns Nafath request envelope', async () => {
    seedGuardian();
    seedPlan();
    M().nafath.nextRequestSignature = {
      _id: VALID_REQUEST_ID,
      transactionId: 'tx-1',
      randomNumber: '42',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      status: 'PENDING',
      mode: 'mock',
    };

    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: VALID_HASH });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.randomNumber).toBe('42');
    expect(res.body.data.requestId).toBe(VALID_REQUEST_ID);
  });

  test('rejects short documentHash', async () => {
    seedGuardian();
    seedPlan();
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('documentHash');
  });

  test('rejects plan that does not require signature', async () => {
    seedGuardian();
    seedPlan({ requiresSignature: false });
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: VALID_HASH });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('لا تتطلب');
  });

  test('rejects already-signed plan with 409', async () => {
    seedGuardian();
    seedPlan({ signedAt: new Date() });
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: VALID_HASH });
    expect(res.status).toBe(409);
  });

  test('rejects guardian without national ID', async () => {
    seedGuardian({ nationalId: null });
    seedPlan();
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: VALID_HASH });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('هوية');
  });

  test('rejects unauthorized child (no guardian link)', async () => {
    seedPlan();
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/sign-request`)
      .send({ documentHash: VALID_HASH });
    expect(res.status).toBe(403);
  });
});

// ─── /mark-signed ────────────────────────────────────────────────
describe('POST /children/:id/care-plan/:planId/mark-signed', () => {
  test('happy path: flips signedAt on APPROVED + correct identity', async () => {
    seedGuardian();
    seedPlan();
    M().nafath.nextPollResult = {
      _id: VALID_REQUEST_ID,
      status: 'APPROVED',
      approvedAt: new Date(),
      documentId: VALID_PLAN_ID,
      signerUserId: '507f1f77bcf86cd799439011',
    };
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/mark-signed`)
      .send({ requestId: VALID_REQUEST_ID });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.idempotent).toBe(false);
    expect(M().carePlans.get(VALID_PLAN_ID).signedAt).toBeTruthy();
  });

  test('rejects unapproved status with 409', async () => {
    seedGuardian();
    seedPlan();
    M().nafath.nextPollResult = { _id: VALID_REQUEST_ID, status: 'PENDING' };
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/mark-signed`)
      .send({ requestId: VALID_REQUEST_ID });
    expect(res.status).toBe(409);
    expect(res.body.status).toBe('PENDING');
  });

  test('rejects signature bound to a different document', async () => {
    seedGuardian();
    seedPlan();
    M().nafath.nextPollResult = {
      _id: VALID_REQUEST_ID,
      status: 'APPROVED',
      approvedAt: new Date(),
      documentId: 'someOtherPlanId',
      signerUserId: '507f1f77bcf86cd799439011',
    };
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/mark-signed`)
      .send({ requestId: VALID_REQUEST_ID });
    expect(res.status).toBe(403);
  });

  test('idempotent when plan already signed by prior call', async () => {
    seedGuardian();
    seedPlan({ signedAt: new Date() });
    M().nafath.nextPollResult = {
      _id: VALID_REQUEST_ID,
      status: 'APPROVED',
      approvedAt: new Date(),
      documentId: VALID_PLAN_ID,
      signerUserId: '507f1f77bcf86cd799439011',
    };
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/mark-signed`)
      .send({ requestId: VALID_REQUEST_ID });
    expect(res.status).toBe(200);
    expect(res.body.data.idempotent).toBe(true);
  });

  test('rejects invalid requestId', async () => {
    seedGuardian();
    seedPlan();
    const app = mountApp();
    const res = await request(app)
      .post(`/api/parent-v2/children/${VALID_CHILD_ID}/care-plan/${VALID_PLAN_ID}/mark-signed`)
      .send({ requestId: 'not-a-real-id' });
    expect(res.status).toBe(400);
  });
});
