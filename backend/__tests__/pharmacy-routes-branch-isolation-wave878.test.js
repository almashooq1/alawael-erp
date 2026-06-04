'use strict';

/**
 * pharmacy-routes-branch-isolation-wave878.test.js — W878.
 * Prescriptions/dispensing tie to beneficiary; scoped via beneficiary branchId.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));

let mongod;
let Prescription;
let Beneficiary;
let User;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const NURSE_A = new mongoose.Types.ObjectId();

const nurseA = {
  _id: NURSE_A,
  id: String(NURSE_A),
  role: 'nurse',
  branchId: BRANCH_A,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/pharmacy', require('../routes/pharmacy.routes'));
  return app;
}

async function seedPrescription(beneficiaryId) {
  return Prescription.create({
    beneficiary: beneficiaryId,
    prescriber: NURSE_A,
    items: [],
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w878-pharm' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Beneficiary = require('../models/Beneficiary');
  User = require('../models/User');
  ({ Prescription } = require('../models/pharmacy.model'));
  await User.collection.insertOne({
    _id: NURSE_A,
    username: 'nurse-w878',
    email: 'nurse-w878@test.local',
    fullName: 'Nurse W878',
    role: 'nurse',
    branchId: BRANCH_A,
  });
  await Beneficiary.collection.insertOne({
    _id: BENE_A,
    branchId: BRANCH_A,
    firstName: 'BenA',
    name: 'Ben A',
  });
  await Beneficiary.collection.insertOne({
    _id: BENE_B,
    branchId: BRANCH_B,
    firstName: 'BenB',
    name: 'Ben B',
  });
});

beforeEach(() => {
  mockAuthState.user = nurseA;
});

afterEach(async () => {
  await Prescription.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W878 — prescription beneficiary isolation', () => {
  it('GET /prescriptions/:id → 404 for foreign-branch beneficiary', async () => {
    const row = await seedPrescription(BENE_B);
    const res = await request(buildApp()).get(`/api/v1/pharmacy/prescriptions/${row._id}`);
    expect(res.status).toBe(404);
  });

  it('GET /prescriptions list is branch-scoped via beneficiary', async () => {
    await seedPrescription(BENE_A);
    await seedPrescription(BENE_B);
    const res = await request(buildApp()).get('/api/v1/pharmacy/prescriptions');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('PATCH /prescriptions/:id/cancel → 404 on foreign branch', async () => {
    const row = await seedPrescription(BENE_B);
    const res = await request(buildApp())
      .patch(`/api/v1/pharmacy/prescriptions/${row._id}/cancel`)
      .send({ reason: 'test' });
    expect(res.status).toBe(404);
  });
});
