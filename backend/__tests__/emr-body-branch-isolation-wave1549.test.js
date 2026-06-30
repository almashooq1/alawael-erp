'use strict';

/**
 * emr-body-branch-isolation-wave1549.test.js — W1549
 *
 * Guards the fix for the cross-branch PHI-WRITE IDOR on the EMR routes. The
 * router protected GET /:beneficiaryId reads (branchScopedBeneficiaryParam) but
 * NOT the 7 POST endpoints that take the beneficiary from req.body — a restricted
 * staffer could write clinical PHI (vitals/prescriptions/MAR/labs/allergies) onto
 * a foreign-branch beneficiary. Fix = mount bodyScopedBeneficiaryGuard.
 *
 * Behavioral (supertest + MongoMemoryServer) proves: restricted user can write
 * for an own-branch beneficiary, is 403'd on a foreign-branch beneficiary, and a
 * cross-branch role can write for any branch. Static assertion guards the mount.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const managerA = {
  _id: new mongoose.Types.ObjectId(),
  id: 'mA',
  role: 'manager',
  branchId: String(BRANCH_A),
};
const adminCross = { _id: new mongoose.Types.ObjectId(), id: 'ad', role: 'admin' };

let mongod;
let app;
let benA;
let benB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1549-emr' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  // stub Beneficiary for the guard's enforceBeneficiaryBranch lookup
  if (!mongoose.models.Beneficiary) {
    mongoose.model(
      'Beneficiary',
      new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false })
    );
  }
  const Beneficiary = mongoose.model('Beneficiary');
  app = express();
  app.use(express.json());
  app.use('/api/emr', require('../routes/emr.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  benA = (await Beneficiary.collection.insertOne({ branchId: BRANCH_A, name: 'A' })).insertedId;
  benB = (await Beneficiary.collection.insertOne({ branchId: BRANCH_B, name: 'B' })).insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const postVital = beneficiary =>
  request(app)
    .post('/api/emr/vital-signs')
    .send({ beneficiary: String(beneficiary) });

describe('W1549 — EMR body-beneficiary branch isolation (PHI write)', () => {
  it('restricted user CAN record vitals for an own-branch beneficiary', async () => {
    const res = await postVital(benA);
    expect([200, 201]).toContain(res.status);
  });

  it('restricted user is BLOCKED (403) recording vitals on a foreign-branch beneficiary', async () => {
    const res = await postVital(benB);
    expect(res.status).toBe(403);
  });

  it('cross-branch role can record vitals for any branch', async () => {
    mockAuthState.user = adminCross;
    const res = await postVital(benB);
    expect([200, 201]).toContain(res.status);
  });

  it('static: emr.routes mounts bodyScopedBeneficiaryGuard at router level', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'emr.routes.js'), 'utf8');
    expect(src).toMatch(/router\.use\(bodyScopedBeneficiaryGuard\)/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
  });
});
