'use strict';

/**
 * contracts-routes-branch-isolation-wave920.test.js — W920.
 *
 * contracts.routes.js had requireBranchAccess mounted but list/stats and id-keyed
 * reads/mutations still queried without tenant scope.
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
  authorize: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(role)) return next();
    return res.status(403).json({ success: false });
  },
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let Contract;
let app;

function contractDoc(branchId, suffix, status = 'DRAFT') {
  return {
    contractNumber: `CT-2026-${suffix}`,
    contractTitle: `Contract ${suffix}`,
    contractType: 'SERVICE_AGREEMENT',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    status,
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w920-contracts-routes' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Contract = require('../models/Contract.model');
  await Contract.init();

  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/contracts', require('../routes/contracts.routes'));
  app = appExpress;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Contract.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W920 — contracts routes branch isolation', () => {
  it('lists only in-scope contracts', async () => {
    await Contract.collection.insertMany([
      contractDoc(BRANCH_A, 'A9201'),
      contractDoc(BRANCH_B, 'B9201'),
    ]);

    const res = await request(app).get('/api/v1/contracts');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch GET /:id', async () => {
    const { insertedId } = await Contract.collection.insertOne(contractDoc(BRANCH_B, 'B9202'));
    const res = await request(app).get(`/api/v1/contracts/${insertedId}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign-branch PUT /:id', async () => {
    const { insertedId } = await Contract.collection.insertOne(contractDoc(BRANCH_B, 'B9203'));
    const res = await request(app)
      .put(`/api/v1/contracts/${insertedId}`)
      .send({ contractTitle: 'probe' });
    expect(res.status).toBe(404);
  });

  it('scopes /stats/summary counts to caller branch', async () => {
    await Contract.collection.insertMany([
      contractDoc(BRANCH_A, 'A9204', 'ACTIVE'),
      contractDoc(BRANCH_B, 'B9204', 'ACTIVE'),
    ]);
    const res = await request(app).get('/api/v1/contracts/stats/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.active).toBe(1);
  });

  it('stamps caller branch on POST /', async () => {
    const res = await request(app).post('/api/v1/contracts').send({
      contractTitle: 'New Contract A',
      contractType: 'SERVICE_AGREEMENT',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      value: 1000,
      liabilityInsurance: 'covered',
    });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('rejects foreign branchId spoofing on POST /', async () => {
    const res = await request(app)
      .post('/api/v1/contracts')
      .send({
        contractTitle: 'Spoof Contract',
        contractType: 'SERVICE_AGREEMENT',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        value: 2000,
        liabilityInsurance: 'covered',
        branchId: String(BRANCH_B),
      });
    expect(res.status).toBe(403);
  });
});
