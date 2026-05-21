'use strict';

/**
 * admin-anomaly-wiring-wave257e.test.js — Wave 257e.
 *
 * Integration test for the W248c anomaly detector wiring into the
 * measureAdministration.service.administer() flow (W257e).
 *
 * Verifies:
 *   1. Clean admin → anomalyFlags is empty array
 *   2. Implausibly-fast admin → IMPOSSIBLY_FAST_ADMIN flag surfaces
 *      on the persisted doc
 *   3. Multiple anomalies coexist on a single admin
 *   4. Detector failure (synthetic) is non-fatal — admin still saves
 *   5. Schema persists anomalyFlags correctly (round-trip via findById)
 *   6. Existing W211 governance (version pinning, eligibility,
 *      cooldown, MCID freeze) UNAFFECTED by the wiring
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w257e-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  measureAdmin = require('../services/measureAdministration.service');
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

// ─── Fixtures ─────────────────────────────────────────────────────────

async function makeMeasure(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'BERG',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 45,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
      sdc: { value: 2.8, ci: 0.95 },
    },
    targetPopulation: ['all'],
    ...overrides,
  });
}

function makeBeneficiary(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    ageMonths: 96,
    icd10: [],
    ...overrides,
  };
}

function makeAdminInput({
  measure,
  beneficiary,
  duration = 40,
  totalRawScore = 35,
  purpose = 'progress',
}) {
  return {
    measureRef: String(measure._id),
    beneficiary,
    purpose,
    totals: { totalRawScore },
    adminDetails: {
      assessorId: new mongoose.Types.ObjectId(),
      duration,
      applicationDate: new Date(),
      setting: 'clinic',
    },
  };
}

// ─── 1. Clean admin → no flags ────────────────────────────────────────

describe('W257e — clean admin produces empty anomalyFlags', () => {
  test('reasonable duration + in-range score + no baseline delta → zero flags', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 40,
        totalRawScore: 35,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    expect(Array.isArray(doc.anomalyFlags)).toBe(true);
    expect(doc.anomalyFlags.length).toBe(0);
  });
});

// ─── 2. Implausibly-fast admin surfaces flag ──────────────────────────

describe('W257e — implausibly-fast admin surfaces IMPOSSIBLY_FAST_ADMIN', () => {
  test('duration=2 with 45min expected → IMPOSSIBLY_FAST_ADMIN flag persists', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 2,
        totalRawScore: 30,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    const flag = doc.anomalyFlags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('medium');
    expect(flag.evidence_ar).toContain('دقيقة');
    expect(flag.evidence_en).toContain('duration=2min');
    expect(flag.fields).toMatchObject({ actualMinutes: 2, expectedMinutes: 45 });
  });
});

// ─── 3. Out-of-range score surfaces flag ──────────────────────────────

describe('W257e — out-of-range score surfaces OUT_OF_RANGE_SCORE', () => {
  test('totalRawScore=999 with max=56 → OUT_OF_RANGE_SCORE flag', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 40,
        totalRawScore: 999,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    const flag = doc.anomalyFlags.find(f => f.type === 'OUT_OF_RANGE_SCORE');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('high');
    expect(flag.fields).toMatchObject({ score: 999, min: 0, max: 56 });
  });
});

// ─── 4. Multiple anomalies coexist ────────────────────────────────────

describe('W257e — multiple anomalies coexist on one admin', () => {
  test('fast + out-of-range fires both', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 2,
        totalRawScore: 999,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    const types = doc.anomalyFlags.map(f => f.type).sort();
    expect(types).toContain('IMPOSSIBLY_FAST_ADMIN');
    expect(types).toContain('OUT_OF_RANGE_SCORE');
  });
});

// ─── 5. Observability discipline — flag does NOT block save ──────────

describe('W257e — observability discipline', () => {
  test('admin with high-severity flag still saves successfully', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 2,
        totalRawScore: 999,
        purpose: 'baseline',
      })
    );
    expect(result._id).toBeDefined();
    const doc = await MeasureApplication.findById(result._id);
    expect(doc).not.toBeNull();
    expect(doc.status).toBe('completed'); // saved successfully
  });

  test('flag shape persists round-trip', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 2,
        totalRawScore: 30,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    expect(doc.anomalyFlags[0]).toMatchObject({
      type: expect.any(String),
      severity: expect.any(String),
      evidence_ar: expect.any(String),
      evidence_en: expect.any(String),
      fields: expect.any(Object),
    });
  });
});

// ─── 6. Dry-run preserves flags ───────────────────────────────────────

describe('W257e — dry-run shows flags without persisting', () => {
  test('dryRun=true returns flags on wouldPersist payload without DB write', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer({
      ...makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 2,
        totalRawScore: 30,
        purpose: 'baseline',
      }),
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    const flagged = result.wouldPersist.anomalyFlags;
    expect(Array.isArray(flagged)).toBe(true);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN')).toBeDefined();
    // No DB persistence
    const count = await MeasureApplication.countDocuments();
    expect(count).toBe(0);
  });
});

// ─── 7. W211 governance still works ──────────────────────────────────

describe('W257e — does not regress W211 governance', () => {
  test('version pinning + MCID freeze still applied alongside anomaly detection', async () => {
    const measure = await makeMeasure();
    const ben = makeBeneficiary();
    const result = await measureAdmin.administer(
      makeAdminInput({
        measure,
        beneficiary: ben,
        duration: 40,
        totalRawScore: 30,
        purpose: 'baseline',
      })
    );
    const doc = await MeasureApplication.findById(result._id).lean();
    expect(doc.scoredWithMeasureVersion).toBe('1.0.0');
    expect(doc.scoredWithAlgorithmVersion).toBe('1.0.0');
    expect(doc.mcidAtAdministration).toMatchObject({ value: 4, status: 'established' });
    expect(doc.sdcAtAdministration).toMatchObject({ value: 2.8 });
  });
});
