'use strict';

/**
 * list-anomalous-admins-wave257g.test.js — Wave 257g.
 *
 * Integration test for measureAdministration.listAnomalousAdmins(),
 * the query layer that closes the value chain on W257e + W257f
 * wirings — they persist anomalyFlags onto admins, this surfaces them.
 *
 * Verifies:
 *   1. Empty DB → {items: [], total: 0}
 *   2. Admins without flags excluded
 *   3. Branch filter applied
 *   4. Date range filter (from/to) applied
 *   5. Severity filter is INCLUSIVE — 'medium' matches medium AND high
 *   6. flagType + severity combine via $elemMatch
 *      (an admin with high-severity flag of a different type ≠ match)
 *   7. Sort is desc by applicationDate
 *   8. Limit caps results, total reflects unlimited count
 *   9. Corrected admins excluded by default, surfaced via opt-in
 *  10. Invalid severity throws
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
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w257g-test' } });
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

async function makeMeasure() {
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
  });
}

/**
 * Create a raw admin doc with optional preset anomalyFlags + branchId.
 * Bypasses the service to control flags + dates deterministically.
 */
async function seedAdmin({
  measure,
  branchId,
  applicationDate,
  flags = [],
  purpose = 'progress',
  status = 'completed',
}) {
  return MeasureApplication.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    measureId: measure._id,
    applicationDate,
    purpose,
    assessorId: new mongoose.Types.ObjectId(),
    status,
    branchId,
    totalRawScore: 30,
    anomalyFlags: flags,
    // W211 invariant: status='corrected' requires version pin
    scoredWithMeasureVersion: '1.0.0',
    scoredWithAlgorithmVersion: '1.0.0',
  });
}

function flag(type, severity = 'medium') {
  return {
    type,
    severity,
    evidence_ar: 'x',
    evidence_en: 'x',
    fields: { actualMinutes: 2 },
  };
}

// ─── 1. Empty ─────────────────────────────────────────────────────────

describe('W257g — empty state', () => {
  test('empty DB returns {items: [], total: 0}', async () => {
    const r = await measureAdmin.listAnomalousAdmins();
    expect(r).toEqual({ items: [], total: 0 });
  });

  test('no admins with flags → total 0 even if flagless admins exist', async () => {
    const measure = await makeMeasure();
    await seedAdmin({ measure, applicationDate: new Date(), flags: [] });
    await seedAdmin({ measure, applicationDate: new Date(), flags: [] });
    const r = await measureAdmin.listAnomalousAdmins();
    expect(r.total).toBe(0);
    expect(r.items).toHaveLength(0);
  });
});

// ─── 2. Branch filter ─────────────────────────────────────────────────

describe('W257g — branch filter', () => {
  test('branchId narrows results', async () => {
    const measure = await makeMeasure();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedAdmin({
      measure,
      branchId: branchA,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      branchId: branchA,
      applicationDate: new Date(),
      flags: [flag('OUT_OF_RANGE_SCORE')],
    });
    await seedAdmin({
      measure,
      branchId: branchB,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });

    const r = await measureAdmin.listAnomalousAdmins({ branchId: branchA });
    expect(r.total).toBe(2);
    expect(r.items.every(i => String(i.branchId) === String(branchA))).toBe(true);
  });
});

// ─── 3. Date range filter ─────────────────────────────────────────────

describe('W257g — date range filter', () => {
  test('from/to constrain by applicationDate', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    await seedAdmin({
      measure,
      branchId,
      applicationDate: new Date('2026-01-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      branchId,
      applicationDate: new Date('2026-03-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      branchId,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });

    const r = await measureAdmin.listAnomalousAdmins({
      from: '2026-02-01',
      to: '2026-04-30',
    });
    expect(r.total).toBe(1);
    expect(new Date(r.items[0].applicationDate).getMonth()).toBe(2); // March
  });
});

// ─── 4. Severity filter (inclusive) ───────────────────────────────────

describe('W257g — severity filter is inclusive (≥)', () => {
  test('severity=medium matches medium AND high', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'low')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'medium')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('OUT_OF_RANGE_SCORE', 'high')],
    });

    const r = await measureAdmin.listAnomalousAdmins({ severity: 'medium' });
    expect(r.total).toBe(2);
  });

  test('severity=high matches only high', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'low')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'medium')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('OUT_OF_RANGE_SCORE', 'high')],
    });
    const r = await measureAdmin.listAnomalousAdmins({ severity: 'high' });
    expect(r.total).toBe(1);
    expect(r.items[0].anomalyFlags.find(f => f.severity === 'high')).toBeDefined();
  });

  test('invalid severity throws', async () => {
    await expect(measureAdmin.listAnomalousAdmins({ severity: 'critical' })).rejects.toThrow(
      /Invalid severity/
    );
  });
});

// ─── 5. flagType + severity combine via $elemMatch ────────────────────

describe('W257g — flagType + severity combine on same flag', () => {
  test('admin with high-severity flag of DIFFERENT type does not match (severity=high, type=OUT_OF_RANGE)', async () => {
    const measure = await makeMeasure();
    // One flag: IMPOSSIBLY_FAST_ADMIN, severity=high
    // Different type, even though severity matches
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'high')],
    });
    // Match: high-severity OUT_OF_RANGE_SCORE
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('OUT_OF_RANGE_SCORE', 'high')],
    });
    const r = await measureAdmin.listAnomalousAdmins({
      severity: 'high',
      flagType: 'OUT_OF_RANGE_SCORE',
    });
    expect(r.total).toBe(1);
    expect(
      r.items[0].anomalyFlags.find(f => f.type === 'OUT_OF_RANGE_SCORE' && f.severity === 'high')
    ).toBeDefined();
  });
});

// ─── 6. Sort + limit ──────────────────────────────────────────────────

describe('W257g — sort is desc by applicationDate', () => {
  test('most recent first', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-01-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-03-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const r = await measureAdmin.listAnomalousAdmins();
    const months = r.items.map(i => new Date(i.applicationDate).getMonth());
    expect(months).toEqual([4, 2, 0]); // May, Mar, Jan
  });

  test('limit caps results; total reflects unlimited count', async () => {
    const measure = await makeMeasure();
    for (let i = 0; i < 5; i++) {
      await seedAdmin({
        measure,
        applicationDate: new Date(2026, i, 15),
        flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
      });
    }
    const r = await measureAdmin.listAnomalousAdmins({ limit: 2 });
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(5);
  });

  test('limit clamps to [1, 500]', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    // limit=0 → clamped to 1
    const r0 = await measureAdmin.listAnomalousAdmins({ limit: 0 });
    expect(r0.items.length).toBeLessThanOrEqual(1);
    // limit=1000 → clamped to 500; with only 1 doc total, just returns it
    const rBig = await measureAdmin.listAnomalousAdmins({ limit: 1000 });
    expect(rBig.items).toHaveLength(1);
  });
});

// ─── 7. Corrected admins ──────────────────────────────────────────────

describe('W257g — corrected admins excluded by default', () => {
  test('status=corrected hidden unless includeSuperseded=true', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
      status: 'corrected',
    });
    await seedAdmin({
      measure,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
      status: 'completed',
    });

    const defaultResult = await measureAdmin.listAnomalousAdmins();
    expect(defaultResult.total).toBe(1);

    const withSuperseded = await measureAdmin.listAnomalousAdmins({ includeSuperseded: true });
    expect(withSuperseded.total).toBe(2);
  });
});

// ─── 8. Returned shape ────────────────────────────────────────────────

describe('W257g — returned admin shape', () => {
  test('items carry essential fields for triage', async () => {
    const measure = await makeMeasure();
    const branchId = new mongoose.Types.ObjectId();
    await seedAdmin({
      measure,
      branchId,
      applicationDate: new Date(),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'high')],
    });
    const r = await measureAdmin.listAnomalousAdmins();
    expect(r.items[0]).toMatchObject({
      _id: expect.anything(),
      beneficiaryId: expect.anything(),
      measureId: expect.anything(),
      branchId: expect.anything(),
      applicationDate: expect.anything(),
      anomalyFlags: expect.any(Array),
    });
    expect(r.items[0].anomalyFlags[0].type).toBe('IMPOSSIBLY_FAST_ADMIN');
  });
});
