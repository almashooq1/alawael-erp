'use strict';

/**
 * attendance-source.service.js — Wave 98 Phase 3.
 *
 * Owns the unified `AttendanceSourceEvent` collection + the
 * `AttendanceConfidenceReview` queue.
 *
 * The parser writes here via:
 *   createSourceEvent({...})           — for AUTO_ACCEPT events
 *   createReview({...})                — for REVIEW events
 *
 * Operators interact via:
 *   listReviews(filter)                — queue display
 *   getReview(id)                      — detail
 *   approveReview(id, {actor, note?})  — promotes to source event
 *   rejectReview(id, {actor, note})    — closes without source event
 *   escalateReview(id, {actor, note?, toQueue?}) — bumps the queue
 *   sweepExpiredReviews({now?})        — runs SLA sweep (cron-callable)
 *
 *   listSourceEvents(filter)
 *   getSourceEvent(id)
 *
 * Reasons mirror hikvision.registry.REASON; routes map to HTTP.
 */

const reg = require('./hikvision.registry');

function createAttendanceSourceService({
  sourceEventModel = null,
  reviewModel = null,
  processedEventModel = null,
  payrollPeriodService = null, // Wave 99 — guards against locked periods
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sourceEventModel) {
    throw new Error('attendance-source.service: sourceEventModel is required');
  }
  if (!reviewModel) {
    throw new Error('attendance-source.service: reviewModel is required');
  }
  // processedEventModel optional — only needed by approveReview to
  // back-link the resulting source event into the processed event row.
  // payrollPeriodService optional — when wired (Wave 99), createSourceEvent
  // refuses to write into a closed payroll period.

  // ─── Source events ──────────────────────────────────────────

  async function createSourceEvent(input = {}) {
    const {
      employeeId,
      branchId,
      zoneId,
      eventTime,
      eventKind,
      source,
      sourceRefId,
      sourceRefCollection,
      trustTier,
      confidence,
      accepted,
      reasonIfRejected,
    } = input;

    if (!employeeId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    if (!reg.ATTENDANCE_SOURCES.includes(source)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { source: `not in ${reg.ATTENDANCE_SOURCES.join(',')}` },
      };
    }
    if (!reg.TRUST_TIERS.includes(trustTier)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { trustTier: 'invalid' },
      };
    }

    // Wave 99 — payroll period lock guard. Refuse to write into a
    // closed period; this protects payroll integrity end-to-end.
    if (payrollPeriodService && typeof payrollPeriodService.findLockingPeriod === 'function') {
      try {
        const locking = await payrollPeriodService.findLockingPeriod({
          eventTime: eventTime || now(),
          branchId,
        });
        if (locking) {
          return {
            ok: false,
            reason: reg.REASON.PAYROLL_PERIOD_LOCKED,
            errors: {
              payrollPeriodId: String(locking._id),
              periodCode: locking.periodCode,
            },
          };
        }
      } catch (err) {
        // Fail-open on lock-check error would be unsafe — fail-closed.
        logger.error('[Attendance Source] lock-check failed:', err.message);
        return {
          ok: false,
          reason: reg.REASON.PAYROLL_PERIOD_LOCKED,
          errors: { check: 'payroll lock probe failed; refusing event' },
        };
      }
    }

    const doc = new sourceEventModel({
      employeeId,
      branchId,
      zoneId: zoneId || null,
      eventTime: eventTime ? new Date(eventTime) : now(),
      eventKind: reg.ATTENDANCE_EVENT_KINDS.includes(eventKind)
        ? eventKind
        : reg.ATTENDANCE_EVENT_KIND.UNKNOWN,
      source,
      sourceRefId: sourceRefId ? String(sourceRefId) : null,
      sourceRefCollection: sourceRefCollection || null,
      trustTier,
      confidence: Number.isFinite(confidence) ? confidence : null,
      accepted: accepted !== false,
      reasonIfRejected: reasonIfRejected || null,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Attendance Source] createSourceEvent save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, sourceEvent: doc.toObject ? doc.toObject() : doc };
  }

  async function listSourceEvents(filter = {}) {
    const q = {};
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.source) q.source = filter.source;
    if (filter.accepted !== undefined) q.accepted = Boolean(filter.accepted);
    if (filter.since || filter.until) {
      q.eventTime = {};
      if (filter.since) q.eventTime.$gte = new Date(filter.since);
      if (filter.until) q.eventTime.$lte = new Date(filter.until);
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = sourceEventModel.find(q).sort({ eventTime: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof sourceEventModel.countDocuments === 'function'
        ? await sourceEventModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getSourceEvent(id) {
    if (!id) return { ok: false, reason: reg.REASON.SOURCE_EVENT_NOT_FOUND };
    const e = await sourceEventModel.findById(id).lean();
    if (!e) return { ok: false, reason: reg.REASON.SOURCE_EVENT_NOT_FOUND };
    return { ok: true, sourceEvent: e };
  }

  // ─── Review queue ───────────────────────────────────────────

  async function createReview(input = {}) {
    const { processedEventId, employeeId, branchId, reason, queue, confidence } = input;

    if (!processedEventId) {
      return { ok: false, reason: reg.REASON.PROCESSED_EVENT_NOT_FOUND };
    }
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    if (!reg.REVIEW_REASONS.includes(reason)) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { reason: 'invalid' } };
    }
    if (!reg.REVIEW_QUEUES.includes(queue)) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { queue: 'invalid' } };
    }

    const openedAt = now();
    const slaWindow = reg.slaForQueue(queue);
    const slaDeadline = new Date(openedAt.getTime() + slaWindow);

    const doc = new reviewModel({
      processedEventId,
      employeeId: employeeId || null,
      branchId,
      reason,
      queue,
      state: reg.REVIEW_STATE.OPEN,
      openedAt,
      slaDeadline,
      confidence: Number.isFinite(confidence) ? confidence : null,
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
        // Already have a review for this processed event — return existing
        const existing = await reviewModel.findOne({ processedEventId }).lean();
        if (existing) return { ok: true, review: existing, idempotent: true };
      }
      logger.error('[Attendance Source] createReview save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, review: doc.toObject ? doc.toObject() : doc };
  }

  async function listReviews(filter = {}) {
    const q = {};
    if (filter.queue) q.queue = filter.queue;
    if (filter.state) q.state = filter.state;
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.reason) q.reason = filter.reason;
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = reviewModel.find(q).sort({ openedAt: 1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof reviewModel.countDocuments === 'function'
        ? await reviewModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getReview(id) {
    if (!id) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    const r = await reviewModel.findById(id).lean();
    if (!r) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    return { ok: true, review: r };
  }

  async function approveReview(id, { actor, note } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'resolver required' },
      };
    }

    const doc = await reviewModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (doc.state !== reg.REVIEW_STATE.OPEN && doc.state !== reg.REVIEW_STATE.EXPIRED) {
      return { ok: false, reason: reg.REASON.REVIEW_NOT_OPEN, errors: { state: doc.state } };
    }
    if (!doc.employeeId) {
      // Cannot promote to a source event without an employee — operator
      // should reject + open a new manual entry. We honour the contract
      // and refuse the approve with a clear reason.
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { employeeId: 'required to promote review to source event' },
      };
    }

    // Build a source event for the processed event we approved.
    let processed = null;
    if (processedEventModel) {
      processed = await processedEventModel.findById(doc.processedEventId).lean();
    }

    const sourceResult = await createSourceEvent({
      employeeId: doc.employeeId,
      branchId: doc.branchId,
      zoneId: processed?.zoneId,
      eventTime: processed?.capturedAt,
      eventKind: reg.ATTENDANCE_EVENT_KIND.UNKNOWN, // Phase 4 shift rules resolve
      source: processed?.source || reg.ATTENDANCE_SOURCE.MANUAL,
      sourceRefId: String(doc.processedEventId),
      sourceRefCollection: 'hikvision_processed_events',
      trustTier: processed?.trustTier || reg.TRUST_TIER.TIER_3,
      confidence: processed?.confidence,
      accepted: true,
    });
    if (!sourceResult.ok) return sourceResult;

    doc.state = reg.REVIEW_STATE.APPROVED;
    doc.resolverId = actor.userId;
    doc.resolverRole = actor.role || null;
    doc.resolverNote = note ? String(note).slice(0, 1000) : null;
    doc.resolvedAt = now();
    doc.resultingAttendanceEventId = sourceResult.sourceEvent._id;

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Attendance Source] approveReview save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Best-effort link back into the processed event so the dashboards
    // see the resolution without joining the review collection.
    if (processedEventModel) {
      try {
        await processedEventModel.updateOne(
          { _id: doc.processedEventId },
          { $set: { attendanceSourceEventId: sourceResult.sourceEvent._id } }
        );
      } catch (err) {
        logger.warn(
          '[Attendance Source] processed event back-link failed (non-fatal):',
          err.message
        );
      }
    }

    return {
      ok: true,
      review: doc.toObject ? doc.toObject() : doc,
      sourceEvent: sourceResult.sourceEvent,
    };
  }

  async function rejectReview(id, { actor, note } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'resolver required' },
      };
    }
    if (!note || !String(note).trim()) {
      return { ok: false, reason: reg.REASON.REVIEW_RESOLUTION_REASON_REQUIRED };
    }

    const doc = await reviewModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (doc.state !== reg.REVIEW_STATE.OPEN && doc.state !== reg.REVIEW_STATE.EXPIRED) {
      return { ok: false, reason: reg.REASON.REVIEW_NOT_OPEN, errors: { state: doc.state } };
    }

    doc.state = reg.REVIEW_STATE.REJECTED;
    doc.resolverId = actor.userId;
    doc.resolverRole = actor.role || null;
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
      logger.error('[Attendance Source] rejectReview save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, review: doc.toObject ? doc.toObject() : doc };
  }

  async function escalateReview(id, { actor, note, toQueue } = {}) {
    if (!id) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'resolver required' },
      };
    }

    const doc = await reviewModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.REVIEW_NOT_FOUND };
    if (doc.state !== reg.REVIEW_STATE.OPEN && doc.state !== reg.REVIEW_STATE.EXPIRED) {
      return { ok: false, reason: reg.REASON.REVIEW_NOT_OPEN, errors: { state: doc.state } };
    }

    const target = reg.REVIEW_QUEUES.includes(toQueue) ? toQueue : _nextQueue(doc.queue);
    doc.state = reg.REVIEW_STATE.ESCALATED;
    doc.escalatedToQueue = target;
    doc.resolverId = actor.userId;
    doc.resolverRole = actor.role || null;
    doc.resolverNote = note ? String(note).slice(0, 1000) : null;
    doc.resolvedAt = now();

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Attendance Source] escalateReview save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Create a fresh OPEN review in the target queue so the next pool
    // sees the work to do. Reuses the processed event id; the
    // partial-unique would block the create if both were OPEN on the
    // same processed event — but the parent has already moved to
    // ESCALATED, so the new row is the only open one. We rely on
    // updates-only and never insert with same processedEventId.
    // Instead we MUTATE a NEW review with the same processedEventId
    // by leaving the unique index out of the new collection insert.
    // Simpler: skip auto-create. Operator-driven re-queue is handled
    // by the UI calling listReviews({state:'escalated'}).
    return { ok: true, review: doc.toObject ? doc.toObject() : doc };
  }

  async function sweepExpiredReviews({ now: nowArg, limit } = {}) {
    const nowDate = nowArg || now();
    const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const cursor = reviewModel
      .find({ state: reg.REVIEW_STATE.OPEN, slaDeadline: { $lt: nowDate } })
      .limit(lim);
    const candidates = await cursor;

    let expired = 0;
    for (const r of candidates) {
      r.state = reg.REVIEW_STATE.EXPIRED;
      try {
        await r.validate();
        await r.save();
        expired += 1;
      } catch (err) {
        logger.warn(`[Attendance Source] sweepExpiredReviews failed for ${r._id}: ${err.message}`);
      }
    }
    return { ok: true, scanned: candidates.length, expired };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _nextQueue(current) {
    // supervisor → hr; hr → security; security stays
    if (current === reg.REVIEW_QUEUE.SUPERVISOR) return reg.REVIEW_QUEUE.HR;
    if (current === reg.REVIEW_QUEUE.HR) return reg.REVIEW_QUEUE.SECURITY;
    return reg.REVIEW_QUEUE.SECURITY;
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    createSourceEvent,
    listSourceEvents,
    getSourceEvent,
    createReview,
    listReviews,
    getReview,
    approveReview,
    rejectReview,
    escalateReview,
    sweepExpiredReviews,
  };
}

module.exports = { createAttendanceSourceService };
