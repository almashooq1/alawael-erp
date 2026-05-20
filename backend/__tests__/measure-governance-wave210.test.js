'use strict';

/**
 * measure-governance-wave210.test.js — Wave 210.
 *
 * Verifies the governance layer added to the Measure model:
 *
 *   1. SemVer enforcement on `version` + `scoringEngineVersion`.
 *   2. Outcome-class measures must declare `derivedType` +
 *      `interpretationStyle` (the SCQ/W206b silent-fallback regression
 *      class — without this guard, a missing scoring type silently
 *      degraded into band-index lookup with wrong tier assignments).
 *   3. MCID with a value AND status=established/provisional MUST have
 *      a source citation (prevents invented MCID).
 *   4. ICD-10 pattern validation accepts G80, G80.1, G80.*; rejects junk.
 *   5. Reassessment interval coherence (min ≤ standard ≤ max).
 *   6. supersededBy only allowed when status is deprecated/retired.
 *   7. effectiveUntil > effectiveFrom.
 *   8. Lifecycle methods: publish() / deprecate() / retire() — and the
 *      illegal transitions throw.
 *   9. isEligibleFor() checks ICD-10, prerequisite measures, certification.
 *  10. MeasureRevision is written on publish/deprecate/retire.
 *  11. MeasureRevision is append-only — updateOne/findOneAndUpdate rejected.
 *
 * Uses real Mongoose (jest.unmock) against an in-memory connection-less
 * context for sync validation; for hooks that need a DB connection
 * (Measure.save and the post-save audit write) we use MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureRevision;

beforeAll(async () => {
  // Prefer the URI from jest.globalSetup.js when available so we share
  // the single MongoMemoryServer across the suite. Fall back to spinning
  // up a private instance if not (covers `jest <pattern>` runs).
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w210-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureRevision } = require('../domains/goals/models/MeasureRevision'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// Make each test independent by clearing the two collections we touch.
beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureRevision.deleteMany({});
});

function baseMeasure(overrides = {}) {
  return {
    code: 'TEST-M',
    name: 'Test Measure',
    name_ar: 'مقياس اختبار',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'continuous',
    scoringAlgorithmRef: 'scoring/test.js',
    status: 'active',
    ...overrides,
  };
}

// ─── 1. SemVer enforcement ──────────────────────────────────────────────

describe('W210 — SemVer enforcement', () => {
  test('accepts valid SemVer version', async () => {
    const m = new Measure(baseMeasure({ version: '2.3.1' }));
    const err = m.validateSync();
    expect(err && err.errors.version).toBeFalsy();
  });

  test('rejects non-SemVer version string', async () => {
    const m = new Measure(baseMeasure({ version: '2.3' }));
    const err = m.validateSync();
    expect(err).toBeTruthy();
    expect(err.errors.version).toBeTruthy();
    expect(err.errors.version.message).toMatch(/SemVer/);
  });

  test('rejects non-SemVer scoringEngineVersion', async () => {
    const m = new Measure(baseMeasure({ scoringEngineVersion: 'v1' }));
    const err = m.validateSync();
    expect(err).toBeTruthy();
    expect(err.errors.scoringEngineVersion).toBeTruthy();
  });
});

// ─── 2. Outcome derivedType guard (the SCQ/W206b fix) ──────────────────

describe('W210 — outcome derivedType invariant (SCQ/W206b fix)', () => {
  test('outcome measure WITH derivedType + interpretationStyle saves', async () => {
    const m = new Measure(baseMeasure());
    await expect(m.save()).resolves.toBeTruthy();
  });

  test('outcome measure WITHOUT derivedType is rejected', async () => {
    const m = new Measure(baseMeasure({ derivedType: undefined }));
    await expect(m.save()).rejects.toThrow(/derivedType required/);
  });

  test('outcome measure WITHOUT interpretationStyle is rejected', async () => {
    const m = new Measure(baseMeasure({ interpretationStyle: undefined }));
    await expect(m.save()).rejects.toThrow(/interpretationStyle required/);
  });

  test('functional_status measure also requires derivedType', async () => {
    const m = new Measure(
      baseMeasure({
        purpose: 'functional_status',
        derivedType: undefined,
      })
    );
    await expect(m.save()).rejects.toThrow(/derivedType required/);
  });

  test('screening measure does NOT require derivedType (allowed missing)', async () => {
    const m = new Measure(
      baseMeasure({
        code: 'SCREEN-X',
        purpose: 'screening',
        derivedType: undefined,
        interpretationStyle: undefined,
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });
});

// ─── 3. MCID source citation ───────────────────────────────────────────

describe('W210 — MCID source citation guard', () => {
  test('MCID established WITH source saves', async () => {
    const m = new Measure(
      baseMeasure({
        interpretation: {
          mcid: {
            value: 1.5,
            type: 'absolute',
            status: 'established',
            source: 'Oeffinger et al. 2008',
          },
        },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });

  test('MCID established WITHOUT source is rejected', async () => {
    const m = new Measure(
      baseMeasure({
        interpretation: {
          mcid: {
            value: 1.5,
            type: 'absolute',
            status: 'established',
          },
        },
      })
    );
    await expect(m.save()).rejects.toThrow(/source citation required/);
  });

  test('MCID literature_pending without source is allowed (no claim)', async () => {
    const m = new Measure(
      baseMeasure({
        interpretation: { mcid: { status: 'literature_pending' } },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });

  test('MCID not_applicable without source is allowed', async () => {
    const m = new Measure(
      baseMeasure({
        interpretation: { mcid: { status: 'not_applicable' } },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });
});

// ─── 4. ICD-10 pattern validation ──────────────────────────────────────

describe('W210 — ICD-10 pattern validation', () => {
  test.each([
    ['G80', true],
    ['G80.1', true],
    ['G80.*', true],
    ['F84', true],
    ['Z99.9', true],
  ])('accepts %s', async (code, _ok) => {
    const m = new Measure(
      baseMeasure({
        eligibility: { icd10Required: [code] },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });

  test.each([['INVALID'], ['G'], ['80.1'], ['G80.1.2.3']])('rejects %s', async code => {
    const m = new Measure(
      baseMeasure({
        eligibility: { icd10Required: [code] },
      })
    );
    await expect(m.save()).rejects.toThrow(/invalid ICD-10/);
  });
});

// ─── 5. Reassessment coherence ─────────────────────────────────────────

describe('W210 — reassessment interval coherence', () => {
  test('valid min ≤ standard ≤ max saves', async () => {
    const m = new Measure(
      baseMeasure({
        reassessment: { minIntervalDays: 30, standardIntervalDays: 90, maxIntervalDays: 180 },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });

  test('min > standard is rejected', async () => {
    const m = new Measure(
      baseMeasure({
        reassessment: { minIntervalDays: 200, standardIntervalDays: 90 },
      })
    );
    await expect(m.save()).rejects.toThrow(/minIntervalDays > standardIntervalDays/);
  });

  test('max < standard is rejected', async () => {
    const m = new Measure(
      baseMeasure({
        reassessment: { maxIntervalDays: 30, standardIntervalDays: 90 },
      })
    );
    await expect(m.save()).rejects.toThrow(/maxIntervalDays < standardIntervalDays/);
  });
});

// ─── 6 + 7. supersededBy + effectiveFrom/Until ────────────────────────

describe('W210 — supersededBy + effective dates', () => {
  test('supersededBy set on active measure is rejected', async () => {
    const m = new Measure(
      baseMeasure({
        supersededBy: { measureCode: 'OTHER', version: '2.0.0' },
      })
    );
    await expect(m.save()).rejects.toThrow(
      /supersededBy may only be set when status is deprecated/
    );
  });

  test('supersededBy on deprecated measure is allowed', async () => {
    const m = new Measure(
      baseMeasure({
        status: 'deprecated',
        supersededBy: { measureCode: 'OTHER', version: '2.0.0' },
      })
    );
    await expect(m.save()).resolves.toBeTruthy();
  });

  test('effectiveUntil before effectiveFrom is rejected', async () => {
    const m = new Measure(
      baseMeasure({
        effectiveFrom: new Date('2026-06-01'),
        effectiveUntil: new Date('2026-05-01'),
      })
    );
    await expect(m.save()).rejects.toThrow(/effectiveUntil must be after/);
  });
});

// ─── 8. Lifecycle methods ──────────────────────────────────────────────

describe('W210 — lifecycle methods', () => {
  test('draft → publish() → active + effectiveFrom set', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'LIFE-1',
        status: 'draft',
      })
    );
    expect(m.status).toBe('draft');
    expect(m.effectiveFrom).toBeFalsy();
    await m.publish(new mongoose.Types.ObjectId());
    expect(m.status).toBe('active');
    expect(m.effectiveFrom).toBeTruthy();
  });

  test('active → publish() throws (illegal transition)', async () => {
    const m = await Measure.create(baseMeasure({ code: 'LIFE-2' }));
    await expect(m.publish()).rejects.toThrow(/cannot publish from status=active/);
  });

  test('active → deprecate() → deprecated + effectiveUntil set', async () => {
    const m = await Measure.create(baseMeasure({ code: 'LIFE-3' }));
    await m.deprecate(null, { reason: 'replaced by GMFM-66 v2' });
    expect(m.status).toBe('deprecated');
    expect(m.effectiveUntil).toBeTruthy();
  });

  test('deprecated → retire() → retired', async () => {
    const m = await Measure.create(baseMeasure({ code: 'LIFE-4' }));
    await m.deprecate();
    await m.retire(null, { reason: 'aged out' });
    expect(m.status).toBe('retired');
  });

  test('active → retire() throws (must deprecate first)', async () => {
    const m = await Measure.create(baseMeasure({ code: 'LIFE-5' }));
    await expect(m.retire()).rejects.toThrow(/cannot retire from status=active/);
  });
});

// ─── 9. isEligibleFor ──────────────────────────────────────────────────

describe('W210 — isEligibleFor()', () => {
  test('matches ICD-10 wildcard G80.*', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'ELI-1',
        eligibility: { icd10Required: ['G80.*'] },
      })
    );
    expect(m.isEligibleFor({ icd10: ['G80.1'] }).eligible).toBe(true);
    expect(m.isEligibleFor({ icd10: ['F84.0'] }).eligible).toBe(false);
  });

  test('exact ICD-10 code matches', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'ELI-2',
        eligibility: { icd10Required: ['G80'] },
      })
    );
    expect(m.isEligibleFor({ icd10: ['G80'] }).eligible).toBe(true);
    expect(m.isEligibleFor({ icd10: ['G81'] }).eligible).toBe(false);
  });

  test('missing prerequisite measure blocks eligibility', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'ELI-3',
        eligibility: { prerequisiteMeasures: ['GMFCS'] },
      })
    );
    const r = m.isEligibleFor({ icd10: [] }, { administeredMeasureCodes: [] });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('prerequisite_missing');
    expect(r.missing).toEqual(['GMFCS']);
  });

  test('certification gate blocks when rater lacks cert', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'ELI-4',
        eligibility: { certificationRequired: 'GMFM-66-cert' },
      })
    );
    const r = m.isEligibleFor({}, { raterCertifications: [] });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('certification_missing');
  });

  test('non-active measure is ineligible', async () => {
    const m = await Measure.create(
      baseMeasure({
        code: 'ELI-5',
        status: 'draft',
      })
    );
    const r = m.isEligibleFor({});
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe('measure_not_active');
  });
});

// ─── 10. MeasureRevision audit on lifecycle ────────────────────────────

describe('W210 — MeasureRevision audit', () => {
  test('publish() writes a revision', async () => {
    const m = await Measure.create(baseMeasure({ code: 'AUD-1', status: 'draft' }));
    await m.publish(new mongoose.Types.ObjectId());
    const revs = await MeasureRevision.find({ measureCode: 'AUD-1' }).lean();
    const publishRevs = revs.filter(r => r.changeType === 'publish');
    expect(publishRevs.length).toBe(1);
    expect(publishRevs[0].toVersion).toBe('1.0.0');
  });

  test('deprecate() writes a revision with reason', async () => {
    const m = await Measure.create(baseMeasure({ code: 'AUD-2' }));
    await m.deprecate(new mongoose.Types.ObjectId(), { reason: 'superseded' });
    const rev = await MeasureRevision.findOne({
      measureCode: 'AUD-2',
      changeType: 'deprecate',
    }).lean();
    expect(rev).toBeTruthy();
    expect(rev.changeSummary).toBe('superseded');
  });

  test('post-save edit hook logs changed governance paths', async () => {
    const m = await Measure.create(baseMeasure({ code: 'AUD-3' }));
    m.sensitivityLevel = 'HIGH';
    await m.save();
    const rev = await MeasureRevision.findOne({
      measureCode: 'AUD-3',
      changeType: 'edit',
    }).lean();
    expect(rev).toBeTruthy();
    expect(rev.changedPaths).toContain('sensitivityLevel');
  });
});

// ─── 11. MeasureRevision is append-only ────────────────────────────────

describe('W210 — MeasureRevision append-only', () => {
  test('updateOne is rejected', async () => {
    const rev = await MeasureRevision.create({
      measureCode: 'IMM-1',
      changeType: 'create',
      revisedAt: new Date(),
    });
    await expect(
      MeasureRevision.updateOne({ _id: rev._id }, { $set: { changeSummary: 'tamper' } })
    ).rejects.toThrow(/append-only/);
  });

  test('findOneAndUpdate is rejected', async () => {
    await MeasureRevision.create({
      measureCode: 'IMM-2',
      changeType: 'create',
      revisedAt: new Date(),
    });
    await expect(
      MeasureRevision.findOneAndUpdate(
        { measureCode: 'IMM-2' },
        { $set: { changeSummary: 'tamper' } }
      )
    ).rejects.toThrow(/append-only/);
  });
});
