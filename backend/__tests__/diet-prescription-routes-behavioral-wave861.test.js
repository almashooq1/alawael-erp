'use strict';

/**
 * diet-prescription-routes-behavioral-wave861.test.js — W861.
 *
 * ROUTE behavioral coverage for the W368 diet-prescription surface (distinct
 * from model-level diet-prescription-behavioral-wave368). Real Express + real
 * branchScope (W445) + bodyScopedBeneficiaryGuard + MongoMemoryServer; only
 * auth mocked. Exercises the singleton-per-beneficiary guard, draft→active
 * activation gate (prescriber discipline), NPO start/end, enteral start/stop,
 * IDDSI invariants, prescribe-role gating, and cross-branch isolation.
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
let Rx;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_A2 = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const DIETITIAN_A = new mongoose.Types.ObjectId();
const NURSE_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const dietitianA = {
  id: String(DIETITIAN_A),
  _id: DIETITIAN_A,
  role: 'dietitian',
  name: 'أخصائي التغذية',
  branchId: String(BRANCH_A),
};
const nurseA = { id: String(NURSE_A), _id: NURSE_A, role: 'nurse', branchId: String(BRANCH_A) };
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/diet-prescription', require('../routes/diet-prescription.routes'));
  return app;
}

let app;

function rxPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    foodIddsiLevel: 4,
    drinkIddsiLevel: 2,
    ...overrides,
  };
}

async function createRx(overrides = {}) {
  return request(app).post('/api/v1/diet-prescription').send(rxPayload(overrides));
}

async function createActive(overrides = {}) {
  const id = (await createRx(overrides)).body.data._id;
  await request(app)
    .post(`/api/v1/diet-prescription/${id}/activate`)
    .send({ prescriberDiscipline: 'registered_dietitian' });
  return id;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w861-diet-prescription' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Rx = require('../models/BeneficiaryDietPrescription');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_A2, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = dietitianA;
});

afterEach(async () => {
  await Rx.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W861 — create + singleton guard', () => {
  it('creates a draft prescription (201)', async () => {
    const res = await createRx();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.foodIddsiLevel).toBe(4);
  });

  it('refuses a second prescription for the same beneficiary (409)', async () => {
    await createRx();
    const res = await createRx();
    expect(res.status).toBe(409);
    expect(res.body.existingId).toBeDefined();
  });

  it('forbids a nurse (read-only) from prescribing (403)', async () => {
    mockAuthState.user = nurseA;
    const res = await createRx({ beneficiaryId: String(BENE_A2) });
    expect(res.status).toBe(403);
  });

  it('blocks creating a prescription for a foreign-branch beneficiary (403)', async () => {
    const res = await createRx({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await Rx.countDocuments({})).toBe(0);
  });
});

describe('W861 — activation gate', () => {
  it('rejects activation without a prescriber discipline (400)', async () => {
    const id = (await createRx()).body.data._id;
    const res = await request(app).post(`/api/v1/diet-prescription/${id}/activate`).send({});
    expect(res.status).toBe(400);
    expect((await Rx.findById(id).lean()).status).toBe('draft');
  });

  it('activates with a valid prescriber discipline (200) and sets nextReviewDue', async () => {
    const id = (await createRx()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/diet-prescription/${id}/activate`)
      .send({ prescriberDiscipline: 'registered_dietitian' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.nextReviewDue).toBeTruthy();
  });
});

describe('W861 — NPO start/end + IDDSI invariant', () => {
  it('start-npo requires a reason, clears IDDSI levels', async () => {
    const id = await createActive();
    expect(
      (await request(app).post(`/api/v1/diet-prescription/${id}/start-npo`).send({})).status
    ).toBe(400);
    const res = await request(app)
      .post(`/api/v1/diet-prescription/${id}/start-npo`)
      .send({ reason: 'pre-operative fasting' });
    expect(res.status).toBe(200);
    expect(res.body.data.npo).toBe(true);
    expect(res.body.data.foodIddsiLevel).toBeNull();
  });

  it('end-npo is blocked when not NPO, then succeeds after start', async () => {
    const id = await createActive();
    expect(
      (await request(app).post(`/api/v1/diet-prescription/${id}/end-npo`).send({})).status
    ).toBe(409);
    await request(app)
      .post(`/api/v1/diet-prescription/${id}/start-npo`)
      .send({ reason: 'fasting' });
    const res = await request(app).post(`/api/v1/diet-prescription/${id}/end-npo`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.npo).toBe(false);
  });
});

describe('W861 — enteral start/stop', () => {
  it('start-enteral requires route + formulaName then activates tube feeding', async () => {
    const id = await createActive();
    expect(
      (await request(app).post(`/api/v1/diet-prescription/${id}/start-enteral`).send({})).status
    ).toBe(400);
    const res = await request(app)
      .post(`/api/v1/diet-prescription/${id}/start-enteral`)
      .send({ route: 'gt', formulaName: 'Nutren 1.0', deliveryMode: 'bolus' });
    expect(res.status).toBe(200);
    expect(res.body.data.enteralFeeding.active).toBe(true);
    expect(res.body.data.enteralFeeding.route).toBe('gt');
  });

  it('stop-enteral is blocked when not active', async () => {
    const id = await createActive();
    const res = await request(app).post(`/api/v1/diet-prescription/${id}/stop-enteral`).send({});
    expect(res.status).toBe(409);
  });
});

describe('W861 — review + discontinue', () => {
  it('review only allowed when active; advances nextReviewDue', async () => {
    const draftId = (await createRx()).body.data._id;
    expect(
      (await request(app).post(`/api/v1/diet-prescription/${draftId}/review`).send({})).status
    ).toBe(409);
    const id = await createActive({ beneficiaryId: String(BENE_A2) });
    const res = await request(app).post(`/api/v1/diet-prescription/${id}/review`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.lastReviewedAt).toBeTruthy();
  });

  it('discontinue requires a reason; blocks subsequent PATCH (409)', async () => {
    const id = await createActive();
    expect(
      (await request(app).post(`/api/v1/diet-prescription/${id}/discontinue`).send({})).status
    ).toBe(400);
    const disc = await request(app)
      .post(`/api/v1/diet-prescription/${id}/discontinue`)
      .send({ reason: 'transitioned to oral diet' });
    expect(disc.status).toBe(200);
    expect(disc.body.data.status).toBe('discontinued');
    const patch = await request(app)
      .patch(`/api/v1/diet-prescription/${id}`)
      .send({ notes: 'late edit' });
    expect(patch.status).toBe(409);
  });
});

describe('W861 — DELETE role gating', () => {
  it('forbids a dietitian from deleting (403)', async () => {
    const id = (await createRx()).body.data._id;
    const res = await request(app).delete(`/api/v1/diet-prescription/${id}`);
    expect(res.status).toBe(403);
    expect(await Rx.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createRx()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/diet-prescription/${id}`);
    expect(res.status).toBe(200);
    expect(await Rx.countDocuments({})).toBe(0);
  });
});
