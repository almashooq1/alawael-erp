'use strict';

/**
 * welfare.service.js — Phase 17 Commit 4 (4.0.86).
 *
 * Owns the welfare-application lifecycle + appeal track + disbursement recording.
 *
 * Surfaces:
 *   createApplication(data)         — draft
 *   submitApplication(id, { submittedAt })
 *   transitionApplication(id, toStatus, { patch, notes })
 *   recordInfoRequest(id, { notes })  — convenience for info_requested
 *   resumeFromInfoRequest(id, ...)
 *   approveApplication(id, { approvedAt, approvedAmount?, fullAmount? })
 *   rejectApplication(id, { rejectionReason, rejectionNotes })
 *   fileAppeal(id, { reason, supportingDocuments })
 *   decideAppeal(id, appealId, { outcome, decisionNotes })
 *   recordDisbursement(id, { amount, disbursedAt, receiptRef })
 *   closeApplication(id)
 *   cancelApplication(id, { cancellationReason })
 *   addDocument(id, doc)
 *   findById / list / caseApplications / beneficiaryHistory
 *   getAnalytics({ branchId, windowDays })
 */

const registry = require('../../config/care/welfare.registry');

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

function createWelfareService({
  applicationModel,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!applicationModel) throw new Error('welfare.service: applicationModel required');
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Welfare] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshot(doc, extra = {}) {
    return {
      applicationId: String(doc._id),
      applicationNumber: doc.applicationNumber,
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      caseId: doc.caseId ? String(doc.caseId) : null,
      branchId: doc.branchId ? String(doc.branchId) : null,
      applicationType: doc.applicationType,
      targetAgency: doc.targetAgency,
      status: doc.status,
      requestedAmount: doc.requestedAmount,
      approvedAmount: doc.approvedAmount,
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

  // ── createApplication ─────────────────────────────────────────

  async function createApplication(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'applicationType', 'targetAgency'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);
    if (!registry.APPLICATION_TYPES.includes(data.applicationType)) {
      throw new MissingFieldError([`applicationType (unknown '${data.applicationType}')`]);
    }
    if (!registry.TARGET_AGENCIES.includes(data.targetAgency)) {
      throw new MissingFieldError([`targetAgency (unknown '${data.targetAgency}')`]);
    }

    const doc = await applicationModel.create({
      ...data,
      status: 'draft',
      statusHistory: [],
      appeals: [],
      disbursements: [],
      documents: [],
      createdBy: actorId,
    });

    await _emit('ops.care.welfare.application_created', _snapshot(doc));
    return doc;
  }

  // ── generic transition ────────────────────────────────────────

  async function transitionApplication(
    id,
    toStatus,
    { actorId = null, notes = null, patch = {} } = {}
  ) {
    const doc = await applicationModel.findById(id);
    if (!doc) throw new NotFoundError('Application not found');
    const fromStatus = doc.status;
    if (!registry.canTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal welfare transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForTransition(fromStatus, toStatus);

    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;

    const required = registry.requiredFieldsForTransition(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushHistory(doc, { from: fromStatus, to: toStatus, event, actorId, notes });
    doc.status = toStatus;

    // Mirror timestamps
    if (toStatus === 'approved' || toStatus === 'appeal_approved') {
      doc.approvedAt = doc.approvedAt || now();
    }
    if (toStatus === 'rejected' || toStatus === 'appeal_rejected') {
      doc.rejectedAt = doc.rejectedAt || now();
    }
    if (toStatus === 'closed') doc.closedAt = now();
    if (toStatus === 'cancelled') doc.cancelledAt = now();

    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      `ops.care.welfare.${event}`,
      _snapshot(doc, { from: fromStatus, to: toStatus, event })
    );
    await _emit(
      'ops.care.welfare.transitioned',
      _snapshot(doc, { from: fromStatus, to: toStatus, event })
    );
    return doc;
  }

  // ── convenience wrappers ──────────────────────────────────────

  async function submitApplication(id, { submittedAt = null, actorId = null } = {}) {
    return transitionApplication(id, 'submitted', {
      actorId,
      patch: { submittedAt: submittedAt ? new Date(submittedAt) : now() },
    });
  }

  async function recordInfoRequest(id, { notes = null, actorId = null } = {}) {
    return transitionApplication(id, 'info_requested', { actorId, notes });
  }

  async function resumeFromInfoRequest(id, { notes = null, actorId = null } = {}) {
    return transitionApplication(id, 'under_review', { actorId, notes });
  }

  async function approveApplication(
    id,
    { approvedAt = null, approvedAmount = null, partial = false, actorId = null } = {}
  ) {
    const doc = await applicationModel.findById(id);
    if (!doc) throw new NotFoundError('Application not found');
    const when = approvedAt ? new Date(approvedAt) : now();
    const toStatus = partial ? 'partially_approved' : 'approved';
    const patch = { approvedAt: when };
    if (approvedAmount !== null) patch.approvedAmount = Number(approvedAmount);
    return transitionApplication(id, toStatus, { actorId, patch });
  }

  async function rejectApplication(
    id,
    { rejectionReason, rejectionNotes = null, actorId = null } = {}
  ) {
    if (!rejectionReason) throw new MissingFieldError(['rejectionReason']);
    return transitionApplication(id, 'rejected', {
      actorId,
      patch: { rejectionReason, rejectionNotes },
    });
  }

  // ── appeals ────────────────────────────────────────────────────

  async function fileAppeal(id, { reason, supportingDocuments = [], actorId = null } = {}) {
    if (!reason) throw new MissingFieldError(['reason']);
    const doc = await applicationModel.findById(id);
    if (!doc) throw new NotFoundError('Application not found');
    // Must be in rejected OR partially_approved status
    if (!['rejected', 'partially_approved'].includes(doc.status)) {
      throw new IllegalTransitionError(
        `Can only appeal from rejected or partially_approved (current='${doc.status}')`,
        { from: doc.status, to: 'appealed' }
      );
    }
    // If there's already an active appeal, reject
    if ((doc.appeals || []).some(a => a.outcome === 'pending')) {
      throw new ConflictError('An appeal is already pending for this application');
    }
    doc.appeals.push({
      filedAt: now(),
      filedBy: actorId || null,
      reason,
      supportingDocuments: Array.isArray(supportingDocuments) ? supportingDocuments : [],
      outcome: 'pending',
    });
    doc.appealReason = reason; // gate value for the transition
    await doc.save();
    return transitionApplication(id, 'appealed', { actorId });
  }

  async function decideAppeal(
    id,
    appealId,
    {
      outcome,
      decisionNotes = null,
      approvedAt = null,
      rejectionReason = null,
      actorId = null,
    } = {}
  ) {
    if (!outcome || !['approved', 'rejected'].includes(outcome)) {
      throw new MissingFieldError([`outcome (must be approved|rejected)`]);
    }
    const doc = await applicationModel.findById(id);
    if (!doc) throw new NotFoundError('Application not found');
    if (doc.status !== 'appealed') {
      throw new IllegalTransitionError(
        `decideAppeal only valid from 'appealed' status (current='${doc.status}')`,
        { from: doc.status }
      );
    }
    const appeal = (doc.appeals || []).find(a => String(a._id) === String(appealId));
    if (!appeal) throw new NotFoundError('Appeal not found');
    if (appeal.outcome !== 'pending') {
      throw new ConflictError(`Appeal already decided as '${appeal.outcome}'`);
    }
    if (outcome === 'rejected' && !rejectionReason) {
      throw new MissingFieldError(['rejectionReason']);
    }
    appeal.outcome = outcome;
    appeal.decidedAt = now();
    appeal.decisionNotes = decisionNotes;

    if (outcome === 'approved') {
      const patch = {};
      if (approvedAt) patch.approvedAt = new Date(approvedAt);
      else if (!doc.approvedAt) patch.approvedAt = now();
      await doc.save();
      return transitionApplication(id, 'appeal_approved', { actorId, patch });
    }
    await doc.save();
    return transitionApplication(id, 'appeal_rejected', {
      actorId,
      patch: { rejectionReason },
    });
  }

  // ── disbursements ─────────────────────────────────────────────

  async function recordDisbursement(
    id,
    { amount, disbursedAt = null, receiptReference = null, notes = null, actorId = null } = {}
  ) {
    if (!amount || isNaN(Number(amount))) {
      throw new MissingFieldError(['amount (> 0)']);
    }
    const doc = await applicationModel.findById(id);
    if (!doc) throw new NotFoundError('Application not found');
    if (!['approved', 'partially_approved', 'appeal_approved', 'disbursed'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot record disbursement from status '${doc.status}'`, {
        from: doc.status,
      });
    }
    const when = disbursedAt ? new Date(disbursedAt) : now();
    doc.disbursements.push({
      amount: Number(amount),
      currency: doc.currency || 'SAR',
      disbursedAt: when,
      receiptReference,
      notes,
    });
    // First disbursement — transition to disbursed + stamp shortcut
    if (doc.status !== 'disbursed') {
      doc.disbursedAt = when;
      doc.disbursedAmount = Number(amount);
      await doc.save();
      return transitionApplication(id, 'disbursed', {
        actorId,
        patch: { disbursedAt: when, disbursedAmount: Number(amount) },
      });
    }
    // Subsequent disbursement — accumulate totals, stay in disbursed
    doc.disbursedAmount = (doc.disbursedAmount || 0) + Number(amount);
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      'ops.care.welfare.disbursement_recorded',
      _snapshot(doc, { amount: Number(amount), receiptReference })
    );
    return doc;
  }

  // ── close / cancel ────────────────────────────────────────────

  async function closeApplication(id, { notes = null, actorId = null } = {}) {
    return transitionApplication(id, 'closed', { actorId, notes });
  }

  async function cancelApplication(id, { cancellationReason, actorId = null } = {}) {
    if (!cancellationReason) throw new MissingFieldError(['cancellationReason']);
    if (!registry.CANCELLATION_REASONS.includes(cancellationReason)) {
      throw new MissingFieldError([`cancellationReason (unknown '${cancellationReason}')`]);
    }
    return transitionApplication(id, 'cancelled', {
      actorId,
      patch: { cancellationReason },
    });
  }

  // ── documents ─────────────────────────────────────────────────

  async function addDocument(id, doc, { actorId = null } = {}) {
    if (!doc?.kind || !doc?.fileName) {
      throw new MissingFieldError(
        [!doc?.kind && 'kind', !doc?.fileName && 'fileName'].filter(Boolean)
      );
    }
    const app = await applicationModel.findById(id);
    if (!app) throw new NotFoundError('Application not found');
    app.documents.push({
      kind: doc.kind,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl || null,
      uploadedAt: now(),
      uploadedBy: actorId || null,
    });
    app.updatedBy = actorId;
    await app.save();
    return app;
  }

  // ── reads ─────────────────────────────────────────────────────

  async function findById(id) {
    const doc = await applicationModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function list({
    branchId = null,
    beneficiaryId = null,
    caseId = null,
    status = null,
    applicationType = null,
    targetAgency = null,
    assignedToUserId = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (caseId) filter.caseId = caseId;
    if (status) filter.status = status;
    if (applicationType) filter.applicationType = applicationType;
    if (targetAgency) filter.targetAgency = targetAgency;
    if (assignedToUserId) filter.assignedToUserId = assignedToUserId;
    return applicationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  async function beneficiaryHistory(beneficiaryId) {
    return applicationModel.find({ beneficiaryId, deleted_at: null }).sort({ createdAt: -1 });
  }

  /**
   * Analytics rollup — conversion %, approval rate, average
   * time-to-disbursement, total disbursed value.
   */
  async function getAnalytics({ branchId = null, windowDays = 90 } = {}) {
    const since = new Date(Date.now() - windowDays * 86400000);
    const filter = { deleted_at: null, createdAt: { $gte: since } };
    if (branchId) filter.branchId = branchId;

    const rows = await applicationModel.find(filter);
    let total = 0;
    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    let disbursed = 0;
    let appealsWon = 0;
    let totalDisbursedValue = 0;
    const timeToDisbursementDays = [];

    for (const r of rows) {
      total++;
      if (r.submittedAt) submitted++;
      if (['approved', 'partially_approved', 'appeal_approved', 'disbursed'].includes(r.status)) {
        approved++;
      }
      if (['rejected', 'appeal_rejected'].includes(r.status)) {
        rejected++;
      }
      if (r.status === 'disbursed') {
        disbursed++;
        if (r.submittedAt && r.disbursedAt) {
          const days = Math.round((r.disbursedAt.getTime() - r.submittedAt.getTime()) / 86400000);
          timeToDisbursementDays.push(days);
        }
      }
      if ((r.appeals || []).some(a => a.outcome === 'approved')) appealsWon++;
      totalDisbursedValue += (r.disbursements || []).reduce((s, d) => s + (d.amount || 0), 0);
    }

    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);
    const avgDays = timeToDisbursementDays.length
      ? Math.round(
          (timeToDisbursementDays.reduce((s, n) => s + n, 0) / timeToDisbursementDays.length) * 10
        ) / 10
      : null;

    return {
      windowDays,
      generatedAt: now(),
      total,
      submitted,
      approved,
      rejected,
      disbursed,
      appealsWon,
      approvalRatePct: pct(approved, submitted),
      disbursementRatePct: pct(disbursed, approved),
      avgTimeToDisbursementDays: avgDays,
      totalDisbursedSAR: totalDisbursedValue,
    };
  }

  return {
    createApplication,
    submitApplication,
    transitionApplication,
    recordInfoRequest,
    resumeFromInfoRequest,
    approveApplication,
    rejectApplication,
    fileAppeal,
    decideAppeal,
    recordDisbursement,
    closeApplication,
    cancelApplication,
    addDocument,
    findById,
    list,
    beneficiaryHistory,
    getAnalytics,
  };
}

module.exports = {
  createWelfareService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
