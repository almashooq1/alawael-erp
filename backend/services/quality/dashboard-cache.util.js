'use strict';

/**
 * dashboard-cache.util.js — W355.
 *
 * Generic time-bound LRU cache for read-only dashboard aggregations
 * (W350-W353 branchQualityHeatmap / therapistWorkload / executiveOnePage).
 *
 * Why: each /api/quality/branch-heatmap request fires 5 MongoDB aggregations
 * across 5 collections. An executive refreshing the page every 30 seconds
 * generates 10 aggregations/min. A 60s TTL cuts this to 1 aggregation/min
 * (~95% load reduction) with no staleness concern (the underlying CAPA / Audit
 * collections change on human-action cadence, not sub-minute).
 *
 * Design:
 *   - Per-process in-memory cache (Map). NOT a distributed cache — each Node
 *     worker has its own; that's fine for read-only data with short TTL.
 *   - Key = method name + JSON-stringified args (stable for same inputs).
 *   - TTL configurable per-key on set(); default 60_000 ms.
 *   - Max entries cap (default 500) with LRU eviction when full — protects
 *     against unbounded growth if someone passes high-cardinality inputs.
 *   - Stats (hits / misses / evictions) for ops observability.
 *
 * Public surface:
 *   createDashboardCache({ maxEntries=500, defaultTtlMs=60_000, logger })
 *     .get(key)              — returns value or undefined; expired entries
 *                              are deleted on access.
 *     .set(key, value, ttl?) — stores; ttl overrides default.
 *     .wrap(fn, {keyer, ttl}) — returns a memoized version of fn.
 *     .invalidateAll()       — clear cache (e.g. on test boundary).
 *     .stats()               — { size, hits, misses, evictions, hitRate }.
 *
 *   stableJsonKey(args)      — deterministic JSON of args (sorted keys);
 *                              undefined args become 'undefined' not omitted
 *                              so different call signatures hash distinctly.
 *
 * NOT in scope here:
 *   - Distributed cache (Redis). Add when load justifies it.
 *   - Cache-tag invalidation. Today's TTL is short enough that consumers
 *     don't need explicit invalidation — staleness <60s is acceptable.
 */

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 60_000;

function stableJsonKey(args) {
  // JSON.stringify is enough for dashboard inputs (strings, arrays, dates).
  // Sort object keys for determinism; Date → ISO; undefined → null sentinel.
  function replacer(_k, v) {
    if (v === undefined) return null;
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sorted = {};
      for (const k of Object.keys(v).sort()) sorted[k] = v[k];
      return sorted;
    }
    return v;
  }
  return JSON.stringify(args, replacer);
}

function createDashboardCache(opts = {}) {
  const {
    maxEntries = DEFAULT_MAX_ENTRIES,
    defaultTtlMs = DEFAULT_TTL_MS,
    logger = console,
    // injectable clock for tests
    now = () => Date.now(),
  } = opts;

  const store = new Map(); // key → { value, expiresAt }
  let hits = 0;
  let misses = 0;
  let evictions = 0;

  function _evictOldestIfFull() {
    if (store.size < maxEntries) return;
    // Map iteration is insertion-ordered → first key is oldest
    const oldest = store.keys().next().value;
    if (oldest !== undefined) {
      store.delete(oldest);
      evictions += 1;
    }
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) {
      misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= now()) {
      store.delete(key);
      misses += 1;
      return undefined;
    }
    // Move to back of insertion order (LRU touch)
    store.delete(key);
    store.set(key, entry);
    hits += 1;
    return entry.value;
  }

  function set(key, value, ttlMs = defaultTtlMs) {
    if (store.has(key)) {
      store.delete(key); // remove old position so insert goes to back
    } else {
      _evictOldestIfFull();
    }
    store.set(key, { value, expiresAt: now() + ttlMs });
  }

  function wrap(fn, wrapOpts = {}) {
    const { keyer = stableJsonKey, ttl = defaultTtlMs, namespace = fn.name || 'anon' } = wrapOpts;
    return async function memoized(...args) {
      const key = `${namespace}::${keyer(args)}`;
      const cached = get(key);
      if (cached !== undefined) return cached;
      try {
        const value = await fn(...args);
        if (value !== undefined) set(key, value, ttl);
        return value;
      } catch (err) {
        // Don't cache errors — let the next call retry.
        logger.warn?.(`[dashboard-cache] ${namespace} call failed: ${err.message}`);
        throw err;
      }
    };
  }

  function invalidateAll() {
    store.clear();
    hits = 0;
    misses = 0;
    evictions = 0;
  }

  function stats() {
    const total = hits + misses;
    return {
      size: store.size,
      maxEntries,
      defaultTtlMs,
      hits,
      misses,
      evictions,
      hitRate: total > 0 ? hits / total : 0,
    };
  }

  return { get, set, wrap, invalidateAll, stats };
}

module.exports = {
  createDashboardCache,
  stableJsonKey,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_TTL_MS,
};
