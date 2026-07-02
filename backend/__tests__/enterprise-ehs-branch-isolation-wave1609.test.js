'use strict';

/**
 * enterprise-ehs-branch-isolation-wave1609.test.js — W1609
 *
 * routes/enterpriseProPlus.routes.js /ehs/* handlers (SafetyIncident/SafetyInspection/
 * HazardRegister/PPERecord) applied authenticateToken + requireBranchAccess but no query
 * scoping, and the 4 EHS models had only `organization` — no branch field → cross-branch IDOR
 * read/write of safety incidents/inspections/hazards/PPE + mass-assignment. W1609 adds `branchId`
 * to the 4 schemas, scopes every /ehs query with branchFilter(req), stamps branchId on create,
 * and strips server-controlled fields.
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
const mockScope = { s: undefined };

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
  branchFilter: () =>
    mockScope.s && mockScope.s.restricted ? { branchId: mockScope.s.branchId } : {},
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let M;
const id = {};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1608-ehs' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  M = require('../models/EnterpriseProPlus');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  if (!mongoose.models.User) mongoose.model('User', stub);
  app = express();
  app.use(express.json());
  app.use('/api/enterprise-pro-plus', require('../routes/enterpriseProPlus.routes'));

  const seed = async (Model, branchId, extra) =>
    (await Model.collection.insertOne({ branchId, createdAt: new Date(), ...extra })).insertedId;
  id.incA = await seed(M.SafetyIncident, BRANCH_A, { incidentNumber: 'SI-A', severity: 'minor', status: 'reported' });
  id.incB = await seed(M.SafetyIncident, BRANCH_B, { incidentNumber: 'SI-B', severity: 'critical', status: 'reported', lostWorkDays: 5 });
  id.inspA = await seed(M.SafetyInspection, BRANCH_A, { inspectionNumber: 'INSP-A', status: 'scheduled' });
  id.inspB = await seed(M.SafetyInspection, BRANCH_B, { inspectionNumber: 'INSP-B', status: 'scheduled' });
  id.hazA = await seed(M.HazardRegister, BRANCH_A, { hazardId: 'HAZ-A', category: 'physical' });
  id.hazB = await seed(M.HazardRegister, BRANCH_B, { hazardId: 'HAZ-B', category: 'physical' });
  id.ppeA = await seed(M.PPERecord, BRANCH_A, { employee: new mongoose.Types.ObjectId() });
  id.ppeB = await seed(M.PPERecord, BRANCH_B, { employee: new mongoose.Types.ObjectId() });
});

beforeEach(() => {
  const uid = new mongoose.Types.ObjectId();
  mockUser.u = { _id: uid, id: String(uid), role: 'safety_officer' }; // id must be a valid ObjectId (reportedBy ref)
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/enterprise-pro-plus/ehs';

describe('W1609 — EnterpriseProPlus EHS branch isolation', () => {
  it('GET /incidents — restricted user lists only own-branch incidents', async () => {
    const r = await request(app).get(`${base}/incidents`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(id.incA));
    expect(ids).not.toContain(String(id.incB));
  });

  it('GET /incidents/:id — 404 on foreign branch, 200 on own', async () => {
    expect((await request(app).get(`${base}/incidents/${id.incB}`)).status).toBe(404);
    expect((await request(app).get(`${base}/incidents/${id.incA}`)).status).toBe(200);
  });

  it('PUT /incidents/:id — restricted user 404s on a foreign-branch incident', async () => {
    const r = await request(app).put(`${base}/incidents/${id.incB}`).send({ severity: 'critical' });
    expect(r.status).toBe(404);
  });

  it('POST /incidents — create stamps caller branch, ignoring a spoofed branchId', async () => {
    const r = await request(app)
      .post(`${base}/incidents`)
      .send({
        title: 'Test incident',
        type: 'injury',
        date: '2027-01-01',
        severity: 'minor',
        description: 'd',
        branchId: String(BRANCH_B), // spoof — stripped, stamped from scope
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('GET /incidents/statistics/summary — counts only own branch', async () => {
    const r = await request(app).get(`${base}/incidents/statistics/summary`);
    expect(r.status).toBe(200);
    expect(r.body.data.criticalIncidents).toBe(0); // the critical one is branch B
  });

  it('GET /inspections + PUT /:id — scoped', async () => {
    const list = await request(app).get(`${base}/inspections`);
    expect(list.body.data.map(d => String(d._id))).not.toContain(String(id.inspB));
    expect((await request(app).put(`${base}/inspections/${id.inspB}`).send({ status: 'completed' })).status).toBe(404);
  });

  it('GET /hazards + /ppe — restricted user sees only own branch', async () => {
    const haz = await request(app).get(`${base}/hazards`);
    expect(haz.body.data.map(d => String(d._id))).not.toContain(String(id.hazB));
    const ppe = await request(app).get(`${base}/ppe`);
    expect(ppe.body.data.map(d => String(d._id))).not.toContain(String(id.ppeB));
  });

  it('cross-branch role sees any branch incident', async () => {
    mockScope.s = { restricted: false };
    expect((await request(app).get(`${base}/incidents/${id.incB}`)).status).toBe(200);
  });

  it('static: 4 EHS schemas branchId + route branchFilter + stripEhs', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'models', 'EnterpriseProPlus.js'), 'utf8');
    expect((model.match(/ref: 'Branch', index: true/g) || []).length).toBeGreaterThanOrEqual(4);
    const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'enterpriseProPlus.routes.js'), 'utf8');
    expect(routes).toMatch(/const stripEhs =/);
    const ehs = routes.slice(routes.indexOf('// --- Safety Incidents ---'));
    expect((ehs.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(8);
  });
});
