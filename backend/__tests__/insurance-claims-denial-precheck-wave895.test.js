'use strict';

/** insurance-claims-denial-precheck-wave895.test.js — W895 */

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
let InsuranceContract;
let PreAuthorization;
let InsuranceClaim;
let ClaimItem;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const receptionistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'receptionist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/insurance-claims', require('../routes/insuranceClaims.routes'));
  return app;
}

async function seedContract(overrides = {}) {
  return InsuranceContract.create({
    contractNumber: `CNT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name: { ar: 'عقد تأمين' },
    startDate: new Date(Date.now() - 30 * 86400000),
    endDate: new Date(Date.now() + 365 * 86400000),
    status: 'active',
    coveredServices: [{ serviceCategory: 'therapy_session', requiresPreAuth: true }],
    ...overrides,
  });
}

async function seedClaim({ beneficiary, contract, preAuthorization = null, diagnosis = [] }) {
  return InsuranceClaim.create({
    beneficiary,
    contract,
    preAuthorization,
    claimType: 'institutional',
    visitDate: new Date(),
    membershipNumber: 'MEM-100',
    diagnosis,
    totalGross: 100,
    totalNet: 100,
    status: 'draft',
  });
}

async function seedItem(claimId, overrides = {}) {
  return ClaimItem.create({
    claim: claimId,
    sequence: 1,
    serviceCode: 'PT001',
    category: 'therapy',
    unitPrice: 100,
    quantity: 1,
    totalNet: 100,
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w895-denial-precheck' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({
    InsuranceContract,
    PreAuthorization,
    InsuranceClaim,
    ClaimItem,
  } = require('../models/insuranceClaim.model'));
  Beneficiary = require('../models/Beneficiary');

  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A, status: 'active' });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B, status: 'active' });
});

beforeEach(async () => {
  mockAuthState.user = receptionistA;
  await ClaimItem.deleteMany({});
  await InsuranceClaim.deleteMany({});
  await PreAuthorization.deleteMany({});
  await InsuranceContract.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W895 — denial precheck and guarded submit', () => {
  it('GET /claims/:id/denial-precheck returns critical blockers', async () => {
    const contract = await seedContract();
    const claim = await seedClaim({ beneficiary: BENE_A, contract: contract._id, diagnosis: [] });
    await seedItem(claim._id);

    const res = await request(buildApp()).get(
      `/api/insurance-claims/claims/${claim._id}/denial-precheck`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.readyToSubmit).toBe(false);
    const codes = res.body.data.blockers.map(b => b.code);
    expect(codes).toContain('CLAIM_MISSING_PRINCIPAL_DIAGNOSIS');
    expect(codes).toContain('CLAIM_PREAUTH_REQUIRED');
  });

  it('PATCH /claims/:id/submit blocks with 409 when precheck fails', async () => {
    const contract = await seedContract();
    const claim = await seedClaim({ beneficiary: BENE_A, contract: contract._id, diagnosis: [] });
    await seedItem(claim._id);

    const res = await request(buildApp())
      .patch(`/api/insurance-claims/claims/${claim._id}/submit`)
      .send({});
    expect(res.status).toBe(409);
    expect(res.body.precheck.readyToSubmit).toBe(false);
    const fresh = await InsuranceClaim.findById(claim._id).lean();
    expect(fresh.status).toBe('draft');
  });

  it('PATCH /claims/:id/submit succeeds when precheck passes', async () => {
    const contract = await seedContract();
    const preAuth = await PreAuthorization.create({
      beneficiary: BENE_A,
      contract: contract._id,
      urgency: 'routine',
      status: 'approved',
      approvalDetails: { validTo: new Date(Date.now() + 30 * 86400000) },
    });
    const claim = await seedClaim({
      beneficiary: BENE_A,
      contract: contract._id,
      preAuthorization: preAuth._id,
      diagnosis: [{ code: 'F840', type: 'principal' }],
    });
    await seedItem(claim._id);

    const res = await request(buildApp())
      .patch(`/api/insurance-claims/claims/${claim._id}/submit`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('submitted');
  });

  it('returns 404 for foreign-branch claim precheck', async () => {
    const contract = await seedContract();
    const claim = await seedClaim({
      beneficiary: BENE_B,
      contract: contract._id,
      diagnosis: [{ code: 'F840', type: 'principal' }],
    });
    await seedItem(claim._id);

    const res = await request(buildApp()).get(
      `/api/insurance-claims/claims/${claim._id}/denial-precheck`
    );
    expect(res.status).toBe(404);
  });
});
