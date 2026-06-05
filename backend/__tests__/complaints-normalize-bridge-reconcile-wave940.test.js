'use strict';

/**
 * complaints-normalize-bridge-reconcile-wave940.test.js — W940.
 *
 * W930 added `normalizeComplaintInput` to bridge the web-admin complaint form
 * (UPPER source codes, no `subject` field, free Arabic `category`) onto the
 * model contract. But its source coercion fell back to 'other' for ANY value
 * and it backfilled `subject` even when explicitly empty — silently laundering
 * invalid input and regressing the W866 validation contract (CI gate failure:
 * "rejects a complaint with an invalid source/no subject (400)").
 *
 * W940 reconciles both contracts:
 *   • Known source (UPPER web-admin code or lowercase enum) → mapped/accepted.
 *   • Unknown source (e.g. 'martian')                       → left → 400.
 *   • Absent subject (web-admin form)                       → derived → accepted.
 *   • Explicit empty/whitespace subject                     → left → 400.
 *
 * This guards the normalizer in BOTH directions so neither contract silently
 * regresses again.
 */

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.unmock('mongoose');
jest.setTimeout(60000);

const BRANCH_A = new mongoose.Types.ObjectId();
const MANAGER_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: MANAGER_A,
  id: String(MANAGER_A),
  role: 'manager',
  name: 'مدير الفرع',
  branchId: String(BRANCH_A),
};

const mockAuthState = { user: managerA };

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (req, res, next) => {
    const ALLOWED = ['admin', 'super_admin', 'manager'];
    const role = req.user && req.user.role;
    if (ALLOWED.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let Complaint;
let app;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/complaints', require('../routes/complaints.routes'));
  return app;
}

function post(body) {
  return request(app).post('/api/v1/complaints').send(body);
}

const base = {
  subject: 'تأخر في الرد',
  description: 'لم أتلقَ رداً على طلبي',
  source: 'customer',
  type: 'complaint',
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w940-complaints-normalize' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User');
  Complaint = require('../models/Complaint');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Complaint.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W940 — complaint normalizer reconciles the W930 bridge with W866 validation', () => {
  it('rejects an unknown source instead of laundering it to "other" (400)', async () => {
    const res = await post({ ...base, source: 'martian' });
    expect(res.status).toBe(400);
  });

  it('rejects an explicit empty subject instead of backfilling it (400)', async () => {
    const res = await post({ ...base, subject: '' });
    expect(res.status).toBe(400);
  });

  it('maps a web-admin UPPER source code (FAMILY → parent) and accepts (201)', async () => {
    const res = await post({ ...base, source: 'FAMILY' });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe('parent');
  });

  it('derives subject from category/description when the field is ABSENT (201)', async () => {
    const { subject, ...noSubject } = base;
    const res = await post({ ...noSubject, category: 'تأخر الخدمة' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.subject).length).toBeGreaterThan(0);
  });
});
