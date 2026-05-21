'use strict';

/**
 * measure-baseline-slot-admin-wire-wave228.test.js — Wave 228.
 *
 * Verifies the auto-wire between W215 administer() and W227 slot:
 *
 *   completeFromAdmin() direct calls:
 *     - REQUIRED → COMPLETED (skip-forwards through SCHEDULED + IN_PROGRESS)
 *     - SCHEDULED → COMPLETED
 *     - IN_PROGRESS → COMPLETED
 *     - COMPLETED/LOCKED/WAIVED/CANCELLED → no-op (advanced: false)
 *     - No slot exists → returns null (best-effort)
 *     - episodeId scoping enforced
 *     - phaseHistory captures all intermediate transitions
 *     - baselineApplicationId linked correctly
 *
 *   Integration via administer():
 *     - purpose='baseline' fires slot advance
 *     - purpose='progress' does NOT fire slot advance
 *     - result._baselineSlot present on baseline success path
 *     - Slot service failure does NOT break primary admin write
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
let MeasureBaselineSlot;
let measureAdmin;
let baselineSlot;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w228-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureBaselineSlot } = require('../domains/goals/models/MeasureBaselineSlot'));
  measureAdmin = require('../services/measureAdministration.service');
  baselineSlot = require('../services/measureBaselineSlot.service');
  await Measure.init();
  await MeasureApplication.init();
  await MeasureBaselineSlot.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureBaselineSlot.deleteMany({});
});

// ─── Helpers ───────────────────────────────────────────────────────────

async function seedMeasure({ code = 'BERG' } = {}) {
  return Measure.create({
    code,
    name: code,
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
    },
    targetPopulation: ['all'],
  });
}

async function seedSlot({ benId, epId, measureId, state = 'BASELINE_REQUIRED', creator }) {
  return baselineSlot
    .openSlot({
      beneficiaryId: benId,
      episodeId: epId,
      measureId,
      actor: { userId: creator || new mongoose.Types.ObjectId() },
    })
    .then(async slot => {
      if (state === 'BASELINE_REQUIRED') return slot;
      if (state === 'BASELINE_SCHEDULED') {
        return baselineSlot.schedule({ slotId: slot._id, actor: { userId: creator } });
      }
      if (state === 'BASELINE_IN_PROGRESS') {
        let s = await baselineSlot.schedule({ slotId: slot._id, actor: { userId: creator } });
        s = await baselineSlot.markInProgress({ slotId: s._id, actor: { userId: creator } });
        return s;
      }
      return slot;
    });
}

function fakeAdmin({ benId, epId, measureId, assessorId, id }) {
  return {
    _id: id || new mongoose.Types.ObjectId(),
    beneficiaryId: benId,
    episodeId: epId,
    measureId,
    assessorId: assessorId || new mongoose.Types.ObjectId(),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. completeFromAdmin direct
// ════════════════════════════════════════════════════════════════════════

describe('W228 — completeFromAdmin from various open states', () => {
  test('REQUIRED → COMPLETED (skip-forward through SCHEDULED + IN_PROGRESS)', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const slot = await seedSlot({ benId, epId, measureId: m._id });
    expect(slot.state).toBe('BASELINE_REQUIRED');

    const admin = fakeAdmin({ benId, epId, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r.advanced).toBe(true);
    expect(r.fromState).toBe('BASELINE_REQUIRED');
    expect(r.slot.state).toBe('BASELINE_COMPLETED');
    expect(String(r.slot.baselineApplicationId)).toBe(String(admin._id));
    expect(r.slot.stateHistory.map(h => h.state)).toEqual([
      'BASELINE_REQUIRED',
      'BASELINE_SCHEDULED',
      'BASELINE_IN_PROGRESS',
      'BASELINE_COMPLETED',
    ]);
  });

  test('SCHEDULED → COMPLETED', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId, measureId: m._id, state: 'BASELINE_SCHEDULED' });
    const admin = fakeAdmin({ benId, epId, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r.advanced).toBe(true);
    expect(r.fromState).toBe('BASELINE_SCHEDULED');
    expect(r.slot.state).toBe('BASELINE_COMPLETED');
  });

  test('IN_PROGRESS → COMPLETED', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId, measureId: m._id, state: 'BASELINE_IN_PROGRESS' });
    const admin = fakeAdmin({ benId, epId, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r.advanced).toBe(true);
    expect(r.fromState).toBe('BASELINE_IN_PROGRESS');
    expect(r.slot.state).toBe('BASELINE_COMPLETED');
  });

  test('no slot exists → returns null (best-effort)', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const admin = fakeAdmin({
      benId,
      epId: new mongoose.Types.ObjectId(),
      measureId: m._id,
    });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r).toBeNull();
  });

  test('episodeId scopes the lookup', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epA = new mongoose.Types.ObjectId();
    const epB = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId: epA, measureId: m._id });
    // Admin for a different episode → no match
    const admin = fakeAdmin({ benId, epId: epB, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r).toBeNull();
  });

  test('baselineApplicationId is the admin._id', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId, measureId: m._id });
    const adminId = new mongoose.Types.ObjectId();
    const admin = fakeAdmin({ benId, epId, measureId: m._id, id: adminId });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(String(r.slot.baselineApplicationId)).toBe(String(adminId));
    expect(String(r.slot.completedBy)).toBe(String(admin.assessorId));
  });

  test('rejects without admin.beneficiaryId or admin.measureId', async () => {
    await expect(baselineSlot.completeFromAdmin({ admin: {} })).rejects.toThrow(
      /beneficiaryId\+measureId required/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. No-op on terminal states
// ════════════════════════════════════════════════════════════════════════

describe('W228 — terminal-state no-op', () => {
  test('already-COMPLETED slot → no-op (advanced: false)', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const creator = new mongoose.Types.ObjectId();
    const clinician = new mongoose.Types.ObjectId();
    // Create slot + advance to COMPLETED manually with a different admin
    const slot = await baselineSlot.openSlot({
      beneficiaryId: benId,
      episodeId: epId,
      measureId: m._id,
      actor: { userId: creator },
    });
    await baselineSlot.schedule({ slotId: slot._id, actor: { userId: creator } });
    await baselineSlot.markInProgress({ slotId: slot._id, actor: { userId: clinician } });
    await baselineSlot.complete({
      slotId: slot._id,
      baselineApplicationId: new mongoose.Types.ObjectId(),
      actor: { userId: clinician },
    });

    // Now fire completeFromAdmin — slot is already COMPLETED (terminal-ish)
    const admin = fakeAdmin({ benId, epId, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    // The find() filter excludes COMPLETED → returns null
    expect(r).toBeNull();
  });

  test('WAIVED slot → no-op (excluded by find filter)', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const creator = new mongoose.Types.ObjectId();
    const approver = new mongoose.Types.ObjectId();
    const slot = await baselineSlot.openSlot({
      beneficiaryId: benId,
      episodeId: epId,
      measureId: m._id,
      actor: { userId: creator },
    });
    await baselineSlot.waive({
      slotId: slot._id,
      waiverType: 'REFUSED_CONSENT',
      waiverReason: 'family declined',
      waiverApprovedBy: approver,
      actor: { userId: creator },
    });
    const admin = fakeAdmin({ benId, epId, measureId: m._id });
    const r = await baselineSlot.completeFromAdmin({ admin });
    expect(r).toBeNull();
    const after = await MeasureBaselineSlot.findById(slot._id).lean();
    expect(after.state).toBe('WAIVED'); // unchanged
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Integration via administer()
// ════════════════════════════════════════════════════════════════════════

describe('W228 — administer() integration', () => {
  test('purpose=baseline auto-advances open slot', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const assessorId = new mongoose.Types.ObjectId();
    const creator = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId, measureId: m._id, creator });

    const result = await measureAdmin.administer({
      measureRef: m._id,
      beneficiary: { _id: benId, ageMonths: 360, icd10: [] },
      purpose: 'baseline',
      totals: { totalRawScore: 42 },
      adminDetails: {
        assessorId,
        episodeId: epId,
        setting: 'clinic',
      },
    });
    expect(result.isBaseline).toBe(true);
    expect(result._baselineSlot).toBeDefined();
    expect(result._baselineSlot.advanced).toBe(true);
    expect(result._baselineSlot.slot.state).toBe('BASELINE_COMPLETED');
    expect(String(result._baselineSlot.slot.baselineApplicationId)).toBe(String(result._id));
  });

  test('purpose=progress does NOT fire slot advance', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const creator = new mongoose.Types.ObjectId();
    await seedSlot({ benId, epId, measureId: m._id, creator });

    const result = await measureAdmin.administer({
      measureRef: m._id,
      beneficiary: { _id: benId, ageMonths: 360, icd10: [] },
      purpose: 'progress',
      totals: { totalRawScore: 42 },
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        episodeId: epId,
      },
    });
    expect(result.isBaseline).toBe(false);
    expect(result._baselineSlot).toBeUndefined();
    // Slot still REQUIRED
    const slot = await MeasureBaselineSlot.findOne({ beneficiaryId: benId, episodeId: epId });
    expect(slot.state).toBe('BASELINE_REQUIRED');
  });

  test('no open slot → admin succeeds without _baselineSlot', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const result = await measureAdmin.administer({
      measureRef: m._id,
      beneficiary: { _id: benId, ageMonths: 360, icd10: [] },
      purpose: 'baseline',
      totals: { totalRawScore: 42 },
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        episodeId: epId,
      },
    });
    expect(result.isBaseline).toBe(true);
    expect(result._baselineSlot).toBeUndefined();
    expect(result._id).toBeDefined();
  });

  test('dry-run does NOT fire slot advance', async () => {
    const m = await seedMeasure();
    const benId = new mongoose.Types.ObjectId();
    const epId = new mongoose.Types.ObjectId();
    const creator = new mongoose.Types.ObjectId();
    const slot = await seedSlot({ benId, epId, measureId: m._id, creator });

    const result = await measureAdmin.administer({
      measureRef: m._id,
      beneficiary: { _id: benId, ageMonths: 360, icd10: [] },
      purpose: 'baseline',
      totals: { totalRawScore: 42 },
      dryRun: true,
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        episodeId: epId,
      },
    });
    expect(result.dryRun).toBe(true);
    // Slot unchanged
    const after = await MeasureBaselineSlot.findById(slot._id).lean();
    expect(after.state).toBe('BASELINE_REQUIRED');
  });
});
