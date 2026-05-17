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
  sideEffectHandlers = {},
  logger = console,
  now = () => new Date(),
  metrics = null,
} = {}) {
  if (!planVersionModel) {
    throw new Error('family-retry.worker: planVersionModel is required');
  }
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
    let candidates = [];
    try {
      const cursor = planVersionModel.find({
        status: { $in: ['saved_to_record', 'family_notification_sent'] },
      });
      if (cursor && typeof cursor.limit === 'function') {
        candidates = await cursor.limit(limit * 4).lean();
      } else if (cursor && typeof cursor.exec === 'function') {
        candidates = await cursor.exec();
      } else if (Array.isArray(cursor)) {
        candidates = cursor;
      } else if (cursor && typeof cursor.then === 'function') {
        candidates = await cursor;
      }
    } catch (err) {
      logger.warn && logger.warn(`[family-retry] scan failed: ${err.message}`);
      return { ...summary, scanError: err.message };
    }

    candidates = Array.isArray(candidates) ? candidates : [];
    summary.scanned = candidates.length;

    for (const pv of candidates) {
      if (summary.retried >= limit) break;
      if (!_isRetryableStatus(pv.status)) continue;
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
