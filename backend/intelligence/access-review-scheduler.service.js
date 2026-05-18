'use strict';

/**
 * access-review-scheduler.service.js — Wave 74.
 *
 * Operational layer on top of Wave-72 service + Wave-38 simulator.
 * Turns the User Access Review & Recertification Program from "DPO
 * opens every cycle by hand" into something a cron host can run:
 *
 *   • openCycle               — register a new cycle window
 *   • buildReviewerQueues     — run the simulator over the supplied
 *                               actors, fan results out to reviewer
 *                               queues (role-routed via the registry)
 *   • notifyReviewers         — emit per-reviewer notifications via
 *                               unifiedNotifier (best-effort, never
 *                               throws)
 *   • detectMovers            — event-driven: build a MOVER-review
 *                               task list from HR/IAM mover events
 *   • detectDormantAccounts   — scan users vs threshold, flag
 *                               retired / expired / dormant for a
 *                               DORMANT review
 *   • closeCycle              — fetch attestation aggregate via the
 *                               Wave-72 service, compute coverage,
 *                               return a sealed report blob
 *
 * Stateless by design — the cron host (or operator via POST /cycles)
 * supplies the actor and event lists. We don't introduce a Cycle
 * model in this wave; cycle identity is the cycleId string, and
 * cycle metadata is derived on demand from attestations via the
 * Wave-72 service.
 *
 * Public API returns Result objects: { ok, ... } | { ok:false, reason }.
 */

const reg = require('./access-review.registry');
const reviewerQueue = require('./reviewer-queue.lib');

const DEFAULT_DORMANT_DAYS = 90;
const DEFAULT_EXPIRED_DAYS = 180;
const DEFAULT_RETIRED_DAYS = 365;

function _daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * @param {object} opts
 *   - service    — Wave-72 createAccessReviewService output (for closeCycle)
 *   - simulator  — Wave-38 createAccessReviewSimulator output (for buildReviewerQueues)
 *   - notifier   — unifiedNotifier shape: { send({ event, audience, payload, actor }) }
 *   - resolveAudienceForRole — fn(role, branchId) → array of userIds (optional)
 *   - logger
 *   - now        — () => Date  (for tests)
 */
function createAccessReviewScheduler({
  service = null,
  simulator = null,
  notifier = null,
  resolveAudienceForRole = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  // ─── 1. openCycle ─────────────────────────────────────────────

  function openCycle({ cycleId, scope = null, openedBy = null, openedAt = null } = {}) {
    if (!cycleId || typeof cycleId !== 'string') {
      return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    }
    const opened = openedAt ? new Date(openedAt) : now();
    return {
      ok: true,
      cycle: {
        cycleId,
        scope,
        openedAt: opened.toISOString(),
        openedBy,
        status: 'open',
      },
    };
  }

  // ─── 2. buildReviewerQueues ───────────────────────────────────
  //
  // Given a list of actors (each: { userId, roles, scope, branchId,
  // isServiceAccount, isTempElevated, lastUsedAt }), runs the
  // simulator and groups the resulting tasks by reviewer role.

  function buildReviewerQueues({ cycleId, actors = [] } = {}) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    if (!Array.isArray(actors)) return { ok: false, reason: 'ACTORS_MUST_BE_ARRAY' };
    if (!simulator || typeof simulator.simulateActor !== 'function') {
      return { ok: false, reason: 'SIMULATOR_REQUIRED' };
    }

    // Wave 92 — build tasks first, then delegate routing/sort/count
    // to reviewer-queue.lib. The lib is domain-agnostic so each task
    // carries its own _reviewerRoles[] derived from the registry.
    const tasks = [];
    for (const actor of actors) {
      let report;
      try {
        report = simulator.simulateActor(actor);
      } catch (err) {
        logger.warn && logger.warn(`[scheduler] simulateActor failed: ${err.message}`);
        continue;
      }

      const primaryRole = (actor.roles && actor.roles[0]) || null;
      const reviewerRoles = primaryRole ? reg.getReviewersFor(primaryRole) : ['branch_manager'];

      tasks.push({
        cycleId,
        targetUserId: actor.userId,
        targetRole: primaryRole,
        targetScope: actor.scope || report.effectiveScope || null,
        reviewType: report.requiredReviewType,
        criteria: reg.getCriteriaFor(report.requiredReviewType),
        riskScore: report.riskScore,
        violationCount: report.violations.length,
        dormancyStatus: report.dormancy ? report.dormancy.status : null,
        recommendations: report.recommendations,
        cadence: report.requiredCadence,
        branchId: actor.branchId || null,
        _reviewerRoles: reviewerRoles,
      });
    }

    const grouped = reviewerQueue.buildQueueByRouting({
      items: tasks,
      resolveQueueKeys: t => t._reviewerRoles,
      sortBy: (a, b) => b.riskScore - a.riskScore,
      isHighPriority: t => t.riskScore >= 70,
    });

    // Preserve the existing public shape (queues[].tasks, taskCount,
    // highRiskCount) — strip the internal _reviewerRoles helper field
    // so consumers don't see the routing artifact.
    return {
      ok: true,
      cycleId,
      queues: grouped.queues.map(q => ({
        reviewerRole: q.reviewerRole,
        tasks: q.items.map(({ _reviewerRoles, ...rest }) => rest),
        taskCount: q.itemCount,
        highRiskCount: q.highPriorityCount,
      })),
      totalActors: actors.length,
    };
  }

  // ─── 3. notifyReviewers ───────────────────────────────────────

  async function notifyReviewers({ cycleId, queues = [] } = {}) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    if (!notifier || typeof notifier.send !== 'function') {
      return { ok: false, reason: 'NOTIFIER_UNAVAILABLE' };
    }

    let dispatched = 0;
    const failures = [];

    for (const queue of queues) {
      const { reviewerRole, tasks } = queue;
      if (!Array.isArray(tasks) || tasks.length === 0) continue;

      let audience = [];
      if (typeof resolveAudienceForRole === 'function') {
        try {
          audience = await resolveAudienceForRole(reviewerRole, null);
        } catch (err) {
          logger.warn && logger.warn(`[scheduler] audience resolution failed: ${err.message}`);
        }
      }

      try {
        await notifier.send({
          event: 'access-review.cycle.assigned',
          audience: audience || [],
          payload: {
            cycleId,
            reviewerRole,
            taskCount: tasks.length,
            highRiskCount: queue.highRiskCount,
            topTasks: tasks.slice(0, 5).map(t => ({
              targetUserId: t.targetUserId,
              targetRole: t.targetRole,
              reviewType: t.reviewType,
              riskScore: t.riskScore,
            })),
          },
          actor: { source: 'access-review-scheduler' },
        });
        dispatched += 1;
      } catch (err) {
        failures.push({ reviewerRole, error: err.message });
      }
    }

    return { ok: true, cycleId, dispatched, failures };
  }

  // ─── 4. detectMovers ──────────────────────────────────────────
  //
  // moverEvents: array of { userId, fromRole?, toRole?, fromBranchId?,
  //                         toBranchId?, occurredAt? }
  // Returns the synthetic MOVER tasks ready for a reviewer queue.

  function detectMovers({ cycleId, moverEvents = [] } = {}) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    if (!Array.isArray(moverEvents)) return { ok: false, reason: 'EVENTS_MUST_BE_ARRAY' };

    const tasks = moverEvents
      .filter(e => e && e.userId)
      .map(e => ({
        cycleId,
        targetUserId: e.userId,
        targetRole: e.toRole || e.fromRole || null,
        reviewType: reg.REVIEW_TYPE.MOVER,
        criteria: reg.getCriteriaFor(reg.REVIEW_TYPE.MOVER),
        eventContext: {
          isMove: true,
          fromRole: e.fromRole || null,
          toRole: e.toRole || null,
          fromBranchId: e.fromBranchId || null,
          toBranchId: e.toBranchId || null,
          occurredAt: e.occurredAt || now().toISOString(),
        },
      }));

    return { ok: true, cycleId, tasks, taskCount: tasks.length };
  }

  // ─── 5. detectDormantAccounts ────────────────────────────────
  //
  // users: array of { userId, role, branchId?, lastUsedAt }
  // thresholds: { dormantDays?, expiredDays?, retiredDays? }
  // Returns synthetic DORMANT tasks for anyone past the dormantDays
  // threshold. Higher tiers (expired/retired) get a flag in the
  // task so the reviewer queue can prioritise them.

  function detectDormantAccounts({ cycleId, users = [], thresholds = {} } = {}) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    if (!Array.isArray(users)) return { ok: false, reason: 'USERS_MUST_BE_ARRAY' };

    const dormantDays = thresholds.dormantDays ?? DEFAULT_DORMANT_DAYS;
    const expiredDays = thresholds.expiredDays ?? DEFAULT_EXPIRED_DAYS;
    const retiredDays = thresholds.retiredDays ?? DEFAULT_RETIRED_DAYS;

    const nowDate = now();
    const tasks = [];

    for (const u of users) {
      if (!u || !u.lastUsedAt) continue;
      const days = _daysBetween(nowDate, new Date(u.lastUsedAt));
      if (days < dormantDays) continue;

      let tier = 'dormant';
      if (days >= retiredDays) tier = 'retired';
      else if (days >= expiredDays) tier = 'expired';

      tasks.push({
        cycleId,
        targetUserId: u.userId,
        targetRole: u.role || null,
        reviewType: reg.REVIEW_TYPE.DORMANT,
        criteria: reg.getCriteriaFor(reg.REVIEW_TYPE.DORMANT),
        dormancy: { daysSinceLastUse: days, status: tier },
        branchId: u.branchId || null,
      });
    }

    tasks.sort((a, b) => b.dormancy.daysSinceLastUse - a.dormancy.daysSinceLastUse);

    return {
      ok: true,
      cycleId,
      tasks,
      taskCount: tasks.length,
      thresholds: { dormantDays, expiredDays, retiredDays },
    };
  }

  // ─── 6. closeCycle ───────────────────────────────────────────
  //
  // Pulls cycle-level totals via the Wave-72 service (`getCycleStatus`)
  // and produces a sealed report blob (just a serialisable JSON
  // object — the host can persist it, email it, anchor it, etc.).

  async function closeCycle({ cycleId, closedBy = null, expectedAttestations = null } = {}) {
    if (!cycleId) return { ok: false, reason: 'CYCLE_ID_REQUIRED' };
    if (!service || typeof service.getCycleStatus !== 'function') {
      return { ok: false, reason: 'SERVICE_REQUIRED' };
    }

    let statusResult;
    try {
      statusResult = await service.getCycleStatus(cycleId);
    } catch (err) {
      return { ok: false, reason: 'STATUS_LOOKUP_FAILED', error: err.message };
    }
    if (!statusResult || !statusResult.ok) {
      return { ok: false, reason: statusResult?.reason || 'STATUS_LOOKUP_FAILED' };
    }

    const closedAt = now();
    const totals = statusResult.totals;
    const coverage =
      expectedAttestations && expectedAttestations > 0
        ? Math.min(1, totals.total / expectedAttestations)
        : null;

    const report = {
      cycleId,
      closedAt: closedAt.toISOString(),
      closedBy,
      expectedAttestations,
      coverage,
      coveragePct: coverage != null ? Math.round(coverage * 10000) / 100 : null,
      complete: coverage == null ? null : coverage >= 1,
      totals,
      generatedAt: closedAt.toISOString(),
    };

    return { ok: true, report };
  }

  return {
    openCycle,
    buildReviewerQueues,
    notifyReviewers,
    detectMovers,
    detectDormantAccounts,
    closeCycle,
  };
}

module.exports = {
  createAccessReviewScheduler,
  DEFAULT_DORMANT_DAYS,
  DEFAULT_EXPIRED_DAYS,
  DEFAULT_RETIRED_DAYS,
};
