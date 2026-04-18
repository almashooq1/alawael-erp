/**
 * integrations-health.routes.js — public health aggregator for all
 * Saudi government adapters.
 *
 * Mount at /api/health/integrations.
 *
 * Unauthenticated on purpose — monitors/load-balancers/Kubernetes
 * liveness probes should be able to hit this without a JWT. Returns
 * only mode + configured + circuit state — NO credentials, NO PII.
 *
 * Endpoints:
 *   GET /                 — single-pane snapshot of all 10 adapters
 *   GET /:provider        — single adapter detail
 *   GET /summary          — tiny payload: just overall ok/degraded
 *
 * Typical use cases:
 *   • Kubernetes readiness: curl /api/health/integrations/summary
 *   • Grafana dashboard: poll /api/health/integrations every 30s
 *   • Slack/PagerDuty alert: when summary.overall !== 'ok'
 */

'use strict';

const express = require('express');
const router = express.Router();

const gosi = require('../services/gosiAdapter');
const scfhs = require('../services/scfhsAdapter');
const absher = require('../services/absherAdapter');
const qiwa = require('../services/qiwaAdapter');
const nafathAdapter = require('../services/nafathAdapter');
const fatoora = require('../services/fatooraAdapter');
const muqeem = require('../services/muqeemAdapter');
const nphies = require('../services/nphiesAdapter');
const wasel = require('../services/waselAdapter');
const balady = require('../services/baladyAdapter');
const signer = require('../services/zatcaXmlSigner');

// Minimal wrappers for adapters that don't expose getConfig
function configOf(adapter, name) {
  if (typeof adapter.getConfig === 'function') return adapter.getConfig();
  // SCFHS + Nafath historically lacked getConfig — synthesize
  const mode = adapter.MODE || 'unknown';
  return { provider: name, mode, configured: mode === 'mock' };
}

// Adapters that have testConnection
function canTest(adapter) {
  return typeof adapter.testConnection === 'function';
}

const ADAPTERS = {
  gosi,
  scfhs,
  absher,
  qiwa,
  nafath: nafathAdapter,
  fatoora,
  muqeem,
  nphies,
  wasel,
  balady,
  'zatca-signer': signer,
};

// Lightweight in-memory cache so ops polling every 30s doesn't storm
// the upstream OAuth token endpoints. 60s TTL is aggressive enough to
// catch real config drift.
const CACHE_TTL_MS = 60_000;
const healthCache = new Map(); // provider → { at, result }

async function getHealth(providerKey, adapter) {
  const cached = healthCache.get(providerKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

  const cfg = configOf(adapter, providerKey);
  let test = null;
  if (canTest(adapter)) {
    try {
      test = await adapter.testConnection();
    } catch (e) {
      test = { ok: false, mode: cfg.mode, error: e?.message };
    }
  }

  const result = {
    provider: providerKey,
    mode: cfg.mode,
    configured: cfg.configured,
    missing: cfg.missing || undefined,
    ok: test ? test.ok : cfg.configured,
    latencyMs: test?.latencyMs,
    tokenLifetimeSec: test?.tokenLifetimeSec,
    circuit: cfg.circuit,
    checkedAt: new Date().toISOString(),
  };
  healthCache.set(providerKey, { at: Date.now(), result });
  return result;
}

// ── GET /summary — tiny payload ──────────────────────────────────────────
router.get('/summary', async (_req, res) => {
  try {
    const entries = await Promise.all(Object.keys(ADAPTERS).map(k => getHealth(k, ADAPTERS[k])));
    const liveCount = entries.filter(e => e.mode === 'live').length;
    const okCount = entries.filter(e => e.ok).length;
    const misconfigured = entries.filter(e => !e.configured);
    const circuitOpen = entries.filter(e => e.circuit?.open);

    let overall;
    if (misconfigured.length === 0 && circuitOpen.length === 0) overall = 'ok';
    else if (circuitOpen.length > 0) overall = 'degraded';
    else overall = 'misconfigured';

    // 200 for ok/degraded, 503 for misconfigured (trips readiness probes)
    const status = overall === 'misconfigured' ? 503 : 200;
    res.status(status).json({
      overall,
      total: entries.length,
      ok: okCount,
      live: liveCount,
      mock: entries.length - liveCount,
      misconfigured: misconfigured.map(e => e.provider),
      circuitOpen: circuitOpen.map(e => e.provider),
      at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ overall: 'error', error: err?.message });
  }
});

// ── GET /:provider — single adapter ──────────────────────────────────────
router.get('/:provider', async (req, res) => {
  const key = String(req.params.provider).toLowerCase();
  const adapter = ADAPTERS[key];
  if (!adapter) return res.status(404).json({ error: 'unknown provider' });
  try {
    const h = await getHealth(key, adapter);
    res.json(h);
  } catch (err) {
    res.status(500).json({ provider: key, error: err?.message });
  }
});

// ── GET / — full snapshot ────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const entries = await Promise.all(Object.keys(ADAPTERS).map(k => getHealth(k, ADAPTERS[k])));
    const byProvider = Object.fromEntries(entries.map(e => [e.provider, e]));
    res.json({
      overall: entries.every(e => e.configured) ? 'ok' : 'misconfigured',
      total: entries.length,
      checkedAt: new Date().toISOString(),
      providers: byProvider,
    });
  } catch (err) {
    res.status(500).json({ error: err?.message });
  }
});

module.exports = router;
