/**
 * therapistUtilizationService — pure math over TherapySession +
 * SessionAttendance to compute per-therapist productivity.
 *
 * No new model needed — joins existing sources in-memory at query time.
 *
 * Metrics:
 *   • summarizeByTherapist(sessions, attendanceByKey) — per-therapist rollup
 *   • utilizationRate(stats) — billable hours ÷ capacity hours
 *   • rankByMetric(byTherapist, metric) — sort + trim for leaderboards
 *
 * Definitions (operational, not accounting):
 *   • sessionsScheduled  — everything on the calendar
 *   • sessionsCompleted  — status=COMPLETED (therapist delivered)
 *   • billableMinutes    — sum of duration for sessions where the
 *     matching SessionAttendance.billable=true OR attendance.status
 *     in {present, late} (billing default). A no-show marked billable
 *     also counts.
 *   • noShowsOnCaseload  — attendance.status=no_show on this therapist's sessions
 *   • utilizationRate    — billableMinutes / (capacityHours × 60)
 *
 * Capacity is passed in per call (default 8h/day × 22 workdays/month =
 * 10560 min/month) so the caller controls the window.
 */

'use strict';

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

const DEFAULTS = {
  // 8 hours × 22 workdays × 60 min.
  get capacityMinutesPerMonth() {
    return envFloat('THERAPIST_CAPACITY_MINUTES', 10560);
  },
};

const PRESENT = new Set(['present', 'late']);

/**
 * Group attendance records by sessionId for O(1) lookup.
 */
function indexAttendance(attendanceRecords) {
  const m = new Map();
  for (const a of attendanceRecords || []) {
    if (!a?.sessionId) continue;
    m.set(String(a.sessionId), a);
  }
  return m;
}

/**
 * @param {Array} sessions    TherapySession rows with {therapist, duration, status}
 * @param {Map}   attByKey    sessionId → SessionAttendance
 * @returns {object} byTherapistId → stats
 */
function summarizeByTherapist(sessions, attByKey) {
  const byTherapist = {};
  for (const s of sessions || []) {
    if (!s?.therapist) continue;
    const tid = String(s.therapist);
    if (!byTherapist[tid]) {
      byTherapist[tid] = {
        sessionsScheduled: 0,
        sessionsCompleted: 0,
        sessionsCancelled: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        noShowsOnCaseload: 0,
        uniqueBeneficiaries: new Set(),
      };
    }
    const stats = byTherapist[tid];
    stats.sessionsScheduled += 1;
    if (s.status === 'COMPLETED') stats.sessionsCompleted += 1;
    if (s.status === 'CANCELLED') stats.sessionsCancelled += 1;
    if (s.beneficiary) stats.uniqueBeneficiaries.add(String(s.beneficiary));

    const att = attByKey.get(String(s._id));
    const minutes = Number(s.duration || 0);
    const isBillable = att ? !!att.billable || PRESENT.has(att.status) : s.status === 'COMPLETED';
    if (isBillable) stats.billableMinutes += minutes;
    else stats.nonBillableMinutes += minutes;

    if (att?.status === 'no_show') stats.noShowsOnCaseload += 1;
  }

  // Finalize: convert Set → count and compute rates.
  for (const tid of Object.keys(byTherapist)) {
    const s = byTherapist[tid];
    s.uniqueBeneficiaries = s.uniqueBeneficiaries.size;
    s.completionRate =
      s.sessionsScheduled > 0
        ? Math.round((s.sessionsCompleted / s.sessionsScheduled) * 1000) / 10
        : null;
    s.noShowRate =
      s.sessionsScheduled > 0
        ? Math.round((s.noShowsOnCaseload / s.sessionsScheduled) * 1000) / 10
        : null;
  }
  return byTherapist;
}

/**
 * Derived metric: billable-minute ratio vs. a caller-supplied capacity.
 *
 * @param {object} stats          entry from summarizeByTherapist
 * @param {number} capacityMinutes default = DEFAULTS.capacityMinutesPerMonth
 * @returns {number|null} percent 0..100 (can exceed 100 if overbooked)
 */
function utilizationRate(stats, capacityMinutes = DEFAULTS.capacityMinutesPerMonth) {
  if (!stats || !capacityMinutes || capacityMinutes <= 0) return null;
  return Math.round((stats.billableMinutes / capacityMinutes) * 1000) / 10;
}

/**
 * Leaderboard: sort therapists by a stat key, desc by default.
 *
 * @param {object} byTherapist
 * @param {string} metric         e.g. 'billableMinutes', 'completionRate'
 * @param {object} [opts]         { limit, asc }
 */
function rankByMetric(byTherapist, metric, { limit = 20, asc = false } = {}) {
  const entries = Object.entries(byTherapist).map(([therapistId, stats]) => ({
    therapistId,
    value: stats[metric],
    stats,
  }));
  const comparator = asc
    ? (a, b) => (a.value ?? 0) - (b.value ?? 0)
    : (a, b) => (b.value ?? 0) - (a.value ?? 0);
  return entries.sort(comparator).slice(0, limit);
}

module.exports = {
  DEFAULTS,
  indexAttendance,
  summarizeByTherapist,
  utilizationRate,
  rankByMetric,
};
