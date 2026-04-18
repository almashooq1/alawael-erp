/**
 * startup/healthProbes.js — Health, readiness & info endpoints
 * ═══════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Endpoints: /health (liveness), /readiness (k8s), /api/info, / (root)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { getRedisStatus } = require('../config/performance');

/**
 * Mount public health/readiness/info probes + root endpoint.
 *
 * @param {import('express').Application} app
 * @param {object}  opts
 * @param {boolean} opts.isTestEnv
 * @param {boolean} opts.isProd
 */
function setupHealthProbes(app, { isTestEnv, isProd }) {
  /**
   * Liveness probe — checks API + database + Redis connectivity.
   * Returns 200 when healthy or degraded, 503 only in production when fully unhealthy.
   */
  app.get('/health', (_req, res) => {
    const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = isTestEnv
      ? 'connected'
      : mongoStates[mongoose.connection.readyState] || 'unknown';
    const redisState = getRedisStatus();
    const dbOk = dbState === 'connected' || dbState === 'connecting';
    const redisOk = redisState === 'connected' || redisState === 'disabled';

    let overall;
    if (dbOk && redisOk) {
      overall = 'ok';
    } else if (dbOk || redisOk) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const statusCode = overall === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json({
      status: overall,
      message: 'AlAwael ERP Backend is running',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'up',
        database: dbState,
        redis: redisState,
        websocket: 'up',
      },
    });
  });

  // Kubernetes readiness probe — DB + Redis must be ready
  app.get('/readiness', (_req, res) => {
    const dbReady = isTestEnv || mongoose.connection.readyState === 1;
    const redisReady = getRedisStatus() === 'connected' || getRedisStatus() === 'disabled';
    const isReady = dbReady && redisReady;
    if (isReady) {
      return res.status(200).json({ status: 'ready', db: 'ok', redis: getRedisStatus() });
    }
    return res
      .status(503)
      .json({ status: 'not-ready', db: dbReady ? 'ok' : 'down', redis: getRedisStatus() });
  });

  // System info — restricted in production (no internal flags exposed)
  app.get('/api/info', (_req, res) => {
    res.json({
      status: 'OK',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      ...(isProd
        ? {}
        : {
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3001,
            useMockDb: process.env.USE_MOCK_DB === 'true',
            redisDisabled: process.env.DISABLE_REDIS === 'true',
            smartTestMode: process.env.SMART_TEST_MODE === 'true',
          }),
    });
  });

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'AlAwael ERP API',
      version: '1.0.0',
      description: 'Rehabilitation Center Management System',
      endpoints: { health: '/health', readiness: '/readiness', api: '/api', docs: '/api-docs' },
    });
  });

  // Gov integrations health aggregator — public, before any auth.
  // Endpoints: /api/health/integrations, /summary, /:provider
  try {
    const integrationsHealth = require('../routes/integrations-health.routes');
    app.use('/api/health/integrations', integrationsHealth);
  } catch (err) {
    // Logger is available via app.locals if setup earlier; best-effort
    console.warn('[HealthProbes] integrations aggregator skipped:', err?.message);
  }

  // Prometheus text-format metrics for gov adapters — scraper-friendly.
  try {
    const integrationsMetrics = require('../routes/integrations-metrics.routes');
    app.use('/api/health/metrics/integrations', integrationsMetrics);
  } catch (err) {
    console.warn('[HealthProbes] integrations metrics skipped:', err?.message);
  }
}

module.exports = { setupHealthProbes };
