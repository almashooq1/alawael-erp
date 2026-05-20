'use strict';

/**
 * reassessment-lifecycle-wave222.test.js — Wave 222.
 *
 * Verifies the reassessment task lifecycle state machine:
 *
 *   computePhase (pure):
 *     - Boundary matrix across SCHEDULED → BREACHED
 *     - Custom policy overrides
 *     - dueAt missing → SCHEDULED (defensive)
 *
 *   tick() integration:
 *     - SCHEDULED task → DUE_SOON when within 7d
 *     - Idempotent: re-running tick with same clock = no transition
 *     - phaseHistory appended on transition, untouched on no-op
 *     - escalatedAt / breachedAt stamped on first entry into each
 *     - overdueDays refreshed
 *     - Completed/cancelled tasks NOT touched
 *     - statusIn filter scopes to pending|acknowledged
 *     - Branch + beneficiary filters honoured
 *
 *   acknowledgeTask:
 *     - pending → acknowledged with timestamp + actor
 *     - Idempotent on already-acknowledged
 *     - No-op on completed (terminal state)
 *     - Requires actor.userId
 *     - Phase NOT changed by ack
 *
 *   reviewBreach:
 *     - Requires phase=BREACHED
 *     - Stamps breachReviewedAt/By/Notes
 *     - Refuses on non-breached task
 *
 *   listByPhase:
 *     - Filters by phase
 *     - Defaults to pending|acknowledged statuses
 *     - Rejects invalid phase
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let MeasureReassessmentTask;
let TASK_PHASES;
let lifecycle;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w222-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({
    MeasureReassessmentTask,
    TASK_PHASES,
  } = require('../domains/goals/models/MeasureReassessmentTask'));
  lifecycle = require('../services/reassessmentLifecycle.service');
  await MeasureReassessmentTask.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureReassessmentTask.deleteMany({});
});

// ─── Helpers ───────────────────────────────────────────────────────────

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function daysFrom(refDate, days) {
  return new Date(refDate.getTime() + days * DAY);
}

async function makeTask({
  beneficiaryId,
  measureId,
  dueAt,
  status = 'pending',
  phase = 'SCHEDULED',
  branchId,
}) {
  return MeasureReassessmentTask.create({
    beneficiaryId: beneficiaryId || new mongoose.Types.ObjectId(),
    measureId: measureId || new mongoose.Types.ObjectId(),
    measureCode: 'BERG',
    standardIntervalDays: 90,
    dueAt,
    overdueDays: 0,
    status,
    phase,
    branchId,
    ...(status === 'completed' ? { completedAt: new Date() } : {}),
    ...(status === 'cancelled' ? { cancelledAt: new Date(), cancellationReason: 'test' } : {}),
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. computePhase — pure boundary matrix
// ════════════════════════════════════════════════════════════════════════

describe('W222 — computePhase boundary matrix', () => {
  const NOW = new Date('2026-05-20T12:00:00Z');

  test.each([
    // [daysOffset, expectedPhase]
    // dueAt = NOW + 30d → far future
    [30, 'SCHEDULED'],
    [10, 'SCHEDULED'], // d = -10, threshold = -7, so still SCHEDULED
    [8, 'SCHEDULED'],
    [7.5, 'SCHEDULED'], // d = -7.5  →  SCHEDULED
    // d in (-7, -1] → DUE_SOON
    [6, 'DUE_SOON'],
    [3, 'DUE_SOON'],
    [1.5, 'DUE_SOON'],
    // d in (-1, 1] → DUE_NOW
    [0.5, 'DUE_NOW'],
    [0, 'DUE_NOW'],
    [-0.5, 'DUE_NOW'],
    // d in (1, 7] → OVERDUE
    [-2, 'OVERDUE'],
    [-5, 'OVERDUE'],
    [-7, 'OVERDUE'],
    // d in (7, 14] → ESCALATED
    [-8, 'ESCALATED'],
    [-13, 'ESCALATED'],
    [-14, 'ESCALATED'],
    // d > 14 → BREACHED
    [-15, 'BREACHED'],
    [-30, 'BREACHED'],
    [-365, 'BREACHED'],
  ])('dueAt = now + %sd → phase=%s', (daysOffset, expected) => {
    const dueAt = daysFrom(NOW, daysOffset);
    expect(lifecycle.computePhase({ dueAt, now: NOW })).toBe(TASK_PHASES[expected]);
  });

  test('missing dueAt → SCHEDULED (defensive)', () => {
    expect(lifecycle.computePhase({ dueAt: null, now: new Date() })).toBe(TASK_PHASES.SCHEDULED);
  });

  test('custom policy with tighter escalation', () => {
    const NOW2 = new Date('2026-05-20T12:00:00Z');
    const policy = { escalateAfterDays: 3, breachAfterDays: 5 };
    // d = 4 → tighter policy says ESCALATED (default would be OVERDUE)
    expect(lifecycle.computePhase({ dueAt: daysFrom(NOW2, -4), now: NOW2, policy })).toBe(
      TASK_PHASES.ESCALATED
    );
    // d = 6 → tighter policy says BREACHED
    expect(lifecycle.computePhase({ dueAt: daysFrom(NOW2, -6), now: NOW2, policy })).toBe(
      TASK_PHASES.BREACHED
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. tick() — DB integration
// ════════════════════════════════════════════════════════════════════════

describe('W222 — tick() transitions', () => {
  test('SCHEDULED → DUE_SOON when within 7d', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt: daysFrom(NOW, 5) }); // 5d ahead
    const out = await lifecycle.tick({ now: NOW });
    expect(out.scanned).toBe(1);
    expect(out.transitioned).toBe(1);
    expect(out.byPhase.DUE_SOON).toBe(1);
    const after = await MeasureReassessmentTask.findById(task._id).lean();
    expect(after.phase).toBe('DUE_SOON');
    expect(after.phaseHistory.length).toBe(1);
    expect(after.phaseHistory[0].phase).toBe('DUE_SOON');
    expect(after.phaseHistory[0].transitionedBy).toBe('system');
  });

  test('idempotent — re-running tick is a no-op', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt: daysFrom(NOW, 5) });
    await lifecycle.tick({ now: NOW });
    const after1 = await MeasureReassessmentTask.findById(task._id).lean();
    const out2 = await lifecycle.tick({ now: NOW });
    expect(out2.transitioned).toBe(0);
    const after2 = await MeasureReassessmentTask.findById(task._id).lean();
    expect(after2.phaseHistory.length).toBe(1); // unchanged
    expect(after2.updatedAt.getTime()).toBe(after1.updatedAt.getTime());
  });

  test('full lifecycle SCHEDULED → DUE_SOON → DUE_NOW → OVERDUE → ESCALATED → BREACHED', async () => {
    const dueAt = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt });
    // T-10d → SCHEDULED stays
    await lifecycle.tick({ now: daysFrom(dueAt, -10) });
    let t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('SCHEDULED');
    expect(t.phaseHistory.length).toBe(0);

    // T-5d → DUE_SOON
    await lifecycle.tick({ now: daysFrom(dueAt, -5) });
    t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('DUE_SOON');

    // T+0d → DUE_NOW (d = 0)
    await lifecycle.tick({ now: dueAt });
    t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('DUE_NOW');

    // T+3d → OVERDUE
    await lifecycle.tick({ now: daysFrom(dueAt, 3) });
    t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('OVERDUE');
    expect(t.overdueDays).toBe(3);

    // T+9d → ESCALATED
    await lifecycle.tick({ now: daysFrom(dueAt, 9) });
    t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('ESCALATED');
    expect(t.escalatedAt).toBeTruthy();

    // T+20d → BREACHED
    await lifecycle.tick({ now: daysFrom(dueAt, 20) });
    t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('BREACHED');
    expect(t.breachedAt).toBeTruthy();
    expect(t.overdueDays).toBe(20);

    // phaseHistory should have 5 entries (one per transition).
    expect(t.phaseHistory.length).toBe(5);
    expect(t.phaseHistory.map(h => h.phase)).toEqual([
      'DUE_SOON',
      'DUE_NOW',
      'OVERDUE',
      'ESCALATED',
      'BREACHED',
    ]);
  });

  test('escalatedAt/breachedAt stamped only on first entry', async () => {
    const dueAt = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt });
    await lifecycle.tick({ now: daysFrom(dueAt, 9) }); // ESCALATED
    const t1 = await MeasureReassessmentTask.findById(task._id).lean();
    const firstEscalatedAt = t1.escalatedAt.getTime();
    // Tick again at T+10d (still ESCALATED) — should NOT re-stamp.
    await lifecycle.tick({ now: daysFrom(dueAt, 10) });
    const t2 = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t2.escalatedAt.getTime()).toBe(firstEscalatedAt);
  });

  test('completed/cancelled tasks are NOT touched', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const completed = await makeTask({ dueAt: daysFrom(NOW, -10), status: 'completed' });
    const cancelled = await makeTask({ dueAt: daysFrom(NOW, -10), status: 'cancelled' });
    const out = await lifecycle.tick({ now: NOW });
    expect(out.scanned).toBe(0);
    const c = await MeasureReassessmentTask.findById(completed._id).lean();
    const x = await MeasureReassessmentTask.findById(cancelled._id).lean();
    expect(c.phase).toBe('SCHEDULED'); // unchanged
    expect(x.phase).toBe('SCHEDULED');
    expect(c.phaseHistory.length).toBe(0);
  });

  test('acknowledged task still gets phase transitions', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt: daysFrom(NOW, -3), status: 'acknowledged' });
    await lifecycle.tick({ now: NOW });
    const t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.phase).toBe('OVERDUE');
    expect(t.status).toBe('acknowledged'); // status untouched
  });

  test('branch filter scopes the tick', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const tA = await makeTask({ dueAt: daysFrom(NOW, -3), branchId: branchA });
    const tB = await makeTask({ dueAt: daysFrom(NOW, -3), branchId: branchB });
    const out = await lifecycle.tick({ now: NOW, branchId: branchA });
    expect(out.scanned).toBe(1);
    expect(out.transitioned).toBe(1);
    const a = await MeasureReassessmentTask.findById(tA._id).lean();
    const b = await MeasureReassessmentTask.findById(tB._id).lean();
    expect(a.phase).toBe('OVERDUE');
    expect(b.phase).toBe('SCHEDULED'); // untouched
  });

  test('beneficiary filter scopes the tick', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();
    await makeTask({ dueAt: daysFrom(NOW, -3), beneficiaryId: benA });
    await makeTask({ dueAt: daysFrom(NOW, -3), beneficiaryId: benB });
    const out = await lifecycle.tick({ now: NOW, beneficiaryId: benA });
    expect(out.scanned).toBe(1);
  });

  test('off-switch via env returns disabled summary', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    await makeTask({ dueAt: daysFrom(NOW, -3) });
    const orig = process.env.MEASURE_REASSESS_LIFECYCLE;
    process.env.MEASURE_REASSESS_LIFECYCLE = 'off';
    try {
      const out = await lifecycle.tick({ now: NOW });
      expect(out.disabled).toBe(true);
      expect(out.scanned).toBe(0);
    } finally {
      if (orig === undefined) {
        delete process.env.MEASURE_REASSESS_LIFECYCLE;
      } else {
        process.env.MEASURE_REASSESS_LIFECYCLE = orig;
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. acknowledgeTask
// ════════════════════════════════════════════════════════════════════════

describe('W222 — acknowledgeTask', () => {
  test('pending → acknowledged with timestamp + actor', async () => {
    const task = await makeTask({ dueAt: new Date() });
    const actorId = new mongoose.Types.ObjectId();
    const out = await lifecycle.acknowledgeTask({
      taskId: task._id,
      actor: { userId: actorId },
    });
    expect(out.status).toBe('acknowledged');
    expect(out.acknowledgedAt).toBeTruthy();
    expect(String(out.acknowledgedBy)).toBe(String(actorId));
  });

  test('phase unchanged by ack', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt: daysFrom(NOW, -5), phase: 'OVERDUE' });
    await lifecycle.acknowledgeTask({
      taskId: task._id,
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    const after = await MeasureReassessmentTask.findById(task._id).lean();
    expect(after.phase).toBe('OVERDUE');
  });

  test('idempotent on already-acknowledged', async () => {
    const task = await makeTask({ dueAt: new Date() });
    const actorId = new mongoose.Types.ObjectId();
    await lifecycle.acknowledgeTask({ taskId: task._id, actor: { userId: actorId } });
    const r = await lifecycle.acknowledgeTask({
      taskId: task._id,
      actor: { userId: actorId },
    });
    expect(r.status).toBe('acknowledged');
  });

  test('no-op on completed task', async () => {
    const task = await makeTask({ dueAt: new Date(), status: 'completed' });
    const r = await lifecycle.acknowledgeTask({
      taskId: task._id,
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    expect(r.status).toBe('completed');
  });

  test('requires actor.userId', async () => {
    const task = await makeTask({ dueAt: new Date() });
    await expect(lifecycle.acknowledgeTask({ taskId: task._id })).rejects.toThrow(
      /actor\.userId required/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. reviewBreach
// ════════════════════════════════════════════════════════════════════════

describe('W222 — reviewBreach', () => {
  test('stamps reviewer when phase=BREACHED', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    const task = await makeTask({ dueAt: daysFrom(NOW, -20), phase: 'BREACHED' });
    const reviewerId = new mongoose.Types.ObjectId();
    const r = await lifecycle.reviewBreach({
      taskId: task._id,
      actor: { userId: reviewerId },
      notes: 'team-lead reviewed, family contact attempt pending',
    });
    expect(r.breachReviewedAt).toBeTruthy();
    expect(String(r.breachReviewedBy)).toBe(String(reviewerId));
    expect(r.breachReviewNotes).toMatch(/family contact/);
  });

  test('refuses on non-breached task', async () => {
    const task = await makeTask({ dueAt: new Date(), phase: 'OVERDUE' });
    await expect(
      lifecycle.reviewBreach({
        taskId: task._id,
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/phase=BREACHED/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. listByPhase
// ════════════════════════════════════════════════════════════════════════

describe('W222 — listByPhase', () => {
  test('filters by phase', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    await makeTask({ dueAt: daysFrom(NOW, -3), phase: 'OVERDUE' });
    await makeTask({ dueAt: daysFrom(NOW, -10), phase: 'ESCALATED' });
    await makeTask({ dueAt: daysFrom(NOW, -20), phase: 'BREACHED' });
    const overdue = await lifecycle.listByPhase({ phase: 'OVERDUE' });
    expect(overdue.length).toBe(1);
    const breached = await lifecycle.listByPhase({ phase: 'BREACHED' });
    expect(breached.length).toBe(1);
  });

  test('defaults to pending|acknowledged statuses', async () => {
    const NOW = new Date('2026-05-20T12:00:00Z');
    await makeTask({ dueAt: daysFrom(NOW, -3), phase: 'OVERDUE', status: 'completed' });
    await makeTask({ dueAt: daysFrom(NOW, -3), phase: 'OVERDUE', status: 'pending' });
    const list = await lifecycle.listByPhase({ phase: 'OVERDUE' });
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('pending');
  });

  test('rejects invalid phase', async () => {
    await expect(lifecycle.listByPhase({ phase: 'BOGUS' })).rejects.toThrow(/invalid phase/);
  });
});
