'use strict';

/**
 * socialCase.service.js — Phase 17 Commit 2 (4.0.84).
 *
 * The only legal mutator of a SocialCase. Owns the state machine,
 * the three SLA clocks, and the event emission for the Phase-15
 * notification router to subscribe to.
 *
 * Surfaces:
 *   openCase(data)                        — intake, activates intake SLA
 *   flagHighRisk(id, reason)              — flips riskLevel + activates
 *                                            the 24h high-risk SLA
 *   downgradeRisk(id, level)              — lowers riskLevel, resolves
 *                                            high-risk SLA if present
 *   recordAssessment(id, assessment)      — writes embedded assessment
 *                                            + resolves intake SLA
 *   createInterventionPlan(id, plan)      — transitions assessment →
 *                                            intervention_planned, activates
 *                                            plan SLA, resolves when done
 *   addInterventionItem(id, item)         — append to plan
 *   updateInterventionItemStatus(...)     — per-item lifecycle
 *   addReferral(id, referral)             — external org referral
 *   transitionCase(id, toStatus, ...)     — generic state-machine move
 *   transferCase(id, toWorkerId, ...)     — reassign
 *   closeCase(id, outcome, summary)       — terminal transition
 *   cancelCase(id, reason)                — cancelled branch
 *   findById / list / workerCaseload
 *
 * Every transition emits `ops.care.social.<event>` + the umbrella
 * `ops.care.social.transitioned`.
 *
 * Error codes: NOT_FOUND / ILLEGAL_TRANSITION / MISSING_FIELD / CONFLICT.
 */

const registry = require('../../config/care/social.registry');

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

function createSocialCaseService({
  caseModel,
  slaEngine = null,
  dispatcher = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!caseModel) throw new Error('socialCase.service: caseModel required');
  registry.validate();

  // ── helpers ────────────────────────────────────────────────────

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Social] emit ${name} failed: ${err.message}`);
    }
  }

  function _missing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshot(doc, extra = {}) {
    return {
      caseId: String(doc._id),
      caseNumber: doc.caseNumber,
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      branchId: doc.branchId ? String(doc.branchId) : null,
      caseType: doc.caseType,
      riskLevel: doc.riskLevel,
      status: doc.status,
      assignedWorkerId: doc.assignedWorkerId ? String(doc.assignedWorkerId) : null,
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

  // ── openCase ──────────────────────────────────────────────────

  async function openCase(data, { actorId = null } = {}) {
    const required = ['beneficiaryId', 'assignedWorkerId'];
    const missing = required.filter(f => _missing(data[f]));
    if (missing.length) throw new MissingFieldError(missing);

    const doc = await caseModel.create({
      ...data,
      status: 'intake',
      caseType: data.caseType || 'intake',
      riskLevel: data.riskLevel || 'low',
      statusHistory: [],
      createdBy: actorId,
    });

    // Activate intake-to-assessment SLA.
    if (slaEngine) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForIntake(),
          subjectType: 'SocialCase',
          subjectId: doc._id,
          subjectRef: doc.caseNumber,
          branchId: doc.branchId || null,
          startedAt: doc.createdAt || now(),
          metadata: { caseType: doc.caseType, riskLevel: doc.riskLevel },
        });
        doc.intakeSlaId = sla._id;
        await doc.save();
      } catch (err) {
        logger.warn(`[Social] intake SLA activate failed: ${err.message}`);
      }
    }

    // Activate high-risk SLA if opened at high/critical.
    if (registry.isHighRisk(doc.riskLevel)) {
      await _activateHighRiskSla(doc, { reason: 'opened_high_risk' });
    }

    await _emit('ops.care.social.case_opened', _snapshot(doc));
    return doc;
  }

  // ── High-risk management ──────────────────────────────────────

  async function _activateHighRiskSla(doc, { reason = null } = {}) {
    if (!slaEngine) return;
    if (doc.highRiskSlaId) return; // idempotent
    try {
      const sla = await slaEngine.activate({
        policyId: registry.slaPolicyForHighRisk(),
        subjectType: 'SocialCase',
        subjectId: doc._id,
        subjectRef: doc.caseNumber,
        branchId: doc.branchId || null,
        startedAt: now(),
        metadata: { reason, riskLevel: doc.riskLevel },
      });
      doc.highRiskSlaId = sla._id;
      await doc.save();
      await _emit('ops.care.social.case_flagged_high_risk', _snapshot(doc, { reason }));
    } catch (err) {
      logger.warn(`[Social] high-risk SLA activate failed: ${err.message}`);
    }
  }

  async function flagHighRisk(id, { riskLevel = 'high', reason = null, actorId = null } = {}) {
    if (!registry.RISK_LEVELS.includes(riskLevel)) {
      throw new MissingFieldError([`riskLevel (unknown '${riskLevel}')`]);
    }
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    if (!registry.isHighRisk(riskLevel)) {
      throw new MissingFieldError(['riskLevel must be high or critical']);
    }
    const previousLevel = doc.riskLevel;
    doc.riskLevel = riskLevel;
    doc.updatedBy = actorId;
    await doc.save();
    await _activateHighRiskSla(doc, { reason: reason || 'flag_high_risk' });
    await _emit(
      'ops.care.social.risk_upgraded',
      _snapshot(doc, { from: previousLevel, to: riskLevel, reason })
    );
    return doc;
  }

  async function downgradeRisk(id, { riskLevel = 'low', actorId = null } = {}) {
    if (!registry.RISK_LEVELS.includes(riskLevel)) {
      throw new MissingFieldError([`riskLevel (unknown '${riskLevel}')`]);
    }
    if (registry.isHighRisk(riskLevel)) {
      throw new MissingFieldError(['riskLevel must be low or medium']);
    }
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    const previousLevel = doc.riskLevel;
    doc.riskLevel = riskLevel;
    // Resolve high-risk SLA if present
    if (slaEngine && doc.highRiskSlaId) {
      try {
        await slaEngine.observe({
          slaId: doc.highRiskSlaId,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[Social] high-risk SLA resolve failed: ${err.message}`);
      }
      doc.highRiskSlaId = null;
    }
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      'ops.care.social.risk_downgraded',
      _snapshot(doc, { from: previousLevel, to: riskLevel })
    );
    return doc;
  }

  // ── Assessment ───────────────────────────────────────────────

  async function recordAssessment(id, assessmentData, { actorId = null } = {}) {
    if (!assessmentData || !assessmentData.assessmentSummary) {
      throw new MissingFieldError(['assessmentSummary']);
    }
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    if (
      !['intake', 'assessment', 'awaiting_family_consent', 'awaiting_documents'].includes(
        doc.status
      )
    ) {
      throw new IllegalTransitionError(`Cannot record assessment while status is '${doc.status}'`, {
        from: doc.status,
      });
    }

    // First transition the case into `assessment` if it's still in intake.
    if (doc.status === 'intake') {
      const event = registry.eventForTransition('intake', 'assessment');
      _pushHistory(doc, {
        from: 'intake',
        to: 'assessment',
        event,
        actorId,
        notes: 'assessment started',
      });
      doc.status = 'assessment';
    }

    // Write assessment data
    doc.assessment = {
      ...(doc.assessment || {}),
      domainScores: assessmentData.domainScores || doc.assessment?.domainScores || [],
      strengths: assessmentData.strengths ?? doc.assessment?.strengths ?? null,
      challenges: assessmentData.challenges ?? doc.assessment?.challenges ?? null,
      priorityNeeds: assessmentData.priorityNeeds ?? doc.assessment?.priorityNeeds ?? [],
      assessmentSummary: assessmentData.assessmentSummary,
      completedAt: now(),
      completedBy: actorId,
    };
    doc.assessmentSummary = assessmentData.assessmentSummary;

    // Transition to intervention_planned (required assessmentSummary gate met)
    const fromStatus = doc.status;
    const event = registry.eventForTransition(fromStatus, 'intervention_planned');
    if (!event) {
      throw new IllegalTransitionError(`Cannot complete assessment from '${fromStatus}'`, {
        from: fromStatus,
        to: 'intervention_planned',
      });
    }
    _pushHistory(doc, {
      from: fromStatus,
      to: 'intervention_planned',
      event,
      actorId,
      notes: 'assessment completed',
    });
    doc.status = 'intervention_planned';
    doc.updatedBy = actorId;

    // Resolve intake SLA
    if (slaEngine && doc.intakeSlaId) {
      try {
        await slaEngine.observe({
          slaId: doc.intakeSlaId,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[Social] intake SLA resolve failed: ${err.message}`);
      }
    }

    // Activate plan SLA (3d to finalise plan)
    if (slaEngine && !doc.planSlaId) {
      try {
        const sla = await slaEngine.activate({
          policyId: registry.slaPolicyForPlan(),
          subjectType: 'SocialCase',
          subjectId: doc._id,
          subjectRef: doc.caseNumber,
          branchId: doc.branchId || null,
          startedAt: now(),
          metadata: {},
        });
        doc.planSlaId = sla._id;
      } catch (err) {
        logger.warn(`[Social] plan SLA activate failed: ${err.message}`);
      }
    }

    await doc.save();
    await _emit(
      'ops.care.social.assessment_completed',
      _snapshot(doc, { assessmentSummary: doc.assessmentSummary })
    );
    await _emit(
      'ops.care.social.transitioned',
      _snapshot(doc, { from: fromStatus, to: 'intervention_planned', event })
    );
    return doc;
  }

  // ── Intervention plan ────────────────────────────────────────

  async function createInterventionPlan(id, planData, { actorId = null } = {}) {
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    if (doc.status !== 'intervention_planned') {
      throw new IllegalTransitionError(
        `Intervention plan can only be created from 'intervention_planned' status (current='${doc.status}')`,
        { from: doc.status }
      );
    }
    const items = planData?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new MissingFieldError(['items (at least 1 intervention)']);
    }
    doc.interventionPlan = {
      items: items.map(item => ({
        ...item,
        status: 'planned',
      })),
      rationale: planData.rationale || null,
      reviewDueDate: planData.reviewDueDate || null,
      createdAt: now(),
      createdBy: actorId,
    };

    // Transition to `active`
    const event = registry.eventForTransition('intervention_planned', 'active');
    _pushHistory(doc, {
      from: 'intervention_planned',
      to: 'active',
      event,
      actorId,
      notes: `${items.length} interventions planned`,
    });
    doc.status = 'active';

    // Resolve plan SLA
    if (slaEngine && doc.planSlaId) {
      try {
        await slaEngine.observe({
          slaId: doc.planSlaId,
          eventType: 'resolved',
          when: now(),
        });
      } catch (err) {
        logger.warn(`[Social] plan SLA resolve failed: ${err.message}`);
      }
    }

    doc.updatedBy = actorId;
    await doc.save();
    await _emit('ops.care.social.plan_created', _snapshot(doc, { itemsCount: items.length }));
    await _emit(
      'ops.care.social.transitioned',
      _snapshot(doc, { from: 'intervention_planned', to: 'active', event })
    );
    return doc;
  }

  async function addInterventionItem(id, itemData, { actorId = null } = {}) {
    if (!itemData || !itemData.type || !itemData.title) {
      throw new MissingFieldError(
        [!itemData?.type && 'type', !itemData?.title && 'title'].filter(Boolean)
      );
    }
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    if (!['active', 'monitoring'].includes(doc.status)) {
      throw new IllegalTransitionError(`Cannot add intervention while case is '${doc.status}'`, {
        from: doc.status,
      });
    }
    doc.interventionPlan.items.push({ ...itemData, status: 'planned' });
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      'ops.care.social.intervention_added',
      _snapshot(doc, { type: itemData.type, title: itemData.title })
    );
    return doc;
  }

  async function updateInterventionItemStatus(
    id,
    itemId,
    { toStatus, outcome, actorId = null } = {}
  ) {
    const validStatuses = ['planned', 'in_progress', 'completed', 'skipped', 'cancelled'];
    if (!validStatuses.includes(toStatus)) {
      throw new MissingFieldError([`toStatus (must be one of ${validStatuses.join('|')})`]);
    }
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    const item = (doc.interventionPlan?.items || []).find(i => String(i._id) === String(itemId));
    if (!item) throw new NotFoundError('Intervention item not found');
    item.status = toStatus;
    if (toStatus === 'completed') {
      item.actualCompletionDate = now();
      item.outcome = outcome || item.outcome;
    }
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      'ops.care.social.intervention_updated',
      _snapshot(doc, {
        itemId: String(itemId),
        toStatus,
      })
    );
    return doc;
  }

  // ── Referrals to external orgs ────────────────────────────────

  async function addReferral(id, referralData, { actorId = null } = {}) {
    if (!referralData?.targetOrg) throw new MissingFieldError(['targetOrg']);
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    if (
      !['intake', 'assessment', 'intervention_planned', 'active', 'monitoring'].includes(doc.status)
    ) {
      throw new IllegalTransitionError(`Cannot add referral while case is '${doc.status}'`, {
        from: doc.status,
      });
    }
    doc.referrals.push({
      targetOrg: referralData.targetOrg,
      targetContact: referralData.targetContact || null,
      reason: referralData.reason || null,
      sentAt: now(),
      status: 'pending',
    });
    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      'ops.care.social.referral_sent',
      _snapshot(doc, { targetOrg: referralData.targetOrg })
    );
    return doc;
  }

  // ── Generic transition ───────────────────────────────────────

  async function transitionCase(id, toStatus, { actorId = null, notes = null, patch = {} } = {}) {
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    const fromStatus = doc.status;
    if (!registry.canTransition(fromStatus, toStatus)) {
      throw new IllegalTransitionError(`illegal case transition ${fromStatus} → ${toStatus}`, {
        from: fromStatus,
        to: toStatus,
      });
    }
    const event = registry.eventForTransition(fromStatus, toStatus);
    // Apply patch
    for (const [k, v] of Object.entries(patch || {})) doc[k] = v;
    const required = registry.requiredFieldsForTransition(fromStatus, toStatus);
    const missing = required.filter(f => _missing(doc[f]));
    if (missing.length) throw new MissingFieldError(missing);

    _pushHistory(doc, { from: fromStatus, to: toStatus, event, actorId, notes });
    doc.status = toStatus;

    // SLA hooks — pause/resume/cancel across all three clocks
    if (slaEngine) {
      const isTerm = registry.isTerminal(toStatus);
      const isPause = registry.isPaused(toStatus);
      const slaIds = [doc.intakeSlaId, doc.planSlaId, doc.highRiskSlaId].filter(Boolean);
      for (const slaId of slaIds) {
        try {
          if (isTerm) {
            await slaEngine.observe({
              slaId,
              eventType: toStatus === 'closed' ? 'resolved' : 'cancelled',
              when: now(),
            });
          } else if (isPause || registry.isPaused(fromStatus)) {
            await slaEngine.observe({
              slaId,
              eventType: 'state_changed',
              state: toStatus,
              when: now(),
            });
          }
        } catch (err) {
          logger.warn(`[Social] SLA observe failed on ${slaId}: ${err.message}`);
        }
      }
    }

    // Mirror key timestamps
    if (toStatus === 'closed') {
      doc.closedAt = now();
      doc.closedBy = actorId;
    }
    if (toStatus === 'transferred') {
      doc.transferredAt = now();
    }

    doc.updatedBy = actorId;
    await doc.save();
    await _emit(
      `ops.care.social.${event}`,
      _snapshot(doc, { from: fromStatus, to: toStatus, event })
    );
    await _emit(
      'ops.care.social.transitioned',
      _snapshot(doc, { from: fromStatus, to: toStatus, event })
    );
    return doc;
  }

  // ── Transfer (wrapper over transitionCase) ────────────────────

  async function transferCase(
    id,
    { toWorkerId, toWorkerNameSnapshot = null, reason, actorId = null } = {}
  ) {
    if (!toWorkerId) throw new MissingFieldError(['toWorkerId']);
    if (!reason) throw new MissingFieldError(['reason']);
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    // Apply the re-assignment (new worker becomes assignedWorkerId;
    // previous remains recorded in transferHistory via statusHistory entry).
    const previousWorkerId = doc.assignedWorkerId;
    return transitionCase(id, 'transferred', {
      actorId,
      notes: `Transferred from ${previousWorkerId} to ${toWorkerId}: ${reason}`,
      patch: {
        transferredToWorkerId: toWorkerId,
        transferReason: reason,
        assignedWorkerId: toWorkerId,
        assignedWorkerNameSnapshot: toWorkerNameSnapshot,
      },
    });
  }

  async function closeCase(id, { closureOutcome, closureSummary, actorId = null } = {}) {
    if (!closureOutcome) throw new MissingFieldError(['closureOutcome']);
    if (!closureSummary) throw new MissingFieldError(['closureSummary']);
    const doc = await caseModel.findById(id);
    if (!doc) throw new NotFoundError('Case not found');
    // If not already in `closing`, transition there first
    if (doc.status !== 'closing') {
      if (['active', 'monitoring'].includes(doc.status)) {
        await transitionCase(id, 'closing', { actorId });
      } else {
        throw new IllegalTransitionError(
          `Cannot close from '${doc.status}' — must transition to 'closing' first`,
          { from: doc.status, to: 'closed' }
        );
      }
    }
    return transitionCase(id, 'closed', {
      actorId,
      patch: { closureOutcome, closureSummary },
    });
  }

  async function cancelCase(id, { reason, actorId = null } = {}) {
    if (!reason) throw new MissingFieldError(['reason']);
    return transitionCase(id, 'cancelled', {
      actorId,
      patch: { closureReason: reason },
    });
  }

  // ── Reads ──────────────────────────────────────────────────────

  async function findById(id) {
    const doc = await caseModel.findById(id);
    if (!doc || doc.deleted_at) return null;
    return doc;
  }

  async function list({
    branchId = null,
    status = null,
    assignedWorkerId = null,
    riskLevel = null,
    beneficiaryId = null,
    caseType = null,
    limit = 100,
    skip = 0,
  } = {}) {
    const filter = { deleted_at: null };
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (assignedWorkerId) filter.assignedWorkerId = assignedWorkerId;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (caseType) filter.caseType = caseType;
    return caseModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  async function workerCaseload(workerUserId, { includeTerminal = false } = {}) {
    const filter = { assignedWorkerId: workerUserId, deleted_at: null };
    if (!includeTerminal) {
      filter.status = { $nin: registry.CASE_TERMINAL_STATUSES };
    }
    return caseModel.find(filter).sort({ riskLevel: -1, createdAt: -1 });
  }

  return {
    openCase,
    flagHighRisk,
    downgradeRisk,
    recordAssessment,
    createInterventionPlan,
    addInterventionItem,
    updateInterventionItemStatus,
    addReferral,
    transitionCase,
    transferCase,
    closeCase,
    cancelCase,
    findById,
    list,
    workerCaseload,
  };
}

module.exports = {
  createSocialCaseService,
  NotFoundError,
  IllegalTransitionError,
  MissingFieldError,
  ConflictError,
};
