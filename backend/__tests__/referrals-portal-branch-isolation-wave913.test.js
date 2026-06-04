'use strict';

/**
 * referrals-portal-branch-isolation-wave913.test.js — W913.
 *
 * Referral portal routes (referrals.routes.js) exposed PHI via bare findById
 * despite dualMountAuth. W913 adds requireBranchAccess + beneficiary/branch
 * scoping on list, instance, and sub-resource paths.
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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const coordinatorA = {
  _id: new mongoose.Types.ObjectId(),
  role: 'coordinator',
  branchId: String(BRANCH_A),
};

let mongod;
let referralB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w913-referrals-portal' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  if (mongoose.models.Referral) delete mongoose.models.Referral;
  mongoose.model(
    'Referral',
    new mongoose.Schema(
      {
        referralNumber: String,
        beneficiaryId: mongoose.Schema.Types.ObjectId,
        reason: String,
        urgency: String,
        status: String,
        isDeleted: { type: Boolean, default: false },
      },
      { timestamps: true }
    )
  );
  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/referrals', require('../routes/referrals.routes'));
  app = appExpress;

  const coll = mongoose.connection.collection('referrals');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await coll.insertOne({
    referralNumber: 'REF-A-913',
    beneficiaryId: BENE_A,
    reason: 'scope A',
    urgency: 'routine',
    status: 'pending',
    isDeleted: false,
  });
  const ins = await coll.insertOne({
    referralNumber: 'REF-B-913',
    beneficiaryId: BENE_B,
    reason: 'scope B',
    urgency: 'routine',
    status: 'pending',
    isDeleted: false,
  });
  referralB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = coordinatorA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W913 — referrals portal isolation', () => {
  it('lists only in-scope referrals', async () => {
    const res = await request(app).get('/api/v1/referrals');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].beneficiaryId)).toBe(String(BENE_A));
  });

  it('returns 404 for foreign-branch referral GET /:id', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralB}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign-branch PATCH /:id', async () => {
    const res = await request(app)
      .patch(`/api/v1/referrals/${referralB}`)
      .send({ reason: 'probe' });
    expect(res.status).toBe(404);
  });
});
