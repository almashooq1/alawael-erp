'use strict';

/**
 * employee-affairs-branch-isolation-wave1566.test.js — W1566
 *
 * routes/employeeAffairs.routes.js was authenticated + requireBranchAccess on every
 * route, but requireBranchAccess doesn't auto-filter and employeeAffairs.service.js
 * never received the branch scope — so any authenticated caller could read/write another
 * branch's employee PII (national_id / iqama / iban / basic_salary) by enumerating ids,
 * and GET / leaked the whole cross-branch roster. Employee.branch_id is snake_case.
 *
 * Fix: router.param('employeeId', branchScopedResourceParam) enforces branch on every
 * :employeeId route; the 7 plain-employee :id routes enforce per-handler via
 * enforceEmployeeBranch (:id is ambiguous — /leaves/:id is a LeaveRequest); listEmployees
 * scopes on branch_id. Behavioral (real guards vs seeded employees): foreign → 403,
 * own → 200, cross-branch → 200, list scoped.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockUser.u;
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
let Employee;
let empA;
let empB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1566-hr' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Employee = require('../models/HR/Employee');
  app = express();
  app.use(express.json());
  app.use('/api/v1/employee-affairs', require('../routes/employeeAffairs.routes'));

  const seed = async branch_id =>
    (
      await Employee.collection.insertOne({
        branch_id,
        name_ar: 'موظف',
        employee_number: 'E-' + Math.random().toString(36).slice(2, 8),
        national_id: '1' + Math.floor(Math.random() * 1e9),
        basic_salary: 9000,
        status: 'active',
      })
    ).insertedId;
  empA = await seed(BRANCH_A);
  empB = await seed(BRANCH_B);
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: String(new mongoose.Types.ObjectId()), role: 'hr_manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1566 — employee-affairs cross-branch PII isolation', () => {
  it('GET /:id — restricted user 403s on a foreign-branch employee', async () => {
    const r = await request(app).get(`/api/v1/employee-affairs/${empB}`);
    expect(r.status).toBe(403);
  });

  it('GET /:id — restricted user reads its own-branch employee', async () => {
    const r = await request(app).get(`/api/v1/employee-affairs/${empA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(empA));
  });

  it('GET /:id — cross-branch role reads any employee', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/v1/employee-affairs/${empB}`);
    expect(r.status).toBe(200);
  });

  it('GET /leaves/balance/:employeeId — restricted user 403s on a foreign employee (param guard)', async () => {
    const r = await request(app).get(`/api/v1/employee-affairs/leaves/balance/${empB}`);
    expect(r.status).toBe(403);
  });

  it('GET / — roster list is scoped to the caller branch', async () => {
    const r = await request(app).get('/api/v1/employee-affairs/?limit=100');
    expect(r.status).toBe(200);
    const ids = r.body.employees.map(e => String(e._id));
    expect(ids).toContain(String(empA));
    expect(ids).not.toContain(String(empB));
  });

  it('static: every employee-keyed handler enforces branch + scoped list', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'employeeAffairs.routes.js'), 'utf8');
    // 7 plain :id handlers + 12 :employeeId handlers all call enforceEmployeeBranch
    expect((src.match(/enforceEmployeeBranch\(req, req\.params\.(id|employeeId)\)/g) || []).length).toBeGreaterThanOrEqual(19);
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'employeeAffairs.service.js'), 'utf8');
    expect(svc).toMatch(/branchScope \? \{ branch_id: branchScope \}/);
  });
});
