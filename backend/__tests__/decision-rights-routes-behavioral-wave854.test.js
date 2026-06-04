'use strict';

/**
 * decision-rights-routes-behavioral-wave854.test.js — W854.
 *
 * Behavioral coverage for the W515 decision-rights REST surface. Real Express
 * + real branchScope + MongoMemoryServer; only auth is mocked. Exercises the
 * draft→finalize state machine end-to-end, including the W461 Wave-18
 * invariant chain computed by the model pre-save hook (composite score → layer
 * routing → supportArrangement on Layer 2/3 → advocateInvolved on restraint /
 * seclusion / research / substituted). The static guard (wave515) cannot reach
 * any of these runtime behaviours.
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
let DecisionRightsAssessment;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const PHYSICIAN_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const physicianA = {
  id: String(PHYSICIAN_A),
  _id: PHYSICIAN_A,
  role: 'physician',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

const SUPPORT = 'ترتيب دعم موثّق مع محامٍ مستقل وأسرة المستفيد أثناء اتخاذ القرار';
const AUTONOMY_CAP = { understanding: 3, retention: 3, weighing: 3, communication: 3 }; // 12
const SUPPORTED_CAP = { understanding: 2, retention: 2, weighing: 2, communication: 2 }; // 8
const SUBSTITUTED_CAP = { understanding: 1, retention: 1, weighing: 1, communication: 1 }; // 4

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/decision-rights', require('../routes/decision-rights.routes'));
  return app;
}

let app;

function payload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    decisionType: 'therapy_participation',
    assessedByRole: 'physician',
    capacity: AUTONOMY_CAP,
    ...overrides,
  };
}

async function createDraft(overrides = {}) {
  const res = await request(app).post('/api/v1/decision-rights').send(payload(overrides));
  return res;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w854-decision-rights' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  DecisionRightsAssessment = require('../models/DecisionRightsAssessment');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = physicianA;
});

afterEach(async () => {
  await DecisionRightsAssessment.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W854 — create + layer routing', () => {
  it('creates an autonomy draft (composite 12 → autonomy)', async () => {
    const res = await createDraft();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.compositeScore).toBe(12);
    expect(res.body.data.routedLayer).toBe('autonomy');
  });

  it('routes a low-capacity draft to substituted (composite 4)', async () => {
    const res = await createDraft({ capacity: SUBSTITUTED_CAP });
    expect(res.status).toBe(201);
    expect(res.body.data.routedLayer).toBe('substituted');
  });

  it('rejects an invalid decisionType (400)', async () => {
    const res = await createDraft({ decisionType: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects an incomplete capacity object (400)', async () => {
    const res = await createDraft({ capacity: { understanding: 3 } });
    expect(res.status).toBe(400);
  });
});

describe('W854 — cross-branch isolation', () => {
  it('blocks creating an assessment for a foreign-branch beneficiary (403)', async () => {
    const res = await createDraft({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await DecisionRightsAssessment.countDocuments({})).toBe(0);
  });
});

describe('W854 — finalize invariant chain', () => {
  it('finalizes an autonomy draft without support arrangement (200)', async () => {
    const id = (await createDraft()).body.data._id;
    const res = await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('finalized');
  });

  it('blocks finalizing a supported-layer draft without supportArrangement (400)', async () => {
    const id = (await createDraft({ capacity: SUPPORTED_CAP })).body.data._id;
    const res = await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    expect(res.status).toBe(400);
    const row = await DecisionRightsAssessment.findById(id).lean();
    expect(row.status).toBe('draft');
  });

  it('finalizes a supported-layer draft once supportArrangement is provided (200)', async () => {
    const id = (await createDraft({ capacity: SUPPORTED_CAP })).body.data._id;
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/finalize`)
      .send({ supportArrangement: SUPPORT });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('finalized');
  });

  it('blocks finalizing a substituted-layer draft without advocate (400)', async () => {
    const id = (await createDraft({ capacity: SUBSTITUTED_CAP })).body.data._id;
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/finalize`)
      .send({ supportArrangement: SUPPORT });
    expect(res.status).toBe(400);
  });

  it('finalizes a substituted-layer draft with support + advocate (200)', async () => {
    const id = (await createDraft({ capacity: SUBSTITUTED_CAP })).body.data._id;
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/finalize`)
      .send({ supportArrangement: SUPPORT, advocateInvolved: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('finalized');
  });

  it('blocks finalizing a restraint decision without advocate even at autonomy layer (400)', async () => {
    const id = (await createDraft({ decisionType: 'restraint' })).body.data._id;
    const res = await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    expect(res.status).toBe(400);
  });

  it('finalizes a restraint decision when advocate is involved (200)', async () => {
    const id = (await createDraft({ decisionType: 'restraint' })).body.data._id;
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/finalize`)
      .send({ advocateInvolved: true });
    expect(res.status).toBe(200);
  });

  it('rejects re-finalizing an already-finalized assessment (409)', async () => {
    const id = (await createDraft()).body.data._id;
    await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    const again = await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    expect(again.status).toBe(409);
  });
});

describe('W854 — record-outcome ordering', () => {
  it('rejects recording an outcome before finalization (409)', async () => {
    const id = (await createDraft()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/record-outcome`)
      .send({ decisionOutcome: 'وافق المستفيد على المشاركة' });
    expect(res.status).toBe(409);
  });

  it('records an outcome after finalization (200)', async () => {
    const id = (await createDraft()).body.data._id;
    await request(app).post(`/api/v1/decision-rights/${id}/finalize`).send({});
    const res = await request(app)
      .post(`/api/v1/decision-rights/${id}/record-outcome`)
      .send({ decisionOutcome: 'وافق المستفيد على المشاركة في الجلسات' });
    expect(res.status).toBe(200);
    expect(res.body.data.decisionOutcome).toContain('وافق');
  });
});

describe('W854 — DELETE role gating', () => {
  it('forbids a physician from deleting (403)', async () => {
    const id = (await createDraft()).body.data._id;
    const res = await request(app).delete(`/api/v1/decision-rights/${id}`);
    expect(res.status).toBe(403);
    expect(await DecisionRightsAssessment.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createDraft()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/decision-rights/${id}`);
    expect(res.status).toBe(200);
    expect(await DecisionRightsAssessment.countDocuments({})).toBe(0);
  });
});
