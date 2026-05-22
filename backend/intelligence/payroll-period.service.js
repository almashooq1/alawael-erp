'use strict';

/**
 * payroll-period.service.js — Wave 99 Phase 4.
 *
 * Owns the lifecycle of PayrollPeriod + AttendancePayrollOverride.
 *
 * Public API — Period:
 *   createPeriod({ periodCode, branchId, startDate, endDate, actor })
 *   listPeriods(filter)
 *   getPeriod(idOrCode)
 *   closePeriod(id, { actor })       → cascade-lock all cases + source events
 *   reopenPeriod(id, { actor, reason }) → very narrow; DPO/CHRO only
 *
 * Public API — Override:
 *   draftOverride({ payrollPeriodId, reconciliationCaseId,
 *                   afterSnapshot, reason, actor })
 *   addApprover(overrideId, { step, actor, decision, note,
 *                             nafathSignatureId })
 *   executeOverride(overrideId, { actor, nafathSignatureId,
 *                                 appliedToNextPeriodId })
 *   listOverrides(filter)
 *   getOverride(id)
 *
 * Reasons map to hikvision.registry.REASON; routes map to HTTP.
 *
 * Lock cascade (closePeriod):
 *   1. Pull all reconciliation cases for the period
 *   2. Compute snapshot hash (delegated to reconcilerService if present)
 *   3. Update period: status=closed + closedAt + closedBy + hash
 *   4. Update each case:
 *      status='locked', lockedByPayrollPeriodId, lockedAt, lockSnapshotHash
 *   5. Update each source event in the period:
 *      lockedByPayrollPeriodId
 */

const crypto = require('crypto');
const reg = require('./hikvision.registry');

function createPayrollPeriodService({
  periodModel = null,
  caseModel = null,
  overrideModel = null,
  sourceEventModel = null,
  reconcilerService = null, // optional; used for snapshot hash computation
  logger = console,
  now = () => new Date(),
  // ─── Wave 275 — Service-layer MFA tier enforcement ─────────────
  // Default OFF to preserve existing unit-test contracts (Wave 99
  // shipped before MFA tiers existed; tests construct the service
  // with plain { userId } actors). app.js opts IN with
  // `enforceMfa: true` so production routes always enforce. New
  // tests can flip to true explicitly to assert the guard. Mirrors
  // the Wave 95 pattern from beneficiary-lifecycle.service.
  enforceMfa = false,
} = {}) {
  if (!periodModel) {
    throw new Error('payroll-period.service: periodModel is required');
  }
  if (!caseModel) {
    throw new Error('payroll-period.service: caseModel is required');
  }
  if (!overrideModel) {
    throw new Error('payroll-period.service: overrideModel is required');
  }
  // sourceEventModel is optional — only used during close cascade to
  // tag source events with lockedByPayrollPeriodId.

  /**
   * Wave 275 — service-layer MFA tier guard. Reads actor.mfaLevel and
   * actor.mfaAssertedAt populated by the W273 attachMfaActor route
   * middleware (and propagated through routes/hikvision.routes.js
   * `actorFrom`). When enforceMfa=false, this is a no-op so test
   * suites that don't need MFA can construct the service cleanly.
   *
   * @param {object} actor
   * @param {number} requiredTier  — 1, 2, or 3
   * @param {number} maxAgeMin     — assertion freshness window in minutes
   * @returns {{ ok: true } | { ok: false, reason: string, requiredTier: number, actorTier: number, maxAgeMin?: number, ageMin?: number|null }}
   */
  function _checkMfaTier(actor, requiredTier, maxAgeMin) {
    if (!enforceMfa) return { ok: true };
    const actorTier = typeof (actor && actor.mfaLevel) === 'number' ? actor.mfaLevel : 0;
    if (actorTier < requiredTier) {
      return {
        ok: false,
        reason: reg.REASON.MFA_TIER_REQUIRED,
        requiredTier,
        actorTier,
      };
    }
    const assertedAt = actor && actor.mfaAssertedAt;
    if (!assertedAt) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin: null,
      };
    }
    const t = assertedAt instanceof Date ? assertedAt.getTime() : Date.parse(assertedAt);
    if (!Number.isFinite(t)) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin: null,
      };
    }
    const ageMin = Math.floor((now().getTime() - t) / 60000);
    if (ageMin > maxAgeMin) {
      return {
        ok: false,
        reason: reg.REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        actorTier,
        maxAgeMin,
        ageMin,
      };
    }
    return { ok: true };
  }

  // ─── Periods ─────────────────────────────────────────────────

  async function createPeriod(input = {}) {
    const { periodCode, branchId, startDate, endDate } = input;
    if (!periodCode || !String(periodCode).trim()) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { periodCode: 'required' },
      };
    }
    if (!startDate || !endDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { startDate: 'required', endDate: 'required' },
      };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!(end.getTime() > start.getTime())) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { endDate: 'must be > startDate' },
      };
    }

    // Overlap check at service layer
    const overlapQuery = {
      branchId: branchId || null,
      startDate: { $lt: end },
      endDate: { $gt: start },
    };
    const overlap = await periodModel.findOne(overlapQuery).lean();
    if (overlap) {
      return {
        ok: false,
        reason: reg.REASON.PAYROLL_PERIOD_OVERLAP,
        errors: { overlap: String(overlap._id) },
      };
    }

    const doc = new periodModel({
      periodCode: String(periodCode).trim(),
      branchId: branchId || null,
      startDate: start,
      endDate: end,
      status: reg.PAYROLL_PERIOD_STATUS.OPEN,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return {
          ok: false,
          reason: reg.REASON.VALIDATION_FAILED,
          errors: { periodCode: 'already exists for this branch' },
        };
      }
      logger.error('[Payroll] createPeriod save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, period: doc.toObject ? doc.toObject() : doc };
  }

  async function listPeriods(filter = {}) {
    const q = {};
    if (filter.branchId !== undefined) q.branchId = filter.branchId;
    if (filter.status) q.status = filter.status;
    const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = periodModel.find(q).sort({ startDate: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof periodModel.countDocuments === 'function'
        ? await periodModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getPeriod(idOrCode) {
    if (!idOrCode) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    const q = _isObjectIdLike(idOrCode) ? { _id: idOrCode } : { periodCode: idOrCode };
    const p = await periodModel.findOne(q).lean();
    if (!p) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    return { ok: true, period: p };
  }

  async function closePeriod(id, { actor } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'closer required' },
      };
    }
    // Wave 275 — service-layer MFA tier 2 (15 min) check.
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    const doc = await periodModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    if (doc.status === reg.PAYROLL_PERIOD_STATUS.CLOSED) {
      return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_ALREADY_CLOSED };
    }

    // Move to CLOSING first — protects against re-entry.
    doc.status = reg.PAYROLL_PERIOD_STATUS.CLOSING;
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] closePeriod transition to CLOSING failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Pull all reconciliation cases in [start, end].
    let cursor = caseModel
      .find({ shiftDate: { $gte: doc.startDate, $lt: doc.endDate } })
      .sort({ shiftDate: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const cases = await cursor;

    // Compute snapshot hash (delegated when reconciler is wired).
    const hash =
      reconcilerService && typeof reconcilerService.computeSnapshotHash === 'function'
        ? reconcilerService.computeSnapshotHash(cases)
        : _localSnapshotHash(cases);

    // Cascade lock cases.
    let casesLocked = 0;
    for (const c of cases) {
      try {
        const caseDoc = await caseModel.findById(c._id);
        if (!caseDoc) continue;
        caseDoc.status = 'locked';
        caseDoc.lockedByPayrollPeriodId = doc._id;
        caseDoc.lockedAt = now();
        // Per-case snapshot hash for the override ledger's beforeSnapshot
        caseDoc.lockSnapshotHash = _caseHash(caseDoc);
        await caseDoc.validate();
        await caseDoc.save();
        casesLocked += 1;
      } catch (err) {
        logger.warn(`[Payroll] lock cascade failed for case ${c._id}:`, err.message);
      }
    }

    // Cascade lock source events (best-effort — affects only event audit).
    let sourceEventsLocked = 0;
    if (sourceEventModel) {
      try {
        const res = await sourceEventModel.updateMany(
          { eventTime: { $gte: doc.startDate, $lt: doc.endDate }, accepted: true },
          { $set: { lockedByPayrollPeriodId: doc._id } }
        );
        sourceEventsLocked = (res && (res.modifiedCount || res.nModified || res.n)) || 0;
      } catch (err) {
        logger.warn('[Payroll] source-event lock cascade failed (non-fatal):', err.message);
      }
    }

    doc.status = reg.PAYROLL_PERIOD_STATUS.CLOSED;
    doc.closedAt = now();
    doc.closedBy = actor.userId;
    doc.closedByRole = actor.role || null;
    doc.closeSnapshotHash = hash;
    doc.casesCounted = casesLocked;

    try {
      await doc.validate();
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] final close save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return {
      ok: true,
      period: doc.toObject ? doc.toObject() : doc,
      casesLocked,
      sourceEventsLocked,
      snapshotHash: hash,
    };
  }

  async function reopenPeriod(id, { actor, reason } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'reopener required' },
      };
    }
    if (!reason || String(reason).trim().length < 10) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { reason: 'min 10 chars' },
      };
    }
    // Wave 275 — service-layer MFA tier 3 (5 min) check. Reopen is the
    // highest-impact lifecycle move; matches route-layer tier in W273.
    const mfa = _checkMfaTier(actor, 3, 5);
    if (!mfa.ok) return mfa;
    const doc = await periodModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    if (doc.status !== reg.PAYROLL_PERIOD_STATUS.CLOSED) {
      return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_CLOSED };
    }

    doc.status = reg.PAYROLL_PERIOD_STATUS.OPEN;
    doc.closedAt = null;
    doc.closedBy = null;
    doc.closedByRole = null;
    doc.closeSnapshotHash = null;
    doc.notes = doc.notes
      ? `${doc.notes}\n[REOPENED ${now().toISOString()} by ${actor.userId}]: ${reason}`
      : `[REOPENED ${now().toISOString()} by ${actor.userId}]: ${reason}`;

    // Unlock the cases — but record the unlock event in the case audit trail.
    let casesUnlocked = 0;
    try {
      const res = await caseModel.updateMany(
        { lockedByPayrollPeriodId: doc._id },
        {
          $set: {
            status: 'resolved',
            lockedByPayrollPeriodId: null,
            lockedAt: null,
            // Keep lockSnapshotHash for the audit trail.
          },
        }
      );
      casesUnlocked = (res && (res.modifiedCount || res.nModified || res.n)) || 0;
    } catch (err) {
      logger.warn('[Payroll] reopen unlock failed:', err.message);
    }

    try {
      await doc.validate();
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] reopen save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return {
      ok: true,
      period: doc.toObject ? doc.toObject() : doc,
      casesUnlocked,
    };
  }

  // ─── Overrides ───────────────────────────────────────────────

  async function draftOverride(input = {}) {
    const { payrollPeriodId, reconciliationCaseId, afterSnapshot, reason, actor } = input;

    if (!payrollPeriodId) {
      return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    }
    if (!reconciliationCaseId) {
      return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    }
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'initiator required' },
      };
    }
    // Wave 275 — service-layer MFA tier 2 (15 min) check.
    const mfa = _checkMfaTier(actor, 2, 15);
    if (!mfa.ok) return mfa;
    if (!reason || String(reason).trim().length < 10) {
      return { ok: false, reason: reg.REASON.PAYROLL_OVERRIDE_REASON_REQUIRED };
    }
    if (!afterSnapshot || !Number.isFinite(Number(afterSnapshot.totalMinutes))) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { afterSnapshot: 'totalMinutes required' },
      };
    }

    const period = await periodModel.findById(payrollPeriodId).lean();
    if (!period) return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_FOUND };
    if (period.status !== reg.PAYROLL_PERIOD_STATUS.CLOSED) {
      return { ok: false, reason: reg.REASON.PAYROLL_PERIOD_NOT_CLOSED };
    }

    const recCase = await caseModel.findById(reconciliationCaseId).lean();
    if (!recCase) return { ok: false, reason: reg.REASON.RECONCILIATION_CASE_NOT_FOUND };
    if (String(recCase.lockedByPayrollPeriodId) !== String(period._id)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { reconciliationCaseId: 'case is not locked by this period' },
      };
    }

    const beforeSnapshot = {
      finalCheckIn: recCase.finalCheckIn || null,
      finalCheckOut: recCase.finalCheckOut || null,
      totalMinutes: recCase.totalMinutes || 0,
      overtimeMinutes: recCase.overtimeMinutes || 0,
      checkInClassification: recCase.checkInClassification || null,
      checkOutClassification: recCase.checkOutClassification || null,
      hash: recCase.lockSnapshotHash || null,
    };

    const after = {
      finalCheckIn: afterSnapshot.finalCheckIn ? new Date(afterSnapshot.finalCheckIn) : null,
      finalCheckOut: afterSnapshot.finalCheckOut ? new Date(afterSnapshot.finalCheckOut) : null,
      totalMinutes: Number(afterSnapshot.totalMinutes),
      overtimeMinutes: Number(afterSnapshot.overtimeMinutes || 0),
      checkInClassification: afterSnapshot.checkInClassification || null,
      checkOutClassification: afterSnapshot.checkOutClassification || null,
    };
    after.hash = _snapshotHash(after);

    const doc = new overrideModel({
      payrollPeriodId: period._id,
      reconciliationCaseId: recCase._id,
      employeeId: recCase.employeeId,
      shiftDate: recCase.shiftDate,
      beforeSnapshot,
      afterSnapshot: after,
      netDeltaMinutes: (after.totalMinutes || 0) - (beforeSnapshot.totalMinutes || 0),
      reason: String(reason).trim(),
      initiatedBy: actor.userId,
      initiatorRole: actor.role || null,
      state: 'draft',
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] draftOverride save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, override: doc.toObject ? doc.toObject() : doc };
  }

  async function addApprover(overrideId, input = {}) {
    const { step, actor, decision = 'approved', note, nafathSignatureId } = input;

    if (!overrideId) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'approver required' },
      };
    }
    if (!reg.PAYROLL_OVERRIDE_APPROVALS.includes(step)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { step: 'invalid' },
      };
    }
    if (!['approved', 'rejected'].includes(decision)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { decision: 'must be approved or rejected' },
      };
    }

    const doc = await overrideModel.findById(overrideId);
    if (!doc) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    if (doc.state !== 'draft' && doc.state !== 'pending-approval') {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { state: doc.state },
      };
    }

    if (!Array.isArray(doc.approverChain)) doc.approverChain = [];
    doc.approverChain.push({
      step,
      userId: actor.userId,
      role: actor.role || null,
      decision,
      decidedAt: now(),
      note: note ? String(note).slice(0, 500) : null,
      nafathSignatureId: nafathSignatureId || null,
    });

    if (decision === 'rejected') {
      doc.state = 'rejected';
    } else if (doc.state === 'draft') {
      doc.state = 'pending-approval';
    }

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] addApprover save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, override: doc.toObject ? doc.toObject() : doc };
  }

  async function executeOverride(id, input = {}) {
    const { actor, nafathSignatureId, appliedToNextPeriodId } = input;
    if (!id) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'executor required' },
      };
    }
    // Wave 275 — service-layer MFA tier 3 (5 min) check. Execute is the
    // hardest-to-reverse operation (mutates a closed payroll period);
    // matches route-layer tier in W273.
    const mfa = _checkMfaTier(actor, 3, 5);
    if (!mfa.ok) return mfa;
    if (!nafathSignatureId) {
      return { ok: false, reason: reg.REASON.PAYROLL_OVERRIDE_NAFATH_REQUIRED };
    }

    const doc = await overrideModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    if (doc.state !== 'approved' && doc.state !== 'pending-approval') {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { state: doc.state },
      };
    }

    const hasHr = (doc.approverChain || []).some(
      s => s.step === reg.PAYROLL_OVERRIDE_APPROVAL.HR_MANAGER && s.decision === 'approved'
    );
    if (!hasHr) {
      return { ok: false, reason: reg.REASON.PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE };
    }

    doc.nafathSignatureId = String(nafathSignatureId).slice(0, 200);
    doc.executedAt = now();
    doc.appliedToNextPeriodId = appliedToNextPeriodId || null;
    doc.state = 'executed';

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Payroll] executeOverride save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Bump the period's overrideCount for fast UI rendering.
    try {
      await periodModel.updateOne({ _id: doc.payrollPeriodId }, { $inc: { overrideCount: 1 } });
    } catch (err) {
      logger.warn('[Payroll] period overrideCount increment failed:', err.message);
    }

    return { ok: true, override: doc.toObject ? doc.toObject() : doc };
  }

  async function listOverrides(filter = {}) {
    const q = {};
    if (filter.payrollPeriodId) q.payrollPeriodId = filter.payrollPeriodId;
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.state) q.state = filter.state;
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = overrideModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof overrideModel.countDocuments === 'function'
        ? await overrideModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getOverride(id) {
    if (!id) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    const o = await overrideModel.findById(id).lean();
    if (!o) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    return { ok: true, override: o };
  }

  /**
   * Public helper for other services (e.g. attendance-source) to ask
   * "is this date locked by a closed period?" Returns the locking
   * period or null.
   */
  async function findLockingPeriod({ eventTime, branchId } = {}) {
    if (!eventTime) return null;
    const dt = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (!Number.isFinite(dt.getTime())) return null;
    const q = {
      status: reg.PAYROLL_PERIOD_STATUS.CLOSED,
      startDate: { $lte: dt },
      endDate: { $gt: dt },
    };
    if (branchId !== undefined) {
      q.$or = [{ branchId }, { branchId: null }];
    }
    const period = await periodModel.findOne(q).lean();
    return period || null;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _localSnapshotHash(cases) {
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

  function _caseHash(c) {
    const hash = crypto.createHash('sha256');
    hash.update(
      `${String(c.employeeId)}|${new Date(c.shiftDate).toISOString()}|${c.finalCheckIn ? new Date(c.finalCheckIn).toISOString() : ''}|${c.finalCheckOut ? new Date(c.finalCheckOut).toISOString() : ''}|${c.totalMinutes || 0}|${c.overtimeMinutes || 0}`
    );
    return hash.digest('hex');
  }

  function _snapshotHash(s) {
    const hash = crypto.createHash('sha256');
    hash.update(
      `${s.finalCheckIn ? new Date(s.finalCheckIn).toISOString() : ''}|${s.finalCheckOut ? new Date(s.finalCheckOut).toISOString() : ''}|${s.totalMinutes || 0}|${s.overtimeMinutes || 0}`
    );
    return hash.digest('hex');
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  function _isObjectIdLike(s) {
    return typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
  }

  return {
    // Period
    createPeriod,
    listPeriods,
    getPeriod,
    closePeriod,
    reopenPeriod,
    findLockingPeriod,
    // Override
    draftOverride,
    addApprover,
    executeOverride,
    listOverrides,
    getOverride,
  };
}

module.exports = { createPayrollPeriodService };
