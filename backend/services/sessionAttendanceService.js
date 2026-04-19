/**
 * sessionAttendanceService — pure math over SessionAttendance records.
 *
 * All functions are pure: no DB, no side effects. Callers hydrate the
 * records (route handlers, CLI, tests) and pass the array in. Same
 * pattern as cpeService — keeps the math independently testable and
 * makes the "no N+1" route shape trivial to write.
 *
 * Semantics:
 *   • PRESENT_STATES = {present, late} — beneficiary was there.
 *   • ABSENT_STATES  = {absent, no_show, cancelled} — was not there.
 *   • Attendance rate = presentCount / totalCount.
 *     A cancelled session counts as "not there" in the rate but
 *     NOT as a no-show for alerting purposes.
 *
 * Distinct from services/attendanceService.js which handles employee
 * check-in/out. This one is beneficiary-session-level.
 */

'use strict';

const PRESENT_STATES = new Set(['present', 'late']);
const ABSENT_STATES = new Set(['absent', 'no_show', 'cancelled']);

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  get noShowAttention() {
    return envInt('ATTENDANCE_NOSHOW_ATTENTION', 3);
  },
  get noShowCritical() {
    return envInt('ATTENDANCE_NOSHOW_CRITICAL', 5);
  },
  get windowDays() {
    return envInt('ATTENDANCE_WINDOW_DAYS', 30);
  },
};

function summarize(records, opts = {}) {
  const { windowStart, windowEnd } = opts;
  const inWindow = records.filter(r => {
    if (!r?.scheduledDate) return false;
    const d = new Date(r.scheduledDate);
    if (windowStart && d < new Date(windowStart)) return false;
    if (windowEnd && d > new Date(windowEnd)) return false;
    return true;
  });

  const byStatus = {
    present: 0,
    late: 0,
    absent: 0,
    no_show: 0,
    cancelled: 0,
  };
  let billableCount = 0;
  for (const r of inWindow) {
    if (r.status in byStatus) byStatus[r.status] += 1;
    if (r.billable) billableCount += 1;
  }

  const total = inWindow.length;
  const presentCount = byStatus.present + byStatus.late;
  const absentCount = byStatus.absent + byStatus.no_show + byStatus.cancelled;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 1000) / 10 : null;

  return {
    total,
    present: byStatus.present,
    late: byStatus.late,
    absent: byStatus.absent,
    noShow: byStatus.no_show,
    cancelled: byStatus.cancelled,
    presentCount,
    absentCount,
    billableCount,
    attendanceRate,
    byStatus,
  };
}

function bucketByNoShowRisk(recordsByBeneficiary, now = new Date()) {
  const windowStart = new Date(now.getTime() - THRESHOLDS.windowDays * 24 * 60 * 60 * 1000);
  const ok = [];
  const attention = [];
  const critical = [];
  for (const [beneficiaryId, records] of recordsByBeneficiary) {
    const windowed = records.filter(r => {
      if (!r?.scheduledDate) return false;
      return new Date(r.scheduledDate) >= windowStart;
    });
    const noShows = windowed.filter(r => r.status === 'no_show');
    const entry = {
      beneficiaryId,
      noShows: noShows.length,
      lastNoShow:
        noShows.length > 0
          ? noShows.map(r => new Date(r.scheduledDate).getTime()).reduce((a, b) => (a > b ? a : b))
          : null,
    };
    if (entry.lastNoShow) entry.lastNoShow = new Date(entry.lastNoShow);
    if (noShows.length >= THRESHOLDS.noShowCritical) critical.push(entry);
    else if (noShows.length >= THRESHOLDS.noShowAttention) attention.push(entry);
    else ok.push(entry);
  }
  const sortByNoShows = (a, b) => b.noShows - a.noShows;
  return {
    ok: ok.sort(sortByNoShows),
    attention: attention.sort(sortByNoShows),
    critical: critical.sort(sortByNoShows),
  };
}

function groupByBeneficiary(records) {
  const m = new Map();
  for (const r of records) {
    const id = String(r.beneficiaryId);
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(r);
  }
  return m;
}

module.exports = {
  PRESENT_STATES,
  ABSENT_STATES,
  THRESHOLDS,
  summarize,
  bucketByNoShowRisk,
  groupByBeneficiary,
};
