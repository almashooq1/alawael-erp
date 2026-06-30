'use strict';

/**
 * smart-iep-sessionlog-branch-isolation-wave1560.test.js — W1560
 *
 * Guards the branch-scoping deferred from W1555 on the SessionLog + report/analyze
 * surface of /api/smart-iep (model SessionLog, snake_case branch_id):
 *  - GET /sessions/beneficiary/:id ran a DIRECT unscoped SessionLog.find({beneficiary_id})
 *    → any authenticated user could read another branch's session logs (PHI: ABC records,
 *    beneficiary_state, family comms) by beneficiary id.
 *  - GET /sessions/beneficiary/:id/analytics delegated to getSessionAnalytics (unscoped find).
 *  - GET /iep/:id/report + POST /iep/:id/analyze loaded a SmartIEP by id with no branch check.
 *  - POST /sessions trusted body.branch_id (cross-branch planting).
 *
 * Fix: branchScope(req) spread into the session reads, threaded into getSessionAnalytics
 * (optional scope param, default {} keeps internal callers unscoped), an ownership gate
 * (SmartIEP.exists scoped → 404) on report/analyze, and branch_id forced from scope on create.
 *
 * Same merge class as W1555/W1557/W1558 — restrictive scoping, no authed-role behavior broken.
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
let SessionLog;
let iepB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1560-sl' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ SmartIEP, SessionLog } = require('../models/SmartIEP'));
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User', 'Employee', 'Branch']) {
    if (!mongoose.models[n]) mongoose.model(n, stub);
  }
  app = express();
  app.use(express.json());
  app.use('/api/smart-iep', require('../rehabilitation-services/smart-iep-routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const recent = new Date();
  await SessionLog.collection.insertMany([
    { beneficiary_id: benA, therapist_id: mockUser.u._id, branch_id: BRANCH_A, session_date: recent, goals_worked: [] },
    { beneficiary_id: benB, therapist_id: mockUser.u._id, branch_id: BRANCH_B, session_date: recent, goals_worked: [] },
    { beneficiary_id: benB, therapist_id: mockUser.u._id, branch_id: BRANCH_B, session_date: recent, goals_worked: [] },
  ]);
  const seedIep = async over => {
    const r = await SmartIEP.collection.insertOne({
      iep_number: 'IEP-W1560-' + Math.random().toString(36).slice(2, 9),
      status: 'active',
      annual_goals: [],
      plan_period: { start_date: new Date(), end_date: new Date() },
      ...over,
    });
    return r.insertedId;
  };
  await seedIep({ branch_id: BRANCH_A, beneficiary_id: benA });
  iepB = await seedIep({ branch_id: BRANCH_B, beneficiary_id: benB });
});

beforeEach(() => {
  // keep mockUser.u stable across tests — its id is the therapist on the seeds
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1560 — smart-iep SessionLog + report/analyze branch isolation', () => {
  it('GET /sessions/beneficiary/:id — restricted user gets NO foreign-branch sessions', async () => {
    const r = await request(app).get(`/api/smart-iep/sessions/beneficiary/${benB}`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(0); // benB's 2 sessions are in branch B → excluded for a branch-A user
    expect(r.body.data.length).toBe(0);
  });

  it('GET /sessions/beneficiary/:id — cross-branch role sees the foreign sessions', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/smart-iep/sessions/beneficiary/${benB}`);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(2);
  });

  it('GET /sessions/:id/analytics — restricted user analytics exclude foreign-branch sessions', async () => {
    const r = await request(app).get(`/api/smart-iep/sessions/beneficiary/${benB}/analytics`);
    expect(r.status).toBe(200);
    expect(r.body.data.analytics).toBeNull(); // 0 in-scope sessions → null analytics
  });

  it('GET /iep/:id/report — restricted user 404s on a foreign-branch plan', async () => {
    const r = await request(app).get(`/api/smart-iep/iep/${iepB}/report`);
    expect(r.status).toBe(404);
  });

  it('POST /iep/:id/analyze — restricted user 404s on a foreign-branch plan', async () => {
    const r = await request(app).post(`/api/smart-iep/iep/${iepB}/analyze`).send({});
    expect(r.status).toBe(404);
  });

  it('POST /sessions — branch_id is forced to the caller scope (forged foreign value ignored)', async () => {
    const r = await request(app)
      .post('/api/smart-iep/sessions')
      .send({
        iep_id: new mongoose.Types.ObjectId().toString(),
        beneficiary_id: String(benA),
        therapist_id: String(mockUser.u._id),
        branch_id: String(BRANCH_B), // forged — must be overridden
        session_date: new Date().toISOString(),
        goals_worked: [],
      });
    expect(r.status).toBe(201);
    const doc = await SessionLog.findById(r.body.data._id).lean();
    expect(String(doc.branch_id)).toBe(String(BRANCH_A));
    expect(String(doc.branch_id)).not.toBe(String(BRANCH_B));
  });

  it('static: session reads scoped + report/analyze ownership-gated', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'rehabilitation-services', 'smart-iep-routes.js'),
      'utf8'
    );
    // direct SessionLog reads must carry branchScope
    expect(src).not.toMatch(/SessionLog\.find\(\{ beneficiary_id: req\.params\.beneficiaryId \}\)/);
    expect(src).toMatch(/getSessionAnalytics\([^)]*branchScope\(req\)/s);
    // report + analyze gated by a scoped existence check
    expect((src.match(/SmartIEP\.exists\(\{ _id: req\.params\.id, \.\.\.branchScope\(req\) \}\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
