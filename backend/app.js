/**
 * app.js — Express Application Configuration (Orchestrator)
 * ═══════════════════════════════════════════════════════════
 * Thin orchestrator that delegates to startup/ modules.
 *
 * Startup modules:
 *   startup/middleware.js      — Security, CORS, body parsing, logging, etc.
 *   startup/healthProbes.js    — /health, /readiness, /api/info, root endpoint
 *   startup/adminEndpoints.js  — /api/_init, /api/_diag (emergency admin)
 *   startup/schedulers.js      — AI Scheduler, SLA Scheduler, shutdown hooks
 *   startup/integrationBus.js  — Cross-module event-driven architecture
 *
 * Server startup, Socket.IO, and database initialisation live in server.js.
 */

require('module-alias/register');
require('express-async-errors');
const path = require('path');
// Load backend/.env first; parent .env fills in gaps (override: false)
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: false });
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const express = require('express');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const {
  errorHandler,
  notFoundHandler,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
} = require('./errors/errorHandler');
const safeError = require('./utils/safeError');

// ─── Environment Setup ───────────────────────────────────────────────────────
if (!process.env.MONGODB_URI && !process.env.USE_MOCK_DB) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: MONGODB_URI is required in production. Set it in .env or environment.');
  }
  // Only auto-enable mock DB in development/test
  process.env.USE_MOCK_DB = 'true';
}

const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
if (isTestEnv) {
  process.env.USE_MOCK_DB = 'true';
  process.env.NODE_ENV = 'test';
  process.env.SMART_TEST_MODE = process.env.SMART_TEST_MODE || 'true';
  process.env.CSRF_DISABLE = 'true';
}

const isProd = process.env.NODE_ENV === 'production';

// ─── Create Express App ──────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Startup Modules ─────────────────────────────────────────────────────────
const { setupMiddleware } = require('./startup/middleware');
const { setupHealthProbes } = require('./startup/healthProbes');
const { setupAdminEndpoints } = require('./startup/adminEndpoints');
const { setupSchedulers } = require('./startup/schedulers');
const { setupIntegrationBus } = require('./startup/integrationBus');

// Centralised route registry
const { mountAllRoutes } = require('./routes/_registry');
const { authRateLimiter } = require('./config/security.advanced');

// Infrastructure (Phase II)
const { mountEventStoreRoutes } = require('./infrastructure/eventStore');
const { mountMessageQueueRoutes } = require('./infrastructure/messageQueue');
const { mountMigrationRoutes } = require('./infrastructure/migrationRunner');
require('./api/versionRouter'); // side-effects only
const { mountAllDomains, healthCheckAll: domainHealthCheck } = require('./domains/index');

// ═══════════════════════════════════════════════════════════════════════════
// 1. MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════════════════
setupMiddleware(app, { isTestEnv, isProd });

// ═══════════════════════════════════════════════════════════════════════════
// 2. HEALTH PROBES (public — no auth required)
// ═══════════════════════════════════════════════════════════════════════════
setupHealthProbes(app, { isTestEnv, isProd });

// ═══════════════════════════════════════════════════════════════════════════
// 3. ADMIN ENDPOINTS (emergency — before route registry)
// ═══════════════════════════════════════════════════════════════════════════
setupAdminEndpoints(app, { isProd });

// ═══════════════════════════════════════════════════════════════════════════
// 4. ROUTE MOUNTING (centralised in routes/_registry.js)
// ═══════════════════════════════════════════════════════════════════════════
try {
  mountAllRoutes(app, { authRateLimiter });
} catch (err) {
  logger.warn('[Routes] Some routes failed to mount:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. INFRASTRUCTURE & DOMAIN ROUTES (v2)
// ═══════════════════════════════════════════════════════════════════════════
try {
  mountEventStoreRoutes(app);
  mountMessageQueueRoutes(app);
  mountMigrationRoutes(app);
} catch (err) {
  logger.warn('[Infrastructure] Some infrastructure routes failed to mount:', err.message);
}

try {
  mountAllDomains(app);
} catch (err) {
  logger.warn('Domain mounting skipped:', err.message);
}
app.get('/api/v2/domains/health', async (_req, res) => {
  try {
    const health = await domainHealthCheck();
    res.json({ success: true, domains: health });
  } catch (error) {
    safeError(res, error, 'app');
  }
});

// Platform Health & Stats (DDD unified rehabilitation platform)
try {
  const platformRoutes = require('./routes/platform.routes');
  app.use('/api/v1/platform', platformRoutes);
  app.use('/api/v2/platform', platformRoutes);
  logger.info('[Platform] ✓ Platform health/stats routes mounted (/api/v1/platform/*)');
} catch (err) {
  logger.warn('[Platform] Platform routes skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. INTEGRATION BUS (cross-module event-driven architecture)
// ═══════════════════════════════════════════════════════════════════════════
setupIntegrationBus(app);

// ═══════════════════════════════════════════════════════════════════════════
// 7. SCHEDULERS & SHUTDOWN HOOKS
// ═══════════════════════════════════════════════════════════════════════════
setupSchedulers({ isTestEnv });

// ─── Error Handling (MUST be after all routes) ───────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);
uncaughtExceptionHandler();
unhandledRejectionHandler();

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.PORT = PORT;
