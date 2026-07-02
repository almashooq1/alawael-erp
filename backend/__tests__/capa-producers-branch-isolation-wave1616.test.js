'use strict';

/**
 * capa-producers-branch-isolation-wave1616.test.js — W1616
 *
 * routes/quality/capa-producers.routes.js loaded the parent quality doc
 * (AuditOccurrence / RcaInvestigation / FmeaWorksheet) via a bare
 * `findById(req.params.id)` with only authenticate + attachMfaActor + tier-1
 * MFA — NO branch check — then created a CAPA linked to it AND saved the
 * (possibly foreign-branch) parent. All three models carry an indexed
 * `branchId` (with {branchId,status} compound indexes) → branch isolation is
 * the design → a branch-restricted quality officer could create a CAPA against
 * another branch's finding by enumerating the parent id (cross-branch WRITE IDOR).
 *
 * W1616 mounts requireBranchAccess (populating req.branchScope) and calls
 * assertBranchMatch(req, doc.branchId, label) after each parent load. Restricted
 * callers are blocked from foreign-branch parents (403); cross-branch (HQ) roles
 * are a no-op and keep working; the 403 is mapped in mapErrorToHttp.
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
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
}));
jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (_req, _res, next) => next(),
  requireMfaTier: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let AuditOccurrence, RcaInvestigation, FmeaWorksheet;
const occ = {};
const rca = {};
const fmea = {};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1616-capa-prod' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  AuditOccurrence = require('../models/quality/AuditOccurrence.model');
  RcaInvestigation = require('../models/quality/RcaInvestigation.model');
  FmeaWorksheet = require('../models/quality/FmeaWorksheet.model');

  app = express();
  app.use(express.json());
  // Stub producers — assertBranchMatch fires BEFORE this, so on the 403 path it
  // is never reached; on the 201 path it returns a minimal CAPA.
  app._capaProducers = {
    createCapaFromAuditFinding: async () => ({ _id: new mongoose.Types.ObjectId(), capaNumber: 'CAPA-1' }),
    createCapaFromRcaRootCause: async () => ({ _id: new mongoose.Types.ObjectId(), capaNumber: 'CAPA-2' }),
    createCapaFromFmeaAction: async () => ({ _id: new mongoose.Types.ObjectId(), capaNumber: 'CAPA-3' }),
  };
  const router = require('../routes/quality/capa-producers.routes');
  app.use('/api/quality/capa', (req, _res, next) => {
    req.app._capaProducers = app._capaProducers;
    next();
  }, router);

  const fid = new mongoose.Types.ObjectId();
  occ.fid = fid;
  occ.a = (await AuditOccurrence.collection.insertOne({ branchId: BRANCH_A, findings: [{ _id: fid, description: 'f' }] })).insertedId;
  occ.b = (await AuditOccurrence.collection.insertOne({ branchId: BRANCH_B, findings: [{ _id: new mongoose.Types.ObjectId(), description: 'f' }] })).insertedId;
  rca.b = (await RcaInvestigation.collection.insertOne({ branchId: BRANCH_B, rootCauses: [{ _id: new mongoose.Types.ObjectId(), cause: 'c' }] })).insertedId;
  fmea.b = (await FmeaWorksheet.collection.insertOne({ branchId: BRANCH_B, rows: [] })).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'quality_manager' };
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/quality/capa';

describe('W1616 — capa-producers branch isolation', () => {
  it('POST /audit — restricted user 403s on a foreign-branch occurrence', async () => {
    const r = await request(app).post(`${base}/audit/${occ.b}/findings/${new mongoose.Types.ObjectId()}`).send({});
    expect(r.status).toBe(403);
    expect(r.body.success).toBe(false);
  });

  it('POST /audit — own-branch occurrence succeeds (201)', async () => {
    const r = await request(app).post(`${base}/audit/${occ.a}/findings/${occ.fid}`).send({});
    expect(r.status).toBe(201);
    expect(r.body.capa.capaNumber).toBe('CAPA-1');
  });

  it('POST /audit — cross-branch (HQ) role reaches a foreign-branch occurrence', async () => {
    mockScope.s = { restricted: false };
    const r = await request(app).post(`${base}/audit/${occ.b}/findings/${new mongoose.Types.ObjectId()}`).send({});
    expect(r.status).toBe(201);
  });

  it('POST /rca — restricted user 403s on a foreign-branch RCA', async () => {
    const r = await request(app).post(`${base}/rca/${rca.b}/root-causes/${new mongoose.Types.ObjectId()}`).send({});
    expect(r.status).toBe(403);
  });

  it('POST /fmea — restricted user 403s on a foreign-branch FMEA', async () => {
    const r = await request(app).post(`${base}/fmea/${fmea.b}/rows/${new mongoose.Types.ObjectId()}/actions/${new mongoose.Types.ObjectId()}`).send({});
    expect(r.status).toBe(403);
  });

  it('POST /audit — 404 (not 403) when the parent does not exist for a restricted user', async () => {
    const r = await request(app).post(`${base}/audit/${new mongoose.Types.ObjectId()}/findings/${new mongoose.Types.ObjectId()}`).send({});
    expect(r.status).toBe(404);
  });

  it('static: requireBranchAccess mounted + 3 assertBranchMatch + 403 map', () => {
    const s = fs.readFileSync(path.join(__dirname, '..', 'routes', 'quality', 'capa-producers.routes.js'), 'utf8');
    expect(s).toMatch(/router\.use\(requireBranchAccess\)/);
    expect((s.match(/assertBranchMatch\(req, \w+Doc\.branchId/g) || []).length).toBe(3);
    expect(s).toMatch(/err\.status === 403/);
  });
});
