'use strict';

/**
 * headcount-plan-behavioral-wave1203.test.js — HeadcountPlan against MongoMemoryServer:
 * valid save + Wave-18 invariants (on save AND update-save).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Plan;
const oid = () => new mongoose.Types.ObjectId();

function base(over = {}) {
  return {
    branchId: oid(),
    department: 'PT',
    planLabel: '2026',
    currentHeadcount: 100,
    targetHeadcount: 120,
    attritionRatePct: 10,
    periods: 3,
    forecast: { totalHiringNeed: 47 },
    ...over,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1203-hcp' } });
  await mongoose.connect(mongod.getUri());
  Plan = require('../models/HR/HeadcountPlan');
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('W1203 HeadcountPlan — happy path', () => {
  test('a valid plan saves with defaults', async () => {
    const d = await Plan.create(base());
    expect(d._id).toBeDefined();
    expect(d.status).toBe('draft');
    expect(d.forecast.totalHiringNeed).toBe(47);
  });
});

describe('W1203 HeadcountPlan — Wave-18 invariants', () => {
  test('attritionRatePct out of [0,100] rejected', async () => {
    await expect(Plan.create(base({ attritionRatePct: 150 }))).rejects.toThrow(/attritionRatePct/);
  });
  test('periods out of [1,10] rejected', async () => {
    await expect(Plan.create(base({ periods: 0 }))).rejects.toThrow(/periods/);
    await expect(Plan.create(base({ periods: 11 }))).rejects.toThrow(/periods/);
  });
  test('negative headcounts rejected', async () => {
    await expect(Plan.create(base({ targetHeadcount: -5 }))).rejects.toThrow(/targetHeadcount/);
    await expect(Plan.create(base({ currentHeadcount: -1 }))).rejects.toThrow(/currentHeadcount/);
  });
  test('invariants fire on UPDATE-save too (markModified)', async () => {
    const d = await Plan.create(base());
    d.attritionRatePct = 999;
    await expect(d.save()).rejects.toThrow(/attritionRatePct/);
  });
});
