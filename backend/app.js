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
    const auditLogModel = softRequire('./models/auditLog.model');
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
    } catch (adminErr) {
      logger.warn('[HrEmployeeAdmin] routes skipped:', adminErr.message);
    }
  } catch (hrDashErr) {
    logger.warn('[HrDashboard] routes skipped:', hrDashErr.message);
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

// ─── Error Handling (MUST be after all routes) ───────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);
uncaughtExceptionHandler();
unhandledRejectionHandler();

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.PORT = PORT;
