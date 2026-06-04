'use strict';

/**
 * clinical-routes-behavioral-wave826.test.js — W826.
 *
 * Behavioral (supertest + MongoMemoryServer) counterpart to the STATIC model
 * guards W356 (seizure-log) + W357 (safeguarding). Those guards + their
 * behavioral model siblings cover the SCHEMA; the ROUTE layer (auth order,
 * branchFilter on :id reads, ObjectId validation, immutable-after-review /
 * status-transition 409s) had NO runtime coverage. This closes that gap for
 * the two highest-sensitivity clinical surfaces — seizure events and
 * safeguarding concerns (child-protection allegations).
 *
 * Harness mirrors phase-b-routes-behavioral-wave825:
 *   - jest.unmock('mongoose') + in-memory Mongo.
 *   - Mock ONLY ../middleware/auth (inject restricted therapist on branch A;
 *     requireRole pass-through). requireBranchAccess + branchFilter run FOR
 *     REAL, so cross-branch isolation is exercised end-to-end.
 *   - Load config/mongoose.plugins (Mongoose-9 legacy-hook compat shim) before
 *     the models, which use `pre('save', function (next) {...})`.
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

let SeizureEvent;
let SafeguardingConcern;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/seizure-log', require('../routes/seizure-log.routes'));
  a.use('/api/v1/safeguarding', require('../routes/safeguarding.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w826-clinical' } });
  await mongoose.connect(mongod.getUri());

  // Mongoose-9 legacy-hook compat shim — models use callback-style pre('save').
  require('../config/mongoose.plugins');

  require('../models/Beneficiary');
  SeizureEvent = require('../models/SeizureEvent');
  SafeguardingConcern = require('../models/SafeguardingConcern');

  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── seizure-log ─────────────────────────────────────────────────────────────
describe('W826 — seizure-log behavioral (tenant isolation + review lock)', () => {
  const ben = new mongoose.Types.ObjectId();

  function seed(branchId) {
    const now = new Date();
    return SeizureEvent.create({
      beneficiaryId: ben,
      branchId,
      date: now,
      startTime: now,
      type: 'tonic_clonic',
      severity: 'moderate',
      status: 'recorded',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/seizure-log/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch event (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/seizure-log/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch event (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/seizure-log/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/notify-parent on a foreign-branch event is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/seizure-log/${foreign._id}/notify-parent`)
      .send({ method: 'phone' });
    expect(res.status).toBe(404);
  });

  it('review locks the record: PATCH after review returns 409', async () => {
    const own = await seed(BRANCH_A);
    const rev = await request(app).post(`/api/v1/seizure-log/${own._id}/review`).send({});
    expect(rev.status).toBe(200);
    expect(rev.body.data.status).toBe('reviewed');

    const patch = await request(app)
      .patch(`/api/v1/seizure-log/${own._id}`)
      .send({ notes: 'late correction' });
    expect(patch.status).toBe(409);

    const reReview = await request(app).post(`/api/v1/seizure-log/${own._id}/review`).send({});
    expect(reReview.status).toBe(409);
  });
});

// ── safeguarding ──────────────────────────────────────────────────────────────
describe('W826 — safeguarding behavioral (tenant isolation + triage transition)', () => {
  function seed(branchId) {
    return SafeguardingConcern.create({
      subjectKind: 'beneficiary',
      subjectBeneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      reportedBy: ACTOR,
      category: 'physical',
      severity: 'high',
      description: 'بلاغ تجريبي للتحقق من العزل بين الفروع',
      status: 'reported',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/safeguarding/bad-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch concern (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/safeguarding/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch concern (404 — no child-protection leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/safeguarding/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/triage on a foreign-branch concern is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/safeguarding/${foreign._id}/triage`)
      .send({ triageNotes: 'attempt' });
    expect(res.status).toBe(404);
  });

  it('triage transition: own concern triaged (200), second triage 409', async () => {
    const own = await seed(BRANCH_A);
    const first = await request(app)
      .post(`/api/v1/safeguarding/${own._id}/triage`)
      .send({ triageNotes: 'فرز أولي' });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('triaged');

    const second = await request(app)
      .post(`/api/v1/safeguarding/${own._id}/triage`)
      .send({ triageNotes: 'مكرر' });
    expect(second.status).toBe(409);
  });
});
