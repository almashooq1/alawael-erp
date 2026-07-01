'use strict';

/**
 * hse-safety-incident-branch-isolation-wave1604.test.js — W1604
 *
 * routes/hse.routes.js SafetyIncident endpoints applied authenticate + requireBranchAccess but
 * NO query-level branch scoping, though SafetyIncident carries `branchId` (pre-save derives it
 * from the reporter's User.branchId). So any authenticated user could list/read/update/delete
 * every branch's workplace-safety incidents (reporter, injury, investigation), and create/update
 * let the caller spoof branchId (mis-file into another branch) / forge status / closure. W1604
 * scopes every query with branchFilter(req) + strips server-controlled fields on create/update.
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
  authenticate: (req, _res, next) => {
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
jest.mock('../middleware/validate', () => ({ validate: () => (_req, _res, next) => next() }));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId(); // reporter whose User.branchId = BRANCH_A

let mongod;
let app;
let SafetyIncident;
const I = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1604-hse' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ SafetyIncident } = require('../models/HSE'));
  const stub = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false });
  if (!mongoose.models.User) mongoose.model('User', stub);
  // reporter's branch drives the create-time branchId derivation (pre-save hook)
  await mongoose.model('User').collection.insertOne({ _id: USER_A, branchId: BRANCH_A });
  app = express();
  app.use(express.json());
  app.use('/api/hse', require('../routes/hse.routes'));

  const seed = (branchId, n) =>
    SafetyIncident.collection.insertOne({
      branchId,
      incidentNumber: 'INC-' + n,
      titleAr: 'حادثة',
      incidentType: 'injury',
      severity: 'minor',
      status: 'reported',
      description: 'd',
      location: 'loc',
      incidentDate: new Date('2027-01-01'),
      reportedBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
    });
  I.a = (await seed(BRANCH_A, 'A')).insertedId;
  I.b = (await seed(BRANCH_B, 'B')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: USER_A, id: String(USER_A), role: 'hse_manager' };
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/hse';

describe('W1604 — HSE safety-incident branch isolation', () => {
  it('GET /incidents — restricted user lists only own-branch incidents', async () => {
    const r = await request(app).get(`${base}/incidents?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(I.a));
    expect(ids).not.toContain(String(I.b));
  });

  it('GET /incidents/:id — restricted user 404s on a foreign-branch incident', async () => {
    expect((await request(app).get(`${base}/incidents/${I.b}`)).status).toBe(404);
    expect((await request(app).get(`${base}/incidents/${I.a}`)).status).toBe(200);
  });

  it('PUT /incidents/:id — restricted user 404s updating a foreign-branch incident', async () => {
    const r = await request(app).put(`${base}/incidents/${I.b}`).send({ titleAr: 'hacked' });
    expect(r.status).toBe(404);
  });

  it('PUT /incidents/:id — own incident cannot be re-homed to another branch', async () => {
    const r = await request(app)
      .put(`${base}/incidents/${I.a}`)
      .send({ titleAr: 'edited', branchId: String(BRANCH_B) });
    expect(r.status).toBe(200);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A)); // branchId stripped, not re-homed
    expect(r.body.data.titleAr).toBe('edited');
  });

  it('POST /incidents — branchId derives from reporter (spoof stripped), status defaults', async () => {
    const r = await request(app)
      .post(`${base}/incidents`)
      .send({
        titleAr: 'جديدة',
        incidentType: 'near_miss',
        description: 'd',
        location: 'loc',
        incidentDate: '2027-02-02',
        branchId: String(BRANCH_B), // spoof — stripped
        status: 'closed', // forged — stripped → default 'reported'
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A)); // derived from reporter's User.branchId
    expect(r.body.data.status).toBe('reported');
  });

  it('GET /dashboard — restricted user counts only own-branch incidents', async () => {
    const expectedA = await SafetyIncident.countDocuments({ branchId: BRANCH_A });
    const all = await SafetyIncident.countDocuments({});
    const r = await request(app).get(`${base}/dashboard`);
    expect(r.status).toBe(200);
    expect(r.body.data.totalIncidents).toBe(expectedA); // scoped to branch A
    expect(r.body.data.totalIncidents).toBeLessThan(all); // excludes other branches (B exists)
  });

  it('cross-branch role sees any branch incident', async () => {
    mockScope.s = { restricted: false };
    expect((await request(app).get(`${base}/incidents/${I.b}`)).status).toBe(200);
  });

  it('static: branchFilter scoping + strip helpers wired', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'hse.routes.js'), 'utf8');
    expect(src).toMatch(/const stripIncidentCreate =/);
    expect(src).toMatch(/const stripIncidentUpdate =/);
    expect((src.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(5);
    // GET /:id uses a branch-scoped findOne (not bare findById) — tolerant of formatter reflow
    expect(src).toMatch(/findOne\(\{\s*_id: req\.params\.id,\s*\.\.\.branchFilter\(req\)\s*\}\)/);
    expect(src).not.toMatch(/findById\(req\.params\.id\)\.lean\(\)/); // old unscoped read gone
  });
});
