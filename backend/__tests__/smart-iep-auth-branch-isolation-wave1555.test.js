'use strict';

/**
 * smart-iep-auth-branch-isolation-wave1555.test.js — W1555
 *
 * Guards the fix for a P0: /api/smart-iep/* was mounted via safeMount (no auth
 * middleware) with no router-level auth, exposing special-category student PHI
 * (IEP present-levels, disability, behavioral ABC logs, parent consent)
 * ANONYMOUSLY across all branches. Fix: router.use(authenticate) +
 * router.use(requireBranchAccess) + a snake-case branchScope(req) spread into
 * every SmartIEP query (restricted users forced to their own branch).
 *
 * Static guard locks the auth mount (regression protection for the anonymous
 * fix); behavioral (mocked auth + scope) proves the branch isolation.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: { _id: new mongoose.Types.ObjectId(), role: 'manager' } };
const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
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
const benA = new mongoose.Types.ObjectId();
const benB = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let SmartIEP;
let iepB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1555-iep' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ SmartIEP } = require('../models/SmartIEP'));
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User', 'Employee']) {
    if (!mongoose.models[n]) mongoose.model(n, stub);
  }
  app = express();
  app.use(express.json());
  app.use('/api/smart-iep', require('../rehabilitation-services/smart-iep-routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const seed = async over => {
    const r = await SmartIEP.collection.insertOne({
      iep_number: 'IEP-W1555-' + Math.random().toString(36).slice(2, 9),
      status: 'active',
      annual_goals: [],
      ...over,
    });
    return r.insertedId;
  };
  await seed({ branch_id: BRANCH_A, beneficiary_id: benA });
  iepB = await seed({ branch_id: BRANCH_B, beneficiary_id: benB });
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1555 — smart-iep auth + branch isolation', () => {
  it('GET /iep — restricted user sees ONLY its own-branch plans', async () => {
    const r = await request(app).get('/api/smart-iep/iep');
    expect(r.status).toBe(200);
    const branches = r.body.data.map(p => String(p.branch_id));
    expect(branches).toContain(String(BRANCH_A));
    expect(branches).not.toContain(String(BRANCH_B));
  });

  it('GET /iep — cross-branch role sees all branches', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get('/api/smart-iep/iep');
    expect(r.status).toBe(200);
    const branches = r.body.data.map(p => String(p.branch_id));
    expect(branches).toContain(String(BRANCH_A));
    expect(branches).toContain(String(BRANCH_B));
  });

  it('GET /iep/:id — restricted user 404s on a foreign-branch plan', async () => {
    const r = await request(app).get(`/api/smart-iep/iep/${iepB}`);
    expect(r.status).toBe(404);
  });

  it('GET /iep/beneficiary/:id — restricted user gets no foreign-branch plans', async () => {
    const r = await request(app).get(`/api/smart-iep/iep/beneficiary/${benB}`);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(0); // benB's plan is in branch B → excluded
  });

  it('static: router requires authentication + branch scope on every IEP query', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'rehabilitation-services', 'smart-iep-routes.js'),
      'utf8'
    );
    expect(src).toMatch(/router\.use\(authenticate\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect((src.match(/branchScope\(req/g) || []).length).toBeGreaterThanOrEqual(8);
    expect(src).not.toMatch(/SmartIEP\.findById\(/); // all converted to scoped findOne
  });
});
