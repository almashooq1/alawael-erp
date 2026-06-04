'use strict';

/**
 * referrals-admin-branch-isolation-wave881.test.js — W881.
 * ReferralTracking carries branchId but admin analytics + instance paths
 * were unscoped. W881 mounts requireBranchAccess and branch-scopes all
 * queries/mutations. Real Express + real branchScope + MongoMemoryServer.
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
let ReferralTracking;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const marketingA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'marketing',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/referrals', require('../routes/referrals-admin.routes'));
  return app;
}

async function seed(branchId, overrides = {}) {
  return ReferralTracking.create({
    direction: 'incoming',
    status: 'pending',
    branchId,
    referralSource: 'مستشفى',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w881-referrals' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ReferralTracking = require('../models/ReferralTracking');
});

beforeEach(() => {
  mockAuthState.user = marketingA;
});

afterEach(async () => {
  await ReferralTracking.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W881 — POST / stamps caller branch', () => {
  it('creates row with branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/admin/referrals')
      .send({ direction: 'incoming', referralSource: 'عيادة' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W881 — GET / list branch isolation', () => {
  it('returns only caller-branch rows', async () => {
    await seed(BRANCH_A);
    await seed(BRANCH_B);
    const res = await request(buildApp()).get('/api/admin/referrals');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('W881 — GET /overview branch isolation', () => {
  it('summarizes caller-branch rows only', async () => {
    await seed(BRANCH_A);
    await seed(BRANCH_B);
    const res = await request(buildApp()).get('/api/admin/referrals/overview');
    expect(res.status).toBe(200);
    expect(res.body.both.total).toBe(1);
  });
});

describe('W881 — PATCH /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    const row = await seed(BRANCH_B);
    const res = await request(buildApp())
      .patch(`/api/admin/referrals/${row._id}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(404);
  });
});

describe('W881 — DELETE /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    mockAuthState.user = { ...marketingA, role: 'manager' };
    const row = await seed(BRANCH_B);
    const res = await request(buildApp()).delete(`/api/admin/referrals/${row._id}`);
    expect(res.status).toBe(404);
  });
});
