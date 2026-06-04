'use strict';

/**
 * seizure-log-routes-behavioral-wave858.test.js — W858.
 *
 * ROUTE behavioral coverage for the W356 seizure-log surface (distinct from the
 * model-level seizure-log-behavioral-wave356). Real Express + real branchScope
 * (W445) + bodyScopedBeneficiaryGuard + MongoMemoryServer; only auth mocked.
 * Covers record→notify→review immutability flow, role gating (write vs review),
 * status-epilepticus analytics (≥300s), and cross-branch isolation.
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
let SeizureEvent;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const SUPERVISOR_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  name: 'المعالج',
  branchId: String(BRANCH_A),
};
const supervisorA = {
  id: String(SUPERVISOR_A),
  _id: SUPERVISOR_A,
  role: 'clinical_supervisor',
  name: 'المشرف',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/seizure-log', require('../routes/seizure-log.routes'));
  return app;
}

let app;

function eventPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    type: 'tonic_clonic',
    severity: 'moderate',
    startTime: new Date().toISOString(),
    ...overrides,
  };
}

async function record(overrides = {}) {
  return request(app).post('/api/v1/seizure-log').send(eventPayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w858-seizure-log' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  SeizureEvent = require('../models/SeizureEvent');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await SeizureEvent.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W858 — record + validation', () => {
  it('records an event (201, status=recorded)', async () => {
    const res = await record();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('recorded');
    expect(res.body.data.type).toBe('tonic_clonic');
  });

  it('rejects an invalid type (400)', async () => {
    const res = await record({ type: 'not_a_type' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing beneficiaryId (400)', async () => {
    const res = await record({ beneficiaryId: undefined });
    expect(res.status).toBe(400);
  });

  it('rejects endTime before startTime (400)', async () => {
    const start = new Date();
    const res = await record({
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() - 60000).toISOString(),
    });
    expect(res.status).toBe(400);
  });
});

describe('W858 — cross-branch isolation (W445)', () => {
  it('blocks recording for a foreign-branch beneficiary (403)', async () => {
    const res = await record({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await SeizureEvent.countDocuments({})).toBe(0);
  });

  it('GET / only lists caller-branch events', async () => {
    await record();
    await SeizureEvent.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      type: 'tonic_clonic',
      severity: 'mild',
      date: new Date(),
      startTime: new Date(),
      witnessedBy: THERAPIST_A,
      status: 'recorded',
    });
    const res = await request(app).get('/api/v1/seizure-log');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W858 — notify + review immutability', () => {
  it('records parent + supervisor notifications', async () => {
    const id = (await record()).body.data._id;
    const np = await request(app)
      .post(`/api/v1/seizure-log/${id}/notify-parent`)
      .send({ method: 'phone' });
    expect(np.status).toBe(200);
    expect(np.body.data.parentNotifiedAt).toBeTruthy();
    const ns = await request(app)
      .post(`/api/v1/seizure-log/${id}/notify-supervisor`)
      .send({ supervisorName: 'المشرف' });
    expect(ns.status).toBe(200);
    expect(ns.body.data.supervisorNotifiedAt).toBeTruthy();
  });

  it('forbids a therapist from reviewing (403)', async () => {
    const id = (await record()).body.data._id;
    const res = await request(app).post(`/api/v1/seizure-log/${id}/review`).send({});
    expect(res.status).toBe(403);
  });

  it('a clinical supervisor reviews → status reviewed; re-review 409', async () => {
    const id = (await record()).body.data._id;
    mockAuthState.user = supervisorA;
    const r1 = await request(app).post(`/api/v1/seizure-log/${id}/review`).send({});
    expect(r1.status).toBe(200);
    expect(r1.body.data.status).toBe('reviewed');
    const r2 = await request(app).post(`/api/v1/seizure-log/${id}/review`).send({});
    expect(r2.status).toBe(409);
  });

  it('blocks PATCH + notify once reviewed (409)', async () => {
    const id = (await record()).body.data._id;
    mockAuthState.user = supervisorA;
    await request(app).post(`/api/v1/seizure-log/${id}/review`).send({});
    const patch = await request(app)
      .patch(`/api/v1/seizure-log/${id}`)
      .send({ severity: 'severe' });
    expect(patch.status).toBe(409);
    const np = await request(app).post(`/api/v1/seizure-log/${id}/notify-parent`).send({});
    expect(np.status).toBe(409);
  });

  it('allows PATCH while still recorded', async () => {
    const id = (await record()).body.data._id;
    const res = await request(app).patch(`/api/v1/seizure-log/${id}`).send({ severity: 'severe' });
    expect(res.status).toBe(200);
    expect(res.body.data.severity).toBe('severe');
  });
});

describe('W858 — status-epilepticus analytics', () => {
  it('counts a ≥300s event as a status-epilepticus candidate in /stats', async () => {
    await record({ durationSeconds: 360 });
    await record({ durationSeconds: 30 });
    const res = await request(app).get('/api/v1/seizure-log/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.statusEpilepticusCandidates).toBe(1);
  });
});

describe('W858 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const id = (await record()).body.data._id;
    const res = await request(app).delete(`/api/v1/seizure-log/${id}`);
    expect(res.status).toBe(403);
    expect(await SeizureEvent.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await record()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/seizure-log/${id}`);
    expect(res.status).toBe(200);
    expect(await SeizureEvent.countDocuments({})).toBe(0);
  });
});
