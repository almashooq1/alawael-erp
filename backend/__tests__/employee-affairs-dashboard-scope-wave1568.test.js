'use strict';

/**
 * employee-affairs-dashboard-scope-wave1568.test.js — W1568
 *
 * Completes W1566: the employeeAffairs dashboard/stats reads (getDashboard,
 * getDepartmentStatistics, getSaudizationReport, getExpiringContracts,
 * getExpiringDocumentsReport) were unscoped — a restricted HR manager saw
 * cross-branch headcounts + per-department AVG salary + saudization for ALL branches.
 * Fix: thread effectiveBranchScope(req) → branch_id filter on find/countDocuments
 * (string) and $match ObjectId on aggregates. Cross-branch/HQ unscoped.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

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

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1568-hr-dash' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Employee = require('../models/HR/Employee');
  require('../models/LeaveRequest');
  app = express();
  app.use(express.json());
  app.use('/api/v1/employee-affairs', require('../routes/employeeAffairs.routes'));

  const seed = (branch_id, department, nationality) =>
    Employee.collection.insertOne({
      branch_id,
      department,
      nationality,
      status: 'active',
      name_ar: 'م',
      employee_number: 'E-' + Math.random().toString(36).slice(2, 8),
      salary: { base: 9000 },
    });
  await seed(BRANCH_A, 'therapy', 'سعودي');
  await seed(BRANCH_B, 'admin', 'مصري');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1568 — employeeAffairs dashboard/stats branch scoping', () => {
  it('GET /dashboard — restricted user sees only its own-branch headcount', async () => {
    mockScope.s = scopeA;
    const r = await request(app).get('/api/v1/employee-affairs/dashboard');
    expect(r.status).toBe(200);
    expect(r.body.data.overview.totalEmployees).toBe(1); // only branch A (not the branch-B employee)
  });

  it('GET /dashboard — cross-branch role sees all branches', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get('/api/v1/employee-affairs/dashboard');
    expect(r.status).toBe(200);
    expect(r.body.data.overview.totalEmployees).toBe(2);
  });

  it('GET /government/saudization — restricted user report counts only its branch', async () => {
    mockScope.s = scopeA;
    const r = await request(app).get('/api/v1/employee-affairs/government/saudization');
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(1);
  });
});
