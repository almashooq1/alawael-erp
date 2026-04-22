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
const safeError = require('./utils/safeError');

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

// ═══════════════════════════════════════════════════════════════════════════
// 7.5 BENEFICIARY-360 RED-FLAG SYSTEM
//     (registry → engine → store → routes — Commits 1–10)
// ═══════════════════════════════════════════════════════════════════════════
try {
  const { bootstrapRedFlagSystem } = require('./startup/redFlagBootstrap');
  const { authenticate } = require('./middleware/auth');
  let cronDep = null;
  try {
    cronDep = require('node-cron');
  } catch {
    /* optional */
  }
  const redFlags = bootstrapRedFlagSystem({
    logger,
    storeMode: 'auto', // uses Mongo when connection is up, memory otherwise
    cron: cronDep,
  });
  app.locals.redFlagSystem = redFlags;
  app.use('/api/v1/beneficiaries', authenticate, redFlags.router);
  app.use('/api/v1/admin/red-flags', authenticate, redFlags.adminRouter);
  logger.info('[RedFlag] ✓ routes mounted (beneficiary + admin)');

  // Consent capture surface — the HTTP side of the Consent model
  // (Commit 19). Without these routes, the CRITICAL consent flags
  // stay dormant because nothing writes records.
  try {
    const { createConsentRouter } = require('./routes/beneficiary-consents.routes');
    const { Consent, CONSENT_TYPES } = require('./models/Consent');
    const Beneficiary = require('./models/Beneficiary');
    const consentRouter = createConsentRouter({
      consentModel: Consent,
      beneficiaryModel: Beneficiary,
      consentTypes: CONSENT_TYPES,
    });
    app.use('/api/v1/beneficiaries', authenticate, consentRouter);
    logger.info('[Consent] ✓ capture routes mounted');
  } catch (consentErr) {
    logger.warn('[Consent] routes skipped:', consentErr.message);
  }

  // Rehab-disciplines read-only surface — exposes the canonical
  // discipline registry (Phase 9 Commit 1) to the UI for IRP builder,
  // program catalogue, goal suggestions, and measure selection.
  try {
    const { createRehabDisciplinesRouter } = require('./routes/rehab-disciplines.routes');
    app.use('/api/v1/rehab/disciplines', authenticate, createRehabDisciplinesRouter());
    logger.info('[RehabDisciplines] ✓ registry routes mounted');
  } catch (rehabErr) {
    logger.warn('[RehabDisciplines] routes skipped:', rehabErr.message);
  }

  // Goal-suggestion engine — Phase 9 Commit 8. Returns ranked SMART
  // goal templates + first-line interventions from the registry given
  // a beneficiary context (disciplines, age, existing goals).
  try {
    const { createRehabGoalSuggestionsRouter } = require('./routes/rehab-goal-suggestions.routes');
    app.use('/api/v1/rehab/goal-suggestions', authenticate, createRehabGoalSuggestionsRouter());
    logger.info('[RehabGoalSuggestions] ✓ suggestion routes mounted');
  } catch (suggErr) {
    logger.warn('[RehabGoalSuggestions] routes skipped:', suggErr.message);
  }

  // Reporting Platform observability — Phase 10 Commit 17. Late-binds
  // to `app._reportingPlatform` which server.js sets after
  // buildReportingPlatform() runs. Returns 503 until the platform is
  // wired (prevents boot-order crashes).
  try {
    const { buildRouter: buildReportsOpsRouter } = require('./routes/reports-ops.routes');
    app.use('/api/v1/reports/ops', authenticate, (req, res, next) => {
      const platform = app._reportingPlatform;
      if (!platform) {
        return res.status(503).json({ error: 'reporting platform not yet initialized' });
      }
      if (!app._reportingOpsRouter) {
        app._reportingOpsRouter = buildReportsOpsRouter({
          platform,
          DeliveryModel: require('./models/ReportDelivery'),
          ApprovalModel: require('./models/ReportApprovalRequest'),
          catalog: require('./config/report.catalog'),
          logger,
        });
      }
      return app._reportingOpsRouter(req, res, next);
    });
    logger.info('[ReportingOps] ✓ observability routes mounted at /api/v1/reports/ops');
  } catch (opsErr) {
    logger.warn('[ReportingOps] routes skipped:', opsErr.message);
  }
  // Fire the periodic sweep in non-test env only. Tests run `runOnce`
  // directly when they need to; a live cron would flake them.
  if (!isTestEnv && cronDep) {
    redFlags.scheduler.start({ expression: '0 */6 * * *' });
  }
} catch (err) {
  logger.warn('[RedFlag] bootstrap skipped:', err.message);
}

// ─── Error Handling (MUST be after all routes) ───────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);
uncaughtExceptionHandler();
unhandledRejectionHandler();

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.PORT = PORT;
