'use strict';

/**
 * student-registration-core-event-wave927.test.js — W927.
 *
 * The student-management registration wizard creates a Beneficiary via a raw
 * `Beneficiary.create()` (it does NOT route through the canonical DDD
 * BeneficiaryService). The W394 model post-save hook fires
 * `beneficiary.beneficiary.registered` (→ medical initial record), but the
 * `core.beneficiary.registered` event — which drives the CareTimeline entry
 * and the beneficiary KPI snapshot (dddCrossModuleSubscribers) — was NEVER
 * fired on this path. The new student was therefore NOT linked into the
 * unified core timeline/dashboard, violating project doctrine
 * ("لا تنشئ وحدات معزولة عن النواة").
 *
 * W927 publishes `core.beneficiary.registered` explicitly after a successful
 * create. This behavioral test boots the real route against an in-memory Mongo
 * and asserts the canonical event fires with the expected envelope.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ── Spy on the integration bus publish ──────────────────────────────
// `mock`-prefixed so the jest.mock factory may reference it (hoisting rule).
const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../integration/systemIntegrationBus', () => ({
  integrationBus: { publish: (...args) => mockPublish(...args) },
}));

// ── Pass-through auth / rbac / branch middleware ────────────────────
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/rbac.v2.middleware', () => ({
  requireRole:
    (...roles) =>
    (req, res, next) => {
      const role = req.user && req.user.role;
      if (!roles.length || roles.includes(role)) return next();
      return res.status(403).json({ success: false, message: 'forbidden' });
    },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

let mongod;
let Beneficiary;
let app;

const BRANCH_A = new mongoose.Types.ObjectId();
const admin = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'admin',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/v1/student-management', require('../routes/student-management.routes'));
  return expressApp;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w927-student-reg' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Beneficiary = require('../models/Beneficiary');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = admin;
  mockPublish.mockClear();
});

afterEach(async () => {
  await Beneficiary.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W927 — student registration fires core.beneficiary.registered', () => {
  it('publishes the canonical core event after a successful registration', async () => {
    const res = await request(app)
      .post('/api/v1/student-management')
      .send({
        personal: { firstNameAr: 'سالم', lastNameAr: 'الأحمد' },
        disability: { primaryType: 'physical', severity: 'moderate' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Allow the fire-and-forget publish microtask to settle.
    await new Promise(r => setImmediate(r));

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const [domain, eventType, payload] = mockPublish.mock.calls[0];
    expect(domain).toBe('core');
    expect(eventType).toBe('beneficiary.registered');
    expect(String(payload.beneficiaryId)).toBe(String(res.body.data._id));
    expect(payload.name).toContain('سالم');
    expect(payload).toHaveProperty('mrn');
    expect(payload).toHaveProperty('disabilityType');
    expect(payload).toHaveProperty('disabilityLevel');
  });

  it('does NOT fire the event when validation rejects the payload (no name)', async () => {
    const res = await request(app).post('/api/v1/student-management').send({ personal: {} });

    expect(res.status).toBe(400);
    await new Promise(r => setImmediate(r));
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
