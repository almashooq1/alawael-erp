'use strict';

/**
 * measure-outcomes-by-measure-wave249.test.js — Wave 249.
 *
 * Targeted tests for the per-measure breakdown added to
 * `aggregateBranch()` in W249. The W229 test file covers the global
 * roll-up shape; this file only exercises the new `byMeasure` array:
 *
 *   - empty branch → byMeasure is []
 *   - thin-history pairs (admins < 3) excluded from byMeasure
 *   - per-measure pairsAnalysed + mcidAchievedCount + rate
 *   - measureCode + measureNameAr enriched from the Measure collection
 *   - sorted by pairsAnalysed desc, code asc as tiebreaker
 *
 * MongoMemoryServer pattern mirrors the W229 suite.
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
let aggregator;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w249-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  aggregator = require('../services/measureOutcomesAggregator.service');
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
});

// ─── Helpers (mirror W229 conventions) ──────────────────────────────────────

async function makeMeasure({ code, name_ar, scoringDirection = 'higher_better', mcid = 4 }) {
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
    scoringDirection,
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: mcid, type: 'absolute', status: 'established', source: 'test' },
      sdc: { value: 2, ci: 0.95 },
    },
  });
}

async function seedAdmin({ beneficiaryId, measureId, branchId, daysAgo, score, mcidValue = 4 }) {
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
      value: mcidValue,
      type: 'absolute',
      status: 'established',
      source: 'test',
    },
  });
}

// Seeds 3 admins for a single (ben, measure) pair with the given start/end
// scores so the MCID delta can be controlled per test.
async function seedRichPair({ beneficiaryId, measureId, branchId, scores, mcidValue = 4 }) {
  const days = [80, 50, 20];
  for (let i = 0; i < scores.length; i++) {
    await seedAdmin({
      beneficiaryId,
      measureId,
      branchId,
      daysAgo: days[i],
      score: scores[i],
      mcidValue,
    });
  }
}

describe('W249 — aggregateBranch.byMeasure', () => {
  test('empty branch returns empty byMeasure array', async () => {
    const r = await aggregator.aggregateBranch(new mongoose.Types.ObjectId());
    expect(Array.isArray(r.byMeasure)).toBe(true);
    expect(r.byMeasure).toHaveLength(0);
  });

  test('thin-history pairs excluded from byMeasure', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'مقياس بيرغ' });
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = new mongoose.Types.ObjectId();
    const ben2 = new mongoose.Types.ObjectId();
    // ben1: 3 admins → eligible
    await seedRichPair({
      beneficiaryId: ben1,
      measureId: berg._id,
      branchId,
      scores: [20, 28, 40], // delta=20 ≥ mcid=4 → achieved
    });
    // ben2: 2 admins only → thin, must NOT appear in byMeasure
    await seedAdmin({ beneficiaryId: ben2, measureId: berg._id, branchId, daysAgo: 50, score: 25 });
    await seedAdmin({ beneficiaryId: ben2, measureId: berg._id, branchId, daysAgo: 20, score: 28 });

    const r = await aggregator.aggregateBranch(branchId);
    expect(r.byMeasure).toHaveLength(1);
    expect(r.byMeasure[0]).toMatchObject({
      measureCode: 'BERG',
      measureNameAr: 'مقياس بيرغ',
      pairsAnalysed: 1,
      mcidAchievedCount: 1,
      mcidAchievementRate: 1,
    });
  });

  test('per-measure MCID achievement rate computed independently', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'مقياس بيرغ', mcid: 4 });
    const fim = await makeMeasure({ code: 'FIM', name_ar: 'مقياس FIM', mcid: 5 });
    const branchId = new mongoose.Types.ObjectId();

    // BERG: 2 pairs, one achieved (delta=20), one not (delta=2)
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: berg._id,
      branchId,
      scores: [20, 28, 40],
    });
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: berg._id,
      branchId,
      scores: [10, 11, 12],
    });

    // FIM: 1 pair, achieved (delta=15 ≥ 5)
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: fim._id,
      branchId,
      scores: [30, 38, 45],
      mcidValue: 5,
    });

    const r = await aggregator.aggregateBranch(branchId);
    expect(r.byMeasure).toHaveLength(2);
    const bergRow = r.byMeasure.find(m => m.measureCode === 'BERG');
    const fimRow = r.byMeasure.find(m => m.measureCode === 'FIM');
    expect(bergRow).toMatchObject({
      pairsAnalysed: 2,
      mcidAchievedCount: 1,
      mcidAchievementRate: 0.5,
      measureNameAr: 'مقياس بيرغ',
    });
    expect(fimRow).toMatchObject({
      pairsAnalysed: 1,
      mcidAchievedCount: 1,
      mcidAchievementRate: 1,
      measureNameAr: 'مقياس FIM',
    });
  });

  test('sorted by pairsAnalysed desc, code asc tiebreaker', async () => {
    // Three measures with descending evidence weight; verify sort.
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const fim = await makeMeasure({ code: 'FIM', name_ar: 'FIM' });
    const tug = await makeMeasure({ code: 'TUG', name_ar: 'TUG', mcid: 2 });
    const branchId = new mongoose.Types.ObjectId();

    // BERG: 3 pairs
    for (let i = 0; i < 3; i++) {
      await seedRichPair({
        beneficiaryId: new mongoose.Types.ObjectId(),
        measureId: berg._id,
        branchId,
        scores: [10, 12, 14],
      });
    }
    // FIM: 1 pair
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: fim._id,
      branchId,
      scores: [10, 12, 14],
    });
    // TUG: 1 pair — same count as FIM, but TUG sorts AFTER FIM by code asc
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: tug._id,
      branchId,
      scores: [10, 12, 14],
    });

    const r = await aggregator.aggregateBranch(branchId);
    const codes = r.byMeasure.map(m => m.measureCode);
    expect(codes).toEqual(['BERG', 'FIM', 'TUG']);
  });

  test('existing top-level fields unchanged (regression guard)', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const branchId = new mongoose.Types.ObjectId();
    await seedRichPair({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: berg._id,
      branchId,
      scores: [10, 14, 18],
    });

    const r = await aggregator.aggregateBranch(branchId);
    // Top-level shape from W229 must still resolve correctly.
    expect(r).toHaveProperty('branchId');
    expect(r).toHaveProperty('mcidAchievementRate');
    expect(r).toHaveProperty('alerts');
    expect(r).toHaveProperty('goals');
    expect(r.pairsAnalysed).toBe(1);
    expect(r.mcidAchievedCount).toBe(1);
    // The sum of per-measure mcidAchievedCount should match the top-level.
    const sumByMeasure = r.byMeasure.reduce((s, m) => s + m.mcidAchievedCount, 0);
    expect(sumByMeasure).toBe(r.mcidAchievedCount);
  });
});
