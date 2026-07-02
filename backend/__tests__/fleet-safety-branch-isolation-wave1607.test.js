'use strict';

/**
 * fleet-safety-branch-isolation-wave1607.test.js — W1607
 *
 * routes/fleetSafety.js applied authenticate + requireBranchAccess but NO query scoping, and the
 * FleetSafety model was `{}` strict:false (no branch dimension) → any authenticated user could
 * list/read/update/close every branch's fleet-safety incident, and create/update spread the raw
 * body into a strict:false model (arbitrary mass-assignment). W1607 declares a typed `branchId`,
 * scopes every query with branchFilter(req), stamps branchId on create, and strips server-
 * controlled fields (branchId/reportedBy/status/closure) from the create+update payload.
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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let FleetSafety;
const F = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1607-fleet-safety' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  FleetSafety = require('../models/Fleet/FleetSafety');
  app = express();
  app.use(express.json());
  app.use('/api/fleet-safety', require('../routes/fleetSafety'));

  const seed = (branchId, sev) =>
    FleetSafety.collection.insertOne({
      branchId,
      severity: sev,
      status: 'open',
      incidentDate: new Date('2027-01-01'),
      reportedBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
    });
  F.a = (await seed(BRANCH_A, 'high')).insertedId;
  F.b = (await seed(BRANCH_B, 'low')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'safety_officer' };
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/fleet-safety';

describe('W1607 — FleetSafety branch isolation', () => {
  it('GET / — restricted user lists only own-branch incidents', async () => {
    const r = await request(app).get(base);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(F.a));
    expect(ids).not.toContain(String(F.b));
  });

  it('GET /:id — restricted user 404s on a foreign-branch incident', async () => {
    expect((await request(app).get(`${base}/${F.b}`)).status).toBe(404);
    expect((await request(app).get(`${base}/${F.a}`)).status).toBe(200);
  });

  it('POST / — create stamps caller branch, strips forged fields, ignores spoofed branchId', async () => {
    const r = await request(app)
      .post(base)
      .send({ severity: 'medium', branchId: String(BRANCH_B), status: 'closed', closedBy: 'x' });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A)); // stamped from scope, not spoof
    expect(r.body.data.status).toBe('open'); // forced open, not the forged 'closed'
  });

  it('PUT /:id — restricted user 404s updating a foreign-branch incident', async () => {
    const r = await request(app).put(`${base}/${F.b}`).send({ severity: 'critical' });
    expect(r.status).toBe(404);
  });

  it('PATCH /:id/close — restricted user 404s closing a foreign-branch incident', async () => {
    const r = await request(app).patch(`${base}/${F.b}/close`).send({ resolution: 'x' });
    expect(r.status).toBe(404);
  });

  it('cross-branch role sees any branch incident', async () => {
    mockScope.s = { restricted: false };
    expect((await request(app).get(`${base}/${F.b}`)).status).toBe(200);
  });

  it('static: model branchId + route branchFilter + strip helper', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'models', 'Fleet', 'FleetSafety.js'), 'utf8');
    expect(model).toMatch(/branchId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: 'Branch'/);
    const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'fleetSafety.js'), 'utf8');
    expect(routes).toMatch(/const stripFleetSafety =/);
    expect((routes.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});
