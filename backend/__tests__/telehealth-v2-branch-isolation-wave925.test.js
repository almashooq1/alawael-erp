'use strict';

/**
 * telehealth-v2-branch-isolation-wave925.test.js — W925.
 * TherapySession video layer had no requireBranchAccess; bare findById let
 * restricted users probe foreign-branch sessions (PHI + room URLs).
 */

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
}));

let mongod;
let TherapySession;
let Employee;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const EMP_A = new mongoose.Types.ObjectId();
const EMP_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  email: 'therapist-a@test.com',
  branchId: String(BRANCH_A),
};

let app;

function buildApp() {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/v1/telehealth-v2', require('../routes/telehealth-v2.routes'));
  return expressApp;
}

function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seedSession(branchId, therapistId, overrides = {}) {
  return TherapySession.create({
    branchId,
    beneficiary: BENE_A,
    therapist: therapistId,
    date: futureDate(),
    status: 'SCHEDULED',
    telehealth: { enabled: true, roomUrl: 'https://meet.jit.si/alawael-test' },
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w925-telehealth-v2' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  TherapySession = require('../models/TherapySession');
  Employee = require('../models/HR/Employee');
  await Employee.collection.insertMany([
    { _id: EMP_A, email: 'therapist-a@test.com', branchId: BRANCH_A, firstName_ar: 'معالج أ' },
    { _id: EMP_B, email: 'therapist-b@test.com', branchId: BRANCH_B, firstName_ar: 'معالج ب' },
  ]);
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await TherapySession.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W925 — instance IDOR regression', () => {
  it('GET /sessions/:id returns 404 for foreign-branch session', async () => {
    const foreign = await seedSession(BRANCH_B, EMP_B);
    const res = await request(app).get(`/api/v1/telehealth-v2/sessions/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /sessions/:id/join returns 404 for foreign-branch session', async () => {
    const foreign = await seedSession(BRANCH_B, EMP_B);
    const res = await request(app).post(`/api/v1/telehealth-v2/sessions/${foreign._id}/join`);
    expect(res.status).toBe(404);
  });
});

describe('W925 — GET /my/upcoming branch-scoped', () => {
  it('therapist only sees in-scope telehealth sessions', async () => {
    mockAuthState.user = therapistA;
    await seedSession(BRANCH_A, EMP_A);
    await seedSession(BRANCH_B, EMP_B);
    const res = await request(app).get('/api/v1/telehealth-v2/my/upcoming');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});
