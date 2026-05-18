'use strict';

/**
 * care-plan.service.js — Wave 41 (Care Planning Phase 1).
 *
 * Workflow orchestration for care plans. Every state transition flows
 * through this service — no caller may mutate `status` directly.
 *
 * Public API:
 *   createDraft({ ... })
 *   runValidation({ planVersionId, actor, options })
 *   transition({ planVersionId, transitionId, actor, ... })
 *   reject({ planVersionId, actor, primaryReason, requiredFixes, ... })
 *   recordReviewScorecard({ planVersionId, actor, scorecard, notes })
 *   createNewVersion({ planId, basedOnVersionId, author, reason, changes })
 *   applyAmendment({ planVersionId, actor, field, before, after, reason })
 *   computeDiff(prevVersion, nextVersion)
 *
 * The service is PURE — Mongoose models are injected. Side-effects are
 * dispatched through named handlers so Wave 42 can wire real
 * notifiers / family senders / record filers without touching this
 * layer.
 *
 * Hard guards enforced here (in addition to model invariants):
 *   • Author cannot self-approve / self-review
 *   • Transitions only fire from allowed source states
 *   • approve transition requires readinessScore ≥ READY + zero hard failures
 *   • Plan types in ALWAYS_ESCALATE force `escalate` before `approve`
 *   • Rejection count ≥ ESCALATE_AFTER_REJECTIONS forces escalation
 *   • Approved versions are append-only (amendments allowed, body locked)
 *   • SignatureChain appended on every significant transition with hash-chaining
 */

const reg = require('./care-planning.registry');
const sod = require('./sod.lib');

const REASON = Object.freeze({
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  UNKNOWN_TRANSITION: 'UNKNOWN_TRANSITION',
  INVALID_FROM_STATUS: 'INVALID_FROM_STATUS',
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  ACTOR_ROLE_NOT_ALLOWED: 'ACTOR_ROLE_NOT_ALLOWED',
  SELF_APPROVAL_FORBIDDEN: 'SELF_APPROVAL_FORBIDDEN',
  READINESS_TOO_LOW: 'READINESS_TOO_LOW',
  HARD_FAILURES_PRESENT: 'HARD_FAILURES_PRESENT',
  MUST_ESCALATE: 'MUST_ESCALATE',
  REVIEW_SCORE_TOO_LOW: 'REVIEW_SCORE_TOO_LOW',
  IS_TERMINAL: 'IS_TERMINAL',
  AMENDMENT_FORBIDDEN: 'AMENDMENT_FORBIDDEN',
  VALIDATION_MISSING: 'VALIDATION_MISSING',
  REJECTION_MISSING_REASON: 'REJECTION_MISSING_REASON',
  FAMILY_VERSION_MISSING: 'FAMILY_VERSION_MISSING',
});

function fail(reason, extra = {}) {
  // Merge extras first so the canonical `reason` key always wins.
  return { ok: false, ...extra, reason };
}
function success(extra = {}) {
  return { ok: true, ...extra };
}

/**
 * @param {object} opts
 *   - planVersionModel   — Mongoose model for CarePlanVersion
 *   - validator          — { validate(plan, options) } from care-plan-validator
 *   - sideEffectHandlers — { [name]: async fn(ctx) } (save-to-record, notify-family, etc.)
 *   - notifier           — async fn({ event, payload, actor })
 *   - auditLogger        — { log({ action, ... }) }
 *   - anchorLedger       — { commit({ payload, type }) → txId } (for HIGH-sensitivity)
 *   - logger             — console-compatible
 *   - now                — clock injection
 */
function createCarePlanService({
  planVersionModel = null,
  validator = null,
  sideEffectHandlers = {},
  notifier = null,
  auditLogger = null,
  anchorLedger = null,
  logger = console,
  now = () => new Date(),
  computeSignatureHash = null,
  metrics = null,
} = {}) {
  if (!planVersionModel) {
    throw new Error('care-plan.service: planVersionModel is required');
  }
  if (!validator || typeof validator.validate !== 'function') {
    throw new Error('care-plan.service: validator (with .validate) is required');
  }

  async function _audit(action, actor, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: actor?.userId || null,
        actorRole: actor?.role || null,
        entityType: 'CarePlanVersion',
        entityId: metadata?.planVersionId || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[care-plan] audit ${action} failed: ${err.message}`);
    }
  }

  async function _notify(event, payload, actor) {
    if (!notifier) return;
    try {
      await notifier({ event, payload, actor });
    } catch (err) {
      logger.warn && logger.warn(`[care-plan] notify ${event} failed: ${err.message}`);
    }
  }

  async function _anchor(transitionId, planVersion) {
    if (!anchorLedger || typeof anchorLedger.commit !== 'function') return null;
    if (!reg.isHighSensitivity(transitionId)) return null;
    try {
      const tx = await anchorLedger.commit({
        type: `care-plan.${transitionId}`,
        payload: {
          planId: planVersion.planId,
          versionNumber: planVersion.versionNumber,
          status: planVersion.status,
          evidenceHash: planVersion.evidenceHash,
          signatureCount: (planVersion.signatureChain || []).length,
        },
      });
      return tx?.txId || null;
    } catch (err) {
      logger.warn && logger.warn(`[care-plan] anchor failed: ${err.message}`);
      return null;
    }
  }

  function _appendSignature(planVersion, { userId, role, action, nafathSignatureId = null }) {
    const chain = planVersion.signatureChain || [];
    const prev = chain.length > 0 ? chain[chain.length - 1] : null;
    const signedAt = now();
    const hash = planVersionModel.computeSignatureHash({
      userId,
      role,
      action,
      signedAt,
      prevHash: prev ? prev.hash : null,
    });
    chain.push({
      userId,
      role,
      action,
      signedAt,
      nafathSignatureId,
      prevHash: prev ? prev.hash : null,
      hash,
    });
    planVersion.signatureChain = chain;
  }

  function _ensureActor(actor) {
    if (!actor || !actor.userId || !actor.role) {
      return fail(REASON.ACTOR_REQUIRED);
    }
    return null;
  }

  function _actorRoleAllowed(transition, actor) {
    if (!Array.isArray(transition.actorRoles) || transition.actorRoles.length === 0) return true;
    return transition.actorRoles.includes(actor.role) || actor.role === 'system';
  }

  // ─── createDraft ──────────────────────────────────────────────

  async function createDraft({
    planId,
    planType,
    specialty = null,
    beneficiaryId,
    branchId,
    authorId,
    actor,
    reasonForPlan = 'initial',
    baselineSummary = { strengths: [], needs: [], problemList: [] },
    goals = [],
    programs = [],
    measures = [],
    tests = [],
    supportServices = [],
    familyRole = {},
    barriers = [],
    safetyFlags = [],
    sessionsPerWeekCap = 5,
    reviewSchedule = null,
    correlationId = null,
    metadata = {},
  }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    if (!reg.PLAN_TYPE_LIST.includes(planType)) {
      return fail('INVALID_PLAN_TYPE', { planType });
    }

    // Determine versionNumber based on existing versions for this planId
    let nextVersion = 1;
    const existing = await planVersionModel.findOne({ planId }).sort({ versionNumber: -1 }).lean();
    if (existing) nextVersion = existing.versionNumber + 1;

    const doc = new planVersionModel({
      planId,
      versionNumber: nextVersion,
      planType,
      specialty,
      status: reg.STATUSES.DRAFT,
      beneficiaryId,
      branchId,
      authorId,
      reasonForPlan,
      baselineSummary,
      goals,
      programs,
      measures,
      tests,
      supportServices,
      familyRole,
      barriers,
      safetyFlags,
      sessionsPerWeekCap,
      reviewSchedule: reviewSchedule || { cadenceWeeks: 12, triggerEvents: [] },
      createdAt: now(),
      correlationId,
      metadata,
    });

    await doc.save();
    await _audit('care-plan.draft.created', actor, {
      planVersionId: doc._id,
      planId,
      versionNumber: nextVersion,
    });
    await _notify('care-plan.draft.created', { planId, versionNumber: nextVersion }, actor);
    return success({ planVersion: doc });
  }

  // ─── updateDraft ──────────────────────────────────────────────
  // Allows the author to edit a plan while it's in an editable state.
  // Editable states: draft, revision_requested. Anything else → BAD_STATE.
  //
  // Semantics:
  //   • Caller passes a `changes` object with whatever they want to update.
  //   • Arrays (goals, programs, measures, tests, supportServices, barriers,
  //     safetyFlags) are REPLACED as a whole when present in the payload.
  //   • Scalar / object fields (specialty, sessionsPerWeekCap, reasonForPlan,
  //     baselineSummary, familyRole, reviewSchedule) are replaced when present.
  //   • Immutable fields are silently ignored: status, evidenceHash,
  //     signatureChain, authorId, reviewerId, approverId, rejectionCount,
  //     supersededBy, supersededAt, rejection, validation, _id, planId,
  //     versionNumber, createdAt, beneficiaryId, branchId.
  //   • After applying changes, the validation snapshot is invalidated
  //     (caller must call runValidation again to advance forward).
  //
  // Guards:
  //   • Only the original authorId may update.
  //   • Status must be in EDITABLE_STATES.

  // Editable states: anything before the plan leaves the author's hands.
  // Once submitted_to_supervisor, the supervisor owns it — author must
  // wait for request_revision (which downgrades back to draft on edit).
  const EDITABLE_STATES = new Set([
    reg.STATUSES.DRAFT,
    reg.STATUSES.VALIDATION_PENDING,
    reg.STATUSES.READY_FOR_SUBMISSION,
    reg.STATUSES.REVISION_REQUESTED,
  ]);

  const MUTABLE_FIELDS = new Set([
    'specialty',
    'reasonForPlan',
    'baselineSummary',
    'goals',
    'programs',
    'measures',
    'tests',
    'supportServices',
    'familyRole',
    'barriers',
    'safetyFlags',
    'sessionsPerWeekCap',
    'reviewSchedule',
    'metadata',
  ]);

  async function updateDraft({ planVersionId, actor, changes = {} }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    if (!EDITABLE_STATES.has(pv.status)) {
      return fail('NOT_EDITABLE', {
        detail: 'Editing is only allowed in draft or revision_requested',
        status: pv.status,
      });
    }

    // Only the original author may edit. branch_manager can override
    // only via the controlled-amendment workflow (Wave 41), not this path.
    if (String(pv.authorId) !== String(actor.userId)) {
      return fail(REASON.SELF_APPROVAL_FORBIDDEN, {
        detail: 'only the original author may edit the draft',
      });
    }

    if (!changes || typeof changes !== 'object') {
      return fail('INVALID_CHANGES');
    }

    // Apply only mutable fields
    let touched = 0;
    const applied = [];
    for (const [key, value] of Object.entries(changes)) {
      if (!MUTABLE_FIELDS.has(key)) continue;
      pv[key] = value;
      touched += 1;
      applied.push(key);
    }

    if (touched === 0) {
      return fail('NO_MUTABLE_CHANGES', {
        detail: 'changes did not reference any editable field',
        editable: [...MUTABLE_FIELDS],
      });
    }

    // Invalidate validation snapshot — caller must re-run runValidation
    pv.validation = {
      readinessScore: 0,
      band: 'draft_only',
      hardFailures: [],
      softWarnings: [],
      validatedAt: null,
    };

    // Whenever we're past `draft`, revert back so the author re-runs
    // validation before submitting again. The invalidated validation
    // snapshot already prevents accidental re-submission.
    if (pv.status !== reg.STATUSES.DRAFT) {
      pv.status = reg.STATUSES.DRAFT;
    }

    await pv.save();

    if (metrics && typeof metrics.incTransition === 'function') {
      metrics.incTransition('update_draft', pv.status, pv.status);
    }

    await _audit('care-plan.draft.updated', actor, {
      planVersionId: pv._id,
      planId: pv.planId,
      fieldsApplied: applied,
    });

    return success({ planVersion: pv, fieldsApplied: applied });
  }

  // ─── runValidation ────────────────────────────────────────────

  async function runValidation({ planVersionId, actor, options = {} }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    if (reg.isTerminalStatus(pv.status)) {
      return fail(REASON.IS_TERMINAL, { status: pv.status });
    }

    const snapshot = await validator.validate(pv.toObject ? pv.toObject() : pv, options);
    pv.validation = snapshot;

    // Optional: auto-advance through submit_for_validation / mark_ready
    if (pv.status === reg.STATUSES.DRAFT) {
      pv.status = reg.STATUSES.VALIDATION_PENDING;
    }
    if (
      pv.status === reg.STATUSES.VALIDATION_PENDING &&
      snapshot.band === 'ready' &&
      !snapshot.blocking
    ) {
      pv.status = reg.STATUSES.READY_FOR_SUBMISSION;
    }

    await pv.save();
    await _audit('care-plan.validation.run', actor, {
      planVersionId: pv._id,
      readinessScore: snapshot.readinessScore,
      hardFailures: snapshot.hardFailures.length,
      softWarnings: snapshot.softWarnings.length,
    });

    if (metrics && typeof metrics.observeReadinessScore === 'function') {
      metrics.observeReadinessScore(snapshot.readinessScore);
    }

    return success({ planVersion: pv, validation: snapshot });
  }

  // ─── transition (generic state-machine driver) ───────────────

  async function transition({
    planVersionId,
    transitionId,
    actor,
    nafathSignatureId = null,
    metadata = {},
  }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    const t = reg.findTransition(transitionId);
    if (!t) return fail(REASON.UNKNOWN_TRANSITION, { transitionId });

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    if (reg.isTerminalStatus(pv.status) && transitionId !== 'supersede') {
      return fail(REASON.IS_TERMINAL, { status: pv.status });
    }

    const valid = reg.validateTransitionRequest({ fromStatus: pv.status, transitionId });
    if (!valid.valid) {
      return fail(REASON.INVALID_FROM_STATUS, {
        from: pv.status,
        allowed: valid.allowed || null,
      });
    }

    if (!_actorRoleAllowed(t, actor)) {
      return fail(REASON.ACTOR_ROLE_NOT_ALLOWED, {
        role: actor.role,
        required: t.actorRoles,
      });
    }

    // Self-distinct guards — Wave 89 via canonical sod.lib.
    // Local REASON.SELF_APPROVAL_FORBIDDEN already matches the canonical
    // code from reason-codes.registry, so no translation needed.
    if (t.requiresSelfDistinctApprover) {
      const sodCheck = sod.checkSeparationOfDuties({
        actorId: actor.userId,
        priorActorIds: [pv.authorId],
      });
      if (!sodCheck.ok && sodCheck.reason === 'SELF_APPROVAL_FORBIDDEN') {
        return fail(REASON.SELF_APPROVAL_FORBIDDEN);
      }
    }

    // Readiness guards
    if (t.requiresHardFailuresClear) {
      if (!pv.validation || pv.validation.validatedAt == null) {
        return fail(REASON.VALIDATION_MISSING);
      }
      if ((pv.validation.hardFailures || []).length > 0) {
        return fail(REASON.HARD_FAILURES_PRESENT, {
          count: pv.validation.hardFailures.length,
        });
      }
      if ((pv.validation.readinessScore || 0) < (t.minReadinessScore || 0)) {
        return fail(REASON.READINESS_TOO_LOW, {
          readinessScore: pv.validation.readinessScore,
          required: t.minReadinessScore,
        });
      }
    }

    // Escalation rule — approve from `under_review` blocked if plan type forces escalation
    if (transitionId === 'approve' && pv.status === reg.STATUSES.UNDER_REVIEW) {
      if (reg.isPlanTypeAlwaysEscalated(pv.planType)) {
        return fail(REASON.MUST_ESCALATE, { detail: 'plan_type_requires_escalation' });
      }
      if (pv.rejectionCount >= reg.APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS) {
        return fail(REASON.MUST_ESCALATE, { detail: 'rejection_count_threshold' });
      }
      // Review score floor
      if (pv.reviewScorecard && pv.reviewScorecard.overall != null) {
        if (pv.reviewScorecard.overall < reg.APPROVAL_RULES.MIN_REVIEW_SCORE_TO_APPROVE) {
          return fail(REASON.REVIEW_SCORE_TOO_LOW, {
            overall: pv.reviewScorecard.overall,
            required: reg.APPROVAL_RULES.MIN_REVIEW_SCORE_TO_APPROVE,
          });
        }
      }
    }

    // Pre-mutation guards that depend on full state (e.g. notify_family
    // requires the body to be generated already). Run BEFORE we mutate
    // status so a failed guard leaves the in-memory record clean.
    if (transitionId === 'notify_family') {
      if (!pv.familyVersion || !pv.familyVersion.body) {
        return fail(REASON.FAMILY_VERSION_MISSING);
      }
    }

    // Apply transition
    const fromStatus = pv.status;
    pv.status = t.to;
    pv.metadata = { ...(pv.metadata || {}), lastTransition: transitionId };

    // Stamp timestamps + role assignments per transition
    if (transitionId === 'begin_review') {
      pv.reviewStartedAt = now();
      pv.reviewerId = actor.userId;
    }
    if (transitionId === 'approve') {
      pv.approvedAt = now();
      pv.approverId = actor.userId;
      // Compute and lock evidenceHash on approval
      const body = pv.toObject ? pv.toObject() : pv;
      const hashable = {
        planId: body.planId,
        versionNumber: body.versionNumber,
        goals: body.goals,
        programs: body.programs,
        measures: body.measures,
        tests: body.tests,
        supportServices: body.supportServices,
        familyRole: body.familyRole,
        safetyFlags: body.safetyFlags,
      };
      pv.evidenceHash = planVersionModel.computeEvidenceHash(hashable);
      _appendSignature(pv, {
        userId: actor.userId,
        role: actor.role,
        action: 'approve',
        nafathSignatureId,
      });
    }
    if (transitionId === 'reject') {
      pv.rejectedAt = now();
      pv.rejectionCount = (pv.rejectionCount || 0) + 1;
    }
    if (transitionId === 'submit_to_supervisor' || transitionId === 'resubmit_after_revision') {
      pv.submittedAt = now();
    }
    if (transitionId === 'save_to_record') {
      pv.savedToRecordAt = now();
      _appendSignature(pv, {
        userId: actor.userId,
        role: actor.role,
        action: 'save_to_record',
      });
    }
    if (transitionId === 'notify_family') {
      pv.familyNotifiedAt = now();
      _appendSignature(pv, {
        userId: actor.userId,
        role: actor.role,
        action: 'notify_family',
      });
    }
    if (transitionId === 'supersede') {
      pv.supersededAt = now();
    }

    // Save
    await pv.save();

    // Anchor for HIGH-sensitivity
    const anchorTxId = await _anchor(transitionId, pv);
    if (anchorTxId) {
      pv.metadata = { ...(pv.metadata || {}), anchorTxId };
      await pv.save();
    }

    // Dispatch named side-effects (Wave 42 wires real handlers)
    const sideEffectName = `care-plan.${transitionId}`;
    const handler = sideEffectHandlers[sideEffectName];
    if (typeof handler === 'function') {
      try {
        await handler({ planVersion: pv, actor, metadata });
      } catch (err) {
        logger.warn &&
          logger.warn(`[care-plan] side-effect ${sideEffectName} failed: ${err.message}`);
      }
    }

    await _audit(t.auditCategory, actor, {
      planVersionId: pv._id,
      fromStatus,
      toStatus: pv.status,
      transitionId,
      anchorTxId,
    });
    await _notify(
      t.auditCategory,
      { planVersionId: pv._id, fromStatus, toStatus: pv.status },
      actor
    );

    // ── Metrics emission ────────────────────────────────────
    if (metrics) {
      if (typeof metrics.incTransition === 'function') {
        metrics.incTransition(transitionId, fromStatus, pv.status);
      }
      if (transitionId === 'approve' && typeof metrics.incApproval === 'function') {
        metrics.incApproval(pv.planType);
        // Days from createdAt to approvedAt
        if (pv.createdAt && pv.approvedAt && typeof metrics.observeDaysToApproval === 'function') {
          const days =
            (new Date(pv.approvedAt).getTime() - new Date(pv.createdAt).getTime()) / 86400000;
          metrics.observeDaysToApproval(days);
        }
      }
      if (transitionId === 'escalate' && typeof metrics.incEscalation === 'function') {
        const trigger = reg.isPlanTypeAlwaysEscalated(pv.planType)
          ? 'plan_type'
          : pv.rejectionCount >= reg.APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS
            ? 'rejection_count'
            : 'manual';
        metrics.incEscalation(trigger);
      }
      if (transitionId === 'reject' && typeof metrics.incRejection === 'function') {
        metrics.incRejection(pv.rejection?.primaryReason || 'unknown');
      }
    }

    return success({ planVersion: pv, fromStatus, toStatus: pv.status, anchorTxId });
  }

  // ─── reject (structured rejection capture) ───────────────────

  async function reject({
    planVersionId,
    actor,
    primaryReason,
    requiredFixes = [],
    rewriteGuidance = null,
    urgency = 'within_7_days',
  }) {
    if (!primaryReason || !reg.REJECTION_REASON_LIST.includes(primaryReason)) {
      return fail(REASON.REJECTION_MISSING_REASON, { primaryReason });
    }

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    pv.rejection = {
      primaryReason,
      requiredFixes,
      rewriteGuidance,
      urgency,
    };
    await pv.save();

    return transition({ planVersionId, transitionId: 'reject', actor });
  }

  // ─── recordReviewScorecard ───────────────────────────────────

  async function recordReviewScorecard({ planVersionId, actor, scorecard = {}, notes = [] }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    if (pv.authorId && String(pv.authorId) === String(actor.userId)) {
      return fail(REASON.SELF_APPROVAL_FORBIDDEN);
    }

    const w = {
      quality: 0.25,
      compliance: 0.2,
      measurability: 0.2,
      safety: 0.15,
      clarity: 0.1,
      familyReadiness: 0.1,
    };
    const overall =
      w.quality * (scorecard.quality || 0) +
      w.compliance * (scorecard.compliance || 0) +
      w.measurability * (scorecard.measurability || 0) +
      w.safety * (scorecard.safety || 0) +
      w.clarity * (scorecard.clarity || 0) +
      w.familyReadiness * (scorecard.familyReadiness || 0);

    pv.reviewScorecard = { ...scorecard, overall: Number(overall.toFixed(2)) };
    pv.revisionNotes = notes;
    await pv.save();

    await _audit('care-plan.review.scorecard', actor, {
      planVersionId: pv._id,
      overall: pv.reviewScorecard.overall,
    });

    if (metrics && typeof metrics.observeReviewOverall === 'function') {
      metrics.observeReviewOverall(pv.reviewScorecard.overall);
    }

    return success({ planVersion: pv, overall: pv.reviewScorecard.overall });
  }

  // ─── createNewVersion (after revision / on approved-superseded) ──

  async function createNewVersion({
    planId,
    basedOnVersionId,
    author,
    reasonForRevision,
    changes = {},
  }) {
    const actorErr = _ensureActor(author);
    if (actorErr) return actorErr;

    const prev = await planVersionModel.findById(basedOnVersionId);
    if (!prev) return fail(REASON.PLAN_NOT_FOUND);

    const next = new planVersionModel({
      planId,
      versionNumber: prev.versionNumber + 1,
      planType: changes.planType || prev.planType,
      specialty: changes.specialty || prev.specialty,
      status: reg.STATUSES.DRAFT,
      beneficiaryId: prev.beneficiaryId,
      branchId: prev.branchId,
      authorId: author.userId,
      reasonForPlan: changes.reasonForPlan || 'revision',
      baselineSummary: changes.baselineSummary || prev.baselineSummary,
      goals: changes.goals != null ? changes.goals : prev.goals,
      programs: changes.programs != null ? changes.programs : prev.programs,
      measures: changes.measures != null ? changes.measures : prev.measures,
      tests: changes.tests != null ? changes.tests : prev.tests,
      supportServices:
        changes.supportServices != null ? changes.supportServices : prev.supportServices,
      familyRole: changes.familyRole || prev.familyRole,
      barriers: changes.barriers != null ? changes.barriers : prev.barriers,
      safetyFlags: changes.safetyFlags != null ? changes.safetyFlags : prev.safetyFlags,
      sessionsPerWeekCap: changes.sessionsPerWeekCap || prev.sessionsPerWeekCap,
      reviewSchedule: changes.reviewSchedule || prev.reviewSchedule,
      reasonForRevision,
      createdAt: now(),
    });

    const diff = computeDiff(prev, next);
    next.diffSummary = diff;
    await next.save();

    // If prev was approved/saved/notified, mark superseded
    if (
      [
        reg.STATUSES.APPROVED,
        reg.STATUSES.SAVED_TO_RECORD,
        reg.STATUSES.FAMILY_NOTIFICATION_SENT,
      ].includes(prev.status)
    ) {
      prev.supersededBy = String(next._id);
      prev.status = reg.STATUSES.SUPERSEDED;
      prev.supersededAt = now();
      await prev.save();
    }

    await _audit('care-plan.version.created', author, {
      planVersionId: next._id,
      planId,
      versionNumber: next.versionNumber,
      basedOnVersionId,
    });
    return success({ planVersion: next, diff });
  }

  // ─── applyAmendment (controlled, non-structural) ─────────────

  const NON_AMENDABLE_FIELDS = new Set([
    'goals',
    'programs',
    'measures',
    'tests',
    'safetyFlags',
    'supportServices',
    'status',
    'evidenceHash',
    'signatureChain',
    'authorId',
    'reviewerId',
    'approverId',
  ]);

  async function applyAmendment({ planVersionId, actor, field, before, after, reason }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    if (NON_AMENDABLE_FIELDS.has(field)) {
      return fail(REASON.AMENDMENT_FORBIDDEN, { field });
    }
    if (!reason || typeof reason !== 'string' || reason.length < 5) {
      return fail(REASON.AMENDMENT_FORBIDDEN, { detail: 'reason required (≥ 5 chars)' });
    }

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    const isApproved = [
      reg.STATUSES.APPROVED,
      reg.STATUSES.SAVED_TO_RECORD,
      reg.STATUSES.FAMILY_NOTIFICATION_SENT,
    ].includes(pv.status);

    if (!isApproved) {
      return fail(REASON.AMENDMENT_FORBIDDEN, {
        detail: 'amendments only allowed on approved versions',
      });
    }

    if (actor.role !== 'branch_manager') {
      return fail(REASON.AMENDMENT_FORBIDDEN, { detail: 'only branch_manager may amend' });
    }

    const amendmentId = `amd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    pv.amendments = [
      ...(pv.amendments || []),
      {
        amendmentId,
        appliedAt: now(),
        appliedBy: actor.userId,
        field,
        before,
        after,
        reason,
      },
    ];

    await pv.save();
    await _audit('care-plan.amendment.applied', actor, {
      planVersionId: pv._id,
      amendmentId,
      field,
    });
    return success({ planVersion: pv, amendmentId });
  }

  // ─── computeDiff ─────────────────────────────────────────────

  function computeDiff(prev, next) {
    const prevB = prev.toObject ? prev.toObject() : prev;
    const nextB = next.toObject ? next.toObject() : next;

    const goalIds = g => new Set((g || []).map(x => x.goalId || x.id));
    const addedGoals = [...goalIds(nextB.goals)].filter(id => !goalIds(prevB.goals).has(id));
    const removedGoals = [...goalIds(prevB.goals)].filter(id => !goalIds(nextB.goals).has(id));

    const fieldChanged = (a, b) => JSON.stringify(a || null) !== JSON.stringify(b || null);

    const semantic = {
      addedGoals,
      removedGoals,
      planTypeChanged: prevB.planType !== nextB.planType,
      safetyFlagsChanged: fieldChanged(prevB.safetyFlags, nextB.safetyFlags),
      measuresChanged: fieldChanged(prevB.measures, nextB.measures),
      programsChanged: fieldChanged(prevB.programs, nextB.programs),
      familyRoleChanged: fieldChanged(prevB.familyRole, nextB.familyRole),
      reviewScheduleChanged: fieldChanged(prevB.reviewSchedule, nextB.reviewSchedule),
    };

    const requiresFamilyRenotification =
      semantic.addedGoals.length > 0 ||
      semantic.removedGoals.length > 0 ||
      semantic.safetyFlagsChanged ||
      semantic.familyRoleChanged;

    const requiresSupervisorReReview =
      semantic.addedGoals.length > 0 ||
      semantic.removedGoals.length > 0 ||
      semantic.safetyFlagsChanged ||
      semantic.measuresChanged ||
      semantic.planTypeChanged;

    const oneLineSummary =
      [
        semantic.addedGoals.length > 0 ? `+${semantic.addedGoals.length} هدف` : null,
        semantic.removedGoals.length > 0 ? `-${semantic.removedGoals.length} هدف` : null,
        semantic.safetyFlagsChanged ? 'علامات السلامة' : null,
        semantic.measuresChanged ? 'المقاييس' : null,
        semantic.programsChanged ? 'البرامج' : null,
        semantic.familyRoleChanged ? 'دور الأسرة' : null,
      ]
        .filter(Boolean)
        .join('، ') || 'لا تغييرات جوهرية';

    return {
      ...semantic,
      requiresFamilyRenotification,
      requiresSupervisorReReview,
      oneLineSummary,
    };
  }

  // ─── Read helpers (used by Wave-42 routes) ───────────────────

  async function getPlanVersionById(planVersionId) {
    return planVersionModel.findById(planVersionId);
  }

  /**
   * Paginated list of plan versions with filters. Designed for the
   * Wave-52 frontend list page.
   *
   * @param {object} opts
   *   - filters: { status, statuses, planType, branchId, beneficiaryId,
   *                authorId, reviewerId, search }
   *   - pagination: { page=1, limit=20, sortBy='createdAt', sortDir='desc' }
   *   - actor: { userId, role, branchId } — for branch-scope enforcement
   * @returns { plans, total, page, limit, hasMore }
   */
  async function listPlans({ filters = {}, pagination = {}, actor = null } = {}) {
    const page = Math.max(1, Math.floor(Number(pagination.page) || 1));
    const limit = Math.max(1, Math.min(100, Math.floor(Number(pagination.limit) || 20)));
    const sortBy = ['createdAt', 'versionNumber', 'approvedAt', 'updatedAt'].includes(
      pagination.sortBy
    )
      ? pagination.sortBy
      : 'createdAt';
    const sortDir = pagination.sortDir === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    // Build Mongo query
    const q = {};

    // Status filter — accept single value or array
    if (Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      q.status = { $in: filters.statuses.filter(s => reg.STATUS_LIST.includes(s)) };
    } else if (filters.status && reg.STATUS_LIST.includes(filters.status)) {
      q.status = filters.status;
    }

    if (filters.planType && reg.PLAN_TYPE_LIST.includes(filters.planType)) {
      q.planType = filters.planType;
    }

    if (filters.branchId) q.branchId = filters.branchId;
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.authorId) q.authorId = filters.authorId;
    if (filters.reviewerId) q.reviewerId = filters.reviewerId;

    // Branch-scope enforcement: non-executive roles can only see their branch.
    // The route layer SHOULD pre-filter, but we add a safety belt here.
    if (
      actor &&
      actor.branchId &&
      !['executive_leadership', 'head_office', 'quality_compliance'].includes(actor.role)
    ) {
      // If client passed a branchId, it must equal actor's branch.
      // If no branchId, force the actor's branch.
      if (!q.branchId) {
        q.branchId = actor.branchId;
      } else if (String(q.branchId) !== String(actor.branchId)) {
        return { plans: [], total: 0, page, limit, hasMore: false };
      }
    }

    // Optional case-insensitive search on planId (the closest thing to a name
    // in this model — beneficiary name lives on a different collection)
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      q.planId = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    // Count + page
    let total = 0;
    let plans = [];
    try {
      // Use countDocuments + find; both supported by real Mongoose and most mocks
      if (typeof planVersionModel.countDocuments === 'function') {
        total = await planVersionModel.countDocuments(q);
      }
      let cursor = planVersionModel.find(q);
      if (cursor && typeof cursor.sort === 'function') cursor = cursor.sort({ [sortBy]: sortDir });
      if (cursor && typeof cursor.skip === 'function') cursor = cursor.skip(skip);
      if (cursor && typeof cursor.limit === 'function') cursor = cursor.limit(limit);
      if (cursor && typeof cursor.lean === 'function') plans = await cursor.lean();
      else if (cursor && typeof cursor.exec === 'function') plans = await cursor.exec();
      else if (Array.isArray(cursor)) plans = cursor;
      else if (cursor && typeof cursor.then === 'function') plans = await cursor;
    } catch (err) {
      logger.warn && logger.warn(`[care-plan] listPlans query failed: ${err.message}`);
      return { plans: [], total: 0, page, limit, hasMore: false, error: err.message };
    }

    return {
      plans: Array.isArray(plans) ? plans : [],
      total,
      page,
      limit,
      hasMore: total > skip + (plans?.length || 0),
    };
  }

  async function getVersionHistory(planId) {
    if (typeof planVersionModel.find !== 'function') return [];
    const q = planVersionModel.find({ planId });
    // Support both real Mongoose and the lightweight test mock
    if (q && typeof q.sort === 'function') {
      const sorted = q.sort({ versionNumber: -1 });
      if (sorted && typeof sorted.lean === 'function') return sorted.lean();
      if (typeof sorted.exec === 'function') return sorted.exec();
      return sorted;
    }
    return q;
  }

  // ─── setFamilyVersion ────────────────────────────────────────
  // Stores a generated family-friendly body on an approved plan version
  // (after redaction guardrails have been checked at the route level).

  async function setFamilyVersion({ planVersionId, actor, body, readabilityGrade = null }) {
    const actorErr = _ensureActor(actor);
    if (actorErr) return actorErr;

    const pv = await planVersionModel.findById(planVersionId);
    if (!pv) return fail(REASON.PLAN_NOT_FOUND);

    const isApproved = [
      reg.STATUSES.APPROVED,
      reg.STATUSES.SAVED_TO_RECORD,
      reg.STATUSES.FAMILY_NOTIFICATION_SENT,
    ].includes(pv.status);
    if (!isApproved) {
      return fail(REASON.IS_TERMINAL, {
        detail: 'family version may only be set on approved versions',
        status: pv.status,
      });
    }
    if (readabilityGrade != null && readabilityGrade > reg.FAMILY_REDACTION.MAX_GRADE_LEVEL) {
      return fail('FAMILY_READABILITY_TOO_HIGH', {
        readabilityGrade,
        maxGrade: reg.FAMILY_REDACTION.MAX_GRADE_LEVEL,
      });
    }

    pv.familyVersion = {
      body,
      readabilityGrade,
      generatedAt: now(),
    };
    await pv.save();

    await _audit('care-plan.family-version.set', actor, {
      planVersionId: pv._id,
      readabilityGrade,
    });
    return success({ planVersion: pv });
  }

  // Resolve computeSignatureHash: explicit option > model static > undefined.
  // Exposed on the service so audit-trail routes can pass it to the
  // integrity verifier without coupling to the model layer.
  const exposedComputeSignatureHash =
    computeSignatureHash ||
    (planVersionModel && typeof planVersionModel.computeSignatureHash === 'function'
      ? planVersionModel.computeSignatureHash
      : undefined);

  return Object.freeze({
    createDraft,
    updateDraft,
    runValidation,
    transition,
    reject,
    recordReviewScorecard,
    createNewVersion,
    applyAmendment,
    computeDiff,
    getPlanVersionById,
    getVersionHistory,
    setFamilyVersion,
    listPlans,
    computeSignatureHash: exposedComputeSignatureHash,
    REASON,
  });
}

module.exports = {
  createCarePlanService,
  REASON,
};
