'use strict';

/**
 * mdt-transition-quality-branch-isolation-wave1557.test.js — W1557
 *
 * W1556 closed ANONYMOUS access on this clinical router; W1557 adds per-query branch
 * isolation (the authenticated cross-branch IDOR that remained). MDTMeeting (MDT
 * clinical decisions, family concerns), TransitionPlan (transition reports, family
 * consent) and QualityKPI all carry snake_case branch_id; every read/update/lifecycle
 * query was keyed only on _id/beneficiary_id with no branch scope, and create trusted
 * client branch_id. Fix: branchScope(req) on every query + stamp branch_id from caller
 * on create.
 *
 * Behavioral (mocked auth + scope): foreign-branch read/write → 404; own → 200; list
 * scoped; create forced to caller's branch. + static guard.
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
let MDT;
let TP;
let mdtA;
let mdtB;
let planB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1557-mdt' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  app = express();
  app.use(express.json());
  app.use('/api/rehab-operations', require('../rehabilitation-services/mdt-transition-quality'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  MDT = mongoose.model('MdtQualityMDTMeeting');
  TP = mongoose.model('TransitionPlan');

  const seedMdt = async branch_id =>
    (
      await MDT.collection.insertOne({
        beneficiary_id: branch_id === BRANCH_A ? benA : benB,
        branch_id,
        meeting_type: 'quarterly_review',
        meeting_date: new Date(),
        status: 'scheduled',
      })
    ).insertedId;
  mdtA = await seedMdt(BRANCH_A);
  mdtB = await seedMdt(BRANCH_B);
  planB = (
    await TP.collection.insertOne({
      beneficiary_id: benB,
      branch_id: BRANCH_B,
      transition_type: 'discharge',
      readiness_checklist: [],
    })
  ).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1557 — mdt-transition-quality branch isolation', () => {
  it('GET /mdt/meetings/:id — restricted user 404s on a foreign-branch meeting', async () => {
    const r = await request(app).get(`/api/rehab-operations/mdt/meetings/${mdtB}`);
    expect(r.status).toBe(404);
  });

  it('GET /mdt/meetings/:id — restricted user reads its own-branch meeting', async () => {
    const r = await request(app).get(`/api/rehab-operations/mdt/meetings/${mdtA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(mdtA));
  });

  it('GET /mdt/meetings/:id — cross-branch role reads any meeting', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/rehab-operations/mdt/meetings/${mdtB}`);
    expect(r.status).toBe(200);
  });

  it('PATCH /mdt/meetings/:id — restricted user 404s writing a foreign-branch meeting', async () => {
    const r = await request(app)
      .patch(`/api/rehab-operations/mdt/meetings/${mdtB}`)
      .send({ status: 'completed' });
    expect(r.status).toBe(404);
  });

  it('GET /mdt/meetings/beneficiary/:id — restricted user gets no foreign-branch meetings', async () => {
    const r = await request(app).get(`/api/rehab-operations/mdt/meetings/beneficiary/${benB}`);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(0);
  });

  it('POST /mdt/meetings — create is forced to the caller branch (client branch_id ignored)', async () => {
    const r = await request(app).post('/api/rehab-operations/mdt/meetings').send({
      beneficiary_id: String(benA),
      branch_id: String(BRANCH_B), // attacker tries to plant in another branch
      meeting_type: 'crisis',
      meeting_date: new Date().toISOString(),
    });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branch_id)).toBe(String(BRANCH_A));
  });

  it('GET /transition/plans/:id — restricted user 404s on a foreign-branch plan', async () => {
    const r = await request(app).get(`/api/rehab-operations/transition/plans/${planB}`);
    expect(r.status).toBe(404);
  });

  it('static: every MDT/TransitionPlan/KPI query scopes by branch', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'rehabilitation-services', 'mdt-transition-quality.js'),
      'utf8'
    );
    expect((src.match(/branchScope\(req/g) || []).length).toBeGreaterThanOrEqual(10);
    expect(src).not.toMatch(/\.findById\(/);
    expect(src).not.toMatch(/\.findByIdAndUpdate\(/);
  });
});
