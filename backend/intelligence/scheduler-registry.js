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
// W322 — opt-in durable persistence. Bootstrap flips this to true after
// hydrating from Mongo so subsequent recordRun() upserts the snapshot.
let _persistEnabled = false;

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
  // W322 — fire-and-forget durable snapshot. Never block the cron handler,
  // never throw out of recordRun. Lazy require to avoid Mongoose load at
  // module init (keeps unit tests fast + framework-agnostic).
  if (_persistEnabled) {
    try {
      const Snapshot = require('../models/SchedulerHealthSnapshot');
      Snapshot.updateOne(
        { key },
        {
          $set: {
            lastRunAt: entry.lastRunAt,
            lastStatus: entry.lastStatus,
            lastError: entry.lastError,
            lastDurationMs: entry.lastDurationMs,
            runs: entry.runs,
            failures: entry.failures,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      ).catch(() => {
        /* swallow — health persistence is best-effort */
      });
    } catch {
      /* model load failure — silently skip persistence */
    }
  }
  return entry;
}

function get(key) {
  return _registry.get(key) || null;
}

function getAll() {
  return Array.from(_registry.values()).map(e => ({ ...e }));
}

/**
 * W319 — derive a synthetic health verdict for a registry entry.
 *
 * Returns one of:
 *   'never-run'  — registered but recordRun() has not fired yet
 *   'failed'     — last recordRun was ok:false
 *   'stale'      — last successful run is older than 2× the expected cadence
 *                  (cadence is inferred from `meta.intervalMs` or `meta.schedule`
 *                   if it's a known cron pattern; otherwise undetectable → 'ok')
 *   'ok'         — last run succeeded and is within tolerance
 *
 * @param {object} entry  Entry as returned by get()/getAll()
 * @param {number} [nowMs] Override clock for tests
 * @returns {'never-run'|'failed'|'stale'|'ok'}
 */
function health(entry, nowMs = Date.now()) {
  if (!entry) return 'never-run';
  if (entry.lastStatus == null || !entry.lastRunAt) return 'never-run';
  if (entry.lastStatus === 'failed') return 'failed';
  // ok path — check staleness against expected cadence
  const cadenceMs = _inferCadenceMs(entry.meta);
  if (!cadenceMs) return 'ok'; // unknown cadence, can't judge stale
  const ageMs = nowMs - Date.parse(entry.lastRunAt);
  return ageMs > cadenceMs * 2 ? 'stale' : 'ok';
}

// Known cron expressions used by our bootstraps → next-fire-interval estimate.
// Only the patterns we actually ship matter; default = unknown (returns null).
const _CRON_CADENCE_MS = {
  '30 3 * * *': 24 * 60 * 60 * 1000, // audit-chain-archiver
  '0 3 * * *': 24 * 60 * 60 * 1000, // speech-retention-sweeper
  '0 */6 * * *': 6 * 60 * 60 * 1000, // risk-sweeper (every 6h)
  '30 2 25 * *': 30 * 24 * 60 * 60 * 1000, // mudad monthly
  '0 4 5 * *': 30 * 24 * 60 * 60 * 1000, // disability authority monthly
};

function _inferCadenceMs(meta) {
  if (!meta || typeof meta !== 'object') return null;
  if (typeof meta.intervalMs === 'number' && meta.intervalMs > 0) return meta.intervalMs;
  if (typeof meta.schedule === 'string' && _CRON_CADENCE_MS[meta.schedule]) {
    return _CRON_CADENCE_MS[meta.schedule];
  }
  return null;
}

/** Test helper — never call in production code paths. */
function _reset() {
  _registry.clear();
  _persistEnabled = false;
}

/**
 * W322 — Rehydrate the in-process registry from durable snapshots so a
 * fresh process boot doesn't misreport every scheduler as `never-run`.
 * Called by `startup/schedulerSnapshotsBootstrap.js` after Mongo is ready.
 * Returns the number of entries hydrated. Safe to call multiple times.
 */
async function hydrateFromSnapshots() {
  let hydrated = 0;
  try {
    const Snapshot = require('../models/SchedulerHealthSnapshot');
    const docs = await Snapshot.find({}).lean();
    for (const doc of docs) {
      const existing = _registry.get(doc.key) || register(doc.key);
      existing.lastRunAt = doc.lastRunAt ? new Date(doc.lastRunAt).toISOString() : null;
      existing.lastStatus = doc.lastStatus || null;
      existing.lastError = doc.lastError || null;
      existing.lastDurationMs = typeof doc.lastDurationMs === 'number' ? doc.lastDurationMs : null;
      existing.runs = doc.runs || 0;
      existing.failures = doc.failures || 0;
      hydrated += 1;
    }
  } catch {
    /* model unavailable — boot continues with empty registry */
  }
  _persistEnabled = true;
  return hydrated;
}

module.exports = {
  register,
  recordRun,
  get,
  getAll,
  health,
  hydrateFromSnapshots,
  _reset,
};
