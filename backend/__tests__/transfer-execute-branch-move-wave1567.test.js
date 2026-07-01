'use strict';

/**
 * transfer-execute-branch-move-wave1567.test.js — W1567
 *
 * routes/employee-affairs-phase3.routes.js PATCH /transfers/:id/execute wrote
 * Employee.findByIdAndUpdate(..., { branch: transfer.toBranch }) — but the Employee
 * schema field is snake `branch_id`. Strict mode silently dropped `branch`, so an
 * executed transfer NEVER moved the employee's branch (only department, a real field,
 * changed). Fix: write `branch_id`. Behavioral: after execute, the employee's branch_id
 * equals the transfer's toBranch.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'exec-user', id: 'exec-user', role: 'hr_manager' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = { restricted: false, allBranches: true };
    next();
  },
  branchFilter: () => ({}),
}));

const OLD_BRANCH = new mongoose.Types.ObjectId();
const NEW_BRANCH = new mongoose.Types.ObjectId();

let mongod;
let app;
let Employee;
let Transfer;
let empId;
let transferId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1567-transfer' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Employee = require('../models/HR/Employee');
  Transfer = require('../models/HR/Transfer');
  app = express();
  app.use(express.json());
  app.use('/api/v1/employee-affairs-phase3', require('../routes/employee-affairs-phase3.routes'));

  empId = (
    await Employee.collection.insertOne({
      branch_id: OLD_BRANCH,
      name_ar: 'موظف',
      employee_number: 'E-transfer',
      department: 'therapy',
      status: 'active',
    })
  ).insertedId;
  transferId = (
    await Transfer.collection.insertOne({
      employeeId: empId,
      toBranch: NEW_BRANCH,
      toDepartment: 'admin',
      status: 'pending',
    })
  ).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1567 — transfer execute actually moves the employee branch', () => {
  it('PATCH /transfers/:id/execute — sets Employee.branch_id to toBranch', async () => {
    const r = await request(app).patch(`/api/v1/employee-affairs-phase3/transfers/${transferId}/execute`).send({});
    expect(r.status).toBe(200);
    const emp = await Employee.collection.findOne({ _id: empId });
    expect(String(emp.branch_id)).toBe(String(NEW_BRANCH)); // moved (was OLD_BRANCH)
    expect(emp.branch).toBeUndefined(); // the old phantom key is not written
  });

  it('static: transfer execute writes branch_id (not the phantom `branch`)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'employee-affairs-phase3.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/branch_id: transfer\.toBranch/);
    expect(src).not.toMatch(/\n\s*branch: transfer\.toBranch/);
  });
});
