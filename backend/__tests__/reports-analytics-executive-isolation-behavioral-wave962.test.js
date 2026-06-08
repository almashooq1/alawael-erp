'use strict';

/**
 * W962 behavioral — cross-branch isolation for the reports-analytics-module
 * `/analytics/executive` endpoint, locking in the W959 fix that routed its
 * beneficiaries (monthly registrations) + invoices (revenue) aggregations
 * through the handler's own branch-scoped `buildMatch()` helper.
 *
 * Third companion to W960 (financial / matchInvoice+HQ-gate) and W961
 * (hr / hrBranchOnly) — together they behaviorally cover all three distinct
 * branch-scope mechanisms used across the reports-analytics handlers.
 *
 * Proves a restricted caller's executive KPIs reflect ONLY their branch's
 * beneficiaries + revenue, while HQ sees all branches.
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

const A = '5f9d88b9c2a4e10017a1aaaa';
const B = '5f9d88b9c2a4e10017a1bbbb';
const oid = h => new mongoose.Types.ObjectId(h);

let mongod;
let app;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w962-exec' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  await Promise.all([
    db.collection('beneficiaries').deleteMany({}),
    db.collection('invoices').deleteMany({}),
  ]);
  await db.collection('beneficiaries').insertMany([
    { deleted_at: null, status: 'active', disability_type: 'physical', createdAt: new Date(), branch_id: oid(A) },
    { deleted_at: null, status: 'active', disability_type: 'sensory', createdAt: new Date(), branch_id: oid(A) },
    { deleted_at: null, status: 'active', disability_type: 'physical', createdAt: new Date(), branch_id: oid(B) }, // foreign
  ]);
  await db.collection('invoices').insertMany([
    { deleted_at: null, status: 'paid', total_amount: 300, branch_id: oid(A) },
    { deleted_at: null, status: 'paid', total_amount: 500, branch_id: oid(B) }, // foreign
  ]);

  app = express();
  app.use('/', require('../routes/reports-analytics-module.routes'));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const get = branch => request(app).get('/analytics/executive').set('x-test-branch', branch);

describe('W962 — /analytics/executive cross-branch isolation (buildMatch)', () => {
  it('a restricted caller sees ONLY their branch beneficiaries (2) + revenue (300)', async () => {
    const res = await get(A);
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total_beneficiaries).toBe(2);
    expect(res.body.data.kpis.total_revenue).toBe(300);
  });

  it('a foreign-branch caller sees ONLY their own (1 beneficiary, 500 revenue)', async () => {
    const res = await get(B);
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total_beneficiaries).toBe(1);
    expect(res.body.data.kpis.total_revenue).toBe(500);
  });

  it('an HQ caller sees ALL branches (3 beneficiaries, 800 revenue)', async () => {
    const res = await get('HQ');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total_beneficiaries).toBe(3);
    expect(res.body.data.kpis.total_revenue).toBe(800);
  });
}, 60000);
