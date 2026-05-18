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
// Express 5 has built-in async error handling — `express-async-errors`
// is no longer needed (and is incompatible because it monkey-patches
// `express/lib/router/layer` which moved in v5). Removed alongside
// the express 4 → 5 bump.
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
  // Inline err.message into the message string — winston's default format
  // drops the splat-style second argument, which made this line just say
  // "[Routes] Some routes failed to mount:" with no actionable detail.
  logger.warn(`[Routes] Some routes failed to mount: ${err.message}`, {
    stack: err.stack,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. INFRASTRUCTURE & DOMAIN ROUTES (v2)
// ═══════════════════════════════════════════════════════════════════════════
try {
  mountEventStoreRoutes(app);
  mountMessageQueueRoutes(app);
  mountMigrationRoutes(app);
} catch (err) {
  logger.warn(`[Infrastructure] Some infrastructure routes failed to mount: ${err.message}`, {
    stack: err.stack,
  });
}

try {
  mountAllDomains(app);
} catch (err) {
  logger.warn(`Domain mounting skipped: ${err.message}`, { stack: err.stack });
}
app.get('/api/v2/domains/health', async (_req, res) => {
  try {
    const health = await domainHealthCheck();
    res.json({ success: true, domains: health });
  } catch (error) {
    safeError(res, error, 'app');
  }
});

// Platform Health & Stats (DDD unified rehabilitation platform) — REMOVED.
// The original `routes/platform.routes.js` and its `ddd-loader` dep were
// archived to `_archived/dead-routes/`; the try/catch here was silently
// no-op'ing on every boot. Health is served by `routes/health.routes.js`
// + `routes/operations/opsDashboard.routes.js`. If a unified DDD platform
// surface is ever revived, restore from `_archived/dead-routes/`.

// ═══════════════════════════════════════════════════════════════════════════
// 6. INTEGRATION BUS (cross-module event-driven architecture)
// ═══════════════════════════════════════════════════════════════════════════
setupIntegrationBus(app);

// ═══════════════════════════════════════════════════════════════════════════
// 7. SCHEDULERS & SHUTDOWN HOOKS
// ═══════════════════════════════════════════════════════════════════════════
setupSchedulers({ isTestEnv });

// ═══════════════════════════════════════════════════════════════════════════
// 7.05 INTEGRATION HARDENING — DLQ + idempotency adapters + admin router
//      (Phase I/II of the Integration Hardening Layer)
// ═══════════════════════════════════════════════════════════════════════════
try {
  const { bootstrapIntegrationHardening } = require('./startup/integrationHardeningBootstrap');
  let redisClient = null;
  try {
    const redisModule = require('./config/redis');
    redisClient = redisModule.getClient && redisModule.getClient();
  } catch {
    /* redis optional */
  }
  const hardening = bootstrapIntegrationHardening(app, { mongoose, redisClient, isTestEnv });
  app.locals.integrationHardening = hardening;
  logger.info(
    '[Hardening] ✓ integration hardening bootstrapped: ' + JSON.stringify(hardening.status())
  );
} catch (err) {
  logger.warn('[Hardening] bootstrap skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.06 NAFATH E-SIGNATURE — legal signing surface for IRP/contracts/consents
// ═══════════════════════════════════════════════════════════════════════════
try {
  const nafathSigningRoutes = require('./routes/nafath-signing.routes');
  app.use('/api/v1/nafath/signing', nafathSigningRoutes);
  logger.info('[Nafath] ✓ signing routes mounted at /api/v1/nafath/signing');
} catch (err) {
  logger.warn('[Nafath] signing routes skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.062 STUDENT PORTAL — beneficiary-scoped read APIs (today, schedule, mood…)
// ═══════════════════════════════════════════════════════════════════════════
try {
  app.use('/api/v1/student', require('./routes/student-portal.routes'));
  logger.info('[StudentPortal] ✓ routes mounted at /api/v1/student');
} catch (err) {
  logger.warn('[StudentPortal] routes skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.065 OPENAPI — hand-crafted spec for the integration surface + Swagger UI
// ═══════════════════════════════════════════════════════════════════════════
try {
  app.use('/api/docs', require('./routes/openapi-integration.routes'));
  logger.info('[OpenAPI] ✓ integration spec at /api/docs/integration{,.yaml,.json}');
} catch (err) {
  logger.warn('[OpenAPI] spec routes skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.07 YAKEEN / WASEL / NPHIES — identity, address, and claim-webhook surfaces
// ═══════════════════════════════════════════════════════════════════════════
try {
  app.use('/api/v1/yakeen/verify', require('./routes/yakeen-verification.routes'));
  logger.info('[Yakeen] ✓ verification routes mounted at /api/v1/yakeen/verify');
} catch (err) {
  logger.warn('[Yakeen] verification routes skipped:', err.message);
}
try {
  app.use('/api/v1/wasel/address', require('./routes/wasel-address.routes'));
  logger.info('[Wasel] ✓ address routes mounted at /api/v1/wasel/address');
} catch (err) {
  logger.warn('[Wasel] address routes skipped:', err.message);
}
try {
  app.use('/api/v1/webhooks/nphies', require('./routes/nphies-webhook.routes'));
  logger.info('[NPHIES] ✓ webhook receiver mounted at /api/v1/webhooks/nphies');
} catch (err) {
  logger.warn('[NPHIES] webhook mount skipped:', err.message);
}

// Phase 19 — Forms Catalog (32 ready-to-use FormTemplate seeds across
// beneficiary / hr / management audiences). Read endpoints are
// authenticated-any; instantiate is gated to admin / forms_admin.
try {
  const FormTemplate = require('./models/FormTemplate');
  const { buildRouter } = require('./routes/forms-catalog.routes');
  app.use('/api/v1/forms/catalog', buildRouter({ formTemplateModel: FormTemplate }));
  logger.info('[FormsCatalog] ✓ mounted at /api/v1/forms/catalog (32 ready forms)');
} catch (err) {
  logger.warn('[FormsCatalog] mount skipped:', err.message);
}

// Phase 24 — Forms fill / submit / review surface used by web-admin.
// Bridges the existing FormTemplate + FormSubmission models to the routes
// the formsApi calls (see apps/web-admin/src/lib/api.ts).
try {
  app.use('/api/documents-pro/forms', require('./routes/forms-submission.routes'));
  logger.info('[FormsSubmission] ✓ mounted at /api/documents-pro/forms');
} catch (err) {
  logger.warn('[FormsSubmission] mount skipped:', err.message);
}

// Phase 25 — Landing-page CMS. Public GET, admin-gated PUT/PATCH/POST/DELETE.
try {
  app.use('/api/v1/landing', require('./routes/landing-config.routes'));
  logger.info('[LandingConfig] ✓ mounted at /api/v1/landing');
} catch (err) {
  logger.warn('[LandingConfig] mount skipped:', err.message);
}

// Phase 27 — admin-only file uploads to /home/alawael/app/uploads/<bucket>/.
// nginx serves the static path /uploads/* publicly.
try {
  app.use('/api/v1/uploads', require('./routes/uploads.routes'));
  logger.info('[Uploads] ✓ mounted at /api/v1/uploads');
} catch (err) {
  logger.warn('[Uploads] mount skipped:', err.message);
}

// Phase 29 — public form submission (no auth, IP rate-limited).
// Only templates with isPublic:true are exposed. Used for complaint /
// suggestion / public-intake forms linked from the landing page.
try {
  app.use('/api/v1/public/forms', require('./routes/public-forms.routes'));
  logger.info('[PublicForms] ✓ mounted at /api/v1/public/forms');
} catch (err) {
  logger.warn('[PublicForms] mount skipped:', err.message);
}

// Phase 30 — public uploads for visitor attachments (used by intake forms).
try {
  app.use('/api/v1/public/uploads', require('./routes/public-uploads.routes'));
  logger.info('[PublicUploads] ✓ mounted at /api/v1/public/uploads');
} catch (err) {
  logger.warn('[PublicUploads] mount skipped:', err.message);
}

// Phase 30 — admin notifications log viewer.
try {
  app.use('/api/v1/admin/notifications-log', require('./routes/notifications-log.routes'));
  logger.info('[NotificationsLog] ✓ mounted at /api/v1/admin/notifications-log');
} catch (err) {
  logger.warn('[NotificationsLog] mount skipped:', err.message);
}

// Phase 30 — WebPush subscriptions.
try {
  const push = require('./routes/push.routes');
  app.use('/api/v1/push', push.publicRouter);
  app.use('/api/v1/push', push.authRouter);
  logger.info('[Push] ✓ mounted at /api/v1/push');
} catch (err) {
  logger.warn('[Push] mount skipped:', err.message);
}

// Universal scannable codes (QR + Code-128) — one catalog across every entity.
try {
  const universalCodes = require('./routes/universal-codes.routes');
  app.use('/api/v1/codes', universalCodes);
  logger.info('[UniversalCode] ✓ mounted at /api/v1/codes');
} catch (err) {
  logger.warn('[UniversalCode] mount skipped:', err.message);
}

// Phase 30 — Audit log of submission reviews (chronological feed).
try {
  app.use('/api/v1/admin/audit', require('./routes/audit-reviews.routes'));
  logger.info('[AuditReviews] ✓ mounted at /api/v1/admin/audit');
} catch (err) {
  logger.warn('[AuditReviews] mount skipped:', err.message);
}

// Phase 30 — Visitor passwordless auth (OTP via SMS/email).
try {
  app.use('/api/v1/public/visitor', require('./routes/visitor-auth.routes'));
  logger.info('[VisitorAuth] ✓ mounted at /api/v1/public/visitor');
} catch (err) {
  logger.warn('[VisitorAuth] mount skipped:', err.message);
}

// NPHIES reconciliation scheduler — fallback for missed webhooks.
try {
  if (!isTestEnv && process.env.NPHIES_RECON_ENABLED !== 'false') {
    const {
      createNphiesReconciliationScheduler,
    } = require('./startup/nphiesReconciliationScheduler');
    const { defaultService: reconService } = require('./services/nphiesReconciliationService');
    const reconWorker = createNphiesReconciliationScheduler({ service: reconService });
    reconWorker.start();
    app.locals.nphiesReconWorker = reconWorker;
  }
} catch (err) {
  logger.warn('[NPHIES] reconciliation scheduler skipped:', err.message);
}

// ZATCA B2C 24-hour SLA sweeper — retries overdue simplified invoices and
// fires a single aggregated ops-alert when any breach the 23h breach
// threshold. Off by default; flip ZATCA_SLA_SWEEPER_ENABLED=true at the
// same time as ZATCA_AUTOSUBMIT=true at go-live.
try {
  if (!isTestEnv && process.env.ZATCA_SLA_SWEEPER_ENABLED === 'true') {
    const { createZatcaB2cSlaScheduler } = require('./startup/zatcaB2cSlaScheduler');
    const slaService = require('./services/zatcaB2cSlaSweeper');
    const slaWorker = createZatcaB2cSlaScheduler({ service: slaService });
    slaWorker.start();
    app.locals.zatcaSlaWorker = slaWorker;
  }
} catch (err) {
  logger.warn('[ZATCA] B2C SLA sweeper skipped:', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.1 FINANCE BOOTSTRAP — seed default Chart of Accounts + cheque-expiry job
//      (Phase 12 Commit 6)
// ═══════════════════════════════════════════════════════════════════════════
try {
  const { bootstrapFinance } = require('./startup/financeBootstrap');
  bootstrapFinance({ logger, isTestEnv });
} catch (err) {
  logger.warn('[Finance] bootstrap skipped:', err.message);
}

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
  // Force mongo store. The 'auto' mode falls back to in-memory because
  // bootstrapRedFlagSystem runs synchronously at app.js module-load time,
  // before mongoose finishes connecting — meaning red-flag state would
  // never persist across restarts. createMongoStateStore() only captures
  // the model reference; mongoose buffers queries until the connection
  // opens, so this is safe to call before mongoose.connect resolves.
  const redFlags = bootstrapRedFlagSystem({
    logger,
    storeMode: 'mongo',
    cron: cronDep,
  });
  app.locals.redFlagSystem = redFlags;
  app.use('/api/v1/beneficiaries', authenticate, redFlags.router);
  app.use('/api/v1/admin/red-flags', authenticate, redFlags.adminRouter);
  logger.info('[RedFlag] ✓ routes mounted (beneficiary + admin)');

  // Stagnant-goal sweeper — daily 03:00 sweep that auto-raises GOAL_STAGNANT
  // for any in-progress goal with no progress entry in the last 28 days.
  // Backs the therapist portal's "goalsAtRisk" counter and the supervisor
  // dashboard's stagnant-goals widget. Idempotent: relies on the unique
  // (beneficiaryId, flagId, status) index on RedFlagState, so re-running
  // is cheap and free of duplicates.
  try {
    const createStagnantGoalScheduler = require('./services/stagnantGoalScheduler');
    const CarePlanModel = require('./models/CarePlan');
    const GoalProgressEntryModel = require('./models/GoalProgressEntry');
    const RedFlagStateModel = require('./models/RedFlagState');
    let NotificationModel = null;
    try {
      NotificationModel = require('./models/Notification');
    } catch {
      /* notifications are optional — sweep still runs without them */
    }
    const stagnantSweeper = createStagnantGoalScheduler({
      CarePlan: CarePlanModel,
      GoalProgressEntry: GoalProgressEntryModel,
      RedFlagState: RedFlagStateModel,
      Notification: NotificationModel,
      logger,
    });
    app.locals.stagnantGoalSweeper = stagnantSweeper;
    if (cronDep && process.env.NODE_ENV !== 'test' && process.env.STAGNANT_GOAL_SWEEPER !== 'off') {
      stagnantSweeper.start({
        schedule: process.env.STAGNANT_GOAL_SCHEDULE || '0 3 * * *',
        cron: cronDep,
      });
      logger.info('[StagnantGoals] ✓ sweeper scheduled (daily 03:00)');
    } else {
      logger.info(
        '[StagnantGoals] ✓ sweeper available via app.locals.stagnantGoalSweeper.runOnce()'
      );
    }
  } catch (stagnantErr) {
    logger.warn('[StagnantGoals] sweeper skipped:', stagnantErr.message);
  }

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

  // HR Executive Dashboard — Phase 11 Commit 4 (+ audit in Commit 6).
  // Aggregates credential health, workforce integrity, and active HR
  // red-flag counts into a single endpoint. Missing models degrade
  // gracefully to null sections — the route never 500s on partial
  // availability. Every hit fires a PDPL-compliant access-audit event
  // via hrAccessAuditService when the audit log model is present.
  try {
    const { createHrDashboardService } = require('./services/hr/hrDashboardService');
    const { createHrDashboardRouter } = require('./routes/hr/hr-dashboard.routes');
    const { createHrAccessAuditService } = require('./services/hr/hrAccessAuditService');
    function softRequire(path) {
      try {
        return require(path);
      } catch {
        return null;
      }
    }
    // Hoisted above dashboardService — TDZ-trap: the dashboardService
    // factory reads `auditLogModel` in its arg object, so the const
    // declaration must run first.
    const auditLogModel = softRequire('./models/auditLog.model');
    const dashboardService = createHrDashboardService({
      certificationModel: softRequire('./models/hr/Certification'),
      employmentContractModel: softRequire('./models/hr/EmploymentContract'),
      employeeModel: softRequire('./models/HR/Employee'),
      leaveBalanceModel: softRequire('./models/hr/LeaveBalance'),
      performanceReviewModel: softRequire('./models/hr/PerformanceReview'),
      redFlagStateModel: softRequire('./models/RedFlagState'),
      // Phase-11 C13 — change-request analytics section. Optional:
      // if the model isn't loadable the dashboard's change_requests
      // field simply degrades to null.
      changeRequestModel: softRequire('./models/hr/HrChangeRequest'),
      // Phase-11 C20 — anomalies section reads the AuditLog for
      // security.suspicious_activity events tagged 'hr:anomaly'.
      auditLogModel: auditLogModel ? auditLogModel.AuditLog || auditLogModel : null,
    });
    const auditService = auditLogModel
      ? createHrAccessAuditService({
          auditLogModel: auditLogModel.AuditLog || auditLogModel,
          logger,
        })
      : null;
    const dashboardRouter = createHrDashboardRouter({
      service: dashboardService,
      auditService,
      logger,
    });
    app.use('/api/v1/hr', authenticate, dashboardRouter);
    logger.info(`[HrDashboard] ✓ dashboard route mounted (audit=${auditService ? 'on' : 'off'})`);

    // Phase 11 Commit 7 — employee self-service snapshot at /api/v1/hr/me.
    // Uses the self-access path of the masking layer + the audit
    // service from C6 for PDPL Art. 18 + Art. 30 compliance.
    try {
      const {
        createEmployeeSelfServiceService,
      } = require('./services/hr/employeeSelfServiceService');
      const {
        createEmployeeSelfServiceRouter,
      } = require('./routes/hr/employee-self-service.routes');

      const selfServiceService = createEmployeeSelfServiceService({
        employeeModel: softRequire('./models/HR/Employee'),
        employmentContractModel: softRequire('./models/hr/EmploymentContract'),
        certificationModel: softRequire('./models/hr/Certification'),
        leaveBalanceModel: softRequire('./models/hr/LeaveBalance'),
        leaveModel: softRequire('./models/hr/Leave'),
        redFlagStateModel: softRequire('./models/RedFlagState'),
        performanceReviewModel: softRequire('./models/hr/PerformanceReview'),
      });
      // Phase-11 C17 — data-portability export wired as an optional
      // dep. Missing model → `/me/data-export` returns 503 cleanly.
      let dataExportService = null;
      try {
        const {
          createEmployeeDataExportService,
        } = require('./services/hr/employeeDataExportService');
        dataExportService = createEmployeeDataExportService({
          employeeModel: softRequire('./models/HR/Employee'),
          employmentContractModel: softRequire('./models/hr/EmploymentContract'),
          certificationModel: softRequire('./models/hr/Certification'),
          leaveBalanceModel: softRequire('./models/hr/LeaveBalance'),
          leaveModel: softRequire('./models/hr/Leave'),
          performanceReviewModel: softRequire('./models/hr/PerformanceReview'),
          changeRequestModel: softRequire('./models/hr/HrChangeRequest'),
          auditService,
        });
      } catch (expErr) {
        logger.warn('[HrDataExport] service init skipped:', expErr.message);
      }
      const selfServiceRouter = createEmployeeSelfServiceRouter({
        service: selfServiceService,
        auditService,
        dataExportService,
        logger,
      });
      app.use('/api/v1/hr', authenticate, selfServiceRouter);
      logger.info('[HrSelfService] ✓ /api/v1/hr/me mounted');
    } catch (selfErr) {
      logger.warn('[HrSelfService] routes skipped:', selfErr.message);
    }

    // Phase 11 Commits 8 + 10 + 11 + 12 — admin directory, detail,
    // PATCH with field-level RBAC, approval workflow state machine,
    // and the workflow REST surface. All share the same adminService
    // instance so the approval gate (C11) is opt-in at boot: when the
    // ChangeRequest service is wired into adminService.updateEmployee,
    // sensitive patches route to the pending queue.
    try {
      const { createEmployeeAdminService } = require('./services/hr/employeeAdminService');
      const { createEmployeeAdminRouter } = require('./routes/hr/employee-admin.routes');
      const { createHrChangeRequestService } = require('./services/hr/hrChangeRequestService');
      const { createHrChangeRequestsRouter } = require('./routes/hr/hr-change-requests.routes');

      const EmployeeModel = softRequire('./models/HR/Employee');
      const HrChangeRequestModel = softRequire('./models/hr/HrChangeRequest');

      // Build the workflow service when its model is available;
      // absent model → admin PATCH falls back to immediate-apply
      // (legacy path from before C11). Either path is safe.
      const changeRequestService = HrChangeRequestModel
        ? createHrChangeRequestService({
            changeRequestModel: HrChangeRequestModel,
            employeeModel: EmployeeModel,
            auditService,
          })
        : null;

      const adminService = createEmployeeAdminService({
        employeeModel: EmployeeModel,
        auditService,
        changeRequestService,
      });
      // Phase-11 C18 — thread the dataExportService (built in the
      // self-service block above) through to the admin router so
      // the `/employees/:id/data-export` endpoint works. The service
      // is a closure over the top-level app.js scope — admin needs
      // to re-build its own reference since the self-service block
      // scopes it locally.
      let adminDataExportService = null;
      try {
        const {
          createEmployeeDataExportService,
        } = require('./services/hr/employeeDataExportService');
        adminDataExportService = createEmployeeDataExportService({
          employeeModel: EmployeeModel,
          employmentContractModel: softRequire('./models/hr/EmploymentContract'),
          certificationModel: softRequire('./models/hr/Certification'),
          leaveBalanceModel: softRequire('./models/hr/LeaveBalance'),
          leaveModel: softRequire('./models/hr/Leave'),
          performanceReviewModel: softRequire('./models/hr/PerformanceReview'),
          changeRequestModel: HrChangeRequestModel,
          auditService,
        });
      } catch (expErr) {
        logger.warn('[HrAdminExport] service init skipped:', expErr.message);
      }
      const adminRouter = createEmployeeAdminRouter({
        service: adminService,
        auditService,
        dataExportService: adminDataExportService,
        logger,
      });
      app.use('/api/v1/hr', authenticate, adminRouter);
      logger.info(
        `[HrEmployeeAdmin] ✓ /api/v1/hr/employees mounted (approval=${changeRequestService ? 'on' : 'off'})`
      );

      // Phase 11 C24 + C26 — HR ops observability:
      //   GET /ops/anomaly-scheduler  — scheduler status (C24)
      //   POST /ops/anomaly-scheduler/tick — manual trigger (C24)
      //   GET /ops/metrics — Prometheus text exposition (C26)
      // Late-binds to server._hrAnomalyScheduler set by server.js boot.
      try {
        const { createHrOpsRouter } = require('./routes/hr/hr-ops.routes');
        const { createHrMetricsService } = require('./services/hr/hrMetricsService');
        const { createHrHealthService } = require('./services/hr/hrHealthService');
        const { createHrConfigService } = require('./services/hr/hrConfigService');

        // Metrics service wraps auditLog + change-request models +
        // the same scheduler instance the status endpoint exposes.
        // Models missing → corresponding metric block omitted.
        const metricsAuditLog = auditLogModel ? auditLogModel.AuditLog || auditLogModel : null;
        const metricsService = createHrMetricsService({
          auditLogModel: metricsAuditLog,
          changeRequestModel: HrChangeRequestModel,
          // Resolve at construction — same late-binding pattern
          // isn't strictly needed because the service's output
          // re-reads scheduler.getStatus() each call. Just pass
          // a lazy resolver.
          scheduler: {
            getStatus: () => {
              const s = app._hrAnomalyScheduler;
              return s
                ? s.getStatus()
                : { isRunning: false, runCount: 0, skipCount: 0, intervalMs: 0 };
            },
          },
        });
        // Phase-11 C30 — aggregated health check. Uses the same
        // auditLog + changeRequest models + a late-bound scheduler
        // resolver.
        const healthService = createHrHealthService({
          auditLogModel: metricsAuditLog,
          changeRequestModel: HrChangeRequestModel,
          getScheduler: () => app._hrAnomalyScheduler || null,
        });
        // Phase-11 C32 — config inspector. Pure env reader, no deps.
        const configService = createHrConfigService({});
        const opsRouter = createHrOpsRouter({
          resolveScheduler: () => app._hrAnomalyScheduler || null,
          metricsService,
          healthService,
          configService,
          logger,
        });
        app.use('/api/v1/hr', authenticate, opsRouter);
        logger.info('[HrOps] ✓ /api/v1/hr/ops/{anomaly-scheduler,metrics,health,config} mounted');
      } catch (opsErr) {
        logger.warn('[HrOps] routes skipped:', opsErr.message);
      }

      // Phase 11 C21 — anomaly review workflow. Needs only the
      // AuditLog model; wired independently of the change-request
      // block so anomalies survive even if change-requests don't.
      try {
        const { createHrAnomalyReviewService } = require('./services/hr/hrAnomalyReviewService');
        const { createHrAnomaliesRouter } = require('./routes/hr/hr-anomalies.routes');
        const auditLogModelRaw = softRequire('./models/auditLog.model');
        const AuditLogForAnomalies = auditLogModelRaw
          ? auditLogModelRaw.AuditLog || auditLogModelRaw
          : null;
        if (AuditLogForAnomalies) {
          const anomalySvc = createHrAnomalyReviewService({
            auditLogModel: AuditLogForAnomalies,
            auditService,
          });
          const anomaliesRouter = createHrAnomaliesRouter({
            service: anomalySvc,
            logger,
          });
          app.use('/api/v1/hr', authenticate, anomaliesRouter);
          logger.info('[HrAnomalies] ✓ /api/v1/hr/anomalies mounted');
        }
      } catch (anomErr) {
        logger.warn('[HrAnomalies] routes skipped:', anomErr.message);
      }

      if (changeRequestService && HrChangeRequestModel) {
        const crRouter = createHrChangeRequestsRouter({
          changeRequestService,
          changeRequestModel: HrChangeRequestModel,
          logger,
        });
        app.use('/api/v1/hr', authenticate, crRouter);
        logger.info('[HrChangeRequests] ✓ /api/v1/hr/change-requests mounted');

        // Phase 11 C14 — per-user inbox for the approval workflow.
        // Pull-based notification surface: approvers see what's
        // awaiting their signature, requestors see their own pending
        // + recently-decided items.
        try {
          const { createHrInboxService } = require('./services/hr/hrInboxService');
          const { createHrInboxRouter } = require('./routes/hr/hr-inbox.routes');
          const inboxSvc = createHrInboxService({
            changeRequestModel: HrChangeRequestModel,
          });
          const inboxRouter = createHrInboxRouter({ service: inboxSvc, logger });
          app.use('/api/v1/hr', authenticate, inboxRouter);
          logger.info('[HrInbox] ✓ /api/v1/hr/inbox mounted');
        } catch (inboxErr) {
          logger.warn('[HrInbox] routes skipped:', inboxErr.message);
        }
      }

      // HR Smart Analytics — تحليلات ذكية شاملة
      try {
        const { createHrSmartAnalyticsRouter } = require('./routes/hr/hr-smart-analytics.routes');
        app.use(
          '/api/v1/hr/smart-analytics',
          authenticate,
          createHrSmartAnalyticsRouter({ logger })
        );
        logger.info('[HrSmartAnalytics] ✓ /api/v1/hr/smart-analytics mounted');
      } catch (saErr) {
        logger.warn('[HrSmartAnalytics] routes skipped:', saErr.message);
      }

      // HR Extensions — Phase 30 follow-up (Document Vault + OKRs + Recruitment + Saudi Compliance)
      try {
        const { createHrExtensionsRouter } = require('./routes/hr/hr-extensions.routes');
        app.use('/api/v1/hr', authenticate, createHrExtensionsRouter({ logger }));
        logger.info(
          '[HrExtensions] ✓ /api/v1/hr/(documents|goals|vacancies|saudi-compliance) mounted'
        );
      } catch (extErr) {
        logger.warn('[HrExtensions] routes skipped:', extErr.message);
      }

      // HR Modules — Round 10 mega-router (onboarding + loans + travel + insurance
      // + bands + positions + surveys + assets + kudos + policies + shift-swaps
      // + visas + org-chart + time-off-calendar + WPS export)
      try {
        const { createHrModulesRouter } = require('./routes/hr/hr-modules.routes');
        app.use('/api/v1/hr', authenticate, createHrModulesRouter({ logger }));
        logger.info('[HrModules] ✓ /api/v1/hr/(onboarding|loans|travel|...|wps) mounted');
      } catch (modErr) {
        logger.warn('[HrModules] routes skipped:', modErr.message);
      }

      // HR Workflow Automation Engine — Phase 30 (Intelligent HR Platform)
      try {
        const { createHrWorkflowRouter } = require('./routes/hr/hr-workflow.routes');
        let workflowNotifier = null;
        let workflowAudit = null;
        try {
          workflowNotifier = require('./services/unifiedNotifier');
        } catch {
          /* optional */
        }
        try {
          const AuditLog = require('./models/AuditLog');
          workflowAudit = {
            async log(entry) {
              try {
                await AuditLog.create({
                  eventType: entry.action || 'hr.workflow.rule_fired',
                  eventCategory: 'hr',
                  severity: entry.severity || 'info',
                  status: 'success',
                  action: entry.action || 'hr.workflow.rule_fired',
                  resource: { type: entry.entityType, id: entry.entityId || null },
                  metadata: entry.metadata || {},
                  timestamp: new Date(),
                });
              } catch (e) {
                logger.warn('[hr-workflow audit]', e.message);
              }
            },
          };
        } catch {
          /* optional */
        }
        app.use(
          '/api/v1/hr/workflow',
          authenticate,
          createHrWorkflowRouter({ logger, notifier: workflowNotifier, auditLogger: workflowAudit })
        );
        logger.info('[HrWorkflow] ✓ /api/v1/hr/workflow mounted');
      } catch (wfErr) {
        logger.warn('[HrWorkflow] routes skipped:', wfErr.message);
      }

      // HR Copilot (LLM) — Phase 30
      try {
        const { createHrCopilot } = require('./services/hr/hrCopilot.service');
        const { createHrCopilotRouter } = require('./routes/hr/hr-copilot.routes');

        // Anthropic SDK is INJECTED. We try to wire it from the shared
        // platform client (Phase 18 dashboard narrative). If unavailable,
        // every copilot call returns { available: false } gracefully.
        let anthropicClient = null;
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            // SDK 0.30+ exports both .default and named .Anthropic; older
            // versions exported the constructor directly. Handle all three.
            const mod = require('@anthropic-ai/sdk');
            const Anthropic = mod.Anthropic || mod.default || mod;
            if (typeof Anthropic === 'function') {
              anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            } else {
              logger.warn('[HrCopilot] SDK shape not recognized; copilot will degrade');
            }
          } catch (sdkErr) {
            logger.warn('[HrCopilot] @anthropic-ai/sdk not installed:', sdkErr.message);
          }
        }

        let copilotAudit = null;
        try {
          const AuditLog = require('./models/AuditLog');
          copilotAudit = {
            async log(entry) {
              // Translate router's natural shape into the canonical
              // AuditLog schema. Without this the writes fail mongoose
              // validation (no `eventType` field, no `eventCategory`).
              try {
                await AuditLog.create({
                  eventType: entry.action || 'hr.copilot.q_and_a',
                  eventCategory: 'hr',
                  userId: entry.actorUserId || null,
                  severity: 'info',
                  status: 'success',
                  action: entry.action || 'hr.copilot.q_and_a',
                  resource: { type: entry.entityType || 'hr_copilot' },
                  metadata: entry.metadata || {},
                  ipAddress: entry.ipAddress || null,
                  timestamp: new Date(),
                });
              } catch (e) {
                logger.warn('[hr-copilot audit]', e.message);
              }
            },
          };
        } catch {
          /* optional */
        }

        const copilot = createHrCopilot({ anthropicClient, logger });
        app.use(
          '/api/v1/hr/copilot',
          authenticate,
          createHrCopilotRouter({ logger, copilot, auditLogger: copilotAudit })
        );
        logger.info(
          `[HrCopilot] ✓ /api/v1/hr/copilot mounted (available=${copilot.isAvailable()})`
        );

        // ── AI Briefing (Wave 4 — Morning Briefing + Next Best Action) ──
        // Reuses the same Anthropic client. When the key isn't set,
        // the service falls back to a deterministic rule-based output
        // built from active Wave-3 alerts so the UX stays consistent.
        try {
          const { createBriefingService } = require('./services/briefing.service');
          const { createAiBriefingRouter } = require('./routes/ai-briefing.routes');

          const briefing = createBriefingService({ anthropicClient, logger });

          // The `getAlerts` callback pulls live alert findings from the
          // persisted Alert model (populated by the alerts engine +
          // dispatcher). Defensive try/catch + lean queries keep the
          // route resilient when Mongo is briefly unavailable.
          let AlertDocModel = null;
          try {
            AlertDocModel = require('./alerts/alert.model');
          } catch (modelErr) {
            logger.warn('[AiBriefing] alert.model unavailable:', modelErr.message);
          }

          async function getAlerts(req) {
            if (!AlertDocModel) return [];
            try {
              const branchId = req.user?.activeBranchId || req.user?.branchId || null;
              const query = { status: { $in: ['open', 'active'] } };
              if (branchId) query.branchId = branchId;
              const rows = await AlertDocModel.find(query).sort({ createdAt: -1 }).limit(25).lean();
              return rows.map(r => ({
                ruleId: r.ruleId,
                key: `${r.ruleId}::${r.key || ''}`,
                severity: r.severity || 'warning',
                category: r.category || 'operational',
                headlineAr: r.message || null,
                headlineEn: r.message || null,
                firstFiredAt: r.createdAt ? new Date(r.createdAt).getTime() : null,
                branchId: r.branchId || null,
              }));
            } catch (err) {
              logger.warn('[AiBriefing] getAlerts query failed: ' + err.message);
              return [];
            }
          }

          // Reuse the HR-copilot audit logger pattern — same eventCategory
          // ('hr') is wrong; mark these as 'security' since they cover
          // PDPL Art.13 (audit of automated processing).
          const briefingAudit = copilotAudit
            ? {
                async log(entry) {
                  return copilotAudit.log({
                    ...entry,
                    action: entry.action || 'ai.briefing.morning',
                  });
                },
              }
            : null;

          // Wave 16 — owned-alerts callback for Next-Best-Action
          // scope tightening. Falls back to broader getAlerts() when
          // the user has no assignments yet (so a freshly-onboarded
          // operator still gets something useful in their briefing).
          async function getOwnedAlerts(req) {
            if (!AlertDocModel) return [];
            try {
              const userId = req.user?.id || req.user?._id;
              if (!userId) return [];
              const rows = await AlertDocModel.find({
                resolvedAt: null,
                'ownership.assignedTo': userId,
                'escalation.currentTier': { $lt: 3 },
              })
                .sort({ severity: -1, firstSeenAt: 1 })
                .limit(25)
                .lean();
              return rows.map(r => ({
                ruleId: r.ruleId,
                key: `${r.ruleId}::${r.key || ''}`,
                severity: r.severity || 'warning',
                category: r.category || 'operational',
                headlineAr: r.message || null,
                headlineEn: r.message || null,
                firstFiredAt: r.createdAt ? new Date(r.createdAt).getTime() : null,
                branchId: r.branchId || null,
              }));
            } catch (err) {
              logger.warn('[AiBriefing] getOwnedAlerts query failed: ' + err.message);
              return [];
            }
          }

          app.use(
            '/api/v1/ai/briefing',
            authenticate,
            createAiBriefingRouter({
              logger,
              briefing,
              getAlerts,
              getOwnedAlerts,
              auditLogger: briefingAudit,
            })
          );
          logger.info(
            `[AiBriefing] ✓ /api/v1/ai/briefing mounted (available=${briefing.isAvailable()})`
          );
        } catch (briefingErr) {
          logger.warn('[AiBriefing] routes skipped:', briefingErr.message);
        }
      } catch (cpErr) {
        logger.warn('[HrCopilot] routes skipped:', cpErr.message);
      }
    } catch (adminErr) {
      logger.warn(`[HrEmployeeAdmin] routes skipped: ${adminErr.message}`, {
        stack: adminErr.stack,
      });
    }
  } catch (hrDashErr) {
    logger.warn(`[HrDashboard] routes skipped: ${hrDashErr.message}`, {
      stack: hrDashErr.stack,
    });
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

  // Dashboard Platform — Phase 18 Commits 1 + 2 + 4.
  //
  // C1: registry + aggregator + narrative + routes (pending resolver).
  // C2: real dashboardKpiResolver (Phase-10 dispatch + direct computers + LRU cache).
  // C4: optional LLM-backed narrative via Claude Haiku. The LLM
  //     path is disabled unless operators inject an Anthropic
  //     client at boot (`app._anthropicClient = ...`) AND set
  //     DASHBOARD_LLM_NARRATIVE_ENABLED=true. Without the client
  //     the facade falls back to the deterministic rule-based
  //     narrative from C1 — nothing breaks.
  try {
    const { buildDashboardKpiResolver } = require('./services/dashboardKpiResolver.service');
    if (!app._dashboardKpiResolver) {
      // Phase 18 Commit 6 — anomaly detection pipeline.
      // The detector is pure, the history store is in-memory LRU
      // with TTL. Every successful resolve records the value so
      // the detector has material to work with. Both are safe
      // defaults — no extra config required.
      const { createInMemoryHistoryStore } = require('./services/kpiHistoryStore.service');
      const anomalyDetector = require('./services/anomalyDetector.service');
      app._dashboardHistoryStore = app._dashboardHistoryStore || createInMemoryHistoryStore();
      app._dashboardKpiResolver = buildDashboardKpiResolver({
        logger,
        historyStore: app._dashboardHistoryStore,
        anomalyDetector,
      });
      logger.info('[DashboardPlatform] ✓ dashboardKpiResolver built (with anomaly detector)');
    }

    // LLM narrative facade — opt-in, safe by default.
    const llmEnabled =
      String(process.env['DASHBOARD_LLM_NARRATIVE_ENABLED'] || '').toLowerCase() === 'true';
    const anthropicClient = app._anthropicClient || null;
    let llmGenerator = null;
    if (llmEnabled && anthropicClient) {
      const { buildLlmNarrativeGenerator } = require('./services/llmNarrativeGenerator.service');
      llmGenerator = buildLlmNarrativeGenerator({
        anthropicClient,
        logger,
        model: process.env['DASHBOARD_LLM_NARRATIVE_MODEL'] || undefined,
      });
      logger.info('[DashboardPlatform] ✓ LLM narrative generator enabled');
    } else {
      logger.info('[DashboardPlatform] LLM narrative disabled — using deterministic rules');
    }
    const { buildNarrativeFacade } = require('./services/dashboardNarrativeFacade.service');
    app._dashboardNarrativeFacade = buildNarrativeFacade({ llmGenerator, logger });

    // Phase 18 Commit 8 — alert coordinator + admin HTTP surface.
    // Mounted BEFORE the main dashboards router so the
    // `/api/v1/dashboards/alerts` prefix wins against
    // `/api/v1/dashboards/:id`.
    const { buildAlertCoordinator } = require('./services/dashboardAlertCoordinator.service');
    const { createInMemoryStore } = require('./services/alertStateStore.service');
    if (!app._alertCoordinator) {
      const stateStore = createInMemoryStore();

      // Phase 18 Commit 8.1 — wire the real dispatcher to the
      // `unifiedNotifier`. The dispatcher is ONLY built when
      // operators also supply a user resolver via
      // `app._resolveAlertRecipients`. Without a resolver we
      // cannot know who to page, so we stay in noop mode and
      // just record decisions.
      let dispatcher;
      const resolveRecipients = app._resolveAlertRecipients;
      if (typeof resolveRecipients === 'function') {
        try {
          const unifiedNotifier = require('./services/unifiedNotifier');
          const {
            buildAlertNotificationDispatcher,
          } = require('./services/alertNotificationDispatcher.service');
          const alertDispatcher = buildAlertNotificationDispatcher({
            notifier: unifiedNotifier,
            resolveRecipients,
            logger,
          });
          dispatcher = alertDispatcher.dispatch;
          logger.info('[DashboardPlatform] ✓ alert dispatcher wired to unifiedNotifier');
        } catch (dispErr) {
          logger.warn('[DashboardPlatform] alert dispatcher skipped:', dispErr.message);
        }
      } else {
        logger.info(
          '[DashboardPlatform] alert dispatcher left noop — set app._resolveAlertRecipients to wire paging'
        );
      }

      app._alertCoordinator = buildAlertCoordinator({
        stateStore,
        dispatcher,
        logger,
      });
    }
    const { buildRouter: buildAlertsRouter } = require('./routes/dashboard-alerts.routes');
    app.use('/api/v1/dashboards/alerts', authenticate, buildAlertsRouter());
    logger.info('[DashboardPlatform] ✓ alert routes mounted at /api/v1/dashboards/alerts');

    // Phase 18 Commit 9 — saved views (bookmarks + shareable links).
    // Mounted BEFORE `/api/v1/dashboards/:id` so `/saved-views`
    // wins. Store is in-memory by default; operators swap in a
    // Mongo/Redis equivalent via `app._savedViewStore` before mount.
    if (!app._savedViewStore) {
      const { createInMemorySavedViewStore } = require('./services/savedViewStore.service');
      app._savedViewStore = createInMemorySavedViewStore();
      logger.info('[DashboardPlatform] ✓ saved view store built (in-memory)');
    }
    const { buildRouter: buildSavedViewsRouter } = require('./routes/dashboard-saved-views.routes');
    app.use('/api/v1/dashboards/saved-views', authenticate, buildSavedViewsRouter());
    logger.info('[DashboardPlatform] ✓ saved-views routes mounted');

    // Phase 18 Commit 8.2 — periodic alert evaluator. The
    // coordinator only evaluates lazily; the scheduler fires ticks
    // so alerts land even when nobody is watching a dashboard.
    // Disabled in test env + when DASHBOARD_ALERT_SCHEDULER=off.
    const isTestEnvForSched = process.env['NODE_ENV'] === 'test';
    const schedEnabled = (process.env['DASHBOARD_ALERT_SCHEDULER'] || '').toLowerCase() !== 'off';
    if (!app._alertScheduler && !isTestEnvForSched && schedEnabled) {
      try {
        const { buildAlertScheduler } = require('./services/dashboardAlertScheduler.service');
        const intervalMs =
          Number(process.env['DASHBOARD_ALERT_SCHEDULER_INTERVAL_MS']) || undefined;
        app._alertScheduler = buildAlertScheduler({
          coordinator: app._alertCoordinator,
          kpiResolver: app._dashboardKpiResolver,
          intervalMs,
          logger,
        });
        app._alertScheduler.start();
        logger.info('[DashboardPlatform] ✓ alert scheduler started');
      } catch (schedErr) {
        logger.warn('[DashboardPlatform] alert scheduler skipped:', schedErr.message);
      }
    } else if (isTestEnvForSched) {
      logger.info('[DashboardPlatform] alert scheduler disabled (test env)');
    }

    // Phase 18 Commit 5 — scheduled dashboard delivery.
    // Requires an opt-in recipient resolver (same shape as the
    // alert dispatcher's). Without it, the delivery scheduler is
    // not started — we never page if nobody wired the resolver.
    const deliveryEnabled =
      !isTestEnvForSched &&
      (process.env['DASHBOARD_DELIVERY_SCHEDULER'] || '').toLowerCase() !== 'off' &&
      typeof app._resolveAlertRecipients === 'function';
    if (deliveryEnabled && !app._deliveryScheduler) {
      try {
        const { buildDeliveryScheduler } = require('./services/dashboardDeliveryScheduler.service');
        const snapshotRenderer = require('./services/dashboardSnapshotRenderer.service');
        const dashboardAggregator = require('./services/dashboardAggregator.service');
        const unifiedNotifier = require('./services/unifiedNotifier');
        const deliveryIntervalMs =
          Number(process.env['DASHBOARD_DELIVERY_SCHEDULER_INTERVAL_MS']) || undefined;
        app._deliveryScheduler = buildDeliveryScheduler({
          buildDashboard: ({ dashboardId }) =>
            dashboardAggregator.build({
              dashboardId,
              role: 'super_admin',
              kpiResolver: app._dashboardKpiResolver,
              narrativeService: app._dashboardNarrativeFacade,
            }),
          renderer: snapshotRenderer,
          notifier: unifiedNotifier,
          resolveRecipients: app._resolveAlertRecipients,
          intervalMs: deliveryIntervalMs,
          logger,
        });
        app._deliveryScheduler.start();
        logger.info('[DashboardPlatform] ✓ delivery scheduler started');
      } catch (delErr) {
        logger.warn('[DashboardPlatform] delivery scheduler skipped:', delErr.message);
      }
    }

    const { buildRouter: buildDashboardsRouter } = require('./routes/dashboards-platform.routes');
    app.use(
      '/api/v1/dashboards',
      authenticate,
      buildDashboardsRouter({
        kpiResolver: app._dashboardKpiResolver,
        narrativeService: app._dashboardNarrativeFacade,
      })
    );
    logger.info('[DashboardPlatform] ✓ routes mounted at /api/v1/dashboards');
  } catch (dashErr) {
    logger.warn('[DashboardPlatform] routes skipped:', dashErr.message);
  }
  // Fire the periodic sweep in non-test env only. Tests run `runOnce`
  // directly when they need to; a live cron would flake them.
  if (!isTestEnv && cronDep) {
    redFlags.scheduler.start({ expression: '0 */6 * * *' });
  }
} catch (err) {
  logger.warn('[RedFlag] bootstrap skipped:', err.message);
}

// ─── Smart Alerts Engine (Wave 7) ─────────────────────────────────────────────
// Bridges the 19 rules in `backend/alerts/rules/` (5 baseline +
// 13 Wave-3 + 1 Wave-5 EWMA) into a live scheduler. Until this
// hook landed, the rules were authored and tested but never
// evaluated in production — every alert came from the Phase-18
// dashboardAlertCoordinator only.
//
// Opt-in via `ALERTS_ENGINE_ENABLED=true`. Disabled by default so
// existing deployments that haven't reviewed recipient routing
// don't suddenly start emailing operators. Test env is excluded
// regardless of the flag because a live tick interval would flake
// the suite.
try {
  const alertsEnabled = String(process.env['ALERTS_ENGINE_ENABLED'] || '').toLowerCase() === 'true';
  const isTestEnvAlerts = process.env['NODE_ENV'] === 'test';
  if (alertsEnabled && !isTestEnvAlerts && !app._smartAlertsStack) {
    const { buildAlertsStack } = require('./alerts/bootstrap');

    // Reuse the dashboard's kpiHistoryStore so the EWMA bridge sees
    // the same series the dashboard already records. Falls back to
    // `null` when the dashboard platform wasn't built — the bridge
    // rule degrades to a no-op in that case.
    const sharedHistoryStore = app._dashboardHistoryStore || null;

    // Lazy model loader — each rule defensively checks `ctx.models.X`,
    // so a missing model just means that rule yields []. We only
    // surface models that Wave 3 rules actually reference.
    const modelNames = [
      'Credential',
      'IRP',
      'Invoice',
      'Incident',
      'Document',
      'PdplRequest',
      'CarePlan',
      'Goal',
      'Vaccination',
      'EmploymentContract',
    ];
    const liveModels = {};
    for (const name of modelNames) {
      try {
        liveModels[name] = require(`./models/${name}`);
      } catch (modelErr) {
        logger.warn(`[SmartAlerts] model ${name} unavailable: ${modelErr.message}`);
      }
    }

    const intervalMs = Number(process.env['ALERTS_ENGINE_INTERVAL_MS']) || undefined;

    const stack = buildAlertsStack({
      models: liveModels,
      kpiHistoryStore: sharedHistoryStore,
      ...(intervalMs ? { intervalMs } : {}),
      logger,
    });
    stack.scheduler.start(stack.ctxFactory);
    app._smartAlertsStack = stack;
    logger.info(
      `[SmartAlerts] ✓ engine started — ${stack.rules.length} rules, ` +
        `kpiHistoryStore=${sharedHistoryStore ? 'on' : 'off'}, ` +
        `interval=${intervalMs || '5min'}`
    );
  } else if (!alertsEnabled) {
    logger.info('[SmartAlerts] engine disabled — set ALERTS_ENGINE_ENABLED=true to activate');
  }
} catch (saErr) {
  logger.warn('[SmartAlerts] bootstrap skipped:', saErr.message);
}

// ─── Alert & Priority Engine HTTP surface (Wave 15) ───────────────────────────
// Independent of `ALERTS_ENGINE_ENABLED` — operators can still triage
// historical / manually-created alerts through these endpoints even
// when the scheduler is off. The router doesn't trigger any rule
// evaluation; it only acts on existing Alert documents.
try {
  const { createAlertWorkflow } = require('./alerts/workflow.service');
  const { createAlertsWorkflowRouter } = require('./routes/alerts-workflow.routes');
  const { createAlertsDashboardRouter } = require('./routes/alerts-dashboard.routes');

  // Reuse the HrCopilot audit logger pattern — same AuditLog target,
  // distinct action namespace (`alert.*`).
  let alertAudit = null;
  try {
    const AuditLog = require('./models/AuditLog');
    alertAudit = {
      async log(entry) {
        try {
          await AuditLog.create({
            eventType: entry.action || 'alert.workflow',
            eventCategory: 'security',
            userId: entry.actorUserId || null,
            severity: 'info',
            status: 'success',
            action: entry.action || 'alert.workflow',
            resource: { type: entry.entityType || 'Alert', id: entry.entityId || null },
            metadata: entry.metadata || {},
            ipAddress: entry.ipAddress || null,
            timestamp: new Date(),
          });
        } catch (e) {
          logger.warn('[alert-workflow audit]', e.message);
        }
      },
    };
  } catch {
    /* AuditLog model optional */
  }

  const workflow = createAlertWorkflow({ auditLogger: alertAudit, logger });
  // Require the auth middleware inline — `authenticate` is only
  // in scope inside the bootstrap closures higher up the file, so
  // outer top-level wiring resolves it through the module directly.
  const { authenticate: alertsAuthMw } = require('./middleware/auth');
  // Wave 27 — late-binding so app._productivityService is resolved at
  // call-time (productivity wiring lives further down in this file).
  const alertsAfterSuccessfulAction = async args => {
    if (typeof app._productivityService?.createFollowUpFromEvent === 'function') {
      return app._productivityService.createFollowUpFromEvent(args);
    }
    return null;
  };
  app.use(
    '/api/v1/alerts',
    alertsAuthMw,
    createAlertsWorkflowRouter({
      workflow,
      afterSuccessfulAction: alertsAfterSuccessfulAction,
      logger,
    })
  );
  app.use('/api/v1/alerts/dashboard', alertsAuthMw, createAlertsDashboardRouter());
  logger.info('[AlertEngine] ✓ workflow + dashboard routes mounted at /api/v1/alerts');

  // ── Wave 13 — Escalation scheduler (separate opt-in flag) ───
  // Off by default. When ALERTS_ESCALATION_ENABLED=true the
  // coordinator runs every 5 minutes and promotes tier 1→2→3 based
  // on the rule's declared (or default) thresholds.
  const escEnabled =
    String(process.env['ALERTS_ESCALATION_ENABLED'] || '').toLowerCase() === 'true';
  const isTestEnvEsc = process.env['NODE_ENV'] === 'test';
  if (escEnabled && !isTestEnvEsc && !app._escalationTimer) {
    const { createEscalationCoordinator } = require('./alerts/escalation.service');
    const escalationIntervalMs =
      Number(process.env['ALERTS_ESCALATION_INTERVAL_MS']) || 5 * 60 * 1000;

    // Wave 16 — bind notifyTier to unifiedNotifier when the
    // recipient resolver is configured. Otherwise fall back to
    // the log-only stub from Wave 13. The recipient resolver
    // lives on `app._resolveAlertRecipients` (set externally by
    // ops integration code).
    let notifyTier;
    const resolveUsersForRole = app._resolveUsersForRole;
    if (typeof resolveUsersForRole === 'function') {
      try {
        const unifiedNotifier = require('./services/unifiedNotifier');
        const { buildTierNotifier } = require('./alerts/tier-notifier.service');
        notifyTier = buildTierNotifier({
          notify: unifiedNotifier.notify,
          resolveUsersForRole,
          logger,
        });
        logger.info('[AlertEngine] ✓ tier notifier wired to unifiedNotifier');
      } catch (notifyErr) {
        logger.warn(
          '[AlertEngine] tier notifier wiring failed, falling back to log-only: ' +
            notifyErr.message
        );
      }
    }
    if (!notifyTier) {
      // Log-only fallback — keeps the escalation chain visible in
      // app logs and `alert.state.transitions` even without paging.
      notifyTier = async ({ tier, roles, alert }) => {
        logger.info(
          `[escalation] alert ${alert._id} promoted to tier ${tier}, ` +
            `roles: ${roles.join(', ')} (notifier not wired — set app._resolveUsersForRole)`
        );
      };
    }

    const escCoord = createEscalationCoordinator({
      notifyTier,
      auditLogger: alertAudit,
      logger,
    });
    app._escalationTimer = setInterval(() => {
      // Fire-and-forget; the coordinator never throws.
      escCoord
        .processEscalations()
        .then(summary => {
          if (summary.errors.length || summary.promotedTo2 || summary.promotedTo3) {
            logger.info(
              `[escalation] tick: checked=${summary.checked}, ` +
                `promotedTo2=${summary.promotedTo2}, promotedTo3=${summary.promotedTo3}, ` +
                `errors=${summary.errors.length}`
            );
          }
        })
        .catch(e => logger.warn(`[escalation] tick crashed: ${e.message}`));
    }, escalationIntervalMs);
    // Keep-alive timer must not pin Node when the rest of the app
    // shuts down (e.g. graceful test exit).
    if (app._escalationTimer.unref) app._escalationTimer.unref();
    logger.info(
      `[AlertEngine] ✓ escalation scheduler started — interval=${escalationIntervalMs}ms`
    );
  } else if (!escEnabled) {
    logger.info(
      '[AlertEngine] escalation disabled — set ALERTS_ESCALATION_ENABLED=true to activate'
    );
  }
} catch (apiErr) {
  logger.warn('[AlertEngine] routes skipped:', apiErr.message);
}

// ─── Intelligence Layer HTTP surface (Wave 18-19) ─────────────────────────────
// Always-on (no env flag). The generators don't run automatically here
// — they're invoked by a separate orchestrator (Wave 20). These routes
// expose the read/feedback surface for whatever insights already exist.
try {
  const { createInsightsService } = require('./intelligence/insights.service');
  const { createInsightsRouter } = require('./routes/insights.routes');

  let insightAudit = null;
  try {
    const AuditLog = require('./models/AuditLog');
    insightAudit = {
      async log(entry) {
        try {
          await AuditLog.create({
            eventType: entry.action || 'insight.feedback',
            eventCategory: 'security',
            userId: entry.actorUserId || null,
            severity: 'info',
            status: 'success',
            action: entry.action || 'insight.feedback',
            resource: { type: entry.entityType || 'Insight', id: entry.entityId || null },
            metadata: entry.metadata || {},
            ipAddress: entry.ipAddress || null,
            timestamp: new Date(),
          });
        } catch (e) {
          logger.warn('[insights audit]', e.message);
        }
      },
    };
  } catch {
    /* AuditLog model optional */
  }

  const insightsService = createInsightsService({ auditLogger: insightAudit, logger });
  // Expose so Wave 28 orchestrator boot can reuse the same service
  // (and so admin tools can introspect).
  app._insightsService = insightsService;
  const { authenticate: insightsAuthMw } = require('./middleware/auth');
  // Wave 27 — late-binding hook (same pattern as alerts).
  const insightsAfterSuccessfulAction = async args => {
    if (typeof app._productivityService?.createFollowUpFromEvent === 'function') {
      return app._productivityService.createFollowUpFromEvent(args);
    }
    return null;
  };
  app.use(
    '/api/v1/insights',
    insightsAuthMw,
    createInsightsRouter({
      insights: insightsService,
      afterSuccessfulAction: insightsAfterSuccessfulAction,
      logger,
    })
  );
  logger.info('[Intelligence] ✓ insights routes mounted at /api/v1/insights');
} catch (insightsErr) {
  logger.warn('[Intelligence] routes skipped:', insightsErr.message);
}

// ─── Intelligence Orchestrator Scheduler (Wave 28) ────────────────────────────
// Boots the Wave-20 orchestrator on a scheduler (cron-like, KSA-aware).
// Opt-in via INTELLIGENCE_ORCHESTRATOR_ENABLED=true so tests/dev stay quiet.
//
// Cadences (default, overridable per-generator):
//   anomaly.v1            every 15 min
//   care-gap.v1           every 30 min
//   trend-deviation.v1    every 60 min
//   data-quality.v1       every 60 min
//   end-of-day.v1         daily 16:30 KSA
//   executive-digest.v1   weekly Monday 07:00 KSA
//
// Each generator needs a data-loader to supply its ctx. Wave 28 ships ONE
// reference loader (data-quality.v1) + stub loaders for the other 5 — the
// stubs return empty contexts so generators emit zero payloads until each
// domain's real loader is wired in Wave 29.
const orchestratorEnabled =
  String(process.env['INTELLIGENCE_ORCHESTRATOR_ENABLED'] || '').toLowerCase() === 'true';
const isTestEnvOrch = process.env['NODE_ENV'] === 'test';
if (orchestratorEnabled && !isTestEnvOrch && app._insightsService) {
  try {
    const { createOrchestrator } = require('./intelligence/orchestrator.service');
    const {
      createOrchestratorScheduler,
    } = require('./intelligence/orchestrator-scheduler.service');
    const { buildLoaders } = require('./intelligence/orchestrator-loaders.registry');
    const dqRegistry = require('./intelligence/data-quality.registry');

    // Register the 6 ready generators.
    const generators = [
      require('./intelligence/generators/care-gap.generator'),
      require('./intelligence/generators/anomaly.generator'),
      require('./intelligence/generators/trend-deviation.generator'),
      require('./intelligence/generators/data-quality.generator'),
      require('./intelligence/generators/end-of-day.generator'),
      require('./intelligence/generators/executive-digest.generator'),
    ];

    // Wave 29-30 — collect the Mongoose models loaders may need.
    // Each model is optional (loader gracefully falls back to stub
    // when missing). Try-require so a missing model file doesn't
    // crash boot.
    const loaderModels = {};
    for (const [key, path] of [
      // Wave 29 — care-gap loader
      ['Beneficiary', './models/Beneficiary'],
      ['CarePlan', './models/CarePlan'],
      ['SmartGoal', './models/SmartGoal'],
      ['Vaccination', './models/Vaccination'],
      // Wave 30 — kpi-series loader (anomaly + trend-deviation)
      ['KpiValue', './models/KpiValue'],
      ['KpiDefinition', './models/KpiDefinition'],
      // Wave 32 — end-of-day loader
      ['Alert', './alerts/alert.model'],
    ]) {
      try {
        const mod = require(path);
        // alert.model exports an object with `{ model }` getter; the
        // other models export the model directly.
        loaderModels[key] = mod && mod.model ? mod.model : mod;
      } catch {
        /* model not loadable in this build — loader will skip */
      }
    }
    // FollowUp comes from the productivity models bundle (Wave 27)
    try {
      const productivityModels = require('./models/Productivity');
      if (productivityModels?.FollowUp) loaderModels.FollowUp = productivityModels.FollowUp;
    } catch {
      /* productivity persistence optional */
    }

    // Wave 32 — caller-supplied loader options. Production wires
    // `endOfDayOpts.branchIds` from Branch.find() at boot time. Until
    // that's wired, the loader silently returns null → stub remains.
    // `digestOpts.metrics` should list the 6 strategic KPIs the
    // executive digest covers (with their KpiDefinition ids).
    const endOfDayOpts = process.env.INTELLIGENCE_EOD_BRANCH_IDS
      ? { branchIds: process.env.INTELLIGENCE_EOD_BRANCH_IDS.split(',').map(s => s.trim()) }
      : {};
    const digestOpts = {}; // wired in a follow-up; metrics list TBD per deployment

    const { loaders, stubbedGeneratorIds } = buildLoaders({
      deps: { dqRegistry, models: loaderModels, endOfDayOpts, digestOpts, logger },
      // realLoaders: {} — additional caller-supplied overrides
      logger,
    });

    const orchestrator = createOrchestrator({
      generators,
      dataLoaders: loaders,
      insightsService: app._insightsService,
      logger,
    });

    const intervalMs = Number(process.env['INTELLIGENCE_TICK_INTERVAL_MS']) || 60_000;
    const scheduler = createOrchestratorScheduler({
      orchestrator,
      tickIntervalMs: intervalMs,
      logger,
    });
    scheduler.start();

    app._intelligenceOrchestrator = orchestrator;
    app._intelligenceScheduler = scheduler;

    logger.info(
      `[Intelligence] ✓ orchestrator scheduler started — ` +
        `${generators.length} generators registered, ` +
        `${stubbedGeneratorIds.length} on stub loaders ` +
        `(${stubbedGeneratorIds.join(', ')})`
    );
  } catch (orchErr) {
    logger.warn('[Intelligence] orchestrator boot failed:', orchErr.message);
  }
} else if (!orchestratorEnabled) {
  logger.info(
    '[Intelligence] orchestrator disabled — set INTELLIGENCE_ORCHESTRATOR_ENABLED=true to activate'
  );
}

// ─── Drill-Down Architecture (Wave 21) ────────────────────────────────────────
// Always-on. Read-mostly endpoints; owner resolution reuses the same
// _resolveUsersForRole callback the Alert engine uses for tier-notify.
try {
  const { createDrilldownService } = require('./intelligence/drilldown.service');
  const { createDrilldownRouter } = require('./routes/drilldown.routes');

  let drilldownAudit = null;
  try {
    const AuditLog = require('./models/AuditLog');
    drilldownAudit = {
      async log(entry) {
        try {
          await AuditLog.create({
            eventType: entry.action || 'drilldown.action.invoke',
            eventCategory: 'security',
            userId: entry.actorUserId || null,
            severity: 'info',
            status: 'success',
            action: entry.action || 'drilldown.action.invoke',
            resource: { type: entry.entityType || 'KPI', id: entry.entityId || null },
            metadata: entry.metadata || {},
            ipAddress: entry.ipAddress || null,
            timestamp: new Date(),
          });
        } catch (e) {
          logger.warn('[drilldown audit]', e.message);
        }
      },
    };
  } catch {
    /* AuditLog model optional */
  }

  const drilldownService = createDrilldownService({ logger });
  const { authenticate: drillAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/drilldown',
    drillAuthMw,
    createDrilldownRouter({
      drilldown: drilldownService,
      resolveUsersForRole: app._resolveUsersForRole || null,
      auditLogger: drilldownAudit,
      logger,
    })
  );
  logger.info('[Drilldown] ✓ drilldown routes mounted at /api/v1/drilldown');
} catch (drillErr) {
  logger.warn('[Drilldown] routes skipped:', drillErr.message);
}

// ─── Data Trust & Quality Layer (Wave 22) ────────────────────────────────────
// Always-on. Read-mostly: GET endpoints + POST compute (caller supplies
// snapshot in the body — no Mongo work in the route layer).
try {
  const { createDataQualityService } = require('./intelligence/data-quality.service');
  const { createDataQualityRouter } = require('./routes/data-quality.routes');
  const dqService = createDataQualityService({ logger });
  const { authenticate: dqAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/data-quality',
    dqAuthMw,
    createDataQualityRouter({ dataQuality: dqService, logger })
  );
  logger.info('[DataQuality] ✓ data-quality routes mounted at /api/v1/data-quality');
} catch (dqErr) {
  logger.warn('[DataQuality] routes skipped:', dqErr.message);
}

// ─── Role-Based Decision Support (Wave 23) ───────────────────────────────────
// Always-on. Resolves the current user's role → role group → decision-support
// profile (goals, KPIs, alerts, quick actions, restricted data, density,
// landing). The UI uses /me/dashboard at login to know where to land + what
// to render.
try {
  const { createRoleProfilesService } = require('./intelligence/role-profiles.service');
  const { createRoleProfilesRouter } = require('./routes/role-profiles.routes');
  const roleProfilesSvc = createRoleProfilesService({ logger });
  const { authenticate: rpAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/role-profiles',
    rpAuthMw,
    createRoleProfilesRouter({ roleProfiles: roleProfilesSvc, logger })
  );
  logger.info('[RoleProfiles] ✓ role-profiles routes mounted at /api/v1/role-profiles');
} catch (rpErr) {
  logger.warn('[RoleProfiles] routes skipped:', rpErr.message);
}

// ─── Layout Policy / Cognitive Load Framework (Wave 24) ──────────────────────
// Always-on. Encodes the cognitive-load contract (tier 1/2/3 elements,
// above-the-fold budgets, smart defaults, auto-save profiles, section
// ordering) so the UI consumes a validated layout and CI fails any
// layout that violates the rules.
try {
  const { createLayoutPolicyService } = require('./intelligence/layout-policy.service');
  const { createLayoutPolicyRouter } = require('./routes/layout-policy.routes');
  const layoutPolicySvc = createLayoutPolicyService({ logger });
  const { authenticate: lpAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/layout-policy',
    lpAuthMw,
    createLayoutPolicyRouter({ layoutPolicy: layoutPolicySvc, logger })
  );
  logger.info('[LayoutPolicy] ✓ layout-policy routes mounted at /api/v1/layout-policy');
} catch (lpErr) {
  logger.warn('[LayoutPolicy] routes skipped:', lpErr.message);
}

// ─── Premium Productivity Features (Wave 25 + Wave 27 persistence) ──────────
// Annotations + handoffs + follow-ups + watchlists + user preferences.
// Wave 27: wired to real Mongoose models when available; falls back to
// in-memory store otherwise (test/local-dev).
let productivitySvc = null;
try {
  const {
    createProductivityFeaturesService,
  } = require('./intelligence/productivity-features.service');
  const { createProductivityFeaturesRouter } = require('./routes/productivity-features.routes');

  let productivityModels = null;
  try {
    productivityModels = require('./models/Productivity');
    logger.info('[Productivity] ✓ Mongoose models loaded (Wave 27 persistence)');
  } catch {
    /* models optional — service falls back to in-memory */
  }

  productivitySvc = createProductivityFeaturesService({
    models: productivityModels,
    logger,
  });
  const { authenticate: pfAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/productivity',
    pfAuthMw,
    createProductivityFeaturesRouter({ productivity: productivitySvc, logger })
  );
  // Expose for the auto-creation hook (Wave 27) — alerts/insights routes
  // call this when an actor acknowledges or confirms.
  app._productivityService = productivitySvc;
  logger.info('[Productivity] ✓ productivity routes mounted at /api/v1/productivity');
} catch (pfErr) {
  logger.warn('[Productivity] routes skipped:', pfErr.message);
}

// ─── Governance & Auditability (Wave 26) ─────────────────────────────────────
// Permissions catalog + compliance banners + unified audit-trail timeline.
// Reads from AuditLog (existing collection) when available; pure registry
// resolution otherwise.
try {
  const { createGovernanceService } = require('./intelligence/governance.service');
  const { createGovernanceRouter } = require('./routes/governance.routes');
  const governanceSvc = createGovernanceService({ logger });

  let auditModel = null;
  try {
    auditModel = require('./models/AuditLog');
  } catch {
    /* AuditLog model optional — endpoints still work, return empty audit rows */
  }

  const { authenticate: gvAuthMw } = require('./middleware/auth');
  app.use(
    '/api/v1/governance',
    gvAuthMw,
    createGovernanceRouter({ governance: governanceSvc, auditModel, logger })
  );
  logger.info('[Governance] ✓ governance routes mounted at /api/v1/governance');
} catch (gvErr) {
  logger.warn('[Governance] routes skipped:', gvErr.message);
}

// ─── Step-up MFA Challenge (Wave 36) ──────────────────────────────────────────
// Operationalises Constitution §12. The Wave-31 decide() returns
// STEP_UP_MFA_REQUIRED when actor.mfaLevel < required tier — this router
// is the surface clients call to actually obtain the higher tier.
//
//   POST /api/v1/mfa/challenge        → create
//   POST /api/v1/mfa/:id/verify       → submit OTP
//   GET  /api/v1/mfa/:id              → status
//
// `mfaSettingsModel` is optional — when absent (test/dev), the service
// falls back to a closed-fail verifier and tests inject their own.
// `sessionUpdater` is a no-op by default; production wires this to the
// real session store so subsequent decide() calls see the higher tier.
try {
  const { createMfaChallengeService } = require('./intelligence/mfa-challenge.service');
  const createMfaChallengeRouter = require('./routes/mfa-challenge.routes');

  let mfaSettingsModel = null;
  try {
    mfaSettingsModel = require('./models/MFASettings');
  } catch {
    /* model optional in test/dev — service falls back to closed-fail verifier */
  }

  // Pluggable session updater. Production should override this from
  // wherever the session lives (express-session, JWT refresh, Redis).
  // Exposed on `app` so other modules can swap it without re-importing.
  app._mfaSessionUpdater =
    app._mfaSessionUpdater ||
    async function defaultMfaSessionUpdater({ userId, mfaLevel, mfaAssertedAt }) {
      // Default: log only. Real session-store wiring is environment-specific.
      logger.info(
        `[MFA] session upgrade userId=${userId} mfaLevel=${mfaLevel} at=${mfaAssertedAt?.toISOString?.() || mfaAssertedAt}`
      );
    };

  let auditLogger = null;
  try {
    const { auditLogService } = require('./services/auditLog.service');
    if (auditLogService && typeof auditLogService.log === 'function') {
      auditLogger = auditLogService;
    }
  } catch {
    /* audit optional — challenge still works, no audit row */
  }

  const mfaSvc = createMfaChallengeService({
    mfaSettingsModel,
    auditLogger,
    sessionUpdater: (...args) => app._mfaSessionUpdater(...args),
    logger,
  });

  const { authenticate: mfaAuthMw } = require('./middleware/auth');
  app.use('/api/v1/mfa', mfaAuthMw, createMfaChallengeRouter({ service: mfaSvc, logger }));
  // Expose for other modules (route guards) that need `requireMfa(tier)`.
  app._mfaChallengeService = mfaSvc;
  logger.info('[MFA] ✓ step-up challenge routes mounted at /api/v1/mfa');
} catch (mfaErr) {
  logger.warn('[MFA] routes skipped:', mfaErr.message);
}

// ─── Beneficiary 360 Phase 2 — Lifecycle Routes (Wave 40) ────────────────────
// HTTP surface for the Wave-39 lifecycle state machine + workflow
// orchestrator. Every endpoint gates on a `beneficiary.lifecycle.*`
// permission registered in governance.registry. The service performs
// deeper guards (self-approval, Nafath, reasonCode allowlist, reversal
// window). No side-effect handlers wired here — Phase 3 (Wave 41+).
try {
  const {
    createBeneficiaryLifecycleService,
  } = require('./intelligence/beneficiary-lifecycle.service');
  const createBeneficiaryLifecycleRouter = require('./routes/beneficiary-lifecycle.routes');

  let transitionModel = null;
  try {
    transitionModel = require('./models/BeneficiaryLifecycleTransition');
  } catch {
    /* model optional in test/dev — router fails gracefully without it */
  }

  let beneficiaryModel = null;
  try {
    beneficiaryModel = require('./models/Beneficiary');
  } catch {
    /* same */
  }

  let auditLogger = null;
  try {
    const { auditLogService } = require('./services/auditLog.service');
    if (auditLogService && typeof auditLogService.log === 'function') {
      auditLogger = auditLogService;
    }
  } catch {
    /* audit optional */
  }

  if (transitionModel) {
    const lifecycleSvc = createBeneficiaryLifecycleService({
      transitionLog: transitionModel,
      beneficiaryModel,
      // No side-effect handlers wired in Wave 40 — those land in Wave 41+
      // alongside scheduler / care-team / notification wiring.
      sideEffectHandlers: {},
      auditLogger,
      logger,
    });

    let governanceSvc = null;
    try {
      const { createGovernanceService } = require('./intelligence/governance.service');
      governanceSvc = createGovernanceService({ logger });
    } catch {
      /* governance service should always load; logged at top */
    }

    if (governanceSvc) {
      const { authenticate: blAuthMw } = require('./middleware/auth');
      app.use(
        '/api/v1/beneficiary-lifecycle',
        blAuthMw,
        createBeneficiaryLifecycleRouter({
          service: lifecycleSvc,
          governance: governanceSvc,
          logger,
        })
      );
      app._beneficiaryLifecycleService = lifecycleSvc;
      logger.info(
        '[BeneficiaryLifecycle] ✓ Phase 2 routes mounted at /api/v1/beneficiary-lifecycle'
      );
    } else {
      logger.warn('[BeneficiaryLifecycle] routes skipped: governance service unavailable');
    }
  } else {
    logger.warn(
      '[BeneficiaryLifecycle] routes skipped: BeneficiaryLifecycleTransition model not loaded'
    );
  }
} catch (blErr) {
  logger.warn('[BeneficiaryLifecycle] routes skipped:', blErr.message);
}

// ─── Access Review (Wave 72 — closes red-team #12) ───────────────────────────
// Mounts /api/v1/access-review behind authenticate. Wires the Wave-72 service
// (workflow + hash chain + cycle status + chain verification) on top of the
// Wave-38 foundations (registry + simulator + AccessReviewAttestation model).
// Every endpoint gates on an `access-review.*` permission code added to
// governance.registry in this wave. Graceful degradation: if the attestation
// model is unavailable in the test/dev environment, the router is skipped
// with a warning instead of crashing boot.
try {
  const { createAccessReviewService } = require('./intelligence/access-review.service');
  const { createAccessReviewSimulator } = require('./intelligence/access-review-simulator.service');
  const createAccessReviewRouter = require('./routes/access-review.routes');

  let attestationModel = null;
  try {
    attestationModel = require('./models/AccessReviewAttestation');
  } catch {
    /* model optional in test/dev — router skipped if absent */
  }

  if (attestationModel) {
    let anchorLedger = null;
    try {
      const { anchorLedgerService } = require('./services/anchorLedger.service');
      if (anchorLedgerService && typeof anchorLedgerService.commit === 'function') {
        anchorLedger = anchorLedgerService;
      }
    } catch {
      /* anchor optional — HIGH-sensitivity attestations skip the ledger commit */
    }

    const simulator = createAccessReviewSimulator({ logger });
    const accessReviewSvc = createAccessReviewService({
      attestationModel,
      simulator,
      anchorLedger,
      logger,
    });

    // Wave 74 — operational scheduler. Wires unifiedNotifier when
    // available so reviewer queues can ship inbox notifications;
    // otherwise notifyReviewers returns NOTIFIER_UNAVAILABLE 503.
    let arNotifier = null;
    try {
      const unified = require('./services/unifiedNotifier');
      if (unified && typeof unified.send === 'function') arNotifier = unified;
    } catch {
      /* optional */
    }
    const arResolveAudience = async (role, branchId) => {
      if (typeof app._resolveUsersForRole === 'function') {
        try {
          return await app._resolveUsersForRole(role, branchId);
        } catch {
          return [];
        }
      }
      return [];
    };
    const {
      createAccessReviewScheduler,
    } = require('./intelligence/access-review-scheduler.service');
    const accessReviewScheduler = createAccessReviewScheduler({
      service: accessReviewSvc,
      simulator,
      notifier: arNotifier,
      resolveAudienceForRole: arResolveAudience,
      logger,
    });

    let governanceSvc = null;
    try {
      const { createGovernanceService } = require('./intelligence/governance.service');
      governanceSvc = createGovernanceService({ logger });
    } catch {
      /* governance must load — top-level boot already logged the failure */
    }

    if (governanceSvc) {
      const { authenticate: arAuthMw } = require('./middleware/auth');
      app.use(
        '/api/v1/access-review',
        arAuthMw,
        createAccessReviewRouter({
          service: accessReviewSvc,
          simulator,
          scheduler: accessReviewScheduler,
          governance: governanceSvc,
          logger,
        })
      );
      app._accessReviewService = accessReviewSvc;
      app._accessReviewSimulator = simulator;
      app._accessReviewScheduler = accessReviewScheduler;
      logger.info(
        '[AccessReview] ✓ Wave 72+74 routes mounted at /api/v1/access-review (closes red-team #12; scheduler ready)'
      );
    } else {
      logger.warn('[AccessReview] routes skipped: governance service unavailable');
    }
  } else {
    logger.warn('[AccessReview] routes skipped: AccessReviewAttestation model not loaded');
  }
} catch (arErr) {
  logger.warn('[AccessReview] routes skipped:', arErr.message);
}

// ─── Care Planning Engine (Waves 41–48) ───────────────────────────────────────
// Mounts /api/v1/care-plans behind authenticate. The bootstrap helper wires:
//   • CarePlanVersion model        (Wave 41)
//   • validator + service          (Wave 41)
//   • routes (24 endpoints)        (Wave 42 + extended each wave)
//   • family-version generator     (Wave 43)
//   • recommendation builder/validator (Wave 44)
//   • progress reviewer            (Wave 44)
//   • side-effect handlers         (Wave 45)
//   • audit-trail aggregator       (Wave 45)
//   • programs library + group-plan service (Wave 46)
//   • report generator (6 reports) (Wave 47)
//   • explanation + role-views + LLM caller (Wave 48)
//
// All dependencies are optional except CarePlanVersion model + governance.
// Missing deps degrade gracefully (no notifier ⇒ side-effects log + skip).
try {
  const { bootstrapCarePlanning } = require('./intelligence/care-plan-bootstrap');

  let CarePlanVersion = null;
  try {
    CarePlanVersion = require('./models/CarePlanVersion');
  } catch (_) {
    /* model optional — care-plan routes won't mount without it */
  }

  if (CarePlanVersion) {
    let governanceSvc = null;
    try {
      const { createGovernanceService } = require('./intelligence/governance.service');
      governanceSvc = createGovernanceService({ logger });
    } catch (_) {
      /* governance must be available */
    }

    if (governanceSvc) {
      // Optional shared infrastructure — bootstrap accepts each as null.
      let cpAuditLogger = null;
      try {
        const { auditLogService } = require('./services/auditLog.service');
        if (auditLogService && typeof auditLogService.log === 'function') {
          cpAuditLogger = auditLogService;
        }
      } catch (_) {
        /* audit optional */
      }

      let cpNotifier = null;
      try {
        const unified = require('./services/unifiedNotifier');
        if (unified && typeof unified.send === 'function') cpNotifier = unified;
      } catch (_) {
        /* notifier optional */
      }

      let BeneficiaryFile = null;
      try {
        BeneficiaryFile = require('./models/BeneficiaryFile');
      } catch (_) {
        /* file model optional */
      }

      let anchorLedger = null;
      try {
        const { anchorLedgerService } = require('./services/anchorLedger.service');
        if (anchorLedgerService && typeof anchorLedgerService.commit === 'function') {
          anchorLedger = anchorLedgerService;
        }
      } catch (_) {
        /* anchor optional */
      }

      // Late-bind audience resolution to the existing app helper (set
      // elsewhere by the Alert/Priority Engine, Wave 11–16). Falls back
      // to an empty list if the helper isn't ready yet.
      const resolveAudienceForRole = async (role, branchId) => {
        if (typeof app._resolveUsersForRole === 'function') {
          try {
            return await app._resolveUsersForRole(role, branchId);
          } catch (_) {
            return [];
          }
        }
        return [];
      };

      // Optional Anthropic client — only wired when ANTHROPIC_API_KEY is set
      let anthropicClient = null;
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        } catch (_) {
          logger.warn(
            '[CarePlan] ANTHROPIC_API_KEY set but @anthropic-ai/sdk not installed — LLM caller disabled'
          );
        }
      }

      const careplan = bootstrapCarePlanning({
        CarePlanVersion,
        BeneficiaryFile,
        governance: governanceSvc,
        notifier: cpNotifier,
        auditLogger: cpAuditLogger,
        anchorLedger,
        resolveAudienceForRole,
        anthropicClient,
        logger,
      });

      const { authenticate: cpAuthMw } = require('./middleware/auth');
      app.use('/api/v1/care-plans', cpAuthMw, careplan.router);

      // Expose service + sub-modules on app for cross-feature integration
      app._carePlanService = careplan.service;
      app._carePlanHandlers = careplan.sideEffectHandlers;
      app._carePlanLLM = careplan.llmCaller;
      app._carePlanReports = careplan.reportGenerator;
      app._carePlanRoleViews = careplan.roleViews;
      app._carePlanGroupService = careplan.groupPlan;
      app._carePlanProgramsLibrary = careplan.programsLibrary;

      logger.info(
        '[CarePlan] ✓ Engine mounted at /api/v1/care-plans (Waves 41–48: 24 endpoints, ' +
          '8 plan types, 13 statuses, 13 transitions, 17 validation rules, ' +
          (anthropicClient ? 'LLM caller live' : 'LLM caller disabled — no ANTHROPIC_API_KEY') +
          ')'
      );
    } else {
      logger.warn('[CarePlan] routes skipped: governance service unavailable');
    }
  } else {
    logger.warn('[CarePlan] routes skipped: CarePlanVersion model not loaded');
  }
} catch (cpErr) {
  logger.warn('[CarePlan] routes skipped:', cpErr.message);
}

// ─── Therapist Portal ─────────────────────────────────────────────────────────
try {
  app.use('/api/v1/therapist', require('./routes/therapist-portal.routes'));
  logger.info('[TherapistPortal] ✓ routes mounted at /api/v1/therapist');
} catch (err) {
  logger.warn('[TherapistPortal] routes skipped:', err.message);
}

// ─── Parent Portal v1 ─────────────────────────────────────────────────────────
try {
  app.use('/api/v1/portal', require('./routes/parent-portal-v1.routes'));
  logger.info('[ParentPortal] ✓ routes mounted at /api/v1/portal');
} catch (err) {
  logger.warn('[ParentPortal] routes skipped:', err.message);
}

// ─── BI Dashboard ─────────────────────────────────────────────────────────────
try {
  app.use('/api/v1/bi', require('./routes/bi-dashboard.routes'));
  logger.info('[BIDashboard] ✓ routes mounted at /api/v1/bi');
} catch (err) {
  logger.warn('[BIDashboard] routes skipped:', err.message);
}

// ─── AI Recommendations ───────────────────────────────────────────────────────
try {
  app.use('/api/v1/ai/recommendations', require('./routes/ai.recommendations.routes'));
  logger.info('[AIRecommendations] ✓ routes mounted at /api/v1/ai/recommendations');
} catch (err) {
  logger.warn('[AIRecommendations] routes skipped:', err.message);
}

// ─── Admin Ops — Dead Letter Queue ────────────────────────────────────────────
try {
  app.use('/api/v1/admin/ops', require('./routes/admin-ops-dlq.routes'));
  logger.info('[AdminOpsDLQ] ✓ routes mounted at /api/v1/admin/ops');
} catch (err) {
  logger.warn('[AdminOpsDLQ] routes skipped:', err.message);
}

// ─── Reports Inbox ────────────────────────────────────────────────────────────
try {
  const { buildRouter: buildReportsInboxRouter } = require('./routes/reports-inbox.routes');
  const ReportDelivery = require('./models/ReportDelivery');
  app.use(
    '/api/v1/reports/inbox',
    require('./middleware/auth').authenticate,
    buildReportsInboxRouter({ DeliveryModel: ReportDelivery, logger })
  );
  logger.info('[ReportsInbox] ✓ routes mounted at /api/v1/reports/inbox');
} catch (err) {
  logger.warn('[ReportsInbox] routes skipped:', err.message);
}

// ─── ZATCA Credentials Admin ──────────────────────────────────────────────────
try {
  app.use('/api/v1/admin/zatca-credentials', require('./routes/zatca-credentials-admin.routes'));
  logger.info('[ZATCACredAdmin] ✓ routes mounted at /api/v1/admin/zatca-credentials');
} catch (err) {
  logger.warn('[ZATCACredAdmin] routes skipped:', err.message);
}

// ─── HR Performance Evaluations & Succession Planning ────────────────────────
try {
  const { createHrPerformanceRouter } = require('./routes/hr/hr-performance.routes');
  const { authenticate: _authPerfMw } = require('./middleware/auth');
  app.use('/api/v1/hr/performance', _authPerfMw, createHrPerformanceRouter({ logger }));
  logger.info('[HrPerformance] ✓ /api/v1/hr/performance mounted');
} catch (perfErr) {
  logger.warn('[HrPerformance] routes skipped:', perfErr.message);
}

// ─── Payroll & Compensation ───────────────────────────────────────────────────
try {
  const payrollRouter = require('./routes/payroll.routes');
  app.use('/api/v1/payroll', payrollRouter);
  logger.info('[Payroll] ✓ /api/v1/payroll mounted');
} catch (payrollErr) {
  logger.warn('[Payroll] routes skipped:', payrollErr.message);
}

// ─── Recruitment & Hiring ─────────────────────────────────────────────────────
try {
  const recruitmentRouter = require('./routes/recruitment.routes');
  app.use('/api/v1/recruitment', recruitmentRouter);
  logger.info('[Recruitment] ✓ /api/v1/recruitment mounted');
} catch (recruitErr) {
  logger.warn('[Recruitment] routes skipped:', recruitErr.message);
}

// ─── General Insurance ──────────────────────────────────────────────────────
try {
  const insuranceRouter = require('./routes/insurance.routes');
  app.use('/api/v1/insurance', insuranceRouter);
  logger.info('[Insurance] ✓ /api/v1/insurance mounted');
} catch (insuranceErr) {
  logger.warn('[Insurance] routes skipped:', insuranceErr.message);
}

// ─── Employee Portal (Self-Service) ──────────────────────────────────────────
try {
  const employeePortalRouter = require('./routes/employeePortal.routes');
  app.use('/api/v1/employee-portal', employeePortalRouter);
  logger.info('[EmployeePortal] ✓ /api/v1/employee-portal mounted');
} catch (empPortalErr) {
  logger.warn('[EmployeePortal] routes skipped:', empPortalErr.message);
}

// ─── Employee Affairs (Phase 1 / Phase 2 / Phase 3 / Expanded) ───────────────
try {
  const empAffairsRouter = require('./routes/employeeAffairs.routes');
  app.use('/api/v1/employee-affairs', empAffairsRouter);
  logger.info('[EmployeeAffairs] ✓ /api/v1/employee-affairs mounted');
} catch (e) {
  logger.warn('[EmployeeAffairs] routes skipped:', e.message);
}

try {
  const empAffairsP2Router = require('./routes/employee-affairs-phase2.routes');
  app.use('/api/v1/employee-affairs-phase2', empAffairsP2Router);
  logger.info('[EmployeeAffairsP2] ✓ /api/v1/employee-affairs-phase2 mounted');
} catch (e) {
  logger.warn('[EmployeeAffairsP2] routes skipped:', e.message);
}

try {
  const empAffairsP3Router = require('./routes/employee-affairs-phase3.routes');
  app.use('/api/v1/employee-affairs-phase3', empAffairsP3Router);
  logger.info('[EmployeeAffairsP3] ✓ /api/v1/employee-affairs-phase3 mounted');
} catch (e) {
  logger.warn('[EmployeeAffairsP3] routes skipped:', e.message);
}

try {
  const empAffairsExpandedRouter = require('./routes/employee-affairs-expanded.routes');
  app.use('/api/v1/employee-affairs-expanded', empAffairsExpandedRouter);
  logger.info('[EmployeeAffairsExpanded] ✓ /api/v1/employee-affairs-expanded mounted');
} catch (e) {
  logger.warn('[EmployeeAffairsExpanded] routes skipped:', e.message);
}

// ─── Training & Development ───────────────────────────────────────────────────
try {
  const trainingRouter = require('./routes/training.routes');
  app.use('/api/v1/training', trainingRouter);
  logger.info('[Training] ✓ /api/v1/training mounted');
} catch (trainingErr) {
  logger.warn('[Training] routes skipped:', trainingErr.message);
}

// ─── HR Insurance ─────────────────────────────────────────────────────────────
try {
  const hrInsuranceRouter = require('./routes/hr-insurance.routes');
  app.use('/api/v1/hr/insurance', hrInsuranceRouter);
  logger.info('[HrInsurance] ✓ /api/v1/hr/insurance mounted');
} catch (hrInsuranceErr) {
  logger.warn('[HrInsurance] routes skipped:', hrInsuranceErr.message);
}

// ─── HR Attendance ────────────────────────────────────────────────────────────
try {
  const hrAttendanceRouter = require('./routes/hr-attendance.routes');
  app.use('/api/v1/hr-attendance', hrAttendanceRouter);
  logger.info('[HrAttendance] ✓ /api/v1/hr-attendance mounted');
} catch (e) {
  logger.warn('[HrAttendance] routes skipped:', e.message);
}

// ─── ZKTeco Biometric ─────────────────────────────────────────────────────────
try {
  const zktecoRouter = require('./routes/zkteco.routes');
  app.use('/api/v1/zkteco', zktecoRouter);
  logger.info('[ZKTeco] ✓ /api/v1/zkteco mounted');
} catch (e) {
  logger.warn('[ZKTeco] routes skipped:', e.message);
}

// ─── Leave Requests ───────────────────────────────────────────────────────────
try {
  const leaveRequestsRouter = require('./routes/leave-requests.routes');
  app.use('/api/v1/leave-requests', leaveRequestsRouter);
  logger.info('[LeaveRequests] ✓ /api/v1/leave-requests mounted');
} catch (e) {
  logger.warn('[LeaveRequests] routes skipped:', e.message);
}

// ─── KPI Dashboard ────────────────────────────────────────────────────────────
try {
  const kpiDashboardRouter = require('./routes/kpi-dashboard.routes');
  app.use('/api/v1/kpi-dashboard', kpiDashboardRouter);
  logger.info('[KpiDashboard] ✓ /api/v1/kpi-dashboard mounted');
} catch (kpiErr) {
  logger.warn('[KpiDashboard] routes skipped:', kpiErr.message);
}

// ─── Work Shifts & Schedules ──────────────────────────────────────────────────
try {
  const workShiftsRouter = require('./routes/work-shifts.routes');
  app.use('/api/v1/work-shifts', workShiftsRouter);
  logger.info('[WorkShifts] ✓ /api/v1/work-shifts mounted');
} catch (workShiftsErr) {
  logger.warn('[WorkShifts] routes skipped:', workShiftsErr.message);
}

// ─── Compensation & Benefits ──────────────────────────────────────────────────
try {
  const compensationRouter = require('./routes/compensationBenefits.routes');
  app.use('/api/v1/compensation-benefits', compensationRouter);
  logger.info('[CompensationBenefits] ✓ /api/v1/compensation-benefits mounted');
} catch (compensationErr) {
  logger.warn('[CompensationBenefits] routes skipped:', compensationErr.message);
}

// ─── HR System (Attendance / Leaves / Payroll core) ───────────────────────────
try {
  const hrSystemRouter = require('./routes/hrSystem.routes');
  app.use('/api/v1/hr-system', hrSystemRouter);
  logger.info('[HrSystem] ✓ /api/v1/hr-system mounted');
} catch (e) {
  logger.warn('[HrSystem] routes skipped:', e.message);
}

// ─── Contract Management ──────────────────────────────────────────────────────
try {
  const contractMgmtRouter = require('./routes/contract-management.routes');
  app.use('/api/v1/contract-management', contractMgmtRouter);
  logger.info('[ContractManagement] ✓ /api/v1/contract-management mounted');
} catch (contractMgmtErr) {
  logger.warn('[ContractManagement] routes skipped:', contractMgmtErr.message);
}

// ─── Complaints & Suggestions ─────────────────────────────────────────────────
try {
  const complaintsRouter = require('./routes/complaints.routes');
  app.use('/api/v1/complaints', complaintsRouter);
  logger.info('[Complaints] ✓ /api/v1/complaints mounted');
} catch (complaintsErr) {
  logger.warn('[Complaints] routes skipped:', complaintsErr.message);
}

// ─── Auto-mount all remaining route files ────────────────────────────────────
// Mounts every routes/*.js file not already individually registered above.
// Filename → /api/v1/<kebab-case> (e.g. academicYear.routes.js → /api/v1/academic-year)
try {
  const { autoMountRoutes } = require('./utils/autoRouteLoader');
  const routesDir = require('path').join(__dirname, 'routes');
  // Files already required individually above — skip to avoid double-mount
  const alreadyMounted = [
    '_registry',
    'admin-ops-dlq.routes',
    'ai.recommendations.routes',
    'audit-reviews.routes',
    'beneficiary-consents.routes',
    'bi-dashboard.routes',
    'compensationBenefits.routes',
    'complaints.routes',
    'contract-management.routes',
    'dashboard-alerts.routes',
    'dashboard-saved-views.routes',
    'dashboards-platform.routes',
    'employee-affairs-expanded.routes',
    'employee-affairs-phase2.routes',
    'employee-affairs-phase3.routes',
    'employeeAffairs.routes',
    'employeePortal.routes',
    'forms-catalog.routes',
    'forms-submission.routes',
    'hr-attendance.routes',
    'hr-insurance.routes',
    'hrSystem.routes',
    'insurance.routes',
    'kpi-dashboard.routes',
    'landing-config.routes',
    'leave-requests.routes',
    'nafath-signing.routes',
    'notifications-log.routes',
    'nphies-webhook.routes',
    'openapi-integration.routes',
    'parent-portal-v1.routes',
    'payroll.routes',
    'public-forms.routes',
    'public-uploads.routes',
    'push.routes',
    'recruitment.routes',
    'rehab-disciplines.routes',
    'rehab-goal-suggestions.routes',
    'reports-inbox.routes',
    'reports-ops.routes',
    'student-portal.routes',
    'therapist-portal.routes',
    'training.routes',
    'universal-codes.routes',
    'uploads.routes',
    'visitor-auth.routes',
    'wasel-address.routes',
    'work-shifts.routes',
    'yakeen-verification.routes',
    'zatca-credentials-admin.routes',
    'zkteco.routes',
  ];
  autoMountRoutes(app, routesDir, alreadyMounted);
} catch (autoErr) {
  logger.warn('[AutoRouter] failed to initialize:', autoErr.message);
}

// ─── Error Handling (MUST be after all routes) ───────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);
uncaughtExceptionHandler();
unhandledRejectionHandler();

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.PORT = PORT;
