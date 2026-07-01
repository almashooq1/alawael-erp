'use strict';

/**
 * quality-incident-branch-isolation-wave1554.test.js — W1554
 *
 * Guards the fix for cross-branch IDOR on the quality-module IncidentReport surface
 * (patient-safety records with beneficiary PHI: name/file/DOB). Every read / update /
 * lifecycle handler keyed only on { _id, deleted_at:null } with no branch scope, and
 * the list/dashboard honored a client-supplied branch_id. Fix: incidentBranchScope(req)
 * on every IncidentReport query (snake_case branch_id; restricted users forced to own
 * branch) + authorize(INCIDENT_MANAGE_ROLES) on close/escalate/delete.
 *
 * Mocks requireBranchAccess to set a deterministic req.branchScope; keeps the REAL
 * authorize() (requireActual) so the role gate is exercised.
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
jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return {
    ...actual,
    authenticate: (req, _res, next) => {
      req.user = mockUser.u;
      next();
    },
  };
});
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
const reader = { _id: new mongoose.Types.ObjectId(), role: 'manager' }; // GET has no role gate
const qm = { _id: new mongoose.Types.ObjectId(), role: 'branch_manager' };

let mongod;
let app;
let IncidentReport;
let incA;
let incB;

const seedInc = async (over = {}) => {
  const r = await IncidentReport.collection.insertOne({
    incident_number: 'INC-W1554-' + Math.random().toString(36).slice(2, 9),
    branch_id: BRANCH_A,
    status: 'reported',
    severity: 'minor',
    incident_date: new Date(),
    deleted_at: null,
    ...over,
  });
  return r.insertedId;
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1554-q' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  IncidentReport = require('../models/quality/IncidentReport');
  // stub the populate targets on GET /incidents/:id (reported_by/closed_by→User,
  // involved_beneficiary_id→Beneficiary, involved_employee_id→Employee)
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['User', 'Beneficiary', 'Employee']) {
    if (!mongoose.models[n]) mongoose.model(n, stub);
  }
  app = express();
  app.use(express.json());
  app.use('/api/quality-module', require('../routes/quality-module.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  incA = await seedInc({ branch_id: BRANCH_A });
  incB = await seedInc({ branch_id: BRANCH_B });
});

beforeEach(() => {
  mockUser.u = reader;
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1554 — quality IncidentReport branch isolation + lifecycle role gate', () => {
  it('GET /incidents/:id — restricted user 404s on a foreign-branch incident', async () => {
    const r = await request(app).get(`/api/quality-module/incidents/${incB}`);
    expect(r.status).toBe(404);
  });

  it('GET /incidents/:id — restricted user reads its own-branch incident', async () => {
    const r = await request(app).get(`/api/quality-module/incidents/${incA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.incident._id)).toBe(String(incA));
  });

  it('GET /incidents/:id — cross-branch role reads any incident', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/quality-module/incidents/${incB}`);
    expect(r.status).toBe(200);
  });

  it('GET /incidents — list returns only own-branch incidents', async () => {
    const r = await request(app).get('/api/quality-module/incidents');
    expect(r.status).toBe(200);
    const ids = r.body.incidents.map(i => String(i._id));
    expect(ids).toContain(String(incA));
    expect(ids).not.toContain(String(incB));
  });

  it('DELETE — 404s on a foreign-branch incident (branch scope)', async () => {
    mockUser.u = qm;
    const r = await request(app).delete(`/api/quality-module/incidents/${incB}`);
    expect(r.status).toBe(404);
  });

  it('static: every incident handler scopes by branch', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'quality-module.routes.js'), 'utf8');
    expect((src.match(/incidentBranchScope\(req/g) || []).length).toBeGreaterThanOrEqual(8);
  });
});
