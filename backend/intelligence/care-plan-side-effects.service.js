'use strict';

/**
 * care-plan-side-effects.service.js — Wave 45.
 *
 * Factory for the named side-effect handlers consumed by the Wave-41
 * care-plan service. Each handler maps to one transition and produces
 * the real-world effect:
 *
 *   care-plan.approve           → audit + optional anchor
 *   care-plan.reject            → notify author with structured fixes
 *   care-plan.escalate          → notify branch_manager
 *   care-plan.save_to_record    → write into BeneficiaryFile.plans[]
 *   care-plan.notify_family     → dispatch via unifiedNotifier (with retry log)
 *   care-plan.supersede         → ensure prev-version pointer + audit
 *
 * Everything is dependency-injected. The factory never imports
 * production wiring directly — the app.js (Wave-46 work) supplies:
 *
 *   • notifier(payload)                  — unifiedNotifier-shaped
 *   • beneficiaryFileModel               — Mongoose model (optional)
 *   • familyChannelClient                — for actual SMS / email send
 *   • auditLogger.log({...})             — Wave-26 audit
 *   • now()                              — clock (defaults to Date)
 *   • logger                             — console-compatible
 *
 * Reliability guarantees (spec §16):
 *   • dedupeKey on every notification: `${event}.${planVersionId}`
 *   • family notify retries: 5m / 30m / 3h backoff (computed offsets,
 *     not actual setTimeout — caller schedules through its job queue)
 *   • errors in handlers DO NOT bubble — the transition has already
 *     committed; handlers log + return a status object
 */

const reg = require('./care-planning.registry');

const HANDLER_NAMES = Object.freeze({
  APPROVE: 'care-plan.approve',
  REJECT: 'care-plan.reject',
  ESCALATE: 'care-plan.escalate',
  SAVE_TO_RECORD: 'care-plan.save_to_record',
  NOTIFY_FAMILY: 'care-plan.notify_family',
  SUPERSEDE: 'care-plan.supersede',
});

const RETRY_BACKOFF_MS = Object.freeze([5 * 60_000, 30 * 60_000, 3 * 60 * 60_000]);

function dedupeKey(event, planVersionId) {
  return `${event}.${planVersionId}`;
}

function clampMessage(s, max = 1000) {
  if (typeof s !== 'string') return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * @param {object} deps
 *   - notifier               { send: async ({event, audience, payload, dedupeKey}) }
 *   - beneficiaryFileModel   Mongoose-like model with findOneAndUpdate
 *   - familyChannelClient    { dispatch: async ({channel, recipient, body}) }
 *   - auditLogger            { log({action, ...}) }
 *   - resolveAudienceForRole async (role, branchId) → recipients[]
 *   - now                    () → Date
 *   - logger                 console-compatible
 *
 * @returns {object} handlers map (key: handler name → async fn)
 */
function createCarePlanSideEffectHandlers({
  notifier = null,
  beneficiaryFileModel = null,
  familyChannelClient = null,
  auditLogger = null,
  resolveAudienceForRole = null,
  now = () => new Date(),
  logger = console,
  metrics = null,
} = {}) {
  // W1258 — handlers are doc-agnostic and (since W1254) receive UnifiedCarePlan
  // docs through the family-retry worker; the audit label must stay faithful.
  // Legacy docs carry versionNumber; unified docs carry planNumber/version.
  function entityTypeOf(planVersion) {
    if (!planVersion || typeof planVersion !== 'object') return 'CarePlanVersion';
    if (planVersion.versionNumber != null) return 'CarePlanVersion';
    if (planVersion.planNumber != null || planVersion.version != null) return 'UnifiedCarePlan';
    return 'CarePlanVersion';
  }

  async function _audit(action, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: metadata?.actor?.userId || null,
        actorRole: metadata?.actor?.role || null,
        entityType: metadata?.entityType || 'CarePlanVersion', // W1258
        entityId: metadata?.planVersionId || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[side-effects] audit ${action} failed: ${err.message}`);
    }
  }

  async function _notify(event, audience, payload, planVersionId) {
    if (!notifier || typeof notifier.send !== 'function')
      return { ok: false, reason: 'no_notifier' };
    try {
      await notifier.send({
        event,
        audience,
        payload,
        dedupeKey: dedupeKey(event, planVersionId),
      });
      return { ok: true };
    } catch (err) {
      logger.warn && logger.warn(`[side-effects] notify ${event} failed: ${err.message}`);
      return { ok: false, reason: 'notify_failed', error: err.message };
    }
  }

  async function _resolveAudience(role, branchId) {
    if (typeof resolveAudienceForRole !== 'function') return [];
    try {
      const audience = await resolveAudienceForRole(role, branchId);
      return Array.isArray(audience) ? audience : [];
    } catch (err) {
      logger.warn && logger.warn(`[side-effects] audience resolve failed: ${err.message}`);
      return [];
    }
  }

  // ─── care-plan.approve ────────────────────────────────────────

  async function onApprove({ planVersion, actor }) {
    const planVersionId = String(planVersion?._id || '');
    const branchId = String(planVersion?.branchId || '');
    const audience = await _resolveAudience('therapist', branchId);

    await _audit('care-plan.approve.side-effect', {
      planVersionId,
      planId: planVersion?.planId,
      versionNumber: planVersion?.versionNumber,
      evidenceHash: planVersion?.evidenceHash,
      actor,
    });

    await _notify(
      'care-plan.approved',
      audience,
      {
        planId: planVersion?.planId,
        planVersionId,
        versionNumber: planVersion?.versionNumber,
        approvedAt: planVersion?.approvedAt,
      },
      planVersionId
    );

    return { ok: true, name: HANDLER_NAMES.APPROVE };
  }

  // ─── care-plan.reject ─────────────────────────────────────────

  async function onReject({ planVersion, actor }) {
    const planVersionId = String(planVersion?._id || '');
    const authorAudience = planVersion?.authorId
      ? [{ userId: String(planVersion.authorId), channel: 'inbox' }]
      : [];

    await _audit('care-plan.reject.side-effect', {
      planVersionId,
      planId: planVersion?.planId,
      rejectionCount: planVersion?.rejectionCount,
      primaryReason: planVersion?.rejection?.primaryReason,
      actor,
    });

    const branchAudience = await _resolveAudience(
      'branch_manager',
      String(planVersion?.branchId || '')
    );

    await _notify(
      'care-plan.rejected',
      authorAudience,
      {
        planVersionId,
        planId: planVersion?.planId,
        rejection: planVersion?.rejection || null,
        rejectionCount: planVersion?.rejectionCount || 0,
      },
      planVersionId
    );

    // After ≥ threshold rejections, also notify branch manager
    if (planVersion?.rejectionCount >= reg.NOTIFICATION_SLA.REPEATED_REJECTION_THRESHOLD) {
      await _notify(
        'care-plan.rejected.repeated',
        branchAudience,
        {
          planVersionId,
          planId: planVersion?.planId,
          rejectionCount: planVersion?.rejectionCount,
        },
        planVersionId
      );
    }

    return { ok: true, name: HANDLER_NAMES.REJECT };
  }

  // ─── care-plan.escalate ───────────────────────────────────────

  async function onEscalate({ planVersion, actor }) {
    const planVersionId = String(planVersion?._id || '');
    const branchAudience = await _resolveAudience(
      'branch_manager',
      String(planVersion?.branchId || '')
    );

    await _audit('care-plan.escalate.side-effect', {
      planVersionId,
      planId: planVersion?.planId,
      planType: planVersion?.planType,
      actor,
    });

    await _notify(
      'care-plan.escalated',
      branchAudience,
      {
        planVersionId,
        planId: planVersion?.planId,
        planType: planVersion?.planType,
        reviewScore: planVersion?.reviewScorecard?.overall,
        rejectionCount: planVersion?.rejectionCount || 0,
      },
      planVersionId
    );

    return { ok: true, name: HANDLER_NAMES.ESCALATE };
  }

  // ─── care-plan.save_to_record ─────────────────────────────────
  // Writes the approved version into BeneficiaryFile.plans[] (append-only).
  // If the model isn't wired (e.g. test environment), it logs and returns.

  async function onSaveToRecord({ planVersion, actor }) {
    const planVersionId = String(planVersion?._id || '');

    if (!beneficiaryFileModel || typeof beneficiaryFileModel.findOneAndUpdate !== 'function') {
      logger.warn &&
        logger.warn('[side-effects] save_to_record skipped: beneficiaryFileModel not wired');
      await _audit('care-plan.save_to_record.side-effect.skipped', {
        planVersionId,
        reason: 'beneficiary_file_model_not_wired',
      });
      return { ok: false, name: HANDLER_NAMES.SAVE_TO_RECORD, reason: 'no_file_model' };
    }

    try {
      await beneficiaryFileModel.findOneAndUpdate(
        { beneficiaryId: planVersion.beneficiaryId },
        {
          $push: {
            plans: {
              planVersionId,
              planId: planVersion.planId,
              versionNumber: planVersion.versionNumber,
              approvedAt: planVersion.approvedAt,
              savedAt: now(),
              evidenceHash: planVersion.evidenceHash,
              lockState: 'locked',
            },
          },
          $set: { lastPlanFiledAt: now() },
        },
        { upsert: true, returnDocument: 'after' }
      );
    } catch (err) {
      logger.warn && logger.warn(`[side-effects] save_to_record failed: ${err.message}`);
      await _audit('care-plan.save_to_record.side-effect.failed', {
        planVersionId,
        error: err.message,
      });
      return { ok: false, name: HANDLER_NAMES.SAVE_TO_RECORD, reason: 'write_failed' };
    }

    await _audit('care-plan.save_to_record.side-effect', {
      planVersionId,
      planId: planVersion?.planId,
      versionNumber: planVersion?.versionNumber,
      beneficiaryId: String(planVersion?.beneficiaryId || ''),
      actor,
    });

    return { ok: true, name: HANDLER_NAMES.SAVE_TO_RECORD };
  }

  // ─── care-plan.notify_family ──────────────────────────────────
  // Dispatches the family-friendly markdown via familyChannelClient.
  // Attaches a familyNotification log entry. Failed dispatch produces
  // a retry-pending entry; the caller (Wave-46 job worker) will pick
  // it up via the backoff offsets returned.

  function computeRetrySchedule(attempt) {
    if (attempt < 0 || attempt >= RETRY_BACKOFF_MS.length) return null;
    return {
      attempt,
      nextAttemptAtOffsetMs: RETRY_BACKOFF_MS[attempt],
    };
  }

  async function onNotifyFamily({ planVersion, actor: _actor, metadata }) {
    const planVersionId = String(planVersion?._id || '');
    const channel = metadata?.channel || 'manual';
    const recipient = clampMessage(metadata?.recipient, 500) || null;
    const body = planVersion?.familyVersion?.body || null;

    if (!body) {
      await _audit('care-plan.notify_family.side-effect.skipped', {
        planVersionId,
        entityType: entityTypeOf(planVersion), // W1258
        reason: 'no_family_body',
      });
      return { ok: false, name: HANDLER_NAMES.NOTIFY_FAMILY, reason: 'no_family_body' };
    }

    if (!familyChannelClient || typeof familyChannelClient.dispatch !== 'function') {
      // No channel client wired — log a notification and return manual_override hint
      await _audit('care-plan.notify_family.side-effect.manual', {
        planVersionId,
        entityType: entityTypeOf(planVersion), // W1258
        reason: 'no_family_channel_client',
      });
      return {
        ok: false,
        name: HANDLER_NAMES.NOTIFY_FAMILY,
        reason: 'manual_dispatch_required',
        recommendedNextAction: 'staff_must_share_pdf_in_person',
      };
    }

    let dispatchResult = null;
    let dispatchError = null;
    try {
      dispatchResult = await familyChannelClient.dispatch({
        channel,
        recipient,
        body,
        planVersionId,
      });
    } catch (err) {
      dispatchError = err;
    }

    const success = !!(dispatchResult && dispatchResult.ok !== false);
    const attempt = Number(metadata?.attempt || 0);

    await _audit('care-plan.notify_family.side-effect', {
      planVersionId,
      entityType: entityTypeOf(planVersion), // W1258
      channel,
      success,
      attempt,
      error: dispatchError ? dispatchError.message : null,
    });

    if (metrics && typeof metrics.incFamilySend === 'function') {
      metrics.incFamilySend(success ? 'sent' : 'failed', channel);
    }

    if (!success) {
      const retry = computeRetrySchedule(attempt);
      return {
        ok: false,
        name: HANDLER_NAMES.NOTIFY_FAMILY,
        reason: dispatchError ? 'dispatch_threw' : 'dispatch_rejected',
        error: dispatchError ? dispatchError.message : dispatchResult?.reason || 'unknown',
        retry,
      };
    }

    return { ok: true, name: HANDLER_NAMES.NOTIFY_FAMILY, channel, attempt };
  }

  // ─── care-plan.supersede ──────────────────────────────────────

  async function onSupersede({ planVersion, actor }) {
    const planVersionId = String(planVersion?._id || '');
    await _audit('care-plan.supersede.side-effect', {
      planVersionId,
      planId: planVersion?.planId,
      versionNumber: planVersion?.versionNumber,
      supersededBy: planVersion?.supersededBy,
      actor,
    });
    return { ok: true, name: HANDLER_NAMES.SUPERSEDE };
  }

  return Object.freeze({
    [HANDLER_NAMES.APPROVE]: onApprove,
    [HANDLER_NAMES.REJECT]: onReject,
    [HANDLER_NAMES.ESCALATE]: onEscalate,
    [HANDLER_NAMES.SAVE_TO_RECORD]: onSaveToRecord,
    [HANDLER_NAMES.NOTIFY_FAMILY]: onNotifyFamily,
    [HANDLER_NAMES.SUPERSEDE]: onSupersede,
    // Diagnostic helpers
    _computeRetrySchedule: computeRetrySchedule,
    _dedupeKey: dedupeKey,
  });
}

module.exports = {
  createCarePlanSideEffectHandlers,
  HANDLER_NAMES,
  RETRY_BACKOFF_MS,
};
