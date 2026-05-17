'use strict';

/**
 * orchestrator-scheduler.service.js — Wave 28.
 *
 * Wraps the Wave-20 orchestrator with a clock-driven scheduler.
 * Each generator has its own cadence (defined here, NOT in the
 * generator itself — keeps generators pure functions):
 *
 *   care-gap.v1          → every 30 min
 *   anomaly.v1           → every 15 min
 *   trend-deviation.v1   → every 60 min
 *   data-quality.v1      → every 60 min
 *   end-of-day.v1        → daily at 16:30 KSA
 *   executive-digest.v1  → weekly Monday 07:00 KSA
 *
 * The scheduler maintains a `nextRunAt` clock per generator. On each
 * tick (default 60s), it checks every registered generator and runs
 * the ones whose `nextRunAt` has passed.
 *
 * No timezones libraries — we use UTC + a small offset helper for KSA
 * (UTC+3, no DST). Simpler than dragging in moment-timezone.
 *
 * Boot is opt-in via the `INTELLIGENCE_ORCHESTRATOR_ENABLED` env flag.
 * Off by default so test environments don't tick.
 */

const KSA_OFFSET_MIN = 180; // UTC+3, no DST

// Cadence types
const CADENCE_INTERVAL_MIN = 'interval-min'; // every N minutes
const CADENCE_DAILY_KSA = 'daily-ksa'; // every day at HH:MM KSA
const CADENCE_WEEKLY_KSA = 'weekly-ksa'; // every week DAY at HH:MM KSA

// Built-in cadence table keyed by generator id. App.js / caller may
// override or extend by passing a `cadences` option.
const DEFAULT_CADENCES = Object.freeze({
  'care-gap.v1': { type: CADENCE_INTERVAL_MIN, everyMin: 30 },
  'anomaly.v1': { type: CADENCE_INTERVAL_MIN, everyMin: 15 },
  'trend-deviation.v1': { type: CADENCE_INTERVAL_MIN, everyMin: 60 },
  'data-quality.v1': { type: CADENCE_INTERVAL_MIN, everyMin: 60 },
  'end-of-day.v1': { type: CADENCE_DAILY_KSA, hour: 16, minute: 30 },
  'executive-digest.v1': { type: CADENCE_WEEKLY_KSA, dayOfWeek: 1, hour: 7, minute: 0 }, // Monday
});

function ksaToUtcDate(ksaHour, ksaMinute, base = new Date()) {
  // Compute the next UTC instant matching the given KSA time-of-day.
  const utc = new Date(base);
  // Strip seconds and ms — schedules align to the minute.
  utc.setUTCSeconds(0, 0);
  // Convert KSA HH:MM → UTC HH:MM = KSA HH:MM minus 3h.
  let utcHour = ksaHour - 3;
  let dayShift = 0;
  if (utcHour < 0) {
    utcHour += 24;
    dayShift = -1;
  }
  utc.setUTCHours(utcHour, ksaMinute, 0, 0);
  if (dayShift) utc.setUTCDate(utc.getUTCDate() + dayShift);
  // If the target is in the past, push it forward by 1 day.
  if (utc <= base) utc.setUTCDate(utc.getUTCDate() + 1);
  return utc;
}

function computeNextRun(cadence, lastRunAt, now) {
  if (!cadence) return null;
  const base = lastRunAt instanceof Date ? new Date(lastRunAt) : new Date(now);
  if (cadence.type === CADENCE_INTERVAL_MIN) {
    const next = new Date(base.getTime() + (cadence.everyMin || 60) * 60_000);
    // If schedule lags (process restart), don't fire all the missed
    // ticks at once — jump forward to "now + 1 tick" instead.
    if (next < now) {
      return new Date(now.getTime() + (cadence.everyMin || 60) * 60_000);
    }
    return next;
  }
  if (cadence.type === CADENCE_DAILY_KSA) {
    return ksaToUtcDate(cadence.hour, cadence.minute || 0, now);
  }
  if (cadence.type === CADENCE_WEEKLY_KSA) {
    // First compute the next daily occurrence, then walk forward to
    // the target day-of-week.
    const candidate = ksaToUtcDate(cadence.hour, cadence.minute || 0, now);
    const targetDay = cadence.dayOfWeek; // 0=Sun..6=Sat (UTC perspective is fine — KSA is +3, day rarely shifts at common hours)
    while (candidate.getUTCDay() !== targetDay) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 7);
    return candidate;
  }
  return null;
}

/**
 * @param {object} opts
 *   - orchestrator     — Wave-20 orchestrator instance (runGenerator required)
 *   - cadences         — per-generator cadence overrides (merged with DEFAULT_CADENCES)
 *   - tickIntervalMs   — how often the scheduler wakes (default 60_000)
 *   - now              — clock injection (() => Date)
 *   - logger           — console-compatible
 */
function createOrchestratorScheduler({
  orchestrator,
  cadences = {},
  tickIntervalMs = 60_000,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (!orchestrator || typeof orchestrator.runGenerator !== 'function') {
    throw new Error('orchestrator-scheduler: orchestrator with runGenerator is required');
  }

  // Merged cadence map. Anything in DEFAULT_CADENCES not overridden
  // stays as-is; caller can add new generator entries or set null to
  // disable a built-in.
  const cadenceMap = { ...DEFAULT_CADENCES, ...cadences };

  // Per-generator clock state
  const state = new Map(); // generatorId → { nextRunAt, lastRunAt, runs, failures, lastError }

  function ensureState(generatorId) {
    if (!state.has(generatorId)) {
      const cadence = cadenceMap[generatorId];
      const nextRunAt = cadence ? computeNextRun(cadence, null, now()) : null;
      state.set(generatorId, {
        cadence,
        nextRunAt,
        lastRunAt: null,
        runs: 0,
        failures: 0,
        lastError: null,
      });
    }
    return state.get(generatorId);
  }

  /**
   * Run a single generator regardless of its cadence (admin "run now").
   */
  async function runNow(generatorId) {
    const s = ensureState(generatorId);
    s.lastRunAt = now();
    s.runs += 1;
    try {
      const result = await orchestrator.runGenerator(generatorId);
      if (result?.failures && result.failures > 0) s.failures += result.failures;
      // Recompute nextRunAt from now (NOT from lastRunAt — admin-fired
      // runs reset the cadence)
      if (s.cadence) s.nextRunAt = computeNextRun(s.cadence, now(), now());
      return result;
    } catch (err) {
      s.failures += 1;
      s.lastError = err.message;
      logger.warn && logger.warn(`[scheduler] ${generatorId} runNow failed: ${err.message}`);
      return { generatorId, error: err.message, failures: 1 };
    }
  }

  /**
   * One scheduler tick. Walks every registered generator and fires
   * the ones whose nextRunAt has passed. Returns the list of fired
   * generators + their results.
   */
  async function tick() {
    const at = now();
    const fired = [];
    for (const [generatorId, cadence] of Object.entries(cadenceMap)) {
      if (!cadence) continue; // explicitly disabled
      const s = ensureState(generatorId);
      if (!s.nextRunAt || s.nextRunAt > at) continue;
      // Time to fire
      s.lastRunAt = at;
      s.runs += 1;
      try {
        const result = await orchestrator.runGenerator(generatorId);
        if (result?.failures && result.failures > 0) s.failures += result.failures;
        s.nextRunAt = computeNextRun(cadence, at, now());
        fired.push({ generatorId, result, firedAt: at });
      } catch (err) {
        s.failures += 1;
        s.lastError = err.message;
        s.nextRunAt = computeNextRun(cadence, at, now()); // still schedule next
        fired.push({ generatorId, error: err.message, firedAt: at });
        logger.warn && logger.warn(`[scheduler] ${generatorId} tick failed: ${err.message}`);
      }
    }
    return { tickAt: at, fired };
  }

  let timer = null;

  /**
   * Start the recurring tick. Returns a stop() handle.
   */
  function start() {
    if (timer) return { alreadyStarted: true, stop: stop };
    timer = setInterval(() => {
      tick().catch(err => {
        logger.warn && logger.warn(`[scheduler] tick crashed: ${err.message}`);
      });
    }, tickIntervalMs);
    if (timer.unref) timer.unref();
    logger.info &&
      logger.info(`[scheduler] started — tick every ${Math.round(tickIntervalMs / 1000)}s`);
    return { stop };
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      logger.info && logger.info('[scheduler] stopped');
    }
  }

  function getStatus() {
    const out = {};
    for (const [gid, s] of state.entries()) {
      out[gid] = {
        cadence: s.cadence,
        nextRunAt: s.nextRunAt,
        lastRunAt: s.lastRunAt,
        runs: s.runs,
        failures: s.failures,
        lastError: s.lastError,
      };
    }
    return {
      generators: out,
      registeredCount: Object.keys(cadenceMap).filter(k => cadenceMap[k]).length,
      tickIntervalMs,
    };
  }

  // Pre-initialize state for every cadence entry so getStatus is
  // useful before the first tick.
  for (const generatorId of Object.keys(cadenceMap)) {
    if (cadenceMap[generatorId]) ensureState(generatorId);
  }

  return {
    start,
    stop,
    tick,
    runNow,
    getStatus,
    _internal: { ksaToUtcDate, computeNextRun },
  };
}

module.exports = {
  createOrchestratorScheduler,
  DEFAULT_CADENCES,
  CADENCE_INTERVAL_MIN,
  CADENCE_DAILY_KSA,
  CADENCE_WEEKLY_KSA,
};
