'use strict';

/**
 * rehabilitation-advanced-branchid-wave1577.test.js — W1577
 *
 * routes/rehabilitation-advanced.routes.js (12 clinical sub-collections: behavior plans,
 * nutrition/medication/vocational/discharge etc.) already scopes every query with
 * branchFilter(req) and stamps body.branchId on create — but NONE of the 12 schemas in
 * models/rehabilitation-advanced.model.js declared a `branchId` field, so the injected
 * value was strict-mode-dropped and branchFilter({branchId:X}) matched ZERO docs
 * (restricted users saw nothing = broken feature; isolation architecturally absent).
 * W1577 adds `branchId` to all 12 schemas → the existing scoping becomes functional.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { _id: 'test-user', id: 'test-user', role: 'therapist' };
    next();
  },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: req =>
    req.branchScope && req.branchScope.restricted && req.branchScope.branchId
      ? { branchId: req.branchScope.branchId }
      : {},
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let BehaviorPlan;
let planA;
let planB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1577-rehab-adv' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ BehaviorPlan } = require('../models/rehabilitation-advanced.model'));
  app = express();
  app.use(express.json());
  app.use('/api/rehab-advanced', require('../routes/rehabilitation-advanced.routes'));

  const seed = branchId =>
    BehaviorPlan.collection.insertOne({
      branchId,
      beneficiary_id: new mongoose.Types.ObjectId(),
      plan_name: 'BIP',
      status: 'active',
    });
  planA = (await seed(BRANCH_A)).insertedId;
  planB = (await seed(BRANCH_B)).insertedId;
});

beforeEach(() => {
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/rehab-advanced/behavior-plans';

describe('W1577 — rehabilitation-advanced branchId isolation (schema field added)', () => {
  it('GET / — restricted user lists only own-branch behavior plans', async () => {
    const r = await request(app).get(`${base}?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(planA));
    expect(ids).not.toContain(String(planB)); // was: saw ALL (field absent → filter matched nothing → but broken)
  });

  it('GET /:id — restricted user 404s on a foreign-branch plan', async () => {
    const r = await request(app).get(`${base}/${planB}`);
    expect(r.status).toBe(404);
  });

  it('GET / — cross-branch role sees all branches', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`${base}?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(planB));
  });

  it('POST / — create stamps the caller branch (branchId now persists)', async () => {
    const r = await request(app)
      .post(base)
      .send({
        beneficiary_id: String(new mongoose.Types.ObjectId()),
        plan_name: 'new',
        start_date: new Date().toISOString(),
        status: 'active',
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A)); // field now declared → not dropped
  });

  it('static: all 12 schemas declare branchId', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'models', 'rehabilitation-advanced.model.js'),
      'utf8'
    );
    expect((src.match(/branchId: \{ type: Schema\.Types\.ObjectId, ref: 'Branch', index: true \}/g) || []).length).toBe(12);
  });
});
