'use strict';

/**
 * measure-clinical-report-wave245.test.js — Wave 245.
 *
 * Verifies the clinical (full) report generator — third audience layer
 * of the trilogy (W240 family + W242 ministry + W245 clinical).
 *
 *   Pure helpers (no DB):
 *     - _round: precision + null handling
 *     - _evaluateMcidAchievement: direction-aware MCID check
 *       using frozen mcidAtAdministration from latest admin
 *
 *   Real-DB integration:
 *     - Empty beneficiary → shell shape preserved (no measures/alerts/goals)
 *     - Single measure series → full adminHistory with version pinning
 *       preserved, trend block populated, MCID frozen snapshot present,
 *       citations populated
 *     - mcidAchieved direction-aware (lower_better flips delta sign)
 *     - Status=corrected records included when includeCorrections=true
 *       (default), excluded when false
 *     - Alerts surfaced with FULL evidence (not just counts like W229)
 *     - Goals surfaced with detail (status, currentProgress, lastProgressEntry)
 *     - models_unavailable propagates
 *     - Citations list every measure's MCID source (not just rendered text)
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
let clinicalReport;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w245-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  clinicalReport = require('../services/measureClinicalReport.service');
  await MeasureApplication.init();
  await MeasureAlert.init();

  // W245 repair: shared MongoMemoryServer DB can carry data from a
  // previously-run test file in this worker. Scrub the collections we
  // touch before any assertions rely on an empty baseline.
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureAlert.deleteMany({});
  await TherapeuticGoal.deleteMany({});
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

describe('W245 — pure helpers', () => {
  test('_round: precision + null handling', () => {
    expect(clinicalReport._round(3.14159, 2)).toBe(3.14);
    expect(clinicalReport._round(3.14159, 3)).toBe(3.142);
    expect(clinicalReport._round(5)).toBe(5);
    expect(clinicalReport._round(null)).toBeNull();
    expect(clinicalReport._round(NaN)).toBeNull();
    expect(clinicalReport._round(Infinity)).toBeNull();
  });

  test('_evaluateMcidAchievement: returns null on insufficient data', () => {
    expect(clinicalReport._evaluateMcidAchievement([], 'higher_better')).toBeNull();
    expect(
      clinicalReport._evaluateMcidAchievement([{ totalRawScore: 20 }], 'higher_better')
    ).toBeNull();
  });

  test('_evaluateMcidAchievement: returns null when MCID literature_pending', () => {
    const admins = [
      { totalRawScore: 20 },
      { totalRawScore: 30, mcidAtAdministration: { value: 4, status: 'literature_pending' } },
    ];
    expect(clinicalReport._evaluateMcidAchievement(admins, 'higher_better')).toBeNull();
  });

  test('_evaluateMcidAchievement: higher_better — delta >= MCID', () => {
    const admins = [
      { totalRawScore: 20 },
      { totalRawScore: 25, mcidAtAdministration: { value: 4, status: 'established' } },
    ];
    expect(clinicalReport._evaluateMcidAchievement(admins, 'higher_better')).toBe(true);
  });

  test('_evaluateMcidAchievement: higher_better — delta < MCID', () => {
    const admins = [
      { totalRawScore: 20 },
      { totalRawScore: 22, mcidAtAdministration: { value: 4, status: 'established' } },
    ];
    expect(clinicalReport._evaluateMcidAchievement(admins, 'higher_better')).toBe(false);
  });

  test('_evaluateMcidAchievement: lower_better — declining score is improvement', () => {
    const admins = [
      { totalRawScore: 30 },
      { totalRawScore: 22, mcidAtAdministration: { value: 4, status: 'established' } },
    ];
    expect(clinicalReport._evaluateMcidAchievement(admins, 'lower_better')).toBe(true);
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
      sdc: { value: 2, ci: 0.95, source: 'Berg 1995' },
    },
    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel_ar: 'مهارات التوازن',
    },
    ...overrides,
  });
}

async function seedAdmin({
  beneficiaryId,
  measureId,
  daysAgo,
  score,
  status = 'completed',
  isBaseline = false,
  purpose = 'progress',
  correctionOf = null,
}) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId,
    applicationDate: new Date(Date.now() - daysAgo * 86400000),
    purpose,
    isBaseline,
    assessorId: new mongoose.Types.ObjectId(),
    totalRawScore: score,
    status,
    scoredWithMeasureVersion: '1.0.0',
    scoredWithAlgorithmVersion: '1.0.0',
    correctionOf,
    correctionReason: correctionOf ? 'transcription fix' : undefined,
    mcidAtAdministration: {
      value: 4,
      type: 'absolute',
      status: 'established',
      source: 'Donoghue 2009',
    },
  });
}

// ─── Real-DB integration ──────────────────────────────────────────

describe('W245 — generate() real DB', () => {
  test('empty beneficiary → shell shape preserved', async () => {
    const benId = new mongoose.Types.ObjectId();
    const r = await clinicalReport.generate(benId);
    expect(r.reportType).toBe('CLINICAL_DEEP_DIVE');
    expect(r.reportVersion).toBe('1.0.0');
    expect(r.reportLanguage).toBe('ar');
    expect(r.measures).toEqual([]);
    expect(r.alerts).toEqual([]);
    expect(r.goals).toEqual([]);
    expect(r.citations).toEqual([]);
    expect(r.summary.overallStatus).toBe('insufficient');
    expect(r.summary.totalAdmins).toBe(0);
    expect(r.signOff.requiresSignature).toBe(true);
    expect(r.signOff.signatureFields).toHaveLength(2);
  });

  test('improving series → full statistical detail surfaced', async () => {
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
    const r = await clinicalReport.generate(benId);
    expect(r.measures).toHaveLength(1);
    const m = r.measures[0];
    expect(m.measureCode).toBe('BERG');
    expect(m.scoringDirection).toBe('higher_better');
    expect(m.adminCount).toBe(4);
    expect(m.baselineScore).toBe(20);
    expect(m.latestScore).toBe(44);
    expect(m.deltaFromBaseline).toBe(24);
    expect(m.mcidAchieved).toBe(true);
    // FROZEN snapshot from W211b
    expect(m.mcid).toEqual({
      value: 4,
      type: 'absolute',
      status: 'established',
      source: 'Donoghue 2009',
    });
    expect(m.sdc).toEqual({ value: 2, ci: 0.95, source: 'Berg 1995' });
    // Trend block populated (NOT hidden like family report)
    expect(m.trend).toBeTruthy();
    expect(m.trend.classification).toBeTruthy();
    expect(m.trend.slopePerMonth).not.toBeNull();
    expect(m.trend.r2).not.toBeNull();
    expect(m.trend.n).toBe(4);
    // Full adminHistory with version pinning
    expect(m.adminHistory).toHaveLength(4);
    expect(m.adminHistory[0].scoredWithMeasureVersion).toBe('1.0.0');
    expect(m.adminHistory[0].scoredWithAlgorithmVersion).toBe('1.0.0');
  });

  test('citations populated for measures with MCID source', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 30 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await clinicalReport.generate(benId);
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0]).toEqual({
      measureCode: 'BERG',
      mcidSource: 'Donoghue 2009',
      sdcSource: 'Berg 1995',
    });
  });

  test('lower_better measure: MCID check direction-flipped', async () => {
    const measure = await makeBerg({
      code: 'PAIN-INV',
      scoringDirection: 'lower_better',
    });
    const benId = new mongoose.Types.ObjectId();
    // 30 → 22 = 8-point drop, > MCID 4 under lower_better → achieved
    for (const item of [
      { d: 90, s: 30 },
      { d: 60, s: 26 },
      { d: 30, s: 22 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    const r = await clinicalReport.generate(benId);
    const m = r.measures[0];
    expect(m.scoringDirection).toBe('lower_better');
    expect(m.mcidAchieved).toBe(true);
  });

  // The W211b correct() workflow transfers the baseline title: original
  // gets isBaseline=false, correction gets isBaseline=true. The partial
  // unique index on (benId, measureId, isBaseline=true) enforces this.
  // These fixtures mirror that — non-baseline corrected records suffice
  // to exercise the includeCorrections gate.
  test('includeCorrections=true (default): superseded records in history', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const original = await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 90,
      score: 20,
      status: 'corrected', // superseded by the correction record below
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 89,
      score: 22,
      correctionOf: original._id,
    });
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 60, score: 30 });
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 30, score: 40 });

    const r = await clinicalReport.generate(benId, { includeCorrections: true });
    const m = r.measures[0];
    expect(m.adminHistory).toHaveLength(4);
    expect(m.adminHistory.some(a => a.status === 'corrected')).toBe(true);
    // Authoritative count (totalAdmins) excludes 'corrected'
    expect(r.summary.totalAdmins).toBe(3);
  });

  test('includeCorrections=false: superseded records dropped', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    const original = await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 90,
      score: 20,
      status: 'corrected',
    });
    await seedAdmin({
      beneficiaryId: benId,
      measureId: measure._id,
      daysAgo: 89,
      score: 22,
      correctionOf: original._id,
    });
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 60, score: 30 });
    await seedAdmin({ beneficiaryId: benId, measureId: measure._id, daysAgo: 30, score: 40 });

    const r = await clinicalReport.generate(benId, { includeCorrections: false });
    const m = r.measures[0];
    expect(m.adminHistory.some(a => a.status === 'corrected')).toBe(false);
    expect(m.adminHistory).toHaveLength(3);
  });

  test('alerts surfaced with FULL evidence', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 30 },
      { d: 30, s: 40 },
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
      alertType: 'PLATEAU_DETECTED',
      severity: 'medium',
      status: 'open',
      evidence: { n: 4, spanDays: 120, slopePerMonth: 0.1, message_ar: 'ثبات' },
    });
    const r = await clinicalReport.generate(benId);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0].alertType).toBe('PLATEAU_DETECTED');
    expect(r.alerts[0].evidence).toBeTruthy();
    expect(r.alerts[0].evidence.message_ar).toBe('ثبات'); // Full evidence — not just counts
    expect(r.alerts[0].evidence.slopePerMonth).toBe(0.1);
    expect(r.summary.alertsOpen).toBe(1);
  });

  test('goals surfaced with detail (status + lastProgressEntry)', async () => {
    const measure = await makeBerg();
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 30 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benId,
        measureId: measure._id,
        daysAgo: item.d,
        score: item.s,
      });
    }
    await TherapeuticGoal.create({
      beneficiaryId: benId,
      episodeId: new mongoose.Types.ObjectId(),
      title: 'Improve balance',
      title_ar: 'تحسين التوازن',
      type: 'short_term',
      startDate: new Date(),
      target: { value: 50 },
      baseline: { value: 20 },
      status: 'active',
      currentProgress: 67,
      progressHistory: [
        { date: new Date('2026-04-01'), value: 30, rating: 'developing' },
        { date: new Date('2026-05-01'), value: 40, rating: 'developing' },
      ],
    });
    const r = await clinicalReport.generate(benId);
    expect(r.goals).toHaveLength(1);
    const g = r.goals[0];
    expect(g.title_ar).toBe('تحسين التوازن');
    expect(g.currentProgress).toBe(67);
    expect(g.lastProgressEntry).toEqual({
      date: new Date('2026-05-01'),
      value: 40,
      rating: 'developing',
    });
  });

  test('models_unavailable propagates from aggregator', async () => {
    const aggregator = require('../services/measureOutcomesAggregator.service');
    const spy = jest
      .spyOn(aggregator, 'aggregateBeneficiary')
      .mockResolvedValueOnce({ error: 'models_unavailable' });
    const r = await clinicalReport.generate('abc');
    expect(r.error).toBe('models_unavailable');
    spy.mockRestore();
  });

  test('summary counts: totalAdmins distinct from adminHistory length', async () => {
    // adminHistory may include corrected; totalAdmins counts only authoritative
    const m1 = await makeBerg();
    const m2 = await makeBerg({ code: 'FIM', name_ar: 'مقياس FIM' });
    const benId = new mongoose.Types.ObjectId();
    for (const item of [
      { d: 90, s: 20 },
      { d: 60, s: 30 },
      { d: 30, s: 40 },
    ]) {
      await seedAdmin({ beneficiaryId: benId, measureId: m1._id, daysAgo: item.d, score: item.s });
      await seedAdmin({ beneficiaryId: benId, measureId: m2._id, daysAgo: item.d, score: item.s });
    }
    const r = await clinicalReport.generate(benId);
    expect(r.summary.distinctMeasures).toBe(2);
    expect(r.summary.totalAdmins).toBe(6);
  });
});
