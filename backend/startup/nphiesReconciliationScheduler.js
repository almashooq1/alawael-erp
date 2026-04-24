/**
 * NPHIES reconciliation scheduler — walks PENDING_REVIEW claims on a timer
 * and polls the adapter so missed webhooks don't leave claims stuck.
 *
 * Cadence + caps are conservative by default: 10 minutes between ticks,
 * 25 claims per batch, 15-minute minimum age. All are env-overridable.
 *
 * The worker starts on server boot if mongoose is connected AND the env
 * flag `NPHIES_RECON_ENABLED` is not "false". Tests should pass
 * `{ isTestEnv: true }` to prevent the interval from registering.
 */

'use strict';

const logger = require('../utils/logger');

const DEFAULTS = {
  intervalMs: 10 * 60 * 1000,
  batchSize: 25,
  minAgeMs: 15 * 60 * 1000,
};

function createNphiesReconciliationScheduler({
  service,
  intervalMs = parseInt(process.env.NPHIES_RECON_INTERVAL_MS, 10) || DEFAULTS.intervalMs,
  batchSize = parseInt(process.env.NPHIES_RECON_BATCH_SIZE, 10) || DEFAULTS.batchSize,
  minAgeMs = parseInt(process.env.NPHIES_RECON_MIN_AGE_MS, 10) || DEFAULTS.minAgeMs,
} = {}) {
  if (!service) throw new Error('createNphiesReconciliationScheduler: service is required');
  let timer = null;
  let running = false;
  let lastStats = null;

  async function tick() {
    if (running) return;
    running = true;
    try {
      lastStats = await service.sweep({ batchSize, minAgeMs });
      if (lastStats.changed > 0 || lastStats.errors > 0) {
        logger.info &&
          logger.info(
            `[nphies-recon] tick scanned=${lastStats.scanned} changed=${lastStats.changed} errors=${lastStats.errors}`
          );
      }
    } catch (err) {
      logger.error && logger.error(`[nphies-recon] tick failed: ${err.message}`);
    } finally {
      running = false;
    }
    return lastStats;
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => {
        tick().catch(() => {});
      }, intervalMs);
      if (timer.unref) timer.unref();
      logger.info &&
        logger.info(`[nphies-recon] started (every ${intervalMs}ms, batch=${batchSize})`);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    tick,
    getStats: () => lastStats,
  };
}

module.exports = { createNphiesReconciliationScheduler, DEFAULTS };
