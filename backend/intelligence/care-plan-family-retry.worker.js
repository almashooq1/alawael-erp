'use strict';

/**
 * care-plan-family-retry.worker.js — Wave 50.
 *
 * Scans CarePlanVersion documents that have failed family-notification
 * attempts and re-tries them per the Wave-45 retry schedule (5m / 30m /
 * 3h backoff). After 3 failed attempts, marks for `manual_override`.
 *
 * Pure worker: callers (cron, queue worker, integration test) invoke
 * `runOnce({ now, limit })`. The worker does NOT spawn its own interval —
 * the scheduling decision belongs to the host.
 *
 * Returns a structured summary:
 *
 *   {
 *     scanned, eligible, retried, succeeded, failed, exhausted,
 *     details: [{ planVersionId, attemptId, action, reason? }]
 *   }
 *
 * Reliability guarantees:
 *   • Idempotent — running twice in quick succession yields the same
 *     state (attemptId dedupe + status check).
 *   • Caps the number of retries per run (default 50) so a backlog
 *     doesn't stall the worker.
 *   • Never escalates to the side-effect handler if the plan's status
 *     has moved past family_notification_sent (e.g. superseded).
 */

const { RETRY_BACKOFF_MS, HANDLER_NAMES } = require('./care-plan-side-effects.service');

const DEFAULTS = Object.freeze({
  limitPerRun: 50,
  manualOverrideAfterAttempts: 3,
});

function _isRetryableStatus(planStatus) {
  return planStatus === 'saved_to_record' || planStatus === 'family_notification_sent';
}

/**
 * Decide whether a given familyNotification entry is ready for retry NOW.
 * Returns:
 *   { eligible: true, nextAttempt: int }
 *   { eligible: false, reason: 'not_failed'|'exhausted'|'too_early' }
 */
function _evaluateAttempt(attempt, now) {
  if (!attempt) return { eligible: false, reason: 'no_attempt' };
  if (attempt.status !== 'failed') return { eligible: false, reason: 'not_failed' };

  const retries = Number(attempt.retries || 0);
  if (retries >= DEFAULTS.manualOverrideAfterAttempts) {
    return { eligible: false, reason: 'exhausted', retries };
  }
  // Compute next-attempt time from attemptedAt + cumulative backoff
  const lastAttemptAt = attempt.attemptedAt ? new Date(attempt.attemptedAt).getTime() : null;
  if (!lastAttemptAt) return { eligible: false, reason: 'no_attempted_at' };

  const backoff = RETRY_BACKOFF_MS[retries];
  if (backoff == null) return { eligible: false, reason: 'no_backoff_slot' };

  const earliestNext = lastAttemptAt + backoff;
  if (now.getTime() < earliestNext) {
    return { eligible: false, reason: 'too_early', readyAt: new Date(earliestNext).toISOString() };
  }

  return { eligible: true, nextAttempt: retries + 1 };
}

/**
 * @param {object} deps
 *   - planVersionModel       Mongoose model (Wave 41)
 *   - sideEffectHandlers     Wave-45 handler map; must include
 *                            'care-plan.notify_family'
 *   - logger                 console-compatible
 *   - now                    () → Date
 *   - metrics                optional { incRetry(outcome), observeRetryAge(ms) }
 * @returns { runOnce } worker API
 */
function createFamilyRetryWorker({
  planVersionModel = null,
  unifiedPlanModel = null, // W1254 — ADR-040 (b): also serve UnifiedCarePlan (the model the UI writes)
  sideEffectHandlers = {},
  logger = console,
  now = () => new Date(),
  metrics = null,
} = {}) {
  if (!planVersionModel) {
    throw new Error('family-retry.worker: planVersionModel is required');
  }

  // W1254 — UnifiedCarePlan's post-approval (live) statuses. familyNotifications
  // was lifted field-for-field onto UnifiedCarePlan, so the per-attempt logic
  // below is shared verbatim; only the status eligibility differs per model.
  const UNIFIED_RETRYABLE_STATUSES = ['active', 'under_review'];
  // Handler is optional at construction time — gracefully skipped at
  // runtime if the bootstrap didn't wire family notifications.
  const handler = sideEffectHandlers[HANDLER_NAMES.NOTIFY_FAMILY];

  async function runOnce({ limit = DEFAULTS.limitPerRun, ignoreEligibilityWindow = false } = {}) {
    if (typeof handler !== 'function') {
      return {
        scanned: 0,
        eligible: 0,
        retried: 0,
        succeeded: 0,
        failed: 0,
        exhausted: 0,
        manualOverrideMarked: 0,
        details: [],
        ranAt: now().toISOString(),
        skipped: true,
        skippedReason: 'notify_family_handler_not_wired',
      };
    }
    const t = now();
    const summary = {
      scanned: 0,
      eligible: 0,
      retried: 0,
      succeeded: 0,
      failed: 0,
      exhausted: 0,
      manualOverrideMarked: 0,
      details: [],
      ranAt: t.toISOString(),
    };

    // Pull recent plans with at least one failed family-notification.
    // We rely on application-level invariants (status + familyNotifications)
    // rather than a query-side $elemMatch so this works against both the
    // real Mongoose model and the lightweight test mock.
    //
    // W1254 — fetched HYDRATED (no .lean()): pre-W1254 the real-model path
    // used .lean(), so the retry mutations below (retries++, status flips,
    // manual_override) hit `typeof pv.save === 'function'` === false and were
    // NEVER persisted — meaning backoff/exhaustion state silently reset every
    // run against real data. Hydrated docs restore persistence; the mock
    // paths (array / thenable / exec) are unchanged.
    async function _fetch(model, query) {
      const cursor = model.find(query);
      if (cursor && typeof cursor.limit === 'function') {
        const limited = cursor.limit(limit * 4);
        // Real mongoose Query is thenable → await yields HYDRATED docs
        // (the W1254 persistence fix). Legacy test mocks return a plain
        // { lean } object instead — honor that shape unchanged.
        if (limited && typeof limited.then === 'function') return limited;
        if (limited && typeof limited.lean === 'function') return limited.lean();
        return Array.isArray(limited) ? limited : [];
      } else if (cursor && typeof cursor.exec === 'function') {
        return cursor.exec();
      } else if (Array.isArray(cursor)) {
        return cursor;
      } else if (cursor && typeof cursor.then === 'function') {
        return cursor;
      }
      return [];
    }

    let candidates = [];
    try {
      const legacyRows = await _fetch(planVersionModel, {
        status: { $in: ['saved_to_record', 'family_notification_sent'] },
      });
      candidates = (Array.isArray(legacyRows) ? legacyRows : []).map(pv => ({
        pv,
        source: 'legacy',
      }));
    } catch (err) {
      logger.warn && logger.warn(`[family-retry] scan failed: ${err.message}`);
      return { ...summary, scanError: err.message };
    }

    // W1254 — second source: UnifiedCarePlan (UI-authored). Optional +
    // fail-soft: an error here never blocks the legacy scan.
    if (unifiedPlanModel) {
      try {
        const uRows = await _fetch(unifiedPlanModel, {
          isDeleted: { $ne: true },
          status: { $in: UNIFIED_RETRYABLE_STATUSES },
          'familyNotifications.status': 'failed',
        });
        candidates = candidates.concat(
          (Array.isArray(uRows) ? uRows : []).map(pv => ({ pv, source: 'unified' }))
        );
      } catch (err) {
        logger.warn &&
          logger.warn(`[family-retry] unified scan failed (non-fatal): ${err.message}`);
      }
    }

    summary.scanned = candidates.length;

    for (const { pv, source } of candidates) {
      if (summary.retried >= limit) break;
      const statusOk =
        source === 'unified'
          ? UNIFIED_RETRYABLE_STATUSES.includes(pv.status)
          : _isRetryableStatus(pv.status);
      if (!statusOk) continue;
      const notifications = Array.isArray(pv.familyNotifications) ? pv.familyNotifications : [];
      // Pick the most-recent failed attempt only (don't pile retries
      // on multiple historical attempts in the same run).
      const failed = notifications.filter(n => n.status === 'failed');
      if (failed.length === 0) continue;
      failed.sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt));
      const target = failed[0];

      const verdict = ignoreEligibilityWindow
        ? { eligible: true, nextAttempt: Number(target.retries || 0) + 1 }
        : _evaluateAttempt(target, t);

      if (!verdict.eligible) {
        if (verdict.reason === 'exhausted') {
          summary.exhausted += 1;
          // Mark for manual override (no further retries)
          target.status = 'manual_override';
          summary.manualOverrideMarked += 1;
          if (typeof pv.save === 'function') {
            try {
              await pv.save();
            } catch (_) {
              /* best-effort */
            }
          }
        }
        continue;
      }
      summary.eligible += 1;

      let result = null;
      try {
        result = await handler({
          planVersion: pv,
          actor: { userId: 'system_family_retry', role: 'system' },
          metadata: {
            channel: target.channel,
            recipient: target.recipient || null,
            attempt: verdict.nextAttempt,
            isRetry: true,
            previousAttemptId: target.attemptId,
          },
        });
      } catch (err) {
        result = { ok: false, error: err.message };
      }
      summary.retried += 1;

      if (result && result.ok) {
        summary.succeeded += 1;
        target.status = 'sent';
        target.retries = verdict.nextAttempt;
        target.failureReason = null;
        if (metrics && typeof metrics.incRetry === 'function') metrics.incRetry('succeeded');
        summary.details.push({
          planVersionId: String(pv._id),
          attemptId: target.attemptId,
          action: 'retried_ok',
          newAttempt: verdict.nextAttempt,
          source, // W1254
        });
      } else {
        summary.failed += 1;
        target.retries = verdict.nextAttempt;
        target.failureReason = result?.error || result?.reason || 'unknown';
        target.attemptedAt = t;
        if (metrics && typeof metrics.incRetry === 'function') metrics.incRetry('failed');
        summary.details.push({
          planVersionId: String(pv._id),
          attemptId: target.attemptId,
          action: 'retried_failed',
          newAttempt: verdict.nextAttempt,
          reason: target.failureReason,
          source, // W1254
        });
      }

      if (typeof pv.save === 'function') {
        try {
          await pv.save();
        } catch (err) {
          logger.warn && logger.warn(`[family-retry] save failed: ${err.message}`);
        }
      }
    }

    return summary;
  }

  return Object.freeze({ runOnce, _evaluateAttempt });
}

module.exports = {
  createFamilyRetryWorker,
  DEFAULTS,
};
