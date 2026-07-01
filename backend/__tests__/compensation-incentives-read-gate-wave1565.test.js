'use strict';

/**
 * compensation-incentives-read-gate-wave1565.test.js — W1565
 *
 * Guards the authorization fix on GET /api/compensation/incentives: it listed
 * every employee's incentive/bonus amounts + names + performance scores to ANY
 * authenticated user, while POST/PUT already required admin/manager. Now the READ
 * requires the same roles. (compensation.model has no branchId → org-global HR
 * data; the protection is role-based, not branch-based.)
 *
 * Role set owner-confirmed 2026-07-01: admin / super_admin / hr_manager / manager
 * (the codebase's canonical HR-read set, matching the sibling leave/payroll routes).
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
  // functional role gate so the test exercises the real authorization contract
  authorize: roles => (req, res, next) => {
    if (!roles || roles.includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1565-comp' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/compensation.model');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Employee', 'User']) if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use('/api/compensation', require('../routes/compensation.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const as = role => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u', role };
};

describe('W1565 — compensation GET /incentives requires an HR role', () => {
  it('a non-privileged user cannot list incentives (403)', async () => {
    as('receptionist');
    const r = await request(app).get('/api/compensation/incentives');
    expect(r.status).toBe(403);
  });

  it('the canonical HR-read roles can list incentives (200)', async () => {
    for (const role of ['admin', 'super_admin', 'hr_manager', 'manager']) {
      as(role);
      const r = await request(app).get('/api/compensation/incentives');
      expect(r.status).toBe(200);
    }
  });

  it('static: GET /incentives carries the HR-role authorize gate', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'compensation.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/router\.get\('\/incentives',\s*authorize\(\[/);
    expect(src).toMatch(/'hr_manager'/);
  });
});
