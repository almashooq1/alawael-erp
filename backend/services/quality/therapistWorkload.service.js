'use strict';

/**
 * therapistWorkload.service.js — W352 (Phase 9 dashboard backend, slice 2).
 *
 * Complements W350/W351 branchQualityHeatmap with the per-therapist (clinician
 * daily-plate) view. Same cell+severity shape so the front-end can render
 * both with the same component, just keyed by therapistId instead of branchId.
 *
 * Data sources:
 *   - Appointment      (today's pending + 7d no-show rate per therapist)
 *   - TherapySession   (today's scheduled + 7d completed per therapist)
 *   - CarePlan         (active plans where this therapist is `specialist`)
 *
 * Field-name caveat (CLAUDE.md fragmentation warning):
 *   - TherapySession.therapist refs 'Employee'  (Employee model is HR-side)
 *   - Appointment.therapist     refs 'Employee'
 *   - CarePlan.specialist        refs 'User'
 *   Therapist identity may be a User ID OR an Employee ID depending on the source.
 *   The aggregation pipelines just group by whichever ID lives in each doc — the
 *   caller (FE / API consumer) is responsible for mapping Employee↔User when
 *   joining across these collections. Out of scope for this slice; documented for
 *   the inevitable "wait why do I see two rows for the same person" bug.
 *
 * Public surface:
 *   createTherapistWorkloadService({ logger, appointmentModel?, sessionModel?, carePlanModel? })
 *
 *   buildWorkload({ therapistIds?, branchId?, now? })
 *     - therapistIds optional (default: aggregate all therapists with any data)
 *     - branchId optional (filter underlying queries to a branch)
 *     - now defaults to new Date()
 *
 *   returns: {
 *     generatedAt, thresholds,
 *     therapists: [{ therapistId, severity, cells: { metricKey: {value, severity, threshold} } }],
 *     summary: { totalTherapists, criticalTherapists, warningTherapists, okTherapists }
 *   }
 *
 * Severity thresholds (per-therapist):
 *   appointments.todayPending  warning>8,  critical>12   (typical clinician day)
 *   appointments.noShow7d      warning>3,  critical>7
 *   sessions.todayPending      warning>8,  critical>12   (mirror appointments)
 *   sessions.weekCompleted     — informational only (no threshold; for completeness)
 *   careplans.active           warning>15, critical>25   (caseload limits)
 *
 * Severity per metric: same MAX-of-cells rule as branchQualityHeatmap.
 */

const THRESHOLDS = Object.freeze({
  'appointments.todayPending': { warning: 8, critical: 12 },
  'appointments.noShow7d': { warning: 3, critical: 7 },
  'sessions.todayPending': { warning: 8, critical: 12 },
  // sessions.weekCompleted is informational — no threshold
  'careplans.active': { warning: 15, critical: 25 },
});

const SEVERITY_RANK = Object.freeze({ ok: 0, warning: 1, critical: 2 });

function _severityFor(metricKey, value) {
  const t = THRESHOLDS[metricKey];
  if (!t) return 'ok'; // informational metrics
  if (value > t.critical) return 'critical';
  if (value > t.warning) return 'warning';
  return 'ok';
}

function _maxSeverity(severities) {
  let max = 'ok';
  for (const s of severities) {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[max]) max = s;
  }
  return max;
}

function _startOfDay(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function _endOfDay(d) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function _daysAgo(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return out;
}

function createTherapistWorkloadService(opts = {}) {
  const { logger = console } = opts;

  function _AppointmentModel() {
    if (opts.appointmentModel) return opts.appointmentModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('Appointment');
    } catch {
      require('../../models/Appointment');
      return mongoose.model('Appointment');
    }
  }

  function _TherapySessionModel() {
    if (opts.sessionModel) return opts.sessionModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('TherapySession');
    } catch {
      require('../../models/TherapySession');
      return mongoose.model('TherapySession');
    }
  }

  function _CarePlanModel() {
    if (opts.carePlanModel) return opts.carePlanModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('CarePlan');
    } catch {
      require('../../models/CarePlan');
      return mongoose.model('CarePlan');
    }
  }

  async function _appointmentMetrics({ therapistIds, branchId, now }) {
    const Appt = _AppointmentModel();
    const todayStart = _startOfDay(now);
    const todayEnd = _endOfDay(now);
    const sevenDaysAgo = _daysAgo(now, 7);

    const match = {};
    if (therapistIds?.length) match.therapist = { $in: therapistIds };
    if (branchId) match.branchId = branchId;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$therapist',
          todayPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['PENDING', 'CONFIRMED', 'CHECKED_IN']] },
                    { $gte: ['$date', todayStart] },
                    { $lte: ['$date', todayEnd] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          noShow7d: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'NO_SHOW'] },
                    { $gte: ['$date', sevenDaysAgo] },
                    { $lte: ['$date', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Appt.aggregate(pipeline);
  }

  async function _sessionMetrics({ therapistIds, branchId, now }) {
    const Sess = _TherapySessionModel();
    const todayStart = _startOfDay(now);
    const todayEnd = _endOfDay(now);
    const sevenDaysAgo = _daysAgo(now, 7);

    const match = {};
    if (therapistIds?.length) match.therapist = { $in: therapistIds };
    if (branchId) match.branchId = branchId;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$therapist',
          todayPending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['SCHEDULED', 'CONFIRMED']] },
                    { $gte: ['$date', todayStart] },
                    { $lte: ['$date', todayEnd] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          weekCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'COMPLETED'] },
                    { $gte: ['$date', sevenDaysAgo] },
                    { $lte: ['$date', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Sess.aggregate(pipeline);
  }

  async function _carePlanMetrics({ therapistIds, branchId }) {
    const Plan = _CarePlanModel();
    const match = { status: 'active' };
    if (therapistIds?.length) match.specialist = { $in: therapistIds };
    if (branchId) match.branchId = branchId;

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$specialist',
          activeCount: { $sum: 1 },
        },
      },
    ];
    return Plan.aggregate(pipeline);
  }

  async function buildWorkload({ therapistIds = null, branchId = null, now = new Date() } = {}) {
    let apptRows = [];
    let sessRows = [];
    let planRows = [];
    try {
      apptRows = await _appointmentMetrics({ therapistIds, branchId, now });
    } catch (err) {
      logger.warn?.(`[therapistWorkload] appointment aggregation failed: ${err.message}`);
    }
    try {
      sessRows = await _sessionMetrics({ therapistIds, branchId, now });
    } catch (err) {
      logger.warn?.(`[therapistWorkload] session aggregation failed: ${err.message}`);
    }
    try {
      planRows = await _carePlanMetrics({ therapistIds, branchId });
    } catch (err) {
      logger.warn?.(`[therapistWorkload] careplan aggregation failed: ${err.message}`);
    }

    const byTherapist = new Map();
    function _ensure(tid) {
      const key = String(tid);
      if (!byTherapist.has(key)) {
        byTherapist.set(key, {
          therapistId: tid,
          cells: {
            'appointments.todayPending': null,
            'appointments.noShow7d': null,
            'sessions.todayPending': null,
            'sessions.weekCompleted': null,
            'careplans.active': null,
          },
        });
      }
      return byTherapist.get(key);
    }

    for (const r of apptRows) {
      const t = _ensure(r._id);
      t.cells['appointments.todayPending'] = _cell('appointments.todayPending', r.todayPending);
      t.cells['appointments.noShow7d'] = _cell('appointments.noShow7d', r.noShow7d);
    }
    for (const r of sessRows) {
      const t = _ensure(r._id);
      t.cells['sessions.todayPending'] = _cell('sessions.todayPending', r.todayPending);
      t.cells['sessions.weekCompleted'] = _cell('sessions.weekCompleted', r.weekCompleted);
    }
    for (const r of planRows) {
      const t = _ensure(r._id);
      t.cells['careplans.active'] = _cell('careplans.active', r.activeCount);
    }

    const therapists = [];
    let critical = 0;
    let warning = 0;
    for (const t of byTherapist.values()) {
      const sevs = Object.values(t.cells)
        .filter(c => c)
        .map(c => c.severity);
      const sev = _maxSeverity(sevs);
      therapists.push({ ...t, severity: sev });
      if (sev === 'critical') critical++;
      else if (sev === 'warning') warning++;
    }

    return {
      generatedAt: new Date(now).toISOString(),
      thresholds: THRESHOLDS,
      therapists,
      summary: {
        totalTherapists: therapists.length,
        criticalTherapists: critical,
        warningTherapists: warning,
        okTherapists: therapists.length - critical - warning,
      },
    };
  }

  function _cell(metricKey, value) {
    return {
      value: value || 0,
      severity: _severityFor(metricKey, value || 0),
      threshold: THRESHOLDS[metricKey] || null,
    };
  }

  return {
    buildWorkload,
    _internals: { THRESHOLDS, _severityFor, _maxSeverity, _cell, _startOfDay, _endOfDay, _daysAgo },
  };
}

module.exports = {
  createTherapistWorkloadService,
  THRESHOLDS,
};
