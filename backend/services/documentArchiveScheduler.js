'use strict';
/**
 * Document Archive Scheduler — جدولة المسح التلقائي لتوصيات الأرشفة
 * ══════════════════════════════════════════════════════════════════════════
 * Runs `documentArchiveSmart.scanAndRecommend()` on a fixed interval.
 * Default cadence is 24 hours (archive recommendations don't need to be
 * fresher than that — the underlying signals shift slowly).
 *
 * Toggle via env:
 *   ARCHIVE_SCAN_DISABLED=1        → don't start the timer
 *   ARCHIVE_SCAN_INTERVAL_MS=...   → override cadence
 *   ARCHIVE_SCAN_IDLE_MONTHS=...   → override idle threshold (default 6)
 *   ARCHIVE_SCAN_MIN_SCORE=...     → override recommendation cutoff (0.5)
 *
 * Pure factory — no side effects until `start()` is called. The timer
 * is `.unref()`-ed so it never blocks process exit.
 */

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function createDocumentArchiveScheduler({ logger, smartService, intervalMs } = {}) {
  const log = logger || console;
  const svc =
    smartService ||
    (() => {
      try {
        return require('./documentArchiveSmart.service');
      } catch (_) {
        return null;
      }
    })();

  if (!svc) {
    log.warn('[ArchiveScheduler] smart service unavailable — scheduler inert');
    return { start: () => null, stop: () => {}, runOnce: async () => null, isRunning: () => false };
  }

  const cadence =
    Number(intervalMs) || Number(process.env.ARCHIVE_SCAN_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const idleMonths = Number(process.env.ARCHIVE_SCAN_IDLE_MONTHS) || 6;
  const minScore = Number(process.env.ARCHIVE_SCAN_MIN_SCORE) || 0.5;

  let timer = null;
  let lastResult = null;
  let lastRunAt = null;

  async function runOnce() {
    try {
      const start = Date.now();
      const result = await svc.scanAndRecommend({ idleMonths, minScore });
      const ms = Date.now() - start;
      lastResult = result;
      lastRunAt = new Date();
      log.info(
        `[ArchiveScheduler] scan complete in ${ms}ms — ` +
          `scanned=${result.scanned} recommended=${result.recommended} ` +
          `bands=${JSON.stringify(result.byBand)}`
      );
      return result;
    } catch (err) {
      log.warn(`[ArchiveScheduler] scan failed: ${err.message}`);
      return null;
    }
  }

  function start() {
    if (timer) return timer;
    if (process.env.ARCHIVE_SCAN_DISABLED === '1') {
      log.info('[ArchiveScheduler] disabled via ARCHIVE_SCAN_DISABLED=1');
      return null;
    }
    timer = setInterval(runOnce, cadence);
    if (typeof timer.unref === 'function') timer.unref();
    log.info(
      `[ArchiveScheduler] ✓ armed every ${Math.round(cadence / 60000)}m ` +
        `(idleMonths=${idleMonths}, minScore=${minScore})`
    );
    return timer;
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    runOnce,
    isRunning: () => timer != null,
    getLastResult: () => lastResult,
    getLastRunAt: () => lastRunAt,
  };
}

module.exports = createDocumentArchiveScheduler;
