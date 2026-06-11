'use strict';

/**
 * beneficiary-transfer-field-drift-wave990.test.js — W990.
 *
 * Behavioral proof for Direction A of
 * docs/architecture/findings/beneficiary-transfer-field-drift-2026-06-06.md.
 *
 * The bug: models/BeneficiaryTransfer.js declared its FKs with the *Id suffix
 * (beneficiaryId / fromBranchId / toBranchId, required:true, strict:true) while
 * the writers + readers (BeneficiaryService.initiateTransfer, both list routes,
 * branch-enhanced.service.completeTransfer) all used the BARE names
 * (beneficiary / fromBranch / toBranch). Under strict:true those bare fields were
 * silently STRIPPED on write → every transfer persisted with NONE of its three
 * FKs, so the link to the beneficiary + both branches was lost AND branch
 * isolation was moot. Direction A renamed the schema → bare to match the code.
 *
 * Plus a W942 fix in the same wave: beneficiary-transfers.routes GET / scoped its
 * list via the never-populated `req.user.branch`, so a restricted user's filter
 * was `undefined` → it LEAKED every branch's transfers. Now via
 * effectiveBranchScope(req) ($or over fromBranch/toBranch).
 *
 * Test 1 (persistence) is the direct discriminator: pre-fix, `.create({beneficiary,
 * fromBranch, toBranch, ...})` THREW (required:true on the *Id names that weren't
 * supplied); post-fix it persists and round-trips. Tests 2-3 prove the route scope
 * with a branchId-only user (the production condition). Real Express + real
 * branchScope middleware + MongoMemoryServer; only auth mocked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
let BeneficiaryTransfer;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BRANCH_C = new mongoose.Types.ObjectId();

// branchId-only users — replicates production (the legacy `branch` field that the
// pre-fix scope read is never set on req.user).
const socialWorkerA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'social_worker', // restricted (not in CROSS_BRANCH_ROLES / REGION_SCOPED_ROLES)
  branchId: String(BRANCH_A),
};
const superAdmin = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'super_admin', // CROSS_BRANCH_ROLES → allBranches
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/beneficiary-transfers', require('../routes/beneficiary-transfers.routes'));
  return app;
}

let app;
let counter = 0;
async function seedTransfer(fromBranch, toBranch, reason) {
  counter += 1;
  return BeneficiaryTransfer.collection.insertOne({
    beneficiary: new mongoose.Types.ObjectId(),
    fromBranch,
    toBranch,
    reason,
    transferDate: new Date(),
    requestedBy: new mongoose.Types.ObjectId(),
    status: 'pending',
    createdAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w990-transfer' } });
  await mongoose.connect(mongod.getUri());
  BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
  await BeneficiaryTransfer.init(); // build indexes deterministically
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = socialWorkerA;
});

afterEach(async () => {
  await BeneficiaryTransfer.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W990 — BeneficiaryTransfer FK fields persist (Direction A: schema→bare)', () => {
  it('persists beneficiary + fromBranch + toBranch on create (were stripped pre-fix)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryTransfer.create({
      beneficiary,
      fromBranch: BRANCH_A,
      toBranch: BRANCH_B,
      reason: 'persist-test',
      transferDate: new Date(),
      requestedBy: new mongoose.Types.ObjectId(),
      status: 'pending',
    });
    const reloaded = await BeneficiaryTransfer.findById(doc._id).lean();
    expect(reloaded).toBeTruthy();
    expect(String(reloaded.beneficiary)).toBe(String(beneficiary));
    expect(String(reloaded.fromBranch)).toBe(String(BRANCH_A));
    expect(String(reloaded.toBranch)).toBe(String(BRANCH_B));
  });

  it('still enforces required on the bare FK names (create without them rejects)', async () => {
    await expect(
      BeneficiaryTransfer.create({
        reason: 'missing-fks',
        transferDate: new Date(),
        requestedBy: new mongoose.Types.ObjectId(),
        status: 'pending',
      })
    ).rejects.toThrow();
  });
});

describe('W990 — list is branch-scoped via effectiveBranchScope (was leaking all)', () => {
  it('a restricted user sees transfers where their branch is from OR to — not others', async () => {
    mockAuthState.user = socialWorkerA;
    await seedTransfer(BRANCH_A, BRANCH_B, 'A-from'); // A is sender → visible
    await seedTransfer(BRANCH_C, BRANCH_A, 'A-to'); // A is receiver → visible
    await seedTransfer(BRANCH_B, BRANCH_C, 'no-A'); // A absent → hidden
    const res = await request(app).get('/api/beneficiary-transfers');
    expect(res.status).toBe(200);
    const reasons = (res.body.data || []).map(t => t.reason);
    expect(reasons).toEqual(expect.arrayContaining(['A-from', 'A-to']));
    expect(reasons).not.toContain('no-A'); // pre-fix: leaked all (filter by undefined branch)
  });

  it('a cross-branch super_admin sees ALL transfers', async () => {
    mockAuthState.user = superAdmin;
    await seedTransfer(BRANCH_A, BRANCH_B, 'A-from');
    await seedTransfer(BRANCH_B, BRANCH_C, 'no-A');
    const res = await request(app).get('/api/beneficiary-transfers');
    expect(res.status).toBe(200);
    const reasons = (res.body.data || []).map(t => t.reason);
    expect(reasons).toEqual(expect.arrayContaining(['A-from', 'no-A']));
  });
});
