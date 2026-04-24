'use strict';

/**
 * meetingGovernance.service.js — Phase 16 Commit 6 (4.0.71).
 *
 * Owns the meeting-governance lifecycle:
 *
 *   endMeeting            — flip meeting → completed; activate
 *                           `meeting.minutes.publish` SLA clock
 *   publishMinutes        — resolve minutes SLA as met
 *   assignDecision        — create MeetingDecision; activate
 *                           `meeting.decision.execution` SLA;
 *                           emit `ops.meeting.decision_assigned`
 *   updateDecisionStatus  — state-machine transition + SLA hooks
 *   getFollowUpBoard      — cross-meeting open-decision rollup
 *                           (by owner / by branch / overdue)
 *   sweepOverdue          — periodic scanner that flips past-due
 *                           `open` / `in_progress` decisions to
 *                           `overdue` and emits
 *                           `ops.meeting.decision_overdue`
 *
 * Error codes returned on `err.code`:
 *   NOT_FOUND
 *   ILLEGAL_TRANSITION
 *   MISSING_FIELD
 *   CONFLICT
 */

const registry = require('../../config/meetingGovernance.registry');

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

function createMeetingGovernanceService({
  meetingModel,
  decisionModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!meetingModel) throw new Error('meetingGovernance: meetingModel required');
  if (!decisionModel) throw new Error('meetingGovernance: decisionModel required');
  registry.validate();

  // ── helpers ────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[MeetingGov] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshotDecision(d, extra = {}) {
    return {
      decisionId: String(d._id),
      decisionNumber: d.decisionNumber,
      meetingId: d.meetingId ? String(d.meetingId) : null,
      branchId: d.branchId ? String(d.branchId) : null,
      ownerUserId: d.ownerUserId ? String(d.ownerUserId) : null,
      status: d.status,
      priority: d.priority,
      dueDate: d.dueDate,
      slaId: d.slaId ? String(d.slaId) : null,
      ...extra,
    };
  }

  // ── endMeeting ──────────────────────────────────────────────────

  async function endMeeting(meetingId, { actorId = null } = {}) {
    const meeting = await meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting not found');
    if (meeting.status === 'completed') {
      // Idempotent — just return; no need to re-activate SLA.
      return meeting;
    }
    if (meeting.status === 'cancelled') {
      throw new IllegalTransitionError(`Cannot end a cancelled meeting`, {
        from: meeting.status,
        to: 'completed',
      });
    }
    meeting.status = 'completed';
    meeting.endTime = meeting.endTime || _hhmm(now());
    if (actorId) meeting.updatedBy = actorId;

    // Activate minutes-publish SLA clock.
    if (slaEngine) {
      try {
        await slaEngine.activate({
          policyId: registry.slaPolicyForMinutes(),
          subjectType: 'Meeting',
          subjectId: meeting._id,
          subjectRef: meeting.meetingId || String(meeting._id),
          branchId: meeting.branchId || null,
          startedAt: now(),
          metadata: { title: meeting.title, type: meeting.type },
        });
      } catch (err) {
        logger.warn(`[MeetingGov] minutes SLA activate failed: ${err.message}`);
      }
    }

    await meeting.save();
    await _emit('ops.meeting.ended', {
      meetingId: String(meeting._id),
      meetingRef: meeting.meetingId,
      branchId: meeting.branchId ? String(meeting.branchId) : null,
      title: meeting.title,
    });
    return meeting;
  }

  // ── publishMinutes ──────────────────────────────────────────────

  async function publishMinutes(meetingId, { actorId = null, minutesContent = null } = {}) {
    const meeting = await meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting not found');
    if (meeting.status !== 'completed') {
      throw new IllegalTransitionError(
        `Can only publish minutes for completed meetings (status='${meeting.status}')`,
        { from: meeting.status, to: 'minutes_published' }
      );
    }

    if (minutesContent) {
      if (!Array.isArray(meeting.minutes)) meeting.minutes = [];
      meeting.minutes.push({
        content: minutesContent,
        recordedBy: actorId,
        recordedAt: now(),
      });
    }

    // Resolve the minutes-publish SLA. We don't have a stored
    // slaId on the meeting (the legacy Meeting schema doesn't
    // carry one), so resolve via subject lookup: the engine's
    // activate() is idempotent by (subjectType, subjectId).
    if (slaEngine && slaEngine.observeBySubject) {
      try {
        await slaEngine.observeBySubject({
          policyId: registry.slaPolicyForMinutes(),
          subjectType: 'Meeting',
          subjectId: meeting._id,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[MeetingGov] minutes SLA resolve failed: ${err.message}`);
      }
    }

    await meeting.save();
    await _emit('ops.meeting.minutes_published', {
      meetingId: String(meeting._id),
      meetingRef: meeting.meetingId,
      branchId: meeting.branchId ? String(meeting.branchId) : null,
    });
    return meeting;
  }

  // ── assignDecision ──────────────────────────────────────────────

  async function assignDecision(meetingId, decisionData, { actorId = null } = {}) {
    const required = ['title', 'ownerUserId'];
    const missing = required.filter(f => _missing(decisionData[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const meeting = await meetingModel.findById(meetingId);
    if (!meeting) throw new NotFoundError('Meeting not found');

    const priority = decisionData.priority || 'medium';
    const offsetDays = registry.defaultDueOffsetDays(priority);
    const dueDate =
      decisionData.dueDate || new Date(now().getTime() + offsetDays * 24 * 3600 * 1000);

    const decision = await decisionModel.create({
      meetingId: meeting._id,
      meetingTitleSnapshot: meeting.title || null,
      meetingDateSnapshot: meeting.date || null,
      branchId: meeting.branchId || decisionData.branchId || null,
      type: decisionData.type || 'directive',
      title: decisionData.title,
      description: decisionData.description || null,
      rationale: decisionData.rationale || null,
      ownerUserId: decisionData.ownerUserId,
      ownerNameSnapshot: decisionData.ownerNameSnapshot || null,
      priority,
      dueDate,
      status: 'open',
      assignedAt: now(),
      createdBy: actorId,
      tags: decisionData.tags || [],
      attachments: decisionData.attachments || [],
    });

    // Activate decision-execution SLA.
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForDecision(),
          subjectType: 'MeetingDecision',
          subjectId: decision._id,
          subjectRef: decision.decisionNumber,
          branchId: decision.branchId || null,
          startedAt: decision.assignedAt,
          metadata: {
            meetingId: String(meeting._id),
            priority: decision.priority,
            dueDate: decision.dueDate,
          },
        });
        decision.slaId = sla._id;
        await decision.save();
      } catch (err) {
        logger.warn(`[MeetingGov] decision SLA activate failed: ${err.message}`);
      }
    }

    await _emit('ops.meeting.decision_assigned', _snapshotDecision(decision));
    return decision;
  }

  // ── updateDecisionStatus ────────────────────────────────────────

  async function updateDecisionStatus(
    decisionId,
    toStatus,
    { actorId = null, notes = null, patch = {} } = {}
  ) {
    const decision = await decisionModel.findById(decisionId);
    if (!decision) throw new NotFoundError('Decision not found');

    const fromStatus = decision.status;
    if (!registry.canTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForTransition(fromStatus, toStatus);

    // Apply patch BEFORE validating required fields.
    if (patch && typeof patch === 'object') {
      for (const [k, v] of Object.entries(patch)) {
        decision[k] = v;
      }
    }

    const required = registry.requiredFieldsForTransition(fromStatus, toStatus);
    const missing = required.filter(f => _missing(decision[f]));
    if (missing.length) throw new MissingFieldError(missing);

    decision.status = toStatus;
    decision.statusHistory.push({
      from: fromStatus,
      to: toStatus,
      event,
      actorId,
      at: now(),
      notes,
    });

    // Exiting `overdue` implicitly — clear the flag.
    if (fromStatus === 'overdue' && toStatus !== 'overdue') {
      decision.overdueFlaggedAt = null;
    }

    if (registry.RESOLUTION_STATUSES.includes(toStatus)) {
      decision.completedAt = now();
      decision.completedBy = actorId;
    }

    decision.updatedBy = actorId || decision.updatedBy;

    // ── SLA hook ────────────────────────────────────────────────
    if (slaEngine && decision.slaId) {
      try {
        if (registry.RESOLUTION_STATUSES.includes(toStatus)) {
          await slaEngine.observe({
            slaId: decision.slaId,
            eventType: 'resolved',
            when: now(),
          });
        } else if (registry.CANCEL_STATUSES.includes(toStatus)) {
          await slaEngine.observe({
            slaId: decision.slaId,
            eventType: 'cancelled',
            when: now(),
          });
        } else {
          await slaEngine.observe({
            slaId: decision.slaId,
            eventType: 'state_changed',
            state: toStatus,
            when: now(),
          });
        }
      } catch (err) {
        logger.warn(`[MeetingGov] decision SLA observe failed: ${err.message}`);
      }
    }

    await decision.save();
    await _emit(
      `ops.meeting.decision_${event}`,
      _snapshotDecision(decision, { from: fromStatus, to: toStatus, event })
    );
    await _emit(
      'ops.meeting.decision_transitioned',
      _snapshotDecision(decision, { from: fromStatus, to: toStatus, event })
    );
    return decision;
  }

  // ── getFollowUpBoard ────────────────────────────────────────────

  /**
   * Cross-meeting open-decision rollup. Three lenses selectable
   * via filter: by owner (the default for an individual), by
   * branch (for a manager), or the overdue-only stream.
   */
  async function getFollowUpBoard({
    ownerUserId = null,
    branchId = null,
    includeOverdueOnly = false,
    limit = 100,
  } = {}) {
    const filter = { deleted_at: null };
    if (ownerUserId) filter.ownerUserId = ownerUserId;
    if (branchId) filter.branchId = branchId;
    filter.status = includeOverdueOnly
      ? 'overdue'
      : { $in: ['open', 'in_progress', 'blocked', 'overdue'] };

    const rows = await decisionModel.find(filter).sort({ dueDate: 1 }).limit(limit);

    const buckets = {
      open: 0,
      in_progress: 0,
      blocked: 0,
      overdue: 0,
      due_today: 0,
      due_this_week: 0,
    };
    const startOfToday = new Date(now());
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now());
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now().getTime() + 7 * 24 * 3600 * 1000);

    for (const d of rows) {
      if (buckets[d.status] !== undefined) buckets[d.status]++;
      if (d.dueDate >= startOfToday && d.dueDate <= endOfToday) buckets.due_today++;
      if (d.dueDate >= startOfToday && d.dueDate <= endOfWeek) buckets.due_this_week++;
    }

    return {
      generatedAt: now(),
      filter: { ownerUserId, branchId, includeOverdueOnly },
      counts: buckets,
      decisions: rows.map(d => ({
        decisionId: String(d._id),
        decisionNumber: d.decisionNumber,
        title: d.title,
        meetingId: d.meetingId ? String(d.meetingId) : null,
        meetingTitleSnapshot: d.meetingTitleSnapshot,
        branchId: d.branchId ? String(d.branchId) : null,
        ownerUserId: d.ownerUserId ? String(d.ownerUserId) : null,
        ownerNameSnapshot: d.ownerNameSnapshot,
        priority: d.priority,
        status: d.status,
        dueDate: d.dueDate,
        daysUntilDue:
          typeof d.daysUntilDue === 'number'
            ? d.daysUntilDue
            : Math.ceil((d.dueDate.getTime() - now().getTime()) / (24 * 3600 * 1000)),
        isOverdue:
          d.status !== 'completed' &&
          d.status !== 'deferred' &&
          d.status !== 'cancelled' &&
          d.dueDate < now(),
      })),
    };
  }

  // ── sweepOverdue ────────────────────────────────────────────────

  /**
   * Scheduler entry-point. Flips past-due open/in_progress/blocked
   * decisions to `overdue` and emits `ops.meeting.decision_overdue`
   * (once per flip). Idempotent — a decision already flagged
   * overdue isn't touched.
   */
  async function sweepOverdue({ batchSize = 500 } = {}) {
    const report = { scanned: 0, flipped: 0, errors: 0 };
    const cutoff = now();

    let candidates = [];
    try {
      candidates = await decisionModel
        .find({
          status: { $in: ['open', 'in_progress', 'blocked'] },
          dueDate: { $lt: cutoff },
          deleted_at: null,
        })
        .limit(batchSize);
    } catch (err) {
      logger.warn(`[MeetingGov] sweep fetch failed: ${err.message}`);
      return report;
    }

    for (const d of candidates) {
      report.scanned++;
      try {
        const fromStatus = d.status;
        d.status = 'overdue';
        d.overdueFlaggedAt = cutoff;
        d.statusHistory.push({
          from: fromStatus,
          to: 'overdue',
          event: 'overdue',
          actorId: null,
          at: cutoff,
          notes: 'auto-flagged by sweep',
        });
        await d.save();
        report.flipped++;
        await _emit('ops.meeting.decision_overdue', _snapshotDecision(d, { from: fromStatus }));
      } catch (err) {
        report.errors++;
        logger.warn(`[MeetingGov] sweep flip ${d._id} failed: ${err.message}`);
      }
    }
    return report;
  }

  // ── reads ───────────────────────────────────────────────────────

  async function findDecisionById(id) {
    const d = await decisionModel.findById(id);
    if (!d || d.deleted_at) return null;
    return d;
  }

  async function listDecisions({
    meetingId = null,
    ownerUserId = null,
    branchId = null,
    status = null,
    priority = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (meetingId) filter.meetingId = meetingId;
    if (ownerUserId) filter.ownerUserId = ownerUserId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    return decisionModel.find(filter).skip(skip).limit(limit).sort({ dueDate: 1 });
  }

  return {
    endMeeting,
    publishMinutes,
    assignDecision,
    updateDecisionStatus,
    getFollowUpBoard,
    sweepOverdue,
    findDecisionById,
    listDecisions,
  };
}

function _hhmm(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

module.exports = {
  createMeetingGovernanceService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
