'use strict';

/**
 * clinical-attendance-reconciliation.service.js — Wave 136.
 *
 * Cross-checks therapist attendance (Wave 131 DailyAttendanceRecord)
 * against scheduled clinical sessions. Catches healthcare-critical
 * mismatches that pure attendance data cannot see:
 *
 *   ghost-presence: signed in, no completed sessions, BUT had ≥1
 *     scheduled session that day → therapist on premises but failed
 *     to deliver care
 *
 *   phantom-session: a session row says status=completed, but the
 *     therapist's DailyAttendanceRecord shows status=absent → either
 *     the session record is fraudulent or the attendance is missing
 *
 *   late-for-session: signed in AFTER the first scheduled session's
 *     start time → patient waited
 *
 *   shift-mismatch: signed in on a day with NO scheduled sessions →
 *     spurious presence, likely time-clock error
 *
 * Severity policy (HEALTHCARE-CRITICAL):
 *   - phantom-session → critical (potential billing fraud / care
 *     gap)
 *   - ghost-presence → high (paid for time, no care delivered)
 *   - late-for-session → medium
 *   - shift-mismatch → low
 *
 * Public API:
 *   reconcileEmployeeDay({ employeeId, sessionDate })
 *   reconcileBranchDay({ branchId, sessionDate })
 *   listDiscrepancies({ status?, kind?, employeeId?, branchId? })
 *   resolveDiscrepancy({ discrepancyId, actorId, actorRole, note })
 *   dismissDiscrepancy({ discrepancyId, actorId, actorRole, note })
 *
 * Idempotent — dedupKey collapses re-runs.
 */

function _dayBounds(d) {
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function _dedupKey({ kind, employeeId, sessionDate, extra = '' }) {
  return [
    String(kind || ''),
    String(employeeId || ''),
    new Date(sessionDate).toISOString().slice(0, 10),
    String(extra || ''),
  ].join('|');
}

const SEVERITY_BY_KIND = Object.freeze({
  'ghost-presence': 'high',
  'phantom-session': 'critical',
  'late-for-session': 'medium',
  'shift-mismatch': 'low',
});

function createClinicalAttendanceReconciliationService({
  discrepancyModel = null,
  dailyRecordModel = null,
  therapySessionModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!discrepancyModel) {
    throw new Error('clinical-reconcile: discrepancyModel required');
  }
  if (!dailyRecordModel) {
    throw new Error('clinical-reconcile: dailyRecordModel required');
  }
  if (!therapySessionModel) {
    throw new Error('clinical-reconcile: therapySessionModel required');
  }

  async function _loadDailyRecord({ employeeId, sessionDate }) {
    const day = _dayBounds(sessionDate).start;
    try {
      const cursor = dailyRecordModel.findOne({ employeeId, shiftDate: day });
      if (cursor && typeof cursor.then === 'function') return await cursor;
      if (cursor && typeof cursor.lean === 'function') return await cursor.lean();
      return cursor;
    } catch (err) {
      logger.warn(`[clinical-reconcile] daily lookup failed: ${err.message}`);
      return null;
    }
  }

  async function _loadSessions({ employeeId, sessionDate }) {
    const { start, end } = _dayBounds(sessionDate);
    let cursor = therapySessionModel.find({
      therapistId: employeeId,
      sessionDate: { $gte: start, $lte: end },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[clinical-reconcile] session lookup failed: ${err.message}`);
      return [];
    }
  }

  async function _emitDiscrepancy({
    kind,
    employeeId,
    branchId,
    sessionDate,
    summaryAr,
    details = {},
    dailyRecordId = null,
    sessionIds = [],
    extra = '',
  }) {
    const severity = SEVERITY_BY_KIND[kind] || 'medium';
    const dedupKey = _dedupKey({ kind, employeeId, sessionDate, extra });
    // Check existing.
    let existing;
    try {
      const cursor = discrepancyModel.findOne({ dedupKey });
      existing =
        cursor && typeof cursor.then === 'function'
          ? await cursor
          : typeof cursor?.lean === 'function'
            ? await cursor.lean()
            : cursor;
    } catch (err) {
      logger.warn(`[clinical-reconcile] dedup lookup failed: ${err.message}`);
    }
    if (existing) {
      // Don't reopen terminal-status discrepancies; just return.
      return { ok: true, idempotent: true, discrepancy: existing };
    }
    const doc = new discrepancyModel({
      kind,
      severity,
      employeeId,
      branchId: branchId || null,
      sessionDate,
      dedupKey,
      dailyRecordId,
      sessionIds,
      summaryAr,
      details,
      status: 'open',
      detectedAt: now(),
    });
    try {
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: 'VALIDATION_FAILED', errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[clinical-reconcile] save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED' };
    }
    return { ok: true, discrepancy: doc.toObject ? doc.toObject() : doc };
  }

  async function reconcileEmployeeDay({ employeeId, sessionDate } = {}) {
    if (!employeeId) return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    if (!sessionDate) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { sessionDate: 'required' },
      };
    }
    const day = _dayBounds(sessionDate).start;
    const [daily, sessions] = await Promise.all([
      _loadDailyRecord({ employeeId, sessionDate: day }),
      _loadSessions({ employeeId, sessionDate: day }),
    ]);

    const completedSessions = sessions.filter(
      s => s.status === 'completed' || s.status === 'مكتمل'
    );
    const scheduledSessions = sessions.filter(
      s =>
        s.status === 'scheduled' ||
        s.status === 'completed' ||
        s.status === 'in-progress' ||
        s.status === 'مجدول'
    );
    const presentDay =
      daily &&
      ['closed', 'partial', 'overridden', 'locked'].includes(daily.status) &&
      (daily.attendanceType === 'on-site' ||
        daily.attendanceType === 'overtime' ||
        daily.attendanceType === 'partial-day');

    const emitted = [];

    // 1. phantom-session: a completed session, but no presence.
    if (completedSessions.length > 0 && !presentDay) {
      const r = await _emitDiscrepancy({
        kind: 'phantom-session',
        employeeId,
        branchId: daily ? daily.branchId : null,
        sessionDate: day,
        summaryAr: `جلسة مكتملة بدون حضور — ${completedSessions.length} جلسة`,
        details: {
          completedSessionCount: completedSessions.length,
          dailyStatus: daily ? daily.status : 'no-record',
        },
        sessionIds: completedSessions.map(s => s._id),
        dailyRecordId: daily ? daily._id : null,
      });
      if (r.ok) emitted.push(r);
    }

    // 2. ghost-presence: presence, scheduled sessions, but none completed.
    if (presentDay && scheduledSessions.length > 0 && completedSessions.length === 0) {
      const r = await _emitDiscrepancy({
        kind: 'ghost-presence',
        employeeId,
        branchId: daily ? daily.branchId : null,
        sessionDate: day,
        summaryAr: `حضور دون تنفيذ أي جلسة (${scheduledSessions.length} جلسات مجدولة)`,
        details: {
          scheduledSessionCount: scheduledSessions.length,
          workedMinutes: daily.workedMinutes || null,
        },
        sessionIds: scheduledSessions.map(s => s._id),
        dailyRecordId: daily._id,
      });
      if (r.ok) emitted.push(r);
    }

    // 3. late-for-session: check-in time AFTER first scheduled session start.
    if (presentDay && daily.checkIn && scheduledSessions.length > 0) {
      const firstSession = scheduledSessions
        .slice()
        .sort(
          (a, b) => new Date(a.startTime || a.sessionDate) - new Date(b.startTime || b.sessionDate)
        )[0];
      const firstStart = firstSession.startTime || firstSession.sessionDate;
      if (firstStart) {
        const checkInMs = new Date(daily.checkIn.eventTime).getTime();
        const firstStartMs = new Date(firstStart).getTime();
        if (checkInMs > firstStartMs) {
          const lateMinutes = Math.round((checkInMs - firstStartMs) / 60_000);
          if (lateMinutes >= 5) {
            // ≥5min late
            const r = await _emitDiscrepancy({
              kind: 'late-for-session',
              employeeId,
              branchId: daily.branchId,
              sessionDate: day,
              summaryAr: `تأخّر ${lateMinutes} دقيقة عن أول جلسة مجدولة`,
              details: {
                lateMinutes,
                firstSessionStart: firstStart,
                checkInAt: daily.checkIn.eventTime,
              },
              sessionIds: [firstSession._id],
              dailyRecordId: daily._id,
            });
            if (r.ok) emitted.push(r);
          }
        }
      }
    }

    // 4. shift-mismatch: presence on a day with no scheduled sessions.
    if (presentDay && sessions.length === 0) {
      const r = await _emitDiscrepancy({
        kind: 'shift-mismatch',
        employeeId,
        branchId: daily.branchId,
        sessionDate: day,
        summaryAr: 'حضور بدون أي جلسات مجدولة لهذا اليوم',
        details: {
          workedMinutes: daily.workedMinutes || null,
        },
        dailyRecordId: daily._id,
      });
      if (r.ok) emitted.push(r);
    }

    return {
      ok: true,
      employeeId,
      sessionDate: day,
      sessionCount: sessions.length,
      completedSessionCount: completedSessions.length,
      presentDay,
      discrepanciesEmitted: emitted.length,
      discrepancies: emitted.map(e => e.discrepancy),
    };
  }

  async function reconcileBranchDay({ branchId, sessionDate } = {}) {
    if (!branchId) return { ok: false, reason: 'BRANCH_REQUIRED' };
    if (!sessionDate) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { sessionDate: 'required' },
      };
    }
    const day = _dayBounds(sessionDate).start;
    // Find all therapists with either an attendance row OR a session on that day.
    let dailyCursor = dailyRecordModel.find({ branchId, shiftDate: day });
    if (typeof dailyCursor.lean === 'function') dailyCursor = dailyCursor.lean();
    let sessionCursor = therapySessionModel.find({
      branchId,
      sessionDate: { $gte: day, $lte: _dayBounds(sessionDate).end },
    });
    if (typeof sessionCursor.lean === 'function') sessionCursor = sessionCursor.lean();

    let dailyRows = [];
    let sessionRows = [];
    try {
      dailyRows = (await dailyCursor) || [];
      sessionRows = (await sessionCursor) || [];
    } catch (err) {
      logger.warn(`[clinical-reconcile] branch load failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
    const employees = new Set();
    for (const d of dailyRows) employees.add(String(d.employeeId));
    for (const s of sessionRows) employees.add(String(s.therapistId));

    const results = [];
    for (const empId of employees) {
      const r = await reconcileEmployeeDay({ employeeId: empId, sessionDate: day });
      results.push({
        employeeId: empId,
        ok: r.ok,
        discrepanciesEmitted: r.discrepanciesEmitted || 0,
      });
    }
    const totalDiscrepancies = results.reduce((acc, r) => acc + (r.discrepanciesEmitted || 0), 0);
    return {
      ok: true,
      branchId,
      sessionDate: day,
      employeesScanned: employees.size,
      totalDiscrepancies,
      results,
    };
  }

  async function listDiscrepancies({
    status = null,
    kind = null,
    employeeId = null,
    branchId = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const q = {};
    if (status) q.status = status;
    if (kind) q.kind = kind;
    if (employeeId) q.employeeId = employeeId;
    if (branchId) q.branchId = branchId;
    let cursor = discrepancyModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ detectedAt: -1 });
    if (typeof cursor.skip === 'function') cursor = cursor.skip(skip);
    if (typeof cursor.limit === 'function') cursor = cursor.limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return { ok: true, discrepancies: (await cursor) || [] };
    } catch (err) {
      logger.warn(`[clinical-reconcile] list failed: ${err.message}`);
      return { ok: false, reason: 'LOAD_FAILED' };
    }
  }

  async function _decide({ discrepancyId, actorId, actorRole, note, newStatus }) {
    if (!discrepancyId) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { discrepancyId: 'required' },
      };
    }
    if (!actorId) {
      return { ok: false, reason: 'ACTOR_REQUIRED' };
    }
    if (!note || String(note).trim().length < 5) {
      return { ok: false, reason: 'NOTE_TOO_SHORT' };
    }
    let disc;
    try {
      const cursor = discrepancyModel.findById(discrepancyId);
      disc = cursor && typeof cursor.then === 'function' ? await cursor : cursor;
    } catch (err) {
      logger.warn(`[clinical-reconcile] findById failed: ${err.message}`);
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (!disc) return { ok: false, reason: 'NOT_FOUND' };
    if (disc.status !== 'open' && disc.status !== 'acknowledged') {
      return {
        ok: false,
        reason: 'NOT_PENDING',
        currentStatus: disc.status,
      };
    }
    disc.status = newStatus;
    disc.resolution = {
      actorId,
      actorRole: actorRole || null,
      decidedAt: now(),
      note: String(note).trim(),
    };
    try {
      await disc.save();
    } catch (err) {
      logger.error('[clinical-reconcile] decide save failed:', err.message);
      return { ok: false, reason: 'SAVE_FAILED' };
    }
    return { ok: true, discrepancy: disc.toObject ? disc.toObject() : disc };
  }

  function resolveDiscrepancy({ discrepancyId, actorId, actorRole, note } = {}) {
    return _decide({ discrepancyId, actorId, actorRole, note, newStatus: 'resolved' });
  }
  function dismissDiscrepancy({ discrepancyId, actorId, actorRole, note } = {}) {
    return _decide({ discrepancyId, actorId, actorRole, note, newStatus: 'dismissed' });
  }

  return {
    reconcileEmployeeDay,
    reconcileBranchDay,
    listDiscrepancies,
    resolveDiscrepancy,
    dismissDiscrepancy,
    SEVERITY_BY_KIND,
  };
}

module.exports = {
  createClinicalAttendanceReconciliationService,
  SEVERITY_BY_KIND,
};
