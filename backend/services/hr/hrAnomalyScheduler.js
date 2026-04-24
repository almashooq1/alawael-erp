'use strict';

/**
 * hrAnomalyScheduler.js — Phase 11 Commit 23 (4.0.40).
 *
 * Bootstraps the HR anomaly detector (C19) as a long-running
 * setInterval inside the application process. Provides a
 * self-contained breach-detection layer for deployments without a
 * cron substrate.
 *
 * Responsibilities:
 *
 *   1. Fire an immediate scan at `start()` so a newly-booted
 *      server catches any anomaly that accumulated during the
 *      restart gap.
 *
 *   2. Schedule recurring scans at `intervalMs` (default 15m,
 *      clamped at [60s, 24h]).
 *
 *   3. Wrap every scan in a try/catch; errors go to `onError`
 *      (default: logger.warn). Never crashes the process.
 *
 *   4. `stop()` clears the interval + cancels any in-flight
 *      scan via a running-flag check. Safe to call repeatedly.
 *
 *   5. `isRunning()` + `getLastReport()` for introspection —
 *      future ops-observability endpoints can surface these.
 *
 * Design decisions:
 *
 *   1. DI'd detector, logger, setInterval/clearInterval. Tests
 *      pass fakes; production wires real ones. Keeps the
 *      scheduler unit-testable without clock-ticking.
 *
 *   2. Overlap guard: if scan N is still running when the
 *      interval fires for scan N+1, skip the second fire rather
 *      than stack up. The scanner is DB-bound and should never
 *      queue behind itself.
 *
 *   3. Idempotent start(): double-start is a no-op returning
 *      the existing status, not an error. Hot-reload safe.
 *
 *   4. Optional `runOnStart`: default true. Set false when the
 *      process restart was already near a scheduled fire.
 */

const MIN_INTERVAL_MS = 60 * 1000; // 1 minute
const MAX_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function createHrAnomalyScheduler(deps = {}) {
  const detector = deps.detector;
  if (detector == null || typeof detector.scan !== 'function') {
    throw new Error('hrAnomalyScheduler: detector with scan() is required');
  }
  const logger = deps.logger || {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
  const setI = deps.setInterval || setInterval;
  const clearI = deps.clearInterval || clearInterval;
  const onError = deps.onError || (err => logger.warn('[HrAnomalyScheduler]', err.message || err));
  const scanOptions = deps.scanOptions || {};

  const intervalMs = Math.max(
    MIN_INTERVAL_MS,
    Math.min(Number.parseInt(deps.intervalMs, 10) || DEFAULT_INTERVAL_MS, MAX_INTERVAL_MS)
  );
  const runOnStart = deps.runOnStart !== false;

  let handle = null;
  let running = false; // in-flight scan guard
  let lastReport = null;
  let lastError = null;
  let lastRunAt = null;
  let runCount = 0;
  let skipCount = 0;

  async function tick() {
    if (running) {
      skipCount += 1;
      return { skipped: true, reason: 'overlap' };
    }
    running = true;
    try {
      lastReport = await detector.scan(scanOptions);
      lastRunAt = new Date().toISOString();
      lastError = null;
      runCount += 1;
      if (
        lastReport &&
        lastReport.totals &&
        lastReport.totals.read_anomalies + lastReport.totals.export_anomalies > 0
      ) {
        logger.info(
          `[HrAnomalyScheduler] ${lastReport.totals.read_anomalies} read + ${lastReport.totals.export_anomalies} export anomalies flagged`
        );
      }
      return { skipped: false, report: lastReport };
    } catch (err) {
      lastError = err;
      onError(err);
      return { skipped: false, error: err.message };
    } finally {
      running = false;
    }
  }

  async function start() {
    if (handle != null) {
      return { alreadyStarted: true, intervalMs };
    }
    handle = setI(tick, intervalMs);
    logger.info(
      `[HrAnomalyScheduler] started — interval=${intervalMs}ms, runOnStart=${runOnStart}`
    );
    if (runOnStart) {
      // Fire immediately without blocking the caller.
      tick().catch(err => onError(err));
    }
    return { alreadyStarted: false, intervalMs };
  }

  function stop() {
    if (handle == null) return { stopped: false, reason: 'not_running' };
    clearI(handle);
    handle = null;
    logger.info('[HrAnomalyScheduler] stopped');
    return { stopped: true };
  }

  function isRunning() {
    return handle != null;
  }

  function getStatus() {
    return {
      isRunning: handle != null,
      scanInFlight: running,
      intervalMs,
      runOnStart,
      lastRunAt,
      runCount,
      skipCount,
      lastReport,
      lastError: lastError ? { message: lastError.message } : null,
    };
  }

  return Object.freeze({
    start,
    stop,
    isRunning,
    getStatus,
    // Exposed for direct ops-script use + testing
    tick,
  });
}

module.exports = {
  createHrAnomalyScheduler,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  DEFAULT_INTERVAL_MS,
};
