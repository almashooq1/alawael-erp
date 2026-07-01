'use strict';

/**
 * employee-affairs-leaves-scope-wave1569.test.js — W1569
 *
 * The employeeAffairs leaves sub-surface was unscoped: GET /leaves (listLeaves) listed
 * ALL branches' leave requests (no role gate), and the lifecycle methods
 * (approve/reject/cancel) loaded LeaveRequest by id with no branch check → a restricted
 * HR user could act on another branch's leave. Also requestLeave never stamped the
 * required `branchId`. Fix: LeaveRequest.branchId (camelCase) scopes listLeaves + the 4
 * lifecycle findOne lookups; requestLeave stamps branchId from the employee; POST /leaves
 * enforces employee-branch.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { _id: 'u1', id: 'u1', role: 'hr_manager' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () => ({}),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let LR;
let leaveA;
let leaveB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1569-leaves' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/HR/Employee');
  LR = require('../models/LeaveRequest');
  app = express();
  app.use(express.json());
  app.use('/api/v1/employee-affairs', require('../routes/employeeAffairs.routes'));

  const seed = branchId =>
    LR.collection.insertOne({
      branchId,
      employee: new mongoose.Types.ObjectId(),
      employeeId: 'E-' + Math.random().toString(36).slice(2, 7),
      leaveType: 'annual',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 864e5),
      totalDays: 2,
      status: 'pending',
    });
  leaveA = (await seed(BRANCH_A)).insertedId;
  leaveB = (await seed(BRANCH_B)).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1569 — employeeAffairs leaves branch scoping', () => {
  it('GET /leaves — restricted user lists only own-branch leaves', async () => {
    mockScope.s = scopeA;
    const r = await request(app).get('/api/v1/employee-affairs/leaves?limit=100');
    expect(r.status).toBe(200);
    const ids = (r.body.leaves || r.body.data || []).map(l => String(l._id));
    expect(ids).toContain(String(leaveA));
    expect(ids).not.toContain(String(leaveB));
  });

  it('GET /leaves — cross-branch role lists all leaves', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get('/api/v1/employee-affairs/leaves?limit=100');
    expect(r.status).toBe(200);
    const ids = (r.body.leaves || r.body.data || []).map(l => String(l._id));
    expect(ids).toContain(String(leaveB));
  });

  it('POST /leaves/:id/approve-manager — restricted user 404s on a foreign-branch leave', async () => {
    mockScope.s = scopeA;
    const r = await request(app)
      .post(`/api/v1/employee-affairs/leaves/${leaveB}/approve-manager`)
      .send({ comments: 'x' });
    expect(r.status).toBe(404);
  });

  it('static: leaves scoped + requestLeave stamps branchId', () => {
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'employeeAffairs.service.js'), 'utf8');
    expect((svc.match(/LR\.findOne\(\{ _id: leaveId/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(svc).toMatch(/branchId: employee\.branch_id/);
    expect(svc).toMatch(/branchScope \? \{ branchId: branchScope \}/);
  });
});
