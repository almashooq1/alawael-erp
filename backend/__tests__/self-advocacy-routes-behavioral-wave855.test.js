'use strict';

/**
 * self-advocacy-routes-behavioral-wave855.test.js — W855.
 *
 * Behavioral coverage for the W518 self-advocacy REST surface. Real Express +
 * real branchScope + MongoMemoryServer; only auth is mocked. Exercises the
 * singleton-per-beneficiary guard, module start/complete/skip, the
 * active↔on_hold lifecycle, and the model pre-save auto-finalize at 100%
 * completion (all 5 rights completed → status flips to 'completed'). The
 * static guard (wave518) cannot reach these runtime behaviours.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'الدور غير مصرّح' });
  },
}));

let mongod;
let SelfAdvocacyTrainingPlan;
let Beneficiary;

const RIGHT_CODES = ['be_heard', 'consent', 'refuse', 'complain', 'community'];

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/self-advocacy', require('../routes/self-advocacy.routes'));
  return app;
}

let app;

function planPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    track: 'track_adult',
    ...overrides,
  };
}

async function createPlan(overrides = {}) {
  return request(app).post('/api/v1/self-advocacy').send(planPayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w855-self-advocacy' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  SelfAdvocacyTrainingPlan = require('../models/SelfAdvocacyTrainingPlan');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await SelfAdvocacyTrainingPlan.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W855 — create + singleton guard', () => {
  it('creates a plan with 5 module slots (201)', async () => {
    const res = await createPlan();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.completionPercentage).toBe(0);
    expect(res.body.data.modules).toHaveLength(5);
  });

  it('refuses a second plan for the same beneficiary (409)', async () => {
    await createPlan();
    const res = await createPlan();
    expect(res.status).toBe(409);
    expect(res.body.existingPlanId).toBeDefined();
  });

  it('rejects an invalid track (400)', async () => {
    const res = await createPlan({ track: 'track_unknown' });
    expect(res.status).toBe(400);
  });

  it('blocks creating a plan for a foreign-branch beneficiary (403)', async () => {
    const res = await createPlan({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await SelfAdvocacyTrainingPlan.countDocuments({})).toBe(0);
  });
});

describe('W855 — module progression + auto-finalize', () => {
  it('starts a module → in_progress', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${id}/module/be_heard/start`)
      .send({ deliveredByRole: 'therapist' });
    expect(res.status).toBe(200);
    const mod = res.body.data.modules.find(m => m.rightCode === 'be_heard');
    expect(mod.status).toBe('in_progress');
  });

  it('completing all 5 rights auto-finalizes the plan to completed (100%)', async () => {
    const id = (await createPlan()).body.data._id;
    let last;
    for (const code of RIGHT_CODES) {
      last = await request(app)
        .post(`/api/v1/self-advocacy/${id}/module/${code}/complete`)
        .send({});
      expect(last.status).toBe(200);
    }
    expect(last.body.data.completionPercentage).toBe(100);
    expect(last.body.data.status).toBe('completed');
  });

  it('partial completion reports proportional percentage (1/5 → 20%)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${id}/module/consent/complete`)
      .send({});
    expect(res.body.data.completionPercentage).toBe(20);
    expect(res.body.data.status).toBe('active');
  });

  it('rejects skipping a module without a skipReason (400)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app).post(`/api/v1/self-advocacy/${id}/module/refuse/skip`).send({});
    expect(res.status).toBe(400);
  });

  it('skips a module with a documented reason', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${id}/module/refuse/skip`)
      .send({ skipReason: 'المستفيد يتقن هذا الحق مسبقاً' });
    expect(res.status).toBe(200);
    const mod = res.body.data.modules.find(m => m.rightCode === 'refuse');
    expect(mod.status).toBe('skipped');
  });

  it('blocks module changes once the plan is completed (409)', async () => {
    const id = (await createPlan()).body.data._id;
    for (const code of RIGHT_CODES) {
      await request(app).post(`/api/v1/self-advocacy/${id}/module/${code}/complete`).send({});
    }
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${id}/module/be_heard/start`)
      .send({});
    expect(res.status).toBe(409);
  });
});

describe('W855 — hold / resume lifecycle', () => {
  it('holds an active plan then resumes it', async () => {
    const id = (await createPlan()).body.data._id;
    const held = await request(app).post(`/api/v1/self-advocacy/${id}/hold`).send({});
    expect(held.status).toBe(200);
    expect(held.body.data.status).toBe('on_hold');
    const resumed = await request(app).post(`/api/v1/self-advocacy/${id}/resume`).send({});
    expect(resumed.status).toBe(200);
    expect(resumed.body.data.status).toBe('active');
  });

  it('rejects resuming a plan that is not on_hold (409)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app).post(`/api/v1/self-advocacy/${id}/resume`).send({});
    expect(res.status).toBe(409);
  });
});

describe('W855 — cross-branch read isolation', () => {
  it('GET / only returns the caller-branch plans', async () => {
    await createPlan();
    await SelfAdvocacyTrainingPlan.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      track: 'track_adult',
      createdBy: THERAPIST_A,
      modules: RIGHT_CODES.map(c => ({ rightCode: c, status: 'not_started' })),
    });
    const res = await request(app).get('/api/v1/self-advocacy');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W855 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app).delete(`/api/v1/self-advocacy/${id}`);
    expect(res.status).toBe(403);
    expect(await SelfAdvocacyTrainingPlan.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createPlan()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/self-advocacy/${id}`);
    expect(res.status).toBe(200);
    expect(await SelfAdvocacyTrainingPlan.countDocuments({})).toBe(0);
  });
});
