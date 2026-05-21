'use strict';

/**
 * measure-family-report-wave240.test.js — Wave 240.
 *
 * Verifies the family-friendly Arabic report generator atop the W229
 * aggregator. Two layers:
 *
 *   Pure helpers (no DB):
 *     - _formatScore: rounds, handles null/Infinity
 *     - _verdictForMeasureRow: MCID achieved > trend > insufficient
 *     - _fallbackMeasureName: reporting.familyFriendlyLabel_ar →
 *         name_ar → measureName_ar → name → fallback string
 *     - TREND_LABELS_AR / OVERALL_HEADLINES_AR / ALERT_PARAGRAPHS_AR
 *       have entries for every code the engines emit
 *
 *   Real-DB integration via aggregator + administer:
 *     - Empty beneficiary → insufficient headline, no measures, no
 *       alert paragraphs, signOff present
 *     - Improving series → progressing headline, MCID flagged when
 *       delta ≥ frozen MCID, narrative mentions improvements
 *     - Regression alert open → concerning headline, REGRESSION
 *       alert paragraph included
 *     - includeHiddenMeasures=false hides measures with
 *       reporting.showInFamilyReport=false; =true keeps them
 *     - familyFriendlyLabel_ar replaces clinical name when defined
 *     - No clinical jargon leaks through (no GMFCS / CI95 / r2 /
 *       slope text in the rendered Arabic output)
 *     - models_unavailable propagates as-is
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
let measureAdmin;
let familyReport;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w240-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  measureAdmin = require('../services/measureAdministration.service');
  familyReport = require('../services/measureFamilyReport.service');
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

describe('W240 — pure helpers', () => {
  test('_formatScore: rounds + nulls', () => {
    expect(familyReport._formatScore(42.567)).toBe(42.6);
    expect(familyReport._formatScore(28)).toBe(28);
    expect(familyReport._formatScore(null)).toBe('—');
    expect(familyReport._formatScore(undefined)).toBe('—');
    expect(familyReport._formatScore(NaN)).toBe('—');
    expect(familyReport._formatScore(Infinity)).toBe('—');
  });

  test('_verdictForMeasureRow: MCID achieved → green achievement label', () => {
    const v = familyReport._verdictForMeasureRow({
      mcidAchieved: true,
      trend: 'linear_improvement',
    });
    expect(v.color).toBe('green');
    expect(v.icon).toBe('✓');
    expect(v.label).toMatch(/حقّق طفلك الحد الأدنى/);
  });

  test('_verdictForMeasureRow: trend regression → red verdict', () => {
    const v = familyReport._verdictForMeasureRow({ trend: 'regression' });
    expect(v.color).toBe('red');
    expect(v.icon).toBe('⚠');
  });

  test('_verdictForMeasureRow: insufficient → gray', () => {
    const v = familyReport._verdictForMeasureRow({ trend: 'insufficient_data' });
    expect(v.color).toBe('gray');
  });

  test('_verdictForMeasureRow: unknown trend falls back to insufficient', () => {
    const v = familyReport._verdictForMeasureRow({ trend: 'gibberish' });
    expect(v.color).toBe('gray');
  });

  test('_fallbackMeasureName: reporting.familyFriendlyLabel_ar wins', () => {
    const name = familyReport._fallbackMeasureName(
      { reporting: { familyFriendlyLabel_ar: 'مهارات التوازن' }, name_ar: 'بيرغ' },
      {}
    );
    expect(name).toBe('مهارات التوازن');
  });

  test('_fallbackMeasureName: falls back to name_ar then English then placeholder', () => {
    expect(familyReport._fallbackMeasureName({ name_ar: 'بيرغ' }, {})).toBe('بيرغ');
    expect(familyReport._fallbackMeasureName({ name: 'Berg' }, {})).toBe('Berg');
    expect(familyReport._fallbackMeasureName({}, {})).toBe('هذا المقياس');
  });
});

// ─── Translation table completeness ──────────────────────────────

describe('W240 — translation tables cover every emitted code', () => {
  test('TREND_LABELS_AR has entry for every W219 classification', () => {
    const { CLASSIFICATIONS } = require('../measures/trend/classify');
    for (const code of Object.values(CLASSIFICATIONS)) {
      expect(familyReport.TREND_LABELS_AR[code]).toBeTruthy();
      expect(familyReport.TREND_LABELS_AR[code].label).toBeTruthy();
      expect(familyReport.TREND_LABELS_AR[code].icon).toBeTruthy();
      expect(['green', 'amber', 'red', 'gray']).toContain(familyReport.TREND_LABELS_AR[code].color);
    }
  });

  test('OVERALL_HEADLINES_AR has entry for every W229 overallStatus', () => {
    for (const status of ['progressing', 'mixed', 'concerning', 'insufficient']) {
      expect(familyReport.OVERALL_HEADLINES_AR[status]).toBeTruthy();
      expect(familyReport.OVERALL_HEADLINES_AR[status].headline).toBeTruthy();
    }
  });

  test('ALERT_PARAGRAPHS_AR has entry for every W221 alertType', () => {
    for (const type of ['REGRESSION_DETECTED', 'PLATEAU_DETECTED', 'MCID_NOT_MET']) {
      expect(familyReport.ALERT_PARAGRAPHS_AR[type]).toBeTruthy();
      expect(familyReport.ALERT_PARAGRAPHS_AR[type].length).toBeGreaterThan(20);
    }
  });
});

// ─── Real-DB integration ──────────────────────────────────────────

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
      familyFriendlyLabel_ar: 'مهارات التوازن والمشي',
    },
    ...overrides,
  });
}

async function seedAdmin({ beneficiaryId, measureId, daysAgo, score }) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
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
      source: 'Donoghue 2009',
    },
  });
}

describe('W240 — generate() real-DB integration', () => {
  test('empty beneficiary → insufficient headline + signOff', async () => {
    const benId = new mongoose.Types.ObjectId();
    const r = await familyReport.generate(benId);
    expect(r.overallStatus).toBe('insufficient');
    expect(r.headline).toMatch(/لم نُجرِ بعد ما يكفي/);
    expect(r.measures).toEqual([]);
    expect(r.alertParagraphs).toEqual([]);
    expect(r.signOff).toBeTruthy();
    expect(r.signOff.signatureFields).toHaveLength(2);
    expect(r.reportLanguage).toBe('ar');
  });

  test('linear improvement → MCID flagged, progressing headline', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 20 },
      { d: 90, s: 28 },
      { d: 60, s: 36 },
      { d: 30, s: 44 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await familyReport.generate(benId);
    expect(r.overallStatus).toBe('progressing');
    expect(r.headlineColor).toBe('green');
    expect(r.measures).toHaveLength(1);
    const row = r.measures[0];
    expect(row.mcidAchieved).toBe(true); // 24-point delta > MCID 4
    expect(row.verdictColor).toBe('green');
    expect(row.name_ar).toBe('مهارات التوازن والمشي'); // familyFriendlyLabel wins
    expect(row.baselineScore).toBe(20);
    expect(row.latestScore).toBe(44);
    expect(row.deltaFromBaseline).toBe(24);
    expect(r.narrative).toMatch(/تقدّم/);
  });

  test('regression alert open → concerning headline + REGRESSION paragraph', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 50 },
      { d: 60, s: 30 },
      { d: 30, s: 15 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    await MeasureAlert.create({
      beneficiaryId: benId,
      measureId: measure._id,
      measureCode: 'BERG',
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
      status: 'open',
      evidence: { n: 3 },
    });
    const r = await familyReport.generate(benId);
    expect(r.overallStatus).toBe('concerning');
    expect(r.headlineColor).toBe('red');
    expect(r.alertParagraphs).toHaveLength(1);
    expect(r.alertParagraphs[0].alertType).toBe('REGRESSION_DETECTED');
    expect(r.alertParagraphs[0].text_ar).toMatch(/تراجع|مراجعة/);
  });

  test('showInFamilyReport=false → measure hidden by default', async () => {
    const measure = await makeBerg({
      reporting: { showInFamilyReport: false, familyFriendlyLabel_ar: 'بيرغ' },
    });
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 28 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const hidden = await familyReport.generate(benId);
    expect(hidden.measures).toHaveLength(0);
    const shown = await familyReport.generate(benId, { includeHiddenMeasures: true });
    expect(shown.measures).toHaveLength(1);
  });

  test('no clinical jargon leaks into rendered Arabic output', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 120, s: 20 },
      { d: 90, s: 28 },
      { d: 60, s: 36 },
      { d: 30, s: 44 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await familyReport.generate(benId);
    // Render every text field a family member would read.
    const allText = [
      r.headline,
      r.narrative,
      ...r.measures.map(m => m.name_ar + ' ' + m.verdict_ar),
      ...r.alertParagraphs.map(a => a.text_ar),
    ].join(' ');
    // No statistical or jargon terms.
    expect(allText).not.toMatch(/GMFCS|MCID|SDC|CI95|slope|R²|r2|p<|p>/i);
    expect(allText).not.toMatch(/regression|plateau|oscillation/i); // English clinical
    // Per-measure rows must NOT carry raw clinical fields.
    for (const m of r.measures) {
      expect(m).not.toHaveProperty('trend');
      expect(m).not.toHaveProperty('slopePerMonth');
      expect(m).not.toHaveProperty('r2');
      expect(m).not.toHaveProperty('confidence');
    }
  });

  test('models_unavailable propagates through', async () => {
    // Force the aggregator into the no-models branch by stubbing once.
    const aggregator = require('../services/measureOutcomesAggregator.service');
    const spy = jest
      .spyOn(aggregator, 'aggregateBeneficiary')
      .mockResolvedValueOnce({ error: 'models_unavailable' });
    const r = await familyReport.generate('whatever');
    expect(r.error).toBe('models_unavailable');
    spy.mockRestore();
  });

  test('falls back to name_ar when familyFriendlyLabel_ar missing', async () => {
    const measure = await makeBerg({
      reporting: { showInFamilyReport: true }, // no familyFriendlyLabel_ar
    });
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 28 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await familyReport.generate(benId);
    expect(r.measures[0].name_ar).toBe('مقياس بيرغ للتوازن'); // falls back to name_ar
  });
});
