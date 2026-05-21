'use strict';

/**
 * measure-ministry-comparison-wave250.test.js — Wave 250.
 *
 * Verifies the cross-branch ministry comparison service that wraps
 * W242 in parallel and produces an org-level + leaderboard view.
 *
 *   Pure helpers (no DB):
 *     - _rankByDesc: sorts descending + assigns ranks
 *     - _rankByAsc:  sorts ascending + assigns ranks
 *     - _orgTotals:  sums across reporting branches, computes rates
 *                    correctly, counts errored separately
 *     - Both ranking functions exclude branches with .error
 *
 *   Real-DB integration:
 *     - Validates branchIds[] required
 *     - Validates year + month via W242 (single source of truth)
 *     - Empty branches list rejected
 *     - Single-branch comparison still works (degenerate case)
 *     - Multi-branch returns row per branch
 *     - Leaderboard sorts MCID rate descending
 *     - Leaderboard sorts alerts ascending (fewer = better)
 *     - Errored branch surfaces with .error, doesn't break others
 *     - organizationTotals aggregate matches sum across reporting
 *     - Period framing populated correctly
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
let comparison;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w250-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  comparison = require('../services/measureMinistryComparison.service');
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

describe('W250 — pure helpers', () => {
  test('_rankByDesc: sorts descending + ranks', () => {
    const rows = [
      { branchId: 'a', branchName_ar: 'أ', outcomes: { mcidAchievementRate: 0.2 } },
      { branchId: 'b', branchName_ar: 'ب', outcomes: { mcidAchievementRate: 0.8 } },
      { branchId: 'c', branchName_ar: 'ج', outcomes: { mcidAchievementRate: 0.5 } },
    ];
    const r = comparison._rankByDesc(rows, b => b.outcomes.mcidAchievementRate);
    expect(r).toEqual([
      { rank: 1, branchId: 'b', branchName_ar: 'ب', value: 0.8 },
      { rank: 2, branchId: 'c', branchName_ar: 'ج', value: 0.5 },
      { rank: 3, branchId: 'a', branchName_ar: 'أ', value: 0.2 },
    ]);
  });

  test('_rankByAsc: sorts ascending + ranks', () => {
    const rows = [
      { branchId: 'a', branchName_ar: 'أ', alerts: { total: 10 } },
      { branchId: 'b', branchName_ar: 'ب', alerts: { total: 2 } },
      { branchId: 'c', branchName_ar: 'ج', alerts: { total: 5 } },
    ];
    const r = comparison._rankByAsc(rows, b => b.alerts.total);
    expect(r[0].branchId).toBe('b');
    expect(r[0].rank).toBe(1);
    expect(r[2].branchId).toBe('a');
  });

  test('both rank fns exclude branches with .error', () => {
    const rows = [
      { branchId: 'a', outcomes: { mcidAchievementRate: 0.5 } },
      { branchId: 'b', error: 'models_unavailable' },
    ];
    expect(comparison._rankByDesc(rows, b => b.outcomes?.mcidAchievementRate || 0)).toHaveLength(1);
    expect(comparison._rankByAsc(rows, b => b.alerts?.total || 0)).toHaveLength(1);
  });

  test('_orgTotals: sums + rate math correct', () => {
    const branches = [
      {
        branchId: 'a',
        beneficiaries: { administeredInMonth: 5 },
        administrations: { total: 12 },
        outcomes: { pairsAnalysed: 4, mcidAchievedCount: 2 },
        alerts: { total: 3 },
        goals: { total: 10, achieved: 4 },
      },
      {
        branchId: 'b',
        beneficiaries: { administeredInMonth: 8 },
        administrations: { total: 20 },
        outcomes: { pairsAnalysed: 6, mcidAchievedCount: 3 },
        alerts: { total: 1 },
        goals: { total: 15, achieved: 9 },
      },
    ];
    const t = comparison._orgTotals(branches);
    expect(t.beneficiariesWithAdmin).toBe(13);
    expect(t.administrationsTotal).toBe(32);
    expect(t.pairsAnalysed).toBe(10);
    expect(t.mcidAchievedCount).toBe(5);
    expect(t.mcidAchievementRate).toBe(0.5);
    expect(t.alertsTotal).toBe(4);
    expect(t.goalsAchieved).toBe(13);
    expect(t.goalsAchievedRate).toBe(0.52); // 13/25
    expect(t.branchesReporting).toBe(2);
    expect(t.branchesErrored).toBe(0);
  });

  test('_orgTotals: counts errored branches separately, excludes from sums', () => {
    const branches = [
      {
        branchId: 'a',
        beneficiaries: { administeredInMonth: 5 },
        outcomes: { pairsAnalysed: 4, mcidAchievedCount: 2 },
        alerts: { total: 3 },
        goals: { total: 10, achieved: 4 },
      },
      { branchId: 'b', error: 'models_unavailable' },
    ];
    const t = comparison._orgTotals(branches);
    expect(t.branchesReporting).toBe(1);
    expect(t.branchesErrored).toBe(1);
    expect(t.beneficiariesWithAdmin).toBe(5); // b excluded
    expect(t.alertsTotal).toBe(3);
  });

  test('_orgTotals: zero pairs → rate = 0, no divide by zero', () => {
    const t = comparison._orgTotals([{ branchId: 'a', outcomes: {}, goals: {} }]);
    expect(t.mcidAchievementRate).toBe(0);
    expect(t.goalsAchievedRate).toBe(0);
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

describe('W250 — compareBranches() validation', () => {
  test('rejects missing branchIds', async () => {
    await expect(comparison.compareBranches({ year: 2026, month: 5 })).rejects.toThrow(/branchIds/);
  });

  test('rejects empty branchIds array', async () => {
    await expect(
      comparison.compareBranches({ branchIds: [], year: 2026, month: 5 })
    ).rejects.toThrow(/branchIds/);
  });

  test('rejects bad year', async () => {
    await expect(
      comparison.compareBranches({
        branchIds: [new mongoose.Types.ObjectId()],
        year: 1800,
        month: 5,
      })
    ).rejects.toThrow(/year/);
  });

  test('rejects bad month', async () => {
    await expect(
      comparison.compareBranches({
        branchIds: [new mongoose.Types.ObjectId()],
        year: 2026,
        month: 15,
      })
    ).rejects.toThrow(/month/);
  });
});

describe('W250 — compareBranches() single-branch degenerate', () => {
  test('one empty branch → report w/ 1 row, zero totals, leaderboards length 1', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const r = await comparison.compareBranches({
      branchIds: [branchId],
      year: 2026,
      month: 5,
    });
    expect(r.reportType).toBe('MOHRSD_MONTHLY_COMPARISON');
    expect(r.period.year).toBe(2026);
    expect(r.period.month).toBe(5);
    expect(r.period.monthName_ar).toBe('مايو');
    expect(r.branches).toHaveLength(1);
    expect(r.branches[0].error).toBeUndefined();
    expect(r.organizationTotals.branchesReporting).toBe(1);
    expect(r.organizationTotals.administrationsTotal).toBe(0);
    expect(r.leaderboard.byMcidRate).toHaveLength(1);
    expect(r.signOff.signatureFields).toHaveLength(2);
  });
});

describe('W250 — compareBranches() multi-branch', () => {
  test('two branches: leaderboards order correctly', async () => {
    const measure = await makeBerg();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();

    // Branch A: MCID achieved (20→24→40, delta=20 > 4)
    for (const item of [
      { d: 5, s: 20 },
      { d: 15, s: 24 },
      { d: 25, s: 40 },
    ]) {
      await seedAdmin({
        beneficiaryId: benA,
        measureId: measure._id,
        branchId: branchA,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }
    // Branch B: MCID NOT achieved (30→32→33, delta=3 < 4)
    for (const item of [
      { d: 5, s: 30 },
      { d: 15, s: 32 },
      { d: 25, s: 33 },
    ]) {
      await seedAdmin({
        beneficiaryId: benB,
        measureId: measure._id,
        branchId: branchB,
        atDate: new Date(`2026-05-${String(item.d).padStart(2, '0')}`),
        score: item.s,
      });
    }

    const r = await comparison.compareBranches({
      branchIds: [branchA, branchB],
      year: 2026,
      month: 5,
    });
    expect(r.branches).toHaveLength(2);
    // A: 1 pair, 1 mcid achieved → rate 1.0
    // B: 1 pair, 0 mcid achieved → rate 0.0
    const a = r.branches.find(b => b.branchId === String(branchA));
    const b = r.branches.find(b => b.branchId === String(branchB));
    expect(a.outcomes.mcidAchievementRate).toBe(1);
    expect(b.outcomes.mcidAchievementRate).toBe(0);
    // Leaderboard: A ranks #1 by MCID rate
    expect(r.leaderboard.byMcidRate[0].branchId).toBe(String(branchA));
    expect(r.leaderboard.byMcidRate[0].rate).toBe(1);
    expect(r.leaderboard.byMcidRate[0].pairsAnalysed).toBe(1);
    // Organization totals: 2 pairs, 1 mcid → org rate 0.5
    expect(r.organizationTotals.pairsAnalysed).toBe(2);
    expect(r.organizationTotals.mcidAchievedCount).toBe(1);
    expect(r.organizationTotals.mcidAchievementRate).toBe(0.5);
  });

  test('alerts leaderboard sorts ASCENDING (fewer alerts = better rank)', async () => {
    const measure = await makeBerg();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();

    // Branch A: 2 open alerts
    await MeasureAlert.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      measureCode: 'BERG',
      branchId: branchA,
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
      status: 'open',
      evidence: { n: 4 },
    });
    await MeasureAlert.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      measureId: measure._id,
      measureCode: 'BERG',
      branchId: branchA,
      alertType: 'PLATEAU_DETECTED',
      severity: 'medium',
      status: 'open',
      evidence: { n: 4 },
    });
    // Branch B: 0 open alerts (better)
    const r = await comparison.compareBranches({
      branchIds: [branchA, branchB],
      year: 2026,
      month: 5,
    });
    expect(r.leaderboard.byActiveAlerts[0].branchId).toBe(String(branchB));
    expect(r.leaderboard.byActiveAlerts[0].alerts).toBe(0);
    expect(r.leaderboard.byActiveAlerts[1].branchId).toBe(String(branchA));
    expect(r.leaderboard.byActiveAlerts[1].alerts).toBe(2);
  });

  test('errored branch surfaces with .error, others keep reporting', async () => {
    const ministry = require('../services/measureMinistryReport.service');
    const branchOK = new mongoose.Types.ObjectId();
    const branchFail = new mongoose.Types.ObjectId();

    // Fully stub W242 — return canned OK shape for one branch, throw
    // for the other. Avoids the call-through complexity.
    const spy = jest.spyOn(ministry, 'generate').mockImplementation(async branchId => {
      if (String(branchId) === String(branchFail)) {
        throw new Error('synthetic failure');
      }
      return {
        branchId: String(branchId),
        branchName: null,
        branchName_ar: null,
        period: { year: 2026, month: 5, monthName_ar: 'مايو', from: null, to: null },
        beneficiaries: { administeredInMonth: 0 },
        administrations: { total: 0, byPurpose: {} },
        outcomes: {
          pairsAnalysed: 0,
          pairsThinHistory: 0,
          mcidAchievedCount: 0,
          mcidAchievementRate: 0,
        },
        goals: { total: 0, active: 0, achieved: 0, achievedRate: 0 },
        alerts: { total: 0, regression: 0, plateau: 0, mcidNotMet: 0 },
        perMeasureMinistryRollup: [],
      };
    });

    try {
      const r = await comparison.compareBranches({
        branchIds: [branchOK, branchFail],
        year: 2026,
        month: 5,
      });
      const failRow = r.branches.find(b => b.branchId === String(branchFail));
      expect(failRow.error).toBeTruthy();
      const okRow = r.branches.find(b => b.branchId === String(branchOK));
      expect(okRow.error).toBeUndefined();
      // Leaderboard excludes errored
      expect(r.leaderboard.byMcidRate.find(x => x.branchId === String(branchFail))).toBeUndefined();
      expect(r.organizationTotals.branchesErrored).toBe(1);
      expect(r.organizationTotals.branchesReporting).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });
});
