'use strict';

/**
 * hr-smart-analytics-no-branch-scope-wave527.test.js — W527 regression.
 *
 * Guards a behavioral bug where EVERY /api/v1/hr/smart-analytics/* endpoint
 * hung forever (never sent a response) whenever the caller omitted the
 * optional `branchId` query param — which is the normal case (the HR
 * Command Center frontend calls getFullDashboard({}) with no branchId).
 *
 * Root cause: `parseBranchId(undefined)` returns `null` to mean "no branch
 * filter — valid, query all branches", and `extractScope` returned `null`
 * BOTH for that valid case AND for the "invalid branchId, 400 already sent"
 * case. Each handler did `if (branchId === null) return;`, so a missing
 * branchId returned out of the handler WITHOUT sending any response → the
 * request hung until the client timed out (frontend showed
 * "تعذر تحميل بيانات HR الذكية").
 *
 * Fix: extractScope returns `false` (not `null`) on the 400-sent path; the
 * guards check `=== false`. A missing branchId (null) now flows through to
 * the service.
 *
 * Why this was never caught: the post-deploy smoke test only asserts the
 * UNAUTHENTICATED 401 path — it never exercises the authed handler where
 * the hang lived. Lesson (CLAUDE.md): only RUNNING the wired+authed code
 * catches behavioral bugs like a silent no-response hang.
 *
 * The supertest assertions below would TIME OUT (fail) on the old code,
 * because the hung handler never resolves.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');

const { createHrSmartAnalyticsRouter } = require('../routes/hr/hr-smart-analytics.routes');

let ownServer = null;
let Employee;
let app;
let currentUser = { role: 'admin' };

beforeAll(async () => {
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    ownServer = await MongoMemoryServer.create();
    uri = ownServer.getUri();
  }
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'hr-smart-analytics-w527' });
  Employee = require('../models/HR/Employee');

  app = express();
  app.use(express.json());
  // Stand-in for the `authenticate` middleware that app.js mounts ahead of
  // this router. Tests mutate `currentUser` to exercise the role guard.
  app.use((req, _res, next) => {
    if (currentUser) req.user = currentUser;
    next();
  });
  app.use(
    '/api/v1/hr/smart-analytics',
    createHrSmartAnalyticsRouter({ logger: { error() {}, warn() {}, info() {} } })
  );
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (ownServer) await ownServer.stop();
}, 60_000);

beforeEach(async () => {
  currentUser = { role: 'admin' };
  await Employee.collection.deleteMany({});
  // Insert via the raw collection to bypass schema-required-field validation —
  // the dashboard reads only the fields below.
  await Employee.collection.insertMany([
    {
      employee_number: 'EMP-W527-1',
      national_id: '1000000001',
      email: 'w527-emp1@example.test',
      name_ar: 'موظف ١',
      status: 'active',
      gender: 'male',
      department: 'العلاج الطبيعي',
      contract_type: 'indefinite',
      basic_salary: 9000,
      gosi_registered: true,
      hire_date: new Date('2023-01-01'),
    },
    {
      employee_number: 'EMP-W527-2',
      national_id: '1000000002',
      email: 'w527-emp2@example.test',
      name_ar: 'موظف ٢',
      status: 'active',
      gender: 'female',
      department: 'النطق',
      contract_type: 'fixed',
      basic_salary: 7000,
      gosi_registered: false,
      hire_date: new Date('2024-06-01'),
    },
  ]);
});

const ENDPOINTS = [
  '/dashboard',
  '/intelligence',
  '/compliance',
  '/payroll',
  '/performance',
  '/training',
  '/risk-scores',
  '/recommendations',
];

describe('W527 — smart-analytics responds (does not hang) with no branchId', () => {
  // The core regression: each endpoint MUST send a response. On the old code
  // these calls never resolved and supertest would time out → test failure.
  test.each(ENDPOINTS)(
    'GET %s with no branchId → 200 (not a hang)',
    async ep => {
      const res = await request(app).get(`/api/v1/hr/smart-analytics${ep}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    },
    15_000
  );

  test('GET /dashboard returns aggregated workforce data', async () => {
    const res = await request(app).get('/api/v1/hr/smart-analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.intelligence.workforce.total).toBe(2);
    // gender / compliance sections present
    expect(res.body.data.compliance).toHaveProperty('complianceScore');
    expect(Array.isArray(res.body.data.compliance.alerts)).toBe(true);
  });
});

describe('W527 — branchId validation + auth guards still work', () => {
  test('invalid branchId → 400 (validation not bypassed by the fix)', async () => {
    const res = await request(app).get(
      '/api/v1/hr/smart-analytics/dashboard?branchId=not-an-objectid'
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/branchId/i);
  });

  test('valid branchId → 200', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/v1/hr/smart-analytics/dashboard?branchId=${id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('unauthenticated → 401', async () => {
    currentUser = null;
    const res = await request(app).get('/api/v1/hr/smart-analytics/dashboard');
    expect(res.status).toBe(401);
  });

  test('insufficient role → 403', async () => {
    currentUser = { role: 'beneficiary' };
    const res = await request(app).get('/api/v1/hr/smart-analytics/dashboard');
    expect(res.status).toBe(403);
  });
});
