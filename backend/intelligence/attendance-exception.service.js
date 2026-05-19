'use strict';

/**
 * attendance-exception.service.js — Wave 123.
 *
 * Detects + persists attendance exceptions. Two layers:
 *
 *   1. emitException({...}) — single entry point used by other
 *      services (the parser, mobile-attendance, payroll-lock) when
 *      they encounter a known exception condition. Upserts by
 *      dedupKey so re-runs don't multiply.
 *
 *   2. detectPatterns({windowDays, runId}) — periodic scan over
 *      attendance source events to surface multi-event patterns
 *      (late-arrival-pattern, careless-clocking, branch-lateness).
 *      Designed to run from the Wave-108 scheduler.
 *
 * Lifecycle:
 *   acknowledgeException(id, actor) → status='acknowledged'
 *   resolveException(id, actor, note) → status='resolved'
 *   dismissException(id, actor, note) → status='dismissed'
 *   escalateException(id, actor, escalatedToRole, note) → status='escalated'
 *
 * Read API:
 *   listExceptions({owner?, status?, severity?, branchId?, limit, skip})
 *   getException(id)
 *   summarizeByOwner() — counters per ownerRole for the badge bar
 */

const reg = require('./attendance.registry');

function createAttendanceExceptionService({
  exceptionModel = null,
  sourceEventModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!exceptionModel) {
    throw new Error('attendance-exception: exceptionModel required');
  }

  // ─── Single-event emission ─────────────────────────────────

  /**
   * emitException — upsert by dedupKey. Returns
   *   { ok, exception, created: bool }  on success
   *   { ok:false, reason, errors? }     on validation failure.
   *
   * Caller supplies kind + employeeId/branchId/shiftDate (the dedup
   * inputs) + summaryAr + details + evidenceEventIds. Severity +
   * ownerRole are derived from registry metadata.
   */
  async function emitException({
    kind,
    employeeId = null,
    branchId = null,
    shiftDate = null,
    summaryAr,
    details = {},
    evidenceEventIds = [],
    detectorRunId = null,
    severityOverride = null,
    extraDedup = '',
  } = {}) {
    if (!kind || !reg.EXCEPTION_KINDS.includes(kind)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { kind: 'must be a known EXCEPTION_KIND' },
      };
    }
    const meta = reg.exceptionMeta(kind);
    const dedupKey = reg.exceptionDedupKey({
      kind,
      employeeId,
      branchId,
      shiftDate,
      extra: extraDedup,
    });

    // Upsert by dedupKey — if the row exists, refresh details +
    // evidenceEventIds + detectorRunId but DON'T reopen if the
    // operator already moved it to resolved/dismissed.
    let existing = null;
    try {
      let q = exceptionModel.findOne({ dedupKey });
      if (q && typeof q.lean === 'function') q = q.lean();
      existing = await q;
    } catch (err) {
      logger.warn(`[attendance-exception] dedup lookup failed: ${err.message}`);
    }

    if (existing) {
      const terminal = [reg.EXCEPTION_STATUS.RESOLVED, reg.EXCEPTION_STATUS.DISMISSED].includes(
        existing.status
      );
      if (terminal) {
        return { ok: true, exception: existing, created: false, skipped: 'terminal' };
      }
      // Refresh details + evidence on re-detection.
      try {
        await exceptionModel.updateOne(
          { dedupKey },
          {
            $set: {
              details,
              evidenceEventIds,
              summaryAr,
              detectorRunId,
              // bump severity if registry+override now says higher
              severity: severityOverride || meta.severity,
            },
          }
        );
      } catch (err) {
        logger.warn(`[attendance-exception] update failed: ${err.message}`);
      }
      return {
        ok: true,
        exception: { ...existing, details, evidenceEventIds, summaryAr },
        created: false,
      };
    }

    const docData = {
      kind,
      severity: severityOverride || meta.severity,
      ownerRole: meta.owner,
      employeeId,
      branchId,
      shiftDate,
      dedupKey,
      summaryAr,
      details,
      evidenceEventIds,
      detectorRunId,
      status: reg.EXCEPTION_STATUS.OPEN,
      detectedAt: now(),
      resolution: {
        actorId: null,
        actorRole: null,
        decidedAt: null,
        note: null,
        escalatedToRole: null,
      },
    };
    const doc = new exceptionModel(docData);
    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      // Unique-index race — another caller inserted same dedupKey
      // between our findOne + save. Treat as success.
      if (err && err.code === 11000) {
        let q = exceptionModel.findOne({ dedupKey });
        if (q && typeof q.lean === 'function') q = q.lean();
        const winner = await q;
        return { ok: true, exception: winner, created: false, raced: true };
      }
      logger.error('[attendance-exception] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, exception: doc.toObject ? doc.toObject() : doc, created: true };
  }

  // ─── Pattern detector ─────────────────────────────────────

  /**
   * detectPatterns — scans recent source events to surface multi-
   * event patterns. Designed for cron invocation. Returns:
   *   { ok, scanned, emitted, patterns: [{kind, count}] }
   */
  async function detectPatterns({ windowDays = 7, runId = `detect-${Date.now()}` } = {}) {
    if (!sourceEventModel) {
      return { ok: false, reason: 'sourceEventModel-unavailable' };
    }
    const since = new Date(now().getTime() - windowDays * 24 * 3600 * 1000);
    let cursor = sourceEventModel.find({ eventTime: { $gte: since } });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let events;
    try {
      events = (await cursor) || [];
    } catch (err) {
      logger.warn(`[attendance-exception] event scan failed: ${err.message}`);
      return { ok: false, reason: 'scan-failed' };
    }

    const emitted = [];
    let lateEmitted = 0;
    let carelessEmitted = 0;
    let branchLatenessEmitted = 0;

    // ── Late-arrival pattern: per employee, count events with
    //    flag 'late' or expectedWindow violation within
    //    LATE_PATTERN_WINDOW_DAYS, threshold MIN_EVENTS.
    const lateWindow = new Date(
      now().getTime() - reg.PATTERN_THRESHOLDS.LATE_PATTERN_WINDOW_DAYS * 24 * 3600 * 1000
    );
    const byEmployeeLate = new Map();
    for (const e of events) {
      if (!e.employeeId) continue;
      if (new Date(e.eventTime).getTime() < lateWindow.getTime()) continue;
      const wasLate =
        e.eventKind === 'check-in' &&
        e.expectedWindow &&
        e.expectedWindow.latestCheckIn &&
        new Date(e.eventTime).getTime() > new Date(e.expectedWindow.latestCheckIn).getTime();
      if (!wasLate) continue;
      const key = String(e.employeeId);
      const slot = byEmployeeLate.get(key) || { ids: [], branch: e.branchId };
      slot.ids.push(e._id);
      byEmployeeLate.set(key, slot);
    }
    for (const [empId, slot] of byEmployeeLate) {
      if (slot.ids.length < reg.PATTERN_THRESHOLDS.LATE_PATTERN_MIN_EVENTS) continue;
      const r = await emitException({
        kind: reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN,
        employeeId: empId,
        branchId: slot.branch,
        shiftDate: null,
        summaryAr: `الموظف سجَّل ${slot.ids.length} تأخّر خلال ${reg.PATTERN_THRESHOLDS.LATE_PATTERN_WINDOW_DAYS} أيام`,
        details: {
          lateEventCount: slot.ids.length,
          windowDays: reg.PATTERN_THRESHOLDS.LATE_PATTERN_WINDOW_DAYS,
        },
        evidenceEventIds: slot.ids.slice(0, 20),
        detectorRunId: runId,
      });
      if (r.ok && r.created) {
        lateEmitted += 1;
        emitted.push({ kind: reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN, employeeId: empId });
      }
    }

    // ── Careless clocking: per employee, count missing-checkout
    //    events within CARELESS_PATTERN_WINDOW_DAYS. Missing-checkout
    //    is detected by check-in without a matching check-out within
    //    the same shiftDate (using AttendanceSourceEvent's
    //    expectedWindow.shiftId + day match).
    const carelessWindow = new Date(
      now().getTime() - reg.PATTERN_THRESHOLDS.CARELESS_PATTERN_WINDOW_DAYS * 24 * 3600 * 1000
    );
    const byEmployeeDay = new Map(); // empId|YYYY-MM-DD → {hasCheckIn, hasCheckOut, branchId, ids}
    for (const e of events) {
      if (!e.employeeId || !e.eventTime) continue;
      if (new Date(e.eventTime).getTime() < carelessWindow.getTime()) continue;
      const day = new Date(e.eventTime).toISOString().slice(0, 10);
      const key = `${String(e.employeeId)}|${day}`;
      const slot = byEmployeeDay.get(key) || {
        employeeId: e.employeeId,
        branchId: e.branchId,
        day,
        hasCheckIn: false,
        hasCheckOut: false,
        ids: [],
      };
      if (e.eventKind === 'check-in') slot.hasCheckIn = true;
      if (e.eventKind === 'check-out') slot.hasCheckOut = true;
      slot.ids.push(e._id);
      byEmployeeDay.set(key, slot);
    }
    const carelessByEmployee = new Map();
    for (const slot of byEmployeeDay.values()) {
      if (slot.hasCheckIn && !slot.hasCheckOut) {
        const ck = String(slot.employeeId);
        const acc = carelessByEmployee.get(ck) || { count: 0, branchId: slot.branchId, days: [] };
        acc.count += 1;
        acc.days.push(slot.day);
        carelessByEmployee.set(ck, acc);
      }
    }
    for (const [empId, acc] of carelessByEmployee) {
      if (acc.count < reg.PATTERN_THRESHOLDS.CARELESS_PATTERN_MIN_EVENTS) continue;
      const r = await emitException({
        kind: reg.EXCEPTION_KIND.CARELESS_CLOCKING,
        employeeId: empId,
        branchId: acc.branchId,
        shiftDate: null,
        summaryAr: `${acc.count} يوم بدون تسجيل خروج خلال ${reg.PATTERN_THRESHOLDS.CARELESS_PATTERN_WINDOW_DAYS} يوماً`,
        details: { missingCount: acc.count, sampledDays: acc.days.slice(0, 10) },
        evidenceEventIds: [],
        detectorRunId: runId,
      });
      if (r.ok && r.created) {
        carelessEmitted += 1;
        emitted.push({ kind: reg.EXCEPTION_KIND.CARELESS_CLOCKING, employeeId: empId });
      }
    }

    // ── Branch-lateness: per branch, count days where % of late
    //    employees exceeds threshold.
    const byBranchDay = new Map();
    for (const slot of byEmployeeDay.values()) {
      if (!slot.branchId) continue;
      const key = `${String(slot.branchId)}|${slot.day}`;
      const acc = byBranchDay.get(key) || {
        branchId: slot.branchId,
        day: slot.day,
        total: 0,
        late: 0,
      };
      acc.total += 1;
      // Heuristic: any of the slot's events flagged late
      const wasLateDay = (slot.ids || []).some(id =>
        events.some(
          e =>
            String(e._id) === String(id) &&
            e.eventKind === 'check-in' &&
            e.expectedWindow &&
            e.expectedWindow.latestCheckIn &&
            new Date(e.eventTime).getTime() > new Date(e.expectedWindow.latestCheckIn).getTime()
        )
      );
      if (wasLateDay) acc.late += 1;
      byBranchDay.set(key, acc);
    }
    for (const acc of byBranchDay.values()) {
      if (acc.total < 5) continue; // skip tiny days
      const pct = acc.late / acc.total;
      if (pct < reg.PATTERN_THRESHOLDS.BRANCH_LATENESS_PCT) continue;
      const r = await emitException({
        kind: reg.EXCEPTION_KIND.BRANCH_LATENESS,
        employeeId: null,
        branchId: acc.branchId,
        shiftDate: new Date(`${acc.day}T00:00:00Z`),
        summaryAr: `${Math.round(pct * 100)}% من الموظفين تأخّروا (${acc.late} من ${acc.total})`,
        details: { latePct: Number(pct.toFixed(2)), lateCount: acc.late, totalCount: acc.total },
        evidenceEventIds: [],
        detectorRunId: runId,
      });
      if (r.ok && r.created) {
        branchLatenessEmitted += 1;
        emitted.push({ kind: reg.EXCEPTION_KIND.BRANCH_LATENESS, branchId: acc.branchId });
      }
    }

    return {
      ok: true,
      scanned: events.length,
      emitted: emitted.length,
      patterns: [
        { kind: reg.EXCEPTION_KIND.LATE_ARRIVAL_PATTERN, count: lateEmitted },
        { kind: reg.EXCEPTION_KIND.CARELESS_CLOCKING, count: carelessEmitted },
        { kind: reg.EXCEPTION_KIND.BRANCH_LATENESS, count: branchLatenessEmitted },
      ],
      runId,
    };
  }

  // ─── Lifecycle transitions ─────────────────────────────────

  async function _transition(id, patch) {
    try {
      const r = await exceptionModel.updateOne({ _id: id }, { $set: patch });
      if (!r || (r.modifiedCount === 0 && r.matchedCount === 0)) {
        return { ok: false, reason: 'NOT_FOUND' };
      }
      let q = exceptionModel.findById(id);
      if (q && typeof q.lean === 'function') q = q.lean();
      const fresh = await q;
      return { ok: true, exception: fresh };
    } catch (err) {
      logger.error('[attendance-exception] transition failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
  }

  async function acknowledgeException(id, actor) {
    if (!id) return { ok: false, reason: 'ID_REQUIRED' };
    return _transition(id, {
      status: reg.EXCEPTION_STATUS.ACKNOWLEDGED,
      'resolution.actorId': actor?.actorId || null,
      'resolution.actorRole': actor?.role || null,
      'resolution.decidedAt': now(),
    });
  }

  async function resolveException(id, actor, note) {
    if (!id) return { ok: false, reason: 'ID_REQUIRED' };
    if (!actor || !actor.actorId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'actorId required' },
      };
    }
    return _transition(id, {
      status: reg.EXCEPTION_STATUS.RESOLVED,
      'resolution.actorId': actor.actorId,
      'resolution.actorRole': actor.role || null,
      'resolution.decidedAt': now(),
      'resolution.note': note || null,
    });
  }

  async function dismissException(id, actor, note) {
    if (!id) return { ok: false, reason: 'ID_REQUIRED' };
    if (!actor || !actor.actorId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'actorId required' },
      };
    }
    if (!note || String(note).trim().length < 5) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { note: 'dismissal requires note ≥ 5 chars' },
      };
    }
    return _transition(id, {
      status: reg.EXCEPTION_STATUS.DISMISSED,
      'resolution.actorId': actor.actorId,
      'resolution.actorRole': actor.role || null,
      'resolution.decidedAt': now(),
      'resolution.note': note,
    });
  }

  async function escalateException(id, actor, escalatedToRole, note) {
    if (!id) return { ok: false, reason: 'ID_REQUIRED' };
    if (!actor || !actor.actorId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'actorId required' },
      };
    }
    if (!escalatedToRole) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { escalatedToRole: 'required' },
      };
    }
    return _transition(id, {
      status: reg.EXCEPTION_STATUS.ESCALATED,
      'resolution.actorId': actor.actorId,
      'resolution.actorRole': actor.role || null,
      'resolution.decidedAt': now(),
      'resolution.escalatedToRole': escalatedToRole,
      'resolution.note': note || null,
      ownerRole: escalatedToRole,
    });
  }

  // ─── Read API ─────────────────────────────────────────────

  async function listExceptions({
    owner = null,
    status = null,
    severity = null,
    branchId = null,
    limit = 50,
    skip = 0,
  } = {}) {
    const q = {};
    if (owner) q.ownerRole = owner;
    if (status) q.status = status;
    if (severity) q.severity = severity;
    if (branchId) q.branchId = branchId;
    const cappedLimit = Math.max(1, Math.min(500, Number(limit) || 50));
    const cappedSkip = Math.max(0, Number(skip) || 0);
    let cursor = exceptionModel
      .find(q)
      .sort({ severity: 1, detectedAt: -1 })
      .skip(cappedSkip)
      .limit(cappedLimit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = (await cursor) || [];
    const total =
      typeof exceptionModel.countDocuments === 'function'
        ? await exceptionModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getException(id) {
    let q = exceptionModel.findById(id);
    if (q && typeof q.lean === 'function') q = q.lean();
    const row = await q;
    if (!row) return { ok: false, reason: 'NOT_FOUND' };
    return { ok: true, exception: row };
  }

  async function summarizeByOwner() {
    let q = exceptionModel.find({
      status: { $in: [reg.EXCEPTION_STATUS.OPEN, reg.EXCEPTION_STATUS.ACKNOWLEDGED] },
    });
    if (typeof q.lean === 'function') q = q.lean();
    const rows = (await q) || [];
    const byOwner = {};
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const r of rows) {
      byOwner[r.ownerRole] = (byOwner[r.ownerRole] || 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    }
    return { ok: true, totalOpen: rows.length, byOwner, bySeverity };
  }

  // ─── Internals ────────────────────────────────────────────

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const [k, v] of Object.entries(err.errors)) {
        errors[k] = (v && v.message) || String(v);
      }
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    emitException,
    detectPatterns,
    acknowledgeException,
    resolveException,
    dismissException,
    escalateException,
    listExceptions,
    getException,
    summarizeByOwner,
  };
}

module.exports = { createAttendanceExceptionService };
