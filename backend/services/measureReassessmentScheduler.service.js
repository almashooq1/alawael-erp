'use strict';

/**
 * measureReassessmentScheduler.service.js — Wave 214
 *
 * Periodic scheduler that turns the W211b cadence model into actionable
 * tasks. On each `tick()`:
 *
 *   1. Find latest completed|locked MeasureApplication per
 *      (beneficiaryId, measureId) — the "freshest measurement" for
 *      every active pair.
 *   2. For each pair, fetch the active Measure's
 *      reassessment.standardIntervalDays. Compute dueAt = lastDate + interval.
 *   3. If dueAt ≤ now AND no pending task exists for that pair,
 *      create a MeasureReassessmentTask. The partial unique index
 *      on (beneficiaryId, measureId, status='pending') is the
 *      idempotency backstop — concurrent ticks can't double-create.
 *
 * Counterpart hooks:
 *   - Auto-close: when a new MeasureApplication is saved via
 *     administer() (W215) for a (beneficiary, measure) pair, any
 *     open task is closed. The post-save hook lives in
 *     MeasureApplication and lazy-imports this model — see W214 hook
 *     installation in domains/goals/models/MeasureApplication.js.
 *
 * Off-switch: pass {enabled: false} or set process.env.MEASURE_REASSESS_SCHEDULER='off'
 * before requiring this module to prevent any DB activity. Designed
 * to be safe to import under Jest (no top-level mongoose calls).
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
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

function _isEnabled() {
  const flag = (process.env.MEASURE_REASSESS_SCHEDULER || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

class MeasureReassessmentSchedulerSvc {
  /**
   * Run one pass. Idempotent — safe to invoke repeatedly. Returns a
   * summary {created, skippedDuplicates, scanned, errors[]} so a cron
   * runner can log + alert on anomalies.
   *
   * @param {Object} [opts]
   * @param {Date}   [opts.now]            — clock injection for tests
   * @param {string|ObjectId} [opts.branchId] — restrict scan to a branch
   * @param {string|ObjectId} [opts.beneficiaryId] — restrict to one beneficiary
   */
  async tick(opts = {}) {
    if (!_isEnabled()) {
      logger.info('[MeasureReassessScheduler] disabled via env flag — skipping tick');
      return { created: 0, skippedDuplicates: 0, scanned: 0, disabled: true, errors: [] };
    }

    const now = opts.now || new Date();
    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const MeasureReassessmentTask = M.MeasureReassessmentTask();
    if (!Measure || !MeasureApplication || !MeasureReassessmentTask) {
      throw new Error('reassessment scheduler: required models unavailable');
    }

    // ─── 1. Aggregate latest admin per (beneficiary, measure) ──────
    const match = { status: { $in: ['completed', 'locked'] } };
    if (opts.beneficiaryId) match.beneficiaryId = new mongoose.Types.ObjectId(opts.beneficiaryId);
    if (opts.branchId) match.branchId = new mongoose.Types.ObjectId(opts.branchId);

    const latests = await MeasureApplication.aggregate([
      { $match: match },
      { $sort: { applicationDate: -1 } },
      {
        $group: {
          _id: { beneficiaryId: '$beneficiaryId', measureId: '$measureId' },
          lastDate: { $first: '$applicationDate' },
          lastId: { $first: '$_id' },
          episodeId: { $first: '$episodeId' },
          assessorId: { $first: '$assessorId' },
          branchId: { $first: '$branchId' },
        },
      },
    ]);

    let created = 0;
    let skippedDuplicates = 0;
    const scanned = latests.length;
    const errors = [];
    const tasks = [];

    for (const item of latests) {
      try {
        const measure = await Measure.findById(item._id.measureId)
          .select('code status reassessment')
          .lean();
        if (!measure || measure.status !== 'active') continue;
        const interval = measure.reassessment?.standardIntervalDays;
        if (!interval) continue;

        const dueAt = new Date(item.lastDate);
        dueAt.setDate(dueAt.getDate() + interval);
        if (dueAt > now) continue;

        const overdueDays = Math.floor((now - dueAt) / (1000 * 60 * 60 * 24));

        // ─── 3. Idempotent upsert ──────────────────────────────────
        // The partial unique index is the backstop, but pre-check
        // avoids the noisy E11000 path under normal operation.
        const existing = await MeasureReassessmentTask.findOne({
          beneficiaryId: item._id.beneficiaryId,
          measureId: item._id.measureId,
          status: 'pending',
        }).lean();
        if (existing) {
          skippedDuplicates++;
          continue;
        }

        try {
          const task = await MeasureReassessmentTask.create({
            beneficiaryId: item._id.beneficiaryId,
            measureId: item._id.measureId,
            measureCode: measure.code,
            lastApplicationId: item.lastId,
            lastApplicationDate: item.lastDate,
            standardIntervalDays: interval,
            dueAt,
            overdueDays,
            assigneeId: item.assessorId,
            episodeId: item.episodeId,
            branchId: item.branchId,
            status: 'pending',
          });
          tasks.push(task);
          created++;
        } catch (err) {
          // E11000 from the partial unique index = concurrent race
          // produced a duplicate. Treat as skipped, not failed.
          if (err && err.code === 11000) {
            skippedDuplicates++;
          } else {
            errors.push({
              beneficiaryId: String(item._id.beneficiaryId),
              measureId: String(item._id.measureId),
              error: err.message,
            });
          }
        }
      } catch (err) {
        errors.push({
          beneficiaryId: String(item._id.beneficiaryId),
          measureId: String(item._id.measureId),
          error: err.message,
        });
      }
    }

    logger.info(
      '[MeasureReassessScheduler] tick — scanned=%d created=%d skipped=%d errors=%d',
      scanned,
      created,
      skippedDuplicates,
      errors.length
    );
    return { created, skippedDuplicates, scanned, errors, tasks };
  }

  // ─── Task lifecycle ─────────────────────────────────────────────

  async acknowledge(taskId, actorId) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) throw new Error('MeasureReassessmentTask model unavailable');
    const doc = await Task.findById(taskId);
    if (!doc) return null;
    if (doc.status !== 'pending') {
      throw new Error(`cannot acknowledge from status=${doc.status}`);
    }
    doc.status = 'acknowledged';
    doc.acknowledgedAt = new Date();
    doc.acknowledgedBy = actorId || null;
    await doc.save();
    return doc.toObject();
  }

  async complete(taskId, { actorId, applicationId, mode = 'manual' } = {}) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) throw new Error('MeasureReassessmentTask model unavailable');
    const doc = await Task.findById(taskId);
    if (!doc) return null;
    if (doc.status === 'completed' || doc.status === 'cancelled') return doc.toObject();
    doc.status = 'completed';
    doc.completedAt = new Date();
    doc.completedBy = actorId || null;
    doc.completedByApplicationId = applicationId || null;
    doc.completionMode = mode;
    await doc.save();
    return doc.toObject();
  }

  async cancel(taskId, { actorId, reason } = {}) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) throw new Error('MeasureReassessmentTask model unavailable');
    if (!reason || !reason.trim()) {
      throw new Error('cancellationReason is required');
    }
    const doc = await Task.findById(taskId);
    if (!doc) return null;
    if (doc.status === 'completed' || doc.status === 'cancelled') {
      throw new Error(`cannot cancel from status=${doc.status}`);
    }
    doc.status = 'cancelled';
    doc.cancelledAt = new Date();
    doc.cancelledBy = actorId || null;
    doc.cancellationReason = reason;
    await doc.save();
    return doc.toObject();
  }

  /**
   * Called by the post-save hook on MeasureApplication when a new
   * admin lands for a (beneficiary, measure) pair. Auto-completes
   * any pending OR acknowledged task with mode='auto' linking to
   * the new application id.
   *
   * Best-effort — never throws (the primary admin save must not be
   * blocked by an audit-trail failure).
   */
  async autoCloseFor({ beneficiaryId, measureId, newApplicationId }) {
    try {
      const Task = M.MeasureReassessmentTask();
      if (!Task) return { closed: 0 };
      const closed = await Task.updateMany(
        {
          beneficiaryId,
          measureId,
          status: { $in: ['pending', 'acknowledged'] },
        },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            completedByApplicationId: newApplicationId,
            completionMode: 'auto',
          },
        }
      );
      return { closed: closed.modifiedCount || 0 };
    } catch (err) {
      logger.warn('[MeasureReassessScheduler] autoCloseFor failed: %s', err.message);
      return { closed: 0, error: err.message };
    }
  }

  /**
   * Read-only list helper for routes/dashboards.
   */
  async listTasks(filter = {}, opts = {}) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) return [];
    const { limit = 100 } = opts;
    return Task.listFor(filter).then(arr => arr.slice(0, limit));
  }
}

const svc = new MeasureReassessmentSchedulerSvc();
module.exports = svc;
