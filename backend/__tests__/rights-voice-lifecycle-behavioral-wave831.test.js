'use strict';

/**
 * rights-voice-lifecycle-behavioral-wave831.test.js — W831.
 *
 * Deeper lifecycle behavioral coverage (supertest + MongoMemoryServer) for the
 * Phase B Rights & Voice surfaces. W829 covered tenant isolation + ObjectId
 * guards; this wave exercises the actual STATE MACHINES + Wave-18 invariants
 * that only fire at runtime:
 *
 *   decision-rights (W461/W515):
 *     - finalize draft→finalized for an autonomy-layer assessment (200)
 *     - record-outcome blocked before finalize (409), allowed after (200)
 *     - finalize a "supported"-layer assessment WITHOUT supportArrangement →
 *       400 (Wave-18 invariant), WITH it → 200
 *     - finalize again when already finalized → 409
 *
 *   self-advocacy (W462/W518):
 *     - module start with invalid rightCode → 400
 *     - module op on a foreign-branch plan → 404
 *     - module start → in_progress; completing ALL 5 rights auto-finalizes the
 *       plan to 'completed' (pre-save hook), after which module ops → 409
 *     - hold (active→on_hold) + resume (on_hold→active)
 *
 * Capacity→layer thresholds (decision-rights.lib): ≥10 autonomy, ≥6 supported,
 * <6 substituted.
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
  requireRole: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();
const RIGHT_CODES = ['be_heard', 'consent', 'refuse', 'complain', 'community'];

let DecisionRights;
let SelfAdvocacy;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/decision-rights', require('../routes/decision-rights.routes'));
  a.use('/api/v1/self-advocacy', require('../routes/self-advocacy.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w831-rights-voice' } });
  await mongoose.connect(mongod.getUri());

  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  DecisionRights = require('../models/DecisionRightsAssessment');
  SelfAdvocacy = require('../models/SelfAdvocacyTrainingPlan');

  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'case_manager', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── decision-rights lifecycle ───────────────────────────────────────────────
describe('W831 — decision-rights finalize + record-outcome lifecycle', () => {
  function seed(branchId, capacity) {
    return DecisionRights.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      decisionType: 'daily_preferences',
      capacity,
      assessedBy: ACTOR,
      assessedByRole: 'case_manager',
      status: 'draft',
    });
  }
  const FULL = { understanding: 3, retention: 3, weighing: 3, communication: 3 }; // 12 → autonomy
  const MID = { understanding: 2, retention: 2, weighing: 2, communication: 1 }; // 7 → supported

  it('finalize draft → finalized for an autonomy-layer assessment (200)', async () => {
    const own = await seed(BRANCH_A, FULL);
    const res = await request(app).post(`/api/v1/decision-rights/${own._id}/finalize`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('finalized');
    expect(res.body.data.routedLayer).toBe('autonomy');
  });

  it('record-outcome is blocked before finalize (409), allowed after (200)', async () => {
    const own = await seed(BRANCH_A, FULL);
    const early = await request(app)
      .post(`/api/v1/decision-rights/${own._id}/record-outcome`)
      .send({ decisionOutcome: 'وافق على المشاركة' });
    expect(early.status).toBe(409);

    const fin = await request(app).post(`/api/v1/decision-rights/${own._id}/finalize`).send({});
    expect(fin.status).toBe(200);

    const late = await request(app)
      .post(`/api/v1/decision-rights/${own._id}/record-outcome`)
      .send({ decisionOutcome: 'وافق على المشاركة في الجلسات' });
    expect(late.status).toBe(200);
  });

  it('finalize a supported-layer assessment requires supportArrangement (400 → 200)', async () => {
    const noSupport = await seed(BRANCH_A, MID);
    const bad = await request(app)
      .post(`/api/v1/decision-rights/${noSupport._id}/finalize`)
      .send({});
    expect(bad.status).toBe(400);

    const withSupport = await seed(BRANCH_A, MID);
    const ok = await request(app)
      .post(`/api/v1/decision-rights/${withSupport._id}/finalize`)
      .send({ supportArrangement: 'ترتيب دعم موثّق عبر أخصائي اجتماعي ومقدّم رعاية' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.routedLayer).toBe('supported');
  });

  it('finalize is rejected when the assessment is already finalized (409)', async () => {
    const own = await seed(BRANCH_A, FULL);
    const first = await request(app).post(`/api/v1/decision-rights/${own._id}/finalize`).send({});
    expect(first.status).toBe(200);
    const second = await request(app).post(`/api/v1/decision-rights/${own._id}/finalize`).send({});
    expect(second.status).toBe(409);
  });
});

// ── self-advocacy module lifecycle ────────────────────────────────────────────
describe('W831 — self-advocacy module lifecycle + auto-finalize', () => {
  function seed(branchId) {
    return SelfAdvocacy.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      track: 'track_adult',
      createdBy: ACTOR,
      status: 'active',
      modules: RIGHT_CODES.map(code => ({
        rightCode: code,
        status: 'not_started',
        sessionsRequired: 1,
      })),
    });
  }

  it('module start with an invalid rightCode → 400', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${own._id}/module/not_a_right/start`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('module op on a foreign-branch plan → 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${foreign._id}/module/be_heard/start`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('module start moves the module to in_progress (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/self-advocacy/${own._id}/module/be_heard/start`)
      .send({});
    expect(res.status).toBe(200);
    const mod = res.body.data.modules.find(m => m.rightCode === 'be_heard');
    expect(mod.status).toBe('in_progress');
  });

  it('completing all 5 rights auto-finalizes the plan, then module ops → 409', async () => {
    const own = await seed(BRANCH_A);
    let last;
    for (const code of RIGHT_CODES) {
      last = await request(app)
        .post(`/api/v1/self-advocacy/${own._id}/module/${code}/complete`)
        .send({});
      expect(last.status).toBe(200);
    }
    expect(last.body.data.status).toBe('completed');
    expect(last.body.data.completionPercentage).toBe(100);

    const afterComplete = await request(app)
      .post(`/api/v1/self-advocacy/${own._id}/module/be_heard/start`)
      .send({});
    expect(afterComplete.status).toBe(409);
  });

  it('hold (active → on_hold) then resume (on_hold → active)', async () => {
    const own = await seed(BRANCH_A);
    const hold = await request(app).post(`/api/v1/self-advocacy/${own._id}/hold`).send({});
    expect(hold.status).toBe(200);
    expect(hold.body.data.status).toBe('on_hold');

    const resume = await request(app).post(`/api/v1/self-advocacy/${own._id}/resume`).send({});
    expect(resume.status).toBe(200);
    expect(resume.body.data.status).toBe('active');
  });
});
