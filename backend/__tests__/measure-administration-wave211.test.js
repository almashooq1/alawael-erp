'use strict';

/**
 * measure-administration-wave211.test.js — Wave 211.
 *
 * Verifies the administration governance layer above the
 * MeasureApplication model:
 *
 *   1. Baseline uniqueness — at most one baseline per (beneficiary, measure).
 *   2. Locked records reject score-path edits (write a correction instead).
 *   3. Locked status requires version pinning (scoredWithMeasureVersion).
 *   4. correctionOf requires correctionReason.
 *   5. isBaseline + purpose='baseline' must agree.
 *   6. administer() pins version + freezes MCID + records eligibility snapshot.
 *   7. administer() rejects when cooldown active without justification.
 *   8. administer() refuses second baseline.
 *   9. lockBaseline() requires the record to be a baseline.
 *  10. correct() writes a new record + marks original as corrected.
 *  11. correct() refuses when original is not locked.
 *  12. getDueForReassessment() returns overdue items based on cadence.
 *  13. eligibility check refuses ineligible beneficiary (unless allowIneligible).
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w211-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  measureAdmin = require('../services/measureAdministration.service');
  // Force the partial-unique index to finish building before the
  // baseline-uniqueness test runs (MongoMemoryServer builds them async).
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

async function makeMeasure(overrides = {}) {
  return Measure.create({
    code: 'GMFM-66',
    name: 'GMFM-66',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'rasch',
    interpretationStyle: 'continuous',
    scoringAlgorithmRef: 'scoring/gmfm-66.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    reassessment: { standardIntervalDays: 180, minIntervalDays: 90 },
    interpretation: {
      mcid: {
        value: 1.5,
        type: 'absolute',
        status: 'established',
        source: 'Oeffinger 2008',
      },
      sdc: { value: 1.58, ci: 0.95 },
    },
    eligibility: { icd10Required: ['G80.*'] },
    ...overrides,
  });
}

function makeBeneficiary(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    ageMonths: 96, // 8 years
    icd10: ['G80.1'],
    ...overrides,
  };
}

// ─── 1. Baseline uniqueness ────────────────────────────────────────────

describe('W211 — baseline uniqueness', () => {
  test('one baseline per (beneficiary, measure) at the index level', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: measure._id,
      applicationDate: new Date(),
      purpose: 'baseline',
      isBaseline: true,
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
    });
    await expect(
      MeasureApplication.create({
        beneficiaryId: ben._id,
        measureId: measure._id,
        applicationDate: new Date(),
        purpose: 'baseline',
        isBaseline: true,
        assessorId: new mongoose.Types.ObjectId(),
        status: 'completed',
      })
    ).rejects.toThrow();
  });

  test('isBaseline=true requires purpose=baseline', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await expect(
      MeasureApplication.create({
        beneficiaryId: ben._id,
        measureId: measure._id,
        applicationDate: new Date(),
        purpose: 'progress',
        isBaseline: true,
        assessorId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(/isBaseline=true requires purpose='baseline'/);
  });
});

// ─── 2 + 3. Locked immutability + version pinning ──────────────────────

describe('W211 — locked immutability + version pinning', () => {
  test('cannot transition to locked without scoredWithMeasureVersion', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const app = await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: measure._id,
      applicationDate: new Date(),
      purpose: 'baseline',
      isBaseline: true,
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
    });
    app.status = 'locked';
    app.lockedAt = new Date();
    await expect(app.save()).rejects.toThrow(
      /scoredWithMeasureVersion required when status=locked/
    );
  });

  test('locked record rejects score-path edits', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const app = await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: measure._id,
      applicationDate: new Date(),
      purpose: 'baseline',
      isBaseline: true,
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
      totalRawScore: 45,
      scoredWithMeasureVersion: '1.0.0',
    });
    await app.lock(new mongoose.Types.ObjectId());

    // Attempt to overwrite totalRawScore on locked record.
    app.totalRawScore = 50;
    await expect(app.save()).rejects.toThrow(/cannot modify totalRawScore on a locked record/);
  });

  test('locked record allows status transition to corrected', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const app = await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: measure._id,
      applicationDate: new Date(),
      purpose: 'baseline',
      isBaseline: true,
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
      totalRawScore: 45,
      scoredWithMeasureVersion: '1.0.0',
    });
    await app.lock(new mongoose.Types.ObjectId());
    const newId = new mongoose.Types.ObjectId();
    await expect(app.markCorrected(newId)).resolves.toBeTruthy();
    expect(app.status).toBe('corrected');
    expect(app.supersededByCorrection.toString()).toBe(newId.toString());
  });
});

// ─── 4 + 5. correctionOf + isBaseline coherence ────────────────────────

describe('W211 — correctionOf + isBaseline coherence', () => {
  test('correctionOf requires correctionReason', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const original = await MeasureApplication.create({
      beneficiaryId: ben._id,
      measureId: measure._id,
      applicationDate: new Date(),
      purpose: 'baseline',
      isBaseline: true,
      assessorId: new mongoose.Types.ObjectId(),
      status: 'completed',
      scoredWithMeasureVersion: '1.0.0',
    });
    await expect(
      MeasureApplication.create({
        beneficiaryId: ben._id,
        measureId: measure._id,
        applicationDate: new Date(),
        purpose: 'progress',
        assessorId: new mongoose.Types.ObjectId(),
        correctionOf: original._id,
      })
    ).rejects.toThrow(/correctionReason required/);
  });
});

// ─── 6. administer() happy path ────────────────────────────────────────

describe('W211 — administer() happy path', () => {
  test('pins version + freezes MCID + writes eligibility snapshot', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      context: { raterCertifications: [] },
    });
    expect(result.status).toBe('completed');
    expect(result.scoredWithMeasureVersion).toBe('1.0.0');
    expect(result.scoredWithAlgorithmVersion).toBe('1.0.0');
    expect(result.mcidAtAdministration).toBeTruthy();
    expect(result.mcidAtAdministration.value).toBe(1.5);
    expect(result.mcidAtAdministration.source).toMatch(/Oeffinger/);
    expect(result.sdcAtAdministration.value).toBe(1.58);
    expect(result.eligibilitySnapshot).toBeTruthy();
    expect(result.eligibilitySnapshot.icd10Matched).toEqual(['G80.*']);
    expect(result.isBaseline).toBe(true);
  });

  test('does not regress MCID freeze if measure MCID later changes', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'progress',
      totals: { totalRawScore: 50 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    // Now bump the measure's MCID
    measure.interpretation.mcid.value = 9.9;
    await measure.save();
    // Re-read the administration — its frozen MCID is unchanged
    const fresh = await MeasureApplication.findById(result._id).lean();
    expect(fresh.mcidAtAdministration.value).toBe(1.5);
  });
});

// ─── 7. Cooldown enforcement ───────────────────────────────────────────

describe('W211 — cooldown enforcement', () => {
  test('refuses re-admin within minIntervalDays without justification', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'progress',
        totals: { totalRawScore: 46 },
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/Cooldown active/);
  });

  test('allows re-admin with cooldownJustification', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    const result = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'progress',
      totals: { totalRawScore: 50 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      context: {
        cooldownJustification: 'post-botox follow-up at week 6',
        cooldownApprovedBy: new mongoose.Types.ObjectId(),
      },
    });
    expect(result.cooldownJustification).toMatch(/post-botox/);
  });

  test('checkCooldown surfaces remaining days', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    const c = await measureAdmin.checkCooldown(ben._id, measure._id);
    expect(c.inCooldown).toBe(true);
    expect(c.minIntervalDays).toBe(90);
    expect(c.daysRemaining).toBeGreaterThan(0);
  });
});

// ─── 8. Baseline duplicate refusal ─────────────────────────────────────

describe('W211 — administer() refuses second baseline', () => {
  test('throws BASELINE_EXISTS on second baseline attempt', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        totals: { totalRawScore: 47 },
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
        context: { cooldownJustification: 'rescore needed' },
      })
    ).rejects.toThrow(/Baseline already exists/);
  });
});

// ─── 9. lockBaseline() guard ───────────────────────────────────────────

describe('W211 — lockBaseline()', () => {
  test('refuses non-baseline records', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'progress',
      totals: { totalRawScore: 50 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(measureAdmin.lockBaseline(a._id)).rejects.toThrow(/not a baseline/);
  });

  test('locks a baseline successfully', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    const locked = await measureAdmin.lockBaseline(a._id, new mongoose.Types.ObjectId());
    expect(locked.status).toBe('locked');
    expect(locked.lockedAt).toBeTruthy();
  });
});

// ─── 10 + 11. Correction workflow ──────────────────────────────────────

describe('W211 — correct()', () => {
  test('writes new record + marks original as corrected', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await measureAdmin.lockBaseline(a._id, new mongoose.Types.ObjectId());

    const { correction, original } = await measureAdmin.correct(
      a._id,
      { totalRawScore: 48 },
      'transcription error — original scored 48 not 45',
      new mongoose.Types.ObjectId()
    );

    expect(correction.totalRawScore).toBe(48);
    expect(correction.correctionOf.toString()).toBe(a._id.toString());
    expect(correction.correctionReason).toMatch(/transcription/);
    expect(correction.status).toBe('completed');
    expect(original.status).toBe('corrected');
    expect(original.supersededByCorrection.toString()).toBe(correction._id.toString());
  });

  test('refuses correction without reason', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await measureAdmin.lockBaseline(a._id, new mongoose.Types.ObjectId());
    await expect(measureAdmin.correct(a._id, { totalRawScore: 48 }, '')).rejects.toThrow(
      /correctionReason is required/
    );
  });

  test('refuses correction of an unlocked record', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await expect(
      measureAdmin.correct(a._id, { totalRawScore: 48 }, 'reason', new mongoose.Types.ObjectId())
    ).rejects.toThrow(/must be locked before correction/);
  });

  test('refuses double-correction of an already-corrected record', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    await measureAdmin.lockBaseline(a._id, new mongoose.Types.ObjectId());
    await measureAdmin.correct(
      a._id,
      { totalRawScore: 48 },
      'first fix',
      new mongoose.Types.ObjectId()
    );
    await expect(
      measureAdmin.correct(
        a._id,
        { totalRawScore: 49 },
        'second fix',
        new mongoose.Types.ObjectId()
      )
    ).rejects.toThrow(/already been corrected/);
  });
});

// ─── 12. getDueForReassessment ─────────────────────────────────────────

describe('W211 — getDueForReassessment', () => {
  test('returns measure due past standardIntervalDays', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    // Backdate the application to 200 days ago (past the 180-day cadence).
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    const a = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId(), applicationDate: oldDate },
    });
    expect(a.applicationDate).toEqual(oldDate);
    const due = await measureAdmin.getDueForReassessment(ben._id);
    expect(due).toHaveLength(1);
    expect(due[0].measureCode).toBe('GMFM-66');
    expect(due[0].overdueDays).toBeGreaterThan(0);
  });

  test('returns empty when most recent admin is within cadence', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });
    const due = await measureAdmin.getDueForReassessment(ben._id);
    expect(due).toHaveLength(0);
  });
});

// ─── 13. Eligibility refusal ───────────────────────────────────────────

describe('W211 — eligibility gate', () => {
  test('refuses administration when ICD-10 does not match', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary({ icd10: ['F84.0'] }); // autism, not CP
    await expect(
      measureAdmin.administer({
        measureRef: measure._id,
        beneficiary: ben,
        purpose: 'baseline',
        totals: { totalRawScore: 45 },
        adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toMatchObject({ code: 'INELIGIBLE' });
  });

  test('allowIneligible bypasses with a logged warning', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary({ icd10: ['F84.0'] });
    const r = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: ben,
      purpose: 'baseline',
      totals: { totalRawScore: 45 },
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
      allowIneligible: true,
    });
    expect(r.status).toBe('completed');
  });
});
