/**
 * access-review-scheduler-wave74.test.js — Wave 74.
 *
 * Unit tests for the operational scheduler on top of Wave-72 service
 * and Wave-38 simulator. Covers:
 *
 *   1. openCycle      — id required, returns metadata
 *   2. buildReviewerQueues — runs simulator, groups by reviewer role,
 *      sorts DESC by riskScore, default fallback reviewer for unknown
 *      roles, missing simulator returns SIMULATOR_REQUIRED
 *   3. notifyReviewers — calls notifier per queue with summarised
 *      payload, missing notifier returns NOTIFIER_UNAVAILABLE,
 *      per-queue notifier failure is captured but doesn't abort the
 *      others, audience resolved via injected helper
 *   4. detectMovers   — synthesises MOVER tasks, includes
 *      eventContext.isMove
 *   5. detectDormantAccounts — tiers (dormant/expired/retired) by
 *      lastUsedAt threshold, DESC by days, custom thresholds honored
 *   6. closeCycle     — coverage computed when expected provided,
 *      null coverage otherwise, propagates STATUS_LOOKUP_FAILED
 *
 * No live DB, no live notifier — all collaborators are injected as
 * simple stubs.
 */

'use strict';

const {
  createAccessReviewScheduler,
  DEFAULT_DORMANT_DAYS,
} = require('../intelligence/access-review-scheduler.service');
const { createAccessReviewSimulator } = require('../intelligence/access-review-simulator.service');

// ─── Helpers ────────────────────────────────────────────────────────

function fakeNotifier() {
  const sent = [];
  return {
    sent,
    send: async args => {
      sent.push(args);
    },
  };
}

function failingNotifier(failOnRole) {
  const sent = [];
  return {
    sent,
    send: async args => {
      if (args.payload && args.payload.reviewerRole === failOnRole) {
        throw new Error(`notifier blew up for ${failOnRole}`);
      }
      sent.push(args);
    },
  };
}

function fakeService(statusResult) {
  return {
    getCycleStatus: async cycleId => {
      if (statusResult && typeof statusResult === 'function') {
        return statusResult(cycleId);
      }
      return statusResult;
    },
  };
}

// ─── 1. openCycle ───────────────────────────────────────────────────

describe('access-review-scheduler — openCycle', () => {
  test('rejects missing cycleId', () => {
    const sch = createAccessReviewScheduler();
    expect(sch.openCycle({}).reason).toBe('CYCLE_ID_REQUIRED');
  });

  test('returns cycle metadata with default openedAt', () => {
    const sch = createAccessReviewScheduler({ now: () => new Date('2026-05-18T00:00:00Z') });
    const res = sch.openCycle({ cycleId: 'Q2-2026', scope: 'GLOBAL', openedBy: 'dpo-1' });
    expect(res.ok).toBe(true);
    expect(res.cycle.cycleId).toBe('Q2-2026');
    expect(res.cycle.scope).toBe('GLOBAL');
    expect(res.cycle.openedBy).toBe('dpo-1');
    expect(res.cycle.openedAt).toBe('2026-05-18T00:00:00.000Z');
    expect(res.cycle.status).toBe('open');
  });
});

// ─── 2. buildReviewerQueues ─────────────────────────────────────────

describe('access-review-scheduler — buildReviewerQueues', () => {
  test('rejects without simulator', () => {
    const sch = createAccessReviewScheduler();
    const res = sch.buildReviewerQueues({ cycleId: 'C', actors: [] });
    expect(res.reason).toBe('SIMULATOR_REQUIRED');
  });

  test('rejects non-array actors', () => {
    const sch = createAccessReviewScheduler({ simulator: createAccessReviewSimulator() });
    const res = sch.buildReviewerQueues({ cycleId: 'C', actors: 'oops' });
    expect(res.reason).toBe('ACTORS_MUST_BE_ARRAY');
  });

  test('groups tasks by reviewer role and sorts DESC by riskScore', () => {
    const sch = createAccessReviewScheduler({ simulator: createAccessReviewSimulator() });
    const actors = [
      { userId: 'u1', roles: ['therapist'] }, // → reviewer: branch_manager
      { userId: 'u2', roles: ['ciso'] }, // → reviewer: ceo, audit_committee_chair
      { userId: 'u3', roles: ['therapist'] }, // → reviewer: branch_manager
    ];
    const res = sch.buildReviewerQueues({ cycleId: 'C', actors });
    expect(res.ok).toBe(true);
    expect(res.totalActors).toBe(3);

    const bmQueue = res.queues.find(q => q.reviewerRole === 'branch_manager');
    expect(bmQueue).toBeDefined();
    expect(bmQueue.taskCount).toBe(2);
    // Tasks DESC by riskScore (therapist with no conflicts → equal scores, any order)
    expect(bmQueue.tasks[0].riskScore).toBeGreaterThanOrEqual(bmQueue.tasks[1].riskScore);

    // ciso → ceo + audit_committee_chair queues
    const ceoQueue = res.queues.find(q => q.reviewerRole === 'ceo');
    expect(ceoQueue).toBeDefined();
    expect(ceoQueue.tasks[0].targetUserId).toBe('u2');
  });

  test('falls back to branch_manager for unrouted roles', () => {
    const sch = createAccessReviewScheduler({ simulator: createAccessReviewSimulator() });
    const res = sch.buildReviewerQueues({
      cycleId: 'C',
      actors: [{ userId: 'u1', roles: ['some_unknown_role'] }],
    });
    expect(res.ok).toBe(true);
    const queue = res.queues.find(q => q.reviewerRole === 'branch_manager');
    expect(queue).toBeDefined();
    expect(queue.tasks).toHaveLength(1);
  });

  test('skips actor when simulator throws', () => {
    const blowingSim = {
      simulateActor: () => {
        throw new Error('boom');
      },
    };
    const sch = createAccessReviewScheduler({ simulator: blowingSim });
    const res = sch.buildReviewerQueues({
      cycleId: 'C',
      actors: [{ userId: 'u1', roles: ['therapist'] }],
    });
    expect(res.ok).toBe(true);
    expect(res.queues).toEqual([]);
  });
});

// ─── 3. notifyReviewers ─────────────────────────────────────────────

describe('access-review-scheduler — notifyReviewers', () => {
  test('rejects missing notifier', async () => {
    const sch = createAccessReviewScheduler();
    const res = await sch.notifyReviewers({ cycleId: 'C', queues: [] });
    expect(res.reason).toBe('NOTIFIER_UNAVAILABLE');
  });

  test('emits one notification per non-empty queue with summary payload', async () => {
    const n = fakeNotifier();
    const sch = createAccessReviewScheduler({
      notifier: n,
      resolveAudienceForRole: async role => [`${role}-user-1`, `${role}-user-2`],
    });
    const queues = [
      {
        reviewerRole: 'branch_manager',
        tasks: [
          { targetUserId: 'u1', targetRole: 'therapist', reviewType: 'quarterly', riskScore: 12 },
        ],
        highRiskCount: 0,
      },
      {
        reviewerRole: 'ceo',
        tasks: [
          { targetUserId: 'u2', targetRole: 'ciso', reviewType: 'privileged', riskScore: 88 },
        ],
        highRiskCount: 1,
      },
      { reviewerRole: 'empty', tasks: [], highRiskCount: 0 },
    ];
    const res = await sch.notifyReviewers({ cycleId: 'Q2-2026', queues });
    expect(res.ok).toBe(true);
    expect(res.dispatched).toBe(2);
    expect(res.failures).toEqual([]);
    expect(n.sent).toHaveLength(2);
    expect(n.sent[0].event).toBe('access-review.cycle.assigned');
    expect(n.sent[0].audience).toEqual(['branch_manager-user-1', 'branch_manager-user-2']);
    expect(n.sent[0].payload.taskCount).toBe(1);
    expect(n.sent[1].payload.reviewerRole).toBe('ceo');
    expect(n.sent[1].payload.highRiskCount).toBe(1);
  });

  test('captures per-queue failures without aborting others', async () => {
    const n = failingNotifier('blowup');
    const sch = createAccessReviewScheduler({ notifier: n });
    const res = await sch.notifyReviewers({
      cycleId: 'C',
      queues: [
        { reviewerRole: 'blowup', tasks: [{ riskScore: 1 }], highRiskCount: 0 },
        { reviewerRole: 'fine', tasks: [{ riskScore: 1 }], highRiskCount: 0 },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.dispatched).toBe(1);
    expect(res.failures).toEqual([
      { reviewerRole: 'blowup', error: 'notifier blew up for blowup' },
    ]);
  });
});

// ─── 4. detectMovers ────────────────────────────────────────────────

describe('access-review-scheduler — detectMovers', () => {
  test('produces MOVER tasks with eventContext', () => {
    const sch = createAccessReviewScheduler({ now: () => new Date('2026-05-18T00:00:00Z') });
    const res = sch.detectMovers({
      cycleId: 'mover-batch-1',
      moverEvents: [
        {
          userId: 'u1',
          fromRole: 'receptionist',
          toRole: 'branch.admin',
          fromBranchId: 'b1',
          toBranchId: 'b2',
        },
        { userId: 'u2', toRole: 'therapist' },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.taskCount).toBe(2);
    expect(res.tasks[0].reviewType).toBe('mover');
    expect(res.tasks[0].targetRole).toBe('branch.admin');
    expect(res.tasks[0].eventContext.isMove).toBe(true);
    expect(res.tasks[0].eventContext.fromBranchId).toBe('b1');
  });

  test('filters events missing userId', () => {
    const sch = createAccessReviewScheduler();
    const res = sch.detectMovers({
      cycleId: 'X',
      moverEvents: [{ userId: 'u1' }, { fromRole: 'X' }, null],
    });
    expect(res.taskCount).toBe(1);
  });
});

// ─── 5. detectDormantAccounts ──────────────────────────────────────

describe('access-review-scheduler — detectDormantAccounts', () => {
  const FIXED_NOW = new Date('2026-05-18T00:00:00Z');

  test('tiers users by last-used age', () => {
    const sch = createAccessReviewScheduler({ now: () => FIXED_NOW });
    const mk = days => new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const res = sch.detectDormantAccounts({
      cycleId: 'dormant-scan-1',
      users: [
        { userId: 'fresh', role: 'therapist', lastUsedAt: mk(10) }, // < DORMANT
        { userId: 'dormant', role: 'therapist', lastUsedAt: mk(100) }, // 100 ≥ 90
        { userId: 'expired', role: 'therapist', lastUsedAt: mk(200) }, // 200 ≥ 180
        { userId: 'retired', role: 'therapist', lastUsedAt: mk(400) }, // 400 ≥ 365
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.taskCount).toBe(3);
    // DESC by daysSinceLastUse
    expect(res.tasks[0].targetUserId).toBe('retired');
    expect(res.tasks[0].dormancy.status).toBe('retired');
    expect(res.tasks[1].targetUserId).toBe('expired');
    expect(res.tasks[1].dormancy.status).toBe('expired');
    expect(res.tasks[2].targetUserId).toBe('dormant');
    expect(res.tasks[2].dormancy.status).toBe('dormant');
  });

  test('honors custom thresholds', () => {
    const sch = createAccessReviewScheduler({ now: () => FIXED_NOW });
    const mk = days => new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const res = sch.detectDormantAccounts({
      cycleId: 'X',
      users: [{ userId: 'u1', lastUsedAt: mk(40) }],
      thresholds: { dormantDays: 30, expiredDays: 60, retiredDays: 90 },
    });
    expect(res.taskCount).toBe(1);
    expect(res.tasks[0].dormancy.status).toBe('dormant');
    expect(res.thresholds.dormantDays).toBe(30);
  });

  test('uses defaults when thresholds absent', () => {
    const sch = createAccessReviewScheduler({ now: () => FIXED_NOW });
    const res = sch.detectDormantAccounts({ cycleId: 'X', users: [] });
    expect(res.thresholds.dormantDays).toBe(DEFAULT_DORMANT_DAYS);
  });
});

// ─── 6. closeCycle ──────────────────────────────────────────────────

describe('access-review-scheduler — closeCycle', () => {
  test('requires service', async () => {
    const sch = createAccessReviewScheduler();
    const res = await sch.closeCycle({ cycleId: 'C' });
    expect(res.reason).toBe('SERVICE_REQUIRED');
  });

  test('returns sealed report with totals and coverage when expected provided', async () => {
    const svc = fakeService({
      ok: true,
      cycleId: 'C',
      totals: {
        byType: { quarterly: 4 },
        byDecision: { CERTIFY: 3, REVOKE: 1 },
        total: 4,
        revokeRate: 25,
      },
    });
    const sch = createAccessReviewScheduler({
      service: svc,
      now: () => new Date('2026-05-18T00:00:00Z'),
    });
    const res = await sch.closeCycle({ cycleId: 'C', expectedAttestations: 5, closedBy: 'dpo-1' });
    expect(res.ok).toBe(true);
    expect(res.report.totals.total).toBe(4);
    expect(res.report.coverage).toBe(0.8);
    expect(res.report.coveragePct).toBe(80);
    expect(res.report.complete).toBe(false);
    expect(res.report.closedBy).toBe('dpo-1');
    expect(res.report.closedAt).toBe('2026-05-18T00:00:00.000Z');
  });

  test('null coverage when expectedAttestations not provided', async () => {
    const svc = fakeService({
      ok: true,
      totals: { byType: {}, byDecision: {}, total: 0, revokeRate: 0 },
    });
    const sch = createAccessReviewScheduler({ service: svc });
    const res = await sch.closeCycle({ cycleId: 'C' });
    expect(res.ok).toBe(true);
    expect(res.report.coverage).toBeNull();
    expect(res.report.complete).toBeNull();
  });

  test('propagates STATUS_LOOKUP_FAILED on thrown error', async () => {
    const svc = {
      getCycleStatus: async () => {
        throw new Error('mongo down');
      },
    };
    const sch = createAccessReviewScheduler({ service: svc });
    const res = await sch.closeCycle({ cycleId: 'C' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('STATUS_LOOKUP_FAILED');
  });
});
