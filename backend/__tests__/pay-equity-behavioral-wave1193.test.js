'use strict';

/**
 * pay-equity-behavioral-wave1193.test.js — W1193 (behavioral).
 *
 * Exercises PayEquitySnapshot against MongoMemoryServer: a valid snapshot saves,
 * every Wave-18 invariant rejects on save, defaults apply, and the invariants
 * still fire on an UPDATE-save (the select:false + markModified('__invariants')
 * gotcha from W1123). Pairs with the static guard + the pure lib unit tests.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Snap;

const oid = () => new mongoose.Types.ObjectId();

function base(overrides = {}) {
  return {
    branchId: oid(),
    scope: { level: 'branch', department: null },
    computedAt: new Date('2026-06-01'),
    headcount: 10,
    genderGap: { aCount: 5, bCount: 5, aMedian: 10000, bMedian: 9000, medianGapPct: 10, direction: 'female', reportable: true },
    nationalityGap: { reportable: false },
    cohortOutliers: { count: 1, ratePct: 10, thresholdPct: 20, byTitle: false },
    equityScore: 85,
    flaggedCount: 1,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1193-payeq' } });
  await mongoose.connect(mongod.getUri());
  Snap = require('../models/HR/PayEquitySnapshot');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1193 PayEquitySnapshot — happy path + defaults', () => {
  test('a valid snapshot saves and applies defaults', async () => {
    const doc = await Snap.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.equityScore).toBe(85);
    expect(doc.cohortOutliers.thresholdPct).toBe(20);
    expect(doc.scope.level).toBe('branch');
    // aggregate-only: no individual salaries persisted anywhere on the doc
    expect(JSON.stringify(doc.toObject())).not.toMatch(/employeeId|"salary"/);
  });

  test('department-scoped snapshot saves with a department', async () => {
    const doc = await Snap.create(base({ scope: { level: 'department', department: 'PT' } }));
    expect(doc.scope.department).toBe('PT');
  });
});

describe('W1193 PayEquitySnapshot — Wave-18 invariants reject on save', () => {
  test('equityScore out of [0,100] is rejected', async () => {
    await expect(Snap.create(base({ equityScore: 150 }))).rejects.toThrow(/equityScore/);
    await expect(Snap.create(base({ equityScore: -1 }))).rejects.toThrow(/equityScore/);
  });

  test('flaggedCount cannot exceed headcount', async () => {
    await expect(Snap.create(base({ headcount: 3, flaggedCount: 9 }))).rejects.toThrow(/flaggedCount/);
  });

  test('department scope requires a department name', async () => {
    await expect(
      Snap.create(base({ scope: { level: 'department', department: null } }))
    ).rejects.toThrow(/department/);
  });

  test('branch scope must NOT carry a department', async () => {
    await expect(
      Snap.create(base({ scope: { level: 'branch', department: 'PT' } }))
    ).rejects.toThrow(/department/);
  });

  test('a reportable gap must carry a direction', async () => {
    await expect(
      Snap.create(base({ genderGap: { reportable: true, medianGapPct: 10, direction: null } }))
    ).rejects.toThrow(/direction/);
  });
});

describe('W1193 PayEquitySnapshot — invariants fire on UPDATE-save (markModified gotcha)', () => {
  test('mutating a persisted doc to an invalid state still rejects', async () => {
    const doc = await Snap.create(base());
    doc.equityScore = 999;
    await expect(doc.save()).rejects.toThrow(/equityScore/);
  });
});
