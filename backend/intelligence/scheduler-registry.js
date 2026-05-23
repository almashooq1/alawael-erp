'use strict';
/**
 * scheduler-registry.js — Wave 315
 *
 * In-process registry that every scheduler bootstrap may opt into so the
 * `/api/ops/schedulers` endpoint (W310) can surface LIVE status alongside
 * the static "is the env flag on?" view.
 *
 * Design constraints:
 *   • Zero dependencies, sync API, no I/O. Safe to call from inside cron tick.
 *   • Opt-in: a bootstrap that never calls `register()` simply has no live
 *     status in the W310 payload — the static declaration still shows.
 *   • Single source of truth for last-run telemetry; the W314 GovMetricsPage
 *     and any future Prometheus exporter can read the same map.
 *
 * Status shape per scheduler key:
 *   {
 *     key,
 *     registeredAt,        // ISO string — when bootstrap registered itself
 *     lastRunAt,           // ISO string | null
 *     lastStatus,          // 'ok' | 'failed' | null
 *     lastError,           // string | null  (truncated to 500 chars)
 *     lastDurationMs,      // number | null
 *     runs,                // total invocations recorded
 *     failures,            // count of recorded failures
 *     meta,                // optional bootstrap-supplied freeform object
 *   }
 *
 * Counters reset on process restart — for cumulative history use the W297
 * risk-metrics registry / Prometheus exporter.
 */

const _registry = new Map();

function _truncate(value, max = 500) {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : String(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Register a scheduler. Idempotent — re-registering with the same key
 * preserves accumulated counters and just refreshes `meta`.
 *
 * @param {string} key  Stable identifier matching W310's static list key.
 * @param {{meta?: object}} [opts]
 */
function register(key, opts = {}) {
  if (!key || typeof key !== 'string') {
    throw new TypeError('scheduler-registry.register: key required (string)');
  }
  const existing = _registry.get(key);
  if (existing) {
    if (opts.meta) existing.meta = opts.meta;
    return existing;
  }
  const entry = {
    key,
    registeredAt: new Date().toISOString(),
    lastRunAt: null,
    lastStatus: null,
    lastError: null,
    lastDurationMs: null,
    runs: 0,
    failures: 0,
    meta: opts.meta || null,
  };
  _registry.set(key, entry);
  return entry;
}

/**
 * Record one cron tick. The bootstrap wraps its handler in something like:
 *
 *   const started = Date.now();
 *   try {
 *     await service.runOnce();
 *     schedulerRegistry.recordRun(key, { ok: true, durationMs: Date.now() - started });
 *   } catch (err) {
 *     schedulerRegistry.recordRun(key, { ok: false, error: err, durationMs: Date.now() - started });
 *     throw err;
 *   }
 */
function recordRun(key, { ok, error = null, durationMs = null } = {}) {
  const entry = _registry.get(key) || register(key);
  entry.lastRunAt = new Date().toISOString();
  entry.lastStatus = ok ? 'ok' : 'failed';
  entry.lastError = ok ? null : _truncate(error && error.message ? error.message : error);
  entry.lastDurationMs = typeof durationMs === 'number' ? durationMs : null;
  entry.runs += 1;
  if (!ok) entry.failures += 1;
  return entry;
}

function get(key) {
  return _registry.get(key) || null;
}

function getAll() {
  return Array.from(_registry.values()).map(e => ({ ...e }));
}

/** Test helper — never call in production code paths. */
function _reset() {
  _registry.clear();
}

module.exports = {
  register,
  recordRun,
  get,
  getAll,
  _reset,
};
