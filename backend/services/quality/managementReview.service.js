'use strict';

/**
 * managementReview.service.js — Phase 13 Commit 1 (4.0.55).
 *
 * Service that owns the ManagementReview state machine. All
 * transitions are funnelled through this module so the Mongoose
 * model stays dumb and the rules stay unit-testable.
 *
 * Dependency injection:
 *
 *   const svc = createManagementReviewService({
 *     model,               // ManagementReview mongoose model (required)
 *     dispatcher,          // optional { emit(eventName, payload) => Promise<void> }
 *     logger,              // optional
 *     now,                 // optional () => Date — injectable clock for tests
 *   });
 *
 * The module also exports a lazy singleton for the production app
 * via `getDefault()` so routes can `require()` it without plumbing.
 *
 * Events emitted (via injected dispatcher):
 *
 *   quality.review.scheduled       — new review created
 *   quality.review.agenda_set
 *   quality.review.started
 *   quality.review.input_recorded
 *   quality.review.output_recorded
 *   quality.review.decision_recorded
 *   quality.review.action_assigned — per action (downstream may auto-create CAPA)
 *   quality.review.closed
 *   quality.review.cancelled
 *   quality.review.approved        — per approval signature
 *
 * Every terminal transition (closed/cancelled) is idempotent-safe;
 * a second call returns the existing document without mutation.
 */

const {
  REVIEW_STATUSES,
  TERMINAL_STATUSES,
  DEFAULT_CYCLE_MONTHS,
  ACTION_DEFAULT_SLA_DAYS,
  validateClosure,
} = require('../../config/management-review.registry');

// Legal state transitions — any transition not in this map is rejected.
const ALLOWED_TRANSITIONS = Object.freeze({
  scheduled: ['agenda_set', 'cancelled'],
  agenda_set: ['in_progress', 'cancelled'],
  in_progress: ['decisions_recorded', 'cancelled'],
  decisions_recorded: ['actions_assigned', 'closed', 'cancelled'],
  actions_assigned: ['closed', 'cancelled'],
  closed: [],
  cancelled: [],
});

class ManagementReviewService {
  constructor({ model, dispatcher = null, logger = console, now = () => new Date() } = {}) {
    if (!model) throw new Error('ManagementReviewService: model is required');
    this.model = model;
    this.dispatcher = dispatcher;
    this.logger = logger;
    this.now = now;
  }

  // ── emission helper (swallows dispatcher errors; logs only) ──────

  async _emit(eventName, payload) {
    if (!this.dispatcher || typeof this.dispatcher.emit !== 'function') return;
    try {
      await this.dispatcher.emit(eventName, payload);
    } catch (err) {
      this.logger.warn(`[ManagementReview] dispatch ${eventName} failed: ${err.message}`);
    }
  }

  _assertTransition(fromStatus, toStatus) {
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      const err = new Error(`Illegal management-review transition ${fromStatus} → ${toStatus}`);
      err.code = 'ILLEGAL_TRANSITION';
      throw err;
    }
  }

  // ── lifecycle ────────────────────────────────────────────────────

  /**
   * Create a new review in `scheduled` state.
   * @param {object} data  { title, type?, cycleLabel?, scheduledFor, branchId?, tenantId?, agenda? }
   * @param {string|ObjectId} userId  creator
   */
  async scheduleReview(data, userId) {
    if (!data || !data.title) throw new Error('title is required');
    if (!data.scheduledFor) throw new Error('scheduledFor is required');
    if (!userId) throw new Error('userId is required');

    const doc = await this.model.create({
      title: data.title,
      type: data.type || 'periodic',
      cycleLabel: data.cycleLabel || null,
      scheduledFor: new Date(data.scheduledFor),
      branchId: data.branchId || null,
      tenantId: data.tenantId || null,
      agenda: Array.isArray(data.agenda) ? data.agenda : [],
      status: 'scheduled',
      createdBy: userId,
      previousReviewId: data.previousReviewId || null,
    });

    await this._emit('quality.review.scheduled', {
      reviewId: String(doc._id),
      reviewNumber: doc.reviewNumber,
      branchId: doc.branchId ? String(doc.branchId) : null,
      scheduledFor: doc.scheduledFor,
      createdBy: String(userId),
    });

    return doc;
  }

  /**
   * Move a review from `scheduled` → `agenda_set`.
   */
  async setAgenda(reviewId, { agenda, attendees }, userId) {
    const review = await this._loadActive(reviewId);
    this._assertTransition(review.status, 'agenda_set');

    if (Array.isArray(agenda)) review.agenda = agenda;
    if (Array.isArray(attendees)) {
      review.attendees = attendees.map(a => ({
        userId: a.userId,
        nameSnapshot: a.nameSnapshot || '',
        role: a.role,
        present: a.present !== false,
        delegatedFrom: a.delegatedFrom || null,
      }));
    }

    review.status = 'agenda_set';
    await review.save();

    await this._emit('quality.review.agenda_set', {
      reviewId: String(review._id),
      agendaCount: review.agenda.length,
      attendeeCount: review.attendees.length,
      by: String(userId),
    });

    return review;
  }

  async startMeeting(reviewId, userId) {
    const review = await this._loadActive(reviewId);
    this._assertTransition(review.status, 'in_progress');
    review.status = 'in_progress';
    review.startedAt = this.now();
    await review.save();

    await this._emit('quality.review.started', {
      reviewId: String(review._id),
      startedAt: review.startedAt,
      by: String(userId),
    });
    return review;
  }

  /**
   * Append an input entry. Accepted while the review is in
   * `agenda_set` or `in_progress`.
   */
  async recordInput(reviewId, input, userId) {
    const review = await this._loadActive(reviewId);
    if (!['agenda_set', 'in_progress'].includes(review.status)) {
      throw Object.assign(new Error('Cannot record inputs outside preparation/meeting'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!input || !input.code || !input.summary) {
      throw new Error('input.code and input.summary are required');
    }

    review.inputs.push({
      code: input.code,
      summary: input.summary,
      metrics: input.metrics || null,
      attachments: input.attachments || [],
      capturedBy: userId,
      capturedAt: this.now(),
    });
    await review.save();

    await this._emit('quality.review.input_recorded', {
      reviewId: String(review._id),
      code: input.code,
      by: String(userId),
    });
    return review;
  }

  async recordOutput(reviewId, output, userId) {
    const review = await this._loadActive(reviewId);
    if (!['in_progress', 'decisions_recorded', 'actions_assigned'].includes(review.status)) {
      throw Object.assign(new Error('Cannot record outputs before meeting start'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!output || !output.code || !output.description) {
      throw new Error('output.code and output.description are required');
    }

    review.outputs.push({
      code: output.code,
      description: output.description,
      recordedBy: userId,
      recordedAt: this.now(),
    });
    await review.save();

    await this._emit('quality.review.output_recorded', {
      reviewId: String(review._id),
      code: output.code,
      by: String(userId),
    });
    return review;
  }

  async recordDecision(reviewId, decision, userId) {
    const review = await this._loadActive(reviewId);
    if (!['in_progress', 'decisions_recorded', 'actions_assigned'].includes(review.status)) {
      throw Object.assign(new Error('Cannot record decisions before meeting start'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!decision || !decision.type || !decision.title || !decision.rationale) {
      throw new Error('decision.type, title and rationale are required');
    }

    review.decisions.push({
      type: decision.type,
      title: decision.title,
      rationale: decision.rationale,
      effectiveFrom: decision.effectiveFrom ? new Date(decision.effectiveFrom) : this.now(),
      decidedBy: Array.isArray(decision.decidedBy) ? decision.decidedBy : [userId],
    });
    if (review.status === 'in_progress') review.status = 'decisions_recorded';
    await review.save();

    await this._emit('quality.review.decision_recorded', {
      reviewId: String(review._id),
      decisionType: decision.type,
      by: String(userId),
    });
    return review;
  }

  async assignAction(reviewId, action, userId) {
    const review = await this._loadActive(reviewId);
    if (!['decisions_recorded', 'actions_assigned'].includes(review.status)) {
      throw Object.assign(new Error('Decisions must be recorded before actions'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!action || !action.title || !action.ownerUserId) {
      throw new Error('action.title and ownerUserId are required');
    }

    const priority = action.priority || 'medium';
    const dueDate = action.dueDate
      ? new Date(action.dueDate)
      : new Date(this.now().getTime() + (ACTION_DEFAULT_SLA_DAYS[priority] || 60) * 86400000);

    review.actions.push({
      title: action.title,
      description: action.description || null,
      priority,
      ownerUserId: action.ownerUserId,
      dueDate,
      status: 'open',
      linkedCapaId: action.linkedCapaId || null,
      linkedProjectId: action.linkedProjectId || null,
    });
    review.status = 'actions_assigned';
    await review.save();

    const created = review.actions[review.actions.length - 1];
    await this._emit('quality.review.action_assigned', {
      reviewId: String(review._id),
      actionId: String(created._id),
      priority,
      ownerUserId: String(action.ownerUserId),
      dueDate,
      assignedBy: String(userId),
    });
    return review;
  }

  /**
   * Close a review. Validates quorum + that every required input &
   * output has been recorded. Idempotent: calling on an already
   * closed review returns it unchanged.
   */
  async closeReview(reviewId, { closureNotes, nextReviewScheduledFor } = {}, userId) {
    const review = await this._loadActive(reviewId);
    if (review.status === 'closed') return review; // idempotent

    this._assertTransition(review.status, 'closed');

    const check = validateClosure(review);
    if (!check.ok) {
      const err = new Error(`Cannot close — missing: ${check.missing.join(', ')}`);
      err.code = 'INCOMPLETE_REVIEW';
      err.missing = check.missing;
      throw err;
    }

    review.status = 'closed';
    review.closedBy = userId;
    review.closedAt = this.now();
    review.endedAt = review.endedAt || this.now();
    review.closureNotes = closureNotes || null;

    // Auto-schedule the next cycle if not explicitly provided.
    if (nextReviewScheduledFor) {
      review.nextReviewScheduledFor = new Date(nextReviewScheduledFor);
    } else if (review.type === 'periodic' || review.type === 'annual') {
      const d = new Date(review.scheduledFor);
      d.setMonth(d.getMonth() + DEFAULT_CYCLE_MONTHS);
      review.nextReviewScheduledFor = d;
    }

    await review.save();

    await this._emit('quality.review.closed', {
      reviewId: String(review._id),
      reviewNumber: review.reviewNumber,
      branchId: review.branchId ? String(review.branchId) : null,
      closedBy: String(userId),
      closedAt: review.closedAt,
      openActions: review.openActionsCount,
      nextReviewScheduledFor: review.nextReviewScheduledFor,
    });
    return review;
  }

  async cancelReview(reviewId, reason, userId) {
    const review = await this._loadActive(reviewId);
    if (review.status === 'cancelled') return review;
    if (TERMINAL_STATUSES.includes(review.status)) {
      throw Object.assign(new Error('Review already terminal'), { code: 'ILLEGAL_TRANSITION' });
    }
    if (!reason || !String(reason).trim()) {
      throw new Error('cancellation reason is required');
    }

    review.status = 'cancelled';
    review.cancelledReason = String(reason).trim();
    review.closedBy = userId;
    review.closedAt = this.now();
    await review.save();

    await this._emit('quality.review.cancelled', {
      reviewId: String(review._id),
      reason: review.cancelledReason,
      by: String(userId),
    });
    return review;
  }

  /**
   * Append a leadership approval signature. Does not change status
   * (closure already happened) — simply builds the evidence trail.
   */
  async approve(reviewId, { role, signatureHash, notes }, userId) {
    const review = await this._loadActive(reviewId);
    if (review.status !== 'closed') {
      throw Object.assign(new Error('Only closed reviews can be approved'), {
        code: 'INVALID_PHASE',
      });
    }
    if (!role) throw new Error('role is required for approval');

    review.approvals.push({
      userId,
      role,
      signedAt: this.now(),
      signatureHash: signatureHash || null,
      notes: notes || null,
    });
    await review.save();

    await this._emit('quality.review.approved', {
      reviewId: String(review._id),
      approverUserId: String(userId),
      role,
      signedAt: review.approvals[review.approvals.length - 1].signedAt,
    });
    return review;
  }

  // ── queries ──────────────────────────────────────────────────────

  async findById(reviewId) {
    return this.model.findOne({ _id: reviewId, deleted_at: null });
  }

  async list({ branchId, status, type, fromDate, toDate, limit = 50, skip = 0 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (type) q.type = type;
    if (fromDate || toDate) {
      q.scheduledFor = {};
      if (fromDate) q.scheduledFor.$gte = new Date(fromDate);
      if (toDate) q.scheduledFor.$lte = new Date(toDate);
    }
    return this.model
      .find(q)
      .sort({ scheduledFor: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200));
  }

  /**
   * Returns the compliance snapshot used by the executive dashboard.
   * Enhanced with completionRate, avgCycleTimeDays, dueThisMonth,
   * totalOpenActions, and upcomingReviews.
   */
  async getDashboard({ branchId } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;

    const now = this.now();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [total, open, closed, overdue, dueThisMonth] = await Promise.all([
      this.model.countDocuments(q),
      this.model.countDocuments({ ...q, status: { $nin: ['closed', 'cancelled'] } }),
      this.model.countDocuments({ ...q, status: 'closed' }),
      this.model.countDocuments({
        ...q,
        status: { $nin: ['closed', 'cancelled'] },
        scheduledFor: { $lt: now },
      }),
      this.model.countDocuments({
        ...q,
        status: { $nin: ['closed', 'cancelled'] },
        scheduledFor: { $gte: monthStart, $lte: monthEnd },
      }),
    ]);

    const [latest, cycleTimeDocs, upcomingDocs, allActive] = await Promise.all([
      this.model
        .findOne({ ...q, status: 'closed' })
        .sort({ closedAt: -1 })
        .select('reviewNumber closedAt nextReviewScheduledFor actions')
        .lean(),
      this.model
        .find({ ...q, status: 'closed', startedAt: { $ne: null }, closedAt: { $ne: null } })
        .select('startedAt closedAt')
        .limit(20)
        .lean(),
      this.model
        .find({
          ...q,
          status: { $nin: ['closed', 'cancelled'] },
          scheduledFor: { $gte: now },
        })
        .sort({ scheduledFor: 1 })
        .limit(3)
        .select('reviewNumber title scheduledFor type status')
        .lean(),
      this.model
        .find({ ...q, status: { $nin: ['closed', 'cancelled'] } })
        .select('actions')
        .lean(),
    ]);

    // average cycle time in days
    let avgCycleTimeDays = null;
    if (cycleTimeDocs.length > 0) {
      const totalMs = cycleTimeDocs.reduce((acc, d) => {
        return acc + (new Date(d.closedAt) - new Date(d.startedAt));
      }, 0);
      avgCycleTimeDays = Math.round(totalMs / cycleTimeDocs.length / 86400000);
    }

    // total open actions across all active reviews
    const totalOpenActions = allActive.reduce((acc, r) => {
      return (
        acc +
        (r.actions || []).filter(a => ['open', 'in_progress', 'overdue'].includes(a.status)).length
      );
    }, 0);

    const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return {
      total,
      open,
      closed,
      overdue,
      dueThisMonth,
      completionRate,
      avgCycleTimeDays,
      totalOpenActions,
      latestClosed: latest
        ? {
            reviewNumber: latest.reviewNumber,
            closedAt: latest.closedAt,
            nextReviewScheduledFor: latest.nextReviewScheduledFor,
            openActions: (latest.actions || []).filter(a =>
              ['open', 'in_progress', 'overdue'].includes(a.status)
            ).length,
          }
        : null,
      upcoming: upcomingDocs,
    };
  }

  /**
   * Monthly trend analytics for the last N months.
   * Returns array of { month: 'YYYY-MM', scheduled, closed, cancelled, overdueAtEOM }.
   */
  async getAnalytics({ branchId, months = 12 } = {}) {
    const q = { deleted_at: null };
    if (branchId) q.branchId = branchId;

    const now = this.now();
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [scheduled, closed, cancelled] = await Promise.all([
        this.model.countDocuments({ ...q, scheduledFor: { $gte: from, $lte: to } }),
        this.model.countDocuments({ ...q, status: 'closed', closedAt: { $gte: from, $lte: to } }),
        this.model.countDocuments({
          ...q,
          status: 'cancelled',
          closedAt: { $gte: from, $lte: to },
        }),
      ]);

      result.push({ month: monthKey, scheduled, closed, cancelled });
    }

    // action-completion rate across all closed reviews
    const closedWithActions = await this.model
      .find({ ...q, status: 'closed' })
      .select('actions closedAt')
      .sort({ closedAt: -1 })
      .limit(50)
      .lean();

    let totalActions = 0;
    let completedActions = 0;
    for (const rev of closedWithActions) {
      for (const a of rev.actions || []) {
        totalActions++;
        if (a.status === 'completed') completedActions++;
      }
    }

    return {
      trend: result,
      actionCompletionRate:
        totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : null,
      totalActionsInScope: totalActions,
    };
  }

  /**
   * Update an inline action's status / completion notes.
   * Allowed transitions: open → in_progress → completed | cancelled
   *                       in_progress → completed | cancelled
   *                       overdue → completed | in_progress | cancelled
   */
  async updateActionStatus(reviewId, actionId, { status, completionNotes } = {}, userId) {
    const VALID_STATUSES = ['open', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!VALID_STATUSES.includes(status)) {
      throw Object.assign(new Error(`Invalid action status: ${status}`), { code: 'VALIDATION' });
    }

    const review = await this._loadActive(reviewId);
    const action = (review.actions || []).id(actionId);
    if (!action) {
      throw Object.assign(new Error('Action not found'), { code: 'NOT_FOUND' });
    }

    action.status = status;
    if (completionNotes) action.completionNotes = completionNotes;
    if (status === 'completed') action.completedAt = this.now();

    await review.save();

    await this._emit('quality.review.action_status_updated', {
      reviewId: String(review._id),
      actionId: String(actionId),
      status,
      by: String(userId),
    });
    return review;
  }

  /**
   * Set / update the narrative meeting minutes.
   * Allowed when status is in_progress, decisions_recorded, actions_assigned, or closed.
   */
  async setMinutes(reviewId, minutes, userId) {
    const review = await this._loadActive(reviewId);
    const ALLOWED_PHASES = ['in_progress', 'decisions_recorded', 'actions_assigned', 'closed'];
    if (!ALLOWED_PHASES.includes(review.status)) {
      throw Object.assign(new Error('Minutes can only be set once the meeting has started'), {
        code: 'INVALID_PHASE',
      });
    }
    if (typeof minutes !== 'string') throw new Error('minutes must be a string');

    review.minutes = minutes;
    await review.save();

    await this._emit('quality.review.minutes_updated', {
      reviewId: String(review._id),
      by: String(userId),
      length: minutes.length,
    });
    return review;
  }

  // ── internals ────────────────────────────────────────────────────

  async _loadActive(reviewId) {
    const doc = await this.model.findOne({ _id: reviewId, deleted_at: null });
    if (!doc) {
      const err = new Error('ManagementReview not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return doc;
  }
}

// ── factory + lazy singleton ───────────────────────────────────────

function createManagementReviewService(deps) {
  return new ManagementReviewService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    const model = require('../../models/quality/ManagementReview.model');
    _defaultInstance = new ManagementReviewService({ model });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  ManagementReviewService,
  createManagementReviewService,
  getDefault,
  _replaceDefault,
  ALLOWED_TRANSITIONS,
  REVIEW_STATUSES,
};
