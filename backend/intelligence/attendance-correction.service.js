'use strict';

/**
 * attendance-correction.service.js — Wave 128.
 *
 * Self-service correction workflow. Employee creates a request,
 * supervisor approves/rejects. On approval, a supervisor-override
 * event is emitted on the canonical attendance source-event store.
 *
 * Public API:
 *   createRequest({ requesterId, requesterRole, kind, targetDate,
 *                    requestedEventTime?, requestedEventKind?,
 *                    reasonAr, evidence?, branchId? })
 *   withdrawRequest({ requestId, requesterId })
 *   approveRequest({ requestId, approverId, approverRole,
 *                     approverNote })
 *   rejectRequest({ requestId, approverId, approverRole,
 *                    approverNote })
 *   listRequests({ status?, branchId?, requesterId?, limit?, skip? })
 *   getRequest({ requestId })
 *
 * Approver guarantees:
 *   - SoD: approverId !== requesterId
 *   - approverNote ≥ 5 chars for both approve + reject
 *   - Cannot approve a non-pending request
 *
 * Optional lockGuard:
 *   - When { isPayrollPeriodLocked({ branchId, shiftDate }) } is
 *     provided, approveRequest refuses to approve a correction whose
 *     targetDate falls in a locked period (Wave 99 payroll lock).
 *     Override flow goes through HR-director's tier-3 Nafath workflow,
 *     not here.
 */

const reg = require('./attendance.registry');

const MIN_NOTE_CHARS = 5;
const REQUEST_KINDS = [
  'missing-checkin',
  'missing-checkout',
  'edit-time',
  'remote-day',
  'add-leave-day',
];

function createAttendanceCorrectionService({
  correctionRequestModel = null,
  sourceEventModel = null,
  lockGuard = null, // optional { isPayrollPeriodLocked({branchId,shiftDate}) → Promise<bool> }
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!correctionRequestModel) {
    throw new Error('attendance-correction: correctionRequestModel required');
  }
  if (!sourceEventModel) {
    throw new Error('attendance-correction: sourceEventModel required');
  }

  async function createRequest({
    requesterId,
    requesterRole = null,
    kind,
    targetDate,
    requestedEventTime = null,
    requestedEventKind = null,
    reasonAr,
    evidence = null,
    branchId = null,
  } = {}) {
    if (!requesterId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }
    if (!REQUEST_KINDS.includes(kind)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { kind: `must be one of ${REQUEST_KINDS.join(',')}` },
      };
    }
    if (!targetDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { targetDate: 'required' },
      };
    }
    const td = targetDate instanceof Date ? targetDate : new Date(targetDate);
    if (Number.isNaN(td.getTime())) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!reasonAr || String(reasonAr).trim().length < MIN_NOTE_CHARS) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { reasonAr: `min ${MIN_NOTE_CHARS} chars` },
      };
    }
    // missing-checkin/out + edit-time require requestedEventTime.
    if (
      ['missing-checkin', 'missing-checkout', 'edit-time'].includes(kind) &&
      !requestedEventTime
    ) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { requestedEventTime: 'required for this kind' },
      };
    }
    // Future-date guard.
    let reqT = null;
    if (requestedEventTime) {
      reqT = requestedEventTime instanceof Date ? requestedEventTime : new Date(requestedEventTime);
      if (Number.isNaN(reqT.getTime())) {
        return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
      }
      if (reqT.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
        return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
      }
    }

    const doc = new correctionRequestModel({
      requesterId,
      requesterRole: requesterRole || null,
      branchId: branchId || null,
      kind,
      targetDate: td,
      requestedEventTime: reqT,
      requestedEventKind: requestedEventKind || null,
      reasonAr: String(reasonAr).trim(),
      evidence: evidence
        ? {
            photoRef: evidence.photoRef || null,
            witnessId: evidence.witnessId || null,
            notes: evidence.notes || null,
          }
        : { photoRef: null, witnessId: null, notes: null },
      status: 'pending',
      submittedAt: now(),
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
      logger.error('[attendance-correction] createRequest save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, request: doc.toObject ? doc.toObject() : doc };
  }

  async function _findRequest(requestId) {
    try {
      const cursor = correctionRequestModel.findById(requestId);
      return typeof cursor === 'object' && cursor && typeof cursor.then === 'function'
        ? await cursor
        : cursor;
    } catch (err) {
      logger.warn(`[attendance-correction] findRequest failed: ${err.message}`);
      return null;
    }
  }

  async function withdrawRequest({ requestId, requesterId } = {}) {
    if (!requestId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { requestId: 'required' },
      };
    }
    const req = await _findRequest(requestId);
    if (!req) return { ok: false, reason: 'ATTENDANCE_CORRECTION_NOT_FOUND' };
    if (req.status !== 'pending') {
      return {
        ok: false,
        reason: 'ATTENDANCE_CORRECTION_NOT_PENDING',
        currentStatus: req.status,
      };
    }
    if (requesterId && String(req.requesterId) !== String(requesterId)) {
      return { ok: false, reason: 'ATTENDANCE_CORRECTION_NOT_OWNER' };
    }
    req.status = 'withdrawn';
    req.decidedAt = now();
    req.decidedByActorId = req.requesterId;
    req.decidedByRole = req.requesterRole;
    try {
      await req.save();
    } catch (err) {
      logger.error('[attendance-correction] withdraw save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, request: req.toObject ? req.toObject() : req };
  }

  async function _decide({ requestId, approverId, approverRole, approverNote, approve }) {
    if (!requestId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { requestId: 'required' },
      };
    }
    if (!approverId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { approverId: 'required' },
      };
    }
    if (!approverNote || String(approverNote).trim().length < MIN_NOTE_CHARS) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { approverNote: `min ${MIN_NOTE_CHARS} chars` },
      };
    }
    const req = await _findRequest(requestId);
    if (!req) return { ok: false, reason: 'ATTENDANCE_CORRECTION_NOT_FOUND' };
    if (req.status !== 'pending') {
      return {
        ok: false,
        reason: 'ATTENDANCE_CORRECTION_NOT_PENDING',
        currentStatus: req.status,
      };
    }
    // SoD.
    if (String(req.requesterId) === String(approverId)) {
      return { ok: false, reason: 'SELF_APPROVAL_FORBIDDEN' };
    }

    // Payroll-lock guard (approval only).
    if (approve && lockGuard && typeof lockGuard.isPayrollPeriodLocked === 'function') {
      try {
        const locked = await lockGuard.isPayrollPeriodLocked({
          branchId: req.branchId,
          shiftDate: req.targetDate,
        });
        if (locked) {
          return { ok: false, reason: 'ATTENDANCE_CORRECTION_PAYROLL_LOCKED' };
        }
      } catch (err) {
        logger.warn(`[attendance-correction] lockGuard threw: ${err.message}`);
        return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
      }
    }

    let resultingEventId = null;
    if (approve) {
      const emit = await _emitOverrideEvent({
        request: req,
        approverId,
        approverRole,
        approverNote,
      });
      if (!emit.ok) {
        return emit;
      }
      resultingEventId = emit.event._id;
    }

    req.status = approve ? 'approved' : 'rejected';
    req.decidedAt = now();
    req.decidedByActorId = approverId;
    req.decidedByRole = approverRole || null;
    req.approverNote = String(approverNote).trim();
    if (resultingEventId) {
      req.resultingEventId = resultingEventId;
    }
    try {
      await req.save();
    } catch (err) {
      logger.error('[attendance-correction] decide save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, request: req.toObject ? req.toObject() : req };
  }

  function approveRequest({ requestId, approverId, approverRole, approverNote } = {}) {
    return _decide({ requestId, approverId, approverRole, approverNote, approve: true });
  }
  function rejectRequest({ requestId, approverId, approverRole, approverNote } = {}) {
    return _decide({ requestId, approverId, approverRole, approverNote, approve: false });
  }

  async function _emitOverrideEvent({ request, approverId, approverRole, approverNote }) {
    if (request.kind === 'remote-day' || request.kind === 'add-leave-day') {
      // For these kinds, no source-event is created — the request
      // itself is the record of truth. The HR system may consume the
      // approval to update leave balances elsewhere.
      return { ok: true, event: { _id: null, skipped: true } };
    }
    const t = request.requestedEventTime || request.targetDate;
    const kind =
      request.requestedEventKind ||
      (request.kind === 'missing-checkout' ? 'check-out' : 'check-in');
    const flags = ['manual-override'];
    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.SUPERVISOR_OVERRIDE,
      baseConfidence: 100,
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.SUPERVISOR_OVERRIDE, effectiveConfidence, {
      flags,
    });
    const doc = new sourceEventModel({
      employeeId: request.requesterId,
      branchId: request.branchId || null,
      eventTime: t,
      eventKind: kind,
      source: reg.SOURCE_KIND.SUPERVISOR_OVERRIDE,
      sourceRefId: `correction-${request._id}`,
      sourceRefCollection: 'attendance_correction_requests',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        correctionRequestId: String(request._id),
        approverId: String(approverId),
        approverRole: approverRole || null,
        approverNote: String(approverNote).trim(),
        requesterId: String(request.requesterId),
        evidencePhotoRef: (request.evidence && request.evidence.photoRef) || null,
      },
      auditChain: {
        actorId: approverId,
        actorRole: approverRole || null,
      },
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
      logger.error('[attendance-correction] override save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, event: doc.toObject ? doc.toObject() : doc };
  }

  async function listRequests({
    status = null,
    branchId = null,
    requesterId = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const q = {};
    if (status) q.status = status;
    if (branchId) q.branchId = branchId;
    if (requesterId) q.requesterId = requesterId;
    let cursor = correctionRequestModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ submittedAt: -1 });
    if (typeof cursor.skip === 'function') cursor = cursor.skip(skip);
    if (typeof cursor.limit === 'function') cursor = cursor.limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      const rows = (await cursor) || [];
      return { ok: true, requests: rows };
    } catch (err) {
      logger.warn(`[attendance-correction] listRequests failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
  }

  async function getRequest({ requestId } = {}) {
    if (!requestId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { requestId: 'required' },
      };
    }
    const req = await _findRequest(requestId);
    if (!req) return { ok: false, reason: 'ATTENDANCE_CORRECTION_NOT_FOUND' };
    return { ok: true, request: req.toObject ? req.toObject() : req };
  }

  return {
    createRequest,
    withdrawRequest,
    approveRequest,
    rejectRequest,
    listRequests,
    getRequest,
    MIN_NOTE_CHARS,
    REQUEST_KINDS,
  };
}

module.exports = {
  createAttendanceCorrectionService,
  MIN_NOTE_CHARS,
  REQUEST_KINDS,
};
