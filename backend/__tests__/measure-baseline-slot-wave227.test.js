'use strict';

/**
 * measure-baseline-slot-wave227.test.js — Wave 227.
 *
 * Verifies the baseline slot model + state-machine service:
 *
 *   Model invariants:
 *     - BASELINE_COMPLETED requires baselineApplicationId + completedAt
 *     - BASELINE_LOCKED requires applicationId + lockedAt + lockedBy
 *     - WAIVED requires type + reason + approvedBy + approvedAt
 *     - CANCELLED requires cancelledAt + cancellationReason
 *
 *   Idempotency:
 *     - openSlot returns existing open slot if one exists
 *     - Partial unique index forbids two open slots for same (ben, ep, m)
 *
 *   State machine:
 *     - Valid transitions accepted (happy path through full lifecycle)
 *     - Invalid transitions rejected (INVALID_TRANSITION code)
 *     - Terminal states refuse outgoing transitions (except WAIVED → REQUIRED)
 *
 *   SoD enforcement:
 *     - lockBaseline.actor cannot equal completedBy
 *     - waive.waiverApprovedBy cannot equal createdBy
 *
 *   Audit:
 *     - stateHistory appended on every transition
 *
 *   Read-side:
 *     - listForBeneficiary returns all slots
 *     - listOpenForBeneficiary excludes terminal states
 *     - findBlockers excludes WAIVED/COMPLETED/LOCKED/CANCELLED
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureBaselineSlot;
let BASELINE_STATES;
let WAIVER_TYPES;
let slotSvc;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w227-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({
    MeasureBaselineSlot,
    BASELINE_STATES,
    WAIVER_TYPES,
  } = require('../domains/goals/models/MeasureBaselineSlot'));
  slotSvc = require('../services/measureBaselineSlot.service');
  await Measure.init();
  await MeasureBaselineSlot.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureBaselineSlot.deleteMany({});
});

// ─── Fixtures ──────────────────────────────────────────────────────────

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
    scoringAlgorithmRef: `scoring/${code.toLowerCase()}.js`,
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

async function freshContext() {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    measure: await seedMeasure(),
    creator: new mongoose.Types.ObjectId(),
  };
}

// ════════════════════════════════════════════════════════════════════════
// 1. Model invariants
// ════════════════════════════════════════════════════════════════════════

describe('W227 — model invariants', () => {
  test('BASELINE_COMPLETED requires baselineApplicationId + completedAt', async () => {
    const ctx = await freshContext();
    await expect(
      MeasureBaselineSlot.create({
        beneficiaryId: ctx.beneficiaryId,
        episodeId: ctx.episodeId,
        measureId: ctx.measure._id,
        measureCode: 'BERG',
        state: 'BASELINE_COMPLETED',
      })
    ).rejects.toThrow(/baselineApplicationId required/);
  });

  test('BASELINE_LOCKED requires lockedAt + lockedBy', async () => {
    const ctx = await freshContext();
    await expect(
      MeasureBaselineSlot.create({
        beneficiaryId: ctx.beneficiaryId,
        episodeId: ctx.episodeId,
        measureId: ctx.measure._id,
        measureCode: 'BERG',
        state: 'BASELINE_LOCKED',
        baselineApplicationId: new mongoose.Types.ObjectId(),
        // lockedAt/lockedBy missing
      })
    ).rejects.toThrow(/lockedAt\+lockedBy required/);
  });

  test('WAIVED requires type + reason + approvedBy', async () => {
    const ctx = await freshContext();
    await expect(
      MeasureBaselineSlot.create({
        beneficiaryId: ctx.beneficiaryId,
        episodeId: ctx.episodeId,
        measureId: ctx.measure._id,
        measureCode: 'BERG',
        state: 'WAIVED',
      })
    ).rejects.toThrow(/waiverType required/);
  });

  test('CANCELLED requires cancellationReason', async () => {
    const ctx = await freshContext();
    await expect(
      MeasureBaselineSlot.create({
        beneficiaryId: ctx.beneficiaryId,
        episodeId: ctx.episodeId,
        measureId: ctx.measure._id,
        measureCode: 'BERG',
        state: 'CANCELLED',
        cancelledAt: new Date(),
        // cancellationReason missing
      })
    ).rejects.toThrow(/cancellationReason required/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Idempotency
// ════════════════════════════════════════════════════════════════════════

describe('W227 — openSlot idempotency', () => {
  test('returns existing open slot instead of duplicating', async () => {
    const ctx = await freshContext();
    const s1 = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    const s2 = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    expect(String(s1._id)).toBe(String(s2._id));
    const all = await MeasureBaselineSlot.find({});
    expect(all.length).toBe(1);
  });

  test('openSlot fills in measureCode from Measure document', async () => {
    const ctx = await freshContext();
    const s = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    expect(s.measureCode).toBe('BERG');
  });

  test('openSlot stamps creator in stateHistory', async () => {
    const ctx = await freshContext();
    const s = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    expect(s.stateHistory.length).toBe(1);
    expect(s.stateHistory[0].state).toBe('BASELINE_REQUIRED');
    expect(s.stateHistory[0].transitionedBy).toBe(String(ctx.creator));
  });

  test('requires beneficiaryId + episodeId + measureId', async () => {
    await expect(slotSvc.openSlot({ episodeId: new mongoose.Types.ObjectId() })).rejects.toThrow(
      /required/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. State machine — happy path
// ════════════════════════════════════════════════════════════════════════

describe('W227 — happy path lifecycle', () => {
  test('REQUIRED → SCHEDULED → IN_PROGRESS → COMPLETED → LOCKED', async () => {
    const ctx = await freshContext();
    const clinician = new mongoose.Types.ObjectId();
    const reviewer = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    let slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    expect(slot.state).toBe('BASELINE_REQUIRED');

    slot = await slotSvc.schedule({
      slotId: slot._id,
      dueDate: new Date('2026-06-01T10:00:00Z'),
      assigneeId: clinician,
      actor: { userId: ctx.creator },
    });
    expect(slot.state).toBe('BASELINE_SCHEDULED');
    expect(String(slot.assigneeId)).toBe(String(clinician));

    slot = await slotSvc.markInProgress({ slotId: slot._id, actor: { userId: clinician } });
    expect(slot.state).toBe('BASELINE_IN_PROGRESS');

    slot = await slotSvc.complete({
      slotId: slot._id,
      baselineApplicationId: adminId,
      actor: { userId: clinician },
    });
    expect(slot.state).toBe('BASELINE_COMPLETED');
    expect(String(slot.baselineApplicationId)).toBe(String(adminId));
    expect(String(slot.completedBy)).toBe(String(clinician));

    slot = await slotSvc.lockBaseline({ slotId: slot._id, actor: { userId: reviewer } });
    expect(slot.state).toBe('BASELINE_LOCKED');
    expect(String(slot.lockedBy)).toBe(String(reviewer));
    expect(slot.stateHistory.length).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Invalid transitions
// ════════════════════════════════════════════════════════════════════════

describe('W227 — invalid transitions', () => {
  test('REQUIRED → COMPLETED rejected', async () => {
    const ctx = await freshContext();
    const slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    await expect(
      slotSvc.complete({
        slotId: slot._id,
        baselineApplicationId: new mongoose.Types.ObjectId(),
        actor: { userId: ctx.creator },
      })
    ).rejects.toThrow(/INVALID_TRANSITION/);
  });

  test('LOCKED is terminal — no further transitions', async () => {
    const ctx = await freshContext();
    const clinician = new mongoose.Types.ObjectId();
    const reviewer = new mongoose.Types.ObjectId();
    let slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    slot = await slotSvc.schedule({ slotId: slot._id, actor: { userId: ctx.creator } });
    slot = await slotSvc.markInProgress({ slotId: slot._id, actor: { userId: clinician } });
    slot = await slotSvc.complete({
      slotId: slot._id,
      baselineApplicationId: new mongoose.Types.ObjectId(),
      actor: { userId: clinician },
    });
    slot = await slotSvc.lockBaseline({ slotId: slot._id, actor: { userId: reviewer } });

    await expect(
      slotSvc.cancel({ slotId: slot._id, reason: 'test', actor: { userId: reviewer } })
    ).rejects.toThrow(/INVALID_TRANSITION/);
  });

  test('CANCELLED is terminal', async () => {
    const ctx = await freshContext();
    const slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    await slotSvc.cancel({
      slotId: slot._id,
      reason: 'episode closed',
      actor: { userId: ctx.creator },
    });
    await expect(
      slotSvc.schedule({ slotId: slot._id, actor: { userId: ctx.creator } })
    ).rejects.toThrow(/INVALID_TRANSITION/);
  });

  test('WAIVED can re-open to REQUIRED (waiver expiry)', async () => {
    const ctx = await freshContext();
    const approver = new mongoose.Types.ObjectId(); // different from creator
    let slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    slot = await slotSvc.waive({
      slotId: slot._id,
      waiverType: 'TEMPORARY_UNAVAILABLE',
      waiverReason: 'acute respiratory illness',
      waiverApprovedBy: approver,
      waiverExpiresAt: new Date('2026-07-01T00:00:00Z'),
      actor: { userId: ctx.creator },
    });
    expect(slot.state).toBe('WAIVED');
    // Re-open after waiver expires
    slot = await slotSvc._transition({
      slotId: slot._id,
      to: 'BASELINE_REQUIRED',
      actor: { userId: ctx.creator },
    });
    expect(slot.state).toBe('BASELINE_REQUIRED');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. SoD enforcement
// ════════════════════════════════════════════════════════════════════════

describe('W227 — SoD enforcement', () => {
  test('lockBaseline.actor cannot equal completedBy', async () => {
    const ctx = await freshContext();
    const clinician = new mongoose.Types.ObjectId();
    let slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    slot = await slotSvc.schedule({ slotId: slot._id, actor: { userId: ctx.creator } });
    slot = await slotSvc.markInProgress({ slotId: slot._id, actor: { userId: clinician } });
    slot = await slotSvc.complete({
      slotId: slot._id,
      baselineApplicationId: new mongoose.Types.ObjectId(),
      actor: { userId: clinician },
    });
    await expect(
      slotSvc.lockBaseline({ slotId: slot._id, actor: { userId: clinician } })
    ).rejects.toThrow(/SoD/);
  });

  test('waive.waiverApprovedBy cannot equal createdBy', async () => {
    const ctx = await freshContext();
    const slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    await expect(
      slotSvc.waive({
        slotId: slot._id,
        waiverType: 'REFUSED_CONSENT',
        waiverReason: 'family declined',
        waiverApprovedBy: ctx.creator, // SAME as creator
        actor: { userId: ctx.creator },
      })
    ).rejects.toThrow(/SoD/);
  });

  test('waive requires type + reason + approver', async () => {
    const ctx = await freshContext();
    const slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    await expect(
      slotSvc.waive({ slotId: slot._id, actor: { userId: ctx.creator } })
    ).rejects.toThrow(/waiverType required/);
    await expect(
      slotSvc.waive({
        slotId: slot._id,
        waiverType: 'REFUSED_CONSENT',
        actor: { userId: ctx.creator },
      })
    ).rejects.toThrow(/waiverReason required/);
    await expect(
      slotSvc.waive({
        slotId: slot._id,
        waiverType: 'REFUSED_CONSENT',
        waiverReason: 'declined',
        actor: { userId: ctx.creator },
      })
    ).rejects.toThrow(/waiverApprovedBy required/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. Read-side helpers
// ════════════════════════════════════════════════════════════════════════

describe('W227 — read-side', () => {
  test('listForBeneficiary returns all slots (open + terminal)', async () => {
    const ctx = await freshContext();
    // Second beneficiary uses a different measure code (unique constraint)
    const otherMeasure = await seedMeasure({ code: 'OTHER1' });
    const ctx2 = {
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      measure: otherMeasure,
      creator: new mongoose.Types.ObjectId(),
    };
    await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    // Different episode → different slot
    await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: new mongoose.Types.ObjectId(),
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    // Different beneficiary → not in result
    await slotSvc.openSlot({
      beneficiaryId: ctx2.beneficiaryId,
      episodeId: ctx2.episodeId,
      measureId: ctx2.measure._id,
      actor: { userId: ctx2.creator },
    });
    const list = await slotSvc.listForBeneficiary(ctx.beneficiaryId);
    expect(list.length).toBe(2);
  });

  test('listOpenForBeneficiary excludes WAIVED/CANCELLED/COMPLETED/LOCKED', async () => {
    const ctx = await freshContext();
    const approver = new mongoose.Types.ObjectId();

    const m1 = await seedMeasure({ code: 'BERG2' });
    const slot1 = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: m1._id,
      actor: { userId: ctx.creator },
    });
    await slotSvc.cancel({
      slotId: slot1._id,
      reason: 'closed',
      actor: { userId: ctx.creator },
    });

    const m2 = await seedMeasure({ code: 'FIM2' });
    const slot2 = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: m2._id,
      actor: { userId: ctx.creator },
    });
    await slotSvc.waive({
      slotId: slot2._id,
      waiverType: 'REFUSED_CONSENT',
      waiverReason: 'family declined',
      waiverApprovedBy: approver,
      actor: { userId: ctx.creator },
    });

    // Open slot
    const m3 = await seedMeasure({ code: 'GMFM2' });
    await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: m3._id,
      actor: { userId: ctx.creator },
    });

    const open = await slotSvc.listOpenForBeneficiary(ctx.beneficiaryId);
    expect(open.length).toBe(1);
    expect(open[0].measureCode).toBe('GMFM2');
  });

  test('findBlockers excludes terminal states', async () => {
    const ctx = await freshContext();
    const approver = new mongoose.Types.ObjectId();
    const m1 = await seedMeasure({ code: 'A1' });
    const m2 = await seedMeasure({ code: 'A2' });
    const open = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: m1._id,
      actor: { userId: ctx.creator },
    });
    const waived = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: m2._id,
      actor: { userId: ctx.creator },
    });
    await slotSvc.waive({
      slotId: waived._id,
      waiverType: 'CULTURAL_OBJECTION',
      waiverReason: 'not consented',
      waiverApprovedBy: approver,
      actor: { userId: ctx.creator },
    });
    const blockers = await slotSvc.findBlockers({ beneficiaryId: ctx.beneficiaryId });
    expect(blockers.length).toBe(1);
    expect(blockers[0].measureCode).toBe('A1');
    expect(String(blockers[0]._id)).toBe(String(open._id));
  });

  test('findBlockers scopes by episode', async () => {
    const ctx = await freshContext();
    const epA = ctx.episodeId;
    const epB = new mongoose.Types.ObjectId();
    await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: epA,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    const m2 = await seedMeasure({ code: 'B1' });
    await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: epB,
      measureId: m2._id,
      actor: { userId: ctx.creator },
    });
    const blockers = await slotSvc.findBlockers({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: epA,
    });
    expect(blockers.length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Audit trail
// ════════════════════════════════════════════════════════════════════════

describe('W227 — audit trail', () => {
  test('stateHistory appended on every transition', async () => {
    const ctx = await freshContext();
    const clinician = new mongoose.Types.ObjectId();
    let slot = await slotSvc.openSlot({
      beneficiaryId: ctx.beneficiaryId,
      episodeId: ctx.episodeId,
      measureId: ctx.measure._id,
      actor: { userId: ctx.creator },
    });
    slot = await slotSvc.schedule({ slotId: slot._id, actor: { userId: ctx.creator } });
    slot = await slotSvc.markInProgress({ slotId: slot._id, actor: { userId: clinician } });
    slot = await slotSvc.cancel({
      slotId: slot._id,
      reason: 'episode terminated',
      actor: { userId: ctx.creator },
    });
    expect(slot.stateHistory.map(h => h.state)).toEqual([
      'BASELINE_REQUIRED',
      'BASELINE_SCHEDULED',
      'BASELINE_IN_PROGRESS',
      'CANCELLED',
    ]);
    // Each entry has an enteredAt + transitionedBy
    for (const h of slot.stateHistory) {
      expect(h.enteredAt).toBeTruthy();
      expect(h.transitionedBy).toBeTruthy();
    }
  });
});
