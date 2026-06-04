'use strict';

/**
 * hr-performance-branch-isolation-behavioral-wave837.test.js — W837.
 *
 * Behavioral counterpart to W834 assertEvaluationBranch hardening on
 * routes/hr/hr-performance.routes.js. Requires branchId on PerformanceEvaluation
 * (W837 schema additive) so cross-branch denial is real, not a no-op.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();
const EMPLOYEE = new mongoose.Types.ObjectId();
let PerformanceEvaluation;

function seed(branchId) {
  const start = new Date('2026-01-01');
  const end = new Date('2026-06-30');
  return PerformanceEvaluation.create({
    employeeId: EMPLOYEE,
    branchId,
    evaluationPeriod: { startDate: start, endDate: end },
    status: 'draft',
    summary: { overallRating: 'مقبول' },
    createdBy: ACTOR,
  });
}

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  });
  const { createHrPerformanceRouter } = require('../routes/hr/hr-performance.routes');
  a.use('/api/v1/hr/performance', createHrPerformanceRouter({ logger: console }));
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w837-hr-perf' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String, nameAr: String }));
  }
  PerformanceEvaluation = require('../models/PerformanceEvaluation');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W837 — hr-performance cross-branch isolation (behavioral)', () => {
  it('GET /evaluations/:id rejects malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/hr/performance/evaluations/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /evaluations/:id returns own-branch evaluation (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/hr/performance/evaluations/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /evaluations/:id denies foreign-branch evaluation with 403', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/hr/performance/evaluations/${foreign._id}`);
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });
});
