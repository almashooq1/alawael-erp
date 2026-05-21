'use strict';

/**
 * measure-outcomes-pairs-history-wave257.test.js — Wave 257.
 *
 * Tests the `scoreHistory[]` extension added to `listMeasurePairsAt()`
 * in W257. The W256 test file covers the per-pair shape (delta, MCID,
 * sort); this file only exercises the new history trajectory:
 *
 *   - scoreHistory present + same length as adminCount
 *   - history ordered by applicationDate asc
 *   - first/last entries match firstScore/firstDate, lastScore/lastDate
 *   - empty history when no admins
 *
 * MongoMemoryServer pattern mirrors W256/W249.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Measure;
let MeasureApplication;
let Beneficiary;
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w257-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  Beneficiary = require('../models/Beneficiary');
  aggregator = require('../services/measureOutcomesAggregator.service');
  await MeasureApplication.init();
  await Beneficiary.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await Beneficiary.deleteMany({});
});

// ─── Fixtures (mirror W256 conventions) ─────────────────────────────────────

async function makeMeasure({ code = 'BERG', name_ar = 'بيرغ', mcid = 4 } = {}) {
  return Measure.create({
    code,
    name: code,
    name_ar,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status: 'active',
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: mcid, type: 'absolute', status: 'established', source: 'test' },
      sdc: { value: 2, ci: 0.95 },
    },
  });
}

async function makeBeneficiary({ firstName_ar = 'علي' } = {}) {
  return Beneficiary.create({
    firstName: 'TestFirst',
    lastName: 'TestLast',
    firstName_ar,
    lastName_ar: '',
    beneficiaryNumber: `B-${Math.floor(Math.random() * 1000000)}`,
    gender: 'male',
    dateOfBirth: new Date('2015-01-01'),
    nationality: 'SA',
    branchId: new mongoose.Types.ObjectId(),
  });
}

async function seedAdmin({ beneficiaryId, measureId, branchId, daysAgo, score }) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
    branchId,
    applicationDate: new Date(Date.now() - daysAgo * 86400000),
    purpose: 'progress',
    assessorId: new mongoose.Types.ObjectId(),
    totalRawScore: score,
    status: 'completed',
    scoredWithMeasureVersion: '1.0.0',
    scoredWithAlgorithmVersion: '1.0.0',
    mcidAtAdministration: {
      value: 4,
      type: 'absolute',
      status: 'established',
      source: 'test',
    },
  });
}

describe('W257 — listMeasurePairsAt.scoreHistory', () => {
  test('scoreHistory length matches adminCount', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    // 5 admins across 4 months
    for (const item of [
      { d: 120, s: 18 },
      { d: 90, s: 22 },
      { d: 60, s: 26 },
      { d: 30, s: 30 },
      { d: 5, s: 34 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
      // Widen window to capture the 120-day-ago seed; default 90d would clip it.
      from: new Date(Date.now() - 200 * 86400000),
    });
    expect(r.pairs).toHaveLength(1);
    const pair = r.pairs[0];
    expect(pair.adminCount).toBe(5);
    expect(pair.scoreHistory).toHaveLength(5);
  });

  test('scoreHistory ordered by date asc + first/last match firstScore/lastScore', async () => {
    const berg = await makeMeasure();
    const ben = await makeBeneficiary();
    const branchId = new mongoose.Types.ObjectId();
    // Seed in non-chronological order — pipeline $sort + $push should
    // still produce ascending history.
    const items = [
      { d: 30, s: 30 }, // chronologically 4th
      { d: 120, s: 18 }, // earliest
      { d: 5, s: 34 }, // latest
      { d: 60, s: 26 },
      { d: 90, s: 22 },
    ];
    for (const item of items) {
      await seedAdmin({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
      // Widen window to capture the 120-day-ago seed; default 90d would clip it.
      from: new Date(Date.now() - 200 * 86400000),
    });
    const pair = r.pairs[0];
    const dates = pair.scoreHistory.map(h => new Date(h.date).getTime());
    // Strictly ascending
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
    expect(pair.scoreHistory[0].score).toBe(pair.firstScore);
    expect(pair.scoreHistory[pair.scoreHistory.length - 1].score).toBe(pair.lastScore);
    expect(new Date(pair.scoreHistory[0].date).toISOString()).toBe(pair.firstDate);
    expect(new Date(pair.scoreHistory.at(-1).date).toISOString()).toBe(pair.lastDate);
  });

  test('multiple pairs each get independent history', async () => {
    const berg = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = await makeBeneficiary({ firstName_ar: 'علي' });
    const ben2 = await makeBeneficiary({ firstName_ar: 'سارة' });
    // ben1: 3 admins
    for (const item of [
      { d: 80, s: 10 },
      { d: 50, s: 14 },
      { d: 20, s: 18 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben1._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    // ben2: 4 admins
    for (const item of [
      { d: 100, s: 20 },
      { d: 70, s: 22 },
      { d: 40, s: 25 },
      { d: 10, s: 28 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben2._id,
        measureId: berg._id,
        branchId,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await aggregator.listMeasurePairsAt({
      branchId,
      measureId: berg._id,
      // Widen window to capture the 120-day-ago seed; default 90d would clip it.
      from: new Date(Date.now() - 200 * 86400000),
    });
    expect(r.pairs).toHaveLength(2);
    const histLens = r.pairs.map(p => p.scoreHistory.length).sort();
    expect(histLens).toEqual([3, 4]);
  });

  test('empty branch returns empty pairs (no history to verify)', async () => {
    const r = await aggregator.listMeasurePairsAt({
      branchId: new mongoose.Types.ObjectId(),
      measureId: new mongoose.Types.ObjectId(),
    });
    expect(r.pairs).toEqual([]);
  });
});
