'use strict';

/**
 * care-crm-funnel-branch-isolation-wave1599.test.js — W1599
 *
 * routes/care/crm.routes.js (Phase-17 CareLead/Inquiry funnel) was authenticated but applied
 * NO requireBranchAccess, and leadFunnel.service.js did raw findById on every :id op + filtered
 * lists by branch only when the client passed ?branchId=. So any authenticated user could read
 * or mutate ANY branch's lead/inquiry PHI (guardian name/phone/email, beneficiary condition) by
 * enumerating ObjectIds (P0 cross-branch IDOR). W1599 adds requireBranchAccess + effectiveBranchScope
 * on lists + assertBranchMatch/assertLeadScope/assertInquiryScope on every :id read + mutation
 * (CareLead keys on preferredBranchId, Inquiry on branchId) + pins the branch on create.
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
const mockScope = { s: undefined };

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () => ({}),
}));
// force the route's getService() fallback to build the REAL funnel service over real models
jest.mock('../startup/careBootstrap', () => ({ _getLeadFunnelService: () => null }));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let Lead;
let Inquiry;
const L = { a: null, b: null };
const I = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1597-care-crm' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Lead = require('../models/care/Lead.model');
  Inquiry = require('../models/care/Inquiry.model');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['User', 'Beneficiary']) if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use('/api/care/crm', require('../routes/care/crm.routes'));

  const seedLead = (preferredBranchId, n) =>
    Lead.collection.insertOne({
      preferredBranchId,
      leadNumber: 'LEAD-' + n,
      guardianName: 'G',
      guardianPhone: '0500000000',
      beneficiaryName: 'B',
      status: 'new',
      createdAt: new Date(), // the `ageDays` virtual reads createdAt.getTime() on toJSON
    });
  L.a = (await seedLead(BRANCH_A, 'A')).insertedId;
  L.b = (await seedLead(BRANCH_B, 'B')).insertedId;
  const seedInq = (branchId, n) =>
    Inquiry.collection.insertOne({
      branchId,
      inquiryNumber: 'INQ-' + n,
      channel: 'phone',
      contactName: 'C',
      subject: 'S',
      status: 'new',
    });
  I.a = (await seedInq(BRANCH_A, 'A')).insertedId;
  I.b = (await seedInq(BRANCH_B, 'B')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'crm_manager' };
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/care/crm';

describe('W1599 — care/crm funnel branch isolation', () => {
  it('GET /leads/:id — restricted user 403s on a foreign-branch lead (no PHI read)', async () => {
    expect((await request(app).get(`${base}/leads/${L.b}`)).status).toBe(403);
    expect((await request(app).get(`${base}/leads/${L.a}`)).status).toBe(200);
  });

  it('GET /inquiries/:id — restricted user 403s on a foreign-branch inquiry', async () => {
    expect((await request(app).get(`${base}/inquiries/${I.b}`)).status).toBe(403);
    expect((await request(app).get(`${base}/inquiries/${I.a}`)).status).toBe(200);
  });

  it('GET /leads — restricted user lists only own-branch leads (omitting branchId no longer leaks)', async () => {
    const r = await request(app).get(`${base}/leads?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(L.a));
    expect(ids).not.toContain(String(L.b));
  });

  it('POST /leads/:id/transition — restricted user 403s mutating a foreign-branch lead', async () => {
    const r = await request(app).post(`${base}/leads/${L.b}/transition`).send({ toStatus: 'contacted' });
    expect(r.status).toBe(403);
  });

  it('POST /inquiries/:id/acknowledge — restricted user 403s on a foreign-branch inquiry', async () => {
    expect((await request(app).post(`${base}/inquiries/${I.b}/acknowledge`).send({})).status).toBe(403);
  });

  it('cross-branch role sees any branch', async () => {
    mockScope.s = { restricted: false };
    expect((await request(app).get(`${base}/leads/${L.b}`)).status).toBe(200);
  });

  it('POST /leads — create pins preferredBranchId to the caller branch, ignoring a spoofed value', async () => {
    const r = await request(app)
      .post(`${base}/leads`)
      .send({
        guardianName: 'New',
        guardianPhone: '0511111111',
        beneficiaryName: 'Kid',
        preferredBranchId: String(BRANCH_B), // spoof attempt
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.preferredBranchId)).toBe(String(BRANCH_A));
  });

  it('static: requireBranchAccess + scope helpers wired', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'care', 'crm.routes.js'), 'utf8');
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(src).toMatch(/async function assertLeadScope\(req, id\)/);
    expect(src).toMatch(/async function assertInquiryScope\(req, id\)/);
    expect((src.match(/assertLeadScope\(req, req\.params\.id\)/g) || []).length).toBeGreaterThanOrEqual(5);
    expect((src.match(/assertInquiryScope\(req, req\.params\.id\)/g) || []).length).toBeGreaterThanOrEqual(5);
    expect((src.match(/effectiveBranchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
