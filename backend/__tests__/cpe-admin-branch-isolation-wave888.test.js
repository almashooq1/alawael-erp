'use strict';

/** cpe-admin-branch-isolation-wave888.test.js — W888 */

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
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let CpeRecord;
let Employee;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const EMP_A = new mongoose.Types.ObjectId();
const EMP_B = new mongoose.Types.ObjectId();

const hrA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'hr_manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/hr/cpe', require('../routes/cpe-admin.routes'));
  return app;
}

async function seedRecord(employeeId) {
  return CpeRecord.create({
    employeeId,
    activityName: 'دورة',
    category: '1',
    creditHours: 2,
    activityDate: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w888-cpe' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  CpeRecord = require('../models/CpeRecord');
  Employee = require('../models/HR/Employee');
  await Employee.collection.insertOne({
    _id: EMP_A,
    branch_id: BRANCH_A,
    name_ar: 'موظف أ',
    scfhs_number: 'SCFHS-A',
    status: 'active',
  });
  await Employee.collection.insertOne({
    _id: EMP_B,
    branch_id: BRANCH_B,
    name_ar: 'موظف ب',
    scfhs_number: 'SCFHS-B',
    status: 'active',
  });
});

beforeEach(() => {
  mockAuthState.user = hrA;
});

afterEach(async () => {
  await CpeRecord.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W888 — GET / list isolation', () => {
  it('returns only records for caller-branch employees', async () => {
    await seedRecord(EMP_A);
    await seedRecord(EMP_B);
    const res = await request(buildApp()).get('/api/admin/hr/cpe');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('W888 — POST rejects foreign employee', () => {
  it('returns 404 when employeeId is outside caller branch', async () => {
    const res = await request(buildApp())
      .post('/api/admin/hr/cpe')
      .send({
        employeeId: String(EMP_B),
        activityName: 'دورة',
        category: '1',
        creditHours: 2,
        activityDate: new Date().toISOString(),
      });
    expect(res.status).toBe(404);
  });
});

describe('W888 — PATCH /:id isolation', () => {
  it('returns 404 for foreign-branch employee record (IDOR regression)', async () => {
    const row = await seedRecord(EMP_B);
    const res = await request(buildApp())
      .patch(`/api/admin/hr/cpe/${row._id}`)
      .send({ activityName: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('W888 — GET /overview isolation', () => {
  it('counts only caller-branch licensed employees', async () => {
    const res = await request(buildApp()).get('/api/admin/hr/cpe/overview');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
});
