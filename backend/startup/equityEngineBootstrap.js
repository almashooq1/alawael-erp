'use strict';

/**
 * equityEngineBootstrap.js — W487 (Phase G: Equity Engine).
 *
 * Wires the quarterly equity audit cron. Env-gated:
 *   ENABLE_EQUITY_ENGINE_CRON=true    — opt-in
 *   EQUITY_ENGINE_BRANCH_IDS=b1,b2    — comma-separated branch list
 *   EQUITY_ENGINE_SCHEDULE=...        — optional cron expression
 *                                       (default 04:00 Asia/Riyadh, 1st of each quarter)
 *
 * Per CLAUDE.md "Bootstrap-with-cron template": loadOptional node-cron,
 * env-gated, branch-scoped, per-iteration try/catch, Asia/Riyadh tz.
 */

function loadOptional(name, logger) {
  try {
    return require(name);
  } catch (err) {
    if (logger?.warn) {
      logger.warn(`equityEngineBootstrap: optional dep ${name} not available: ${err.message}`);
    }
    return null;
  }
}

function wireEquityEngine(app, { logger = console } = {}) {
  if (process.env.ENABLE_EQUITY_ENGINE_CRON !== 'true') {
    if (logger?.info)
      logger.info(
        'equityEngineBootstrap: cron disabled (set ENABLE_EQUITY_ENGINE_CRON=true to enable)'
      );
    return { wired: false, reason: 'NOT_ENABLED' };
  }

  const cron = loadOptional('node-cron', logger);
  if (!cron) {
    return { wired: false, reason: 'NODE_CRON_NOT_AVAILABLE' };
  }

  const branchIds = (process.env.EQUITY_ENGINE_BRANCH_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!branchIds.length) {
    if (logger?.warn) {
      logger.warn(
        'equityEngineBootstrap: ENABLE_EQUITY_ENGINE_CRON=true but no EQUITY_ENGINE_BRANCH_IDS set'
      );
    }
    return { wired: false, reason: 'NO_BRANCHES' };
  }

  const schedule = process.env.EQUITY_ENGINE_SCHEDULE || '0 4 1 */3 *';

  cron.schedule(
    schedule,
    async () => {
      const engineService = require('../services/equity/equity-engine.service');
      const now = new Date();
      // Last completed quarter
      const periodEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 3, 1);

      for (const branchId of branchIds) {
        try {
          // Note: production deployments wire a real observationsByMetric
          // loader (aggregating GAS/ICF/attendance/etc from existing
          // collections); the cron loader is intentionally stubbed in
          // this scaffolding so deployments must explicitly wire data
          // sources before going live.
          if (typeof app?._loadEquityObservations === 'function') {
            const observationsByMetric = await app._loadEquityObservations(branchId, {
              periodStart,
              periodEnd,
            });
            const result = await engineService.runBranchSweep({
              branchId,
              observationsByMetric,
              periodStart,
              periodEnd,
              periodKind: 'quarterly',
            });
            if (logger?.info) {
              logger.info(
                `equityEngine: branch ${branchId} swept — ${result.alertsCreated} new alerts, ${result.alertsExisting} existing`
              );
            }
          } else {
            if (logger?.warn) {
              logger.warn(
                `equityEngine: branch ${branchId} skipped — app._loadEquityObservations not wired`
              );
            }
          }
        } catch (err) {
          if (logger?.error) {
            logger.error(`equityEngine: branch ${branchId} sweep failed: ${err.message}`);
          }
        }
      }
    },
    { timezone: 'Asia/Riyadh', scheduled: true }
  );

  if (logger?.info) {
    logger.info(
      `equityEngineBootstrap: cron wired for ${branchIds.length} branch(es), schedule="${schedule}"`
    );
  }
  return { wired: true, branchCount: branchIds.length, schedule };
}

module.exports = { wireEquityEngine };
