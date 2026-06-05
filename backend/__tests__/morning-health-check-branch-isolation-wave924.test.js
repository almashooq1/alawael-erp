'use strict';

/**
 * morning-health-check-branch-isolation-wave924.test.js — W924.
 * PHI morning checks; pre-W924 requireBranchAccess was missing and instance
 * routes used bare findById (bodyScopedBeneficiaryGuard inert).
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
let MorningHealthCheck;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const today = new Date();

const nurseA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'nurse',
  name: 'الممرض',
  branchId: String(BRANCH_A),
};

let app;

function buildApp() {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/v1/morning-health-check', require('../routes/morning-health-check.routes'));
  return expressApp;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function seedCheck(branchId, beneficiaryId = BENE_A) {
  return MorningHealthCheck.create({
    beneficiaryId,
    branchId,
    date: startOfDay(today),
    decision: 'allow',
    checkTime: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w924-mhc' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  MorningHealthCheck = require('../models/MorningHealthCheck');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = nurseA;
});

afterEach(async () => {
  await MorningHealthCheck.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W924 — POST stamps caller branch', () => {
  it('POST / upserts with branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/v1/morning-health-check')
      .send({ beneficiaryId: String(BENE_A), decision: 'allow' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W924 — instance IDOR regression', () => {
  it('GET /:id returns 404 for foreign-branch row', async () => {
    const row = await seedCheck(BRANCH_B, BENE_B);
    const res = await request(app).get(`/api/v1/morning-health-check/${row._id}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /:id returns 404 for foreign-branch row', async () => {
    const row = await seedCheck(BRANCH_B, BENE_B);
    const res = await request(app)
      .patch(`/api/v1/morning-health-check/${row._id}`)
      .send({ reason: 'x' });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id returns 404 for foreign-branch row', async () => {
    const row = await seedCheck(BRANCH_B, BENE_B);
    const res = await request(app).delete(`/api/v1/morning-health-check/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W924 — GET /today branch-scoped', () => {
  it('only returns caller-branch checks', async () => {
    await seedCheck(BRANCH_A, BENE_A);
    await seedCheck(BRANCH_B, BENE_B);
    const res = await request(app).get('/api/v1/morning-health-check/today');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});
