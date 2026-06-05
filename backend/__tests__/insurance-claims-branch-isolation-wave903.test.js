'use strict';

/** insurance-claims-branch-isolation-wave903.test.js — W903 */

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

const receptionistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'receptionist',
  branchId: String(BRANCH_A),
};

function beneficiaryId(doc) {
  const b = doc?.beneficiary;
  return String(b?._id ?? b ?? '');
}

let mongod;
let claimB;
let contractId;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/insurance-claims', require('../routes/insuranceClaims.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w903-claims' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  const { InsuranceContract, InsuranceClaim } = require('../models/insuranceClaim.model');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  const contract = await InsuranceContract.create({
    contractNumber: 'CNT-903',
    name: { ar: 'عقد' },
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000 * 365),
    status: 'active',
  });
  contractId = contract._id;
  await InsuranceClaim.create({
    beneficiary: BENE_A,
    contract: contractId,
    claimType: 'institutional',
    visitDate: new Date(),
    membershipNumber: 'M-A',
    totalGross: 50,
    totalNet: 50,
    status: 'draft',
  });
  const claim = await InsuranceClaim.create({
    beneficiary: BENE_B,
    contract: contractId,
    claimType: 'institutional',
    visitDate: new Date(),
    membershipNumber: 'M-B',
    totalGross: 50,
    totalNet: 50,
    status: 'draft',
  });
  claimB = claim._id;
});

beforeEach(() => {
  mockAuthState.user = receptionistA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W903 — insurance claims isolation', () => {
  it('lists only in-scope claims', async () => {
    const res = await request(buildApp()).get('/api/insurance-claims/claims');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(beneficiaryId(res.body.data[0])).toBe(String(BENE_A));
  });

  it('returns 404 for foreign-branch claim GET /claims/:id', async () => {
    const res = await request(buildApp()).get(`/api/insurance-claims/claims/${claimB}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign-branch PUT /claims/:id', async () => {
    const res = await request(buildApp())
      .put(`/api/insurance-claims/claims/${claimB}`)
      .send({ notes: 'hack' });
    expect(res.status).toBe(404);
  });
});
