'use strict';

/**
 * beneficiary-lifecycle.service.js — Wave 39 (Beneficiary 360 Phase 1).
 *
 * Workflow orchestration for beneficiary lifecycle transitions. Each
 * transition is a multi-stage workflow with collected approvals:
 *
 *   requestTransition()  → status: pending  (audit row + side-effects deferred)
 *   approveTransition()  → status: pending | approved | rejected
 *   executeTransition()  → status: approved → executed (side-effects run)
 *   cancelTransition()   → status: cancelled
 *   reverseTransition()  → status: reversed (within reversal window)
 *
 * The service is the CHOKEPOINT — no caller should mutate
 * Beneficiary.status directly. Always go through requestTransition().
 *
 * Side-effects are dispatched to INJECTED callbacks
 * (`sideEffectHandlers`). The service does not know what
 * "pause-schedule" or "create-care-team" means; it just looks up the
 * handler by name and calls it. Wave 40 will wire real handlers.
 *
 * The service is otherwise PURE — no global state, no module-level
 * mongoose imports. Mongoose models are injected for testability.
 */

const reg = require('./beneficiary-lifecycle.registry');

const REASON = Object.freeze({
  UNKNOWN_TRANSITION: 'UNKNOWN_TRANSITION',
  INVALID_FROM_STATE: 'INVALID_FROM_STATE',
  REASON_REQUIRED: 'REASON_REQUIRED',
  INVALID_REASON_CODE: 'INVALID_REASON_CODE',
  BENEFICIARY_NOT_FOUND: 'BENEFICIARY_NOT_FOUND',
  TRANSITION_NOT_FOUND: 'TRANSITION_NOT_FOUND',
  ALREADY_FINAL: 'ALREADY_FINAL',
  NOT_APPROVED: 'NOT_APPROVED',
  ALREADY_EXECUTED: 'ALREADY_EXECUTED',
  REVERSAL_WINDOW_EXPIRED: 'REVERSAL_WINDOW_EXPIRED',
  NOT_REVERSIBLE: 'NOT_REVERSIBLE',
  SELF_APPROVAL: 'SELF_APPROVAL',
  DUPLICATE_APPROVAL: 'DUPLICATE_APPROVAL',
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  NAFATH_REQUIRED: 'NAFATH_REQUIRED',
  // Wave 86 — backend-side MFA tier enforcement
  MFA_TIER_REQUIRED: 'MFA_TIER_REQUIRED',
  MFA_FRESHNESS_REQUIRED: 'MFA_FRESHNESS_REQUIRED',
});

// Wave 86 — MFA freshness window per tier (minutes). Tier 3
// (privileged) must be re-asserted every 5 min; tier 2 every 15.
// Tier 1 has no enforced freshness (it's the baseline session
// auth — covered by JWT TTL, not by MFA challenge).
//
// Wave 90 — values now come from sensitivity-grade.lib so the security
// baseline lives in one place. Local map kept as a derived index so
// the lookup-by-tier shape (used by checkMfaTier below) stays the same.
const sensitivityGrade = require('./sensitivity-grade.lib');
const evidenceSnapshot = require('./evidence-snapshot.lib');
// Wave 596 — actionable summary reducer over the dispatched side-effect
// results. Pure + total; used to enrich the execute audit and return.
const {
  summarizeSideEffectResults,
} = require('./beneficiary-lifecycle-side-effects.service');
const MFA_FRESHNESS_MIN = Object.freeze({
  2: Math.round(sensitivityGrade.SENSITIVITY_GRADES.HIGH.mfaFreshnessMs / 60_000),
  3: Math.round(sensitivityGrade.SENSITIVITY_GRADES.CRITICAL.mfaFreshnessMs / 60_000),
});

// Wave 91 — fields captured in the subject snapshot for lifecycle
// transitions. These are the fields a reasonable auditor would expect
// to see when re-creating "what did the approver know at decision time?"
// for any HIGH/CRITICAL transition (transfer-branch, archive, deletion).
//
// Kept narrow on purpose — PHI is NOT captured (no diagnoses, no
// clinical notes); the snapshot only proves identity + administrative
// state. Clinical evidence lives in CarePlanVersion.evidenceHash which
// is its own per-version snapshot.
const LIFECYCLE_SUBJECT_FIELDS = Object.freeze([
  'status',
  'branchId',
  'name',
  'primaryGuardianId',
  'dateOfBirth',
  'updatedAt',
]);
const LIFECYCLE_SUBJECT_DATA_KINDS = Object.freeze(['beneficiary-identity', 'beneficiary-admin']);

const FINAL_STATES = new Set([
  reg.LIFECYCLE_STATES.DELETED,
  // 'transferred' is also final at the source branch but the destination
  // sees the record as active — not blocked at the source-side service
  // because cross-branch operations are coordinated separately.
]);

/**
 * Wave 86 — backend-side MFA tier enforcement (closes critical-review
 * blocker B3 "UI gating = security theater").
 *
 * Returns { ok: true } when the actor's mfaLevel + mfaAssertedAt are
 * sufficient for the transition. Returns { ok: false, reason } when
 * not — caller propagates the rejection.
 *
 * The check is OPT-IN per call site:
 *   • When enforceMfa flag is false (default in tests + old callers),
 *     the guard short-circuits to { ok: true }. This keeps backward
 *     compat — existing tests that don't simulate MFA state still pass.
 *   • Real production routes pass enforceMfa=true after wiring the
 *     Wave-86 loadMfaActor middleware to populate actor.mfaLevel.
 *
 * Calling code looks like:
 *   const mfaCheck = checkMfaTier({ transitionId: t.id, actor, now,
 *                                   enforceMfa: true });
 *   if (!mfaCheck.ok) return mfaCheck;
 */
function checkMfaTier({ transitionId, actor = {}, now = new Date(), enforceMfa = false }) {
  if (!enforceMfa) return { ok: true };
  const requiredTier = reg.getMfaTier(transitionId);
  if (!requiredTier || requiredTier <= 1) return { ok: true };
  const actorLevel = typeof actor.mfaLevel === 'number' ? actor.mfaLevel : 0;
  if (actorLevel < requiredTier) {
    return {
      ok: false,
      reason: REASON.MFA_TIER_REQUIRED,
      requiredTier,
      actorTier: actorLevel,
    };
  }
  const freshnessMin = MFA_FRESHNESS_MIN[requiredTier];
  if (freshnessMin && actor.mfaAssertedAt) {
    const ageMin = (new Date(now).getTime() - new Date(actor.mfaAssertedAt).getTime()) / 60_000;
    if (ageMin > freshnessMin) {
      return {
        ok: false,
        reason: REASON.MFA_FRESHNESS_REQUIRED,
        requiredTier,
        maxAgeMin: freshnessMin,
        ageMin: Math.round(ageMin),
      };
    }
  } else if (freshnessMin && !actor.mfaAssertedAt) {
    // Strict: tier ≥2 requires an explicit assertion timestamp.
    return {
      ok: false,
      reason: REASON.MFA_FRESHNESS_REQUIRED,
      requiredTier,
      maxAgeMin: freshnessMin,
    };
  }
  return { ok: true };
}

const FINAL_STATUSES = new Set([
  reg.TRANSITION_STATUS.EXECUTED,
  reg.TRANSITION_STATUS.REJECTED,
  reg.TRANSITION_STATUS.CANCELLED,
  reg.TRANSITION_STATUS.REVERSED,
  reg.TRANSITION_STATUS.FAILED,
]);

/**
 * @param {object} opts
 *   - beneficiaryModel        — Mongoose model for Beneficiary
 *   - transitionLog           — Mongoose model for BeneficiaryLifecycleTransition
 *   - sideEffectHandlers      — Map<sideEffectName, async fn(ctx)>
 *   - notifier                — async fn({ event, payload, actor })
 *   - auditLogger             — { log({ action, ... }) } from Wave 26
 *   - anchorLedger            — { commit({ payload, type }) → txId } (Wave 17)
 *   - logger                  — console-compatible
 *   - now                     — clock injection
 */
function createBeneficiaryLifecycleService({
  beneficiaryModel = null,
  transitionLog = null,
  sideEffectHandlers = {},
  notifier = null,
  auditLogger = null,
  anchorLedger = null,
  logger = console,
  now = () => new Date(),
  // Wave 86 — backend MFA-tier enforcement. Off by default for
  // backward compat (Wave 39 tests construct the service without
  // MFA wiring); production callers (app.js) flip it on.
  enforceMfa = false,
} = {}) {
  if (!transitionLog) {
    throw new Error('beneficiary-lifecycle.service: transitionLog model is required');
  }

  async function _audit(action, actor, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: actor?.userId || null,
        actorRole: actor?.role || null,
        entityType: 'BeneficiaryLifecycleTransition',
        entityId: metadata?.transitionRecordId || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[lifecycle] audit ${action} failed: ${err.message}`);
    }
  }

  // ─── requestTransition ──────────────────────────────────────

  /**
   * Open a transition workflow. Returns a `pending` record OR an
   * `executed` record if the transition required zero approvers
   * (none exist today, but the shape allows it).
   *
   * Returns: { ok, transitionRecord, reason? }
   */
  async function requestTransition({
    beneficiaryId,
    branchId,
    destinationBranchId = null,
    transitionId,
    actor,
    reason = null,
    reasonCode = null,
    evidenceLinks = [],
    correlationId = null,
    metadata = {},
  } = {}) {
    if (!actor || !actor.userId) {
      return { ok: false, reason: REASON.ACTOR_REQUIRED };
    }
    const t = reg.findTransition(transitionId);
    if (!t) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };

    // Wave 86 — MFA tier gate at REQUEST time. Cheaper to fail
    // here than to write a pending record only to fail on
    // approve/execute later.
    const mfaCheck = checkMfaTier({ transitionId, actor, now: now(), enforceMfa });
    if (!mfaCheck.ok) return mfaCheck;

    // Look up current state. If no beneficiaryModel injected (tests),
    // caller must pass `metadata.currentState` so we can validate.
    // Wave 91 — also fetch the wider field set when the grade requires
    // a subject snapshot (HIGH/CRITICAL); cheaper than re-fetching.
    const grade = sensitivityGrade.gradeForLifecycleTransition(t);
    const needsSnapshot = grade.requiresLedgerAnchor;

    let currentState = metadata.currentState || null;
    let snapshotSource = metadata.subjectForSnapshot || null;
    if ((!currentState || (needsSnapshot && !snapshotSource)) && beneficiaryModel) {
      try {
        const projection = needsSnapshot
          ? `status branchId name primaryGuardianId dateOfBirth updatedAt`
          : 'status branchId';
        const b = await beneficiaryModel.findById(beneficiaryId).select(projection).lean();
        if (!b) return { ok: false, reason: REASON.BENEFICIARY_NOT_FOUND };
        if (!currentState) currentState = b.status;
        if (needsSnapshot && !snapshotSource) snapshotSource = b;
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] beneficiary lookup failed: ${err.message}`);
      }
    }
    if (!currentState) {
      return { ok: false, reason: REASON.BENEFICIARY_NOT_FOUND };
    }
    if (FINAL_STATES.has(currentState)) {
      return { ok: false, reason: REASON.ALREADY_FINAL };
    }

    const validity = reg.validateTransitionRequest({
      fromState: currentState,
      transitionId,
    });
    if (!validity.valid) {
      return { ok: false, reason: validity.reason, allowed: validity.allowed };
    }

    if (t.requiresReason && !reason && !reasonCode) {
      return { ok: false, reason: REASON.REASON_REQUIRED };
    }
    if (reasonCode && !reg.isValidReasonCode(transitionId, reasonCode)) {
      return { ok: false, reason: REASON.INVALID_REASON_CODE };
    }

    // Wave 91 — capture a tamper-evident snapshot for HIGH/CRITICAL
    // transitions. Falls back gracefully when no beneficiaryModel +
    // no snapshotSource (test contexts that pass currentState directly
    // but don't supply the rest of the record); in that case the
    // snapshot is omitted rather than synthesising an empty record.
    let subjectSnapshot = null;
    if (needsSnapshot && snapshotSource) {
      try {
        subjectSnapshot = evidenceSnapshot.captureSnapshot({
          entity: snapshotSource,
          dataKinds: LIFECYCLE_SUBJECT_DATA_KINDS,
          fields: LIFECYCLE_SUBJECT_FIELDS,
          takenAt: now(),
        });
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] snapshot capture failed: ${err.message}`);
      }
    }

    const record = await transitionLog.create({
      beneficiaryId,
      sourceBranchId: branchId,
      destinationBranchId,
      transitionId,
      fromState: currentState,
      toState: t.to,
      requestedBy: actor.userId,
      requestedAt: now(),
      approvals: [],
      reason,
      reasonCode,
      evidenceLinks,
      status: reg.TRANSITION_STATUS.PENDING,
      correlationId,
      subjectSnapshot,
      metadata,
    });

    await _audit('beneficiary.lifecycle.transition.requested', actor, {
      transitionRecordId: record._id,
      transitionId,
      beneficiaryId,
      fromState: currentState,
      toState: t.to,
    });

    return { ok: true, transitionRecord: record };
  }

  // ─── approveTransition ──────────────────────────────────────

  /**
   * Collect an approval signature. If all required approvers have
   * approved, status flips to `approved`. If any approver rejects,
   * status becomes `rejected` and the workflow is closed.
   */
  async function approveTransition({
    transitionRecordId,
    actor,
    approverRole,
    decision = 'approve',
    nafathSignatureId = null,
    comment = null,
  } = {}) {
    if (!actor || !actor.userId) {
      return { ok: false, reason: REASON.ACTOR_REQUIRED };
    }
    const record = await transitionLog.findById(transitionRecordId);
    if (!record) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };
    if (FINAL_STATUSES.has(record.status)) {
      return { ok: false, reason: REASON.ALREADY_EXECUTED, status: record.status };
    }

    const t = reg.findTransition(record.transitionId);
    if (!t) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };

    // Wave 86 — MFA tier gate on approval. The approver, not the
    // requester, must hold a valid tier. Defense in depth: even if
    // the UI's MfaChallengeDialog (Waves 67/73) was bypassed, the
    // backend rejects here.
    const mfaCheck = checkMfaTier({
      transitionId: record.transitionId,
      actor,
      now: now(),
      enforceMfa,
    });
    if (!mfaCheck.ok) return mfaCheck;

    // Self-approval guard
    if (String(actor.userId) === String(record.requestedBy)) {
      return { ok: false, reason: REASON.SELF_APPROVAL };
    }
    // Duplicate-approval guard (same role + same userId already signed)
    const alreadySigned = (record.approvals || []).some(
      a => String(a.approverUserId) === String(actor.userId) && a.approverRole === approverRole
    );
    if (alreadySigned) {
      return { ok: false, reason: REASON.DUPLICATE_APPROVAL };
    }

    if (t.requiresNafath && decision === 'approve' && !nafathSignatureId) {
      return { ok: false, reason: REASON.NAFATH_REQUIRED };
    }

    record.approvals.push({
      approverUserId: actor.userId,
      approverRole,
      decision,
      signedAt: now(),
      nafathSignatureId,
      comment,
    });

    // If rejected, close the workflow now
    if (decision === 'reject') {
      record.status = reg.TRANSITION_STATUS.REJECTED;
      await record.save();
      await _audit('beneficiary.lifecycle.transition.rejected', actor, {
        transitionRecordId: record._id,
        transitionId: record.transitionId,
      });
      return { ok: true, transitionRecord: record, statusChanged: true };
    }

    // Check if all required approvers have approved
    const approvedRoles = new Set(
      record.approvals.filter(a => a.decision === 'approve').map(a => a.approverRole)
    );
    const allApproved = t.requiredApproverRoles.every(r => approvedRoles.has(r));
    let statusChanged = false;
    if (allApproved) {
      record.status = reg.TRANSITION_STATUS.APPROVED;
      statusChanged = true;
    }

    await record.save();

    await _audit('beneficiary.lifecycle.transition.approved', actor, {
      transitionRecordId: record._id,
      transitionId: record.transitionId,
      collectedRoles: Array.from(approvedRoles),
      stillMissing: t.requiredApproverRoles.filter(r => !approvedRoles.has(r)),
      allApproved,
    });

    return { ok: true, transitionRecord: record, statusChanged };
  }

  // ─── executeTransition ──────────────────────────────────────

  /**
   * Run side-effects, flip beneficiary.status, anchor on the ledger
   * (for HIGH-sensitivity), notify stakeholders.
   *
   * Idempotent — calling twice on an already-executed record returns
   * the existing result.
   */
  async function executeTransition({ transitionRecordId, actor } = {}) {
    if (!actor || !actor.userId) {
      return { ok: false, reason: REASON.ACTOR_REQUIRED };
    }
    const record = await transitionLog.findById(transitionRecordId);
    if (!record) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };
    if (record.status === reg.TRANSITION_STATUS.EXECUTED) {
      return { ok: true, transitionRecord: record, idempotent: true };
    }
    if (record.status !== reg.TRANSITION_STATUS.APPROVED) {
      return { ok: false, reason: REASON.NOT_APPROVED, status: record.status };
    }

    // Wave 86 — MFA tier gate on execute. Execution is when the
    // side-effects fire (notify family, freeze record, mark
    // discharged, etc.) — any tier-3 transition must re-assert
    // freshness even after approval.
    const mfaCheck = checkMfaTier({
      transitionId: record.transitionId,
      actor,
      now: now(),
      enforceMfa,
    });
    if (!mfaCheck.ok) return mfaCheck;

    const t = reg.findTransition(record.transitionId);

    // Dispatch side-effects
    const sideEffectsAudit = [];
    for (const op of t.sideEffects) {
      const handler = sideEffectHandlers[op];
      if (!handler) {
        sideEffectsAudit.push({
          operation: op,
          status: 'skipped',
          completedAt: now(),
          metadata: { reason: 'no handler wired' },
        });
        continue;
      }
      try {
        const result = await handler({
          beneficiaryId: record.beneficiaryId,
          sourceBranchId: record.sourceBranchId,
          destinationBranchId: record.destinationBranchId,
          transitionId: record.transitionId,
          fromState: record.fromState,
          toState: record.toState,
          correlationId: record.correlationId,
          metadata: record.metadata,
          actor,
        });
        // Wave 587 — a real-data handler self-skips (returns `skipped:true`)
        // when its backing model is not injected in the running process. The
        // transition itself is fine, so status stays 'ok', but this is an
        // OPS misconfiguration the operator must notice — otherwise a critical
        // effect (e.g. cancelling a deceased beneficiary's future appointments)
        // silently does nothing while the audit shows sideEffectsFailed:0. Tag
        // the row + emit a warning so it surfaces in logs and the summary.
        const selfSkipped = Boolean(result && result.skipped);
        if (selfSkipped) {
          logger.warn &&
            logger.warn(
              `[lifecycle] side-effect ${op} self-skipped: ${result.reason || 'unknown reason'}`
            );
        }
        sideEffectsAudit.push({
          operation: op,
          status: 'ok',
          selfSkipped,
          completedAt: now(),
          metadata: result || null,
        });
      } catch (err) {
        sideEffectsAudit.push({
          operation: op,
          status: 'failed',
          completedAt: now(),
          error: err.message,
        });
        logger.warn && logger.warn(`[lifecycle] side-effect ${op} failed: ${err.message}`);
      }
    }

    // Flip beneficiary status (if model wired)
    if (beneficiaryModel) {
      try {
        await beneficiaryModel.updateOne(
          { _id: record.beneficiaryId },
          { $set: { status: record.toState, lastLifecycleAt: now() } }
        );
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] beneficiary update failed: ${err.message}`);
      }
    }

    // Anchor on the ledger for HIGH-sensitivity transitions
    let anchorTxId = null;
    if (
      reg.isHighSensitivity(record.transitionId) &&
      anchorLedger &&
      typeof anchorLedger.commit === 'function'
    ) {
      try {
        const payload = {
          recordId: String(record._id),
          beneficiaryId: String(record.beneficiaryId),
          transitionId: record.transitionId,
          fromState: record.fromState,
          toState: record.toState,
          executedAt: now().toISOString(),
        };
        const res = await anchorLedger.commit({
          payload,
          type: 'beneficiary.lifecycle',
        });
        anchorTxId = res?.txId || null;
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] anchor commit failed: ${err.message}`);
      }
    }

    record.status = reg.TRANSITION_STATUS.EXECUTED;
    record.executedAt = now();
    record.sideEffectsAudit = sideEffectsAudit;
    if (anchorTxId) record.anchorTxId = anchorTxId;
    await record.save();

    // Notify
    if (notifier && typeof notifier === 'function') {
      try {
        await notifier({
          event: 'beneficiary.lifecycle.executed',
          payload: {
            transitionRecordId: record._id,
            transitionId: record.transitionId,
            beneficiaryId: record.beneficiaryId,
            fromState: record.fromState,
            toState: record.toState,
          },
          actor,
        });
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] notifier failed: ${err.message}`);
      }
    }

    // Wave 596 — derive an actionable summary from the dispatched rows.
    // Each ok row carries the handler result in `metadata`; flatten so the
    // pure reducer can bucket categories and total the real data mutations.
    const sideEffectsSummary = summarizeSideEffectResults(
      sideEffectsAudit.map(s => ({
        ...(s.metadata && typeof s.metadata === 'object' ? s.metadata : {}),
        status: s.status,
      }))
    );

    await _audit('beneficiary.lifecycle.transition.executed', actor, {
      transitionRecordId: record._id,
      transitionId: record.transitionId,
      sideEffectsCount: sideEffectsAudit.length,
      sideEffectsFailed: sideEffectsAudit.filter(s => s.status === 'failed').length,
      sideEffectsSelfSkipped: sideEffectsAudit.filter(s => s.selfSkipped).length,
      sideEffectsSummary,
      anchorTxId,
    });

    return { ok: true, transitionRecord: record, sideEffectsAudit, sideEffectsSummary };
  }

  // ─── cancelTransition ──────────────────────────────────────

  async function cancelTransition({ transitionRecordId, actor, reason = null } = {}) {
    if (!actor || !actor.userId) {
      return { ok: false, reason: REASON.ACTOR_REQUIRED };
    }
    const record = await transitionLog.findById(transitionRecordId);
    if (!record) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };
    if (FINAL_STATUSES.has(record.status)) {
      return { ok: false, reason: REASON.ALREADY_EXECUTED, status: record.status };
    }
    record.status = reg.TRANSITION_STATUS.CANCELLED;
    record.cancelledAt = now();
    if (reason) {
      record.metadata = { ...(record.metadata || {}), cancellationReason: reason };
    }
    await record.save();

    await _audit('beneficiary.lifecycle.transition.cancelled', actor, {
      transitionRecordId: record._id,
      transitionId: record.transitionId,
      reason,
    });

    return { ok: true, transitionRecord: record };
  }

  // ─── reverseTransition ──────────────────────────────────────

  async function reverseTransition({ transitionRecordId, actor, reason = null } = {}) {
    if (!actor || !actor.userId) {
      return { ok: false, reason: REASON.ACTOR_REQUIRED };
    }
    const record = await transitionLog.findById(transitionRecordId);
    if (!record) return { ok: false, reason: REASON.TRANSITION_NOT_FOUND };
    if (record.status !== reg.TRANSITION_STATUS.EXECUTED) {
      return { ok: false, reason: REASON.NOT_APPROVED, status: record.status };
    }

    // Wave 86 — MFA tier gate on reverse. Reversal undoes side-
    // effects + restores prior state; treated with the same tier
    // as the original transition.
    const mfaCheck = checkMfaTier({
      transitionId: record.transitionId,
      actor,
      now: now(),
      enforceMfa,
    });
    if (!mfaCheck.ok) return mfaCheck;

    const t = reg.findTransition(record.transitionId);
    if (!t.reversalWindowDays) {
      return { ok: false, reason: REASON.NOT_REVERSIBLE };
    }
    const ageDays = (now() - record.executedAt) / (24 * 60 * 60 * 1000);
    if (ageDays > t.reversalWindowDays) {
      return { ok: false, reason: REASON.REVERSAL_WINDOW_EXPIRED, ageDays };
    }

    record.status = reg.TRANSITION_STATUS.REVERSED;
    record.reversedAt = now();
    if (reason) {
      record.metadata = { ...(record.metadata || {}), reversalReason: reason };
    }
    await record.save();

    // Flip beneficiary status back
    if (beneficiaryModel) {
      try {
        await beneficiaryModel.updateOne(
          { _id: record.beneficiaryId },
          { $set: { status: record.fromState, lastLifecycleAt: now() } }
        );
      } catch (err) {
        logger.warn && logger.warn(`[lifecycle] reversal status update failed: ${err.message}`);
      }
    }

    await _audit('beneficiary.lifecycle.transition.reversed', actor, {
      transitionRecordId: record._id,
      transitionId: record.transitionId,
      reason,
    });

    return { ok: true, transitionRecord: record };
  }

  // ─── Read helpers ──────────────────────────────────────────

  function getAllowedTransitionsFor({ currentState }) {
    return reg.getAllowedTransitionsFrom(currentState);
  }

  async function getTransitionHistory(beneficiaryId) {
    if (!beneficiaryId) return [];
    const docs = await transitionLog.find({ beneficiaryId }).sort({ requestedAt: -1 }).lean();
    return docs;
  }

  return {
    requestTransition,
    approveTransition,
    executeTransition,
    cancelTransition,
    reverseTransition,
    getAllowedTransitionsFor,
    getTransitionHistory,
    REASON,
  };
}

module.exports = {
  createBeneficiaryLifecycleService,
  REASON,
};
