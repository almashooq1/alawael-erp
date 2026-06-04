'use strict';

/** therapy-sessions-admin-branch-isolation-wave887.test.js — W887 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));
jest.mock('../middleware/piiAccess.middleware', () => () => (_req, _res, next) => next());

let mongod;
let TherapySession;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/therapy-sessions', require('../routes/therapy-sessions-admin.routes'));
  return app;
}

async function seedSession(beneficiaryId) {
  return TherapySession.create({
    beneficiary: beneficiaryId,
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    status: 'SCHEDULED',
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w887-therapy' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  TherapySession = require('../models/TherapySession');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await TherapySession.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W887 — POST rejects foreign beneficiary', () => {
  it('returns 404 when beneficiary is outside caller branch', async () => {
    const res = await request(buildApp())
      .post('/api/admin/therapy-sessions')
      .send({
        beneficiary: String(BENE_B),
        date: new Date().toISOString(),
        startTime: '09:00',
        endTime: '10:00',
        force: true,
      });
    expect(res.status).toBe(404);
  });
});

describe('W887 — GET /:id isolation', () => {
  it('returns 404 for session linked to foreign-branch beneficiary', async () => {
    const row = await seedSession(BENE_B);
    const res = await request(buildApp()).get(`/api/admin/therapy-sessions/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W887 — GET / list isolation', () => {
  it('lists only caller-branch sessions', async () => {
    await seedSession(BENE_A);
    await seedSession(BENE_B);
    const res = await request(buildApp()).get('/api/admin/therapy-sessions');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});
