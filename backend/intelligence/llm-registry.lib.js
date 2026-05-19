'use strict';

/**
 * llm-registry.lib.js — Wave 131 / shared LLM ops.
 *
 * Lightweight in-process registry of LLM services that expose
 * `getTelemetry()` (the Wave-128 contract). Lets a single admin
 * endpoint enumerate all LLM activity across the codebase without
 * the route needing to know the topology.
 *
 * Public factory:
 *   createLlmRegistry({ logger? }) → {
 *     register(name, service),
 *     unregister(name),
 *     list(),
 *     getService(name),
 *     getAllTelemetry({since?, bucketHours?}),
 *     reset(),
 *     _size(),
 *   }
 *
 * `service` must satisfy: `service.getTelemetry({since?, bucketHours?})`
 * exists and returns the Wave-128 telemetry shape.
 *
 * `getAllTelemetry` invokes each registered service's `getTelemetry`
 * and returns `{ services: {<name>: telemetry}, merged: {<totals>} }`.
 * Services that throw are isolated — their slot becomes `{ok:false,
 * reason:'TELEMETRY_THREW', message}` and the rest still aggregate.
 *
 * The merged section sums the lib's standard counters across all
 * services + computes cross-service rates. Bucket merging is NOT
 * attempted (bucket timestamps may differ per service; the UI
 * displays per-service buckets side-by-side).
 *
 * Pure (no I/O beyond delegating). One module-level singleton via
 * `getDefaultRegistry()` keeps a process-wide map without globals
 * leaking outside this file.
 */

function createLlmRegistry({ logger = console } = {}) {
  const services = new Map();

  function _validate(name, service) {
    if (!name || typeof name !== 'string') {
      throw new Error('llm-registry: name must be a non-empty string');
    }
    if (!service || typeof service.getTelemetry !== 'function') {
      throw new Error(
        `llm-registry: service "${name}" must expose getTelemetry({since?, bucketHours?})`
      );
    }
  }

  function register(name, service) {
    _validate(name, service);
    services.set(name, service);
    return { ok: true, name };
  }

  function unregister(name) {
    return { ok: true, removed: services.delete(name) };
  }

  function list() {
    return Array.from(services.keys()).sort();
  }

  function getService(name) {
    return services.get(name) || null;
  }

  function getAllTelemetry({ since = null, bucketHours = 1 } = {}) {
    const perService = {};
    const merged = {
      calls: 0,
      llmCalls: 0,
      cacheHits: 0,
      rejects: 0,
      failures: 0,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
    let latencySum = 0;
    let latencyN = 0;
    const byReason = {};
    const byIntent = {};

    for (const [name, service] of services.entries()) {
      let result;
      try {
        result = service.getTelemetry({ since, bucketHours });
      } catch (err) {
        logger.warn && logger.warn(`[llm-registry] ${name}.getTelemetry threw: ${err.message}`);
        perService[name] = {
          ok: false,
          reason: 'TELEMETRY_THREW',
          message: err.message,
        };
        continue;
      }
      perService[name] = result;
      if (!result || !result.ok) continue;
      const t = result.totals || {};
      merged.calls += t.calls || 0;
      merged.llmCalls += t.llmCalls || 0;
      merged.cacheHits += t.cacheHits || 0;
      merged.rejects += t.rejects || 0;
      merged.failures += t.failures || 0;
      merged.tokensIn += t.tokensIn || 0;
      merged.tokensOut += t.tokensOut || 0;
      merged.costUsd = _round6(merged.costUsd + (t.costUsd || 0));
      if (t.avgLatencyMs > 0 && t.llmCalls > 0) {
        latencySum += t.avgLatencyMs * t.llmCalls;
        latencyN += t.llmCalls;
      }
      const r = result.byReason || {};
      for (const key of Object.keys(r)) {
        byReason[key] = (byReason[key] || 0) + r[key];
      }
      const i = result.byIntent || {};
      for (const key of Object.keys(i)) {
        byIntent[key] = (byIntent[key] || 0) + i[key];
      }
    }

    const denom = merged.calls || 1;
    const mergedTotals = {
      ...merged,
      cacheHitRate: _round4(merged.cacheHits / denom),
      fallbackRate: _round4((merged.rejects + merged.failures) / denom),
      failureRate: _round4(merged.failures / denom),
      avgLatencyMs: latencyN > 0 ? Math.round(latencySum / latencyN) : 0,
    };

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      serviceCount: services.size,
      services: perService,
      merged: {
        totals: mergedTotals,
        byReason,
        byIntent,
      },
    };
  }

  /**
   * Wave 134: cross-service aggregation from PERSISTENT storage.
   * Same merging semantics as getAllTelemetry but each service's
   * `getPersistedTelemetry(opts)` is awaited. Services that lack
   * persistence surface as `{ok:false, reason:'PERSIST_UNAVAILABLE'}`
   * in their slot and skip the merge.
   */
  async function getAllPersistedTelemetry({ since = null, until = null, bucketHours = 1 } = {}) {
    const perService = {};
    const merged = {
      calls: 0,
      llmCalls: 0,
      cacheHits: 0,
      rejects: 0,
      failures: 0,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    };
    let latencySum = 0;
    let latencyN = 0;
    const byReason = {};
    const byIntent = {};

    for (const [name, service] of services.entries()) {
      let result;
      if (typeof service.getPersistedTelemetry !== 'function') {
        perService[name] = { ok: false, reason: 'PERSIST_UNAVAILABLE' };
        continue;
      }
      try {
        result = await service.getPersistedTelemetry({ since, until, bucketHours });
      } catch (err) {
        logger.warn &&
          logger.warn(`[llm-registry] ${name}.getPersistedTelemetry threw: ${err.message}`);
        perService[name] = {
          ok: false,
          reason: 'TELEMETRY_THREW',
          message: err.message,
        };
        continue;
      }
      perService[name] = result;
      if (!result || !result.ok) continue;
      const t = result.totals || {};
      merged.calls += t.calls || 0;
      merged.llmCalls += t.llmCalls || 0;
      merged.cacheHits += t.cacheHits || 0;
      merged.rejects += t.rejects || 0;
      merged.failures += t.failures || 0;
      merged.tokensIn += t.tokensIn || 0;
      merged.tokensOut += t.tokensOut || 0;
      merged.costUsd = _round6(merged.costUsd + (t.costUsd || 0));
      if (t.avgLatencyMs > 0 && t.llmCalls > 0) {
        latencySum += t.avgLatencyMs * t.llmCalls;
        latencyN += t.llmCalls;
      }
      const r = result.byReason || {};
      for (const key of Object.keys(r)) {
        byReason[key] = (byReason[key] || 0) + r[key];
      }
      const i = result.byIntent || {};
      for (const key of Object.keys(i)) {
        byIntent[key] = (byIntent[key] || 0) + i[key];
      }
    }

    const denom = merged.calls || 1;
    const mergedTotals = {
      ...merged,
      cacheHitRate: _round4(merged.cacheHits / denom),
      fallbackRate: _round4((merged.rejects + merged.failures) / denom),
      failureRate: _round4(merged.failures / denom),
      avgLatencyMs: latencyN > 0 ? Math.round(latencySum / latencyN) : 0,
    };

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      source: 'persisted',
      serviceCount: services.size,
      services: perService,
      merged: {
        totals: mergedTotals,
        byReason,
        byIntent,
      },
    };
  }

  function reset() {
    services.clear();
  }

  function _size() {
    return services.size;
  }

  return {
    register,
    unregister,
    list,
    getService,
    getAllTelemetry,
    getAllPersistedTelemetry,
    reset,
    _size,
  };
}

// ─── Process-wide default registry ─────────────────────────────────
// One per process so bootstrap can register at boot + routes read at
// request time without a complicated DI graph. Tests should create
// fresh registries via `createLlmRegistry()` rather than rely on the
// default singleton.

let _defaultRegistry = null;
function getDefaultRegistry({ logger = console } = {}) {
  if (!_defaultRegistry) {
    _defaultRegistry = createLlmRegistry({ logger });
  }
  return _defaultRegistry;
}
function resetDefaultRegistry() {
  _defaultRegistry = null;
}

// ─── Pure helpers ──────────────────────────────────────────────────

function _round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function _round6(n) {
  return Math.round(Number(n) * 1_000_000) / 1_000_000;
}

module.exports = {
  createLlmRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
};
