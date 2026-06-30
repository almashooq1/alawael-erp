'use strict';

/**
 * payment-gateway-transaction-branch-isolation-wave1552.test.js — W1552
 *
 * Guards two cross-branch IDORs on /api/payment-gateway (PaymentTransaction.branchId
 * is required; sibling list/stats already scope via effectiveBranchScope):
 *  - GET /transactions/:id fetched findOne({_id, deletedAt:null}) with no branch →
 *    any admin/finance/manager read another branch's transaction (customer PII,
 *    amounts, gateway/ZATCA ids).
 *  - POST /:id/refund → service.processRefund did findById(id) with no branch →
 *    a finance/admin user could refund another branch's paid transaction.
 * Fix: both now spread the caller's effectiveBranchScope (null = cross-branch/HQ).
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authenticateToken: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
// idempotency factory → pass-through (no store dependency in the test)
jest.mock('../middleware/idempotency.middleware', () => () => (_req, _res, next) => next());

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const managerA = {
  _id: new mongoose.Types.ObjectId(),
  id: 'mA',
  role: 'manager',
  branchId: String(BRANCH_A),
};
const adminCross = { _id: new mongoose.Types.ObjectId(), id: 'ad', role: 'admin' };

let mongod;
let app;
let txnA;
let txnB;
let txnAFailed;

const seedTxn = async (over = {}) => {
  const PaymentTransaction = require('../models/PaymentTransaction');
  const r = await PaymentTransaction.collection.insertOne({
    uuid: 'w1552-' + Math.random().toString(36).slice(2, 10),
    amount: 100,
    refundedAmount: 0,
    status: 'paid',
    branchId: BRANCH_A,
    deletedAt: null,
    customerEmail: 'x@y.z',
    ...over,
  });
  return r.insertedId;
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1552-pg' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  app = express();
  app.use(express.json());
  app.use('/api/payment-gateway', require('../routes/payment-gateway.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  txnA = await seedTxn({ branchId: BRANCH_A });
  txnB = await seedTxn({ branchId: BRANCH_B });
  txnAFailed = await seedTxn({ branchId: BRANCH_A, status: 'failed' });
});

beforeEach(() => {
  mockUser.u = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1552 — payment-gateway transaction branch isolation', () => {
  it('GET /transactions/:id — restricted user 404s on a foreign-branch transaction', async () => {
    const r = await request(app).get(`/api/payment-gateway/transactions/${txnB}`);
    expect(r.status).toBe(404);
  });

  it('GET /transactions/:id — restricted user reads its own-branch transaction', async () => {
    const r = await request(app).get(`/api/payment-gateway/transactions/${txnA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(txnA));
  });

  it('GET /transactions/:id — cross-branch role reads any transaction', async () => {
    mockUser.u = adminCross;
    const r = await request(app).get(`/api/payment-gateway/transactions/${txnB}`);
    expect(r.status).toBe(200);
  });

  it('refund — restricted user is blocked from a foreign-branch transaction (not-found)', async () => {
    const r = await request(app)
      .post(`/api/payment-gateway/${txnB}/refund`)
      .send({ amount: 10, reason: 'x' });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(r.body)).toContain('غير موجودة'); // blocked at the branch-scoped lookup
  });

  it('refund — own-branch transaction passes the branch check (reaches the status guard)', async () => {
    const r = await request(app)
      .post(`/api/payment-gateway/${txnAFailed}/refund`)
      .send({ amount: 10, reason: 'x' });
    expect(r.status).toBeGreaterThanOrEqual(400);
    // proves the branch guard let it through — it failed on status, not not-found
    expect(JSON.stringify(r.body)).toContain('غير مدفوعة');
  });

  it('static: GET + refund are branch-scoped', () => {
    const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'payment-gateway.routes.js'), 'utf8');
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'paymentGateway.service.js'), 'utf8');
    expect(route).toMatch(/branchId: _branch/); // GET /transactions/:id scoped
    expect(route).toMatch(/effectiveBranchScope\(req\)\s*\)/); // branch passed to processRefund
    expect(svc).toMatch(/branchScope \? \{ branchId: branchScope \}/); // service applies it
  });
});
