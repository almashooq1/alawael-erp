'use strict';

/** medical-referrals-branch-isolation-wave902.test.js — W902 */

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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const doctorA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'doctor',
  branchId: String(BRANCH_A),
};

let mongod;
let referralB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/medical-referrals', require('../routes/medicalReferrals.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w902-referrals' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  const { MedicalReferral } = require('../models/medicalReferral.model');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await MedicalReferral.collection.insertOne({
    beneficiary: BENE_A,
    branchId: BRANCH_A,
    referralNumber: 'REF-A-902',
    applicantName: 'x',
    disabilityType: 'physical',
    disabilitySeverity: 'mild',
    status: 'draft',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const ins = await MedicalReferral.collection.insertOne({
    beneficiary: BENE_B,
    branchId: BRANCH_B,
    referralNumber: 'REF-B-902',
    disabilityType: 'physical',
    disabilitySeverity: 'mild',
    status: 'draft',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  referralB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = doctorA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W902 — medical referrals isolation', () => {
  it('returns 404 for foreign-branch referral GET /:id', async () => {
    const res = await request(buildApp()).get(`/api/medical-referrals/${referralB}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign-branch PATCH approve', async () => {
    const res = await request(buildApp())
      .patch(`/api/medical-referrals/${referralB}/approve`)
      .send({ reason: 'ok' });
    expect(res.status).toBe(404);
  });
});
