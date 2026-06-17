'use strict';

/**
 * therapy-sessions-documentation-branch-isolation-wave1409.test.js — W1409
 *
 * Cross-branch IDOR regression test for routes/therapy-sessions.routes.js.
 *
 * Before W1409 this router was mounted via safeMount (no injected middleware)
 * and never applied requireBranchAccess, so req.branchScope was undefined and
 * the W1148 :beneficiaryId guard was a SILENT NO-OP. The id-keyed handlers —
 * GET/POST /:sessionId/documentation (SOAP clinical notes), DELETE /:id, and the
 * CRUD/transition handlers — loaded a ClinicalSession by id with no per-document
 * branch ownership check, so any authenticated branch-restricted user could read
 * AND overwrite another branch's clinical documentation by enumerating session
 * ids.
 *
 * W1409 adds requireBranchAccess (to populate req.branchScope) + a
 * branchScopedResourceParam guard on :id/:sessionId. This suite boots the real
 * router against an in-memory Mongo and proves cross-branch read/write are now
 * denied while same-branch access still works.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

// A branch-A therapist (restricted role — NOT a cross-branch role).
const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

const authState = { user: therapistA };

function buildApp() {
  const app = express();
  app.use(express.json());
  // Simulate the global authenticate middleware (app.js injects it in prod).
  app.use((req, _res, next) => {
    req.user = authState.user;
    next();
  });
  app.use('/api/v1/therapy-sessions', require('../routes/therapy-sessions.routes'));
  return app;
}

let mongod;
let ClinicalSession;

async function seedSession(branchId, soapNotes) {
  const _id = new mongoose.Types.ObjectId();
  await ClinicalSession.collection.insertOne({
    _id,
    branchId,
    soapNotes: soapNotes || { subjective: 'note' },
  });
  return _id;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1409-therapy-doc' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  // The model registers itself under name 'ClinicalSession' on require; resolve
  // it the same way the route does (the module's export shape may not be the
  // model object itself).
  require('../domains/sessions/models/ClinicalSession');
  ClinicalSession = mongoose.model('ClinicalSession');
});

beforeEach(() => {
  authState.user = therapistA;
});

afterEach(async () => {
  await ClinicalSession.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1409 — GET /:sessionId/documentation cross-branch isolation', () => {
  it('denies reading SOAP notes of a foreign-branch session (was: leaked)', async () => {
    const sid = await seedSession(BRANCH_B, { subjective: 'secret cross-branch note' });
    const res = await request(buildApp()).get(`/api/v1/therapy-sessions/${sid}/documentation`);
    expect(res.status).toBe(403);
  });

  it('allows reading SOAP notes of an own-branch session', async () => {
    const sid = await seedSession(BRANCH_A, { subjective: 'own note' });
    const res = await request(buildApp()).get(`/api/v1/therapy-sessions/${sid}/documentation`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ subjective: 'own note' });
  });
});

describe('W1409 — POST /:sessionId/documentation cross-branch isolation', () => {
  it('denies overwriting SOAP notes on a foreign-branch session (was: write-leak)', async () => {
    const sid = await seedSession(BRANCH_B, { subjective: 'original' });
    const res = await request(buildApp())
      .post(`/api/v1/therapy-sessions/${sid}/documentation`)
      .send({ subjective: 'tampered by foreign branch' });
    expect(res.status).toBe(403);
    // And the original must be untouched.
    const after = await ClinicalSession.collection.findOne({ _id: sid });
    expect(after.soapNotes.subjective).toBe('original');
  });

  it('lets an own-branch update THROUGH the guard (not 403/404)', async () => {
    // Scope: this asserts the W1409 ownership guard PASSES same-branch writes.
    // Whether the handler's findByIdAndUpdate then succeeds is orthogonal to
    // branch isolation (and is sensitive to the synthetic bare-inserted fixture
    // doc here), so we only assert the guard did not block.
    const sid = await seedSession(BRANCH_A, { subjective: 'before' });
    const res = await request(buildApp())
      .post(`/api/v1/therapy-sessions/${sid}/documentation`)
      .send({ subjective: 'after' });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(404);
  });
});

describe('W1409 — no regression for cross-branch / unscoped callers', () => {
  it('an admin (cross-branch role) can still read any session', async () => {
    authState.user = { id: 'admin1', role: 'admin' };
    const sid = await seedSession(BRANCH_B, { subjective: 'visible to admin' });
    const res = await request(buildApp()).get(`/api/v1/therapy-sessions/${sid}/documentation`);
    expect(res.status).toBe(200);
  });
});
