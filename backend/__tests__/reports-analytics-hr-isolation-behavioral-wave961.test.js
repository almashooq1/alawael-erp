'use strict';

/**
 * W961 behavioral — cross-branch isolation for the reports-analytics-module
 * `/analytics/hr` endpoint, locking in the W959 `hrBranchOnly` fix.
 *
 * Before W959, `leave_requests` + `attendance_records` matched raw
 * `{ deleted_at: null }` (the handler's matchHR carries `is_active` which must
 * not apply to them), so a restricted caller saw every branch's leave/attendance
 * data. W959 introduced a branch-only scope (`hrBranchOnly`). This proves a
 * restricted caller now sees ONLY their branch's leaves, while HQ sees all.
 *
 * Companion to reports-analytics-branch-isolation-behavioral-wave959 (financial).
 * Same approach: real route mounted, auth/branch middleware mocked to inject a
 * per-request scope via `x-test-branch`; the REAL applyRawBranchScope runs.
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w961-hr' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  await Promise.all([
    db.collection('leave_requests').deleteMany({}),
    db.collection('attendance_records').deleteMany({}),
    db.collection('users').deleteMany({}),
  ]);
  await db.collection('leave_requests').insertMany([
    { deleted_at: null, leave_type: 'annual', branch_id: oid(A) },
    { deleted_at: null, leave_type: 'annual', branch_id: oid(A) },
    { deleted_at: null, leave_type: 'sick', branch_id: oid(B) }, // foreign branch
  ]);
  await db.collection('users').insertMany([
    { deleted_at: null, is_active: true, department: 'therapy', branch_id: oid(A) },
    { deleted_at: null, is_active: true, department: 'admin', branch_id: oid(B) },
  ]);

  app = express();
  app.use('/', require('../routes/reports-analytics-module.routes'));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const get = branch => request(app).get('/analytics/hr').set('x-test-branch', branch);
const totalLeaves = body => (body.data.leaves_by_type || []).reduce((s, r) => s + (r.count || 0), 0);

describe('W961 — /analytics/hr cross-branch isolation (hrBranchOnly)', () => {
  it('a restricted caller sees ONLY their branch leaves (2 annual, never the foreign sick)', async () => {
    const res = await get(A);
    expect(res.status).toBe(200);
    expect(totalLeaves(res.body)).toBe(2);
    const labels = (res.body.data.leaves_by_type || []).map(r => r.label);
    expect(labels).toContain('annual');
    expect(labels).not.toContain('sick'); // branch B's leave must not leak
  });

  it('a foreign-branch caller sees ONLY their own (1 sick), never branch A', async () => {
    const res = await get(B);
    expect(res.status).toBe(200);
    expect(totalLeaves(res.body)).toBe(1);
    const labels = (res.body.data.leaves_by_type || []).map(r => r.label);
    expect(labels).toContain('sick');
    expect(labels).not.toContain('annual');
  });

  it('an HQ caller sees ALL branches (3 leaves across both types)', async () => {
    const res = await get('HQ');
    expect(res.status).toBe(200);
    expect(totalLeaves(res.body)).toBe(3);
  });
}, 60000);
