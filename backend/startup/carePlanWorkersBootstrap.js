'use strict';

/**
 * carePlanWorkersBootstrap.js — W973.
 *
 * Schedules the DORMANT care-plan background workers built by
 * `intelligence/care-plan-bootstrap.js::bootstrapCarePlanning()`:
 *
 *   • overdueReview (Wave 50) — scans for care-plan reviews past their due
 *     date and notifies the responsible audience via the wired notifier.
 *   • familyRetry (Wave 45) — retries failed family-notification attempts with
 *     exponential backoff (inert unless a family channel is wired, but the
 *     scan is harmless and completes the wiring for when one is).
 *
 * Both workers expose a `runOnce({ now })` contract and DELIBERATELY do not
 * spawn their own interval — their own doc-comments say "caller (cron /
 * job-queue) invokes runOnce". Nothing ever did, so they were dead (W225
 * dormant-capability pattern). carePlanningBootstrap now exposes them on
 * `app._carePlanWorkers`; this is the missing scheduler.
 *
 * GATED OFF BY DEFAULT (ENABLE_CARE_PLAN_WORKERS=true). Ships inert — nothing
 * runs until an operator opts in. Fully guarded: a worker throw is caught
 * per-tick and never breaks boot or the other worker.
 *
 * Env:
 *   ENABLE_CARE_PLAN_WORKERS         — 'true' to schedule (default: OFF)
 *   CARE_PLAN_OVERDUE_REVIEW_CRON    — cron expr (default = daily 07:00 Asia/Riyadh)
 *   CARE_PLAN_FAMILY_RETRY_CRON      — cron expr (default = every 15 minutes)
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireCarePlanWorkers(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('carePlanWorkersBootstrap.wireCarePlanWorkers: app + logger required');
  }

  if (process.env.ENABLE_CARE_PLAN_WORKERS !== 'true') {
    logger.info(
      '[startup] care-plan workers disabled (set ENABLE_CARE_PLAN_WORKERS=true to schedule overdue-review + family-retry)'
    );
    return { started: false };
  }

  const workers = app._carePlanWorkers;
  if (!workers) {
    // Care-planning engine didn't mount (no CarePlanVersion / governance) —
    // nothing to schedule. Degrade quietly; the engine logs its own skip.
    logger.warn('[startup] care-plan workers not available (engine not mounted); scheduler skipped');
    return { started: false };
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; care-plan workers not scheduled');
    return { started: false };
  }

  const TZ = { timezone: 'Asia/Riyadh' };
  const overdueCron = process.env.CARE_PLAN_OVERDUE_REVIEW_CRON || '0 7 * * *';
  const familyCron = process.env.CARE_PLAN_FAMILY_RETRY_CRON || '*/15 * * * *';
  const scheduled = [];

  // overdue-review scanner — daily.
  if (workers.overdueReview && typeof workers.overdueReview.runOnce === 'function') {
    cron.schedule(
      overdueCron,
      async () => {
        try {
          const res = await workers.overdueReview.runOnce({ now: new Date() });
          logger.info(
            `[care-plan] overdue-review scan: scanned=${(res && res.scanned) ?? '?'} overdue=${(res && res.overdue) ?? '?'}`
          );
        } catch (err) {
          logger.error('[care-plan] overdue-review scan failed', { error: err && err.message });
        }
      },
      TZ
    );
    scheduled.push('overdueReview');
  }

  // family-retry worker — every 15 min (its own backoff decides eligibility).
  if (workers.familyRetry && typeof workers.familyRetry.runOnce === 'function') {
    cron.schedule(
      familyCron,
      async () => {
        try {
          const res = await workers.familyRetry.runOnce({ now: new Date() });
          logger.info(
            `[care-plan] family-retry: retried=${(res && res.retried) ?? '?'} succeeded=${(res && res.succeeded) ?? '?'} failed=${(res && res.failed) ?? '?'}`
          );
        } catch (err) {
          logger.error('[care-plan] family-retry failed', { error: err && err.message });
        }
      },
      TZ
    );
    scheduled.push('familyRetry');
  }

  logger.info(
    `[startup] W973 care-plan workers scheduled (${scheduled.join(', ') || 'none'}; overdue '${overdueCron}', family '${familyCron}' Asia/Riyadh)`
  );
  return { started: scheduled.length > 0, scheduled };
}

module.exports = { wireCarePlanWorkers };
