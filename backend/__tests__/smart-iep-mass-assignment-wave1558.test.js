'use strict';

/**
 * smart-iep-mass-assignment-wave1558.test.js — W1558
 *
 * Guards the mass-assignment fix deferred from W1555 on /api/smart-iep/*:
 *  - POST /iep spread req.body into SmartIEPService.createIEP (`new SmartIEP({...data})`),
 *    letting a caller forge privileged/computed fields (status / approved_by /
 *    approval_date / ai_analysis / overall_progress / version) and plant the plan in
 *    a foreign branch by supplying branch_id directly.
 *  - PATCH /iep allowedFields included `status` (bypass the /transition state machine
 *    → self-approve) and `parent_consent` (forge parental consent on a clinical doc).
 *
 * Fix: whitelist creatable fields on create + force branch_id from scope; drop
 * status / parent_consent from the PATCH whitelist (use the dedicated routes).
 *
 * Static guard locks the source shape; behavioral (mocked auth + scope + MMS)
 * proves the privileged fields are actually stripped at runtime.
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
const FOREIGN_BRANCH = new mongoose.Types.ObjectId();
const benA = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };

let mongod;
let app;
let SmartIEP;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1558-iep-ma' } });
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
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1558 — smart-iep create/update mass-assignment', () => {
  it('POST /iep strips privileged/computed fields a caller tries to forge', async () => {
    const r = await request(app)
      .post('/api/smart-iep/iep')
      .send({
        beneficiary_id: String(benA),
        plan_type: 'IEP',
        plan_period: { start_date: '2026-01-01', end_date: '2026-12-31' },
        // forged privileged / computed fields — must all be ignored:
        status: 'active',
        approved_by: new mongoose.Types.ObjectId().toString(),
        approval_date: '2020-01-01',
        ai_analysis: { predicted_success_rate: 999 },
        overall_progress: { overall_percentage: 100 },
        version: 99,
      });
    expect(r.status).toBe(201);
    const doc = await SmartIEP.findById(r.body.data._id).lean();
    expect(doc.status).toBe('draft'); // schema default — NOT the forged 'active'
    expect(doc.approved_by == null).toBe(true);
    expect(doc.approval_date == null).toBe(true);
    expect(doc.version).toBe(1); // schema default — NOT 99
    expect(doc.ai_analysis && doc.ai_analysis.predicted_success_rate).not.toBe(999);
    expect(doc.overall_progress && doc.overall_progress.overall_percentage).not.toBe(100);
  });

  it('POST /iep forces branch_id from scope (ignores a forged foreign branch_id)', async () => {
    const r = await request(app)
      .post('/api/smart-iep/iep')
      .send({
        beneficiary_id: String(benA),
        branch_id: String(FOREIGN_BRANCH), // attempt to plant the plan in another branch
        plan_period: { start_date: '2026-01-01', end_date: '2026-12-31' },
      });
    expect(r.status).toBe(201);
    const doc = await SmartIEP.findById(r.body.data._id).lean();
    expect(String(doc.branch_id)).toBe(String(BRANCH_A)); // forced to caller's branch
    expect(String(doc.branch_id)).not.toBe(String(FOREIGN_BRANCH));
  });

  it('PATCH /iep cannot set status (state machine) or forge parent_consent', async () => {
    const ins = await SmartIEP.collection.insertOne({
      iep_number: 'IEP-W1558-' + Math.random().toString(36).slice(2, 9),
      branch_id: BRANCH_A,
      beneficiary_id: benA,
      status: 'draft',
      annual_goals: [],
      parent_consent: { consent_given: false },
    });
    const r = await request(app)
      .patch(`/api/smart-iep/iep/${ins.insertedId}`)
      .send({
        status: 'active', // bypass attempt — must be ignored
        parent_consent: { consent_given: true, guardian_name: 'forged' }, // must be ignored
      });
    expect(r.status).toBe(200); // PATCH still functions (no error)
    const doc = await SmartIEP.findById(ins.insertedId).lean();
    expect(doc.status).toBe('draft'); // NOT escalated via PATCH (use /transition)
    expect(doc.parent_consent.consent_given).toBe(false); // consent NOT forged
  });

  it('static: create whitelists fields + PATCH excludes status/parent_consent', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'rehabilitation-services', 'smart-iep-routes.js'),
      'utf8'
    );
    expect(src).not.toMatch(/const iepData = req\.body/); // no raw spread into the service
    expect(src).toMatch(/IEP_CREATABLE/);
    expect(src).toMatch(/iepData\.branch_id = scoped\.branch_id/); // branch forced from scope
    const allowed = src.slice(
      src.indexOf('const allowedFields'),
      src.indexOf('const allowedFields') + 200
    );
    expect(allowed).not.toMatch(/'status'/);
    expect(allowed).not.toMatch(/'parent_consent'/);
  });
});
