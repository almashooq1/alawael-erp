'use strict';

/**
 * leave-requests-branch-isolation-behavioral-wave836.test.js — W836.
 *
 * Behavioral counterpart to W834 leave-requests hardening (loadOwnedRequest +
 * assertBranchMatch). Proves restricted callers cannot read another branch's
 * leave request by ObjectId.
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
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();
const EMPLOYEE = new mongoose.Types.ObjectId();
let LeaveRequest;

function seed(branchId) {
  return LeaveRequest.create({
    branchId,
    employeeId: EMPLOYEE,
    leaveType: 'annual',
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000),
    reason: 'behavioral isolation test',
    status: 'pending',
  });
}

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/leave-requests', require('../routes/leave-requests.routes'));
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w836-leave' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String, nameAr: String }));
  }
  if (!mongoose.models.Employee) {
    mongoose.model('Employee', new mongoose.Schema({ name: String, nameAr: String }));
  }
  LeaveRequest = require('../models/LeaveRequest');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W836 — leave-requests cross-branch isolation (behavioral)', () => {
  it('GET /:id rejects malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/leave-requests/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns own-branch request (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/leave-requests/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id denies foreign-branch request with 403', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/leave-requests/${foreign._id}`);
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });
});
