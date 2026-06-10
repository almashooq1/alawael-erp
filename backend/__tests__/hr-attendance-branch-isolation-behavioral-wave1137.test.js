'use strict';

/**
 * hr-attendance-branch-isolation-behavioral-wave1137.test.js — W269 behavioral.
 *
 * Proves the runtime behaviour the static guard (branch-isolation-hr-attendance-
 * wave1137) can only assert by source shape: a branch-A manager is denied (403)
 * another branch's employee attendance + record mutations, an HQ (super_admin)
 * role is not, and same-branch access flows through to the (mocked) engine.
 *
 * The AttendanceEngine + the record model are mocked so the test isolates the
 * BRANCH-GATE behaviour (not engine internals). Employee is a real MMS-backed
 * model so enforceEmployeeBranch resolves branch_id for real.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-attendance-branch-isolation-behavioral-wave1137.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Auth → pass-through; authenticateToken injects the per-test user.
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = global.__attUser || null;
    next();
  },
  authorizeRole: () => (_req, _res, next) => next(),
}));

// AttendanceEngine mocked — the allowed path should reach it; the denied path must not.
jest.mock('../services/hr/attendanceEngine', () => ({
  getEmployeeRecords: jest.fn().mockResolvedValue({ items: [] }),
  getMonthlyReport: jest.fn().mockResolvedValue({ days: [] }),
  getEmployeeShift: jest.fn().mockResolvedValue({ name: 'day' }),
  checkIn: jest.fn().mockResolvedValue({ record: {} }),
  updateRecord: jest.fn().mockResolvedValue({ record: {} }),
  approveRecord: jest.fn().mockResolvedValue({ record: {} }),
  rejectRecord: jest.fn().mockResolvedValue({ record: {} }),
}));

// Attendance record store — guardRecordBranch resolves employeeId from here.
jest.mock('../models/advanced_attendance.model', () => ({
  findById: id => ({
    select: () => ({ lean: async () => (global.__attRecords || {})[String(id)] || null }),
  }),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const REC_A = new mongoose.Types.ObjectId();
const REC_B = new mongoose.Types.ObjectId();
let Employee;
let empA;
let empB;
let app;

const asManagerA = () => {
  global.__attUser = { id: new mongoose.Types.ObjectId(), role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__attUser = { id: new mongoose.Types.ObjectId(), role: 'super_admin' };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1137-hr-att' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, fullName: String })
  );
  empA = await Employee.create({ branch_id: BRANCH_A, fullName: 'EmpA' });
  empB = await Employee.create({ branch_id: BRANCH_B, fullName: 'EmpB' });

  global.__attRecords = {
    [String(REC_A)]: { employeeId: empA._id },
    [String(REC_B)]: { employeeId: empB._id },
  };

  const router = require('../routes/hr-attendance.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/hr-attendance', router);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — hr-attendance :employeeId routes isolate by branch', () => {
  it('denies a branch-A manager reading a branch-B employee records (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/v1/hr-attendance/employee/${empB._id}/records`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager reading their OWN-branch employee records (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/api/v1/hr-attendance/employee/${empA._id}/records`);
    expect(res.status).toBe(200);
  });

  it('allows an HQ (super_admin) role to read any branch (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get(`/api/v1/hr-attendance/employee/${empB._id}/records`);
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager a manual check-in for a branch-B employee (403)', async () => {
    asManagerA();
    const res = await request(app)
      .post(`/api/v1/hr-attendance/employee/${empB._id}/check-in`)
      .send({});
    expect(res.status).toBe(403);
  });
});

describe('W269 — hr-attendance :recordId mutations isolate by the record owner branch', () => {
  it('denies updating a branch-B record from branch A (403)', async () => {
    asManagerA();
    const res = await request(app)
      .put(`/api/v1/hr-attendance/records/${REC_B}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(403);
  });

  it('allows updating an OWN-branch record (200)', async () => {
    asManagerA();
    const res = await request(app)
      .put(`/api/v1/hr-attendance/records/${REC_A}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(200);
  });

  it('returns 404 for an unknown record id', async () => {
    asManagerA();
    const res = await request(app)
      .put(`/api/v1/hr-attendance/records/${new mongoose.Types.ObjectId()}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(404);
  });
});
