'use strict';

/**
 * W959 behavioral — end-to-end cross-branch isolation for the
 * reports-analytics-module `/analytics/financial` endpoint. Locks in:
 *   - W957: the `invoices` aggregations are branch-scoped (a restricted caller
 *     sees ONLY their branch's revenue, never every branch's).
 *   - W958: the `finance_payments` breakdown (no branch field → unscopable) is
 *     HQ-gated — [] for a restricted caller, full data for an HQ caller.
 *
 * Pairs the static/ratchet guards (untenanted-aggregations-ratchet-wave944,
 * raw-branch-scope-c3a) with a behavioral counterpart per the project doctrine
 * "pair every static drift guard with a behavioral counterpart". A future edit
 * that drops the scope on these aggregations turns this RED.
 *
 * Auth + branch middleware are mocked to inject a per-request branch scope via
 * an `x-test-branch` header (a branch ObjectId-hex, or "HQ" for cross-branch).
 * The handlers read the scope through the REAL applyRawBranchScope /
 * effectiveBranchScope, so the isolation logic under test is exercised for real.
 */

jest.unmock('mongoose');

jest.mock('../middleware/auth', () => ({
  authenticate: (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    const b = req.headers['x-test-branch'];
    req.branchScope =
      b === 'HQ' ? { restricted: false, branchId: null } : { restricted: true, branchId: b };
    next();
  },
  branchFilter: () => ({}),
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const A = '5f9d88b9c2a4e10017a1aaaa'; // branch A
const B = '5f9d88b9c2a4e10017a1bbbb'; // branch B
const oid = h => new mongoose.Types.ObjectId(h);

let mongod;
let app;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w959-financial' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  await Promise.all([
    db.collection('invoices').deleteMany({}),
    db.collection('finance_payments').deleteMany({}),
    db.collection('expenses').deleteMany({}),
  ]);
  await db.collection('invoices').insertMany([
    { deleted_at: null, status: 'paid', total_amount: 100, vat_amount: 15, invoice_date: new Date('2026-01-15'), branch_id: oid(A) },
    { deleted_at: null, status: 'paid', total_amount: 200, vat_amount: 30, invoice_date: new Date('2026-02-15'), branch_id: oid(A) },
    { deleted_at: null, status: 'paid', total_amount: 500, vat_amount: 75, invoice_date: new Date('2026-01-20'), branch_id: oid(B) },
  ]);
  await db.collection('finance_payments').insertMany([
    { deleted_at: null, payment_method: 'cash', amount: 80 }, // no branch_id (unscopable)
    { deleted_at: null, payment_method: 'card', amount: 120 },
  ]);
  await db.collection('expenses').insertMany([{ deleted_at: null, category: 'rent', amount: 300 }]);

  app = express();
  app.use('/', require('../routes/reports-analytics-module.routes'));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const get = branch => request(app).get('/analytics/financial').set('x-test-branch', branch);

describe('W959 — /analytics/financial cross-branch isolation', () => {
  it('W957: a restricted caller sees ONLY their own branch invoices (300, not 800)', async () => {
    const res = await get(A);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total_invoiced).toBe(300);
  });

  it('W957: a foreign-branch caller sees ONLY their branch (500), never branch A', async () => {
    const res = await get(B);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total_invoiced).toBe(500);
  });

  it('an HQ / cross-branch caller sees ALL branches (800)', async () => {
    const res = await get('HQ');
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total_invoiced).toBe(800);
  });

  it('W958: a restricted caller gets [] for the finance_payments breakdown (HQ-gated)', async () => {
    const res = await get(A);
    expect(res.body.data.revenue_by_payment_method).toEqual([]);
  });

  it('W958: an HQ caller gets the finance_payments breakdown', async () => {
    const res = await get('HQ');
    expect(Array.isArray(res.body.data.revenue_by_payment_method)).toBe(true);
    expect(res.body.data.revenue_by_payment_method.length).toBeGreaterThan(0);
  });
}, 60000);
