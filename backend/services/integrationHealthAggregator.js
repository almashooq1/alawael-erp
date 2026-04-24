/**
 * integrationHealthAggregator — produces a single "mission control" snapshot
 * of the entire integration subsystem. This is what feeds the ops UI and the
 * on-call runbook.
 *
 * Designed to be cheap enough for a 10s polling cadence:
 *   - No external network calls. Every data source is in-process.
 *   - Adapter `getConfig()` results are pure field reads (no IO).
 *   - DLQ + idempotency counters are O(n) over a small in-memory Map.
 *
 * Consumers:
 *   - GET /api/v1/admin/ops/integration-health (this repo)
 *   - The Next.js /admin/ops/integration-health page (sibling monorepo)
 *
 * Failure mode: every probe is independently try/catch'd. One broken adapter
 * must not black-out the whole dashboard.
 */

'use strict';

const ADAPTER_NAMES = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
];

function _safeGetAdapterConfig(name) {
  try {
    const mod = require(`./${name}Adapter`);
    if (typeof mod.getConfig === 'function') return mod.getConfig();
    return { provider: name, mode: mod.MODE || 'unknown', configured: true };
  } catch (err) {
    return { provider: name, error: err.message };
  }
}

function _sumCounters(rows, outcome) {
  return rows.filter(r => r.outcome === outcome).reduce((s, r) => s + r.value, 0);
}

function _dlqOutcomesByIntegration(rows) {
  const out = {};
  for (const r of rows) {
    if (!out[r.integration]) {
      out[r.integration] = {
        parked: 0,
        resolved: 0,
        replay_success: 0,
        replay_fail: 0,
        discarded: 0,
      };
    }
    if (r.outcome in out[r.integration]) out[r.integration][r.outcome] = r.value;
  }
  return out;
}

function _overallStatus({ anyOpenCircuit, parkedNet, unconfiguredLive }) {
  if (anyOpenCircuit || parkedNet >= 50) return 'critical';
  if (parkedNet >= 10 || unconfiguredLive > 0) return 'degraded';
  return 'healthy';
}

function buildSnapshot({ now = Date.now() } = {}) {
  const started = Date.now();

  // ── Adapters (configs + circuit state) ────────────────────────────────
  const adapters = ADAPTER_NAMES.map(name => {
    const cfg = _safeGetAdapterConfig(name);
    const circuit = cfg?.circuit || null;
    return {
      name,
      mode: cfg?.mode || 'unknown',
      configured: cfg?.configured ?? false,
      missing: cfg?.missing || [],
      circuitOpen: !!circuit?.open,
      circuitFailures: circuit?.failures ?? 0,
      circuitCooldownMs: circuit?.cooldownRemainingMs ?? 0,
      error: cfg?.error || null,
    };
  });

  // ── DLQ snapshot ──────────────────────────────────────────────────────
  let dlqCountersByIntegration = {};
  let dlqTotals = { parked: 0, resolved: 0, replay_success: 0, replay_fail: 0, discarded: 0 };
  try {
    const dlq = require('../infrastructure/deadLetterQueue');
    const rows = dlq.snapshotCounters();
    dlqCountersByIntegration = _dlqOutcomesByIntegration(rows);
    dlqTotals = {
      parked: _sumCounters(rows, 'parked'),
      resolved: _sumCounters(rows, 'resolved'),
      replay_success: _sumCounters(rows, 'replay_success'),
      replay_fail: _sumCounters(rows, 'replay_fail'),
      discarded: _sumCounters(rows, 'discarded'),
    };
  } catch (err) {
    dlqTotals.error = err.message;
  }

  // ── Idempotency snapshot ──────────────────────────────────────────────
  let idemTotals = { hit: 0, miss: 0, pending_reject: 0, invalid_key: 0 };
  let idemRoutes = [];
  try {
    const idem = require('../infrastructure/idempotencyStore');
    const rows = idem.snapshotCounters();
    idemTotals = {
      hit: _sumCounters(rows, 'hit'),
      miss: _sumCounters(rows, 'miss'),
      pending_reject: _sumCounters(rows, 'pending_reject'),
      invalid_key: _sumCounters(rows, 'invalid_key'),
    };
    // Roll up per-route for the top 10 most-active routes
    const byRoute = new Map();
    for (const r of rows) {
      if (!byRoute.has(r.route))
        byRoute.set(r.route, {
          route: r.route,
          hit: 0,
          miss: 0,
          pending_reject: 0,
          invalid_key: 0,
        });
      const bucket = byRoute.get(r.route);
      if (r.outcome in bucket) bucket[r.outcome] = r.value;
    }
    idemRoutes = Array.from(byRoute.values())
      .sort((a, b) => b.hit + b.miss - (a.hit + a.miss))
      .slice(0, 10);
  } catch (err) {
    idemTotals.error = err.message;
  }

  // ── Hit rate derived metric ───────────────────────────────────────────
  const totalIdem = idemTotals.hit + idemTotals.miss;
  const hitRate = totalIdem > 0 ? idemTotals.hit / totalIdem : null;

  // ── Replay success ratio ──────────────────────────────────────────────
  const totalReplay = dlqTotals.replay_success + dlqTotals.replay_fail;
  const replaySuccessRate = totalReplay > 0 ? dlqTotals.replay_success / totalReplay : null;

  // ── Overall status traffic light ──────────────────────────────────────
  const anyOpenCircuit = adapters.some(a => a.circuitOpen);
  const parkedNet = Math.max(0, dlqTotals.parked - dlqTotals.resolved - dlqTotals.discarded);
  const unconfiguredLive = adapters.filter(a => a.mode === 'live' && !a.configured).length;
  const overall = _overallStatus({ anyOpenCircuit, parkedNet, unconfiguredLive });

  return {
    generatedAt: new Date(now).toISOString(),
    durationMs: Date.now() - started,
    overall,
    headline: {
      adaptersTotal: adapters.length,
      adaptersLive: adapters.filter(a => a.mode === 'live').length,
      adaptersMock: adapters.filter(a => a.mode === 'mock').length,
      adaptersUnconfiguredLive: unconfiguredLive,
      openCircuits: adapters.filter(a => a.circuitOpen).length,
      parkedNet,
      dlqReplaySuccessRate: replaySuccessRate,
      idempotencyHitRate: hitRate,
    },
    adapters,
    dlq: {
      totals: dlqTotals,
      byIntegration: dlqCountersByIntegration,
    },
    idempotency: {
      totals: idemTotals,
      topRoutes: idemRoutes,
    },
  };
}

module.exports = { buildSnapshot, ADAPTER_NAMES };
