'use strict';

/**
 * W1254 — W45 family-retry worker serves UnifiedCarePlan (second prod-ON
 * worker re-point, ADR-040 (b)) + the .lean() persistence root-fix.
 *
 * Layers:
 *   1. BEHAVIORAL (MMS) — a UI-authored plan with a failed family-notification
 *      attempt gets retried through the W45 handler; success/failure mutations
 *      (retries, status, failureReason) NOW PERSIST (pre-W1254 the real-model
 *      path fetched .lean() rows whose missing .save() silently dropped every
 *      mutation — backoff/exhaustion state reset on every cron run).
 *   2. EXHAUSTION — a 3rd-retry attempt flips to manual_override and persists.
 *   3. BACKWARD-COMPAT — legacy mock paths (plain arrays) work unchanged;
 *      factory without unifiedPlanModel ignores UnifiedCarePlan rows;
 *      unified query failure never blocks the legacy scan.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createFamilyRetryWorker } = require('../intelligence/care-plan-family-retry.worker');
const { HANDLER_NAMES } = require('../intelligence/care-plan-side-effects.service');
const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

function legacyStub(rows = []) {
  return { find: () => rows };
}

function handlers(result) {
  const calls = [];
  return {
    calls,
    map: {
      [HANDLER_NAMES.NOTIFY_FAMILY]: async args => {
        calls.push(args);
        return typeof result === 'function' ? result(args) : result;
      },
    },
  };
}

describe('W1254 family-retry × UnifiedCarePlan (MMS)', () => {
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

  function uiPlan(attempt = {}) {
    return {
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date('2026-01-01'),
      status: 'active',
      familyNotifications: [
        {
          attemptId: 'AT-1',
          channel: 'sms',
          attemptedAt: new Date(Date.now() - 6 * 3600000), // old enough for any backoff slot
          status: 'failed',
          retries: 0,
          failureReason: 'sms gateway timeout',
          ...attempt,
        },
      ],
    };
  }

  test('failed attempt on a UI plan is retried; success mutation PERSISTS', async () => {
    const plan = await UnifiedCarePlan.create(uiPlan());
    const h = handlers({ ok: true });
    const worker = createFamilyRetryWorker({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      sideEffectHandlers: h.map,
    });

    const res = await worker.runOnce({});
    expect(res.scanned).toBe(1);
    expect(res.retried).toBe(1);
    expect(res.succeeded).toBe(1);
    expect(res.details[0].source).toBe('unified');
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].metadata.isRetry).toBe(true);

    // The root-fix proof: mutations persisted to the DB (pre-W1254 they were lost)
    const after = await UnifiedCarePlan.findById(plan._id).lean();
    expect(after.familyNotifications[0].status).toBe('sent');
    expect(after.familyNotifications[0].retries).toBe(1);
    expect(after.familyNotifications[0].failureReason).toBeNull();
  });

  test('failed retry persists incremented counter + reason (backoff state survives)', async () => {
    const plan = await UnifiedCarePlan.create(uiPlan());
    const h = handlers({ ok: false, reason: 'still down' });
    const worker = createFamilyRetryWorker({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      sideEffectHandlers: h.map,
    });

    await worker.runOnce({});
    const after = await UnifiedCarePlan.findById(plan._id).lean();
    expect(after.familyNotifications[0].status).toBe('failed');
    expect(after.familyNotifications[0].retries).toBe(1);
    expect(after.familyNotifications[0].failureReason).toBe('still down');
  });

  test('exhausted attempt (3 retries) flips to manual_override and persists', async () => {
    const plan = await UnifiedCarePlan.create(uiPlan({ retries: 3 }));
    const h = handlers({ ok: true });
    const worker = createFamilyRetryWorker({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      sideEffectHandlers: h.map,
    });

    const res = await worker.runOnce({});
    expect(res.exhausted).toBe(1);
    expect(res.manualOverrideMarked).toBe(1);
    expect(h.calls).toHaveLength(0); // never re-sent
    const after = await UnifiedCarePlan.findById(plan._id).lean();
    expect(after.familyNotifications[0].status).toBe('manual_override');
  });

  test('backward-compat — without unifiedPlanModel, UI plans are ignored; legacy array path unchanged', async () => {
    await UnifiedCarePlan.create(uiPlan());
    const legacyRow = {
      _id: new mongoose.Types.ObjectId(),
      status: 'family_notification_sent',
      familyNotifications: [
        {
          attemptId: 'L-1',
          channel: 'email',
          attemptedAt: new Date(Date.now() - 6 * 3600000),
          status: 'failed',
          retries: 0,
        },
      ],
    };
    const h = handlers({ ok: true });
    const worker = createFamilyRetryWorker({
      planVersionModel: legacyStub([legacyRow]),
      sideEffectHandlers: h.map,
    });
    const res = await worker.runOnce({});
    expect(res.scanned).toBe(1); // legacy only
    expect(res.succeeded).toBe(1);
    expect(res.details[0].source).toBe('legacy');
  });

  test('fail-soft — unified query failure never blocks the legacy scan', async () => {
    const broken = {
      find: () => {
        throw new Error('boom');
      },
    };
    const legacyRow = {
      _id: new mongoose.Types.ObjectId(),
      status: 'saved_to_record',
      familyNotifications: [
        {
          attemptId: 'L-2',
          channel: 'portal',
          attemptedAt: new Date(Date.now() - 6 * 3600000),
          status: 'failed',
          retries: 0,
        },
      ],
    };
    const h = handlers({ ok: true });
    const worker = createFamilyRetryWorker({
      planVersionModel: legacyStub([legacyRow]),
      unifiedPlanModel: broken,
      sideEffectHandlers: h.map,
    });
    const res = await worker.runOnce({});
    expect(res.succeeded).toBe(1);
  });
});
