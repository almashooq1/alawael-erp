'use strict';

/**
 * mar-routes-branch-isolation-wave869.test.js — W869.
 *
 * Cross-branch IDOR fix + behavioral coverage for the Medication Administration
 * Record (MAR) surface. Pre-W869 mar.routes.js mounted bodyScopedBeneficiaryGuard
 * (W441) but NOT requireBranchAccess, so req.branchScope was never set → the
 * guard was inert AND the instance endpoints used bare findById: a nurse in
 * branch A could read/administer/refuse/hold/delete medication records for ANY
 * branch's beneficiary. W869 mounts requireBranchAccess, stamps branchId on
 * create, and branch-scopes every instance lookup. Real Express + real
 * branchScope + MongoMemoryServer; only auth mocked.
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
let MAR;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const NURSE_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const nurseA = {
  id: String(NURSE_A),
  _id: NURSE_A,
  role: 'nurse',
  name: 'الممرض',
  branchId: String(BRANCH_A),
};
const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  name: 'المدير',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/mar', require('../routes/mar.routes'));
  return app;
}

let app;

function dosePayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    medicationName: 'باراسيتامول',
    dose: '500mg',
    scheduledTime: new Date().toISOString(),
    ...overrides,
  };
}

async function seedDose(branchId, beneficiaryId, overrides = {}) {
  return MAR.create({
    beneficiaryId,
    branchId,
    medicationName: 'دواء',
    date: new Date(),
    scheduledTime: new Date(),
    status: 'scheduled',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w869-mar' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  MAR = require('../models/MedicationAdministrationRecord');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA; // manager can schedule (ADMIN_ROLES) + read
});

afterEach(async () => {
  await MAR.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W869 — schedule a dose stamps the caller branch', () => {
  it('creates a scheduled dose with the caller branch (201)', async () => {
    const res = await request(app).post('/api/v1/mar').send(dosePayload());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('rejects scheduling for a foreign-branch beneficiary (403 via active guard)', async () => {
    const res = await request(app)
      .post('/api/v1/mar')
      .send(dosePayload({ beneficiaryId: String(BENE_B) }));
    expect(res.status).toBe(403);
    expect(await MAR.countDocuments({})).toBe(0);
  });

  it('rejects a dose with no medication name (400)', async () => {
    const res = await request(app)
      .post('/api/v1/mar')
      .send(dosePayload({ medicationName: '' }));
    expect(res.status).toBe(400);
  });
});

describe('W869 — cross-branch isolation on instance endpoints', () => {
  it('administer 404s a foreign-branch MAR (was an IDOR write of a med record)', async () => {
    const foreign = await seedDose(BRANCH_B, BENE_B);
    mockAuthState.user = nurseA;
    const res = await request(app).post(`/api/v1/mar/${foreign._id}/administer`).send({});
    expect(res.status).toBe(404);
    expect((await MAR.findById(foreign._id).lean()).status).toBe('scheduled');
  });

  it('refuse / hold / patch / delete all 404 across branches', async () => {
    const foreign = await seedDose(BRANCH_B, BENE_B);
    const fid = foreign._id;
    expect(
      (await request(app).post(`/api/v1/mar/${fid}/refuse`).send({ refusalReason: 'x' })).status
    ).toBe(404);
    expect((await request(app).post(`/api/v1/mar/${fid}/hold`).send({ notes: 'x' })).status).toBe(
      404
    );
    expect((await request(app).patch(`/api/v1/mar/${fid}`).send({ dose: '1g' })).status).toBe(404);
    expect((await request(app).delete(`/api/v1/mar/${fid}`)).status).toBe(404);
    expect(await MAR.countDocuments({})).toBe(1); // foreign survived
  });

  it('GET /by-beneficiary only returns caller-branch rows', async () => {
    await seedDose(BRANCH_A, BENE_A);
    await seedDose(BRANCH_B, BENE_A); // same beneficiary id, foreign branch row
    const res = await request(app).get(`/api/v1/mar/by-beneficiary/${BENE_A}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W869 — same-branch lifecycle works', () => {
  it('administer marks a scheduled dose administered', async () => {
    const m = await seedDose(BRANCH_A, BENE_A);
    mockAuthState.user = nurseA;
    const res = await request(app).post(`/api/v1/mar/${m._id}/administer`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('administered');
    expect(res.body.data.actualTime).toBeTruthy();
  });

  it('a controlled drug requires a witness to administer (400)', async () => {
    const m = await seedDose(BRANCH_A, BENE_A, { isControlled: true });
    mockAuthState.user = nurseA;
    const res = await request(app).post(`/api/v1/mar/${m._id}/administer`).send({});
    expect(res.status).toBe(400);
    const ok = await request(app)
      .post(`/api/v1/mar/${m._id}/administer`)
      .send({ witnessedByName: 'ممرضة أخرى' });
    expect(ok.status).toBe(200);
  });

  it('refuse requires a reason then marks refused', async () => {
    const m = await seedDose(BRANCH_A, BENE_A);
    mockAuthState.user = nurseA;
    expect((await request(app).post(`/api/v1/mar/${m._id}/refuse`).send({})).status).toBe(400);
    const res = await request(app)
      .post(`/api/v1/mar/${m._id}/refuse`)
      .send({ refusalReason: 'المريض رفض' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('refused');
  });
});
