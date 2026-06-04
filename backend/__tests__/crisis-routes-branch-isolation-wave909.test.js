'use strict';

/**
 * crisis-routes-branch-isolation-wave909.test.js — W909.
 *
 * Legacy crisis.model uses `center` (ref Branch). Pre-W909 lists and
 * findById bypassed tenant scope despite requireBranchAccess.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

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
const USER_A = new mongoose.Types.ObjectId();

const safetyOfficerA = {
  _id: USER_A,
  role: 'safety_officer',
  branchId: String(BRANCH_A),
};

let mongod;
let CrisisIncident;
let incidentB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w909-crisis' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User');
  ({ CrisisIncident } = require('../models/crisis.model'));
  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/crisis', require('../routes/crisis.routes'));
  app = appExpress;

  await CrisisIncident.collection.insertOne({
    title: 'حادث فرع أ',
    type: 'fire',
    severity: 'minor',
    description: 'وصف',
    center: BRANCH_A,
    reportedBy: USER_A,
    isDeleted: false,
  });
  const ins = await CrisisIncident.collection.insertOne({
    title: 'حادث فرع ب',
    type: 'medical',
    severity: 'major',
    description: 'وصف',
    center: BRANCH_B,
    reportedBy: USER_A,
    isDeleted: false,
  });
  incidentB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = safetyOfficerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W909 — crisis incidents isolation', () => {
  it('lists only in-scope incidents', async () => {
    const res = await request(app).get('/api/v1/crisis/incidents');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].center)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-center incident GET /:id', async () => {
    const res = await request(app).get(`/api/v1/crisis/incidents/${incidentB}`);
    expect(res.status).toBe(404);
  });
});
