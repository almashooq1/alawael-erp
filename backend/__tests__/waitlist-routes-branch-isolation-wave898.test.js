'use strict';

/** waitlist-routes-branch-isolation-wave898.test.js — W898 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const staffA = {
  _id: new mongoose.Types.ObjectId(),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let WaitlistEntry;
let entryB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/waitlist', require('../routes/waitlist.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w898-waitlist-routes' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  WaitlistEntry = require('../models/WaitlistEntry');

  await WaitlistEntry.collection.insertOne({
    branch: BRANCH_A,
    applicantName: 'متقدم أ',
    applicantPhone: '0511111111',
    disabilityType: 'physical',
    disabilitySeverity: 'mild',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const ins = await WaitlistEntry.collection.insertOne({
    branch: BRANCH_B,
    applicantName: 'متقدم ب',
    applicantPhone: '0522222222',
    disabilityType: 'physical',
    disabilitySeverity: 'mild',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  entryB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = staffA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W898 — GET / list isolation', () => {
  it('returns only entries in caller branch', async () => {
    const res = await request(buildApp()).get('/api/waitlist');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].applicantName).toBe('متقدم أ');
  });
});

describe('W898 — GET /:id isolation', () => {
  it('returns 404 for foreign-branch entry (IDOR regression)', async () => {
    const res = await request(buildApp()).get(`/api/waitlist/${entryB}`);
    expect(res.status).toBe(404);
  });
});

describe('W898 — POST /:id/contact isolation', () => {
  it('returns 404 when contacting foreign-branch entry', async () => {
    const res = await request(buildApp())
      .post(`/api/waitlist/${entryB}/contact`)
      .send({ note: 'x' });
    expect(res.status).toBe(404);
  });
});
