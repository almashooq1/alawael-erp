/**
 * W1599 — Early-Intervention branch isolation (behavioral).
 *
 * The 5 EI models were org-scoped only (no branchId) → any EIS-role user could
 * read/update/delete another branch's 0-3yr children PHI. This wave adds an
 * optional branchId (stamped on create from the caller's branch) + enforces it
 * on the child read/write paths with a legacy-null escape (pre-migration docs
 * with no branchId stay visible until backfilled).
 *
 * Behavioral proof against a real in-memory Mongo: a branch-restricted caller
 * cannot reach a foreign-branch child, new records are stamped, and legacy
 * null-branch docs are grandfathered.
 */
'use strict';

jest.setTimeout(60000);
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let service;
let EarlyInterventionChild;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER = new mongoose.Types.ObjectId();

const childPayload = suffix => ({
  firstName: `Child${suffix}`,
  lastName: 'Test',
  gender: 'MALE',
  birthInfo: { birthDate: new Date('2024-01-01') },
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Register a stub for the populate targets (child refs primaryCoordinator /
  // careTeam.member / pediatricianRef / createdBy → all 'User').
  if (!mongoose.models.User)
    mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
  service = require('../services/earlyIntervention.service');
  ({ EarlyInterventionChild } = require('../models/EarlyIntervention'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1599 EI branch isolation', () => {
  test('createChild stamps the caller branch', async () => {
    const child = await service.createChild(childPayload('A'), USER, BRANCH_A);
    expect(String(child.branchId)).toBe(String(BRANCH_A));
  });

  test('a restricted caller cannot READ a foreign-branch child (surfaced as not-found)', async () => {
    const bChild = await service.createChild(childPayload('B'), USER, BRANCH_B);
    // foreign branch → denied
    await expect(service.getChildById(bChild._id, BRANCH_A)).rejects.toThrow(/غير موجود/);
    // owning branch → allowed
    const got = await service.getChildById(bChild._id, BRANCH_B);
    expect(String(got._id)).toBe(String(bChild._id));
  });

  test('a restricted caller cannot UPDATE or DELETE a foreign-branch child', async () => {
    const bChild = await service.createChild(childPayload('B2'), USER, BRANCH_B);
    await expect(
      service.updateChild(bChild._id, { firstName: 'Hacked' }, USER, BRANCH_A)
    ).rejects.toThrow(/غير موجود/);
    await expect(service.deleteChild(bChild._id, BRANCH_A)).rejects.toThrow(/غير موجود/);
    // still present + unchanged
    const still = await service.getChildById(bChild._id, BRANCH_B);
    expect(still.firstName).toBe('ChildB2');
  });

  test('legacy null-branch children are grandfathered (visible to any branch)', async () => {
    const legacy = await EarlyInterventionChild.create(childPayload('Legacy')); // no branchId
    const got = await service.getChildById(legacy._id, BRANCH_A);
    expect(String(got._id)).toBe(String(legacy._id));
  });

  test('getChildren scopes to the caller branch (+ legacy), excluding other branches', async () => {
    const res = await service.getChildren({}, { limit: 100 }, BRANCH_A);
    const branchIds = res.data.map(c => (c.branchId ? String(c.branchId) : null));
    expect(branchIds).not.toContain(String(BRANCH_B)); // no foreign-branch children
    expect(branchIds).toContain(String(BRANCH_A)); // own branch present
    expect(branchIds).toContain(null); // legacy grandfathered
  });

  test('a cross-branch caller (no branchId) sees everything (unchanged behavior)', async () => {
    const res = await service.getChildren({}, { limit: 100 }); // no branchId
    const branchIds = res.data.map(c => (c.branchId ? String(c.branchId) : null));
    expect(branchIds).toContain(String(BRANCH_B)); // sees branch B too
  });
});
