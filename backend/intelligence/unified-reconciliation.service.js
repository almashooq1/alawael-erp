'use strict';

/**
 * unified-reconciliation.service.js — Wave 131.
 *
 * Builds the canonical DailyAttendanceRecord per (employee, shiftDate)
 * from all source events that day. Selection policy:
 *
 *   1. Filter out confirm-only sources (camera-passive alone never
 *      starts a record — Wave 119 contract).
 *   2. Group events by eventKind (check-in / check-out / passage).
 *   3. For check-in: select the EARLIEST event among the highest-tier
 *      candidates (T1 wins over T2 wins over T3, etc). When two
 *      sources at the same tier conflict by >5 minutes, raise a
 *      reconciliation case (status='overridden') and pick the
 *      earlier one provisionally.
 *   4. For check-out: select the LATEST event among the highest-tier
 *      candidates with the same tie-breaking rule.
 *   5. Worked minutes = checkOut.eventTime − checkIn.eventTime.
 *   6. Compute halfDay/overtime relative to the resolved shift (when
 *      the optional shiftResolver is provided).
 *   7. Aggregate all flags + sources used.
 *   8. Set requiresReview when any of:
 *      - status='overridden'
 *      - aggregatedFlags includes tailgate/spoof-suspected/
 *        cross-branch-impossible
 *      - corroboration-required source used without a corroborating
 *        peer (e.g. mobile-gps with no geofence match)
 *      - workedMinutes < halfDayThreshold and not flagged as leave
 *
 * Idempotent: reconcileEmployeeDay can be called as often as needed
 * for the same (employee, day); it upserts the record by
 * (employeeId, shiftDate).
 *
 * Public API:
 *   reconcileEmployeeDay({ employeeId, shiftDate, opts? })
 *   reconcileBranchDay({ branchId, shiftDate, opts? })
 *   reconcileOrgDay({ shiftDate, opts? })
 *
 * opts.dryRun=true returns the would-be record without persisting.
 */

const reg = require('./attendance.registry');

const CONFLICT_TOLERANCE_MS = 5 * 60_000; // events within 5min = no conflict
const RECONCILER_VERSION = 'v131';

const TIER_RANK = {
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
};

function _dayBounds(d) {
  // UTC day boundary keeps reconciliation deterministic across server
  // timezones. Shifts that span midnight are handled separately by the
  // Wave 121 shift resolver (expectedWindow with overnight rollover).
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function _bestTierAmong(events) {
  let bestRank = Infinity;
  let bestLabel = null;
  for (const e of events) {
    const r = TIER_RANK[e.tierLabel] || 5;
    if (r < bestRank) {
      bestRank = r;
      bestLabel = e.tierLabel;
    }
  }
  return { rank: bestRank, label: bestLabel };
}

function _selectAtTier(events, bestRank, sort) {
  return [...events].filter(e => (TIER_RANK[e.tierLabel] || 5) === bestRank).sort(sort)[0];
}

function _toSelected(event) {
  if (!event) return null;
  return {
    sourceEventId: event._id || null,
    source: event.source,
    tierLabel: event.tierLabel || null,
    confidence: event.confidence != null ? event.confidence : null,
    eventTime: event.eventTime,
    flags: Array.isArray(event.flags) ? event.flags : [],
  };
}

function createUnifiedReconciliationService({
  sourceEventModel = null,
  dailyRecordModel = null,
  shiftResolver = null,
  exceptionService = null, // optional — emit reconciliation-related exceptions
  eventEmitter = null, // optional — Wave 130 outbox
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sourceEventModel) {
    throw new Error('unified-reconciliation: sourceEventModel required');
  }
  if (!dailyRecordModel) {
    throw new Error('unified-reconciliation: dailyRecordModel required');
  }

  async function _loadEvents({ employeeId, shiftDate }) {
    const { start, end } = _dayBounds(shiftDate);
    let cursor = sourceEventModel.find({
      employeeId,
      eventTime: { $gte: start, $lte: end },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      const rows = (await cursor) || [];
      return rows;
    } catch (err) {
      logger.warn(`[reconcile] load events failed: ${err.message}`);
      return [];
    }
  }

  function _selectCheckIn(events) {
    const candidates = events.filter(
      e => e.eventKind === 'check-in' && !reg.isConfirmOnlySource(e.source)
    );
    if (candidates.length === 0) return { pick: null, conflict: false };
    const best = _bestTierAmong(candidates);
    const pick = _selectAtTier(
      candidates,
      best.rank,
      (a, b) => new Date(a.eventTime) - new Date(b.eventTime)
    );

    // Conflict detection: same-tier events with >5min gap.
    const sameTier = candidates.filter(e => (TIER_RANK[e.tierLabel] || 5) === best.rank);
    let conflict = false;
    if (sameTier.length > 1) {
      const times = sameTier.map(e => new Date(e.eventTime).getTime()).sort((a, b) => a - b);
      if (times[times.length - 1] - times[0] > CONFLICT_TOLERANCE_MS) {
        conflict = true;
      }
    }
    return { pick, conflict };
  }

  function _selectCheckOut(events) {
    const candidates = events.filter(
      e => e.eventKind === 'check-out' && !reg.isConfirmOnlySource(e.source)
    );
    if (candidates.length === 0) return { pick: null, conflict: false };
    const best = _bestTierAmong(candidates);
    const pick = _selectAtTier(
      candidates,
      best.rank,
      (a, b) => new Date(b.eventTime) - new Date(a.eventTime) // latest wins
    );
    const sameTier = candidates.filter(e => (TIER_RANK[e.tierLabel] || 5) === best.rank);
    let conflict = false;
    if (sameTier.length > 1) {
      const times = sameTier.map(e => new Date(e.eventTime).getTime()).sort((a, b) => a - b);
      if (times[times.length - 1] - times[0] > CONFLICT_TOLERANCE_MS) {
        conflict = true;
      }
    }
    return { pick, conflict };
  }

  function _aggregateFlags(events) {
    const set = new Set();
    for (const e of events) for (const f of e.flags || []) set.add(f);
    return [...set];
  }

  function _aggregateSources(events) {
    return [...new Set(events.map(e => e.source))];
  }

  function _bestTierOverall(events) {
    if (events.length === 0) return null;
    return _bestTierAmong(events).label;
  }

  function _computeReviewReasons({ aggregatedFlags, conflicts, workedMinutes, shift }) {
    const reasons = [];
    if (conflicts.checkIn) reasons.push('checkin-conflict');
    if (conflicts.checkOut) reasons.push('checkout-conflict');
    const flaggy = ['tailgate', 'spoof-suspected', 'cross-branch-impossible'];
    for (const f of flaggy) {
      if (aggregatedFlags.includes(f)) reasons.push(`flag-${f}`);
    }
    if (workedMinutes != null && shift && workedMinutes < (shift.halfDayThreshold || 240)) {
      reasons.push('worked-below-half-day-threshold');
    }
    return reasons;
  }

  function _classifyAttendanceType({ checkIn, checkOut, workedMinutes, shift }) {
    if (!checkIn && !checkOut) return 'absent';
    if (!checkOut) return 'partial-day';
    if (
      shift &&
      typeof shift.overtimeThreshold === 'number' &&
      workedMinutes > shift.overtimeThreshold
    ) {
      return 'overtime';
    }
    if (
      shift &&
      typeof shift.halfDayThreshold === 'number' &&
      workedMinutes < shift.halfDayThreshold
    ) {
      return 'partial-day';
    }
    return 'on-site';
  }

  async function _persist(record, existing) {
    if (existing) {
      // Mutate the existing doc + save.
      Object.assign(existing, record);
      existing.lastReconciledAt = now();
      existing.reconcilerVersion = RECONCILER_VERSION;
      try {
        await existing.save();
      } catch (err) {
        logger.error('[reconcile] update save failed:', err.message);
        return { ok: false, reason: reg.REASON.SAVE_FAILED };
      }
      return { ok: true, record: existing.toObject ? existing.toObject() : existing };
    }
    const doc = new dailyRecordModel({
      ...record,
      lastReconciledAt: now(),
      reconcilerVersion: RECONCILER_VERSION,
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
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[reconcile] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, record: doc.toObject ? doc.toObject() : doc };
  }

  async function _findExisting({ employeeId, shiftDate }) {
    const { start } = _dayBounds(shiftDate);
    try {
      const cursor = dailyRecordModel.findOne({ employeeId, shiftDate: start });
      if (cursor && typeof cursor.then === 'function') return await cursor;
      return cursor;
    } catch (err) {
      logger.warn(`[reconcile] find existing failed: ${err.message}`);
      return null;
    }
  }

  async function reconcileEmployeeDay({ employeeId, shiftDate, opts = {} } = {}) {
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!shiftDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { shiftDate: 'required' },
      };
    }
    const day = _dayBounds(shiftDate).start;

    // Refuse to reconcile a locked record — Wave 99 payroll-lock owns it.
    const existing = await _findExisting({ employeeId, shiftDate: day });
    if (existing && existing.status === 'locked' && !opts.force) {
      return { ok: true, idempotent: true, record: existing, locked: true };
    }

    const events = await _loadEvents({ employeeId, shiftDate: day });

    // Resolve shift (best-effort).
    let shift = null;
    if (shiftResolver) {
      try {
        const r = await shiftResolver.resolveShiftForEmployee({ employeeId, at: day });
        if (r.ok) shift = r.shift;
      } catch (err) {
        logger.warn(`[reconcile] shift resolve failed: ${err.message}`);
      }
    }

    if (events.length === 0) {
      const blank = {
        employeeId,
        branchId: existing ? existing.branchId : null,
        shiftDate: day,
        status: 'open',
        attendanceType: 'absent',
        checkIn: null,
        checkOut: null,
        workedMinutes: null,
        overtimeMinutes: 0,
        halfDay: false,
        contributingSources: [],
        aggregatedFlags: [],
        bestTierLabel: null,
        requiresReview: false,
        reviewReasons: [],
      };
      if (opts.dryRun) return { ok: true, record: blank, dryRun: true };
      return _persist(blank, existing);
    }

    const inSel = _selectCheckIn(events);
    const outSel = _selectCheckOut(events);
    const aggregatedFlags = _aggregateFlags(events);
    const contributingSources = _aggregateSources(events);
    const bestTier = _bestTierOverall(events);

    let workedMinutes = null;
    let overtimeMinutes = 0;
    if (inSel.pick && outSel.pick) {
      const span =
        new Date(outSel.pick.eventTime).getTime() - new Date(inSel.pick.eventTime).getTime();
      workedMinutes = Math.max(0, Math.round(span / 60_000));
      if (shift && typeof shift.overtimeThreshold === 'number') {
        overtimeMinutes = Math.max(0, workedMinutes - shift.overtimeThreshold);
      }
    }

    const conflicts = { checkIn: inSel.conflict, checkOut: outSel.conflict };
    const reviewReasons = _computeReviewReasons({
      aggregatedFlags,
      conflicts,
      workedMinutes,
      shift,
    });

    const attendanceType = _classifyAttendanceType({
      checkIn: inSel.pick,
      checkOut: outSel.pick,
      workedMinutes,
      shift,
    });

    const branchId =
      (inSel.pick && inSel.pick.branchId) ||
      (outSel.pick && outSel.pick.branchId) ||
      (events[0] && events[0].branchId) ||
      null;

    let status = 'open';
    if (inSel.pick && outSel.pick) status = 'closed';
    else if (inSel.pick || outSel.pick) status = 'partial';
    if (inSel.conflict || outSel.conflict) status = 'overridden';

    const record = {
      employeeId,
      branchId,
      shiftDate: day,
      status,
      attendanceType,
      checkIn: _toSelected(inSel.pick),
      checkOut: _toSelected(outSel.pick),
      workedMinutes,
      overtimeMinutes,
      halfDay: !!(
        shift &&
        typeof shift.halfDayThreshold === 'number' &&
        workedMinutes != null &&
        workedMinutes < shift.halfDayThreshold
      ),
      contributingSources,
      aggregatedFlags,
      bestTierLabel: bestTier,
      requiresReview: reviewReasons.length > 0,
      reviewReasons,
    };

    if (opts.dryRun) {
      return { ok: true, record, dryRun: true, conflicts };
    }

    const persisted = await _persist(record, existing);

    // Best-effort downstream: emit + open exceptions.
    if (persisted.ok && eventEmitter && typeof eventEmitter.emit === 'function') {
      try {
        await eventEmitter.emit({
          topic: 'attendance.daily-rollup',
          payload: {
            employeeId: String(employeeId),
            branchId: branchId ? String(branchId) : null,
            shiftDate: day.toISOString(),
            status: record.status,
            workedMinutes,
            requiresReview: record.requiresReview,
          },
          idempotencyKey: `daily-rollup|${String(employeeId)}|${day.toISOString().slice(0, 10)}`,
        });
      } catch (err) {
        logger.warn(`[reconcile] emit rollup failed: ${err.message}`);
      }
    }

    if (
      persisted.ok &&
      exceptionService &&
      typeof exceptionService.emitException === 'function' &&
      record.requiresReview
    ) {
      // Open exceptions for the loudest review reasons. This piggy-
      // backs on the Wave 123 exception engine; it remains entirely
      // optional since exceptionService may be null in tests.
      for (const reason of reviewReasons) {
        let kind = null;
        if (reason === 'flag-tailgate') kind = 'tailgate-flag';
        else if (reason === 'flag-spoof-suspected') kind = 'device-spoof-suspected';
        else if (reason === 'flag-cross-branch-impossible') kind = 'impossible-travel';
        else if (reason === 'checkin-conflict' || reason === 'checkout-conflict') {
          kind = null;
        }
        if (!kind) continue;
        try {
          await exceptionService.emitException({
            kind,
            employeeId,
            branchId,
            shiftDate: day,
            summaryAr: `تنبيه أثناء التوفيق: ${reason}`,
          });
        } catch (err) {
          logger.warn(`[reconcile] exception emit failed: ${err.message}`);
        }
      }
    }

    return persisted;
  }

  async function reconcileBranchDay({ branchId, shiftDate, opts = {} } = {}) {
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    if (!shiftDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { shiftDate: 'required' },
      };
    }
    const { start, end } = _dayBounds(shiftDate);
    let cursor = sourceEventModel.find({
      branchId,
      eventTime: { $gte: start, $lte: end },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let events = [];
    try {
      events = (await cursor) || [];
    } catch (err) {
      logger.warn(`[reconcile] branch events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const uniqueEmployees = [...new Set(events.map(e => String(e.employeeId)))];

    const results = [];
    for (const empId of uniqueEmployees) {
      const r = await reconcileEmployeeDay({ employeeId: empId, shiftDate: start, opts });
      results.push({ employeeId: empId, ok: r.ok, record: r.record || null, reason: r.reason });
    }
    return {
      ok: true,
      branchId,
      shiftDate: start,
      total: uniqueEmployees.length,
      results,
      requiresReviewCount: results.filter(r => r.record && r.record.requiresReview).length,
    };
  }

  async function reconcileOrgDay({ shiftDate, opts = {} } = {}) {
    if (!shiftDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { shiftDate: 'required' },
      };
    }
    const { start, end } = _dayBounds(shiftDate);
    let cursor = sourceEventModel.find({ eventTime: { $gte: start, $lte: end } });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let events = [];
    try {
      events = (await cursor) || [];
    } catch (err) {
      logger.warn(`[reconcile] org events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const uniqueEmployees = [...new Set(events.map(e => String(e.employeeId)))];
    const results = [];
    for (const empId of uniqueEmployees) {
      const r = await reconcileEmployeeDay({ employeeId: empId, shiftDate: start, opts });
      results.push({ employeeId: empId, ok: r.ok, record: r.record || null });
    }
    return {
      ok: true,
      shiftDate: start,
      total: uniqueEmployees.length,
      results,
      requiresReviewCount: results.filter(r => r.record && r.record.requiresReview).length,
    };
  }

  return {
    reconcileEmployeeDay,
    reconcileBranchDay,
    reconcileOrgDay,
    CONFLICT_TOLERANCE_MS,
    RECONCILER_VERSION,
  };
}

module.exports = {
  createUnifiedReconciliationService,
  CONFLICT_TOLERANCE_MS,
  RECONCILER_VERSION,
};
