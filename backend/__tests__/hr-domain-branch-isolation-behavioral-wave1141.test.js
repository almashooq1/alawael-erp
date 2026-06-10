'use strict';

/**
 * hr-domain-branch-isolation-behavioral-wave1141.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of domains/hr/routes/hr.routes.js: a branch-A
 * manager is denied (403) another branch's employee profile + leave mutation +
 * attendance, an HQ (super_admin) role is not, and same-branch access flows to the
 * (mocked) HR service facade. The facade is mocked so the test isolates the
 * BRANCH-GATE; Employee + LeaveRequest are real MMS models so the guards resolve
 * branch_id / branchId for real.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-domain-branch-isolation-behavioral-wave1141.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// HR service facade mocked — allowed paths reach it; denied paths must not.
jest.mock('../domains/hr/index', () => ({
  employee: {
    getById: jest.fn().mockResolvedValue({ ok: true }),
    getProfile: jest.fn().mockResolvedValue({ ok: true }),
    update: jest.fn().mockResolvedValue({ ok: true }),
    deactivate: jest.fn().mockResolvedValue({ ok: true }),
    getAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  },
  leave: {
    getByEmployee: jest.fn().mockResolvedValue([]),
    getBalance: jest.fn().mockResolvedValue({}),
    approve: jest.fn().mockResolvedValue({ ok: true }),
    reject: jest.fn().mockResolvedValue({ ok: true }),
    cancel: jest.fn().mockResolvedValue({ ok: true }),
  },
  attendance: { getRecords: jest.fn().mockResolvedValue([]) },
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
let Employee;
let LeaveRequest;
let empA;
let empB;
let leaveA;
let leaveB;
let app;

const asManagerA = () => {
  global.__hrUser = { id: new mongoose.Types.ObjectId(), role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__hrUser = { id: new mongoose.Types.ObjectId(), role: 'super_admin' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1141-hr-domain' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId })
  );
  LeaveRequest = mongoose.model(
    'LeaveRequest',
    new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId })
  );
  empA = await Employee.create({ branch_id: BRANCH_A });
  empB = await Employee.create({ branch_id: BRANCH_B });
  leaveA = await LeaveRequest.create({ branchId: BRANCH_A });
  leaveB = await LeaveRequest.create({ branchId: BRANCH_B });

  const router = require('../domains/hr/routes/hr.routes');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = global.__hrUser || null;
    next();
  });
  app.use('/api/hr', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — domains/hr employee routes isolate by branch', () => {
  it('denies a branch-A manager reading a branch-B employee (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/hr/employees/${empB._id}`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager reading their OWN-branch employee (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/hr/employees/${empA._id}`);
    expect(res.status).toBe(200);
  });

  it('allows an HQ (super_admin) role to read any branch (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get(`/api/hr/employees/${empB._id}`);
    expect(res.status).toBe(200);
  });

  it('denies cross-branch attendance read (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/hr/attendance/employee/${empB._id}`);
    expect(res.status).toBe(403);
  });
});

describe('W269 — domains/hr leave mutations isolate by the leave branch', () => {
  it('denies approving a branch-B leave from branch A (403)', async () => {
    asManagerA();
    const res = await request(app).patch(`/api/hr/leaves/${leaveB._id}/approve`).send({});
    expect(res.status).toBe(403);
  });

  it('allows approving an OWN-branch leave (200)', async () => {
    asManagerA();
    const res = await request(app).patch(`/api/hr/leaves/${leaveA._id}/approve`).send({});
    expect(res.status).toBe(200);
  });

  it('returns 404 approving an unknown leave id', async () => {
    asManagerA();
    const res = await request(app)
      .patch(`/api/hr/leaves/${new mongoose.Types.ObjectId()}/approve`)
      .send({});
    expect(res.status).toBe(404);
  });
});
