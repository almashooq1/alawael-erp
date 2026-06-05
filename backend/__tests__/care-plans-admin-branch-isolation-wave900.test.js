'use strict';

/** care-plans-admin-branch-isolation-wave900.test.js — W900 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/piiAccess.middleware', () => () => (_req, _res, next) => next());

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const PLAN_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/care-plans', require('../routes/care-plans-admin.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w900-care-plans' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const CarePlan = require('../models/CarePlan');
  await CarePlan.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    planNumber: 'CP-A-001',
    beneficiary: BENE_A,
    branchId: BRANCH_A,
    startDate: new Date(),
    status: 'ACTIVE',
  });
  await CarePlan.collection.insertOne({
    _id: PLAN_B,
    planNumber: 'CP-B-001',
    beneficiary: new mongoose.Types.ObjectId(),
    branchId: BRANCH_B,
    startDate: new Date(),
    status: 'ACTIVE',
  });
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W900 — GET / list isolation', () => {
  it('lists only care plans in caller branch', async () => {
    const res = await request(buildApp()).get('/api/admin/care-plans');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId || BRANCH_A)).toBe(String(BRANCH_A));
  });
});

describe('W900 — GET /:id isolation', () => {
  it('returns 404 for foreign-branch plan', async () => {
    const res = await request(buildApp()).get(`/api/admin/care-plans/${PLAN_B}`);
    expect(res.status).toBe(404);
  });
});
