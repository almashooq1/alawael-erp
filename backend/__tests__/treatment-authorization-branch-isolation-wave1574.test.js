'use strict';

/**
 * treatment-authorization-branch-isolation-wave1574.test.js — W1574
 *
 * routes/treatmentAuthorization.routes.js exposed every :id read/write/action + the list
 * with NO branch scope (the service never read req.branchScope). The model's branch field
 * is `branch` (NOT branchId/branch_id → branchFilter would be a phantom no-op). Any authed
 * AUTH_ROLES user (incl. restricted therapist/social_worker/insurance_officer) could read/
 * edit/submit/appeal another branch's insurance pre-auth PHI (national IDs, medical
 * justifications, policy #). Fix: enforceAuthzBranch middleware (loads doc, asserts `branch`
 * via effectiveBranchScope, runs AFTER requireBranchAccess) on all 9 :id routes + scope the
 * list/dashboard.
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
  authenticateToken: (req, _res, next) => {
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
  branchFilter: () => ({}),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let TA;
let taA;
let taB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1574-ta' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  TA = require('../models/treatmentAuthorization.model').TreatmentAuthorization;
  // getRequestById populates beneficiary(→Beneficiary) + createdBy/workflow.*/auditLog.by(→User)
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User']) if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use('/api/v1/treatment-authorization', require('../routes/treatmentAuthorization.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const seed = branch =>
    TA.collection.insertOne({
      branch,
      isDeleted: false,
      status: 'draft',
      authorizationNumber: 'TA-' + Math.random().toString(36).slice(2, 10),
      beneficiaryName: 'X',
      nationalId: '1' + Math.floor(Math.random() * 1e9),
    });
  taA = (await seed(BRANCH_A)).insertedId;
  taB = (await seed(BRANCH_B)).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: String(new mongoose.Types.ObjectId()), role: 'therapist' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/v1/treatment-authorization';

describe('W1574 — treatment-authorization branch isolation', () => {
  it('GET /:id — restricted user 403s on a foreign-branch authorization', async () => {
    const r = await request(app).get(`${base}/${taB}`);
    expect(r.status).toBe(403);
  });

  it('GET /:id — restricted user reads its own-branch authorization', async () => {
    const r = await request(app).get(`${base}/${taA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(taA));
  });

  it('GET /:id — cross-branch role reads any authorization', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`${base}/${taB}`);
    expect(r.status).toBe(200);
  });

  it('PUT /:id — restricted user 403s on a foreign-branch authorization', async () => {
    const r = await request(app).put(`${base}/${taB}`).send({ priority: 'high' });
    expect(r.status).toBe(403);
  });

  it('POST /:id/submit-review — restricted user 403s on a foreign-branch authorization', async () => {
    const r = await request(app).post(`${base}/${taB}/submit-review`).send({});
    expect(r.status).toBe(403);
  });

  it('GET / — list scoped to caller branch', async () => {
    const r = await request(app).get(base);
    expect(r.status).toBe(200);
    const ids = r.body.data.requests.map(x => String(x._id));
    expect(ids).toContain(String(taA));
    expect(ids).not.toContain(String(taB));
  });

  it('static: enforceAuthzBranch on 9 :id routes + list scoped on `branch`', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'treatmentAuthorization.routes.js'), 'utf8');
    expect((src.match(/^ {2}enforceAuthzBranch,/gm) || []).length).toBeGreaterThanOrEqual(9);
    expect(src).toMatch(/enforceAuthzBranch = asyncHandler/);
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'treatmentAuthorization.service.js'), 'utf8');
    expect(svc).toMatch(/if \(branchScope\) query\.branch = branchScope/);
  });
});
