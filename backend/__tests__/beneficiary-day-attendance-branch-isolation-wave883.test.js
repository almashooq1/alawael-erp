'use strict';

/**
 * beneficiary-day-attendance-branch-isolation-wave883.test.js — W883.
 * Pre-W883 bodyScopedBeneficiaryGuard was inert (no requireBranchAccess),
 * list/today/summary allowed ?branchId spoof, PATCH/DELETE used bare findById.
 * W883 mirrors W869 MAR pattern. Real Express + real branchScope + MongoMemoryServer.
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
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let BeneficiaryDayAttendance;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const receptionistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'receptionist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/beneficiary-day-attendance',
    require('../routes/beneficiary-day-attendance.routes')
  );
  return app;
}

async function seedRow(branchId, overrides = {}) {
  const status = overrides.status || 'present';
  const beneficiaryId = overrides.beneficiaryId || BENE_A;
  return BeneficiaryDayAttendance.create({
    beneficiaryId,
    branchId,
    date: new Date(),
    status,
    checkInTime: status === 'present' || status === 'late' ? new Date() : null,
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w883-day-att' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  BeneficiaryDayAttendance = require('../models/BeneficiaryDayAttendance');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
});

beforeEach(() => {
  mockAuthState.user = receptionistA;
});

afterEach(async () => {
  await BeneficiaryDayAttendance.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W883 — POST /check-in stamps caller branch', () => {
  it('upserts row with branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/beneficiary-day-attendance/check-in')
      .send({ beneficiaryId: String(BENE_A) });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W883 — GET /today branch isolation', () => {
  it('returns only caller-branch rows', async () => {
    const today = new Date();
    await seedRow(BRANCH_A, { date: today, beneficiaryId: BENE_A });
    await seedRow(BRANCH_B, { date: today, beneficiaryId: BENE_B });
    const res = await request(buildApp()).get('/api/v1/beneficiary-day-attendance/today');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('W883 — PATCH /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    mockAuthState.user = { ...receptionistA, role: 'manager' };
    const row = await seedRow(BRANCH_B, { beneficiaryId: BENE_B });
    const res = await request(buildApp())
      .patch(`/api/v1/beneficiary-day-attendance/${row._id}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('W883 — DELETE /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    mockAuthState.user = { ...receptionistA, role: 'manager' };
    const row = await seedRow(BRANCH_B, { beneficiaryId: BENE_B });
    const res = await request(buildApp()).delete(`/api/v1/beneficiary-day-attendance/${row._id}`);
    expect(res.status).toBe(404);
  });
});
