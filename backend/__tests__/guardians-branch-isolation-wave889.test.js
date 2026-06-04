'use strict';

/** guardians-branch-isolation-wave889.test.js — W889 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));

let mongod;
let Guardian;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const GUARDIAN_A = new mongoose.Types.ObjectId();
const GUARDIAN_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const USER_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/guardians', require('../routes/guardians.routes'));
  return app;
}

async function seedGuardian(id, suffix, userId) {
  await Guardian.collection.insertOne({
    _id: id,
    firstName_ar: 'ولي',
    firstName_en: `Guardian${suffix}`,
    lastName_ar: 'الأمر',
    lastName_en: `Family${suffix}`,
    name_ar: `ولي ${suffix}`,
    phone: `9665000000${suffix}`,
    idNumber: `10${suffix}123456`,
    relationship: 'father',
    email: `guardian${suffix}@example.com`,
    userId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function seedBeneficiary(id, branchId, guardianId) {
  await Beneficiary.collection.insertOne({
    _id: id,
    branchId,
    status: 'active',
    guardians: [{ guardian: guardianId, relationship: 'father', isPrimary: true }],
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w889-guardians' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Guardian = require('../models/Guardian');
  Beneficiary = require('../models/Beneficiary');
  await seedGuardian(GUARDIAN_A, '1', USER_A);
  await seedGuardian(GUARDIAN_B, '2', USER_B);
  await seedBeneficiary(BENE_A, BRANCH_A, GUARDIAN_A);
  await seedBeneficiary(BENE_B, BRANCH_B, GUARDIAN_B);
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Guardian.updateOne({ _id: GUARDIAN_A }, { $set: { phone: '96650000001' } });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W889 — GET / list isolation', () => {
  it('returns only guardians linked to caller branch beneficiaries', async () => {
    const res = await request(buildApp()).get('/api/guardians');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0]._id)).toBe(String(GUARDIAN_A));
  });
});

describe('W889 — GET /:id isolation', () => {
  it('returns 404 for foreign-branch guardian (IDOR regression)', async () => {
    const res = await request(buildApp()).get(`/api/guardians/${GUARDIAN_B}`);
    expect(res.status).toBe(404);
  });
});

describe('W889 — PUT /:id isolation', () => {
  it('returns 404 for foreign-branch guardian update', async () => {
    const res = await request(buildApp())
      .put(`/api/guardians/${GUARDIAN_B}`)
      .send({ phone: '966512345678' });
    expect(res.status).toBe(404);
  });
});

describe('W889 — DELETE /:id isolation', () => {
  it('returns 404 for foreign-branch guardian delete', async () => {
    const res = await request(buildApp()).delete(`/api/guardians/${GUARDIAN_B}`);
    expect(res.status).toBe(404);
  });
});
