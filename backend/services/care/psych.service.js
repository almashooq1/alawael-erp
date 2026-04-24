'use strict';

/**
 * psych.service.js — Phase 17 Commit 5 (4.0.87).
 *
 * Three coupled services in one module:
 *
 *   • RiskFlag  — raise / plan / escalate / resolve / archive
 *   • Scale     — administer + auto-score + auto-flag on threshold
 *   • MDT       — schedule / run / decide lifecycle
 *
 * The three collaborate: Scale triggers a RiskFlag when
 * thresholds are crossed; a critical RiskFlag can convene an
 * MDT; MDT decisions resolve flags. All coordination flows
 * through the qualityEventBus — loose coupling with the rest of
 * the care platform.
 *
 * SLA: critical-severity flags activate `psych.risk_flag.response`
 * (1h response, 24/7). Non-critical flags are untracked by SLA.
 */

const registry = require('../../config/care/psych.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}
class IllegalTransitionError extends Error {
  constructor(msg, extra = {}) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    Object.assign(this, extra);
  }
}
class MissingFieldError extends Error {
  constructor(fields) {
    super(`Missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}
class ConflictError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'CONFLICT';
  }
}

function _missing(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function createPsychService({
  flagModel,
  scaleModel,
  mdtModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!flagModel) throw new Error('psych.service: flagModel required');
  if (!scaleModel) throw new Error('psych.service: scaleModel required');
  if (!mdtModel) throw new Error('psych.service: mdtModel required');
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Psych] emit ${name} failed: ${err.message}`);
    }
  }

  async function _activateSla(policyId, subject) {
    if (!slaEngine || typeof slaEngine.activate !== 'function') return null;
    try {
      return await slaEngine.activate({ policyId, subject });
    } catch (err) {
      logger.warn(`[Psych] SLA activate ${policyId} failed: ${err.message}`);
      return null;
    }
  }

  async function _observeSla(slaId, { toState } = {}) {
    if (!slaEngine || typeof slaEngine.observe !== 'function') return;
    if (!slaId) return;
    try {
      await slaEngine.observe({ slaId, toState });
    } catch (err) {
      logger.warn(`[Psych] SLA observe ${slaId} failed: ${err.message}`);
    }
  }

  function _snapshotFlag(doc, extra = {}) {
    return {
      flagId: String(doc._id),
      flagNumber: doc.flagNumber,
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      branchId: doc.branchId ? String(doc.branchId) : null,
      caseId: doc.caseId ? String(doc.caseId) : null,
      flagType: doc.flagType,
      severity: doc.severity,
      status: doc.status,
      source: doc.source,
      ...extra,
    };
  }

  function _pushFlagHistory(doc, { from, to, event, actorId, notes }) {
    doc.statusHistory.push({
      from,
      to,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // RISK FLAG surfaces
  // ═════════════════════════════════════════════════════════════════

  async function raiseFlag(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'flagType', 'severity'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.FLAG_TYPES.includes(data.flagType)) {
      throw new MissingFieldError([`flagType (unknown '${data.flagType}')`]);
    }
    if (!registry.FLAG_SEVERITIES.includes(data.severity)) {
      throw new MissingFieldError([`severity (unknown '${data.severity}')`]);
    }

    const doc = await flagModel.create({
      ...data,
      status: 'active',
      statusHistory: [],
      actions: [],
      raisedAt: data.raisedAt || now(),
      raisedBy: actorId,
      createdBy: actorId,
    });

    // Critical flags get an SLA clock
    if (doc.severity === 'critical') {
      const sla = await _activateSla(registry.CRITICAL_FLAG_SLA_ID, {
        subjectType: 'PsychRiskFlag',
        subjectId: String(doc._id),
        branchId: doc.branchId,
        initialState: 'active',
      });
      if (sla) {
        doc.slaId = sla._id;
        await doc.save();
      }
    }

    await _emit('ops.care.psych.risk_flag_raised', _snapshotFlag(doc));
    return doc;
  }

  async function transitionFlag(id, toStatus, { actorId = null, notes = null, patch = {} } = {}) {
    const doc = await flagModel.findById(id);
    if (!doc) throw new NotFoundError('Risk flag not found');
    const fromStatus = doc.status;
    if (!registry.canFlagTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal flag transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.flagEventFor(fromStatus, toStatus);
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;

    const required = registry.flagRequiredFields(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushFlagHistory(doc, { from: fromStatus, to: toStatus, event, actorId, notes });
    doc.status = toStatus;

    if (toStatus === 'resolved') {
      doc.resolvedAt = now();
      doc.resolvedBy = actorId;
    }
    doc.updatedBy = actorId;
    await doc.save();

    await _observeSla(doc.slaId, { toState: toStatus });
    await _emit(
      `ops.care.psych.risk_flag_${event}`,
      _snapshotFlag(doc, { from: fromStatus, to: toStatus })
    );
    return doc;
  }

  async function establishSafetyPlan(id, { safetyPlan, reviewDue = null, actorId = null } = {}) {
    if (!safetyPlan) throw new MissingFieldError(['safetyPlan']);
    return transitionFlag(id, 'monitoring', {
      actorId,
      patch: { safetyPlan, safetyPlanReviewDue: reviewDue ? new Date(reviewDue) : null },
    });
  }

  async function escalateFlag(id, { escalationReason, actorId = null } = {}) {
    if (!escalationReason) throw new MissingFieldError(['escalationReason']);
    return transitionFlag(id, 'escalated', {
      actorId,
      patch: { escalationReason },
    });
  }

  async function resolveFlag(
    id,
    { resolutionNotes, resolutionOutcome = null, actorId = null } = {}
  ) {
    if (!resolutionNotes) throw new MissingFieldError(['resolutionNotes']);
    return transitionFlag(id, 'resolved', {
      actorId,
      patch: { resolutionNotes, resolutionOutcome },
    });
  }

  async function archiveFlag(id, { actorId = null } = {}) {
    return transitionFlag(id, 'archived', { actorId });
  }

  async function reopenFlag(id, { reopenReason, actorId = null } = {}) {
    if (!reopenReason) throw new MissingFieldError(['reopenReason']);
    return transitionFlag(id, 'active', { actorId, patch: { reopenReason } });
  }

  async function cancelFlag(id, { cancellationReason, actorId = null } = {}) {
    if (!cancellationReason) throw new MissingFieldError(['cancellationReason']);
    return transitionFlag(id, 'cancelled', { actorId, patch: { cancellationReason } });
  }

  async function recordFlagAction(id, { kind, notes = null, actorId = null } = {}) {
    if (!kind) throw new MissingFieldError(['kind']);
    const doc = await flagModel.findById(id);
    if (!doc) throw new NotFoundError('Risk flag not found');
    doc.actions.push({ takenAt: now(), takenBy: actorId || null, kind, notes });
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function findFlagById(id) {
    const doc = await flagModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listFlags({
    beneficiaryId = null,
    branchId = null,
    caseId = null,
    status = null,
    severity = null,
    flagType = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (caseId) filter.caseId = caseId;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (flagType) filter.flagType = flagType;
    return flagModel.find(filter).sort({ raisedAt: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryOpenFlags(beneficiaryId) {
    return flagModel
      .find({
        beneficiaryId,
        deleted_at: null,
        status: { $in: ['active', 'monitoring', 'escalated'] },
      })
      .sort({ raisedAt: -1 });
  }

  // ═════════════════════════════════════════════════════════════════
  // SCALE surfaces
  // ═════════════════════════════════════════════════════════════════

  async function administerScale(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'scaleCode', 'responses'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.SCALE_CODES.includes(data.scaleCode)) {
      throw new MissingFieldError([`scaleCode (unknown '${data.scaleCode}')`]);
    }

    let scored;
    try {
      scored = registry.scoreScale(data.scaleCode, data.responses);
    } catch (err) {
      throw new MissingFieldError([`responses (${err.message})`]);
    }

    const doc = await scaleModel.create({
      ...data,
      administeredAt: data.administeredAt || now(),
      administeredBy: actorId,
      totalScore: scored.total,
      band: scored.band,
      recommendedAction: scored.action,
      autoFlagTriggered: !!scored.autoFlag,
      autoFlagReason: scored.autoFlag?.reason || null,
      createdBy: actorId,
    });

    await _emit('ops.care.psych.scale_administered', {
      assessmentId: String(doc._id),
      assessmentNumber: doc.assessmentNumber,
      beneficiaryId: String(doc.beneficiaryId),
      scaleCode: doc.scaleCode,
      total: doc.totalScore,
      band: doc.band,
    });

    // Auto-raise a flag if scoring triggered it
    if (scored.autoFlag) {
      try {
        const flag = await raiseFlag(
          {
            beneficiaryId: doc.beneficiaryId,
            branchId: doc.branchId,
            caseId: doc.caseId,
            flagType: scored.autoFlag.type,
            severity: 'critical', // auto-flags from scales are always critical
            source: `scale:${doc.scaleCode}`,
            triggerReference: String(doc._id),
            description: scored.autoFlag.reason,
          },
          { actorId }
        );
        doc.autoFlagId = flag._id;
        await doc.save();
      } catch (err) {
        logger.warn(`[Psych] auto-flag from scale ${doc._id} failed: ${err.message}`);
      }
    }

    return doc;
  }

  async function findAssessmentById(id) {
    const doc = await scaleModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listAssessments({
    beneficiaryId = null,
    branchId = null,
    caseId = null,
    scaleCode = null,
    autoFlagTriggered = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (caseId) filter.caseId = caseId;
    if (scaleCode) filter.scaleCode = scaleCode;
    if (autoFlagTriggered !== null) filter.autoFlagTriggered = autoFlagTriggered;
    return scaleModel.find(filter).sort({ administeredAt: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryScaleTrend(beneficiaryId, scaleCode, { limit = 10 } = {}) {
    const rows = await scaleModel
      .find({ beneficiaryId, scaleCode, deleted_at: null })
      .sort({ administeredAt: -1 })
      .limit(limit);
    const series = rows.map(r => ({
      assessmentId: String(r._id),
      at: r.administeredAt,
      total: r.totalScore,
      band: r.band,
    }));
    return { scaleCode, series };
  }

  // ═════════════════════════════════════════════════════════════════
  // MDT surfaces
  // ═════════════════════════════════════════════════════════════════

  async function scheduleMdt(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'purpose', 'scheduledFor'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.MDT_PURPOSES.includes(data.purpose)) {
      throw new MissingFieldError([`purpose (unknown '${data.purpose}')`]);
    }

    const doc = await mdtModel.create({
      ...data,
      status: 'scheduled',
      statusHistory: [],
      attendees: data.attendees || [],
      agenda: data.agenda || [],
      decisions: [],
      actionItems: [],
      createdBy: actorId,
    });

    await _emit('ops.care.psych.mdt_scheduled', {
      meetingId: String(doc._id),
      meetingNumber: doc.meetingNumber,
      beneficiaryId: String(doc.beneficiaryId),
      purpose: doc.purpose,
      scheduledFor: doc.scheduledFor,
    });

    return doc;
  }

  async function transitionMdt(id, toStatus, { actorId = null, notes = null, patch = {} } = {}) {
    const doc = await mdtModel.findById(id);
    if (!doc) throw new NotFoundError('MDT meeting not found');
    const fromStatus = doc.status;
    if (!registry.canMdtTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal mdt transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.mdtEventFor(fromStatus, toStatus);
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;
    const required = registry.mdtRequiredFields(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    doc.statusHistory.push({
      from: fromStatus,
      to: toStatus,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
    doc.status = toStatus;

    if (toStatus === 'in_progress') doc.startedAt = now();
    if (toStatus === 'completed') doc.completedAt = now();
    if (toStatus === 'cancelled') doc.cancelledAt = now();

    doc.updatedBy = actorId;
    await doc.save();
    await _emit(`ops.care.psych.mdt_${event}`, {
      meetingId: String(doc._id),
      meetingNumber: doc.meetingNumber,
      from: fromStatus,
      to: toStatus,
    });
    return doc;
  }

  async function startMdt(id, opts = {}) {
    return transitionMdt(id, 'in_progress', opts);
  }

  async function completeMdt(
    id,
    { summary, decisions = [], actionItems = [], actorId = null } = {}
  ) {
    if (!summary) throw new MissingFieldError(['summary']);
    const doc = await mdtModel.findById(id);
    if (!doc) throw new NotFoundError('MDT meeting not found');
    if (!['scheduled', 'in_progress'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot complete mdt from status '${doc.status}'`, {
        from: doc.status,
      });
    }
    if (Array.isArray(decisions) && decisions.length) {
      doc.decisions.push(...decisions);
    }
    if (Array.isArray(actionItems) && actionItems.length) {
      doc.actionItems.push(...actionItems);
    }
    doc.summary = summary;
    await doc.save();
    return transitionMdt(id, 'completed', { actorId });
  }

  async function cancelMdt(id, { cancellationReason, actorId = null } = {}) {
    if (!cancellationReason) throw new MissingFieldError(['cancellationReason']);
    return transitionMdt(id, 'cancelled', {
      actorId,
      patch: { cancellationReason },
    });
  }

  async function rescheduleMdt(id, { rescheduledTo, actorId = null } = {}) {
    if (!rescheduledTo) throw new MissingFieldError(['rescheduledTo']);
    return transitionMdt(id, 'rescheduled', {
      actorId,
      patch: { rescheduledTo: new Date(rescheduledTo) },
    });
  }

  async function addMdtAttendee(id, attendee, { actorId = null } = {}) {
    if (!attendee?.nameSnapshot || !attendee?.role) {
      throw new MissingFieldError(
        [!attendee?.nameSnapshot && 'nameSnapshot', !attendee?.role && 'role'].filter(Boolean)
      );
    }
    if (!registry.MDT_ROLES.includes(attendee.role)) {
      throw new MissingFieldError([`role (unknown '${attendee.role}')`]);
    }
    const doc = await mdtModel.findById(id);
    if (!doc) throw new NotFoundError('MDT meeting not found');
    if (doc.status !== 'scheduled') {
      throw new IllegalTransitionError(`Cannot add attendee once meeting is ${doc.status}`, {
        status: doc.status,
      });
    }
    doc.attendees.push({
      userId: attendee.userId || null,
      nameSnapshot: attendee.nameSnapshot,
      role: attendee.role,
      attended: null,
    });
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function markAttendance(
    id,
    attendeeId,
    { attended, declineReason = null, actorId = null }
  ) {
    const doc = await mdtModel.findById(id);
    if (!doc) throw new NotFoundError('MDT meeting not found');
    const a = (doc.attendees || []).find(x => String(x._id) === String(attendeeId));
    if (!a) throw new NotFoundError('Attendee not found');
    a.attended = attended;
    if (declineReason) a.declineReason = declineReason;
    doc.updatedBy = actorId;
    return doc.save();
  }

  async function findMdtById(id) {
    const doc = await mdtModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function listMdt({
    beneficiaryId = null,
    branchId = null,
    status = null,
    purpose = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    return mdtModel.find(filter).sort({ scheduledFor: -1 }).skip(skip).limit(limit);
  }

  return {
    // Flag
    raiseFlag,
    transitionFlag,
    establishSafetyPlan,
    escalateFlag,
    resolveFlag,
    archiveFlag,
    reopenFlag,
    cancelFlag,
    recordFlagAction,
    findFlagById,
    listFlags,
    beneficiaryOpenFlags,
    // Scale
    administerScale,
    findAssessmentById,
    listAssessments,
    beneficiaryScaleTrend,
    // MDT
    scheduleMdt,
    transitionMdt,
    startMdt,
    completeMdt,
    cancelMdt,
    rescheduleMdt,
    addMdtAttendee,
    markAttendance,
    findMdtById,
    listMdt,
  };
}

module.exports = {
  createPsychService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
