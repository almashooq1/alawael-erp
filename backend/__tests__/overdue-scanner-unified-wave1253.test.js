'use strict';

/**
 * W1253 — W50 overdue-review scanner reads UnifiedCarePlan (ADR-040 (b),
 * first prod-ON worker re-point).
 *
 * Before this wave the scanner queried ONLY CarePlanVersion — so a UI-authored
 * plan (UnifiedCarePlan) overdue for review produced ZERO notifications even
 * with the W973 workers live in prod. Layers:
 *   1. BEHAVIORAL (MMS) — an overdue UnifiedCarePlan now yields a severity-
 *      classified notification with the SAME dedupe/payload contract
 *      (+ source:'unified'); legacy rows keep flowing unchanged side-by-side.
 *   2. BACKWARD-COMPAT — factory without unifiedPlanModel behaves exactly as
 *      before (no new required dep); unified query failure never blocks the
 *      legacy scan (fail-soft).
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createOverdueReviewScanner } = require('../intelligence/care-plan-overdue-review.scanner');
const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

/** Minimal legacy-model stub (the factory accepts any model-like .find). */
function legacyStub(rows = []) {
  return {
    find: () => ({
      limit: () => ({ lean: async () => rows }),
    }),
  };
}

function captureNotifier(sink) {
  return { send: async msg => sink.push(msg) };
}

describe('W1253 scanner × UnifiedCarePlan (MMS)', () => {
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

  function planDoc(overrides = {}) {
    return {
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      startDate: new Date('2026-01-01'),
      status: 'active',
      createdBy: new mongoose.Types.ObjectId(),
      approvedBy: new mongoose.Types.ObjectId(),
      nextReviewDate: new Date(Date.now() - 5 * 86400000), // 5 days overdue → warning
      ...overrides,
    };
  }

  test('an overdue UI-authored plan now produces a classified notification', async () => {
    const plan = await UnifiedCarePlan.create(planDoc());
    const sink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      notifier: captureNotifier(sink),
    });

    const res = await scanner.runOnce({});
    expect(res.errors).toHaveLength(0);
    expect(res.scanned).toBe(1);
    expect(res.overdue).toBe(1);
    expect(res.bySeverity.warning).toBe(1); // 5 days → warning band

    expect(sink).toHaveLength(1);
    const msg = sink[0];
    expect(msg.event).toBe('care-plan.review.overdue');
    expect(msg.payload.planVersionId).toBe(String(plan._id));
    expect(msg.payload.source).toBe('unified');
    expect(msg.payload.daysOverdue).toBe(5);
    expect(msg.dedupeKey).toBe(`care-plan.overdue-review.${plan._id}.warning`);
    // info-tier recipients resolved from createdBy/approvedBy mapping
    expect(Array.isArray(msg.audience)).toBe(true);
  });

  test('future-dated + non-live + deleted plans are NOT flagged', async () => {
    await UnifiedCarePlan.create(planDoc({ nextReviewDate: new Date(Date.now() + 86400000) }));
    await UnifiedCarePlan.create(planDoc({ status: 'draft' }));
    await UnifiedCarePlan.create(planDoc({ isDeleted: true }));
    const sink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: legacyStub([]),
      unifiedPlanModel: UnifiedCarePlan,
      notifier: captureNotifier(sink),
    });
    const res = await scanner.runOnce({});
    expect(res.overdue).toBe(0);
    expect(sink).toHaveLength(0);
  });

  test('legacy rows keep flowing unchanged side-by-side (source: legacy)', async () => {
    await UnifiedCarePlan.create(planDoc({ nextReviewDate: new Date(Date.now() - 86400000) }));
    const legacyRow = {
      _id: new mongoose.Types.ObjectId(),
      planId: 'CPV-1',
      status: 'approved',
      reviewSchedule: { nextReviewAt: new Date(Date.now() - 20 * 86400000) }, // critical
    };
    const sink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: legacyStub([legacyRow]),
      unifiedPlanModel: UnifiedCarePlan,
      notifier: captureNotifier(sink),
    });
    const res = await scanner.runOnce({});
    expect(res.scanned).toBe(2);
    expect(res.overdue).toBe(2);
    const sources = sink.map(m => m.payload.source).sort();
    expect(sources).toEqual(['legacy', 'unified']);
  });

  test('backward-compat — factory without unifiedPlanModel scans legacy only', async () => {
    await UnifiedCarePlan.create(planDoc());
    const sink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: legacyStub([]),
      notifier: captureNotifier(sink),
    });
    const res = await scanner.runOnce({});
    expect(res.scanned).toBe(0);
    expect(sink).toHaveLength(0);
  });

  test('fail-soft — unified query failure never blocks the legacy scan', async () => {
    const legacyRow = {
      _id: new mongoose.Types.ObjectId(),
      planId: 'CPV-2',
      reviewSchedule: { nextReviewAt: new Date(Date.now() - 86400000) },
    };
    const broken = {
      find: () => {
        throw new Error('boom');
      },
    };
    const sink = [];
    const scanner = createOverdueReviewScanner({
      planVersionModel: legacyStub([legacyRow]),
      unifiedPlanModel: broken,
      notifier: captureNotifier(sink),
    });
    const res = await scanner.runOnce({});
    expect(res.errors.some(e => e.phase === 'query-unified')).toBe(true);
    expect(res.overdue).toBe(1); // legacy row still processed
  });
});
