'use strict';

/**
 * calibration-routes-branch-isolation-wave873.test.js — W873.
 *
 * CalibrationAsset carries branchId. Pre-W873 GET /:id lacked
 * requireBranchAccess and every mutation used bare _load(id) — a facility
 * manager in branch A could read/record-calibration/retire branch-B assets
 * (JCI/MOH register) by ObjectId guess. W873 threads branchFilter through
 * the service + routes. Real Express + real branchScope + MongoMemoryServer.
 */

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
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (_req, _res, next) => next(),
  requireMfaTier: () => (_req, _res, next) => next(),
}));

let mongod;
let CalibrationAsset;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'facility_manager',
  name: 'مدير المرافق',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/calibration', require('../routes/calibration.routes'));
  return app;
}

let app;

async function seedAsset(branchId, overrides = {}) {
  return CalibrationAsset.create({
    name: 'ميزان',
    type: 'scale',
    branchId,
    status: 'active',
    createdBy: USER_A,
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w873-cal' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  CalibrationAsset = require('../models/quality/CalibrationAsset.model');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await CalibrationAsset.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W873 — register stamps caller branch', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/v1/calibration')
      .send({ name: 'ترمومتر', type: 'thermometer' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W873 — GET /:id branch isolation', () => {
  it('returns 200 for same-branch asset', async () => {
    const row = await seedAsset(BRANCH_A);
    const res = await request(app).get(`/api/v1/calibration/${row._id}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 for foreign-branch asset (IDOR regression)', async () => {
    const row = await seedAsset(BRANCH_B);
    const res = await request(app).get(`/api/v1/calibration/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W873 — recordCalibration 404 across branches', () => {
  it('POST /:id/calibrations → 404 on foreign branch', async () => {
    const row = await seedAsset(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/calibration/${row._id}/calibrations`)
      .send({ outcome: 'pass' });
    expect(res.status).toBe(404);
  });
});
