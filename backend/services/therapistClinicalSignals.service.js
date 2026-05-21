'use strict';

/**
 * therapistClinicalSignals.service.js — Wave 237.
 *
 * Surfaces the Outcomes-vertical signals (W214 reassessment tasks +
 * W221 measure alerts) to the therapist UI. The W210→W232 stack builds
 * up clinical intelligence per (beneficiary × measure); this service is
 * the roll-up the therapist actually sees: "which of my beneficiaries
 * has something I need to act on today?"
 *
 * Source-of-truth signals:
 *   - W214 MeasureReassessmentTask — `status ∈ {pending, acknowledged}`
 *     means a reassessment is due. `phase ∈ {BREACHED, ESCALATED}`
 *     means it's slipped past the cadence already.
 *   - W221 MeasureAlert — `status='open'` means an active clinical
 *     signal. Type is REGRESSION_DETECTED | PLATEAU_DETECTED |
 *     MCID_NOT_MET; severity is low|medium|high|critical.
 *
 * Caseload: the therapist's beneficiaries are derived from
 * Appointment.therapist (matches /api/v1/therapist/beneficiaries
 * scoping). 12-month look-back, same window as that endpoint.
 *
 * Sort order surfaces the most-actionable first:
 *   1. Critical alerts (high/critical severity)
 *   2. Breached tasks (cadence missed > 14d past dueAt)
 *   3. Open alerts (any severity)
 *   4. Open tasks (any phase)
 *
 * Returns ONLY beneficiaries with at least one open task or open alert
 * — beneficiaries with zero signals are filtered out (the goal is a
 * focused worklist, not a full caseload).
 */

const mongoose = require('mongoose');

// Lazy model loads — keeps the service requireable without forcing the
// whole goals domain to be loaded at startup.
let _Appointment, _Beneficiary, _MeasureReassessmentTask, _MeasureAlert;
function Appointment() {
  if (!_Appointment) _Appointment = require('../models/Appointment');
  return _Appointment;
}
function Beneficiary() {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
}
function MeasureReassessmentTask() {
  if (!_MeasureReassessmentTask) {
    _MeasureReassessmentTask = require('../domains/goals/models/MeasureReassessmentTask');
  }
  return _MeasureReassessmentTask;
}
function MeasureAlert() {
  if (!_MeasureAlert) {
    _MeasureAlert = require('../domains/goals/models/MeasureAlert');
  }
  return _MeasureAlert;
}

const OPEN_TASK_STATUSES = ['pending', 'acknowledged'];
const HIGH_SEVERITY = new Set(['high', 'critical']);
const SLIPPED_PHASES = new Set(['ESCALATED', 'BREACHED']);

/**
 * Aggregate open W214 tasks + W221 alerts for the beneficiaries on a
 * therapist's caseload.
 *
 * @param {object} args
 * @param {string|mongoose.Types.ObjectId} args.employeeId — Employee._id
 *   of the therapist whose caseload we're querying.
 * @param {number} [args.lookbackMonths=12] — how far back to consider an
 *   Appointment as evidence of caseload membership.
 * @returns {Promise<Array<{
 *   beneficiaryId: string,
 *   beneficiaryNameAr: string,
 *   openTasks: number,
 *   breachedTasks: number,
 *   escalatedTasks: number,
 *   nextDueAt: string | null,
 *   openAlerts: number,
 *   criticalAlerts: number,
 *   alertTypes: string[]
 * }>>}
 */
async function getSignalsForTherapist({ employeeId, lookbackMonths = 12 } = {}) {
  if (!employeeId || !mongoose.Types.ObjectId.isValid(String(employeeId))) {
    return [];
  }

  const since = new Date();
  since.setMonth(since.getMonth() - lookbackMonths);

  // 1. Caseload: distinct beneficiaries for this therapist in the window.
  const benIds = await Appointment().distinct('beneficiary', {
    therapist: employeeId,
    date: { $gte: since },
  });

  if (!benIds || benIds.length === 0) return [];

  // 2. Open W214 tasks rollup. We compute `nextDueAt = min(dueAt)` per
  //    beneficiary so the UI can show "next due in X days".
  const taskAgg = await MeasureReassessmentTask().aggregate([
    {
      $match: {
        beneficiaryId: { $in: benIds },
        status: { $in: OPEN_TASK_STATUSES },
      },
    },
    {
      $group: {
        _id: '$beneficiaryId',
        openTasks: { $sum: 1 },
        breachedTasks: {
          $sum: { $cond: [{ $eq: ['$phase', 'BREACHED'] }, 1, 0] },
        },
        escalatedTasks: {
          $sum: { $cond: [{ $eq: ['$phase', 'ESCALATED'] }, 1, 0] },
        },
        nextDueAt: { $min: '$dueAt' },
      },
    },
  ]);

  // 3. Open W221 alerts rollup. `$addToSet` collects the distinct alert
  //    types for the badge ("regression + plateau" reads differently
  //    from "just plateau").
  const alertAgg = await MeasureAlert().aggregate([
    {
      $match: {
        beneficiaryId: { $in: benIds },
        status: 'open',
      },
    },
    {
      $group: {
        _id: '$beneficiaryId',
        openAlerts: { $sum: 1 },
        criticalAlerts: {
          $sum: {
            $cond: [{ $in: ['$severity', ['high', 'critical']] }, 1, 0],
          },
        },
        alertTypes: { $addToSet: '$alertType' },
      },
    },
  ]);

  // 4. Names for the beneficiaries that have signals (smaller set than
  //    benIds — only those that appear in either rollup).
  const signalIds = new Set([
    ...taskAgg.map(t => String(t._id)),
    ...alertAgg.map(a => String(a._id)),
  ]);
  if (signalIds.size === 0) return [];

  const beneficiaries = await Beneficiary()
    .find({ _id: { $in: Array.from(signalIds) } })
    .select('firstName_ar lastName_ar firstName_en lastName_en beneficiaryNumber')
    .lean();

  const taskMap = new Map(taskAgg.map(t => [String(t._id), t]));
  const alertMap = new Map(alertAgg.map(a => [String(a._id), a]));

  const rows = beneficiaries.map(b => {
    const t = taskMap.get(String(b._id)) || {
      openTasks: 0,
      breachedTasks: 0,
      escalatedTasks: 0,
      nextDueAt: null,
    };
    const a = alertMap.get(String(b._id)) || {
      openAlerts: 0,
      criticalAlerts: 0,
      alertTypes: [],
    };
    const nameAr = [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() || '—';
    return {
      beneficiaryId: String(b._id),
      beneficiaryNameAr: nameAr,
      beneficiaryNumber: b.beneficiaryNumber || null,
      openTasks: t.openTasks,
      breachedTasks: t.breachedTasks,
      escalatedTasks: t.escalatedTasks,
      nextDueAt: t.nextDueAt ? new Date(t.nextDueAt).toISOString() : null,
      openAlerts: a.openAlerts,
      criticalAlerts: a.criticalAlerts,
      alertTypes: Array.isArray(a.alertTypes) ? a.alertTypes : [],
    };
  });

  // Surface the most-actionable first. Comparator chain mirrors the
  // priority described at the top of this file.
  rows.sort((x, y) => {
    if (x.criticalAlerts !== y.criticalAlerts) return y.criticalAlerts - x.criticalAlerts;
    if (x.breachedTasks !== y.breachedTasks) return y.breachedTasks - x.breachedTasks;
    if (x.escalatedTasks !== y.escalatedTasks) return y.escalatedTasks - x.escalatedTasks;
    if (x.openAlerts !== y.openAlerts) return y.openAlerts - x.openAlerts;
    return y.openTasks - x.openTasks;
  });

  return rows;
}

// ─── W239: Per-beneficiary drill-down ─────────────────────────────────────

// Lazy-loaded to avoid mongoose cycle at module load.
let _Measure, _interpreter;
function Measure() {
  if (!_Measure) {
    try {
      _Measure = require('../domains/goals/models/Measure');
    } catch {
      _Measure = null;
    }
  }
  return _Measure;
}
function interpreter() {
  if (!_interpreter) {
    try {
      _interpreter = require('./measureProgressInterpreter.service');
    } catch {
      _interpreter = null;
    }
  }
  return _interpreter;
}

/**
 * Authorize the therapist's access to a specific beneficiary and return
 * the detailed clinical signals payload for the drill-down page.
 *
 * Caseload check (12-month look-back) gates the read for therapist roles;
 * admin viewers skip the check because the picker already targets a
 * specific employee.
 *
 * @param {object} args
 * @param {string|mongoose.Types.ObjectId} args.employeeId — therapist
 *   identity (already resolved by the route via resolveTargetEmployee).
 * @param {string|mongoose.Types.ObjectId} args.beneficiaryId
 * @param {boolean} [args.skipCaseloadCheck=false] — admin/superadmin
 *   viewers should pass true; therapist viewers MUST pass false (default).
 * @param {string} [args.locale='ar']
 * @returns {Promise<null | {
 *   beneficiary: { id, nameAr, beneficiaryNumber },
 *   tasks: Array<object>,
 *   alerts: Array<object>,
 *   narratives: { byMeasure: Array<object>, rollup: object }
 * }>}
 *   Returns null when the beneficiary is not on the therapist's caseload
 *   (route translates to 404) or the beneficiary itself doesn't exist.
 */
async function getBeneficiaryDetail({
  employeeId,
  beneficiaryId,
  skipCaseloadCheck = false,
  locale = 'ar',
} = {}) {
  if (!beneficiaryId || !mongoose.Types.ObjectId.isValid(String(beneficiaryId))) {
    return null;
  }
  if (!skipCaseloadCheck) {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(String(employeeId))) {
      return null;
    }
  }

  // ── 1. Caseload gate (therapist viewer only) ───────────────────────
  if (!skipCaseloadCheck) {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const owned = await Appointment().exists({
      therapist: employeeId,
      beneficiary: beneficiaryId,
      date: { $gte: since },
    });
    if (!owned) return null;
  }

  // ── 2. Beneficiary header ──────────────────────────────────────────
  const ben = await Beneficiary()
    .findById(beneficiaryId)
    .select('firstName_ar lastName_ar firstName_en lastName_en beneficiaryNumber')
    .lean();
  if (!ben) return null;
  const beneficiary = {
    id: String(ben._id),
    nameAr:
      [ben.firstName_ar, ben.lastName_ar].filter(Boolean).join(' ').trim() ||
      [ben.firstName_en, ben.lastName_en].filter(Boolean).join(' ').trim() ||
      '—',
    beneficiaryNumber: ben.beneficiaryNumber || null,
  };

  // ── 3. Open tasks (W214) ───────────────────────────────────────────
  const taskDocs = await MeasureReassessmentTask()
    .find({
      beneficiaryId,
      status: { $in: OPEN_TASK_STATUSES },
    })
    .sort({ dueAt: 1 })
    .lean();

  // ── 4. Open alerts (W221) ──────────────────────────────────────────
  const alertDocs = await MeasureAlert()
    .find({ beneficiaryId, status: 'open' })
    .sort({ severity: -1, firstSeenAt: -1 })
    .lean();

  // ── 5. Resolve measure names (single query for both tasks + alerts) ─
  const measureIds = new Set([
    ...taskDocs.map(t => String(t.measureId)),
    ...alertDocs.map(a => String(a.measureId)),
  ]);
  const measureNameMap = new Map();
  const MeasureModel = Measure();
  if (MeasureModel && measureIds.size > 0) {
    const measures = await MeasureModel.find({ _id: { $in: Array.from(measureIds) } })
      .select('code name_ar name_en')
      .lean();
    for (const m of measures) {
      measureNameMap.set(String(m._id), {
        measureNameAr: m.name_ar || m.name_en || m.code || '—',
        measureNameEn: m.name_en || null,
      });
    }
  }

  const tasks = taskDocs.map(t => {
    const names = measureNameMap.get(String(t.measureId)) || {};
    return {
      id: String(t._id),
      measureId: String(t.measureId),
      measureCode: t.measureCode,
      measureNameAr: names.measureNameAr || t.measureCode || '—',
      status: t.status,
      phase: t.phase || 'SCHEDULED',
      dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
      overdueDays: Number(t.overdueDays) || 0,
      lastApplicationDate: t.lastApplicationDate
        ? new Date(t.lastApplicationDate).toISOString()
        : null,
      eventTriggerCode: t.eventTriggerCode || null,
      escalatedAt: t.escalatedAt ? new Date(t.escalatedAt).toISOString() : null,
      breachedAt: t.breachedAt ? new Date(t.breachedAt).toISOString() : null,
    };
  });

  const alerts = alertDocs.map(a => {
    const names = measureNameMap.get(String(a.measureId)) || {};
    return {
      id: String(a._id),
      measureId: String(a.measureId),
      measureCode: a.measureCode,
      measureNameAr: names.measureNameAr || a.measureCode || '—',
      alertType: a.alertType,
      severity: a.severity || 'medium',
      status: a.status,
      evidence: a.evidence || null,
      firstSeenAt: a.firstSeenAt ? new Date(a.firstSeenAt).toISOString() : null,
      lastEvaluatedAt: a.lastEvaluatedAt ? new Date(a.lastEvaluatedAt).toISOString() : null,
    };
  });

  // ── 6. Progress narratives (W232) — best-effort ────────────────────
  let narratives = { byMeasure: [], rollup: null };
  const interp = interpreter();
  if (interp && typeof interp.interpretAll === 'function') {
    try {
      const out = await interp.interpretAll({ beneficiaryId, locale });
      narratives = {
        byMeasure: Array.isArray(out?.byMeasure) ? out.byMeasure : [],
        rollup: out?.rollup || null,
      };
    } catch {
      // W232 is informational only — failure shouldn't break the page.
      narratives = { byMeasure: [], rollup: null };
    }
  }

  return { beneficiary, tasks, alerts, narratives };
}

module.exports = {
  getSignalsForTherapist,
  getBeneficiaryDetail,
  // Exported for tests so we don't have to reach into the closure.
  _internals: { OPEN_TASK_STATUSES, HIGH_SEVERITY, SLIPPED_PHASES },
};
