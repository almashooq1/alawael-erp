'use strict';

/**
 * measure-outcomes-pairs-drill-wave256.test.js — Wave 256.
 *
 * Drill-through service method for the W255 per-measure compare cell.
 * `aggregateBranch().byMeasure[measureId]` says "FIM tracks at 25%";
 * `listMeasurePairsAt({branchId, measureId})` says "here are the 12
 * beneficiary pairs and which 3 achieved MCID".
 *
 * Invariants the test pins:
 *   - empty branch → pairs: []
 *   - thin-history pairs (admins < 3) excluded from `pairs[]` but
 *     surfaced in `pairsThinHistory` count
 *   - direction-aware MCID delta (lower_better flips sign)
 *   - mcid status = established | provisional drives eligibility
 *   - measure metadata (code + name_ar) enriched from Measure lookup
 *   - beneficiary names + numbers enriched from Beneficiary lookup
 *   - sort order: non-achievers first, then by adminCount desc, then
 *     |delta| desc
 *   - sum of achieved pairs equals byMeasure rollup count (cross-check)
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w256-test' } });
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

// ─── Fixtures ───────────────────────────────────────────────────────────────

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

async function makeBeneficiary({ firstName_ar, beneficiaryNumber }) {
  return Beneficiary.create({
    firstName: 'TestFirst',
    lastName: 'TestLast',
    firstName_ar: firstName_ar || 'مستفيد',
    lastName_ar: '',
    beneficiaryNumber: beneficiaryNumber || `B-${Math.floor(Math.random() * 100000)}`,
    gender: 'male',
    dateOfBirth: new Date('2015-01-01'),
    nationality: 'SA',
    branchId: new mongoose.Types.ObjectId(),
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

describe('W256 — aggregator.listMeasurePairsAt', () => {
  test('throws when branchId or measureId missing', async () => {
    await expect(aggregator.listMeasurePairsAt({})).rejects.toThrow(/required/);
    await expect(
      aggregator.listMeasurePairsAt({ branchId: new mongoose.Types.ObjectId() })
    ).rejects.toThrow(/required/);
  });

  test('empty branch returns empty pairs array', async () => {
    const r = await aggregator.listMeasurePairsAt({
      branchId: new mongoose.Types.ObjectId(),
      measureId: new mongoose.Types.ObjectId(),
    });
    expect(r.pairs).toEqual([]);
    expect(r.pairsThinHistory).toBe(0);
  });

  test('thin-history pairs excluded from pairs[], counted in pairsThinHistory', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const ben1 = await makeBeneficiary({ firstName_ar: 'علي' });
    const ben2 = await makeBeneficiary({ firstName_ar: 'سارة' });
    const branchId = new mongoose.Types.ObjectId();

    // ben1: 3 admins → rich
    await seedRichPair({
      beneficiaryId: ben1._id,
      measureId: berg._id,
      branchId,
      scores: [20, 28, 40],
    });
    // ben2: 2 admins → thin
    await seedAdmin({
      beneficiaryId: ben2._id,
      measureId: berg._id,
      branchId,
      daysAgo: 50,
      score: 25,
    });
    await seedAdmin({
      beneficiaryId: ben2._id,
      measureId: berg._id,
      branchId,
      daysAgo: 20,
      score: 28,
    });

    const r = await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id });
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].beneficiaryNameAr).toBe('علي');
    expect(r.pairs[0].adminCount).toBe(3);
    expect(r.pairsThinHistory).toBe(1);
  });

  test('MCID achievement direction-aware (lower_better flips sign)', async () => {
    // For lower-is-better measure, delta = (first - last). A score going
    // 30 → 20 is a 10-point improvement that should clear MCID=4.
    const tug = await makeMeasure({
      code: 'TUG',
      name_ar: 'مقياس TUG',
      scoringDirection: 'lower_better',
      mcid: 4,
    });
    const ben = await makeBeneficiary({ firstName_ar: 'محمد' });
    const branchId = new mongoose.Types.ObjectId();
    await seedRichPair({
      beneficiaryId: ben._id,
      measureId: tug._id,
      branchId,
      scores: [30, 25, 20],
    });

    const r = await aggregator.listMeasurePairsAt({ branchId, measureId: tug._id });
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].mcidAchieved).toBe(true);
    expect(r.pairs[0].delta).toBe(10); // direction-flipped to positive
  });

  test('mcid status outside established|provisional disqualifies', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const ben = await makeBeneficiary({ firstName_ar: 'فهد' });
    const branchId = new mongoose.Types.ObjectId();
    // Big delta, but mcid status='preliminary' should not count as achieved.
    const days = [80, 50, 20];
    const scores = [20, 28, 40];
    for (let i = 0; i < 3; i++) {
      await MeasureApplication.create({
        beneficiaryId: ben._id,
        measureId: berg._id,
        branchId,
        applicationDate: new Date(Date.now() - days[i] * 86400000),
        purpose: 'progress',
        assessorId: new mongoose.Types.ObjectId(),
        totalRawScore: scores[i],
        status: 'completed',
        scoredWithMeasureVersion: '1.0.0',
        scoredWithAlgorithmVersion: '1.0.0',
        mcidAtAdministration: {
          value: 4,
          type: 'absolute',
          // 'literature_pending' = not yet ready to count as achievement.
          // 'preliminary' was the original intent but isn't in the enum;
          // semantically equivalent for this test.
          status: 'literature_pending',
          source: 'test',
        },
      });
    }
    const r = await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id });
    expect(r.pairs[0].mcidAchieved).toBe(false);
    expect(r.pairs[0].mcidStatus).toBe('literature_pending');
  });

  test('measure metadata + beneficiary names enriched', async () => {
    const fim = await makeMeasure({ code: 'FIM', name_ar: 'مقياس FIM' });
    const ben = await makeBeneficiary({ firstName_ar: 'يوسف' });
    const branchId = new mongoose.Types.ObjectId();
    await seedRichPair({
      beneficiaryId: ben._id,
      measureId: fim._id,
      branchId,
      scores: [20, 25, 30],
    });

    const r = await aggregator.listMeasurePairsAt({ branchId, measureId: fim._id });
    expect(r.measureCode).toBe('FIM');
    expect(r.measureNameAr).toBe('مقياس FIM');
    expect(r.pairs[0].beneficiaryNameAr).toBe('يوسف');
    // beneficiaryNumber is the convention in /api/v1/therapist/beneficiaries
    // even though it's not in the current Beneficiary schema; service emits
    // null when the field is absent (matches W237 pattern).
    expect(r.pairs[0].beneficiaryNumber).toBeNull();
  });

  test('sort order: non-achievers first, then adminCount desc, then |delta| desc', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = await makeBeneficiary({ firstName_ar: 'أحمد' });
    const ben2 = await makeBeneficiary({ firstName_ar: 'سعد' });
    const ben3 = await makeBeneficiary({ firstName_ar: 'خالد' });

    // ben1: achieved (delta=20)
    await seedRichPair({
      beneficiaryId: ben1._id,
      measureId: berg._id,
      branchId,
      scores: [20, 28, 40],
    });
    // ben2: NOT achieved (delta=2)
    await seedRichPair({
      beneficiaryId: ben2._id,
      measureId: berg._id,
      branchId,
      scores: [10, 11, 12],
    });
    // ben3: NOT achieved bigger |delta| (delta=3)
    await seedRichPair({
      beneficiaryId: ben3._id,
      measureId: berg._id,
      branchId,
      scores: [10, 12, 13],
    });

    const r = await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id });
    // Non-achievers first: ben3 (|d|=3) > ben2 (|d|=2), then ben1 last.
    expect(r.pairs.map(p => p.beneficiaryNameAr)).toEqual(['خالد', 'سعد', 'أحمد']);
    expect(r.pairs[2].mcidAchieved).toBe(true);
  });

  test('cross-check: achieved count in pairs[] matches aggregateBranch byMeasure', async () => {
    const berg = await makeMeasure({ code: 'BERG', name_ar: 'بيرغ' });
    const branchId = new mongoose.Types.ObjectId();
    // 3 achievers + 2 non-achievers = 5 rich pairs total
    for (const scores of [
      [20, 28, 40],
      [10, 14, 18],
      [12, 14, 17],
    ]) {
      const ben = await makeBeneficiary({ firstName_ar: 'X' });
      await seedRichPair({ beneficiaryId: ben._id, measureId: berg._id, branchId, scores });
    }
    for (const scores of [
      [10, 11, 12],
      [10, 11, 13],
    ]) {
      const ben = await makeBeneficiary({ firstName_ar: 'Y' });
      await seedRichPair({ beneficiaryId: ben._id, measureId: berg._id, branchId, scores });
    }

    const drill = await aggregator.listMeasurePairsAt({ branchId, measureId: berg._id });
    const branch = await aggregator.aggregateBranch(branchId);
    const bergRow = branch.byMeasure.find(m => m.measureCode === 'BERG');

    const achievedInDrill = drill.pairs.filter(p => p.mcidAchieved).length;
    expect(achievedInDrill).toBe(bergRow.mcidAchievedCount);
    expect(drill.pairs.length).toBe(bergRow.pairsAnalysed);
  });
});
