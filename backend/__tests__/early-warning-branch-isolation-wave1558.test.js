'use strict';

/**
 * early-warning-branch-isolation-wave1558.test.js — W1558
 *
 * W1556 closed ANONYMOUS access on this router; W1558 adds per-query branch isolation
 * (the authenticated cross-branch IDOR that remained). EarlyWarningAlert (clinical risk
 * alerts per beneficiary) carries snake_case branch_id; getBeneficiaryAlerts /
 * acknowledgeAlert / resolveAlert queried with no branch scope, and branch/:branchId +
 * dashboard trusted the caller-supplied branch. Fix: service methods take an optional
 * `scope` filter the routes compute from req.branchScope; restricted users are forced to
 * their own branch (client branch/:id ignored).
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
let Alert;
let alertA;
let alertB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1558-ews' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const mod = require('../rehabilitation-services/early-warning-system');
  Alert = mod.EarlyWarningAlert;
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User']) if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use('/api/early-warning', mod.router);
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const seed = async (branch_id, beneficiary_id) =>
    (
      await Alert.collection.insertOne({
        beneficiary_id,
        branch_id,
        alert_type: 'plateau',
        severity: 'high',
        alert_title_ar: 'تنبيه',
        alert_message_ar: 'رسالة',
        status: 'active',
      })
    ).insertedId;
  alertA = await seed(BRANCH_A, benA);
  alertB = await seed(BRANCH_B, benB);
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1558 — early-warning branch isolation', () => {
  it('GET /beneficiary/:id — restricted user gets no foreign-branch alerts', async () => {
    const r = await request(app).get(`/api/early-warning/beneficiary/${benB}`);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(0);
  });

  it('GET /beneficiary/:id — restricted user sees its own-branch alerts', async () => {
    const r = await request(app).get(`/api/early-warning/beneficiary/${benA}`);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(1);
  });

  it('PATCH /:id/acknowledge — restricted user 404s on a foreign-branch alert', async () => {
    const r = await request(app).patch(`/api/early-warning/${alertB}/acknowledge`).send({ notes: 'x' });
    expect(r.status).toBe(404);
  });

  it('PATCH /:id/acknowledge — restricted user acknowledges its own-branch alert', async () => {
    const r = await request(app).patch(`/api/early-warning/${alertA}/acknowledge`).send({ notes: 'ok' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('acknowledged');
  });

  it('PATCH /:id/resolve — cross-branch role resolves any alert', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).patch(`/api/early-warning/${alertB}/resolve`).send({ notes: 'done' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('resolved');
  });

  it('static: queries scope by branch; no unscoped findByIdAndUpdate', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'rehabilitation-services', 'early-warning-system.js'),
      'utf8'
    );
    expect((src.match(/branchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((src.match(/callerBranch\(req\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/\.findByIdAndUpdate\(/);
  });
});
