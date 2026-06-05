'use strict';

/** equity-outcome-benchmarking-wave897.test.js — W897 */

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
let OutcomeBenchmark;
let ClinicalAssessment;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const supervisorA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'supervisor',
  branchId: String(BRANCH_A),
};
const adminUser = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'admin',
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/equity', require('../routes/equity.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w897-equity-benchmarking' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  OutcomeBenchmark = require('../models/OutcomeBenchmark');
  ClinicalAssessment = require('../models/ClinicalAssessment');
});

beforeEach(async () => {
  mockAuthState.user = supervisorA;
  await OutcomeBenchmark.deleteMany({});
  await ClinicalAssessment.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

async function seedBenchmarks() {
  await OutcomeBenchmark.create({
    scope: 'national',
    metricKind: 'gas_avg_tscore',
    centralTendency: 55,
    targetValue: 60,
    targetDirection: 'higher_better',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    status: 'published',
  });
  await OutcomeBenchmark.create({
    scope: 'branch',
    branchId: BRANCH_A,
    metricKind: 'gas_avg_tscore',
    centralTendency: 68,
    targetValue: 70,
    targetDirection: 'higher_better',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    status: 'published',
  });
  await OutcomeBenchmark.create({
    scope: 'branch',
    branchId: BRANCH_B,
    metricKind: 'gas_avg_tscore',
    centralTendency: 40,
    targetValue: 45,
    targetDirection: 'higher_better',
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-03-31'),
    status: 'published',
  });
}

async function seedAssessments() {
  const recent = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  await ClinicalAssessment.create({
    beneficiary: new mongoose.Types.ObjectId(),
    branchId: BRANCH_A,
    tool: 'GAS',
    assessmentDate: recent,
    score: 72,
  });
  await ClinicalAssessment.create({
    beneficiary: new mongoose.Types.ObjectId(),
    branchId: BRANCH_A,
    tool: 'GAS',
    assessmentDate: recent,
    score: 68,
  });
  await ClinicalAssessment.create({
    beneficiary: new mongoose.Types.ObjectId(),
    branchId: BRANCH_B,
    tool: 'GAS',
    assessmentDate: recent,
    score: 20,
  });
}

describe('W897 — benchmark list isolation', () => {
  it('restricted supervisor sees national + own branch benchmarks only', async () => {
    await seedBenchmarks();
    const res = await request(buildApp()).get(
      '/api/v1/equity/benchmarks?metricKind=gas_avg_tscore'
    );
    expect(res.status).toBe(200);
    const branchBenchmarks = res.body.items.filter(x => x.scope === 'branch');
    expect(branchBenchmarks).toHaveLength(1);
    expect(String(branchBenchmarks[0].branchId)).toBe(String(BRANCH_A));
    expect(res.body.items.some(x => x.scope === 'national')).toBe(true);
  });

  it('cross-branch admin can list benchmarks from other branches', async () => {
    await seedBenchmarks();
    mockAuthState.user = adminUser;
    const res = await request(buildApp()).get('/api/v1/equity/benchmarks?scope=branch');
    expect(res.status).toBe(200);
    const branchIds = res.body.items.map(x => String(x.branchId));
    expect(branchIds).toEqual(expect.arrayContaining([String(BRANCH_A), String(BRANCH_B)]));
  });
});

describe('W897 — benchmark compare endpoint', () => {
  it('computes branch outcome gap against published benchmark', async () => {
    await seedBenchmarks();
    await seedAssessments();
    const res = await request(buildApp()).get(
      '/api/v1/equity/benchmarks/compare?metricKind=gas_avg_tscore'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.observations).toBe(2);
    expect(res.body.data.observedMean).toBe(70);
    expect(res.body.data.benchmark.scope).toBe('branch');
    expect(res.body.data.targetValue).toBe(70);
    expect(res.body.data.gap).toBe(0);
    expect(res.body.data.meetsTarget).toBe(true);
    expect(res.body.data.gapBand).toBe('aligned');
  });

  it('denies foreign branch compare for restricted user', async () => {
    await seedBenchmarks();
    const res = await request(buildApp()).get(
      `/api/v1/equity/benchmarks/compare?branchId=${String(BRANCH_B)}`
    );
    expect(res.status).toBe(403);
  });
});
