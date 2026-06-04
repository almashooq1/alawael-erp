'use strict';

/**
 * toileting-routes-branch-isolation-wave879.test.js — W879.
 * ToiletingEvent carries branchId; pre-W879 PATCH/DELETE used bare findById
 * and requireBranchAccess was missing (bodyScopedBeneficiaryGuard inert).
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
let ToiletingEvent;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();

const caregiverA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'caregiver',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/toileting', require('../routes/toileting.routes'));
  return app;
}

async function seedEvent(branchId) {
  return ToiletingEvent.create({
    beneficiaryId: BENE_A,
    branchId,
    date: new Date(),
    eventTime: new Date(),
    type: 'wet',
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w879-toilet' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ToiletingEvent = require('../models/ToiletingEvent');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
});

beforeEach(() => {
  mockAuthState.user = caregiverA;
});

afterEach(async () => {
  await ToiletingEvent.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W879 — create stamps caller branch', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/toileting')
      .send({ beneficiaryId: String(BENE_A), type: 'wet' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W879 — PATCH /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    const row = await seedEvent(BRANCH_B);
    const res = await request(buildApp())
      .patch(`/api/v1/toileting/${row._id}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('W879 — GET /today branch-scoped', () => {
  it('only returns caller-branch events', async () => {
    await seedEvent(BRANCH_A);
    await seedEvent(BRANCH_B);
    const res = await request(buildApp()).get('/api/v1/toileting/today');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
