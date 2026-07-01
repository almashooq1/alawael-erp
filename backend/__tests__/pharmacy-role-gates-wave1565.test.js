'use strict';

/**
 * pharmacy-role-gates-wave1565.test.js — W1565
 *
 * routes/pharmacy.routes.js gated its mutations by `authenticate` ONLY — any
 * authenticated branch user (caregiver, therapist, …) could prescribe, verify,
 * dispense, cancel a prescription, manage inventory, or toggle a drug's
 * controlledSubstance flag. W1565 adds requireRole gates mirroring the sibling
 * mar.routes.js / medication-reconciliation.routes.js (RX_WRITE_ROLES for prescribing,
 * PHARMACY_ROLES for verify/dispense/inventory/catalog). Read-only /interactions/check
 * stays open. Shipped LEAVE-IN-REVIEW (owner confirms role names).
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
    ...actual, // REAL requireRole (reads req.user.role)
    authenticate: (req, _res, next) => {
      req.user = mockUser.u;
      next();
    },
  };
});
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = { restricted: false, allBranches: true }; // bypass branch checks
    next();
  },
  branchFilter: () => ({}),
}));

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1565-pharm' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/pharmacy.model');
  app = express();
  app.use(express.json());
  app.use('/api/pharmacy', require('../routes/pharmacy.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

const asRole = role => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: String(new mongoose.Types.ObjectId()), role };
};

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1565 — pharmacy controlled-action role gates', () => {
  it('POST /dispensing — a non-pharmacy role is forbidden', async () => {
    asRole('caregiver');
    const r = await request(app).post('/api/pharmacy/dispensing').send({});
    expect(r.status).toBe(403);
  });

  it('POST /dispensing — pharmacist / nurse / clinical_supervisor pass the gate', async () => {
    for (const role of ['pharmacist', 'nurse', 'clinical_supervisor']) {
      asRole(role);
      const r = await request(app).post('/api/pharmacy/dispensing').send({});
      expect(r.status).not.toBe(403); // gate passed; handler may 400/500 on empty body
    }
  });

  it('POST /prescriptions — a therapist cannot prescribe', async () => {
    asRole('therapist');
    const r = await request(app).post('/api/pharmacy/prescriptions').send({});
    expect(r.status).toBe(403);
  });

  it('POST /prescriptions — a physician passes the role gate', async () => {
    asRole('physician');
    const r = await request(app).post('/api/pharmacy/prescriptions').send({});
    expect(r.status).not.toBe(403);
  });

  it('POST /medications — a caregiver cannot write the drug catalog', async () => {
    asRole('caregiver');
    const r = await request(app).post('/api/pharmacy/medications').send({ name: 'x' });
    expect(r.status).toBe(403);
  });

  it('static: 12 requireRole gates + role-list constants', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'pharmacy.routes.js'), 'utf8');
    expect((src.match(/requireRole\(/g) || []).length).toBeGreaterThanOrEqual(12);
    expect(src).toMatch(/RX_WRITE_ROLES\s*=/);
    expect(src).toMatch(/PHARMACY_ROLES\s*=/);
    // read-only interaction check stays open (not gated)
    expect(src).toMatch(/router\.post\('\/interactions\/check', async/);
  });
});
