/**
 * Admin Ops — Dead Letter Queue management surface.
 *
 * Operator endpoints for inspecting failed external-integration calls that
 * the ACL client auto-parked. Read operations list/inspect; write operations
 * discard or replay (replay requires the caller to supply an adapter).
 *
 * Auth: admin only (RBAC). Branch scope not enforced — ops has global view.
 *
 *   GET    /api/v1/admin/ops/dlq              — list (filter: integration, status, limit, offset)
 *   GET    /api/v1/admin/ops/dlq/:id          — detail
 *   POST   /api/v1/admin/ops/dlq/:id/discard  — mark as discarded
 *   POST   /api/v1/admin/ops/dlq/:id/replay   — replay via registered adapter
 *
 * Adapter registry: adapters self-register a replay function at boot via
 * `registerReplayAdapter(name, fn)`. Without a registered adapter, replay
 * returns 501 NOT_IMPLEMENTED.
 */

'use strict';

const express = require('express');
const dlq = require('../infrastructure/deadLetterQueue');
const { authenticate, authorize } = require('../middleware/auth');
const aggregatorModule = require('../services/integrationHealthAggregator');
const { buildSnapshot } = aggregatorModule;

const router = express.Router();
const replayAdapters = new Map();

router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

// W211 — lazy singletons for trend recorder + alert engine. Built on first
// use so that this module can be required at app boot before mongoose is
// connected. If model loading fails (e.g. mongoose not ready in tests),
// the handler returns 503 SERVICE_UNAVAILABLE rather than crashing.
let _trendRecorder = null;
let _alertEngine = null;

function getTrendRecorder() {
  if (_trendRecorder) return _trendRecorder;
  const createTrendRecorder = require('../services/integrationTrendRecorder.service');
  const IntegrationTrendSample = require('../models/IntegrationTrendSample');
  const metricsRegistry = require('../services/adapterMetricsRegistry');
  let rateLimiter = null;
  try {
    rateLimiter = require('../services/adapterRateLimiter');
  } catch {
    /* optional */
  }
  _trendRecorder = createTrendRecorder({
    IntegrationTrendSample,
    aggregator: aggregatorModule,
    metricsRegistry,
    rateLimiter,
  });
  return _trendRecorder;
}

function getAlertEngine() {
  if (_alertEngine) return _alertEngine;
  const createAlertEngine = require('../services/integrationAlertEngine.service');
  const IntegrationAlert = require('../models/IntegrationAlert');
  const IntegrationTrendSample = require('../models/IntegrationTrendSample');
  _alertEngine = createAlertEngine({
    IntegrationAlert,
    IntegrationTrendSample,
    aggregator: aggregatorModule,
  });
  return _alertEngine;
}

function parseSince(rawSince) {
  if (!rawSince) return new Date(Date.now() - 24 * 3600 * 1000);
  // Accept ISO date OR shorthand "24h" / "7d" / "30m" / "90d"
  const m = String(rawSince).match(/^(\d+)([mhd])$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const ms = unit === 'm' ? n * 60_000 : unit === 'h' ? n * 3_600_000 : n * 86_400_000;
    return new Date(Date.now() - ms);
  }
  const d = new Date(rawSince);
  if (Number.isNaN(d.getTime())) return new Date(Date.now() - 24 * 3600 * 1000);
  return d;
}

// GET /integration-health — mission-control snapshot. Mounted under the same
// /api/v1/admin/ops/ prefix so authorization + auth are inherited.
router.get('/integration-health', (_req, res) => {
  try {
    const snapshot = buildSnapshot();
    res.json({ ok: true, snapshot });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function registerReplayAdapter(name, fn) {
  if (typeof fn !== 'function') throw new Error('registerReplayAdapter: fn must be a function');
  replayAdapters.set(name, fn);
}

router.get('/dlq', async (req, res) => {
  try {
    const { integration, status, limit, offset } = req.query;
    const result = await dlq.list({
      integration,
      status,
      limit: limit ? Math.min(500, Number(limit)) : 100,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/dlq/:id', async (req, res) => {
  try {
    const entry = await dlq.get(req.params.id);
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/dlq/:id/discard', async (req, res) => {
  try {
    const entry = await dlq.discard(req.params.id, req.body?.reason || 'manual');
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/dlq/:id/replay', async (req, res) => {
  try {
    const entry = await dlq.get(req.params.id);
    if (!entry) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    const adapter = replayAdapters.get(entry.integration);
    if (!adapter) {
      return res.status(501).json({
        ok: false,
        error: 'NO_REPLAY_ADAPTER',
        integration: entry.integration,
        message: 'No replay adapter registered for this integration',
      });
    }
    const outcome = await dlq.replay(entry.id, adapter);
    res.json({ ok: !!outcome.ok, outcome });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// W211 — Interop Operations Center trends + alerts
// ═══════════════════════════════════════════════════════════════════════════

// GET /integration-health/trends/:integration?since=24h&until=&limit=288
// Time-series for one adapter with per-bucket deltas computed server-side.
router.get('/integration-health/trends/:integration', async (req, res) => {
  try {
    const since = parseSince(req.query.since);
    const until = req.query.until ? new Date(req.query.until) : new Date();
    const limit = req.query.limit ? Number(req.query.limit) : 288;
    const recorder = getTrendRecorder();
    const result = await recorder.getSeries({
      integration: req.params.integration,
      since,
      until,
      limit,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /integration-health/sample — operator-triggered "capture now". Useful
// for surfacing the latest counters in the UI between scheduler ticks.
router.post('/integration-health/sample', async (_req, res) => {
  try {
    const recorder = getTrendRecorder();
    const summary = await recorder.recordOnce({ source: 'manual' });
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /integration-health/alerts?status=open&integration=gosi&limit=100
router.get('/integration-health/alerts', async (req, res) => {
  try {
    const engine = getAlertEngine();
    const result = await engine.listAlerts({
      status: req.query.status,
      integration: req.query.integration,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /integration-health/alerts/:id/ack
router.post('/integration-health/alerts/:id/ack', async (req, res) => {
  try {
    const engine = getAlertEngine();
    const userId = req.user && (req.user._id || req.user.id);
    const updated = await engine.acknowledgeAlert({ id: req.params.id, userId });
    if (!updated) return res.status(404).json({ ok: false, error: 'NOT_FOUND_OR_NOT_OPEN' });
    res.json({ ok: true, alert: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /integration-health/alerts/:id/resolve
router.post('/integration-health/alerts/:id/resolve', async (req, res) => {
  try {
    const engine = getAlertEngine();
    const userId = req.user && (req.user._id || req.user.id);
    const updated = await engine.resolveAlert({ id: req.params.id, userId });
    if (!updated) return res.status(404).json({ ok: false, error: 'NOT_FOUND_OR_RESOLVED' });
    res.json({ ok: true, alert: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /integration-health/alerts/evaluate — operator-triggered rule eval,
// independent of the scheduler. Useful in tests and when an operator wants
// to confirm an alert state right after a fix.
router.post('/integration-health/alerts/evaluate', async (_req, res) => {
  try {
    const engine = getAlertEngine();
    const summary = await engine.evaluate({});
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
module.exports.registerReplayAdapter = registerReplayAdapter;
