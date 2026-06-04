'use strict';

/**
 * clinical-routes-behavioral-wave828.test.js — W828.
 *
 * Behavioral (supertest + MongoMemoryServer) route-layer coverage for three
 * more surfaces with static-only guards: facility assets (W369), assistive
 * devices (W359), and transition plans (W361). Continuation of the
 * W825/W826/W827 thread — same harness + doctrine.
 *
 * Per surface: cross-branch isolation (own 200 / foreign 404), invalid
 * ObjectId 400, status-transition discipline (409) + required-field 400.
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

let FacilityAsset;
let AssistiveDevice;
let TransitionPlan;
let tagSeq = 0;
const nextTag = prefix => `${prefix}-${Date.now()}-${tagSeq++}`;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/facility-asset', require('../routes/facility-asset.routes'));
  a.use('/api/v1/assistive-device', require('../routes/assistive-device.routes'));
  a.use('/api/v1/transition-plan', require('../routes/transition-plan.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w828-clinical' } });
  await mongoose.connect(mongod.getUri());

  // Mongoose-9 legacy-hook compat shim — models use callback-style pre('save').
  require('../config/mongoose.plugins');

  require('../models/Beneficiary');
  FacilityAsset = require('../models/FacilityAsset');
  AssistiveDevice = require('../models/AssistiveDevice');
  TransitionPlan = require('../models/TransitionPlan');

  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── facility-asset ──────────────────────────────────────────────────────────
describe('W828 — facility-asset behavioral (tenant isolation + out-of-service)', () => {
  function seed(branchId) {
    return FacilityAsset.create({
      assetTag: nextTag('FA'),
      name: 'Elevator A',
      category: 'elevator',
      branchId,
      status: 'in_service',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/facility-asset/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch asset (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/facility-asset/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch asset (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/facility-asset/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/out-of-service on a foreign-branch asset is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/facility-asset/${foreign._id}/out-of-service`)
      .send({ reason: 'broken' });
    expect(res.status).toBe(404);
  });

  it('out-of-service requires a reason (400), then transitions + returns to service', async () => {
    const own = await seed(BRANCH_A);
    const noReason = await request(app)
      .post(`/api/v1/facility-asset/${own._id}/out-of-service`)
      .send({});
    expect(noReason.status).toBe(400);

    const oos = await request(app)
      .post(`/api/v1/facility-asset/${own._id}/out-of-service`)
      .send({ reason: 'تعطل المصعد' });
    expect(oos.status).toBe(200);
    expect(oos.body.data.status).toBe('out_of_service');

    const back = await request(app)
      .post(`/api/v1/facility-asset/${own._id}/return-to-service`)
      .send({});
    expect(back.status).toBe(200);
    expect(back.body.data.status).toBe('in_service');
  });
});

// ── assistive-device ──────────────────────────────────────────────────────────
describe('W828 — assistive-device behavioral (tenant isolation + retire)', () => {
  function seed(branchId) {
    return AssistiveDevice.create({
      assetTag: nextTag('AD'),
      name: 'Wheelchair X',
      category: 'wheelchair',
      branchId,
      availability: 'available',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/assistive-device/bad');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch device (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/assistive-device/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch device (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/assistive-device/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/retire on a foreign-branch device is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/assistive-device/${foreign._id}/retire`)
      .send({ retirementReason: 'worn out' });
    expect(res.status).toBe(404);
  });

  it('retire requires a reason (400), then retires the device (200)', async () => {
    const own = await seed(BRANCH_A);
    const noReason = await request(app).post(`/api/v1/assistive-device/${own._id}/retire`).send({});
    expect(noReason.status).toBe(400);

    const retired = await request(app)
      .post(`/api/v1/assistive-device/${own._id}/retire`)
      .send({ retirementReason: 'انتهاء العمر الافتراضي' });
    expect(retired.status).toBe(200);
    expect(retired.body.data.availability).toBe('retired');
  });
});

// ── transition-plan ───────────────────────────────────────────────────────────
describe('W828 — transition-plan behavioral (tenant isolation + start)', () => {
  function seed(branchId) {
    return TransitionPlan.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      transitionType: 'school_to_work',
      status: 'draft',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/transition-plan/xyz');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch plan (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/transition-plan/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch plan (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/transition-plan/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/start on a foreign-branch plan is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/transition-plan/${foreign._id}/start`)
      .send({ plannedTransitionDate: new Date(Date.now() + 30 * 86400000) });
    expect(res.status).toBe(404);
  });

  it('start requires plannedTransitionDate (400), then draft → in_progress, second start 409', async () => {
    const own = await seed(BRANCH_A);
    const noDate = await request(app).post(`/api/v1/transition-plan/${own._id}/start`).send({});
    expect(noDate.status).toBe(400);

    const started = await request(app)
      .post(`/api/v1/transition-plan/${own._id}/start`)
      .send({ plannedTransitionDate: new Date(Date.now() + 30 * 86400000) });
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe('in_progress');

    const again = await request(app)
      .post(`/api/v1/transition-plan/${own._id}/start`)
      .send({ plannedTransitionDate: new Date(Date.now() + 60 * 86400000) });
    expect(again.status).toBe(409);
  });
});
