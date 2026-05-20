'use strict';

/**
 * reassessmentGapAuditor.service.js — Wave 224
 * ════════════════════════════════════════════════════════════════════
 * Retroactive Reassessment Gap Auditor
 *
 * The W214 scheduler creates tasks when (now - lastAdmin) > cadence.
 * It runs daily, but data drift (scheduler downtime, branch migration,
 * historical backfill, off-switch on) can leave gaps that no clinician
 * sees. This auditor scans for those gaps and optionally backfills them.
 *
 * A "gap" is a (beneficiary, measure) pair where:
 *   • A completed|locked MeasureApplication exists
 *   • lastDate + measure.reassessment.standardIntervalDays + graceDays < now
 *   • No pending|acknowledged MeasureReassessmentTask exists
 *
 * The graceDays buffer prevents flagging same-day gaps the scheduler
 * is about to catch. Default 0 — strict.
 *
 * Two modes:
 *   backfill=false (default) — read-only report
 *   backfill=true            — also creates the missing task with
 *                              `discoveredLate=true` so an analyst
 *                              can later filter audit-created vs
 *                              scheduler-created tasks.
 *
 * Output:
 *   { scanned, gapsFound, gapsBackfilled, gaps: [...], errors: [...] }
 *
 * Off-switch: process.env.MEASURE_REASSESS_GAP_AUDITOR='off'.
 *
 * Designed for weekly cron + manual run from /admin/ops on demand.
 * ════════════════════════════════════════════════════════════════════
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
  const flag = (process.env.MEASURE_REASSESS_GAP_AUDITOR || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

class ReassessmentGapAuditorSvc {
  /**
   * Scan for gaps. Idempotent in report mode; idempotent in backfill
   * mode under the partial unique index on pending tasks.
   *
   * @param {Object} [opts]
   * @param {Date}    [opts.now]
   * @param {string|ObjectId} [opts.branchId]
   * @param {string|ObjectId} [opts.beneficiaryId]
   * @param {boolean} [opts.backfill]    — create missing tasks
   * @param {number}  [opts.graceDays]   — extra tolerance beyond cadence
   */
  async scan(opts = {}) {
    if (!_isEnabled()) {
      return {
        scanned: 0,
        gapsFound: 0,
        gapsBackfilled: 0,
        gaps: [],
        disabled: true,
        errors: [],
      };
    }
    const now = opts.now || new Date();
    const graceDays = typeof opts.graceDays === 'number' ? opts.graceDays : 0;
    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const Task = M.MeasureReassessmentTask();
    if (!Measure || !MeasureApplication || !Task) {
      throw new Error('[reassessmentGapAuditor] required models unavailable');
    }

    // 1. Pull latest completed|locked admin per (beneficiary, measure)
    //    via aggregation. Optional branch/beneficiary scoping.
    const match = { status: { $in: ['completed', 'locked'] } };
    if (opts.beneficiaryId) {
      match.beneficiaryId = new mongoose.Types.ObjectId(String(opts.beneficiaryId));
    }
    if (opts.branchId) {
      match.branchId = new mongoose.Types.ObjectId(String(opts.branchId));
    }

    const groups = await MeasureApplication.aggregate([
      { $match: match },
      { $sort: { applicationDate: -1 } },
      {
        $group: {
          _id: { beneficiaryId: '$beneficiaryId', measureId: '$measureId' },
          lastDate: { $first: '$applicationDate' },
          lastApplicationId: { $first: '$_id' },
          branchId: { $first: '$branchId' },
          episodeId: { $first: '$episodeId' },
        },
      },
    ]);

    let scanned = 0;
    const gaps = [];
    const errors = [];

    // Cache Measure docs per call to avoid N+1 lookups.
    const measureCache = new Map();
    async function getMeasure(measureId) {
      const key = String(measureId);
      if (measureCache.has(key)) return measureCache.get(key);
      const m = await Measure.findById(measureId, {
        code: 1,
        reassessment: 1,
        status: 1,
        isDeleted: 1,
      }).lean();
      measureCache.set(key, m);
      return m;
    }

    for (const g of groups) {
      scanned += 1;
      try {
        const measure = await getMeasure(g._id.measureId);
        if (!measure) continue;
        if (measure.status !== 'active' || measure.isDeleted) continue;

        const cadenceDays = measure.reassessment?.standardIntervalDays;
        if (!cadenceDays) continue; // no cadence → not auditable

        const ageDays = (now.getTime() - new Date(g.lastDate).getTime()) / 86400000;
        if (ageDays <= cadenceDays + graceDays) continue; // within window

        // Is there already a pending|ack task for this pair?
        const existing = await Task.findOne({
          beneficiaryId: g._id.beneficiaryId,
          measureId: g._id.measureId,
          status: { $in: ['pending', 'acknowledged'] },
        });
        if (existing) continue; // scheduler already handled it

        const gap = {
          beneficiaryId: String(g._id.beneficiaryId),
          measureId: String(g._id.measureId),
          measureCode: measure.code,
          lastDate: g.lastDate,
          gapDays: Math.floor(ageDays - cadenceDays),
          cadenceDays,
          ageDays: Math.floor(ageDays),
        };
        gaps.push(gap);

        if (opts.backfill) {
          try {
            const created = await Task.create({
              beneficiaryId: g._id.beneficiaryId,
              measureId: g._id.measureId,
              measureCode: measure.code,
              branchId: g.branchId || null,
              episodeId: g.episodeId || null,
              lastApplicationId: g.lastApplicationId,
              lastApplicationDate: g.lastDate,
              standardIntervalDays: cadenceDays,
              // dueAt = the date it SHOULD have been generated, not now.
              // This preserves the true overdueness for downstream phase
              // computation (W222 sees correct OVERDUE/ESCALATED/BREACHED).
              dueAt: new Date(new Date(g.lastDate).getTime() + cadenceDays * 86400000),
              overdueDays: Math.floor(ageDays - cadenceDays),
              status: 'pending',
              discoveredLate: true,
            });
            gap.taskId = String(created._id);
          } catch (err) {
            if (err && err.code === 11000) {
              // Race against scheduler — partial unique caught it. Not
              // an error from the auditor's POV.
              gap.taskId = null;
              gap.note = 'RACE_RESOLVED_EXISTING';
            } else {
              gap.error = err.message;
              errors.push({
                beneficiaryId: gap.beneficiaryId,
                measureId: gap.measureId,
                message: err.message,
              });
            }
          }
        }
      } catch (err) {
        errors.push({
          beneficiaryId: String(g._id?.beneficiaryId),
          measureId: String(g._id?.measureId),
          message: err.message,
        });
        logger.warn('[reassessmentGapAuditor] scan failed for group: %s', err.message);
      }
    }

    const gapsBackfilled = opts.backfill ? gaps.filter(g => g.taskId).length : 0;

    return {
      scanned,
      gapsFound: gaps.length,
      gapsBackfilled,
      gaps,
      errors,
    };
  }
}

const singleton = new ReassessmentGapAuditorSvc();
module.exports = singleton;
