'use strict';

/**
 * shift-resolver.service.js — Wave 121.
 *
 * Resolves the active AttendanceShift for an employee at a given
 * moment + computes the expected check-in/out window for the day
 * that contains that moment.
 *
 * Hot path on the attendance ingestion pipeline: called for every
 * accepted event so each AttendanceSourceEvent carries its
 * expectedWindow inline (Wave 119 schema field).
 *
 * Public API:
 *   resolveShiftForEmployee({ employeeId, at })
 *     → { ok, shift, assignment } | { ok:false, reason }
 *
 *   computeExpectedWindow({ shift, shiftDate })
 *     → pure: { earliestCheckIn, latestCheckIn,
 *               earliestCheckOut, latestCheckOut } | null
 *
 *   classifyEventTime({ shift, eventTime, eventKind })
 *     → pure: { onTime, late, early, lateMinutes, earlyMinutes,
 *               afterHours }
 *
 *   isWorkday({ shift, date })  → boolean (pure)
 *
 *   computeWorkedMinutes({ checkInAt, checkOutAt, shift })
 *     → { totalMinutes, overtimeMinutes, halfDay }
 */

const reg = require('./attendance.registry');

function createShiftResolverService({
  shiftModel = null,
  assignmentModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!shiftModel || !assignmentModel) {
    throw new Error('shift-resolver: shiftModel + assignmentModel required');
  }

  // ─── Public: I/O entry ──────────────────────────────────────

  async function resolveShiftForEmployee({ employeeId, at = now() } = {}) {
    if (!employeeId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }
    const atDate = at instanceof Date ? at : new Date(at);
    if (Number.isNaN(atDate.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }

    // Most-recent assignment with effectiveFrom ≤ atDate and
    // (effectiveTo == null OR effectiveTo > atDate).
    let cursor = assignmentModel
      .find({
        employeeId,
        effectiveFrom: { $lte: atDate },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: atDate } }],
      })
      .sort({ effectiveFrom: -1 })
      .limit(1);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows;
    try {
      rows = await cursor;
    } catch (err) {
      logger.warn(`[shift-resolver] assignment lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const assignment = Array.isArray(rows) ? rows[0] : rows;
    if (!assignment) {
      return { ok: true, shift: null, assignment: null }; // no active shift
    }

    let shift;
    try {
      shift = await _findById(shiftModel, assignment.shiftId);
    } catch (err) {
      logger.warn(`[shift-resolver] shift lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!shift || shift.active === false) {
      return { ok: true, shift: null, assignment };
    }

    return { ok: true, shift, assignment };
  }

  // ─── Pure helpers (exposed for tests + reconciler) ─────────

  function isWorkday({ shift, date } = {}) {
    if (!shift || !date) return false;
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    const dow = d.getUTCDay();
    return Array.isArray(shift.workdays) && shift.workdays.includes(dow);
  }

  function computeExpectedWindow({ shift, shiftDate } = {}) {
    if (!shift || !shiftDate) return null;
    const start = _parseHHMM(shift.start);
    const end = _parseHHMM(shift.end);
    if (!start || !end) return null;
    const d = shiftDate instanceof Date ? shiftDate : new Date(shiftDate);
    if (Number.isNaN(d.getTime())) return null;

    const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const shiftStart = new Date(dayStart.getTime() + (start.h * 60 + start.m) * 60_000);
    const shiftEnd = new Date(dayStart.getTime() + (end.h * 60 + end.m) * 60_000);
    // Handle overnight shift (end <= start → end is next day).
    if (shiftEnd.getTime() <= shiftStart.getTime()) {
      shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
    }
    const grace = (shift.graceMinutes || 0) * 60_000;

    return {
      shiftId: shift._id || null,
      earliestCheckIn: new Date(shiftStart.getTime() - 2 * 60 * 60_000), // 2h before
      latestCheckIn: new Date(shiftStart.getTime() + grace),
      earliestCheckOut: new Date(shiftEnd.getTime() - grace),
      latestCheckOut: new Date(shiftEnd.getTime() + 4 * 60 * 60_000), // 4h overtime cap
      shiftStart,
      shiftEnd,
    };
  }

  function classifyEventTime({ shift, eventTime, eventKind = 'check-in' } = {}) {
    const win = computeExpectedWindow({ shift, shiftDate: eventTime });
    if (!win || !eventTime) {
      return { onTime: false, late: false, early: false, afterHours: false };
    }
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { onTime: false, late: false, early: false, afterHours: false };
    }

    if (eventKind === 'check-in') {
      const lateBy = Math.max(0, Math.round((t.getTime() - win.latestCheckIn.getTime()) / 60_000));
      const earlyBy = Math.max(
        0,
        Math.round((win.earliestCheckIn.getTime() - t.getTime()) / 60_000)
      );
      return {
        onTime: lateBy === 0 && earlyBy === 0,
        late: lateBy > 0,
        early: earlyBy > 0,
        lateMinutes: lateBy,
        earlyMinutes: earlyBy,
        afterHours: t.getTime() > win.latestCheckOut.getTime(),
      };
    }

    if (eventKind === 'check-out') {
      const earlyBy = Math.max(
        0,
        Math.round((win.earliestCheckOut.getTime() - t.getTime()) / 60_000)
      );
      const overtimeBy = Math.max(
        0,
        Math.round((t.getTime() - win.latestCheckOut.getTime()) / 60_000)
      );
      return {
        onTime: earlyBy === 0 && overtimeBy === 0,
        late: false,
        early: earlyBy > 0,
        earlyMinutes: earlyBy,
        overtimeMinutes: overtimeBy,
        afterHours: overtimeBy > 0,
      };
    }

    return { onTime: false, late: false, early: false, afterHours: false };
  }

  function computeWorkedMinutes({ checkInAt, checkOutAt, shift } = {}) {
    if (!checkInAt || !checkOutAt || !shift) {
      return { totalMinutes: 0, overtimeMinutes: 0, halfDay: false };
    }
    const a = checkInAt instanceof Date ? checkInAt : new Date(checkInAt);
    const b = checkOutAt instanceof Date ? checkOutAt : new Date(checkOutAt);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) {
      return { totalMinutes: 0, overtimeMinutes: 0, halfDay: false };
    }
    const total = Math.round((b.getTime() - a.getTime()) / 60_000);
    const overtime = Math.max(0, total - (shift.overtimeThreshold || 480));
    const halfDay = total <= (shift.halfDayThreshold || 240);
    return { totalMinutes: total, overtimeMinutes: overtime, halfDay };
  }

  // ─── Internals ────────────────────────────────────────────

  async function _findById(model, id) {
    if (typeof model.findById === 'function') {
      const q = model.findById(id);
      if (q && typeof q.lean === 'function') return q.lean();
      return q;
    }
    if (typeof model.findOne === 'function') {
      return model.findOne({ _id: id }).lean();
    }
    return null;
  }

  function _parseHHMM(s) {
    if (!s) return null;
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s));
    if (!m) return null;
    return { h: Number(m[1]), m: Number(m[2]) };
  }

  return {
    resolveShiftForEmployee,
    isWorkday,
    computeExpectedWindow,
    classifyEventTime,
    computeWorkedMinutes,
    _parseHHMM,
  };
}

module.exports = { createShiftResolverService };
