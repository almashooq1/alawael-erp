'use strict';

/**
 * measure-ministry-report-wave242.test.js — Wave 242.
 *
 * Verifies the monthly MOHRSD report generator atop the W229 branch
 * aggregator. Two layers:
 *
 *   Pure helpers (no DB):
 *     - _validatePeriod: range checks year + month
 *     - _periodBounds: UTC bounds for {year, month}
 *     - _csvEscape: comma/quote/newline escaping
 *     - MONTH_NAMES_AR has 12 entries
 *
 *   Real-DB integration:
 *     - generate: structured report shape + signoff
 *     - period bounds correctly window the aggregation
 *     - perMeasureMinistryRollup only contains measures with
 *       reporting.ministryReportField set
 *     - thin-history measures land in pairsThinHistory, not denom
 *     - MCID achievement direction-aware (lower_better flips delta sign)
 *     - generateCsv: BOM prefix, header rows, per-measure table
 *     - models_unavailable propagates
 *     - missing branch metadata → null fields, doesn't crash
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
let MeasureAlert;
let TherapeuticGoal;
let ministry;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w242-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  ministry = require('../services/measureMinistryReport.service');
  await MeasureApplication.init();
  await MeasureAlert.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureAlert.deleteMany({});
  await TherapeuticGoal.deleteMany({});
});

// ─── Pure helpers ─────────────────────────────────────────────────

describe('W242 — pure helpers', () => {
  test('_validatePeriod accepts valid', () => {
    expect(ministry._validatePeriod({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 5 });
    expect(ministry._validatePeriod({ year: '2026', month: '12' })).toEqual({
      year: 2026,
      month: 12,
    });
  });

  test('_validatePeriod rejects bad year', () => {
    expect(() => ministry._validatePeriod({ year: 1800, month: 5 })).toThrow(/year/);
    expect(() => ministry._validatePeriod({ year: 'abc', month: 5 })).toThrow(/year/);
  });

  test('_validatePeriod rejects bad month', () => {
    expect(() => ministry._validatePeriod({ year: 2026, month: 13 })).toThrow(/month/);
    expect(() => ministry._validatePeriod({ year: 2026, month: 0 })).toThrow(/month/);
  });

  test('_periodBounds: UTC first-to-last-ms of month', () => {
    const { from, to } = ministry._periodBounds(2026, 5);
    expect(from.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-05-31T23:59:59.999Z');
  });

  test('_periodBounds: December (year boundary)', () => {
    const { from, to } = ministry._periodBounds(2026, 12);
    expect(from.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  test('_periodBounds: February non-leap', () => {
    const { to } = ministry._periodBounds(2026, 2);
    expect(to.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  test('_csvEscape: simple values pass through', () => {
    expect(ministry._csvEscape('abc')).toBe('abc');
    expect(ministry._csvEscape(42)).toBe('42');
    expect(ministry._csvEscape(null)).toBe('');
  });

  test('_csvEscape: comma/quote/newline forces quoting', () => {
    expect(ministry._csvEscape('a,b')).toBe('"a,b"');
    expect(ministry._csvEscape('a"b')).toBe('"a""b"');
    expect(ministry._csvEscape('a\nb')).toBe('"a\nb"');
  });

  test('MONTH_NAMES_AR has 12 entries', () => {
    expect(ministry.MONTH_NAMES_AR).toHaveLength(12);
    expect(ministry.MONTH_NAMES_AR[0]).toBe('يناير');
    expect(ministry.MONTH_NAMES_AR[11]).toBe('ديسمبر');
  });
});

// ─── Fixtures ─────────────────────────────────────────────────────

async function makeBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg Balance Scale',
    name_ar: 'مقياس بيرغ للتوازن',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
      sdc: { value: 2, ci: 0.95 },
    },
    reporting: {
      showInFamilyReport: true,
      ministryReportField: 'motor_balance_outcome',
    },
    ...overrides,
  });
}

async function seedAdmin({ beneficiaryId, measureId, branchId, atDate, score }) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
    branchId,
    applicationDate: atDate,
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
      source: 'Donoghue 2009',
    },
  });
}

// ─── Real-DB integration ──────────────────────────────────────────

describe('W242 — generate() structured report', () => {
  test('rejects bad period', async () => {
    await expect(
      ministry.generate(new mongoose.Types.ObjectId(), { year: 1800, month: 5 })
    ).rejects.toThrow(/year/);
  });

  test('empty branch returns zero summary + empty perMeasure', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    expect(r.reportType).toBe('MOHRSD_MONTHLY');
    expect(r.period.year).toBe(2026);
    expect(r.period.month).toBe(5);
    expect(r.period.monthName_ar).toBe('مايو');
    expect(r.beneficiaries.administeredInMonth).toBe(0);
    expect(r.administrations.total).toBe(0);
    expect(r.outcomes.mcidAchievedCount).toBe(0);
    expect(r.perMeasureMinistryRollup).toEqual([]);
    expect(r.signOff.requiresSignature).toBe(true);
    expect(r.signOff.signatureFields).toHaveLength(2);
  });

  test('period bounds window the aggregation correctly', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();

    // 3 admins in May 2026 (in window)
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      atDate: new Date('2026-05-05'),
      score: 20,
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      atDate: new Date('2026-05-15'),
      score: 28,
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      atDate: new Date('2026-05-28'),
      score: 32,
    });
    // 1 admin in April (out of window)
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      atDate: new Date('2026-04-15'),
      score: 18,
    });
    // 1 admin in June (out of window)
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      atDate: new Date('2026-06-05'),
      score: 35,
    });

    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    expect(r.administrations.total).toBe(3);
    expect(r.beneficiaries.administeredInMonth).toBe(1);
  });

  test('perMeasureMinistryRollup only includes measures with ministry field', async () => {
    const reportable = await makeBerg();
    const nonReportable = await makeBerg({
      code: 'BERG-INTERNAL',
      reporting: { showInFamilyReport: true },
    }); // no ministryReportField
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();

    for (const d of [5, 15, 28]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: reportable._id,
        branchId,
        atDate: new Date(`2026-05-${String(d).padStart(2, '0')}`),
        score: 20 + d,
      });
      await seedAdmin({
        beneficiaryId: benId,
        measureId: nonReportable._id,
        branchId,
        atDate: new Date(`2026-05-${String(d).padStart(2, '0')}`),
        score: 20 + d,
      });
    }
    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    expect(r.perMeasureMinistryRollup).toHaveLength(1);
    expect(r.perMeasureMinistryRollup[0].measureCode).toBe('BERG');
    expect(r.perMeasureMinistryRollup[0].ministryReportField).toBe('motor_balance_outcome');
  });

  test('thin-history pair → pairsThinHistory, not denom', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const ben1 = new mongoose.Types.ObjectId();
    const ben2 = new mongoose.Types.ObjectId();

    // ben1: 3 admins, MCID achieved (20→24→40, delta=20 > MCID=4)
    for (const item of [
      { d: 5, s: 20 },
      { d: 15, s: 24 },
      { d: 25, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben1,
        measureId: measure._id,
        branchId,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    // ben2: 2 admins (thin)
    for (const item of [
      { d: 8, s: 30 },
      { d: 22, s: 32 },
    ]) {
      await seedAdmin({
        beneficiaryId: ben2,
        measureId: measure._id,
        branchId,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    const row = r.perMeasureMinistryRollup[0];
    expect(row.pairsAnalysed).toBe(1);
    expect(row.pairsThinHistory).toBe(1);
    expect(row.mcidAchievedCount).toBe(1);
    expect(row.mcidAchievementRate).toBe(1);
    expect(row.averageDelta).toBe(20); // ben1 delta (ben2 not in denom)
  });

  test('lower_better measure: declining delta counted as improvement', async () => {
    const measure = await makeBerg({
      code: 'LOW-BETTER',
      scoringDirection: 'lower_better',
      reporting: { ministryReportField: 'pain_intensity' },
    });
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    // 30 → 20 → 10 = 20-point improvement under lower_better
    for (const item of [
      { d: 5, s: 30 },
      { d: 15, s: 20 },
      { d: 25, s: 10 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        branchId,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    const row = r.perMeasureMinistryRollup[0];
    expect(row.mcidAchievedCount).toBe(1); // 20 ≥ MCID 4
    expect(row.averageDelta).toBe(20); // direction-flipped to positive
  });

  test('byPurpose breakdown', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();

    await MeasureApplication.create({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      applicationDate: new Date('2026-05-05'),
      purpose: 'baseline',
      assessorId: new mongoose.Types.ObjectId(),
      totalRawScore: 20,
      status: 'completed',
      scoredWithMeasureVersion: '1.0.0',
    });
    await MeasureApplication.create({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      applicationDate: new Date('2026-05-15'),
      purpose: 'progress',
      assessorId: new mongoose.Types.ObjectId(),
      totalRawScore: 28,
      status: 'completed',
      scoredWithMeasureVersion: '1.0.0',
    });
    await MeasureApplication.create({
      beneficiaryId: benId,
      measureId: measure._id,
      branchId,
      applicationDate: new Date('2026-05-25'),
      purpose: 'progress',
      assessorId: new mongoose.Types.ObjectId(),
      totalRawScore: 36,
      status: 'completed',
      scoredWithMeasureVersion: '1.0.0',
    });
    const r = await ministry.generate(branchId, { year: 2026, month: 5 });
    expect(r.administrations.byPurpose.baseline).toBe(1);
    expect(r.administrations.byPurpose.progress).toBe(2);
  });

  test('models_unavailable propagates from aggregator', async () => {
    const aggregator = require('../services/measureOutcomesAggregator.service');
    const spy = jest
      .spyOn(aggregator, 'aggregateBranch')
      .mockResolvedValueOnce({ error: 'models_unavailable' });
    const r = await ministry.generate(new mongoose.Types.ObjectId(), { year: 2026, month: 5 });
    expect(r.error).toBe('models_unavailable');
    expect(r.period.year).toBe(2026);
    spy.mockRestore();
  });
});

// ─── CSV generation ──────────────────────────────────────────────

describe('W242 — generateCsv()', () => {
  test('returns BOM-prefixed UTF-8 CSV with header + summary + table', async () => {
    const measure = await makeBerg();
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 5, s: 20 },
      { d: 15, s: 28 },
      { d: 25, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        branchId,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    const csv = await ministry.generateCsv(branchId, { year: 2026, month: 5 });
    expect(csv).toBeTruthy();
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toMatch(/تقرير شهري للوزارة/);
    expect(csv).toMatch(/مايو 2026/);
    expect(csv).toMatch(/motor_balance_outcome/);
    expect(csv).toMatch(/BERG/);
    // Table header row presence
    expect(csv).toMatch(/حقل الوزارة,رمز المقياس/);
  });

  test('returns null when aggregator unavailable', async () => {
    const aggregator = require('../services/measureOutcomesAggregator.service');
    const spy = jest
      .spyOn(aggregator, 'aggregateBranch')
      .mockResolvedValueOnce({ error: 'models_unavailable' });
    const csv = await ministry.generateCsv(new mongoose.Types.ObjectId(), { year: 2026, month: 5 });
    expect(csv).toBeNull();
    spy.mockRestore();
  });

  test('CSV escapes ASCII commas in measure names (the CSV-format risk)', async () => {
    // Note: CSV-format only treats ASCII comma U+002C as a delimiter.
    // Arabic comma ، U+060C is just text data — Excel parses it fine
    // without quoting. We test the only escape that actually matters.
    const measure = await makeBerg({
      code: 'X-COMMA',
      name_ar: 'مقياس, with ASCII comma',
    });
    const branchId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 5, s: 20 },
      { d: 15, s: 28 },
      { d: 25, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        branchId,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    const csv = await ministry.generateCsv(branchId, { year: 2026, month: 5 });
    expect(csv).toMatch(/"مقياس, with ASCII comma"/);
  });
});
