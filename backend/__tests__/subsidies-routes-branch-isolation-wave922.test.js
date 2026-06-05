'use strict';

/**
 * subsidies-routes-branch-isolation-wave922.test.js — W922.
 *
 * Hardens subsidy list/summary and id-keyed mutations with beneficiary scope.
 */

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
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(role)) return next();
    return res.status(403).json({ success: false });
  },
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const financeA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'finance',
  branchId: String(BRANCH_A),
};

let mongod;
let Subsidy;
let Beneficiary;
let app;

function subsidyDoc(beneficiaryId, branchId, month, amountSAR, status = 'expected') {
  return {
    beneficiaryId,
    branchId,
    year: 2026,
    month,
    subsidyType: 'social_security',
    amountSAR,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w922-subsidies' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Subsidy = require('../models/BeneficiarySubsidyEntry');
  Beneficiary = require('../models/Beneficiary');
  await Subsidy.init();

  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/subsidies', require('../routes/subsidies.routes'));
  app = appExpress;

  await Beneficiary.collection.insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
});

beforeEach(() => {
  mockAuthState.user = financeA;
});

afterEach(async () => {
  await Subsidy.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W922 — subsidies routes branch isolation', () => {
  it('lists only subsidies of in-scope beneficiaries', async () => {
    await Subsidy.collection.insertMany([
      subsidyDoc(BENE_A, BRANCH_A, 1, 500),
      subsidyDoc(BENE_B, BRANCH_B, 2, 900),
    ]);
    const res = await request(app).get('/api/v1/subsidies');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].beneficiaryId)).toBe(String(BENE_A));
  });

  it('returns 404 for foreign beneficiary on /by-beneficiary/:id', async () => {
    const res = await request(app).get(`/api/v1/subsidies/by-beneficiary/${BENE_B}`);
    expect(res.status).toBe(404);
  });

  it('scopes summary to in-scope beneficiaries only', async () => {
    await Subsidy.collection.insertMany([
      subsidyDoc(BENE_A, BRANCH_A, 3, 700, 'received'),
      subsidyDoc(BENE_B, BRANCH_B, 4, 1300, 'received'),
    ]);

    const res = await request(app).get('/api/v1/subsidies/summary?year=2026');
    expect(res.status).toBe(200);
    expect(res.body.grandTotalReceived).toBe(700);
  });

  it('returns 404 for foreign subsidy PATCH /:id', async () => {
    const { insertedId } = await Subsidy.collection.insertOne(
      subsidyDoc(BENE_B, BRANCH_B, 5, 1000)
    );
    const res = await request(app)
      .patch(`/api/v1/subsidies/${insertedId}`)
      .send({ notes: 'probe' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign subsidy POST /:id/mark-received', async () => {
    const { insertedId } = await Subsidy.collection.insertOne(
      subsidyDoc(BENE_B, BRANCH_B, 6, 1200)
    );
    const res = await request(app).post(`/api/v1/subsidies/${insertedId}/mark-received`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign subsidy DELETE /:id', async () => {
    const { insertedId } = await Subsidy.collection.insertOne(subsidyDoc(BENE_B, BRANCH_B, 7, 600));
    const res = await request(app).delete(`/api/v1/subsidies/${insertedId}`);
    expect(res.status).toBe(404);
  });

  it('stamps branchId from scoped beneficiary on POST /', async () => {
    const res = await request(app)
      .post('/api/v1/subsidies')
      .send({
        beneficiaryId: String(BENE_A),
        year: 2026,
        month: 8,
        subsidyType: 'social_security',
        amountSAR: 1111,
        status: 'expected',
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});
