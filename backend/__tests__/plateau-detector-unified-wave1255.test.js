'use strict';

/**
 * W1255 — plateau detector reviews UnifiedCarePlan (third ADR-040 (b)
 * re-point; the W44 progress reviewer now sees UI-authored plans).
 *
 * Layers:
 *   1. BEHAVIORAL (MMS) — an active UI plan flows through the REAL
 *      progress reviewer; an overdue nextReviewDate yields an
 *      action-required notification tagged source:'unified'.
 *   2. CADENCE STAMP — lastPlateauReviewAt persists on UnifiedCarePlan
 *      (declared field, survives strict mode) and gates the next run.
 *   3. BACKWARD-COMPAT + FAIL-SOFT — legacy-only without the new dep;
 *      unified query failure never blocks the legacy scan.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createPlateauDetectorScheduler,
} = require('../intelligence/care-plan-plateau-detector.scheduler');
const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

function legacyStub(rows = []) {
  return { find: () => rows, updateOne: async () => ({}) };
}

function captureNotifier(sink) {
  return { send: async msg => sink.push(msg) };
}

const emptySignals = async () => ({ goalSignals: [], aggregateAttendance: null });

describe('W1255 plateau detector × UnifiedCarePlan (MMS)', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await UnifiedCarePlan.deleteMany({});
  });

  function uiPlan(overrides = {}) {
    return {
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date('2026-01-01'),
      status: 'active',
      reviewCycle: 'monthly',
      nextReviewDate: new Date(Date.now() - 30 * 86400000), // well past the overdue-review threshold
      ...overrides,
    };
  }

  test('an active UI plan is reviewed; overdue review yields a source-tagged notification', async () => {
    const plan = await UnifiedCarePlan.create(uiPlan());
    const sink = [];
    const sched = createPlateauDetectorScheduler({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      collectSignals: emptySignals,
      notifier: captureNotifier(sink),
    });

    const res = await sched.runOnce({});
    expect(res.errors).toHaveLength(0);
    expect(res.scanned).toBe(1);
    expect(res.reviewed).toBe(1);
    expect(sink.length).toBeGreaterThanOrEqual(1);
    expect(sink[0].payload.planVersionId).toBe(String(plan._id));
    expect(sink[0].payload.source).toBe('unified');
    expect(sink[0].payload.triggerCount).toBeGreaterThanOrEqual(1); // overdue-review trigger
  });

  test('cadence stamp persists on UnifiedCarePlan and gates the next run', async () => {
    const plan = await UnifiedCarePlan.create(uiPlan());
    const sched = createPlateauDetectorScheduler({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      collectSignals: emptySignals,
      notifier: captureNotifier([]),
    });

    await sched.runOnce({});
    const after = await UnifiedCarePlan.findById(plan._id).lean();
    expect(after.lastPlateauReviewAt).toBeInstanceOf(Date); // strict-mode survival proof

    const second = await sched.runOnce({});
    expect(second.scanned).toBe(1);
    expect(second.reviewed).toBe(0); // half-cadence gate honored
  });

  test('backward-compat — without unifiedPlanModel, UI plans are ignored', async () => {
    await UnifiedCarePlan.create(uiPlan());
    const sched = createPlateauDetectorScheduler({
      planVersionModel: legacyStub([]),
      collectSignals: emptySignals,
      notifier: captureNotifier([]),
    });
    const res = await sched.runOnce({});
    expect(res.scanned).toBe(0);
  });

  test('fail-soft — unified query failure never blocks the legacy scan', async () => {
    const legacyRow = {
      _id: new mongoose.Types.ObjectId(),
      planId: 'CPV-9',
      status: 'approved',
      reviewSchedule: { cadenceWeeks: 4, nextReviewAt: new Date(Date.now() - 30 * 86400000) },
    };
    const broken = {
      find: () => {
        throw new Error('boom');
      },
    };
    const sink = [];
    const sched = createPlateauDetectorScheduler({
      planVersionModel: legacyStub([legacyRow]),
      unifiedPlanModel: broken,
      collectSignals: emptySignals,
      notifier: captureNotifier(sink),
    });
    const res = await sched.runOnce({});
    expect(res.errors.some(e => e.phase === 'query-unified')).toBe(true);
    expect(res.reviewed).toBe(1); // legacy row still reviewed
    expect(sink[0].payload.source).toBe('legacy');
  });
});
