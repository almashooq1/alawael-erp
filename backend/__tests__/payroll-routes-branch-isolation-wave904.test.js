'use strict';

/** payroll-routes-branch-isolation-wave904.test.js — W904 */

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
  requireRole: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const EMP_A = new mongoose.Types.ObjectId();
const EMP_B = new mongoose.Types.ObjectId();

const hrA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'hr',
  branchId: String(BRANCH_A),
  name: 'HR A',
};

function employeeId(doc) {
  const e = doc?.employeeId;
  return String(e?._id ?? e ?? '');
}

let mongod;
let payrollB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payroll', require('../routes/payroll.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w904-payroll' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Payroll = require('../models/payroll.model');
  await mongoose.connection.collection('employees').insertMany([
    { _id: EMP_A, branch_id: BRANCH_A, name_ar: 'موظف أ', status: 'active' },
    { _id: EMP_B, branch_id: BRANCH_B, name_ar: 'موظف ب', status: 'active' },
  ]);
  await Payroll.collection.insertOne({
    employeeId: EMP_A,
    employeeName: 'موظف أ',
    month: '2026-06',
    year: 2026,
    baseSalary: 5000,
    payment: { status: 'draft' },
  });
  const ins = await Payroll.collection.insertOne({
    employeeId: EMP_B,
    employeeName: 'موظف ب',
    month: '2026-06',
    year: 2026,
    baseSalary: 5000,
    payment: { status: 'draft' },
  });
  payrollB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = hrA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W904 — payroll isolation', () => {
  it('lists only in-scope monthly payroll rows', async () => {
    const res = await request(buildApp()).get('/api/payroll/monthly/2026-06/2026');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(employeeId(res.body.data[0])).toBe(String(EMP_A));
  });

  it('returns 404 for foreign-branch payroll GET /:payrollId', async () => {
    const res = await request(buildApp()).get(`/api/payroll/${payrollB}`);
    expect(res.status).toBe(404);
  });
});
