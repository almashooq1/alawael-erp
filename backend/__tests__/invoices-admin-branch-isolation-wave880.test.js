'use strict';

/**
 * invoices-admin-branch-isolation-wave880.test.js — W880.
 * W651 scoped /stats aggregates only; list + instance paths still used bare
 * findById. W880 branch-scopes every list/instance mutation. Real Express +
 * real branchScope + MongoMemoryServer; auth mocked only.
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
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

jest.mock('../middleware/piiAccess.middleware', () => () => (_req, _res, next) => next());
jest.mock('../middleware/idempotency.middleware', () => () => (_req, _res, next) => next());
// UniversalCode post-save can stall Jest when the catalog model is cold.
jest.mock('../services/universalCode/plugin', () => () => {});

let mongod;
let Invoice;
let app;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();

const cashierA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'cashier',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/invoices', require('../routes/invoices-admin.routes'));
  return app;
}

async function seedInvoice(branchId, overrides = {}) {
  return Invoice.create({
    invoiceNumber: `INV-TEST-${Math.random().toString(36).slice(2, 8)}`,
    beneficiary: BENE_A,
    branchId,
    subTotal: 100,
    totalAmount: 100,
    status: 'DRAFT',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w880-invoices' } });
  await mongoose.connect(mongod.getUri());
  require('../models/Beneficiary');
  Invoice = require('../models/Invoice');
  await Invoice.init();
  await mongoose.connection.collection('beneficiaries').insertOne({
    _id: BENE_A,
    branchId: BRANCH_A,
  });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = cashierA;
});

afterEach(async () => {
  await Invoice.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W880 — POST / stamps caller branch', () => {
  it('creates draft with branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/admin/invoices')
      .send({ beneficiary: String(BENE_A), subTotal: 50, totalAmount: 50 });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W880 — GET / list branch isolation', () => {
  it('returns only caller-branch invoices', async () => {
    await seedInvoice(BRANCH_A);
    await seedInvoice(BRANCH_B);
    const res = await request(app).get('/api/admin/invoices');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W880 — GET /:id branch isolation', () => {
  it('returns 404 for foreign-branch invoice (IDOR regression)', async () => {
    const inv = await seedInvoice(BRANCH_B);
    const res = await request(app).get(`/api/admin/invoices/${inv._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W880 — PATCH /:id branch isolation', () => {
  it('returns 404 for foreign-branch invoice (IDOR regression)', async () => {
    const inv = await seedInvoice(BRANCH_B);
    const res = await request(app).patch(`/api/admin/invoices/${inv._id}`).send({ notes: 'x' });
    expect(res.status).toBe(404);
  });
});
