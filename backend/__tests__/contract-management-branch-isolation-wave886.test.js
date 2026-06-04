'use strict';

/** contract-management-branch-isolation-wave886.test.js — W886 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(role)) return next();
    return res.status(403).json({ success: false });
  },
}));

let mongod;
let Contract;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/contract-management', require('../routes/contract-management.routes'));
  return app;
}

async function seedContract(branchId) {
  const n = Math.random().toString(36).slice(2, 8).toUpperCase();
  return Contract.collection.insertOne({
    contractNumber: `CNT-2026-${n}`,
    contractTitle: 'عقد',
    contractType: 'SERVICE_AGREEMENT',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 365),
    status: 'DRAFT',
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w886-contracts' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Contract = require('../models/Contract.model');
  await Contract.init();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Contract.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W886 — POST /contracts stamps caller branch', () => {
  it('creates contract with branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/contract-management/contracts')
      .send({
        contractTitle: 'عقد جديد',
        contractType: 'SERVICE_AGREEMENT',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        liabilityInsurance: 'covered',
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W886 — GET /contracts list isolation', () => {
  it('returns only caller-branch contracts', async () => {
    await seedContract(BRANCH_A);
    await seedContract(BRANCH_B);
    const res = await request(buildApp()).get('/api/v1/contract-management/contracts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('W886 — GET /contracts/:id isolation', () => {
  it('returns 404 for foreign-branch contract (IDOR regression)', async () => {
    const { insertedId } = await seedContract(BRANCH_B);
    const res = await request(buildApp()).get(
      `/api/v1/contract-management/contracts/${insertedId}`
    );
    expect(res.status).toBe(404);
  });
});

describe('W886 — PUT /contracts/:id isolation', () => {
  it('returns 404 for foreign-branch contract (IDOR regression)', async () => {
    const { insertedId } = await seedContract(BRANCH_B);
    const res = await request(buildApp())
      .put(`/api/v1/contract-management/contracts/${insertedId}`)
      .send({ contractTitle: 'x' });
    expect(res.status).toBe(404);
  });
});
