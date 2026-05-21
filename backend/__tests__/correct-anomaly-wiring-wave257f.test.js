'use strict';

/**
 * correct-anomaly-wiring-wave257f.test.js — Wave 257f.
 *
 * Integration test for the W248c anomaly detector wiring into the
 * measureAdministration.service.correct() flow (W257f).
 *
 * Companion to W257e (which wired administer()). The correction path
 * creates a new MeasureApplication doc via a different code branch,
 * so it needs its own detector call. The implementation also resets
 * inherited anomalyFlags before re-running detector against the
 * corrected payload — flags reflect post-correction state, not the
 * pre-correction admin.
 *
 * Verifies:
 *   1. Correction inherits + re-runs detector → fresh flags only
 *   2. Original anomaly fixed by correction → correction has empty flags
 *   3. Original was clean, correction introduces anomaly → correction flagged
 *   4. Both original anomaly and new correction anomaly → only correction's
 *      current flags surface (no stale carry-over)
 *   5. correctionOf chain preserved + status='corrected' on original
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w257f-test' } });
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

async function makeAdmin({ measure, duration, totalRawScore, lockAfter = true }) {
  const ben = { _id: new mongoose.Types.ObjectId(), ageMonths: 96, icd10: [] };
  const result = await measureAdmin.administer({
    measureRef: String(measure._id),
    beneficiary: ben,
    purpose: 'baseline',
    totals: { totalRawScore },
    adminDetails: {
      assessorId: new mongoose.Types.ObjectId(),
      duration,
      applicationDate: new Date(),
      setting: 'clinic',
    },
  });
  // Lock so correction is permitted (W211 requires lock).
  if (lockAfter) {
    await measureAdmin.lockBaseline(result._id, new mongoose.Types.ObjectId());
  }
  return result;
}

// ─── 1. Anomalous original corrected to clean → fresh flags reflect clean ─

describe('W257f — original anomaly fixed by correction → correction clean', () => {
  test('correction with valid duration + score has empty anomalyFlags', async () => {
    const measure = await makeMeasure();
    // Original has IMPOSSIBLY_FAST_ADMIN (duration=2)
    const orig = await makeAdmin({ measure, duration: 2, totalRawScore: 30 });
    const origDoc = await MeasureApplication.findById(orig._id).lean();
    expect(origDoc.anomalyFlags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN')).toBeDefined();

    // Correct it with reasonable duration
    const { correction } = await measureAdmin.correct(
      orig._id,
      { duration: 40 },
      'duration was mis-entered',
      new mongoose.Types.ObjectId()
    );

    const corrDoc = await MeasureApplication.findById(correction._id).lean();
    expect(corrDoc.anomalyFlags.length).toBe(0);
  });
});

// ─── 2. Clean original, correction introduces anomaly → correction flagged ─

describe('W257f — correction introduces anomaly → correction flagged', () => {
  test('out-of-range correction surfaces OUT_OF_RANGE_SCORE on the new record', async () => {
    const measure = await makeMeasure();
    const orig = await makeAdmin({ measure, duration: 40, totalRawScore: 30 });
    const origDoc = await MeasureApplication.findById(orig._id).lean();
    expect(origDoc.anomalyFlags.length).toBe(0);

    const { correction } = await measureAdmin.correct(
      orig._id,
      { totalRawScore: 999 },
      'data-entry typo',
      new mongoose.Types.ObjectId()
    );

    const corrDoc = await MeasureApplication.findById(correction._id).lean();
    const flag = corrDoc.anomalyFlags.find(f => f.type === 'OUT_OF_RANGE_SCORE');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('high');
    expect(flag.fields).toMatchObject({ score: 999, min: 0, max: 56 });
  });
});

// ─── 3. Inherited flags do NOT carry over stale ─────────────────────────

describe('W257f — inherited anomalyFlags reset, not stale-carried', () => {
  test('correction does NOT carry IMPOSSIBLY_FAST_ADMIN from original when duration fixed', async () => {
    const measure = await makeMeasure();
    const orig = await makeAdmin({ measure, duration: 2, totalRawScore: 30 });
    const { correction } = await measureAdmin.correct(
      orig._id,
      { duration: 60 },
      'duration corrected',
      new mongoose.Types.ObjectId()
    );
    const corrDoc = await MeasureApplication.findById(correction._id).lean();
    expect(corrDoc.anomalyFlags.find(f => f.type === 'IMPOSSIBLY_FAST_ADMIN')).toBeUndefined();
  });

  test('correction can REPLACE an anomaly type — fast→long instead of fast→fast', async () => {
    const measure = await makeMeasure();
    const orig = await makeAdmin({ measure, duration: 2, totalRawScore: 30 });
    // Correct to an implausibly LONG duration (> 3× expected)
    const { correction } = await measureAdmin.correct(
      orig._id,
      { duration: 200 },
      'duration was logged in seconds, converting to minutes',
      new mongoose.Types.ObjectId()
    );
    const corrDoc = await MeasureApplication.findById(correction._id).lean();
    const types = corrDoc.anomalyFlags.map(f => f.type);
    expect(types).not.toContain('IMPOSSIBLY_FAST_ADMIN'); // old gone
    expect(types).toContain('DURATION_IMPLAUSIBLY_LONG'); // new caught
  });
});

// ─── 4. Original status + chain preserved ──────────────────────────────

describe('W257f — correction chain semantics preserved', () => {
  test('original transitions to corrected + supersededByCorrection set', async () => {
    const measure = await makeMeasure();
    const orig = await makeAdmin({ measure, duration: 2, totalRawScore: 30 });
    const { correction } = await measureAdmin.correct(
      orig._id,
      { duration: 40 },
      'fix duration',
      new mongoose.Types.ObjectId()
    );

    const origReloaded = await MeasureApplication.findById(orig._id).lean();
    expect(origReloaded.status).toBe('corrected');
    expect(String(origReloaded.supersededByCorrection)).toBe(String(correction._id));

    const corrDoc = await MeasureApplication.findById(correction._id).lean();
    expect(String(corrDoc.correctionOf)).toBe(String(orig._id));
    expect(corrDoc.correctionReason).toBe('fix duration');
  });
});

// ─── 5. Observability discipline — correction with flag still saves ───

describe('W257f — observability discipline on correct() path', () => {
  test('correction with high-severity flag saves successfully', async () => {
    const measure = await makeMeasure();
    const orig = await makeAdmin({ measure, duration: 40, totalRawScore: 30 });
    const { correction } = await measureAdmin.correct(
      orig._id,
      { totalRawScore: 999 },
      'typo',
      new mongoose.Types.ObjectId()
    );
    expect(correction._id).toBeDefined();
    const corrDoc = await MeasureApplication.findById(correction._id);
    expect(corrDoc).not.toBeNull();
    expect(corrDoc.status).toBe('completed'); // saved
    expect(corrDoc.anomalyFlags.length).toBeGreaterThan(0);
  });
});
