/**
 * absenceDetectionSweeper.js — W402 producer for `attendance.absence.detected`.
 *
 * Scans yesterday's HRAttendanceRecord docs and emits one
 * integrationBus.publish('attendance', 'absence.detected', { employeeId, date,
 * type }) per record whose status is 'absent' (or, optionally, 'on_leave' if
 * the caller wants leave-broadcast too). Pure/injectable: pass {
 * AttendanceRecordModel, integrationBus }.
 *
 * Idempotency: the sweeper is meant to run once per day. The scheduled window
 * is the previous calendar day (date >= startOfYesterday, date <
 * startOfToday). Running it twice in the same day will re-emit; cron caller
 * is responsible for single daily fire.
 *
 * Envelope per ATTENDANCE_EVENTS.ABSENCE_DETECTED:
 *   { employeeId, date, type }
 *
 * Wired by W402 to close W382 KNOWN_DEAD_CONTRACTS entry
 * `attendance.ABSENCE_DETECTED` + W392 LIVE-orphan entry
 * `attendance.absence.detected`.
 */

'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_MAP = Object.freeze({
  absent: 'unscheduled_absence',
  on_leave: 'scheduled_leave',
  sick: 'sick_leave',
});

function yesterdayWindow(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  start.setTime(start.getTime() - DAY_MS);
  return { start, end };
}

async function sweepAbsenceDetection({
  AttendanceRecordModel,
  integrationBus,
  statuses = ['absent'],
  now,
  logger,
} = {}) {
  if (!AttendanceRecordModel || !integrationBus) {
    return { scanned: 0, emitted: 0, errors: 0, reason: 'missing_deps' };
  }

  const { start, end } = yesterdayWindow(now);
  let records = [];
  try {
    records = await AttendanceRecordModel.find(
      {
        status: { $in: statuses },
        date: { $gte: start, $lt: end },
        deleted_at: null,
      },
      { _id: 1, employee_id: 1, date: 1, status: 1 }
    ).lean();
  } catch (err) {
    logger?.warn?.('[absenceDetectionSweeper] find failed', { error: err.message });
    return { scanned: 0, emitted: 0, errors: 1, reason: 'find_failed' };
  }

  let emitted = 0;
  let errors = 0;
  for (const r of records) {
    try {
      await integrationBus.publish('attendance', 'absence.detected', {
        employeeId: String(r.employee_id || ''),
        date: r.date instanceof Date ? r.date.toISOString() : String(r.date || ''),
        type: TYPE_MAP[r.status] || 'unknown',
      });
      emitted++;
    } catch (err) {
      errors++;
      logger?.warn?.('[absenceDetectionSweeper] publish failed', {
        recordId: String(r._id),
        error: err.message,
      });
    }
  }

  if (emitted > 0) {
    logger?.info?.(
      `[absenceDetectionSweeper] window=[${start.toISOString()},${end.toISOString()}) scanned=${records.length} emitted=${emitted} errors=${errors}`
    );
  }

  return { scanned: records.length, emitted, errors };
}

module.exports = {
  sweepAbsenceDetection,
  yesterdayWindow,
  TYPE_MAP,
};
