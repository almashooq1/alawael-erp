'use strict';

/**
 * nps-admin-branch-isolation-wave882.test.js — W882.
 * NpsResponse carries branchId but admin NPS dashboard + instance paths
 * were unscoped. W882 mounts requireBranchAccess and branch-scopes all
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
let NpsResponse;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const GUARDIAN = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/nps', require('../routes/nps-admin.routes'));
  return app;
}

async function seed(branchId, overrides = {}) {
  return NpsResponse.create({
    surveyKey: '2026-Q2',
    guardianId: GUARDIAN,
    branchId,
    score: 9,
    bucket: 'promoter',
    submittedAt: new Date(),
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w882-nps' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  NpsResponse = require('../models/NpsResponse');
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await NpsResponse.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W882 — POST / stamps caller branch', () => {
  it('creates response with branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/admin/nps')
      .send({ surveyKey: '2026-Q2', guardianId: String(GUARDIAN), score: 8 });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W882 — GET / list branch isolation', () => {
  it('returns only caller-branch responses', async () => {
    await seed(BRANCH_A);
    await seed(BRANCH_B);
    const res = await request(buildApp()).get('/api/admin/nps');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('W882 — GET /overview branch isolation', () => {
  it('summarizes caller-branch responses only', async () => {
    await seed(BRANCH_A, { score: 10, bucket: 'promoter' });
    await seed(BRANCH_B, { score: 0, bucket: 'detractor' });
    const res = await request(buildApp()).get('/api/admin/nps/overview');
    expect(res.status).toBe(200);
    expect(res.body.summary.sample).toBe(1);
    expect(res.body.summary.nps).toBe(100);
  });
});

describe('W882 — PATCH /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    const row = await seed(BRANCH_B);
    const res = await request(buildApp()).patch(`/api/admin/nps/${row._id}`).send({ comment: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('W882 — DELETE /:id branch isolation', () => {
  it('returns 404 for foreign-branch row (IDOR regression)', async () => {
    const row = await seed(BRANCH_B);
    const res = await request(buildApp()).delete(`/api/admin/nps/${row._id}`);
    expect(res.status).toBe(404);
  });
});
