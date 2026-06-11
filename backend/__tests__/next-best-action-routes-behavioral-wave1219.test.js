'use strict';

/**
 * next-best-action-routes-behavioral-wave1219.test.js — ROUTE-layer
 * behavioral coverage for the W1206 surface (service fusion covered by
 * wave1212). Real Express + real branch middlewares + MMS; auth mocked.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/next-best-action-routes-behavioral-wave1219.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
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
let app;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BEN_A = new mongoose.Types.ObjectId();
const BEN_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminUser = { id: String(new mongoose.Types.ObjectId()), role: 'admin' };

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1215-nba-routes' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');

  const Beneficiary = mongoose.model(
    'Beneficiary',
    new mongoose.Schema(
      { branchId: mongoose.Schema.Types.ObjectId, isDeleted: Boolean },
      { collection: 'beneficiaries_w1215_nba' }
    )
  );
  await Beneficiary.collection.insertOne({ _id: BEN_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BEN_B, branchId: BRANCH_B });

  // Register every model the 5-source fusion reads so degradedSources = [].
  require('../domains/goals/models/TherapeuticGoal');
  require('../domains/sessions/models/ClinicalSession');
  require('../domains/goals/models/MeasureAlert');
  require('../models/RiskSnapshot');
  require('../domains/episodes/models/EpisodeOfCare');

  app = express();
  app.use(express.json());
  app.use('/api/v1/next-best-action', require('../routes/next-best-action.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

describe('W1219 GET /next-best-action/catalogue', () => {
  test('200 — the 8 frozen NBA actions', async () => {
    const res = await request(app).get('/api/v1/next-best-action/catalogue');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.data.map(a => a.code)).toContain('ESCALATE_SAFETY');
  });
});

describe('W1219 GET /next-best-action/beneficiary/:id', () => {
  test('400 — malformed id', async () => {
    const res = await request(app).get('/api/v1/next-best-action/beneficiary/xyz');
    expect(res.status).toBe(400);
  });

  test('403 — cross-branch beneficiary denied (W269)', async () => {
    const res = await request(app).get(`/api/v1/next-best-action/beneficiary/${BEN_B}`);
    expect(res.status).toBe(403);
  });

  test('200 — same-branch compute returns the ranked envelope (empty system)', async () => {
    const res = await request(app).get(`/api/v1/next-best-action/beneficiary/${BEN_A}`);
    expect(res.status).toBe(200);
    expect(res.body.data.beneficiaryId).toBe(String(BEN_A));
    expect(Array.isArray(res.body.data.actions)).toBe(true);
    expect(res.body.data.summary.degradedSources).toEqual([]);
  });
});

describe('W1219 GET /next-best-action/caseload', () => {
  test('400 — cross-branch role must name a branch', async () => {
    mockAuthState.user = adminUser;
    const res = await request(app).get('/api/v1/next-best-action/caseload');
    expect(res.status).toBe(400);
  });

  test('200 — cross-branch role with explicit ?branchId', async () => {
    mockAuthState.user = adminUser;
    const res = await request(app).get(`/api/v1/next-best-action/caseload?branchId=${BRANCH_A}`);
    expect(res.status).toBe(200);
    expect(res.body.data.branchId).toBe(String(BRANCH_A));
    expect(res.body.data.scanned).toBe(1); // only BEN_A in branch A
  });

  test('403 — restricted caller requesting a FOREIGN ?branchId is denied at the middleware (W269)', async () => {
    const res = await request(app).get(`/api/v1/next-best-action/caseload?branchId=${BRANCH_B}`);
    expect(res.status).toBe(403);
  });

  test('200 — restricted caller without ?branchId is scoped to own branch', async () => {
    const res = await request(app).get('/api/v1/next-best-action/caseload');
    expect(res.status).toBe(200);
    expect(res.body.data.branchId).toBe(String(BRANCH_A));
  });
});
