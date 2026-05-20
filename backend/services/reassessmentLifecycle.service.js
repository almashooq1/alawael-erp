'use strict';

/**
 * reassessmentLifecycle.service.js — Wave 222
 * ════════════════════════════════════════════════════════════════════
 * Reassessment Task Lifecycle / State Machine
 *
 * Computes and persists the `phase` field on MeasureReassessmentTask
 * rows based on `dueAt` vs the wall clock. Six phases:
 *
 *   SCHEDULED  — dueAt is more than 7 days away
 *   DUE_SOON   — within 7 days of dueAt (T-7 .. T-1)
 *   DUE_NOW    — within 1 day of dueAt (T-1 .. T+1)
 *   OVERDUE    — more than 1 day past dueAt (T+1 .. T+7)
 *   ESCALATED  — more than 7 days past dueAt (T+7 .. T+14)
 *   BREACHED   — more than 14 days past dueAt
 *
 * Boundary semantics (deterministic):
 *
 *   d ≤ -7   → SCHEDULED
 *   -7 < d ≤ -1 → DUE_SOON
 *   -1 < d ≤ 1  → DUE_NOW
 *   1 < d ≤ 7   → OVERDUE
 *   7 < d ≤ 14  → ESCALATED
 *   d > 14      → BREACHED
 *
 * where d = (now - dueAt) in days.
 *
 * Independent of `status` (clinician-action axis). A task can be
 * status='acknowledged' AND phase='BREACHED' — the clinician saw the
 * task but hasn't completed the administration.
 *
 * Idempotent: `tick()` re-running with the same clock is a no-op.
 * phaseHistory only gets a new entry when the computed phase differs
 * from the persisted phase. Off-switch via
 * `process.env.MEASURE_REASSESS_LIFECYCLE='off'`.
 *
 * Service surface:
 *   computePhase({dueAt, now, policy?})       — pure
 *   tick({now, branchId?, beneficiaryId?})    — idempotent persist
 *   acknowledgeTask({taskId, actor})          — status flip + audit
 *   reviewBreach({taskId, actor, notes})      — manual breach review
 *   listByPhase({phase, branchId?})           — read-side
 *
 * The reminder cascade (T-7 → T+14 notifications) lives separately;
 * this service just maintains the phase field that the dispatcher
 * keys off.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const DEFAULT_POLICY = Object.freeze({
  dueSoonDays: 7, // phase becomes DUE_SOON when within this many days
  dueNowDays: 1, // phase becomes DUE_NOW when within this many days
  overdueDays: 1, // OVERDUE starts at d > overdueDays
  escalateAfterDays: 7, // ESCALATED at d > escalateAfterDays
  breachAfterDays: 14, // BREACHED at d > breachAfterDays
});

// ─── Lazy model loaders (W214 pattern) ────────────────────────────────
const M = {
  MeasureReassessmentTask: () => {
    try {
      return mongoose.model('MeasureReassessmentTask');
    } catch {
      try {
        require('../domains/goals/models/MeasureReassessmentTask');
        return mongoose.model('MeasureReassessmentTask');
      } catch {
        return null;
      }
    }
  },
};

function _loadPhases() {
  return require('../domains/goals/models/MeasureReassessmentTask').TASK_PHASES;
}

function _isEnabled() {
  const flag = (process.env.MEASURE_REASSESS_LIFECYCLE || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

function _daysBetween(later, earlier) {
  return (later.getTime() - earlier.getTime()) / 86400000;
}

/**
 * Pure phase computation. No DB, no time-zone math beyond ms diff.
 * Exported for unit testing the boundary matrix without spinning up
 * Mongo.
 *
 * @param {Object} args
 * @param {Date}   args.dueAt
 * @param {Date}   [args.now]
 * @param {Object} [args.policy]    — { dueSoonDays, dueNowDays, overdueDays, escalateAfterDays, breachAfterDays }
 * @returns {string} one of TASK_PHASES
 */
function computePhase({ dueAt, now, policy } = {}) {
  const PHASES = _loadPhases();
  const p = { ...DEFAULT_POLICY, ...(policy || {}) };
  if (!dueAt) return PHASES.SCHEDULED;
  const d = _daysBetween(now || new Date(), new Date(dueAt));
  if (d > p.breachAfterDays) return PHASES.BREACHED;
  if (d > p.escalateAfterDays) return PHASES.ESCALATED;
  if (d > p.overdueDays) return PHASES.OVERDUE;
  if (d > -p.dueNowDays) return PHASES.DUE_NOW; // d in (-1, 1]
  if (d > -p.dueSoonDays) return PHASES.DUE_SOON; // d in (-7, -1]
  return PHASES.SCHEDULED;
}

class ReassessmentLifecycleSvc {
  /**
   * Run one pass. For each pending|acknowledged task whose current
   * persisted phase differs from the computed phase, update + append
   * to phaseHistory. Returns a summary keyed by phase plus
   * {scanned, transitioned, errors[]}.
   *
   * Completed/cancelled tasks are NOT touched — their phase at close
   * time is the final record.
   */
  async tick({ now, branchId, beneficiaryId, policy } = {}) {
    if (!_isEnabled()) {
      return { scanned: 0, transitioned: 0, byPhase: {}, disabled: true, errors: [] };
    }
    const Task = M.MeasureReassessmentTask();
    if (!Task) {
      throw new Error('[reassessmentLifecycle] MeasureReassessmentTask model unavailable');
    }
    const clock = now || new Date();
    const PHASES = _loadPhases();
    const byPhase = Object.fromEntries(Object.values(PHASES).map(p => [p, 0]));
    const errors = [];
    let scanned = 0;
    let transitioned = 0;

    const filter = { status: { $in: ['pending', 'acknowledged'] } };
    if (branchId) filter.branchId = branchId;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;

    // Stream rather than load — pending queues can grow.
    const cursor = Task.find(filter).cursor();
    for await (const task of cursor) {
      scanned += 1;
      try {
        const desired = computePhase({ dueAt: task.dueAt, now: clock, policy });
        byPhase[desired] = (byPhase[desired] || 0) + 1;

        if (task.phase === desired) continue; // idempotent — no change

        const prev = task.phase || PHASES.SCHEDULED;
        task.phase = desired;
        task.phaseHistory = task.phaseHistory || [];
        task.phaseHistory.push({
          phase: desired,
          enteredAt: clock,
          transitionedBy: 'system',
        });

        // Phase-entry side-effects: stamp the dedicated timestamps so
        // downstream code (alert dispatcher, CBAHI evidence stream) can
        // read a single field rather than scanning the history array.
        if (desired === PHASES.ESCALATED && !task.escalatedAt) {
          task.escalatedAt = clock;
        }
        if (desired === PHASES.BREACHED && !task.breachedAt) {
          task.breachedAt = clock;
        }

        // Refresh overdueDays as a convenience (was kept on the task by
        // W214 but only set at creation). Keeps overdue dashboards
        // truthful between scheduler ticks.
        const d = _daysBetween(clock, new Date(task.dueAt));
        task.overdueDays = Math.max(0, Math.floor(d));

        await task.save();
        transitioned += 1;
        // Log silently — no warning here. Transitions are expected
        // and noisy.
        logger.debug?.(
          '[reassessmentLifecycle] %s → %s (taskId=%s, d=%sd)',
          prev,
          desired,
          String(task._id),
          d.toFixed(2)
        );
      } catch (err) {
        errors.push({ taskId: String(task._id), message: err.message });
        logger.warn('[reassessmentLifecycle] tick failed for task %s: %s', task._id, err.message);
      }
    }

    return { scanned, transitioned, byPhase, errors };
  }

  /**
   * Clinician acknowledgement. Flips status pending→acknowledged and
   * stamps acknowledgedAt + acknowledgedBy. Phase is NOT touched —
   * the time-based machine continues to run.
   */
  async acknowledgeTask({ taskId, actor }) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) throw new Error('[reassessmentLifecycle] task model unavailable');
    if (!taskId) throw new Error('[reassessmentLifecycle] taskId required');
    if (!actor || !actor.userId) {
      throw new Error('[reassessmentLifecycle] actor.userId required for ack');
    }
    const task = await Task.findById(taskId);
    if (!task) throw new Error(`[reassessmentLifecycle] task not found: ${taskId}`);
    if (task.status === 'completed' || task.status === 'cancelled') {
      // Idempotent — terminal states don't accept new ack.
      return task;
    }
    if (task.status === 'acknowledged') return task;
    task.status = 'acknowledged';
    task.acknowledgedAt = new Date();
    task.acknowledgedBy = actor.userId;
    await task.save();
    return task;
  }

  /**
   * QA / team-lead manual breach review. Records that someone with
   * authority has eyes on this breach. Does NOT auto-resolve the
   * breach — that happens via completion (administer() of a new
   * MeasureApplication closes the task).
   */
  async reviewBreach({ taskId, actor, notes }) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) throw new Error('[reassessmentLifecycle] task model unavailable');
    if (!taskId) throw new Error('[reassessmentLifecycle] taskId required');
    if (!actor || !actor.userId) {
      throw new Error('[reassessmentLifecycle] actor.userId required for breach review');
    }
    const task = await Task.findById(taskId);
    if (!task) throw new Error(`[reassessmentLifecycle] task not found: ${taskId}`);
    const PHASES = _loadPhases();
    if (task.phase !== PHASES.BREACHED) {
      throw new Error(
        `[reassessmentLifecycle] reviewBreach requires phase=BREACHED (got ${task.phase})`
      );
    }
    task.breachReviewedAt = new Date();
    task.breachReviewedBy = actor.userId;
    if (notes) task.breachReviewNotes = notes;
    await task.save();
    return task;
  }

  /**
   * Read-side helper. Lists tasks at a given phase, optionally scoped
   * to a branch. Used by the `/admin/ops/reassessment` dashboard +
   * the alert dispatcher.
   */
  async listByPhase({ phase, branchId, statusIn } = {}) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) return [];
    const PHASES = _loadPhases();
    if (phase && !Object.values(PHASES).includes(phase)) {
      throw new Error(`[reassessmentLifecycle] invalid phase=${phase}`);
    }
    const q = {};
    if (phase) q.phase = phase;
    if (branchId) q.branchId = branchId;
    q.status =
      Array.isArray(statusIn) && statusIn.length
        ? { $in: statusIn }
        : { $in: ['pending', 'acknowledged'] };
    return Task.find(q).sort({ dueAt: 1 }).lean();
  }
}

const singleton = new ReassessmentLifecycleSvc();
module.exports = singleton;
module.exports.computePhase = computePhase;
module.exports.DEFAULT_POLICY = DEFAULT_POLICY;
