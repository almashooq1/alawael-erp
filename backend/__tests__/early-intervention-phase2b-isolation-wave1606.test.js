/**
 * W1606 — EI Phase 2b: sub-resource WRITE + by-child branch isolation.
 *
 * #914/#925 isolated the child surface + sub-resource reads (list/getById). This
 * closes the remaining sub-resource surface: update/delete + by-child reads +
 * the special writes (addIFSPReview / updateIFSPGoalProgress /
 * addReferralCommunication / updateReferralStatus) — each now takes an optional
 * branchId and denies a foreign-branch record via sameBranchOrLegacy /
 * scopedFilter (legacy-null grandfathered; cross-branch callers unaffected).
 *
 * Behavioral proof on Screening (update/delete/by-child) + IFSP (special write).
 */
'use strict';

jest.setTimeout(60000);
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let service;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER = new mongoose.Types.ObjectId();

const childPayload = s => ({
  firstName: `C${s}`,
  lastName: 'T',
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
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1606 EI Phase 2b sub-resource write + by-child isolation', () => {
  let childB;
  let screeningB;
  let ifspB;

  beforeAll(async () => {
    childB = await service.createChild(childPayload('B'), USER, BRANCH_B);
    screeningB = await service.createScreening(screeningPayload(childB._id), USER, BRANCH_B);
    ifspB = await service.createIFSP(
      { child: childB._id, startDate: new Date(), serviceCoordinator: USER },
      USER,
      BRANCH_B
    );
  });

  test('updateScreening denies a foreign-branch record', async () => {
    await expect(
      service.updateScreening(screeningB._id, { childAgeMonths: 99 }, USER, BRANCH_A)
    ).rejects.toThrow(/غير موجود/);
    // owning branch works
    const ok = await service.updateScreening(screeningB._id, { childAgeMonths: 13 }, USER, BRANCH_B);
    expect(ok.childAgeMonths).toBe(13);
  });

  test('deleteScreening denies a foreign-branch record', async () => {
    await expect(service.deleteScreening(screeningB._id, BRANCH_A)).rejects.toThrow(/غير موجود/);
  });

  test('getScreeningsByChild excludes a foreign branch child', async () => {
    const res = await service.getScreeningsByChild(childB._id, { limit: 100 }, BRANCH_A);
    expect(res.data).toHaveLength(0); // branch B screenings invisible to branch A
    const own = await service.getScreeningsByChild(childB._id, { limit: 100 }, BRANCH_B);
    expect(own.data.length).toBeGreaterThan(0);
  });

  test('addIFSPReview (special write) denies a foreign-branch IFSP', async () => {
    await expect(
      service.addIFSPReview(ifspB._id, { notes: 'x' }, USER, BRANCH_A)
    ).rejects.toThrow(/غير موجود/);
    const ok = await service.addIFSPReview(ifspB._id, { notes: 'ok' }, USER, BRANCH_B);
    expect(String(ok._id)).toBe(String(ifspB._id));
  });

  test('a cross-branch caller (no branchId) can still update the record', async () => {
    const ok = await service.updateScreening(screeningB._id, { childAgeMonths: 14 }, USER);
    expect(ok.childAgeMonths).toBe(14);
  });
});
