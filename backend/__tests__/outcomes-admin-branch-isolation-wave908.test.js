'use strict';

/** outcomes-admin-branch-isolation-wave908.test.js — W908 */

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
let Beneficiary;
let ClinicalAssessment;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/outcomes', require('../routes/outcomes-admin.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w898-outcomes-admin-isolation' },
  });
  await mongoose.connect(mongod.getUri());
  Beneficiary = require('../models/Beneficiary');
  ClinicalAssessment = require('../models/ClinicalAssessment');
});

beforeEach(async () => {
  mockAuthState.user = managerA;
  await ClinicalAssessment.deleteMany({});
  await Beneficiary.deleteMany({});

  await Beneficiary.collection.insertOne({
    _id: BENE_A,
    branchId: BRANCH_A,
    firstName_ar: 'أ',
    lastName_ar: 'واحد',
    beneficiaryNumber: 'A-001',
  });
  await Beneficiary.collection.insertOne({
    _id: BENE_B,
    branchId: BRANCH_B,
    firstName_ar: 'ب',
    lastName_ar: 'اثنان',
    beneficiaryNumber: 'B-002',
  });

  const dt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await ClinicalAssessment.create({
    beneficiary: BENE_A,
    branchId: BRANCH_A,
    tool: 'GAS',
    assessmentDate: dt,
    score: 75,
    interpretation: 'mild',
  });
  await ClinicalAssessment.create({
    beneficiary: BENE_A,
    branchId: BRANCH_A,
    tool: 'GAS',
    assessmentDate: dt,
    score: 70,
    interpretation: 'mild',
  });
  await ClinicalAssessment.create({
    beneficiary: BENE_B,
    branchId: BRANCH_B,
    tool: 'GAS',
    assessmentDate: dt,
    score: 20,
    interpretation: 'severe',
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W908 — outcomes-admin branch isolation', () => {
  it('GET / returns only in-scope branch assessments', async () => {
    const res = await request(buildApp()).get('/api/admin/outcomes');
    expect(res.status).toBe(200);
    expect(res.body.totalAssessments).toBe(2);
  });

  it('GET /beneficiary/:id returns 404 for foreign-branch beneficiary', async () => {
    const res = await request(buildApp()).get(`/api/admin/outcomes/beneficiary/${BENE_B}`);
    expect(res.status).toBe(404);
  });

  it('GET /overview counts only in-scope beneficiaries', async () => {
    const res = await request(buildApp()).get('/api/admin/outcomes/overview');
    expect(res.status).toBe(200);
    expect(res.body.totalBeneficiaries).toBe(1);
  });

  it('GET /export.csv excludes foreign-branch rows', async () => {
    const res = await request(buildApp()).get('/api/admin/outcomes/export.csv');
    expect(res.status).toBe(200);
    expect(res.text).toContain('A-001');
    expect(res.text).not.toContain('B-002');
  });
});
