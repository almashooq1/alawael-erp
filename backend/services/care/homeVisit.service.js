'use strict';

/**
 * homeVisit.service.js — Phase 17 Commit 3 (4.0.85).
 *
 * Owns the home-visit lifecycle. Two coupled responsibilities:
 *
 *   1. **State machine** — scheduled → en_route → in_progress →
 *      completed (with cancelled / no_answer / rescheduled escapes).
 *
 *   2. **Follow-up SLA** — activated on `completed` when at least
 *      one action item is created; resolved when every action
 *      item terminates (completed/cancelled).
 *
 * Additional responsibility on completion:
 *   - If ANY observation has concern level `critical`, AND the
 *     visit is linked to a SocialCase, emit a high-risk-flag
 *     event so the socialCase service (or its equivalent
 *     subscriber) can upgrade the case's risk level + activate
 *     the `social.case.high_risk_review` SLA. This is loose
 *     coupling — the socialCase service isn't called directly;
 *     it subscribes to the bus.
 *
 * Error codes: NOT_FOUND / ILLEGAL_TRANSITION / MISSING_FIELD /
 *              CONFLICT.
 */

const registry = require('../../config/care/homeVisit.registry');

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

function createHomeVisitService({
  visitModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!visitModel) throw new Error('homeVisit.service: visitModel required');
  registry.validate();

  // ── helpers ────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[HomeVisit] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshot(doc, extra = {}) {
    return {
      visitId: String(doc._id),
      visitNumber: doc.visitNumber,
      caseId: doc.caseId ? String(doc.caseId) : null,
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      branchId: doc.branchId ? String(doc.branchId) : null,
      visitType: doc.visitType,
      status: doc.status,
      assignedWorkerId: doc.assignedWorkerId ? String(doc.assignedWorkerId) : null,
      scheduledFor: doc.scheduledFor,
      overallConcernLevel: doc.overallConcernLevel,
      ...extra,
    };
  }

  function _pushHistory(doc, { from, to, event, actorId, notes }) {
    doc.statusHistory.push({
      from,
      to,
      event,
      actorId: actorId || null,
      at: now(),
      notes: notes || null,
    });
  }

  // ── scheduleVisit ──────────────────────────────────────────────

  async function scheduleVisit(data, { actorId = null } = {}) {
    const required = ['visitType', 'scheduledFor', 'assignedWorkerId'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.VISIT_TYPES.includes(data.visitType)) {
      throw new MissingFieldError([`visitType (unknown '${data.visitType}')`]);
    }

    const doc = await visitModel.create({
      ...data,
      status: 'scheduled',
      statusHistory: [],
      observations: [],
      actionItems: [],
      photos: [],
      createdBy: actorId,
    });

    await _emit('ops.care.social.home_visit_scheduled', _snapshot(doc));
    return doc;
  }

  // ── generic transition ────────────────────────────────────────

  async function _transition(id, toStatus, { actorId = null, notes = null, patch = {} } = {}) {
    const doc = await visitModel.findById(id);
    if (!doc) throw new NotFoundError('Visit not found');
    const fromStatus = doc.status;
    if (!registry.canTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal visit transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForTransition(fromStatus, toStatus);

    // Apply patch FIRST so required-field checks see patched values
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;

    const required = registry.requiredFieldsForTransition(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushHistory(doc, { from: fromStatus, to: toStatus, event, actorId, notes });
    doc.status = toStatus;
    doc.updatedBy = actorId;

    return { doc, fromStatus, event };
  }

  // ── markEnRoute ──────────────────────────────────────────────

  async function markEnRoute(id, { actorId = null } = {}) {
    const { doc, fromStatus, event } = await _transition(id, 'en_route', { actorId });
    doc.enRouteAt = now();
    await doc.save();
    await _emit(
      `ops.care.social.home_visit_${event}`,
      _snapshot(doc, { from: fromStatus, to: 'en_route' })
    );
    return doc;
  }

  // ── markArrived ──────────────────────────────────────────────

  async function markArrived(id, { actorId = null, coordinates = null } = {}) {
    const { doc, fromStatus, event } = await _transition(id, 'in_progress', { actorId });
    doc.arrivedAt = now();
    if (coordinates && coordinates.lat != null && coordinates.lng != null) {
      doc.arrivalCoordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng),
        accuracy: coordinates.accuracy != null ? Number(coordinates.accuracy) : null,
        capturedAt: now(),
      };
    }
    await doc.save();
    await _emit(
      `ops.care.social.home_visit_${event}`,
      _snapshot(doc, { from: fromStatus, to: 'in_progress' })
    );
    return doc;
  }

  // ── addObservation ───────────────────────────────────────────

  async function addObservation(id, obs, { actorId = null } = {}) {
    if (!obs?.domain) throw new MissingFieldError(['domain']);
    if (!registry.OBSERVATION_DOMAIN_CODES.includes(obs.domain)) {
      throw new MissingFieldError([`domain (unknown '${obs.domain}')`]);
    }
    if (obs.concernLevel && !registry.OBSERVATION_CONCERN_LEVELS.includes(obs.concernLevel)) {
      throw new MissingFieldError([`concernLevel (unknown '${obs.concernLevel}')`]);
    }
    const doc = await visitModel.findById(id);
    if (!doc) throw new NotFoundError('Visit not found');
    if (doc.status !== 'in_progress') {
      throw new IllegalTransitionError(`Cannot add observation while status is '${doc.status}'`, {
        from: doc.status,
      });
    }
    doc.observations.push({
      domain: obs.domain,
      concernLevel: obs.concernLevel || 'none',
      notes: obs.notes || null,
    });
    doc.updatedBy = actorId;
    await doc.save();
    return doc;
  }

  // ── addPhoto ──────────────────────────────────────────────────

  async function addPhoto(id, photo, { actorId = null } = {}) {
    if (!photo?.url) throw new MissingFieldError(['url']);
    const doc = await visitModel.findById(id);
    if (!doc) throw new NotFoundError('Visit not found');
    if (!['in_progress', 'completed'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot add photo while status is '${doc.status}'`, {
        from: doc.status,
      });
    }
    doc.photos.push({
      url: photo.url,
      caption: photo.caption || null,
      capturedAt: photo.capturedAt ? new Date(photo.capturedAt) : now(),
      coordinates: photo.coordinates || null,
    });
    doc.updatedBy = actorId;
    await doc.save();
    return doc;
  }

  // ── addActionItem ────────────────────────────────────────────

  async function addActionItem(id, item, { actorId = null } = {}) {
    if (!item?.title) throw new MissingFieldError(['title']);
    const doc = await visitModel.findById(id);
    if (!doc) throw new NotFoundError('Visit not found');
    if (!['in_progress', 'completed'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot add action item while status is '${doc.status}'`, {
        from: doc.status,
      });
    }
    doc.actionItems.push({
      title: item.title,
      description: item.description || null,
      priority: registry.ACTION_ITEM_PRIORITIES.includes(item.priority) ? item.priority : 'medium',
      assignedToUserId: item.assignedToUserId || null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      status: 'pending',
    });
    doc.updatedBy = actorId;
    await doc.save();
    return doc;
  }

  async function updateActionItem(id, itemId, { toStatus, outcome, actorId = null } = {}) {
    if (!registry.ACTION_ITEM_STATUSES.includes(toStatus)) {
      throw new MissingFieldError([
        `toStatus (must be one of ${registry.ACTION_ITEM_STATUSES.join('|')})`,
      ]);
    }
    const doc = await visitModel.findById(id);
    if (!doc) throw new NotFoundError('Visit not found');
    const item = (doc.actionItems || []).find(i => String(i._id) === String(itemId));
    if (!item) throw new NotFoundError('Action item not found');
    const wasOpen = ['pending', 'in_progress'].includes(item.status);
    item.status = toStatus;
    if (toStatus === 'completed') {
      item.completedAt = now();
      item.completedBy = actorId;
      item.outcome = outcome || item.outcome;
    }
    doc.updatedBy = actorId;

    // If all action items are now terminal, resolve follow-up SLA.
    const stillOpen = (doc.actionItems || []).some(i =>
      ['pending', 'in_progress'].includes(i.status)
    );
    if (wasOpen && !stillOpen && slaEngine && doc.followupSlaId) {
      try {
        await slaEngine.observe({
          slaId: doc.followupSlaId,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[HomeVisit] followup SLA resolve failed: ${err.message}`);
      }
    }

    await doc.save();
    await _emit(
      'ops.care.social.home_visit_action_item_updated',
      _snapshot(doc, { itemId: String(itemId), toStatus })
    );
    return doc;
  }

  // ── completeVisit ───────────────────────────────────────────

  async function completeVisit(
    id,
    { visitSummary, overallConcernLevel = null, actorId = null, departureCoordinates = null } = {}
  ) {
    if (!visitSummary) throw new MissingFieldError(['visitSummary']);
    const { doc, fromStatus, event } = await _transition(id, 'completed', {
      actorId,
      patch: { visitSummary },
    });
    doc.completedAt = now();
    if (overallConcernLevel && registry.OBSERVATION_CONCERN_LEVELS.includes(overallConcernLevel)) {
      doc.overallConcernLevel = overallConcernLevel;
    } else {
      // Auto-compute from observations: max severity wins.
      const levels = (doc.observations || []).map(o => o.concernLevel);
      const order = ['none', 'low', 'medium', 'high', 'critical'];
      const maxIdx = levels.reduce((acc, l) => Math.max(acc, order.indexOf(l)), 0);
      doc.overallConcernLevel = order[maxIdx] || 'none';
    }
    if (
      departureCoordinates &&
      departureCoordinates.lat != null &&
      departureCoordinates.lng != null
    ) {
      doc.departureCoordinates = {
        lat: Number(departureCoordinates.lat),
        lng: Number(departureCoordinates.lng),
        accuracy:
          departureCoordinates.accuracy != null ? Number(departureCoordinates.accuracy) : null,
        capturedAt: now(),
      };
    }

    // Activate follow-up SLA IF there are open action items.
    const hasOpenItems = (doc.actionItems || []).some(i =>
      ['pending', 'in_progress'].includes(i.status)
    );
    if (slaEngine && hasOpenItems && !doc.followupSlaId) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForFollowup(),
          subjectType: 'HomeVisit',
          subjectId: doc._id,
          subjectRef: doc.visitNumber,
          branchId: doc.branchId || null,
          startedAt: now(),
          metadata: {
            openItems: doc.actionItems.filter(i => ['pending', 'in_progress'].includes(i.status))
              .length,
          },
        });
        doc.followupSlaId = sla._id;
      } catch (err) {
        logger.warn(`[HomeVisit] followup SLA activate failed: ${err.message}`);
      }
    }

    await doc.save();

    // Fire standard completion event
    await _emit(
      'ops.care.social.home_visit_completed',
      _snapshot(doc, { from: fromStatus, overallConcernLevel: doc.overallConcernLevel })
    );

    // Fire critical-concern event if applicable — loose coupling
    // lets the SocialCase service upgrade risk on its own schedule.
    const hasCritical =
      doc.overallConcernLevel === 'critical' ||
      (doc.observations || []).some(o => o.concernLevel === 'critical');
    if (hasCritical && doc.caseId) {
      await _emit('ops.care.social.home_visit_critical_concern', {
        ..._snapshot(doc),
        criticalObservations: (doc.observations || [])
          .filter(o => o.concernLevel === 'critical')
          .map(o => ({ domain: o.domain, notes: o.notes })),
      });
    }

    return doc;
  }

  // ── cancelVisit ─────────────────────────────────────────────

  async function cancelVisit(
    id,
    { cancellationReason, cancellationNotes = null, actorId = null } = {}
  ) {
    if (!cancellationReason) throw new MissingFieldError(['cancellationReason']);
    if (!registry.CANCELLATION_REASONS.includes(cancellationReason)) {
      throw new MissingFieldError([`cancellationReason (unknown '${cancellationReason}')`]);
    }
    const { doc, fromStatus, event } = await _transition(id, 'cancelled', {
      actorId,
      patch: { cancellationReason, cancellationNotes },
    });
    doc.cancelledAt = now();
    await doc.save();
    await _emit(
      `ops.care.social.home_visit_${event}`,
      _snapshot(doc, { from: fromStatus, to: 'cancelled', cancellationReason })
    );
    return doc;
  }

  // ── markNoAnswer ────────────────────────────────────────────

  async function markNoAnswer(id, { noAnswerNotes, actorId = null } = {}) {
    if (!noAnswerNotes) throw new MissingFieldError(['noAnswerNotes']);
    const { doc, fromStatus, event } = await _transition(id, 'no_answer', {
      actorId,
      patch: { noAnswerNotes },
    });
    await doc.save();
    await _emit(
      `ops.care.social.home_visit_${event}`,
      _snapshot(doc, { from: fromStatus, to: 'no_answer' })
    );
    return doc;
  }

  // ── rescheduleVisit ─────────────────────────────────────────

  async function rescheduleVisit(id, { rescheduledTo, reason = null, actorId = null } = {}) {
    if (!rescheduledTo) throw new MissingFieldError(['rescheduledTo']);
    const newDate = new Date(rescheduledTo);
    if (isNaN(newDate.getTime())) {
      throw new MissingFieldError(['rescheduledTo (invalid date)']);
    }

    const old = await visitModel.findById(id);
    if (!old) throw new NotFoundError('Visit not found');

    // Create replacement visit first
    const replacement = await visitModel.create({
      caseId: old.caseId,
      beneficiaryId: old.beneficiaryId,
      branchId: old.branchId,
      visitType: old.visitType,
      scheduledFor: newDate,
      scheduledDurationMinutes: old.scheduledDurationMinutes,
      purpose: old.purpose,
      preVisitNotes: reason
        ? `Rescheduled from ${old.visitNumber}. ${reason}`
        : `Rescheduled from ${old.visitNumber}`,
      assignedWorkerId: old.assignedWorkerId,
      assignedWorkerNameSnapshot: old.assignedWorkerNameSnapshot,
      accompanyingStaff: old.accompanyingStaff,
      address: old.address,
      status: 'scheduled',
      statusHistory: [],
      rescheduledFromVisitId: old._id,
      createdBy: actorId,
    });

    const { doc, fromStatus, event } = await _transition(id, 'rescheduled', {
      actorId,
      patch: { rescheduledTo: newDate, rescheduledToVisitId: replacement._id },
      notes: reason,
    });
    await doc.save();
    await _emit(
      `ops.care.social.home_visit_${event}`,
      _snapshot(doc, {
        from: fromStatus,
        to: 'rescheduled',
        replacementVisitId: String(replacement._id),
      })
    );
    return { original: doc, replacement };
  }

  // ── reads ────────────────────────────────────────────────────

  async function findById(id) {
    const doc = await visitModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function list({
    branchId = null,
    caseId = null,
    beneficiaryId = null,
    assignedWorkerId = null,
    status = null,
    visitType = null,
    fromDate = null,
    toDate = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (caseId) filter.caseId = caseId;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (assignedWorkerId) filter.assignedWorkerId = assignedWorkerId;
    if (status) filter.status = status;
    if (visitType) filter.visitType = visitType;
    if (fromDate || toDate) {
      filter.scheduledFor = {};
      if (fromDate) filter.scheduledFor.$gte = new Date(fromDate);
      if (toDate) filter.scheduledFor.$lte = new Date(toDate);
    }
    return visitModel.find(filter).sort({ scheduledFor: -1 }).skip(skip).limit(limit);
  }

  async function workerSchedule(workerUserId, { fromDate = null, toDate = null } = {}) {
    const filter = {
      assignedWorkerId: workerUserId,
      deleted_at: null,
      status: { $in: ['scheduled', 'en_route', 'in_progress'] },
    };
    if (fromDate || toDate) {
      filter.scheduledFor = {};
      if (fromDate) filter.scheduledFor.$gte = new Date(fromDate);
      if (toDate) filter.scheduledFor.$lte = new Date(toDate);
    }
    return visitModel.find(filter).sort({ scheduledFor: 1 });
  }

  return {
    scheduleVisit,
    markEnRoute,
    markArrived,
    addObservation,
    addPhoto,
    addActionItem,
    updateActionItem,
    completeVisit,
    cancelVisit,
    markNoAnswer,
    rescheduleVisit,
    findById,
    list,
    workerSchedule,
  };
}

module.exports = {
  createHomeVisitService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
