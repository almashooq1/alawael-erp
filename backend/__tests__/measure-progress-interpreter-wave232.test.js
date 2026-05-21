'use strict';

/**
 * measure-progress-interpreter-wave232.test.js — Wave 232.
 *
 * Verifies the progress interpretation layer end-to-end:
 *
 *   Pure rules:
 *     - directionAwareDelta sign handling for higher_better + lower_better
 *     - resolveMcid: measure-level wins, pct-of-range fallback, missing flag
 *     - resolveSdc: explicit > mcid-half fallback
 *     - atCeiling boundary checks
 *     - detectRegression / detectPlateau decision logic
 *     - pickCategory priority matrix
 *     - computeConfidence tier mapping + dampeners
 *     - renderTemplate AR/EN substitution + Eastern Arabic numerals
 *
 *   Orchestrator (with real DB):
 *     - INSUFFICIENT_DATA when <3 admins or no baseline
 *     - SUSTAINED_IMPROVEMENT on a clearly improving Berg series
 *     - REGRESSION on a clearly declining series
 *     - STABLE within sdc band
 *     - CEILING_ACHIEVED when current at max
 *     - lower_better measure: lower score → SUSTAINED_IMPROVEMENT
 *     - mcidMissing caveat surfaces when measure has no MCID
 *     - includeRawDeltas opt-in attaches numbers block
 *     - interpretAll rollup picks worst-severity headline
 *     - measure not found returns gracefully
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
let rules;
let interpreter;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w232-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  interpreter = require('../services/measureProgressInterpreter.service');
  rules = require('../measures/interpretation/rules');
  await Measure.init();
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

const DAY = 86400000;

async function seedMeasure({
  code = 'BERG',
  scoringDirection = 'higher_better',
  mcid = 4,
  mcidStatus = 'established',
  sdc = 2,
  minScore = 0,
  maxScore = 56,
  ...extra
} = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    minScore,
    maxScore,
    scoringDirection,
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation:
      mcid != null
        ? {
            mcid: { value: mcid, type: 'absolute', status: mcidStatus, source: 'cite' },
            sdc: sdc != null ? { value: sdc } : undefined,
          }
        : undefined,
    targetPopulation: ['all'],
    ...extra,
  });
}

async function seedAdmin({
  benId,
  measureId,
  daysAgo,
  totalRawScore,
  isBaseline = false,
  status = 'completed',
  scoredWithMeasureVersion,
  assessorId,
}) {
  return MeasureApplication.create({
    beneficiaryId: benId,
    measureId,
    assessorId: assessorId || new mongoose.Types.ObjectId(),
    applicationDate: new Date(Date.now() - daysAgo * DAY),
    totalRawScore,
    status,
    isBaseline,
    // W211b governance: isBaseline=true requires purpose='baseline'
    purpose: isBaseline ? 'baseline' : 'progress',
    ...(scoredWithMeasureVersion ? { scoredWithMeasureVersion } : {}),
    ...(status === 'locked'
      ? {
          scoredWithMeasureVersion: scoredWithMeasureVersion || '1.0.0',
          scoredWithAlgorithmVersion: '1.0.0',
          lockedAt: new Date(),
          lockedBy: new mongoose.Types.ObjectId(),
        }
      : {}),
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. Pure helpers
// ════════════════════════════════════════════════════════════════════════

describe('W232 — directionAwareDelta', () => {
  test('higher_better: positive delta when current > baseline', () => {
    expect(rules.directionAwareDelta(20, 32, 'higher_better')).toBe(12);
  });

  test('higher_better: negative delta when current < baseline', () => {
    expect(rules.directionAwareDelta(40, 30, 'higher_better')).toBe(-10);
  });

  test('lower_better: positive delta when current < baseline (improvement)', () => {
    expect(rules.directionAwareDelta(20, 12, 'lower_better')).toBe(8);
  });

  test('lower_better: negative delta when current > baseline (worsening)', () => {
    expect(rules.directionAwareDelta(20, 30, 'lower_better')).toBe(-10);
  });

  test('null on non-numeric inputs', () => {
    expect(rules.directionAwareDelta(null, 30, 'higher_better')).toBeNull();
    expect(rules.directionAwareDelta(20, 'thirty', 'higher_better')).toBeNull();
  });
});

describe('W232 — resolveMcid', () => {
  test('measure-level mcid wins', () => {
    const m = { interpretation: { mcid: { value: 4, status: 'established' } } };
    const r = rules.resolveMcid(m);
    expect(r.value).toBe(4);
    expect(r.source).toBe('measure');
    expect(r.missing).toBe(false);
  });

  test('literature_pending status falls back', () => {
    const m = {
      interpretation: { mcid: { value: 4, status: 'literature_pending' } },
      minScore: 0,
      maxScore: 100,
    };
    const r = rules.resolveMcid(m);
    expect(r.source).toBe('pct_of_range_fallback');
    expect(r.value).toBe(20); // 20% of 100
    expect(r.missing).toBe(true);
  });

  test('no MCID + no range → unresolved', () => {
    const r = rules.resolveMcid({});
    expect(r.value).toBeNull();
    expect(r.source).toBe('unresolved');
    expect(r.missing).toBe(true);
  });
});

describe('W232 — resolveSdc', () => {
  test('explicit sdc wins', () => {
    const m = { interpretation: { sdc: { value: 3 } } };
    expect(rules.resolveSdc(m, 6).value).toBe(3);
  });

  test('falls back to half-mcid', () => {
    const r = rules.resolveSdc({}, 8);
    expect(r.value).toBe(4);
    expect(r.source).toBe('mcid_half_fallback');
  });

  test('unresolved when no sdc + no mcid', () => {
    expect(rules.resolveSdc({}, null).value).toBeNull();
  });
});

describe('W232 — atCeiling', () => {
  test('higher_better: value near maxScore → true', () => {
    const m = { minScore: 0, maxScore: 56 };
    expect(rules.atCeiling(55, m, 'higher_better')).toBe(true);
    expect(rules.atCeiling(30, m, 'higher_better')).toBe(false);
  });

  test('lower_better: value near minScore → true', () => {
    const m = { minScore: 0, maxScore: 100 };
    expect(rules.atCeiling(1, m, 'lower_better')).toBe(true);
    expect(rules.atCeiling(50, m, 'lower_better')).toBe(false);
  });

  test('null when no range', () => {
    expect(rules.atCeiling(42, {}, 'higher_better')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. pickCategory priority matrix (pure)
// ════════════════════════════════════════════════════════════════════════

function buildCtx(overrides = {}) {
  const base = {
    history: [],
    baseline: null,
    current: null,
    prior: null,
    measure: { minScore: 0, maxScore: 56, scoringDirection: 'higher_better' },
    scoringDirection: 'higher_better',
    mcidValue: 4,
    sdcValue: 2,
    trendFit: null,
    openAlertTypes: new Set(),
    isMixed: false,
    atCeiling: false,
    atFloor: false,
  };
  return { ...base, ...overrides };
}

describe('W232 — pickCategory priority', () => {
  test('INSUFFICIENT_DATA when no baseline', () => {
    expect(rules.pickCategory(buildCtx({ history: [{ value: 30, date: new Date() }] }))).toBe(
      'INSUFFICIENT_DATA'
    );
  });

  test('INSUFFICIENT_DATA when history < 3', () => {
    expect(
      rules.pickCategory(
        buildCtx({
          baseline: { value: 20, date: new Date() },
          current: { value: 25, date: new Date() },
          history: [{ value: 20 }, { value: 25 }],
        })
      )
    ).toBe('INSUFFICIENT_DATA');
  });

  test('CEILING_ACHIEVED beats SUSTAINED_IMPROVEMENT', () => {
    const ctx = buildCtx({
      baseline: { value: 20, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 56, date: new Date() },
      history: [{ value: 20 }, { value: 38 }, { value: 56 }],
      atCeiling: true,
    });
    expect(rules.pickCategory(ctx)).toBe('CEILING_ACHIEVED');
  });

  test('REGRESSION on declining series past MCID', () => {
    const ctx = buildCtx({
      baseline: { value: 40, date: new Date(Date.now() - 100 * DAY) },
      current: { value: 25, date: new Date() },
      history: [
        { value: 40, date: new Date(Date.now() - 100 * DAY) },
        { value: 45, date: new Date(Date.now() - 60 * DAY) },
        { value: 30, date: new Date(Date.now() - 20 * DAY) },
        { value: 25, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('REGRESSION');
  });

  test('REGRESSION via alert short-circuit', () => {
    const ctx = buildCtx({
      baseline: { value: 30, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 31, date: new Date() },
      history: [{ value: 30 }, { value: 31 }, { value: 31 }],
      openAlertTypes: new Set(['REGRESSION_DETECTED']),
    });
    expect(rules.pickCategory(ctx)).toBe('REGRESSION');
  });

  test('PLATEAU after early improvement + late stability', () => {
    const ctx = buildCtx({
      baseline: { value: 20, date: new Date(Date.now() - 150 * DAY) },
      current: { value: 38, date: new Date() },
      history: [
        { value: 20, date: new Date(Date.now() - 150 * DAY) },
        { value: 28, date: new Date(Date.now() - 100 * DAY) }, // midpoint — improved
        { value: 37, date: new Date(Date.now() - 70 * DAY) }, // first of stable trio
        { value: 38, date: new Date(Date.now() - 35 * DAY) }, // within ±sdc=2
        { value: 38, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('PLATEAU');
  });

  test('SUSTAINED_IMPROVEMENT when delta >= MCID + positive', () => {
    const ctx = buildCtx({
      baseline: { value: 20, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 32, date: new Date() },
      history: [
        { value: 20, date: new Date(Date.now() - 90 * DAY) },
        { value: 26, date: new Date(Date.now() - 45 * DAY) },
        { value: 32, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('SUSTAINED_IMPROVEMENT');
  });

  test('SLOW_PROGRESS when positive past SDC but below MCID', () => {
    const ctx = buildCtx({
      baseline: { value: 20, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 23, date: new Date() }, // +3 (MCID=4, SDC=2)
      history: [
        { value: 20, date: new Date(Date.now() - 90 * DAY) },
        { value: 22, date: new Date(Date.now() - 45 * DAY) },
        { value: 23, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('SLOW_PROGRESS');
  });

  test('STABLE when delta within SDC band', () => {
    const ctx = buildCtx({
      baseline: { value: 30, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 31, date: new Date() }, // +1, within sdc=2
      history: [
        { value: 30, date: new Date(Date.now() - 90 * DAY) },
        { value: 30, date: new Date(Date.now() - 45 * DAY) },
        { value: 31, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('STABLE');
  });

  test('STAGNANT via alert', () => {
    const ctx = buildCtx({
      baseline: { value: 30, date: new Date(Date.now() - 200 * DAY) },
      current: { value: 31, date: new Date() },
      history: [{ value: 30 }, { value: 30 }, { value: 31 }, { value: 30 }, { value: 31 }],
      openAlertTypes: new Set(['MCID_NOT_MET']),
    });
    expect(rules.pickCategory(ctx)).toBe('STAGNANT');
  });

  test('OSCILLATION when CI95 spans 0 and noise > sdc', () => {
    const ctx = buildCtx({
      baseline: { value: 30, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 33, date: new Date() }, // |delta|=3 > sdc=2
      history: [{ value: 30 }, { value: 28 }, { value: 35 }, { value: 33 }],
      trendFit: { slope: 0.01, r2: 0.1, ci95Lower: -0.5, ci95Upper: 0.5, n: 4 },
    });
    expect(rules.pickCategory(ctx)).toBe('OSCILLATION');
  });

  test('MIXED_DOMAINS short-circuit', () => {
    const ctx = buildCtx({
      baseline: { value: 30, date: new Date() },
      current: { value: 35, date: new Date() },
      history: [{ value: 30 }, { value: 32 }, { value: 35 }],
      isMixed: true,
    });
    expect(rules.pickCategory(ctx)).toBe('MIXED_DOMAINS');
  });

  test('lower_better: lower current → SUSTAINED_IMPROVEMENT', () => {
    const ctx = buildCtx({
      scoringDirection: 'lower_better',
      mcidValue: 4,
      sdcValue: 2,
      baseline: { value: 20, date: new Date(Date.now() - 90 * DAY) },
      current: { value: 10, date: new Date() }, // direction-aware delta = +10
      history: [
        { value: 20, date: new Date(Date.now() - 90 * DAY) },
        { value: 15, date: new Date(Date.now() - 45 * DAY) },
        { value: 10, date: new Date() },
      ],
    });
    expect(rules.pickCategory(ctx)).toBe('SUSTAINED_IMPROVEMENT');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. computeConfidence
// ════════════════════════════════════════════════════════════════════════

describe('W232 — computeConfidence', () => {
  test('NONE when history < 3', () => {
    expect(rules.computeConfidence(buildCtx({ history: [{}] }))).toBe('none');
  });

  test('LOW when history >= 3', () => {
    expect(rules.computeConfidence(buildCtx({ history: [{}, {}, {}] }))).toBe('low');
  });

  test('HIGH when history >= 8', () => {
    expect(rules.computeConfidence(buildCtx({ history: Array(8).fill({}) }))).toBe('high');
  });

  test('VERY_HIGH when history >= 12', () => {
    expect(rules.computeConfidence(buildCtx({ history: Array(15).fill({}) }))).toBe('very_high');
  });

  test('dampened by staleness', () => {
    const ctx = buildCtx({ history: Array(8).fill({}), staleness: true });
    expect(rules.computeConfidence(ctx)).toBe('medium'); // high - 1 tier
  });

  test('multiple dampeners stack', () => {
    const ctx = buildCtx({
      history: Array(12).fill({}),
      staleness: true,
      versionMismatchInHistory: true,
      actorInconsistency: true,
    });
    // VERY_HIGH - 3 tiers = LOW
    expect(rules.computeConfidence(ctx)).toBe('low');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. renderTemplate
// ════════════════════════════════════════════════════════════════════════

describe('W232 — renderTemplate', () => {
  test('substitutes placeholders for AR + EN', () => {
    const out = rules.renderTemplate(
      'SUSTAINED_IMPROVEMENT',
      {
        measureName: 'Berg',
        measureName_ar: 'بيرغ',
        baselineValue: 20,
        currentValue: 32,
        percentSign: '+',
        percentChange: '21.4',
        daysSinceBaseline: 90,
        mcid: 4,
      },
      'ar'
    );
    expect(out.ar).toContain('بيرغ');
    expect(out.ar).toMatch(/[٠-٩]/); // Eastern Arabic numerals
    expect(out.en).toContain('Berg');
    expect(out.en).toContain('over 90 days');
  });

  test('Arabic numerals conversion preserves dash', () => {
    expect(rules.formatNumber(-5.3, 'ar')).toBe('−٥.٣');
    expect(rules.formatNumber(42, 'ar')).toBe('٤٢');
    expect(rules.formatNumber(42, 'en')).toBe('42');
  });

  test('unknown category returns fallback', () => {
    const out = rules.renderTemplate('NOT_A_CATEGORY', {
      measureName: 'X',
      measureName_ar: 'س',
    });
    expect(out.ar).toBe('س');
    expect(out.en).toBe('X');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Orchestrator integration
// ════════════════════════════════════════════════════════════════════════

describe('W232 — interpret() integration', () => {
  test('INSUFFICIENT_DATA when no admins', async () => {
    const m = await seedMeasure();
    const out = await interpreter.interpret({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureRef: m._id,
    });
    expect(out.category).toBe('INSUFFICIENT_DATA');
    expect(out.confidence).toBe('none');
    expect(out.summary.ar).toContain('بيانات غير كافية');
    expect(out.summary.en).toContain('Insufficient');
  });

  test('SUSTAINED_IMPROVEMENT on a clearly improving series', async () => {
    const m = await seedMeasure({ code: 'BERG_IMP', mcid: 4, sdc: 2 });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 90,
      totalRawScore: 20,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 45, totalRawScore: 28 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 0, totalRawScore: 36 });

    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
      locale: 'en',
      options: { includeRawDeltas: true },
    });
    expect(out.category).toBe('SUSTAINED_IMPROVEMENT');
    expect(out.color).toBe('green_dark');
    expect(out.numbers.absoluteFromBaseline).toBe(16);
    expect(out.numbers.mcidMet).toBe(true);
    expect(out.summary.en).toContain('Sustained improvement');
    expect(out.references.historyCount).toBe(3);
    expect(String(out.references.baselineApplicationId)).toBeTruthy();
  });

  test('REGRESSION on a declining series', async () => {
    const m = await seedMeasure({ code: 'BERG_REG', mcid: 4, sdc: 2 });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 120,
      totalRawScore: 40,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 80, totalRawScore: 45 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 40, totalRawScore: 32 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 0, totalRawScore: 26 });
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
      locale: 'ar',
    });
    expect(out.category).toBe('REGRESSION');
    expect(out.color).toBe('red');
    expect(out.summary.ar).toContain('تراجع');
    expect(out.summary.ar).toContain('⚠️');
  });

  test('STABLE within sdc band', async () => {
    const m = await seedMeasure({ code: 'BERG_STA', mcid: 4, sdc: 2 });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 90,
      totalRawScore: 30,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 45, totalRawScore: 30 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 0, totalRawScore: 31 });
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
    });
    expect(out.category).toBe('STABLE');
    expect(out.color).toBe('gray');
  });

  test('CEILING_ACHIEVED at maxScore', async () => {
    const m = await seedMeasure({ code: 'BERG_CL', mcid: 4, sdc: 2 });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 90,
      totalRawScore: 40,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 45, totalRawScore: 50 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 0, totalRawScore: 56 });
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
    });
    expect(out.category).toBe('CEILING_ACHIEVED');
    expect(out.color).toBe('green_dark');
  });

  test('lower_better measure: lower score → improvement', async () => {
    const m = await seedMeasure({
      code: 'PAIN10',
      scoringDirection: 'lower_better',
      mcid: 2,
      sdc: 1,
      minScore: 0,
      maxScore: 10,
    });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 90,
      totalRawScore: 8,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 45, totalRawScore: 5 });
    await seedAdmin({ benId, measureId: m._id, daysAgo: 0, totalRawScore: 3 });
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
      options: { includeRawDeltas: true },
    });
    expect(out.category).toBe('SUSTAINED_IMPROVEMENT');
    expect(out.numbers.absoluteFromBaseline).toBe(5); // direction-aware
  });

  test('mcidMissing caveat surfaces when measure lacks MCID', async () => {
    const m = await Measure.create({
      code: 'NOMCID',
      name: 'NoMcid',
      category: 'motor',
      version: '1.0.0',
      status: 'active',
      minScore: 0,
      maxScore: 100,
      scoringDirection: 'higher_better',
      administeredBy: ['physical_therapist'],
      ageRange: { min: 5, max: 95, unit: 'years' },
      reassessment: { standardIntervalDays: 90 },
      targetPopulation: ['all'],
    });
    const benId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 4; i++) {
      await seedAdmin({
        benId,
        measureId: m._id,
        daysAgo: 90 - i * 30,
        totalRawScore: 20 + i * 5,
        isBaseline: i === 0,
        ...(i === 0 ? { status: 'locked' } : {}),
      });
    }
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
      options: { includeRawDeltas: true },
    });
    expect(out.numbers.mcidMissing).toBe(true);
    expect(out.caveats.some(c => /MCID derived from percent-of-range/.test(c))).toBe(true);
  });

  test('measureRef by code resolves', async () => {
    const m = await seedMeasure({ code: 'BERG_BYC' });
    const benId = new mongoose.Types.ObjectId();
    for (let i = 0; i < 3; i++) {
      await seedAdmin({
        benId,
        measureId: m._id,
        daysAgo: 90 - i * 30,
        totalRawScore: 25 + i * 5,
        isBaseline: i === 0,
        ...(i === 0 ? { status: 'locked' } : {}),
      });
    }
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: 'BERG_BYC',
    });
    expect(out.measureCode).toBe('BERG_BYC');
  });

  test('measure not found returns graceful INSUFFICIENT_DATA', async () => {
    const out = await interpreter.interpret({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureRef: 'NONEXISTENT_CODE',
    });
    expect(out.category).toBe('INSUFFICIENT_DATA');
    expect(out.caveats).toContain('measure not found');
  });

  test('requires beneficiaryId + measureRef', async () => {
    await expect(interpreter.interpret({})).rejects.toThrow(/beneficiaryId required/);
    await expect(
      interpreter.interpret({ beneficiaryId: new mongoose.Types.ObjectId() })
    ).rejects.toThrow(/measureRef required/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. interpretAll rollup
// ════════════════════════════════════════════════════════════════════════

describe('W232 — interpretAll rollup', () => {
  test('worst-severity wins headline', async () => {
    const mImp = await seedMeasure({ code: 'M_IMP' });
    const mReg = await seedMeasure({ code: 'M_REG' });
    const benId = new mongoose.Types.ObjectId();
    // M_IMP: improving
    await seedAdmin({
      benId,
      measureId: mImp._id,
      daysAgo: 90,
      totalRawScore: 20,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: mImp._id, daysAgo: 45, totalRawScore: 28 });
    await seedAdmin({ benId, measureId: mImp._id, daysAgo: 0, totalRawScore: 36 });
    // M_REG: regressing
    await seedAdmin({
      benId,
      measureId: mReg._id,
      daysAgo: 120,
      totalRawScore: 40,
      isBaseline: true,
      status: 'locked',
    });
    await seedAdmin({ benId, measureId: mReg._id, daysAgo: 80, totalRawScore: 45 });
    await seedAdmin({ benId, measureId: mReg._id, daysAgo: 40, totalRawScore: 32 });
    await seedAdmin({ benId, measureId: mReg._id, daysAgo: 0, totalRawScore: 26 });

    const out = await interpreter.interpretAll({ beneficiaryId: benId });
    expect(out.byMeasure.length).toBe(2);
    expect(out.rollup.overallCategory).toBe('REGRESSION');
    expect(out.rollup.headlineMeasureCode).toBe('M_REG');
    expect(out.rollup.measuresImproving).toBe(1);
    expect(out.rollup.measuresRegressing).toBe(1);
  });

  test('empty beneficiary returns empty rollup', async () => {
    const out = await interpreter.interpretAll({
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(out.byMeasure).toEqual([]);
    expect(out.rollup.total).toBe(0);
    expect(out.rollup.overallCategory).toBe('INSUFFICIENT_DATA');
  });

  test('requires beneficiaryId', async () => {
    await expect(interpreter.interpretAll({})).rejects.toThrow(/beneficiaryId required/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Confidence dampeners from context flags
// ════════════════════════════════════════════════════════════════════════

describe('W232 — confidence dampeners surface', () => {
  test('cross-version history triggers caveat + dampens confidence', async () => {
    const m = await seedMeasure({ code: 'BERG_V' });
    const benId = new mongoose.Types.ObjectId();
    // Mix versions across baseline + history
    await seedAdmin({
      benId,
      measureId: m._id,
      daysAgo: 200,
      totalRawScore: 20,
      isBaseline: true,
      status: 'locked',
      scoredWithMeasureVersion: '1.0.0',
    });
    for (let i = 1; i < 9; i++) {
      await seedAdmin({
        benId,
        measureId: m._id,
        daysAgo: 200 - i * 20,
        totalRawScore: 20 + i * 2,
        scoredWithMeasureVersion: i < 5 ? '1.0.0' : '2.0.0',
      });
    }
    const out = await interpreter.interpret({
      beneficiaryId: benId,
      measureRef: m._id,
      options: { includeSignals: true },
    });
    expect(out.signals.versionMismatchInHistory).toBe(true);
    expect(out.caveats.some(c => /multiple measure versions/.test(c))).toBe(true);
  });
});
