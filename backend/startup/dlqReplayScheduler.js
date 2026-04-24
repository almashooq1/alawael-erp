/**
 * DLQ Replay Scheduler — wakes every N minutes, asks the Mongo DLQ adapter
 * for the oldest still-parked entries, and calls the per-integration replay
 * adapter that each integration registered at boot.
 *
 * Design:
 *   - Skips entries younger than `minAgeMs` so an entry that just landed has
 *     a chance to be debugged before auto-retry.
 *   - Caps the batch so we never flood a recovering downstream (ZATCA coming
 *     back after an outage).
 *   - Per-entry timeout so one stuck replay cannot stall the worker.
 *   - No retries beyond `maxReplayCount` — a chronically failing entry is
 *     left for a human to discard.
 *
 * The worker is started via `start()` and returns a handle with a `stop()`
 * method that the graceful-shutdown hook in server.js can call.
 */

'use strict';

const dlq = require('../infrastructure/deadLetterQueue');
const logger = require('../utils/logger');

const DEFAULTS = {
  intervalMs: 15 * 60 * 1000, // 15 min
  batchSize: 25,
  minAgeMs: 60 * 1000, // wait 1 min before first auto-retry
  maxReplayCount: 5,
  perEntryTimeoutMs: 30 * 1000,
};

function createDlqReplayScheduler({
  adapters,
  store,
  intervalMs = DEFAULTS.intervalMs,
  batchSize = DEFAULTS.batchSize,
  minAgeMs = DEFAULTS.minAgeMs,
  maxReplayCount = DEFAULTS.maxReplayCount,
  perEntryTimeoutMs = DEFAULTS.perEntryTimeoutMs,
  now = () => Date.now(),
} = {}) {
  if (!adapters || typeof adapters.get !== 'function') {
    throw new Error('createDlqReplayScheduler: adapters registry required (Map or Map-like)');
  }
  const effectiveStore = store || dlq.getStore();
  if (typeof effectiveStore.listForReplay !== 'function') {
    // Falls back to list() if the store doesn't implement the optimized call.
  }

  let timer = null;
  let running = false;
  let lastRunStats = null;

  async function tick() {
    if (running) return; // overlap guard — a slow run shouldn't pile up
    running = true;
    const stats = { startedAt: now(), scanned: 0, replayed: 0, resolved: 0, skipped: 0, errors: 0 };
    try {
      const candidates = await _fetch();
      stats.scanned = candidates.length;
      for (const entry of candidates) {
        if ((entry.replayCount || 0) >= maxReplayCount) {
          stats.skipped++;
          continue;
        }
        const adapter = adapters.get(entry.integration);
        if (!adapter) {
          stats.skipped++;
          continue;
        }
        try {
          const outcome = await _withTimeout(dlq.replay(entry.id, adapter), perEntryTimeoutMs);
          stats.replayed++;
          if (outcome && outcome.ok) stats.resolved++;
        } catch (err) {
          stats.errors++;
          logger.warn && logger.warn(`[DLQ worker] replay error id=${entry.id}: ${err.message}`);
        }
      }
    } finally {
      stats.finishedAt = now();
      stats.durationMs = stats.finishedAt - stats.startedAt;
      lastRunStats = stats;
      running = false;
    }
    return stats;
  }

  async function _fetch() {
    if (typeof effectiveStore.listForReplay === 'function') {
      return effectiveStore.listForReplay({ batchSize, olderThanMs: minAgeMs });
    }
    // In-memory fallback: filter with list()
    const { rows } = await effectiveStore.list({ status: 'parked', limit: batchSize });
    const cutoff = now() - minAgeMs;
    return rows.filter(r => (r.updatedAt || r.createdAt) <= cutoff);
  }

  function _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error(`DLQ replay timeout after ${ms}ms`)), ms)
      ),
    ]);
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(() => {
        tick().catch(
          err => logger.error && logger.error(`[DLQ worker] tick crashed: ${err.message}`)
        );
      }, intervalMs);
      if (timer.unref) timer.unref();
      logger.info &&
        logger.info(`[DLQ worker] started (every ${intervalMs}ms, batch=${batchSize})`);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    tick, // exposed for manual trigger from admin route + tests
    getStats: () => lastRunStats,
  };
}

module.exports = { createDlqReplayScheduler, DEFAULTS };
