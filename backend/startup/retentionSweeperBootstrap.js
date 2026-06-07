'use strict';

/**
 * retentionSweeperBootstrap.js — W983.
 *
 * Schedules the DORMANT beneficiary-retention sweep. `services/care/retention.service.js`
 * exposes `sweep({ branchId?, beneficiaryIds?, limit })` — batch-assess churn/retention
 * risk + emit interventions when a risk band escalates — and careBootstrap constructs
 * + exposes the service, but only a manual `POST /api/care/retention/sweep` ever calls
 * it. careBootstrap even notes (line ~287) "Future commits add retention sweepers /
 * scoring schedulers." Nothing scheduled it → the periodic re-assessment never ran
 * (W225 dormant-capability pattern, same shape as W762/W973).
 *
 * GATED OFF BY DEFAULT (ENABLE_RETENTION_SWEEP=true). Ships inert. This matters more
 * than the read-only sweepers: a run CREATES RetentionAssessment rows and EMITS
 * interventions (psychologist notification / home-visit request / case flagging), so
 * activation is an operator decision (cadence + scope + churn-model validation). The
 * wiring ships ready; the operator opts in after testing.
 *
 * Env:
 *   ENABLE_RETENTION_SWEEP       — 'true' to schedule (default: OFF)
 *   RETENTION_SWEEP_CRON         — cron expr (default = daily 04:00 Asia/Riyadh)
 *   RETENTION_SWEEP_BRANCH_IDS   — comma-separated branch ids; empty = one all-branches
 *                                  sweep (capped by limit)
 *   RETENTION_SWEEP_LIMIT        — max beneficiaries assessed per branch/run (default 200)
 *
 * Fully guarded: a sweep throw is caught per-tick and never breaks boot or other branches.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireRetentionSweeper(deps = {}) {
  const { retentionService, logger } = deps;
  if (!logger) {
    throw new Error('retentionSweeperBootstrap.wireRetentionSweeper: logger required');
  }

  if (process.env.ENABLE_RETENTION_SWEEP !== 'true') {
    logger.info(
      '[startup] retention sweep disabled (set ENABLE_RETENTION_SWEEP=true to schedule churn re-assessment)'
    );
    return { started: false };
  }

  if (!retentionService || typeof retentionService.sweep !== 'function') {
    logger.warn('[startup] retention service unavailable (sweep absent); sweeper not scheduled');
    return { started: false };
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; retention sweep not scheduled');
    return { started: false };
  }

  const schedule = process.env.RETENTION_SWEEP_CRON || '0 4 * * *';
  const limit = Number(process.env.RETENTION_SWEEP_LIMIT) || 200;
  const branchIds = (process.env.RETENTION_SWEEP_BRANCH_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const TZ = { timezone: 'Asia/Riyadh' };

  cron.schedule(
    schedule,
    async () => {
      // One all-branches sweep when no branch list is given; otherwise per-branch
      // (each isolated so one branch failure doesn't abort the rest).
      const targets = branchIds.length ? branchIds : [null];
      for (const branchId of targets) {
        try {
          const res = await retentionService.sweep({ branchId, limit, triggeredBy: 'scheduler' });
          logger.info(
            `[retention-sweep] ${branchId || 'all-branches'}: assessed=${(res && res.assessed) ?? '?'} candidates=${(res && res.totalCandidates) ?? '?'} errors=${(res && res.errors && res.errors.length) || 0}`
          );
        } catch (err) {
          logger.error('[retention-sweep] failed', {
            branchId: branchId || 'all',
            error: err && err.message,
          });
        }
      }
    },
    TZ
  );

  logger.info(
    `[startup] W983 retention sweep scheduled (${schedule} Asia/Riyadh; ${branchIds.length ? branchIds.length + ' branch(es)' : 'all branches'}, limit ${limit})`
  );
  return { started: true, branches: branchIds.length || 'all', limit };
}

module.exports = { wireRetentionSweeper };
