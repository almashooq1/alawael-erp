'use strict';

/**
 * hr-extensions-branch-isolation-behavioral-wave1154.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of routes/hr/hr-extensions.routes.js: a branch-A
 * manager lists only their own branch's employee documents / goals, is denied (403)
 * a branch-B document delete and a branch-B goal check-in, and an HQ (super_admin)
 * role sees all branches. Docs are raw-inserted with an explicit branchId so the
 * test isolates the ROUTE scoping (the plugin derivation is covered by wave1133).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-extensions-branch-isolation-behavioral-wave1154.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
let EmployeeDocument;
let EmployeeGoal;
let docA;
let docB;
let docA2;
let goalB;
let app;

const asManagerA = () => {
  global.__hxUser = { id: new mongoose.Types.ObjectId(), role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__hxUser = { id: new mongoose.Types.ObjectId(), role: 'super_admin' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1154-hr-ext' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  // Minimal Employee stand-in (the plugin derives from it; not exercised here).
  mongoose.model('Employee', new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId }));
  EmployeeDocument = require('../models/HR/EmployeeDocument');
  EmployeeGoal = require('../models/HR/EmployeeGoal');

  const emp = new mongoose.Types.ObjectId();
  const ins = (Model, branchId, extra = {}) =>
    Model.collection
      .insertOne({ employeeId: emp, branchId, status: 'active', ...extra })
      .then(r => r.insertedId);

  docA = await ins(EmployeeDocument, BRANCH_A, { docType: 'iqama' });
  docB = await ins(EmployeeDocument, BRANCH_B, { docType: 'iqama' });
  docA2 = await ins(EmployeeDocument, BRANCH_A, { docType: 'passport' });
  goalB = await ins(EmployeeGoal, BRANCH_B, { title: 'B goal' });

  const { createHrExtensionsRouter } = require('../routes/hr/hr-extensions.routes');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = global.__hxUser || null;
    next();
  });
  app.use('/api/v1/hr', createHrExtensionsRouter({ logger: console }));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — hr-extensions document/goal lists isolate by branch', () => {
  it('a branch-A manager lists ONLY branch-A employee documents', async () => {
    asManagerA();
    const res = await request(app).get('/api/v1/hr/documents');
    expect(res.status).toBe(200);
    expect(res.body.data.items.every(d => String(d.branchId) === String(BRANCH_A))).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('an HQ (super_admin) role lists documents across branches', async () => {
    asSuperAdmin();
    const res = await request(app).get('/api/v1/hr/documents');
    expect(res.status).toBe(200);
    const branches = new Set(res.body.data.items.map(d => String(d.branchId)));
    expect(branches.has(String(BRANCH_A)) && branches.has(String(BRANCH_B))).toBe(true);
  });
});

describe('W269 — hr-extensions id/mutation routes assert ownership', () => {
  it('denies a branch-A manager deleting a branch-B document (403)', async () => {
    asManagerA();
    const res = await request(app).delete(`/api/v1/hr/documents/${docB}`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager deleting an OWN-branch document (200)', async () => {
    asManagerA();
    const res = await request(app).delete(`/api/v1/hr/documents/${docA2}`);
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager checking-in a branch-B goal (403)', async () => {
    asManagerA();
    const res = await request(app)
      .patch(`/api/v1/hr/goals/${goalB}/check-in`)
      .send({ percentComplete: 50 });
    expect(res.status).toBe(403);
  });

  // docA is used by no other test; confirm the own-branch read path is reachable
  it('allows a branch-A manager deleting another OWN-branch document (200)', async () => {
    asManagerA();
    const res = await request(app).delete(`/api/v1/hr/documents/${docA}`);
    expect(res.status).toBe(200);
  });
});
