/**
 * kpiHistoryStore.service.js — bounded rolling history of KPI
 * values per (kpiId, scope) tuple.
 *
 * Phase 18 Commit 6.
 *
 * The anomaly detector needs recent `{ t, v }` points to build an
 * EWMA baseline. This store holds them in memory with:
 *
 *   - a hard cap per series (`maxPointsPerSeries`) — LRU-evicts
 *     the oldest value when full
 *   - a TTL per series (`ttlMs`) — the whole series expires if no
 *     write happens in the window
 *   - a total series cap (`maxSeries`) — per-process safety valve
 *
 * The public shape matches a Redis-friendly interface so a Redis
 * replacement plugs in later without changing callers.
 */

'use strict';

const DEFAULT_MAX_POINTS_PER_SERIES = 90;
const DEFAULT_MAX_SERIES = 2000;
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function serialiseScope(scope) {
  if (scope == null) return '';
  if (typeof scope === 'string') return scope;
  try {
    return JSON.stringify(scope);
  } catch (_) {
    return String(scope);
  }
}

function seriesKey(kpiId, scope) {
  return `${kpiId}::${serialiseScope(scope)}`;
}

function createInMemoryHistoryStore({
  maxPointsPerSeries = DEFAULT_MAX_POINTS_PER_SERIES,
  maxSeries = DEFAULT_MAX_SERIES,
  ttlMs = DEFAULT_TTL_MS,
  clock = { now: () => Date.now() },
} = {}) {
  const store = new Map();

  function evictExpired() {
    const now = clock.now();
    for (const [k, entry] of store.entries()) {
      if (entry.expiresAt < now) store.delete(k);
    }
  }

  function sweepLru() {
    while (store.size > maxSeries) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  }

  function record({ kpiId, scope = null, value, t } = {}) {
    if (typeof kpiId !== 'string' || !kpiId) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;

    const ts = typeof t === 'number' ? t : clock.now();
    const key = seriesKey(kpiId, scope);

    const existing = store.get(key);
    const series = existing ? existing.points.slice() : [];

    // Reject out-of-order or duplicate-same-ms writes — keep the
    // series strictly increasing on `t`.
    if (series.length > 0 && ts <= series[series.length - 1].t) return existing;

    series.push({ t: ts, v: value });
    while (series.length > maxPointsPerSeries) series.shift();

    const entry = {
      key,
      kpiId,
      scope,
      points: series,
      expiresAt: clock.now() + ttlMs,
      updatedAt: clock.now(),
    };
    store.delete(key);
    store.set(key, entry);
    sweepLru();
    return entry;
  }

  function series({ kpiId, scope = null } = {}) {
    evictExpired();
    const entry = store.get(seriesKey(kpiId, scope));
    if (!entry) return [];
    return entry.points.slice();
  }

  function remove({ kpiId, scope = null } = {}) {
    store.delete(seriesKey(kpiId, scope));
  }

  function list() {
    evictExpired();
    return Array.from(store.values());
  }

  function size() {
    evictExpired();
    return store.size;
  }

  function clear() {
    store.clear();
  }

  return { record, series, remove, list, size, clear };
}

module.exports = {
  createInMemoryHistoryStore,
  seriesKey,
  DEFAULT_MAX_POINTS_PER_SERIES,
  DEFAULT_MAX_SERIES,
  DEFAULT_TTL_MS,
};
