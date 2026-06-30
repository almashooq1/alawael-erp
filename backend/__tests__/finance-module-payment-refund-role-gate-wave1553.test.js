'use strict';

/**
 * finance-module-payment-refund-role-gate-wave1553.test.js — W1553
 *
 * Guards the fix for missing authorization on finance-module payment money-ops.
 * The router applied only authenticate + requireBranchAccess, so ANY authenticated
 * branch user (therapist, receptionist…) could POST /payments/:id/refund or
 * DELETE /payments/:id. Fix: gate both with authorize(FINANCE_WRITE_ROLES).
 *
 * Keeps the REAL authorize() (requireActual) and stubs only authenticate, so the
 * role gate itself is exercised.
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
jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return {
    ...actual,
    authenticate: (req, _res, next) => {
      req.user = mockUser.u;
      next();
    },
  };
});

const BRANCH_A = new mongoose.Types.ObjectId();
const financeUser = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'finance',
  branchId: String(BRANCH_A),
};
const therapistUser = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

let mongod;
let app;
let Payment;

const seedPayment = async (over = {}) => {
  // all required fields (refund does payment.save() → re-validates the full doc)
  // + a unique payment_number (it has a unique index → null-dup on repeated seeds)
  const r = await Payment.collection.insertOne({
    payment_number: 'PMT-W1553-' + Math.random().toString(36).slice(2, 9),
    invoice_id: new mongoose.Types.ObjectId(),
    beneficiary_id: new mongoose.Types.ObjectId(),
    branch_id: BRANCH_A,
    payment_date: new Date(),
    amount: 100,
    payment_method: 'cash',
    status: 'completed',
    deleted_at: null,
    ...over,
  });
  return r.insertedId;
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1553-fin' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Payment = require('../models/finance/Payment');
  app = express();
  app.use(express.json());
  app.use('/api/finance-module', require('../routes/finance-module.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = financeUser;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1553 — finance-module payment refund/delete role gate', () => {
  it('finance role CAN refund a completed payment', async () => {
    const id = await seedPayment({ status: 'completed' });
    const r = await request(app).post(`/api/finance-module/payments/${id}/refund`).send({ reason: 'x' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('refunded');
  });

  it('non-finance role (therapist) is 403 from refund', async () => {
    const id = await seedPayment({ status: 'completed' });
    mockUser.u = therapistUser;
    const r = await request(app).post(`/api/finance-module/payments/${id}/refund`).send({ reason: 'x' });
    expect(r.status).toBe(403);
  });

  it('non-finance role (therapist) is 403 from delete', async () => {
    const id = await seedPayment({ status: 'pending' });
    mockUser.u = therapistUser;
    const r = await request(app).delete(`/api/finance-module/payments/${id}`);
    expect(r.status).toBe(403);
  });

  it('finance role CAN delete a pending payment', async () => {
    const id = await seedPayment({ status: 'pending' });
    const r = await request(app).delete(`/api/finance-module/payments/${id}`);
    expect(r.status).toBe(200);
  });

  it('static: both money-ops carry authorize(FINANCE_WRITE_ROLES)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'finance-module.routes.js'), 'utf8');
    expect(src).toMatch(/authorize \} = require\('\.\.\/middleware\/auth'\)|authenticate, authorize/);
    const refund = src.slice(src.indexOf("'/payments/:id/refund'"), src.indexOf("'/payments/:id/refund'") + 200);
    expect(refund).toMatch(/authorize\(FINANCE_WRITE_ROLES\)/);
    const del = src.slice(src.indexOf("router.delete(\n  '/payments/:id'"), src.indexOf("router.delete(\n  '/payments/:id'") + 200);
    expect(del).toMatch(/authorize\(FINANCE_WRITE_ROLES\)/);
  });
});
