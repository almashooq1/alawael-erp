/**
 * zatcaB2cSlaScheduler — periodic driver for the B2C 24-hour SLA sweep.
 *
 * Mirrors the shape of `nphiesReconciliationScheduler` so test patterns +
 * lifecycle (start/stop/tick) are familiar. Defaults:
 *   • cadence:   30 min between ticks
 *   • batch:     50 invoices per tick
 *   • warn:      18h after issuance → retry submission
 *   • breach:    23h after issuance → fire single ops-alert per tick
 *
 * All four are env-overridable (see `.env.example` once added).
 *
 * Boots conditionally — set `ZATCA_SLA_SWEEPER_ENABLED=false` to keep
 * it disabled in environments where ZATCA submission isn't yet wired
 * (e.g. a staging cluster without onboarding done).
 */

'use strict';

const logger = require('../utils/logger');

const DEFAULTS = {
  intervalMs: 30 * 60 * 1000,
  batchSize: 50,
  warnThresholdMs: 18 * 60 * 60 * 1000,
  breachThresholdMs: 23 * 60 * 60 * 1000,
};

function createZatcaB2cSlaScheduler({
  service, // pass the sweeper module: { sweep }
  intervalMs = parseInt(process.env.ZATCA_SLA_INTERVAL_MS, 10) || DEFAULTS.intervalMs,
  batchSize = parseInt(process.env.ZATCA_SLA_BATCH_SIZE, 10) || DEFAULTS.batchSize,
  warnThresholdMs = parseInt(process.env.ZATCA_SLA_WARN_MS, 10) || DEFAULTS.warnThresholdMs,
  breachThresholdMs = parseInt(process.env.ZATCA_SLA_BREACH_MS, 10) || DEFAULTS.breachThresholdMs,
} = {}) {
  if (!service) throw new Error('createZatcaB2cSlaScheduler: service is required');
  let timer = null;
  let running = false;
  let lastStats = null;

  async function tick() {
    if (running) return;
    running = true;
    try {
      lastStats = await service.sweep({ batchSize, warnThresholdMs, breachThresholdMs });
      if (lastStats.scanned > 0 || lastStats.breached > 0 || lastStats.retryFailed > 0) {
        logger.info &&
          logger.info(
            `[zatca-sla] tick scanned=${lastStats.scanned} retried=${lastStats.retried} ` +
              `succeeded=${lastStats.retrySucceeded} failed=${lastStats.retryFailed} ` +
              `breached=${lastStats.breached} alerted=${lastStats.breachAlerted}`
          );
      }
    } catch (err) {
      logger.error && logger.error(`[zatca-sla] tick failed: ${err.message}`);
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
        logger.info(
          `[zatca-sla] started (every ${intervalMs}ms, batch=${batchSize}, ` +
            `warn=${warnThresholdMs}ms, breach=${breachThresholdMs}ms)`
        );
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    tick,
    getStats: () => lastStats,
  };
}

module.exports = { createZatcaB2cSlaScheduler, DEFAULTS };
