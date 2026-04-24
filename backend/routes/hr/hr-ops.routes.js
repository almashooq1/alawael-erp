'use strict';

/**
 * hr-ops.routes.js — Phase 11 Commit 24 (4.0.41).
 *
 *   GET  /api/v1/hr/ops/anomaly-scheduler
 *   POST /api/v1/hr/ops/anomaly-scheduler/tick
 *
 * Operational observability + manual-trigger surface for the HR
 * anomaly scheduler booted by server.js (C23). Uptime monitoring
 * polls the GET; on-call engineers POST `/tick` during suspected
 * incidents to force an immediate scan instead of waiting for the
 * next 15-minute interval.
 *
 * Authorization:
 *
 *   MANAGER tier required for BOTH endpoints. A malicious caller
 *   who could call `/tick` at will could DoS the AuditLog
 *   aggregation pipeline; narrowing to the governance tier keeps
 *   that surface tight.
 *
 * Late-binding:
 *
 *   The scheduler is attached to `app._hrAnomalyScheduler` at
 *   server.js boot. The router grabs it per-request via a closure
 *   over the resolver — same pattern the reports-ops router (4.0.17)
 *   uses. Returns 503 cleanly if the scheduler hasn't come up yet
 *   (e.g. during deploy restart).
 */

const express = require('express');
const { writeTierForRole } = require('../../config/hr-admin-editable-fields');

function createHrOpsRouter({
  resolveScheduler,
  metricsService = null,
  healthService = null,
  configService = null,
  logger = console,
} = {}) {
  if (typeof resolveScheduler !== 'function') {
    throw new Error('createHrOpsRouter: resolveScheduler function is required');
  }
  const router = express.Router();

  function requireManager(req, res) {
    if (!req.user) {
      res.status(401).json({ error: 'auth required' });
      return false;
    }
    if (writeTierForRole(req.user.role) !== 'manager') {
      res.status(403).json({ error: 'requires manager tier' });
      return false;
    }
    return true;
  }

  router.get('/ops/anomaly-scheduler', (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      const scheduler = resolveScheduler();
      if (scheduler == null) {
        return res.status(503).json({ error: 'scheduler not yet initialized' });
      }
      const status = scheduler.getStatus();
      return res.json(status);
    } catch (err) {
      logger.error && logger.error('[HrOps:status]', err.message || err);
      return res.status(500).json({ error: 'status failed' });
    }
  });

  router.post('/ops/anomaly-scheduler/tick', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      const scheduler = resolveScheduler();
      if (scheduler == null) {
        return res.status(503).json({ error: 'scheduler not yet initialized' });
      }
      const result = await scheduler.tick();
      if (result && result.skipped) {
        return res.status(409).json({
          error: 'scan_in_flight',
          reason: result.reason || 'overlap',
        });
      }
      if (result && result.error) {
        return res.status(500).json({ error: 'scan_failed', message: result.error });
      }
      return res.json({ triggered: true, report: result.report });
    } catch (err) {
      logger.error && logger.error('[HrOps:tick]', err.message || err);
      return res.status(500).json({ error: 'tick failed' });
    }
  });

  /**
   * GET /api/v1/hr/ops/metrics
   *
   * Prometheus text-exposition format for HR metrics. Scraped by
   * Grafana/Prometheus/Datadog via pull. MANAGER tier required —
   * same gate as the status endpoint (metrics payload includes
   * pending counts + status info that should stay internal).
   *
   * Content-Type: text/plain; version=0.0.4; charset=utf-8
   *
   * 200 — Prometheus text body
   * 401 — auth missing
   * 403 — sub-manager tier
   * 503 — metrics service not wired
   * 500 — build failed
   */
  router.get('/ops/metrics', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (metricsService == null) {
        return res.status(503).json({ error: 'metrics service not available' });
      }
      const body = await metricsService.buildPrometheusText();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.send(body);
    } catch (err) {
      logger.error && logger.error('[HrOps:metrics]', err.message || err);
      return res.status(500).json({ error: 'metrics failed' });
    }
  });

  /**
   * GET /api/v1/hr/ops/health
   *
   * Aggregated health check. Maps health.status to HTTP code:
   *   healthy   → 200
   *   degraded  → 200 (still OK; warnings surfaced)
   *   unhealthy → 503 (uptime monitor should page)
   *
   * MANAGER tier required — same gate as the other ops endpoints.
   * Deployments that want a public k8s liveness probe should mount
   * a separate unauthenticated `/healthz` elsewhere; this surface
   * is internal ops observability.
   */
  router.get('/ops/health', async (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (healthService == null) {
        return res.status(503).json({ error: 'health service not available' });
      }
      const report = await healthService.checkHealth();
      const code = report.status === 'unhealthy' ? 503 : 200;
      return res.status(code).json(report);
    } catch (err) {
      logger.error && logger.error('[HrOps:health]', err.message || err);
      return res.status(500).json({ error: 'health check failed' });
    }
  });

  /**
   * GET /api/v1/hr/ops/config
   *
   * Current effective configuration of the HR stack — thresholds,
   * intervals, feature flags, env-var overrides. Reads the process
   * environment at request time (restart to pick up changes).
   *
   * MANAGER tier required — config includes security-relevant
   * thresholds (anomaly detection, cooldown windows) that shouldn't
   * be public.
   *
   * 200 — config snapshot
   * 401 — auth missing
   * 403 — sub-manager tier
   * 503 — config service not wired
   * 500 — build failed
   */
  router.get('/ops/config', (req, res) => {
    try {
      if (!requireManager(req, res)) return;
      if (configService == null) {
        return res.status(503).json({ error: 'config service not available' });
      }
      return res.json(configService.getConfig());
    } catch (err) {
      logger.error && logger.error('[HrOps:config]', err.message || err);
      return res.status(500).json({ error: 'config failed' });
    }
  });

  return router;
}

module.exports = { createHrOpsRouter };
