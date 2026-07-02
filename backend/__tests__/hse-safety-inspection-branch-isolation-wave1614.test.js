'use strict';

/**
 * hse-safety-inspection-branch-isolation-wave1614.test.js — W1614
 *
 * routes/hse.routes.js SafetyInspection endpoints had no branch scoping and the model had NO
 * branch field → any authenticated user could list/update/delete every branch's safety
 * inspections. (This was intended to ship with W1604/#926 but the fold was pushed to the branch
 * after it merged, so it never landed — re-shipped here.) W1614 adds `branchId` to SafetyInspection
 * (derived from the inspector's User.branchId), scopes list/PUT/DELETE + dashboard counts with
 * branchFilter(req), and strips identity fields on create/update.
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
const USER_A = new mongoose.Types.ObjectId(); // inspector whose User.branchId = BRANCH_A

let mongod;
let app;
let SafetyInspection;
const I = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1614-hse-insp' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ SafetyInspection } = require('../models/HSE'));
  const stub = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false });
  if (!mongoose.models.User) mongoose.model('User', stub);
  await mongoose.model('User').collection.insertOne({ _id: USER_A, branchId: BRANCH_A });
  app = express();
  app.use(express.json());
  app.use('/api/hse', require('../routes/hse.routes'));

  const seed = (branchId, n) =>
    SafetyInspection.collection.insertOne({
      branchId,
      inspectionNumber: 'INSP-' + n,
      titleAr: 'تفتيش',
      area: 'ward',
      status: 'scheduled',
      scheduledDate: new Date('2027-01-01'),
      inspector: new mongoose.Types.ObjectId(),
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

describe('W1614 — HSE safety-inspection branch isolation', () => {
  it('GET /inspections — restricted user lists only own-branch inspections', async () => {
    const r = await request(app).get(`${base}/inspections?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(I.a));
    expect(ids).not.toContain(String(I.b));
  });

  it('PUT /inspections/:id — restricted user 404s on a foreign-branch inspection', async () => {
    const r = await request(app).put(`${base}/inspections/${I.b}`).send({ area: 'hacked' });
    expect(r.status).toBe(404);
  });

  it('PUT /inspections/:id — own inspection cannot be re-homed', async () => {
    const r = await request(app)
      .put(`${base}/inspections/${I.a}`)
      .send({ area: 'edited', branchId: String(BRANCH_B) });
    expect(r.status).toBe(200);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A));
    expect(r.body.data.area).toBe('edited');
  });

  it('DELETE /inspections/:id — restricted user 404s on a foreign-branch inspection', async () => {
    const r = await request(app).delete(`${base}/inspections/${I.b}`);
    expect(r.status).toBe(404);
  });

  it('POST /inspections — branchId derives from inspector (spoof stripped)', async () => {
    const r = await request(app)
      .post(`${base}/inspections`)
      .send({ titleAr: 'ت', area: 'lab', scheduledDate: '2027-03-03', branchId: String(BRANCH_B) });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('cross-branch role sees any branch inspection', async () => {
    mockScope.s = { restricted: false };
    const r = await request(app).get(`${base}/inspections?limit=100`);
    expect(r.body.data.map(d => String(d._id))).toContain(String(I.b));
  });

  it('static: SafetyInspection branchId + stripInspection + scoped findOneAndUpdate', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'models', 'HSE.js'), 'utf8');
    expect(model).toMatch(/deriveBranchFromInspector/);
    const inspSchema = model.slice(model.indexOf('inspectionSchema'));
    expect(inspSchema).toMatch(/branchId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: 'Branch'/);
    const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'hse.routes.js'), 'utf8');
    expect(routes).toMatch(/const stripInspection =/);
    expect(routes).toMatch(/SafetyInspection\.findOneAndUpdate/);
  });
});
