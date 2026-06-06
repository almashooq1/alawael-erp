'use strict';

/**
 * referral-routes-branch-isolation-wave973.test.js — W973.
 *
 * Pre-W973 routes/referral.routes.js scoped its list via `{ branch: req.user.branch }`
 * — a field the JWT + W930 enrichment NEVER populate (only req.user.branchId is) —
 * so every restricted user's referral list filtered by `undefined` and LEAKED every
 * branch's referrals (beneficiary PHI + clinical reason). W973 wires the list +
 * fhir-logs filters to a local `referralBranchFilter(req)` (the telehealth template:
 * branchFilter → {branch}) and the create/import/analytics sites to
 * effectiveBranchScope(req). This test proves the LIST is branch-scoped using a
 * branchId-only user (the production condition). Real Express + real branchScope +
 * MongoMemoryServer; only auth mocked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { v4: uuidv4 } = require('uuid');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
let Referral;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

// branchId-only — replicates production (the legacy `branch` field is never set).
const doctorA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'doctor',
  branchId: String(BRANCH_A),
};
const superAdmin = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'super_admin',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/referrals', require('../routes/referral.routes'));
  return app;
}

let app;
let counter = 0;
async function seedReferral(branch) {
  counter += 1;
  return Referral.collection.insertOne({
    uuid: uuidv4(),
    branch,
    referralNumber: `REF-${counter}-${Date.now()}`,
    status: 'pending',
    priority: 'routine',
    priorityScore: 1,
    createdAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w973-referral' } });
  await mongoose.connect(mongod.getUri());
  Referral = require('../models/Referral').Referral;
  await Referral.init(); // build indexes deterministically (avoid the unique-index race)
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = doctorA;
});

afterEach(async () => {
  await Referral.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W973 — referral list is branch-scoped (was leaking all branches)', () => {
  it('a restricted (branchId-only) user sees ONLY their branch referrals', async () => {
    mockAuthState.user = doctorA;
    await seedReferral(BRANCH_A);
    await seedReferral(BRANCH_B);
    const res = await request(app).get('/api/referrals');
    expect(res.status).toBe(200);
    const branches = (res.body.data || []).map(r => String(r.branch));
    expect(branches).toContain(String(BRANCH_A));
    expect(branches).not.toContain(String(BRANCH_B)); // pre-W973: leaked both (filter by undefined)
  });

  it('a cross-branch super_admin sees ALL referrals', async () => {
    mockAuthState.user = superAdmin;
    await seedReferral(BRANCH_A);
    await seedReferral(BRANCH_B);
    const res = await request(app).get('/api/referrals');
    expect(res.status).toBe(200);
    const branches = (res.body.data || []).map(r => String(r.branch));
    expect(branches).toEqual(expect.arrayContaining([String(BRANCH_A), String(BRANCH_B)]));
  });
});
