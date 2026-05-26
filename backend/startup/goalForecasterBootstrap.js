'use strict';

/**
 * goalForecasterBootstrap.js — Wave 430 (Phase B2 — Outcome Forecasting).
 *
 * Wires the W430 forecaster sweeper service onto `app._goalForecasterService`
 * (so admin tools / debug routes can trigger it manually) and optionally
 * schedules a daily cron sweep per configured branch.
 *
 * Env contract (default OFF — opt-in per environment):
 *   GOAL_FORECASTER='off'              — global kill switch on the service
 *                                        itself (default: enabled at the
 *                                        service level; cron stays off).
 *   ENABLE_FORECAST_OFF_TRACK_SWEEPER=true
 *                                      — schedule the daily cron tick.
 *   FORECAST_SWEEPER_BRANCH_IDS=b1,b2  — required when cron is on. Empty list
 *                                        + cron on = warn-and-skip.
 *   FORECAST_SWEEPER_CRON='30 04 * * *' — optional override (default daily
 *                                        @ 04:30 Asia/Riyadh — 30min after
 *                                        the W286 risk sweep so the system
 *                                        isn't doing two heavy scans at once).
 *   FORECAST_SWEEPER_LIMIT=1000        — per-tick beneficiary cap.
 *
 * Read-only at runtime: this bootstrap NEVER mutates state synchronously
 * on boot. State mutation happens only on the cron tick.
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireGoalForecaster(app, deps = {}) {
  const logger = deps.logger || console;
  if (!app) throw new Error('goalForecasterBootstrap.wireGoalForecaster: app required');

  // Late-binding the service — the goal/measure models load lazily inside
  // the service. Attaching to app makes it discoverable from /api/ops/*
  // or future /api/forecast/* surfaces.
  let service;
  try {
    service = require('../services/goalForecaster.service');
  } catch (err) {
    logger.warn('[goal-forecaster] service require failed', { err: err && err.message });
    return;
  }
  app._goalForecasterService = service;
  logger.info('[startup] goal-forecaster service wired (W430)');

  // ── Cron tick — opt-in via ENABLE_FORECAST_OFF_TRACK_SWEEPER ───────
  const cronEnabled =
    String(process.env.ENABLE_FORECAST_OFF_TRACK_SWEEPER || '').toLowerCase() === 'true';
  if (!cronEnabled) {
    logger.info(
      '[startup] goal-forecaster cron disabled (set ENABLE_FORECAST_OFF_TRACK_SWEEPER=true)'
    );
    return;
  }

  const cronMod = loadOptional('node-cron');
  if (!cronMod) {
    logger.warn('[startup] goal-forecaster cron skipped — node-cron not installed');
    return;
  }

  const branchIds = String(process.env.FORECAST_SWEEPER_BRANCH_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (branchIds.length === 0) {
    logger.warn(
      '[startup] goal-forecaster cron: FORECAST_SWEEPER_BRANCH_IDS empty — NOT scheduled (use ALL_BRANCHES sentinel if intentional)'
    );
    return;
  }

  const schedule = process.env.FORECAST_SWEEPER_CRON || '30 04 * * *';
  const limit = parseInt(process.env.FORECAST_SWEEPER_LIMIT, 10) || 1000;

  const task = cronMod.schedule(
    schedule,
    async () => {
      const startedAt = new Date();
      const summary = {
        branches: branchIds.length,
        created: 0,
        updated: 0,
        resolved: 0,
        skipped: 0,
        errors: 0,
      };
      for (const branchId of branchIds) {
        try {
          // Sentinel ALL_BRANCHES = sweep without branch filter (rare).
          const r = await service.sweep({
            branchId: branchId === 'ALL_BRANCHES' ? null : branchId,
            limit,
          });
          summary.created += r.created || 0;
          summary.updated += r.updated || 0;
          summary.resolved += r.resolved || 0;
          summary.skipped += r.skipped || 0;
          summary.errors += r.errors || 0;
        } catch (err) {
          summary.errors++;
          logger.error('[goal-forecaster:cron] branch failed', {
            branchId,
            err: err && err.message,
          });
        }
      }
      const durationMs = Date.now() - startedAt.getTime();
      logger.info('[goal-forecaster:cron] tick complete', { ...summary, durationMs });
    },
    { timezone: 'Asia/Riyadh' }
  );
  app._goalForecasterCronTask = task;
  logger.info('[startup] goal-forecaster cron scheduled', {
    schedule,
    branchCount: branchIds.length,
    tz: 'Asia/Riyadh',
    limit,
  });
}

module.exports = { wireGoalForecaster };
