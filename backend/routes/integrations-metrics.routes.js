/**
 * integrations-metrics.routes.js — Prometheus text-format metrics for
 * all Saudi gov-adapter subsystems.
 *
 * Mount at /api/health/metrics/integrations  (public, no auth).
 *
 * Why unauth: scrapers (Prometheus, Grafana Agent, Datadog, Kubernetes
 * ServiceMonitor) don't usually ship JWTs. The output intentionally
 * carries no PII — just counters and gauges per provider.
 *
 * Output contract (text/plain; version=0.0.4):
 *
 *   # HELP gov_adapter_rate_limit_capacity Token bucket capacity.
 *   # TYPE gov_adapter_rate_limit_capacity gauge
 *   gov_adapter_rate_limit_capacity{provider="gosi"} 60
 *   gov_adapter_rate_limit_available{provider="gosi"} 42
 *   gov_adapter_rate_limit_utilization_percent{provider="gosi"} 30
 *   gov_adapter_rate_limit_active_actors{provider="gosi"} 3
 *   gov_adapter_circuit_open{provider="gosi"} 0
 *   gov_adapter_circuit_failures{provider="gosi"} 0
 *   gov_adapter_circuit_cooldown_ms{provider="gosi"} 0
 *   gov_adapter_configured{provider="gosi"} 1
 *   gov_adapter_mode{provider="gosi",mode="mock"} 1
 *
 * Alertmanager rule examples (see docs/alerts/gov-integrations.yml):
 *   • gov_adapter_circuit_open == 1         → PAGE
 *   • gov_adapter_rate_limit_utilization_percent > 85 → WARN
 *   • gov_adapter_configured == 0           → WARN
 */

'use strict';

const express = require('express');
const router = express.Router();

const rateLimiter = require('../services/adapterRateLimiter');
const circuitBreaker = require('../services/adapterCircuitBreaker');

// Adapters we know exist. Pulling in getConfig lets us report mode +
// configured without every adapter needing to re-implement.
const ADAPTERS = [
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

// Lazily require each adapter so a broken one doesn't crash the
// metrics endpoint (metrics must be resilient — monitoring the
// monitor is a classic failure mode).
function safeGetConfig(name) {
  try {
    const mod = require(`../services/${name}Adapter`);
    if (typeof mod.getConfig === 'function') return mod.getConfig();
  } catch {
    /* ignore */
  }
  return null;
}

function escapeLabel(v) {
  return String(v || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

function metric(lines, name, help, type, samples) {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);
  for (const s of samples) {
    const labels = Object.entries(s.labels || {})
      .map(([k, v]) => `${k}="${escapeLabel(v)}"`)
      .join(',');
    lines.push(`${name}${labels ? `{${labels}}` : ''} ${s.value}`);
  }
}

router.get('/', (req, res) => {
  const lines = [];

  const rl = ADAPTERS.map(p => ({ name: p, snap: rateLimiter.status(p) }));

  metric(
    lines,
    'gov_adapter_rate_limit_capacity',
    'Token bucket capacity per provider.',
    'gauge',
    rl.map(x => ({ labels: { provider: x.name }, value: x.snap.capacity }))
  );
  metric(
    lines,
    'gov_adapter_rate_limit_available',
    'Tokens currently available per provider.',
    'gauge',
    rl.map(x => ({ labels: { provider: x.name }, value: x.snap.available }))
  );
  metric(
    lines,
    'gov_adapter_rate_limit_utilization_percent',
    'Percent of provider pool currently consumed.',
    'gauge',
    rl.map(x => ({ labels: { provider: x.name }, value: x.snap.utilization }))
  );
  metric(
    lines,
    'gov_adapter_rate_limit_active_actors',
    'Distinct actors with activity in the last 60 seconds.',
    'gauge',
    rl.map(x => ({ labels: { provider: x.name }, value: x.snap.activeActors }))
  );

  // Circuit breakers — only the 4 paid adapters (gosi/absher/nphies/fatoora)
  // register instances. Unregistered providers get 0 so the metric name
  // stays dimensionally consistent.
  const cb = ADAPTERS.map(p => {
    const b = circuitBreaker.get(p);
    return { name: p, snap: b ? b.snapshot() : null };
  });

  metric(
    lines,
    'gov_adapter_circuit_open',
    '1 if circuit breaker is open (upstream considered down), 0 otherwise.',
    'gauge',
    cb.map(x => ({
      labels: { provider: x.name },
      value: x.snap ? (x.snap.open ? 1 : 0) : 0,
    }))
  );
  metric(
    lines,
    'gov_adapter_circuit_failures',
    'Consecutive failures in the current rolling window.',
    'gauge',
    cb.map(x => ({ labels: { provider: x.name }, value: x.snap ? x.snap.failures : 0 }))
  );
  metric(
    lines,
    'gov_adapter_circuit_cooldown_ms',
    'Milliseconds remaining until an open circuit auto-closes (0 if closed).',
    'gauge',
    cb.map(x => ({
      labels: { provider: x.name },
      value: x.snap ? x.snap.cooldownRemainingMs : 0,
    }))
  );

  // Configuration / mode — useful for "someone flipped this to live"
  // alerting, and for spotting misconfigured providers in prod.
  const cfgs = ADAPTERS.map(p => ({ name: p, cfg: safeGetConfig(p) }));

  metric(
    lines,
    'gov_adapter_configured',
    '1 if provider has all required credentials (or is in mock mode).',
    'gauge',
    cfgs.map(x => ({
      labels: { provider: x.name },
      value: x.cfg?.configured ? 1 : 0,
    }))
  );
  metric(
    lines,
    'gov_adapter_mode',
    'Current mode per provider (mock=0, live=1, unknown=-1).',
    'gauge',
    cfgs.map(x => ({
      labels: { provider: x.name, mode: x.cfg?.mode || 'unknown' },
      value: x.cfg?.mode === 'live' ? 1 : x.cfg?.mode === 'mock' ? 0 : -1,
    }))
  );

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

module.exports = router;
