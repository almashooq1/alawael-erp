'use strict';

/**
 * leave-requests-mutations-behavioral-wave839.test.js — W839.
 *
 * Extends W836 with write-path isolation: approve/reject must not reach
 * leaveManagement.service when loadOwnedRequest detects a foreign branch.
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
    reason: 'W839 mutation isolation',
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w839-leave-mutations' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  LeaveRequest = require('../models/LeaveRequest');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W839 — leave-requests approve/reject cross-branch isolation', () => {
  it('POST /:id/approve denies foreign-branch request with 403', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).post(`/api/v1/leave-requests/${foreign._id}/approve`);
    expect(res.status).toBe(403);
    const unchanged = await LeaveRequest.findById(foreign._id).lean();
    expect(unchanged.status).toBe('pending');
  });

  it('POST /:id/reject denies foreign-branch request with 403', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/leave-requests/${foreign._id}/reject`)
      .send({ reason: 'not allowed cross-branch' });
    expect(res.status).toBe(403);
    const unchanged = await LeaveRequest.findById(foreign._id).lean();
    expect(unchanged.status).toBe('pending');
  });
});
