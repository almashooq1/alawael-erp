'use strict';

/**
 * measure-administer-scoring-wave215.test.js — Wave 215.
 *
 * Verifies the W215 wire between MeasureAdministrationService.administer()
 * and the W212 scoring registry:
 *
 *   1. rawItems provided + module registered → auto-scoring populates
 *      totalRawScore, overallInterpretation, severity, matchedRule,
 *      comparison block (delta vs latest prior admin).
 *
 *   2. rawItems provided but no scoring module → falls back to caller-
 *      supplied totals (legacy path stays alive).
 *
 *   3. caller-supplied totals are filled-under engine output when both
 *      coexist (engine wins; legacy fields plug gaps).
 *
 *   4. prevDerived auto-fetched from latest prior admin → delta block
 *      carries previousScore + changeFromPrevious + isClinicallySignificant
 *      (based on the measure's frozen MCID).
 *
 *   5. dryRun=true validates everything but does NOT persist (no DB row
 *      created). Returns { dryRun: true, scoring, wouldPersist }.
 *
 *   6. previewScore() exposes the engine envelope without going through
 *      administer() at all. Eligibility issues are informational, not
 *      blocking.
 *
 *   7. INVALID_RAW from the engine surfaces as code='INVALID_RAW' on the
 *      caller (preserves the W212 structured error contract).
 *
 *   8. The W211b governance contracts are still enforced when scoring
 *      happens: locked baselines reject further administration (cooldown
 *      still fires), version pinning still captures measure.version.
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
let measureAdmin;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w215-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  measureAdmin = require('../services/measureAdministration.service');
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

// ─── Fixtures ──────────────────────────────────────────────────────────

async function makeBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg Balance Scale',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
      sdc: { value: 2, ci: 0.95 },
    },
    ...overrides,
  });
}

async function makeUnscoredMeasure(overrides = {}) {
  return Measure.create({
    code: 'CUSTOM-X',
    name: 'Custom unscored measure',
    category: 'developmental',
    version: '1.0.0',
    purpose: 'screening',
    status: 'active',
    ...overrides,
  });
}

function makeBeneficiary(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    ageMonths: 96,
    icd10: ['G80.1'],
    ...overrides,
  };
}

function bergItems(perItem = 3) {
  return Array(14).fill(perItem);
}

// ─── 1. Auto-scoring populates fields ──────────────────────────────────

describe('W215 — auto-scoring populates the record', () => {
  test('rawItems → totalRawScore + interpretation + matchedRule', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(2), // 14 * 2 = 28 → moderate_fall_risk (21-40)
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    expect(result.totalRawScore).toBe(28);
    expect(result.overallSeverity).toBe('moderate');
    expect(result.matchedRule).toBeTruthy();
    expect(result.matchedRule.rangeLabel).toBe('moderate_fall_risk');
    expect(result.overallInterpretation_ar).toMatch(/متوسط/);
    // The envelope is attached for caller convenience but not persisted.
    expect(result._scoring).toBeTruthy();
    expect(result._scoring.measureCode).toBe('BERG');
  });
});

// ─── 2. No module → legacy fallback ────────────────────────────────────

describe('W215 — falls back to caller-supplied totals when no module', () => {
  test('unscored measure + rawItems → legacy totals path still works', async () => {
    const measure = await makeUnscoredMeasure();
    const ben = makeBeneficiary({ icd10: [] });
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: [1, 2, 3], // would-be raw — but no module → ignored
      totals: { totalRawScore: 50, overallSeverity: 'mild' },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    expect(result.totalRawScore).toBe(50);
    expect(result.overallSeverity).toBe('mild');
    expect(result._scoring).toBeUndefined();
  });
});

// ─── 3. Engine output wins, legacy fills gaps ──────────────────────────

describe('W215 — engine output wins over caller totals', () => {
  test('engine totalRawScore overrides caller; engine notes filled', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(4), // perfect → 56 → low_fall_risk
      totals: {
        totalRawScore: 999, // would be wrong — engine should overrule
        ageEquivalent: 84, // gap-filler — engine doesn't produce this
      },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    expect(result.totalRawScore).toBe(56);
    expect(result.overallSeverity).toBe('normal');
    // Caller-supplied gap-filler survived.
    expect(result.ageEquivalent).toBe(84);
  });
});

// ─── 4. prevDerived auto-fetched → delta block populated ───────────────

describe('W215 — prevDerived auto-fetched from history', () => {
  test('delta vs prior baseline carries MCID assessment', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    // Baseline: sum = 14*2 = 28
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(2),
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        applicationDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      },
    });
    // Follow-up: sum = 14*3 = 42 → delta = +14, MCID=4 ≤ 14 ⇒ met
    const followUp = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'progress',
      rawItems: bergItems(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    expect(followUp.comparison).toBeTruthy();
    expect(followUp.comparison.previousScore).toBe(28);
    expect(followUp.comparison.changeFromPrevious).toBe(14);
    expect(followUp.comparison.isClinicallySignificant).toBe(true);
    expect(followUp.comparison.trend).toBe('improving');
  });

  test('no prior admin → delta block omitted, no clinical significance claim', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    // No previous → no comparison block (or it's undefined).
    // The engine still returns delta=null because prevDerived is null.
    expect(result.comparison?.changeFromPrevious).toBeUndefined();
  });
});

// ─── 5. dryRun does not persist ────────────────────────────────────────

describe('W215 — dryRun mode', () => {
  test('returns scoring envelope + wouldPersist without writing', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const before = await MeasureApplication.countDocuments();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(2), // 28 → moderate
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.scoring).toBeTruthy();
    expect(result.scoring.derived.value).toBe(28);
    expect(result.wouldPersist.totalRawScore).toBe(28);
    expect(result.wouldPersist.overallSeverity).toBe('moderate');
    const after = await MeasureApplication.countDocuments();
    expect(after).toBe(before);
  });

  test('dryRun surfaces validation errors before silently passing', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    // Force a Mongoose validation error by omitting required assessorId.
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        rawItems: bergItems(3),
        adminDetails: {},
        dryRun: true,
      })
    ).rejects.toThrow(/assessorId/i);
  });
});

// ─── 6. previewScore() ──────────────────────────────────────────────────

describe('W215 — previewScore()', () => {
  test('returns envelope + totals + prevDerived without persisting', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const before = await MeasureApplication.countDocuments();
    const result = await measureAdmin.previewScore({
      measureRef: measure._id,
      beneficiary: ben,
      rawItems: bergItems(2), // 28 → moderate
    });
    expect(result.measureCode).toBe('BERG');
    expect(result.scoring.derived.value).toBe(28);
    expect(result.totals.overallSeverity).toBe('moderate');
    expect(result.eligibilityNote).toBeNull(); // beneficiary G80.1 — no eligibility block on BERG
    const after = await MeasureApplication.countDocuments();
    expect(after).toBe(before);
  });

  test('eligibilityNote populated but not blocking', async () => {
    const measure = await makeBerg({ eligibility: { icd10Required: ['G80.*'] } });
    const ben = makeBeneficiary({ icd10: ['F84.0'] }); // mismatch
    const result = await measureAdmin.previewScore({
      measureRef: measure._id,
      beneficiary: ben,
      rawItems: bergItems(3),
    });
    expect(result.eligibilityNote).toBeTruthy();
    expect(result.eligibilityNote.eligible).toBe(false);
    expect(result.eligibilityNote.reason).toMatch(/icd10/);
    // But scoring still ran:
    expect(result.scoring.derived.value).toBe(42);
  });

  test('refuses when measure has no scoring module', async () => {
    const measure = await makeUnscoredMeasure();
    const ben = makeBeneficiary({ icd10: [] });
    await expect(
      measureAdmin.previewScore({
        measureRef: measure._id,
        beneficiary: ben,
        rawItems: [1, 2, 3],
      })
    ).rejects.toThrow(/no scoring module/);
  });

  test('refuses without rawItems', async () => {
    await expect(measureAdmin.previewScore({ measureRef: 'BERG' })).rejects.toThrow(
      /rawItems array is required/
    );
  });
});

// ─── 7. INVALID_RAW preserved through administer() ─────────────────────

describe('W215 — INVALID_RAW error surfaces correctly', () => {
  test('engine validation failures bubble up with code=INVALID_RAW', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        rawItems: [1, 2, 3], // wrong length — Berg expects 14
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toMatchObject({ code: 'INVALID_RAW' });
  });
});

// ─── 8. W211b governance still applies ────────────────────────────────

describe('W215 — W211b governance preserved under auto-scoring', () => {
  test('version pinning still captures measure.scoringEngineVersion', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    expect(result.scoredWithMeasureVersion).toBe('1.0.0');
    expect(result.scoredWithAlgorithmVersion).toBe('1.0.0');
    expect(result.mcidAtAdministration).toBeTruthy();
    expect(result.mcidAtAdministration.value).toBe(4);
  });

  test('cooldown still blocks rapid re-administration', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(2),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'progress',
        rawItems: bergItems(3),
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/Cooldown active/);
  });

  test('ineligible beneficiary still refuses (rawItems do not bypass)', async () => {
    const measure = await makeBerg({ eligibility: { icd10Required: ['G80.*'] } });
    const ben = makeBeneficiary({ icd10: ['F84.0'] });
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        rawItems: bergItems(3),
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toMatchObject({ code: 'INELIGIBLE' });
  });

  test('baseline uniqueness invariant survives auto-scoring path', async () => {
    const measure = await makeBerg();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      rawItems: bergItems(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        rawItems: bergItems(4),
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
        context: { cooldownJustification: 'override' },
      })
    ).rejects.toThrow(/Baseline already exists/);
  });
});
