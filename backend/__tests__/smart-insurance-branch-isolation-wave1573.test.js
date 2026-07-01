'use strict';

/**
 * smart-insurance-branch-isolation-wave1573.test.js — W1573
 *
 * routes/smart-insurance.routes.js scoped queries on the never-populated
 * `req.user.branchId` (W930) instead of `req.branchScope`/`branchFilter(req)`, and left
 * the `:id` reads/writes/adjudicate + eligibility/copay + eligibility-checks list
 * unscoped → cross-branch financial-PHI IDOR (policies, claims, prior-auth, coverage
 * amounts). All models are camelCase `branchId`. Fix: branchFilter(req) on every list +
 * `:id` query, ownership pre-check on eligibility/copay, effectiveBranchScope on creates,
 * strip branchId/beneficiaryId from PUT.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
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
jest.mock('../middleware/assertBranchMatch', () => ({
  bodyScopedBeneficiaryGuard: (_req, _res, next) => next(),
  effectiveBranchScope: req =>
    req.branchScope && req.branchScope.restricted ? req.branchScope.branchId : null,
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let Policy;
let Claim;
let Elig;
let polA;
let polB;
let claimB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1573-ins' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Policy = require('../models/InsurancePolicy');
  Claim = require('../models/SmartInsuranceClaim');
  Elig = require('../models/InsuranceEligibilityCheck');
  app = express();
  app.use(express.json());
  app.use('/api/smart-insurance', require('../routes/smart-insurance.routes'));

  const uid = () => String(new mongoose.Types.ObjectId()); // unique value for any unique index
  polA = (
    await Policy.collection.insertOne({ branchId: BRANCH_A, status: 'active', deletedAt: null, policyUuid: uid(), uuid: uid() })
  ).insertedId;
  polB = (
    await Policy.collection.insertOne({ branchId: BRANCH_B, status: 'active', deletedAt: null, policyUuid: uid(), uuid: uid() })
  ).insertedId;
  claimB = (
    await Claim.collection.insertOne({ branchId: BRANCH_B, status: 'submitted', deletedAt: null, claimUuid: uid(), uuid: uid() })
  ).insertedId;
  await Elig.collection.insertOne({ branchId: BRANCH_A, deletedAt: null, uuid: uid() });
  await Elig.collection.insertOne({ branchId: BRANCH_B, deletedAt: null, uuid: uid() });
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'insurance_officer' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1573 — smart-insurance branch isolation', () => {
  it('GET /policies/:id — restricted user 404s on a foreign-branch policy', async () => {
    const r = await request(app).get(`/api/smart-insurance/policies/${polB}`);
    expect(r.status).toBe(404);
  });

  it('GET /policies/:id — restricted user reads its own-branch policy', async () => {
    const r = await request(app).get(`/api/smart-insurance/policies/${polA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(polA));
  });

  it('GET /policies/:id — cross-branch role reads any policy', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/smart-insurance/policies/${polB}`);
    expect(r.status).toBe(200);
  });

  it('GET /policies — list scoped to caller branch', async () => {
    const r = await request(app).get('/api/smart-insurance/policies?per_page=100');
    expect(r.status).toBe(200);
    const ids = r.body.docs.map(d => String(d._id));
    expect(ids).toContain(String(polA));
    expect(ids).not.toContain(String(polB));
  });

  it('PATCH /claims/:id/adjudicate — restricted user 404s on a foreign-branch claim', async () => {
    const r = await request(app)
      .patch(`/api/smart-insurance/claims/${claimB}/adjudicate`)
      .send({ approved_amount: 999, status: 'approved' });
    expect(r.status).toBe(404);
  });

  it('POST /policies/:id/check-eligibility — restricted user 404s on a foreign policy (ownership pre-check)', async () => {
    const r = await request(app)
      .post(`/api/smart-insurance/policies/${polB}/check-eligibility`)
      .send({ service_type: 'general' });
    expect(r.status).toBe(404);
  });

  it('GET /eligibility-checks — list scoped to caller branch', async () => {
    const r = await request(app).get('/api/smart-insurance/eligibility-checks?per_page=100');
    expect(r.status).toBe(200);
    expect(r.body.docs.every(d => String(d.branchId) === String(BRANCH_A))).toBe(true);
    expect(r.body.total).toBe(1);
  });

  it('static: no req.user.branchId scoping + branchFilter used', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'smart-insurance.routes.js'), 'utf8');
    // only comment references may mention it; no `= req.user.branchId` / `|| req.user.branchId` code
    expect(src).not.toMatch(/query\.branchId = req\.user\.branchId/);
    expect(src).not.toMatch(/\|\| req\.user\.branchId/);
    expect((src.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(10);
  });
});
