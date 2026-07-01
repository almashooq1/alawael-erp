/**
 * W1602 — Early-Intervention sub-resource branch isolation (Phase 2 reads).
 *
 * #914 (W1599) branch-isolated the CHILD read/write surface. This wave extends
 * the same scopedFilter / sameBranchOrLegacy pattern to the sub-resource READS —
 * the standalone list + getById for Screening / Milestone / IFSP / Referral —
 * which otherwise let a restricted caller enumerate or directly read another
 * branch's developmental-screening / milestone / IFSP / referral PHI.
 *
 * Behavioral proof on Screening (representative — all 4 sub-resources use the
 * identical service edit): list excludes foreign branch, getById denies foreign,
 * legacy null-branch grandfathered, cross-branch sees all.
 */
'use strict';

jest.setTimeout(60000);
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let service;
let DevelopmentalScreening;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER = new mongoose.Types.ObjectId();

const childPayload = suffix => ({
  firstName: `Child${suffix}`,
  lastName: 'Test',
  gender: 'MALE',
  birthInfo: { birthDate: new Date('2024-01-01') },
});
const screeningPayload = childId => ({
  child: childId,
  screeningDate: new Date(),
  childAgeMonths: 12,
  overallResult: 'TYPICAL',
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  if (!mongoose.models.User)
    mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
  service = require('../services/earlyIntervention.service');
  ({ DevelopmentalScreening } = require('../models/EarlyIntervention'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1602 EI sub-resource read isolation', () => {
  let childA;
  let childB;
  let screeningB;

  beforeAll(async () => {
    childA = await service.createChild(childPayload('A'), USER, BRANCH_A);
    childB = await service.createChild(childPayload('B'), USER, BRANCH_B);
    await service.createScreening(screeningPayload(childA._id), USER, BRANCH_A);
    screeningB = await service.createScreening(screeningPayload(childB._id), USER, BRANCH_B);
  });

  test('createScreening stamps the caller branch', () => {
    expect(String(screeningB.branchId)).toBe(String(BRANCH_B));
  });

  test('getScreenings list excludes other branches (+ own present)', async () => {
    const res = await service.getScreenings({}, { limit: 100 }, BRANCH_A);
    const branchIds = res.data.map(s => (s.branchId ? String(s.branchId) : null));
    expect(branchIds).not.toContain(String(BRANCH_B));
    expect(branchIds).toContain(String(BRANCH_A));
  });

  test('getScreeningById denies a foreign-branch screening (not-found)', async () => {
    await expect(service.getScreeningById(screeningB._id, BRANCH_A)).rejects.toThrow(/غير موجود/);
    const ok = await service.getScreeningById(screeningB._id, BRANCH_B);
    expect(String(ok._id)).toBe(String(screeningB._id));
  });

  test('a legacy null-branch screening is grandfathered', async () => {
    const legacy = await DevelopmentalScreening.create(screeningPayload(childA._id)); // no branchId
    const got = await service.getScreeningById(legacy._id, BRANCH_A);
    expect(String(got._id)).toBe(String(legacy._id));
  });

  test('a cross-branch caller (no branchId) sees every branch', async () => {
    const res = await service.getScreenings({}, { limit: 100 }); // no branchId
    const branchIds = res.data.map(s => (s.branchId ? String(s.branchId) : null));
    expect(branchIds).toContain(String(BRANCH_B));
  });
});
