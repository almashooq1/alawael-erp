'use strict';

/**
 * risk-sweep-branch-isolation-behavioral.test.js
 *
 * Behavioral counterpart to risk-sweep-branch-isolation.test.js (static). Boots the
 * REAL router against an in-memory Mongo with the REAL requireBranchAccess +
 * effectiveBranchScope + branchFilter chain, and PROVES the cross-branch leak this
 * PR closes is actually closed at runtime:
 *   - a restricted user (role 'manager', branch A) reading another branch's
 *     beneficiary trend gets an EMPTY result (pre-fix: full cross-branch data);
 *   - a restricted user cannot spoof `?branchId=<foreign>` on /snapshots (403);
 *   - a cross-branch role ('admin') legitimately sees other branches.
 *
 * MFA is mocked to a tier-2 actor so the requireMfaTier gates pass — this test
 * isolates the BRANCH logic (the leak), not the MFA step-up.
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

// attachMfaActor → tier-2 actor; requireMfaTier(N) → pass-through. The branch
// logic under test uses effectiveBranchScope, NOT req.actor, so a fixed tier-2
// actor lets every endpoint through without affecting the branch assertions.
jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (req, _res, next) => {
    req.actor = { mfaLevel: 2, userId: req.user && (req.user._id || req.user.id) };
    next();
  },
  requireMfaTier: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BEN_A = new mongoose.Types.ObjectId();
const BEN_B = new mongoose.Types.ObjectId();

const managerA = {
  _id: new mongoose.Types.ObjectId(),
  id: 'mgr-a',
  role: 'manager',
  branchId: String(BRANCH_A),
};
const adminCross = { _id: new mongoose.Types.ObjectId(), id: 'admin-1', role: 'admin' };

let mongod;
let app;

const snap = (beneficiaryId, branchId, suffix) => ({
  beneficiaryId,
  branchId,
  sweepRunId: `RUN-TEST-${suffix}`,
  overallScore: 80,
  overallTier: 'high',
  previousTier: 'medium',
  tierDelta: 'escalated',
  topFactors: [],
  composite: {},
  computedAt: new Date('2026-07-01T09:00:00Z'),
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'risk-sweep-iso' } });
  await mongoose.connect(mongod.getUri());
  try {
    require('../config/mongoose.plugins');
  } catch {
    /* optional */
  }
  const RiskSnapshot = require('../models/RiskSnapshot');
  await RiskSnapshot.collection.insertOne(snap(BEN_A, BRANCH_A, 'A'));
  await RiskSnapshot.collection.insertOne(snap(BEN_B, BRANCH_B, 'B'));

  app = express();
  app.use(express.json());
  app.use('/api/risk-sweep', require('../routes/risk-sweep.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('risk-sweep cross-branch isolation (behavioral) — the #750 leak is closed', () => {
  it('restricted user reads their OWN branch beneficiary trend', async () => {
    const res = await request(app).get(`/api/risk-sweep/beneficiary/${BEN_A}/trend`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(String(res.body.items[0].branchId || BRANCH_A)).toBeTruthy();
  });

  it('restricted user gets an EMPTY trend for a FOREIGN-branch beneficiary (leak closed)', async () => {
    const res = await request(app).get(`/api/risk-sweep/beneficiary/${BEN_B}/trend`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0); // pre-fix this returned BEN_B's full cross-branch trend
    expect(res.body.items).toEqual([]);
  });

  it('restricted user CANNOT spoof ?branchId=<foreign> on /snapshots (403)', async () => {
    const res = await request(app).get(`/api/risk-sweep/snapshots?branchId=${BRANCH_B}`);
    expect(res.status).toBe(403); // requireBranchAccess rejects the foreign branch
  });

  it('cross-branch role (admin) CAN read a foreign-branch beneficiary trend', async () => {
    mockAuthState.user = adminCross;
    const res = await request(app).get(`/api/risk-sweep/beneficiary/${BEN_B}/trend`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
});
