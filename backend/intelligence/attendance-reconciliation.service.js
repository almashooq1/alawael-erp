'use strict';

/**
 * attendance-reconciliation.service.js — Wave 99 Phase 4.
 *
 * Reconciles `AttendanceSourceEvent` rows for a given (employeeId,
 * shiftDate) into ONE `AttendanceReconciliationCase`. Steps:
 *
 *   1. Pull all source events for the employee within the shift window
 *      [shiftDate 00:00 - grace, shiftDate+1 00:00 + grace]
 *   2. Dedup within zone+window (reg.dedupByZoneWindow)
 *   3. Pair within corroboration window → upgrade to TIER_1
 *      (reg.findCorroborationPairs)
 *   4. Resolve in/out:
 *        earliest event in shift window → finalCheckIn
 *        latest event in shift window   → finalCheckOut
 *   5. Classify against branch shift calendar (reg.classifyCheckIn/Out)
 *   6. Detect conflicts:
 *        multi-source-disagreement, missing-checkout, missing-checkin,
 *        shift-bridge, impossible-travel
 *   7. UPSERT the reconciliation case
 *
 * The reconciler does NOT mutate source events — it only reads them.
 * Source events stay immutable from the reconciler's perspective.
 *
 * Public API:
 *   reconcileEmployeeDay({ employeeId, shiftDate, shiftHint? })
 *     → { ok, case, conflict, reconciled }
 *
 *   reconcileBranchDay({ branchId, shiftDate, employeeIds? })
 *     → { ok, processed, conflicts, runs[] }
 *
 *   listCases(filter) / getCase(id)
 *   resolveConflict(caseId, { actor, finalCheckIn?, finalCheckOut?, note })
 *     → operator sets final values + closes the conflict
 */

const crypto = require('crypto');
const reg = require('./hikvision.registry');
const { checkMfaTier } = require('./mfa-tier-check.lib');

function createAttendanceReconciliationService({
  caseModel = null,
  sourceEventModel = null,
  branchModel = null, // optional — used to resolve shift calendar
  logger = console,
  now = () => new Date(),
  // ─── Wave 275d — Service-layer MFA tier enforcement ────────────
  // Default OFF (Wave 99 tests construct with plain { userId } actors).
  // app.js opts IN with `enforceMfa: true`. 4th adopter of the
  // [[wave275-service-layer-mfa-pilot]] pattern via shared lib
  // [[wave275c-extract-face-enrollment]].
  enforceMfa = false,
} = {}) {
  if (!caseModel) {
    throw new Error('attendance-reconciliation.service: caseModel is required');
  }
  if (!sourceEventModel) {
    throw new Error('attendance-reconciliation.service: sourceEventModel is required');
  }

  // Wave 275d — local wrapper binding factory enforceMfa + now;
  // delegates to shared lib (extracted W275c).
  function _checkMfaTier(actor, requiredTier, maxAgeMin) {
    return checkMfaTier(actor, requiredTier, maxAgeMin, { enforceMfa, now });
  }

  // ─── Public API ──────────────────────────────────────────────

  async function reconcileEmployeeDay(input = {}) {
    const { employeeId, shiftDate, shiftHint, branchId: branchHint } = input;
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!shiftDate) return { ok: false, reason: reg.REASON.SHIFT_DATE_REQUIRED };

    const sd = _startOfDay(shiftDate);
    const windowStart = new Date(
      sd.getTime() - reg.RECONCILIATION_DEFAULTS.GRACE_PERIOD_MIN * 60_000
    );
    const windowEnd = new Date(
      sd.getTime() + (24 + reg.RECONCILIATION_DEFAULTS.GRACE_PERIOD_MIN / 60) * 60 * 60_000
    );

    // Step 1 — pull source events
    let cursor = sourceEventModel
      .find({
        employeeId,
        accepted: true,
        eventTime: { $gte: windowStart, $lt: windowEnd },
      })
      .sort({ eventTime: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const events = await cursor;

    if (!events || events.length === 0) {
      // No events for this employee on this day — emit/refresh a
      // case with conflictType=NO_EVENTS to surface absences.
      const upserted = await _upsertCase({
        employeeId,
        branchId: branchHint,
        shiftDate: sd,
        sources: [],
        finalCheckIn: null,
        finalCheckOut: null,
        totalMinutes: 0,
        overtimeMinutes: 0,
        checkInClassification: reg.SHIFT_CLASSIFICATION.NO_SHOW,
        checkInDeltaMin: null,
        checkOutClassification: reg.SHIFT_CLASSIFICATION.NO_SHOW,
        checkOutDeltaMin: null,
        conflictType: reg.RECONCILIATION_CONFLICT.NO_EVENTS,
        conflictDetails: 'employee on roster but no source events detected',
        status: 'open',
      });
      return {
        ok: true,
        case: upserted,
        conflict: reg.RECONCILIATION_CONFLICT.NO_EVENTS,
        reconciled: false,
      };
    }

    // Step 2 — dedup within zone window
    const deduped = reg.dedupByZoneWindow(events, {
      windowMs: reg.DEFAULT_CONFIDENCE_THRESHOLDS.DUPLICATE_SUPPRESSION_WINDOW_MS,
    });

    // Step 3 — find corroboration pairs (TIER-2 → TIER-1 upgrade)
    const { pairs, unpaired } = reg.findCorroborationPairs(deduped, {
      windowMs: reg.DEFAULT_CONFIDENCE_THRESHOLDS.CORROBORATION_WINDOW_MS,
    });
    const corroboratedEventIds = new Set();
    for (const p of pairs) {
      // The primary represents the pair; mark both as used.
      corroboratedEventIds.add(String(p.primary._id));
      corroboratedEventIds.add(String(p.corroborator._id));
    }

    // Step 4 — earliest in window = check-in; latest = check-out.
    // Use the deduped list (sorted by time) — first and last.
    const finalCheckIn = deduped[0].eventTime;
    const finalCheckOut = deduped.length === 1 ? null : deduped[deduped.length - 1].eventTime;

    // Step 5 — classify against branch shift calendar
    const shift = await _resolveShift({
      branchId: branchHint || deduped[0].branchId,
      shiftDate: sd,
      shiftHint,
    });

    const checkInResult = shift
      ? reg.classifyCheckIn(finalCheckIn, shift)
      : { classification: null, deltaMin: null };
    const checkOutResult =
      finalCheckOut && shift
        ? reg.classifyCheckOut(finalCheckOut, shift)
        : { classification: null, deltaMin: null };

    // Step 6 — detect conflicts
    let conflictType = reg.RECONCILIATION_CONFLICT.NONE;
    let conflictDetails = null;

    if (deduped.length === 1) {
      conflictType = reg.RECONCILIATION_CONFLICT.MISSING_CHECKOUT;
      conflictDetails = 'only one event detected — no check-out';
    } else {
      // Multi-source disagreement = sources at the SAME zone within
      // the corroboration window have differing eventTime > 5 min
      // (rare but real — fingerprint terminal + face camera mismatched
      // clocks). Use the un-paired remainders for analysis.
      const branchSpan = new Set(deduped.map(e => String(e.branchId)));
      if (branchSpan.size > 1) {
        conflictType = reg.RECONCILIATION_CONFLICT.IMPOSSIBLE_TRAVEL;
        conflictDetails = `events span ${branchSpan.size} branches`;
      } else {
        const disagreement = _detectDisagreement(unpaired);
        if (disagreement) {
          conflictType = reg.RECONCILIATION_CONFLICT.MULTI_SOURCE_DISAGREEMENT;
          conflictDetails = disagreement;
        }
      }
    }

    // Shift bridge = check-out crosses midnight UTC of next day
    if (finalCheckIn && finalCheckOut) {
      const inDate = new Date(finalCheckIn);
      const outDate = new Date(finalCheckOut);
      if (inDate.toDateString() !== outDate.toDateString()) {
        // Only flag as shift-bridge if NOT already an impossible-travel
        if (conflictType === reg.RECONCILIATION_CONFLICT.NONE) {
          conflictType = reg.RECONCILIATION_CONFLICT.SHIFT_BRIDGE;
          conflictDetails = 'check-in and check-out on different calendar days';
        }
      }
    }

    // Total minutes worked
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    if (finalCheckIn && finalCheckOut) {
      totalMinutes = Math.round(
        (new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime()) / 60_000
      );
      if (
        checkOutResult.classification === reg.SHIFT_CLASSIFICATION.OVERTIME &&
        Number.isFinite(checkOutResult.deltaMin)
      ) {
        overtimeMinutes = Math.max(0, checkOutResult.deltaMin);
      }
    }

    // Step 7 — UPSERT case
    const sources = deduped.map(e => ({
      sourceEventId: e._id,
      source: e.source,
      eventTime: e.eventTime,
      trustTier: corroboratedEventIds.has(String(e._id)) ? reg.TRUST_TIER.TIER_1 : e.trustTier,
      used: true,
    }));

    const upserted = await _upsertCase({
      employeeId,
      branchId: branchHint || deduped[0].branchId,
      shiftDate: sd,
      sources,
      finalCheckIn,
      finalCheckOut,
      totalMinutes,
      overtimeMinutes,
      checkInClassification: checkInResult.classification,
      checkInDeltaMin: checkInResult.deltaMin,
      checkOutClassification: checkOutResult.classification,
      checkOutDeltaMin: checkOutResult.deltaMin,
      conflictType,
      conflictDetails,
      status: conflictType === reg.RECONCILIATION_CONFLICT.NONE ? 'resolved' : 'open',
    });

    return {
      ok: true,
      case: upserted,
      conflict: conflictType,
      reconciled: conflictType === reg.RECONCILIATION_CONFLICT.NONE,
    };
  }

  async function reconcileBranchDay(input = {}) {
    const { branchId, shiftDate, employeeIds } = input;
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    if (!shiftDate) return { ok: false, reason: reg.REASON.SHIFT_DATE_REQUIRED };

    const sd = _startOfDay(shiftDate);
    const windowStart = new Date(sd.getTime() - 60 * 60_000);
    const windowEnd = new Date(sd.getTime() + 25 * 60 * 60_000);

    const q = {
      branchId,
      accepted: true,
      eventTime: { $gte: windowStart, $lt: windowEnd },
    };

    // If the caller restricts to specific employees, honour that.
    // Otherwise we discover the set of employees with events that day.
    let employees = employeeIds;
    if (!Array.isArray(employees) || employees.length === 0) {
      let cursor = sourceEventModel.find(q).sort({ eventTime: 1 });
      if (typeof cursor.lean === 'function') cursor = cursor.lean();
      const events = await cursor;
      const set = new Set();
      for (const e of events || []) set.add(String(e.employeeId));
      employees = Array.from(set);
    }

    const runs = [];
    let conflicts = 0;
    for (const emp of employees) {
      const r = await reconcileEmployeeDay({
        employeeId: emp,
        shiftDate: sd,
        branchId,
      });
      runs.push({ employeeId: String(emp), ok: r.ok, conflict: r.conflict });
      if (r.conflict && r.conflict !== reg.RECONCILIATION_CONFLICT.NONE) {
        conflicts += 1;
      }
    }
    return {
      ok: true,
      processed: runs.length,
      conflicts,
      runs,
    };
  }

  async function listCases(filter = {}) {
    const q = {};
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.conflictType) q.conflictType = filter.conflictType;
    if (filter.status) q.status = filter.status;
    if (filter.shiftDate) q.shiftDate = _startOfDay(filter.shiftDate);
    if (filter.lockedByPayrollPeriodId) {
      q.lockedByPayrollPeriodId = filter.lockedByPayrollPeriodId;
    }
    if (filter.since || filter.until) {
      q.shiftDate = q.shiftDate || {};
      if (filter.since) q.shiftDate.$gte = _startOfDay(filter.since);
      if (filter.until) q.shiftDate.$lte = _startOfDay(filter.until);
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = caseModel.find(q).sort({ shiftDate: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof caseModel.countDocuments === 'function'
        ? await caseModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getCase(id) {
    if (!id) return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    const c = await caseModel.findById(id).lean();
    if (!c) return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    return { ok: true, case: c };
  }

  async function resolveConflict(id, input = {}) {
    const { actor, finalCheckIn, finalCheckOut, note } = input;
    if (!id) return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'resolver required' },
      };
    }
    // Wave 275d — service-layer MFA tier 2 (15 min). Closes W273
    // route-layer oversight on /reconciliation/cases/:id/resolve
    // (added in this same commit at route layer). 3-layer symmetry.
    // Runs AFTER actor-presence to preserve existing API contract
    // (matches W275 reopenPeriod guard-order convention).
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    if (!note || !String(note).trim()) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { note: 'required' },
      };
    }

    const doc = await caseModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    if (doc.status === 'locked') {
      return { ok: false, reason: reg.REASON.RECONCILIATION_ALREADY_LOCKED };
    }

    if (finalCheckIn) doc.finalCheckIn = new Date(finalCheckIn);
    if (finalCheckOut) doc.finalCheckOut = new Date(finalCheckOut);
    if (doc.finalCheckIn && doc.finalCheckOut) {
      doc.totalMinutes = Math.round(
        (new Date(doc.finalCheckOut).getTime() - new Date(doc.finalCheckIn).getTime()) / 60_000
      );
    }
    doc.status = 'resolved';
    doc.resolverId = actor.userId;
    doc.resolverNote = String(note).trim().slice(0, 1000);
    doc.resolvedAt = now();

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Reconciler] resolveConflict save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, case: doc.toObject ? doc.toObject() : doc };
  }

  /**
   * Pure helper that other services (payroll-period close) call to
   * compute the canonical snapshot hash over a set of cases.
   */
  function computeSnapshotHash(cases) {
    const hash = crypto.createHash('sha256');
    const sorted = (cases || []).slice().sort((a, b) => {
      const aKey = `${a.employeeId}|${a.shiftDate}`;
      const bKey = `${b.employeeId}|${b.shiftDate}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
    for (const c of sorted) {
      hash.update(
        `${String(c.employeeId)}|${new Date(c.shiftDate).toISOString()}|${c.totalMinutes || 0}|${c.overtimeMinutes || 0}\n`
      );
    }
    return hash.digest('hex');
  }

  // ─── Internal helpers ────────────────────────────────────────

  async function _upsertCase(payload) {
    const filter = {
      employeeId: payload.employeeId,
      shiftDate: payload.shiftDate,
    };
    const existing = await caseModel.findOne(filter).lean();
    if (existing && existing.status === 'locked') {
      // Locked cases are not overwritten by re-reconciliation.
      // Caller must use the override flow for changes.
      logger.warn(
        `[Reconciler] case ${existing._id} is locked; skipping upsert. Use override to correct.`
      );
      return existing;
    }
    if (existing) {
      // Update the existing row
      const doc = await caseModel.findById(existing._id);
      Object.assign(doc, payload);
      try {
        await doc.validate();
        await doc.save();
      } catch (err) {
        logger.error('[Reconciler] upsert update failed:', err.message);
        throw err;
      }
      return doc.toObject ? doc.toObject() : doc;
    }
    const doc = new caseModel(payload);
    try {
      await doc.validate();
      await doc.save();
    } catch (err) {
      logger.error('[Reconciler] upsert insert failed:', err.message);
      throw err;
    }
    return doc.toObject ? doc.toObject() : doc;
  }

  async function _resolveShift({ branchId, shiftDate, shiftHint }) {
    if (shiftHint && shiftHint.startAt && shiftHint.endAt) return shiftHint;
    if (!branchModel || !branchId) return null;
    try {
      const branch = await branchModel.findById(branchId).lean();
      if (!branch || !branch.shiftCalendar) return null;
      // Cheap lookup: branch.shiftCalendar is `{ [yyyy-mm-dd]: {startAt, endAt} }`
      const key = _yyyyMmDd(shiftDate);
      const entry = branch.shiftCalendar[key];
      if (!entry) return null;
      return {
        startAt: new Date(entry.startAt),
        endAt: new Date(entry.endAt),
      };
    } catch (err) {
      logger.warn('[Reconciler] shift resolution failed (non-fatal):', err.message);
      return null;
    }
  }

  function _detectDisagreement(events) {
    // Pairs of un-corroborated events in the SAME zone whose eventTime
    // differs by >5 min count as disagreement.
    if (!Array.isArray(events) || events.length < 2) return null;
    const byZone = new Map();
    for (const e of events) {
      const z = String(e.zoneId || '__nozone__');
      const arr = byZone.get(z) || [];
      arr.push(e);
      byZone.set(z, arr);
    }
    for (const arr of byZone.values()) {
      if (arr.length < 2) continue;
      arr.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
      for (let i = 1; i < arr.length; i += 1) {
        const dtMin =
          (new Date(arr[i].eventTime).getTime() - new Date(arr[i - 1].eventTime).getTime()) /
          60_000;
        if (dtMin > 5 && arr[i].source !== arr[i - 1].source) {
          return `${arr[i].source} and ${arr[i - 1].source} differ by ${Math.round(dtMin)}min in zone ${arr[i].zoneId}`;
        }
      }
    }
    return null;
  }

  function _startOfDay(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  function _yyyyMmDd(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    reconcileEmployeeDay,
    reconcileBranchDay,
    listCases,
    getCase,
    resolveConflict,
    computeSnapshotHash,
  };
}

module.exports = { createAttendanceReconciliationService };
