/**
 * adapterMetricsRegistry.js — in-memory counters + latency histogram
 * for gov adapter calls. The Prometheus metrics endpoint reads from
 * here; adapterAuditLogger writes to here on every call.
 *
 * Why not compute from Mongo on every scrape? Prometheus scrapes every
 * 15–30s by default. Aggregating the AdapterAudit collection that often
 * would put real load on the DB and scale poorly with audit volume.
 * In-memory counters are O(1) and monotonically-increasing (exactly
 * what `rate()` in PromQL expects).
 *
 * Shape:
 *   counters[provider][status] = number       // status ∈ success|failed|rate_limited
 *   latency[provider] = { count, sum, buckets: { le-50ms, le-200ms, le-1s, le-5s, +Inf } }
 *
 * Reset semantics:
 *   • Counters are monotonic — DON'T reset them on scrape. Prometheus
 *     computes deltas via rate(). A process restart naturally resets;
 *     scrapers handle this via `resets()`.
 *   • `_resetAll()` is for tests only.
 */

'use strict';

// Prometheus histogram buckets — powers-of-ten-ish with a cap at 5s
// since anything above 5s is "broken" for a verification call.
const BUCKETS = [50, 200, 1000, 5000, Infinity];

const counters = new Map(); // provider -> { success: n, failed: n, rate_limited: n }
const latency = new Map(); // provider -> { count, sum, buckets: [...] }

function _ensureCounters(provider) {
  if (!counters.has(provider)) {
    counters.set(provider, { success: 0, failed: 0, rate_limited: 0 });
  }
  return counters.get(provider);
}

function _ensureLatency(provider) {
  if (!latency.has(provider)) {
    latency.set(provider, {
      count: 0,
      sum: 0,
      buckets: BUCKETS.map(() => 0),
    });
  }
  return latency.get(provider);
}

function recordCall({ provider, status, success, latencyMs }) {
  if (!provider) return;
  const c = _ensureCounters(provider);
  if (status === 'rate_limited') c.rate_limited += 1;
  else if (success === false || status === 'error') c.failed += 1;
  else c.success += 1;

  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    const l = _ensureLatency(provider);
    l.count += 1;
    l.sum += latencyMs;
    // Non-cumulative: increment only the FIRST bucket the value fits in.
    // The Prometheus output layer converts to cumulative on emit (which
    // is what `le=` buckets are supposed to represent).
    for (let i = 0; i < BUCKETS.length; i += 1) {
      if (latencyMs <= BUCKETS[i]) {
        l.buckets[i] += 1;
        break;
      }
    }
  }
}

function snapshotCounters() {
  const out = {};
  for (const [p, c] of counters) out[p] = { ...c };
  return out;
}

function snapshotLatency() {
  const out = {};
  for (const [p, l] of latency) {
    out[p] = {
      count: l.count,
      sum: l.sum,
      buckets: BUCKETS.map((b, i) => ({ le: b, count: l.buckets[i] })),
    };
  }
  return out;
}

function _resetAll() {
  counters.clear();
  latency.clear();
}

module.exports = {
  recordCall,
  snapshotCounters,
  snapshotLatency,
  _resetAll,
  BUCKETS,
};
