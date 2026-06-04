'use strict';

/**
 * phase-b-routes-behavioral-wave829.test.js — W829.
 *
 * Behavioral (supertest + MongoMemoryServer) counterpart to the STATIC drift
 * guards W513/W515/W518 + the W521 module-presence smoke. Closes the
 * "behavioral coverage for routes layer" follow-up recorded in CLAUDE.md
 * (Phase B "Open follow-ups"): the W513/W515/W518 guards assert source-text
 * shape but never boot Express, so cross-branch 404, invalid-ObjectId 400,
 * and 409 lifecycle transitions were unverified at runtime.
 *
 * Strategy (mirrors purchasing-routes-auth-wave794):
 *   - jest.unmock('mongoose') + a real in-memory Mongo.
 *   - Mock ONLY ../middleware/auth so authenticateToken injects a restricted
 *     therapist user (branch A) and requireRole is a pass-through. Everything
 *     else — requireBranchAccess, branchFilter, bodyScopedBeneficiaryGuard —
 *     runs FOR REAL, so branch isolation is exercised end-to-end.
 *   - Seed docs directly through the models (own branch A + foreign branch B)
 *     and hit the live routers via HTTP.
 *
 * Tenant model: therapist is NOT a CROSS_BRANCH role, so requireBranchAccess
 * marks the request restricted to branch A. branchFilter(req) therefore yields
 * { branchId: A }, and any branch-B document is invisible (404), never leaked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Inject a restricted therapist user. mockAuthState is mutated per-test when a
// different role/branch is needed. The `mock` prefix satisfies jest's
// out-of-scope-reference rule for jest.mock factories.
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  // Role checks are covered by the static guards + dedicated auth tests; here
  // we pass through so the focus stays on tenant isolation + lifecycle.
  requireRole: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();

let VoiceLog;
let DecisionRights;
let SelfAdvocacy;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/voice-log', require('../routes/voice-log.routes'));
  a.use('/api/v1/decision-rights', require('../routes/decision-rights.routes'));
  a.use('/api/v1/self-advocacy', require('../routes/self-advocacy.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w829-phase-b' } });
  await mongoose.connect(mongod.getUri());

  // Mongoose-9 legacy-hook compat shim — the Phase B models use
  // `pre('save', function (next) { ...; next(); })`; without the shim every
  // save() throws "next is not a function" (same dependency as W460/W461/W462
  // behavioral tests).
  require('../config/mongoose.plugins');

  // Register models used by the routers (+ Beneficiary for hydrate()).
  require('../models/Beneficiary');
  VoiceLog = require('../models/BeneficiaryVoiceLog');
  DecisionRights = require('../models/DecisionRightsAssessment');
  SelfAdvocacy = require('../models/SelfAdvocacyTrainingPlan');

  // Restricted therapist pinned to branch A.
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── voice-log ─────────────────────────────────────────────────────────────
describe('W829 — voice-log behavioral (tenant isolation + lifecycle)', () => {
  const ben = new mongoose.Types.ObjectId();
  let ownId;
  let foreignId;

  beforeAll(async () => {
    const own = await VoiceLog.create({
      beneficiaryId: ben,
      branchId: BRANCH_A,
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      content: { text: 'أحب الجلسات الصباحية' },
      capturedBy: ACTOR,
      capturedByRole: 'therapist',
      status: 'active',
    });
    ownId = own._id;
    const foreign = await VoiceLog.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: BRANCH_B,
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      content: { text: 'foreign branch entry' },
      capturedBy: ACTOR,
      capturedByRole: 'therapist',
      status: 'active',
    });
    foreignId = foreign._id;
  });

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/voice-log/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch entry (200)', async () => {
    const res = await request(app).get(`/api/v1/voice-log/${ownId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(String(res.body.data._id)).toBe(String(ownId));
  });

  it('GET /:id hides a foreign-branch entry (404, no leak)', async () => {
    const res = await request(app).get(`/api/v1/voice-log/${foreignId}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/action on a foreign-branch entry is 404', async () => {
    const res = await request(app)
      .post(`/api/v1/voice-log/${foreignId}/action`)
      .send({ action: 'plan_adjusted' });
    expect(res.status).toBe(404);
  });

  it('POST /:id/action rejects an invalid action enum with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/voice-log/${ownId}/action`)
      .send({ action: 'teleport' });
    expect(res.status).toBe(400);
  });

  it('POST /:id/action records a valid follow-up action (200)', async () => {
    const res = await request(app)
      .post(`/api/v1/voice-log/${ownId}/action`)
      .send({ action: 'plan_adjusted', details: 'تم تعديل الخطة' });
    expect(res.status).toBe(200);
    expect(res.body.data.actionTaken).toBe('plan_adjusted');
  });

  it('POST /:id/supersede rejects superseding a record by itself (400)', async () => {
    const res = await request(app)
      .post(`/api/v1/voice-log/${ownId}/supersede`)
      .send({ supersededBy: String(ownId) });
    expect(res.status).toBe(400);
  });

  it('supersede then action returns 409 (cannot act on a superseded record)', async () => {
    const newer = await VoiceLog.create({
      beneficiaryId: ben,
      branchId: BRANCH_A,
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      content: { text: 'تفضيل أحدث' },
      capturedBy: ACTOR,
      capturedByRole: 'therapist',
      status: 'active',
    });
    const sup = await request(app)
      .post(`/api/v1/voice-log/${ownId}/supersede`)
      .send({ supersededBy: String(newer._id) });
    expect(sup.status).toBe(200);
    expect(sup.body.data.status).toBe('superseded');

    const act = await request(app)
      .post(`/api/v1/voice-log/${ownId}/action`)
      .send({ action: 'plan_adjusted' });
    expect(act.status).toBe(409);
  });
});

// ── decision-rights ─────────────────────────────────────────────────────────
describe('W829 — decision-rights behavioral (tenant isolation)', () => {
  let ownId;
  let foreignId;

  beforeAll(async () => {
    const own = await DecisionRights.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: BRANCH_A,
      decisionType: 'daily_preferences',
      capacity: { understanding: 3, retention: 3, weighing: 3, communication: 3 },
      assessedBy: ACTOR,
      assessedByRole: 'case_manager',
      status: 'draft',
    });
    ownId = own._id;
    const foreign = await DecisionRights.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: BRANCH_B,
      decisionType: 'daily_preferences',
      capacity: { understanding: 3, retention: 3, weighing: 3, communication: 3 },
      assessedBy: ACTOR,
      assessedByRole: 'case_manager',
      status: 'draft',
    });
    foreignId = foreign._id;
  });

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/decision-rights/xyz');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch assessment (200)', async () => {
    const res = await request(app).get(`/api/v1/decision-rights/${ownId}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(ownId));
  });

  it('GET /:id hides a foreign-branch assessment (404, no leak)', async () => {
    const res = await request(app).get(`/api/v1/decision-rights/${foreignId}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/record-outcome on a foreign-branch assessment is 404', async () => {
    const res = await request(app)
      .post(`/api/v1/decision-rights/${foreignId}/record-outcome`)
      .send({ decisionOutcome: 'تمت الموافقة على المشاركة' });
    expect(res.status).toBe(404);
  });
});

// ── self-advocacy ───────────────────────────────────────────────────────────
describe('W829 — self-advocacy behavioral (tenant isolation + singleton)', () => {
  let ownId;
  let foreignId;
  const ownBen = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const own = await SelfAdvocacy.create({
      beneficiaryId: ownBen,
      branchId: BRANCH_A,
      track: 'track_adult',
      createdBy: ACTOR,
      status: 'active',
    });
    ownId = own._id;
    const foreign = await SelfAdvocacy.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: BRANCH_B,
      track: 'track_adult',
      createdBy: ACTOR,
      status: 'active',
    });
    foreignId = foreign._id;
  });

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/self-advocacy/bad');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch plan (200)', async () => {
    const res = await request(app).get(`/api/v1/self-advocacy/${ownId}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(ownId));
  });

  it('GET /:id hides a foreign-branch plan (404, no leak)', async () => {
    const res = await request(app).get(`/api/v1/self-advocacy/${foreignId}`);
    expect(res.status).toBe(404);
  });
});
