/**
 * Route Registry — سجل المسارات
 *
 * Centralises ALL route imports and mounting for the Express app.
 * Extracted from app.js to improve readability and maintainability.
 *
 * Usage (in app.js):
 *   const { mountAllRoutes } = require('./routes/_registry');
 *   mountAllRoutes(app, { authRateLimiter });
 */

const express = require('express');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

// ─── Safe Require — returns empty router on failure ───────────────────────────
//
// Two failure shapes worth distinguishing:
//   1) The requested module file itself is missing (legacy/archived routes
//      that the registry still references). Boring, expected, captured in
//      routeHealth — log at debug to avoid drowning real signal.
//   2) The module exists but a downstream `require()` inside it failed.
//      Real bug — log at warn so it stays visible.
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    const isMissingThisModule =
      err.code === 'MODULE_NOT_FOUND' &&
      typeof err.message === 'string' &&
      err.message.includes(`'${modulePath}'`);
    const level = isMissingThisModule ? 'debug' : 'warn';
    logger[level](`[safeRequire] Failed to load: ${modulePath} — ${err.message}`);
    routeHealth.failed.push({
      path: modulePath,
      module: modulePath,
      error: err.message,
      missing: isMissingThisModule,
    });
    return express.Router(); // return empty router so app.use() doesn't crash
  }
}

// ─── Route Health Tracker ─────────────────────────────────────────────────────
const routeHealth = {
  mounted: [],
  failed: [],
  get summary() {
    return {
      total: this.mounted.length + this.failed.length,
      ok: this.mounted.length,
      failed: this.failed.length,
      failedRoutes: this.failed.map(f => ({ path: f.path, module: f.module, error: f.error })),
    };
  },
};

// ─── Route Imports ───────────────────────────────────────────────────────────

// Core API routes
const authRoutes = safeRequire('../api/routes/auth.routes');
const usersRoutes = safeRequire('../api/routes/users.routes');
const modulesRoutes = safeRequire('../api/routes/modules.routes');
const notificationsRoutes = safeRequire('../routes/notifications.routes');
const messagingRoutes = safeRequire('../routes/messaging.routes');
// Finance — delegated to registries/finance.registry.js (16 modules)
const registerFinanceRoutes = require('./registries/finance.registry');
const registerOpsRoutes = require('./registries/ops.registry');
// Clinical, HR, Documents, Communication, Student-Parent — delegated via phases.registry.js
const integrationRoutes = safeRequire('../routes/integration.routes.minimal');
// NOTE: disability-rehabilitation (old .js) — الإصدار القديم. تمّ استبداله بـ disability-rehabilitation.routes.js
//       (مثبّت لاحقاً عبر safeMount على /api/ و /api/v1/ معاً).
const maintenanceRoutes = safeRequire('../routes/maintenance');
const assetRoutes = safeRequire('../routes/assets');
const scheduleRoutes = safeRequire('../routes/schedules');

// Existing route files
const searchRoutes = safeRequire('../routes/search');
const validateRoutes = safeRequire('../routes/validate');
const elearningRoutes = safeRequire('../routes/elearning');
const orgBrandingRoutes = safeRequire('../routes/orgBranding');

// Real Mongoose CRUD routes (converted from frontend-api-stubs)
const adminRouter = safeRequire('../routes/admin.routes');
const userManagementRouter = safeRequire('../routes/user-management.routes');
const accountRouter = safeRequire('../routes/account.routes');
const monitoringRouter = safeRequire('../routes/monitoring.routes');
const aiPredictionsRouter = safeRequire('../routes/aiPredictions.routes');
const aiAnalyticsRouter = safeRequire('../routes/ai-analytics.routes');
const integratedCareRouter = safeRequire('../routes/integratedCare.routes');
const securityRouter = safeRequire('../routes/security.routes');
const organizationRouter = safeRequire('../routes/organization.routes');
const exportImportRouter = safeRequire('../routes/exportImport.routes');
const exportsRouter = safeRequire('../routes/exports.routes');
const pmRouter = safeRequire('../routes/pm.routes');
const analyticsExtraRouter = safeRequire('../routes/analyticsExtra.routes');
const dashboardExtrasRouter = safeRequire('../routes/dashboardExtras.routes');

// Previously Unmounted Route Files (CRUD-complete)
const qiwaRoutes = safeRequire('../routes/qiwa.routes');
const gosiRoutes = safeRequire('../routes/gosi.routes');
const govIntegrationRoutes = safeRequire('../routes/governmentIntegration.routes');
const ecommerceRoutes = safeRequire('../routes/ecommerce.routes');
// `purchasing.routes.unified` was archived to `_archived/dead-routes/`.
// The live procurement surface is `/api/ops/purchase-requests` (mounted
// below from `routes/operations/purchaseRequest.routes.js`). The legacy
// `/api/purchasing` mount has been removed — it served an empty Router
// and produced silent 404s for ~unknown stretch.
// Fleet & Transport — delegated to registries/fleet.registry.js (34 modules)
const registerFleetRoutes = require('./registries/fleet.registry');
const cmsRoutes = safeRequire('../routes/cms');
const communityRoutes = safeRequire('../routes/community');
const knowledgeRoutes = safeRequire('../routes/knowledge');
const rbacAdvancedRoutes = safeRequire('../routes/rbac-advanced.routes');
const licensesRoutes = safeRequire('../routes/licenses');
const caseManagementRoutes = safeRequire('../routes/caseManagement');
const internalAuditRoutes = safeRequire('../routes/internalAudit');
const qualityRoutes = safeRequire('../routes/quality');
const managementReviewRoutes = safeRequire('../routes/managementReview.routes');
const evidenceRoutes = safeRequire('../routes/evidence.routes');
const complianceCalendarRoutes = safeRequire('../routes/complianceCalendar.routes');
const qualityControlsRoutes = safeRequire('../routes/qualityControls.routes');
const qualityHealthScoreRoutes = safeRequire('../routes/qualityHealthScore.routes');
const fmeaRoutes = safeRequire('../routes/fmea.routes'); // Phase 29 (world-class QMS)
const rcaRoutes = safeRequire('../routes/rca.routes'); // Phase 29 (structured RCA)
const spcRoutes = safeRequire('../routes/spc.routes'); // Phase 29 (Statistical Process Control)
const paretoA3Routes = safeRequire('../routes/paretoA3.routes'); // Phase 29 (Pareto + A3)
const standardsRoutes = safeRequire('../routes/standardsTraceability.routes'); // Phase 29 (Standards traceability)
const controlledDocumentRoutes = safeRequire('../routes/controlledDocument.routes'); // Phase 29 (21 CFR Part 11 docs)
const supplierQualityRoutes = safeRequire('../routes/supplierQuality.routes'); // Phase 29 (Supplier SCARs + scorecards)
const calibrationRoutes = safeRequire('../routes/calibration.routes'); // Phase 29 (Calibration management)
const changeControlRoutes = safeRequire('../routes/changeControl.routes'); // Phase 29 (Change Control)
const auditSchedulerRoutes = safeRequire('../routes/auditScheduler.routes'); // Phase 29 (Audit Scheduler)
const coqRoutes = safeRequire('../routes/coq.routes'); // Phase 29 (Cost of Quality)
const predictiveRiskRoutes = safeRequire('../routes/predictiveRisk.routes'); // Phase 29 (Predictive risk)
const trendForecastRoutes = safeRequire('../routes/trendForecast.routes'); // Phase 29 (Trend forecasting)
const qualityNarrativeRoutes = safeRequire('../routes/qualityNarrative.routes'); // Phase 29 (LLM narratives)
const inspectionSubmissionRoutes = safeRequire('../routes/inspectionSubmission.routes'); // Phase 29 (Mobile inspector PWA)
const benchmarkRoutes = safeRequire('../routes/benchmark.routes'); // Phase 29 (Industry benchmarks)
const qualityCommandCenterRoutes = safeRequire('../routes/qualityCommandCenter.routes'); // Phase 29 — Executive QMS Command Center
const notificationLogRoutes = safeRequire('../routes/notificationLog.routes');
// enterprise-risk → phases.registry.js; complaints-enhanced, kpi-dashboard, kpi-reports → features.registry.js
const capaAdminRoutes = safeRequire('../routes/capa-admin.routes');
const policyLibraryRoutes = safeRequire('../routes/policyRoutes');
const slaEngineRoutes = safeRequire('../routes/operations/slaEngine.routes');
const workOrderOpsRoutes = safeRequire('../routes/operations/workOrder.routes');
const facilityOpsRoutes = safeRequire('../routes/operations/facility.routes');
const purchaseRequestOpsRoutes = safeRequire('../routes/operations/purchaseRequest.routes');
const opsDashboardRoutes = safeRequire('../routes/operations/opsDashboard.routes');
const meetingGovernanceRoutes = safeRequire('../routes/operations/meetingGovernance.routes');
const routeOptimizationRoutes = safeRequire('../routes/operations/routeOptimization.routes');
const notificationDispatchRoutes = safeRequire('../routes/operations/notificationDispatch.routes');
// Phase 17 Care Platform — CRM + Social + Home Visits + Welfare + Community
const careCrmRoutes = safeRequire('../routes/care/crm.routes');
const careSocialRoutes = safeRequire('../routes/care/social.routes');
const careHomeVisitRoutes = safeRequire('../routes/care/homeVisit.routes');
const careWelfareRoutes = safeRequire('../routes/care/welfare.routes');
const careCommunityRoutes = safeRequire('../routes/care/community.routes');
const carePsychRoutes = safeRequire('../routes/care/psych.routes');
const careIndependenceRoutes = safeRequire('../routes/care/independence.routes');
const careBeneficiary360Routes = safeRequire('../routes/care/beneficiary360.routes');
const careRetentionRoutes = safeRequire('../routes/care/retention.routes');
const equipmentRoutes = safeRequire('../routes/equipment');
const predictionsRoutes = safeRequire('../routes/predictions.routes');
const branchesRoutes = safeRequire('../routes/branches.routes');
const beneficiaryPortalRoutes = safeRequire('../routes/beneficiaryPortal');
const communityIntegrationRoutes = safeRequire('../routes/communityIntegration.routes');

// Wave 2: Fixed Route Files (16 additional CRUD routes)
const civilDefenseRoutes = safeRequire('../routes/civilDefense.routes');
// inventory-enhanced.routes.js carries the live 34-endpoint surface (items,
// stock, transactions, categories, warehouses, suppliers, POs, assets,
// reorder/expiring alerts). The previous `inventory.routes.unified` module
// was archived to `_archived/dead-routes/`, leaving inventory unreachable.
const inventoryUnifiedRoutes =
  safeRequire('../routes/inventory-enhanced.routes') || require('express').Router();
const supplyChainRoutes = safeRequire('../routes/supplyChain.routes');
const trafficAccidentRoutes = safeRequire('../routes/trafficAccidents');
const mfaRoutes = safeRequire('../routes/mfa');
const ssoRoutes = safeRequire('../routes/sso.routes');
const rbacRoutes = safeRequire('../routes/rbac.routes');
const rbacAdminRoutes = safeRequire('../routes/rbac.admin.routes');
const montessoriRoutes = safeRequire('../routes/montessori');
const montessoriAuthRoutes = safeRequire('../routes/montessoriAuth');
const measurementsRoutes = safeRequire('../routes/measurements.routes');
const mobileAppRoutes = safeRequire('../routes/mobileApp.routes');

// Administrative Systems — delegated via phases.registry.js

// Education System — delegated to registries/education.registry.js (8 modules)
const registerEducationRoutes = require('./registries/education.registry');

// Insurance Management System (نظام إدارة التأمين)
const insuranceRoutes = safeRequire('../routes/insurance.routes');

// Government, System Settings, Branch Management — delegated via phases.registry.js

// Phases & Systems (~500 lines, 100+ modules) — delegated to registries/phases.registry.js
const registerPhaseRoutes = require('./registries/phases.registry');

// Features / Prompt Modules (~25 modules) — delegated to registries/features.registry.js
const registerFeatureRoutes = require('./registries/features.registry');

// CCTV Surveillance (Phase 27) — Hikvision integration + AI analytics
const registerCctvRoutes = require('./registries/cctv.registry');
// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mount a route handler on both /api/<path> and /api/v1/<path>.
 *
 * Surfaces silent dead mounts: when a `safeRequire` falls back to an
 * empty Router (because the source file was archived or renamed), the
 * old behavior was to log nothing — endpoints just 404'd. Now the
 * mount logs a warning so the issue shows up in boot logs and CI.
 * Opt-out: `SUPPRESS_EMPTY_MOUNT_WARN=1`.
 */
const dualMount = (app, path, handler, middleware = []) => {
  if (
    process.env.SUPPRESS_EMPTY_MOUNT_WARN !== '1' &&
    handler &&
    typeof handler === 'function' &&
    Array.isArray(handler.stack) &&
    handler.stack.length === 0
  ) {
    console.warn(
      `[registry] /api/${path} mounted on EMPTY router — likely an archived/missing route module`
    );
  }
  app.use(`/api/${path}`, ...middleware, handler);
  app.use(`/api/v1/${path}`, ...middleware, handler);
};

// Convenience wrapper — use for any domain router that does NOT enforce
// authentication internally. Apply broadly when the router exposes
// beneficiary / clinical / HR data. Adds `authenticate` ahead of the handler.
//
// W471/W502: defense-in-depth at mount-time. W471 fixed `referrals` (PHI
// exposure). W472 swept the remaining 20 bare-mounted slugs that had
// NO internal auth at all (catastrophic: security/domain RBAC mgmt,
// break-glass, family/behavior/goals/episodes/timeline PHI surfaces,
// rehab/quality/workflow clinical, plus auxiliary purchasing/fuel/
// transport/succession-planning/social-media/report-builder writes).
// `auth/nafath` remains on bare dualMount as the deliberate exception —
// it IS the login flow and must be public. Drift guard:
// __tests__/auth-gate-mount-sweep-wave502.test.js.
const dualMountAuth = (app, path, handler) => dualMount(app, path, handler, [authenticate]);

/**
 * Safely require and mount a route module. Logs errors instead of crashing.
 * Accepts both a string path (require'd internally) and a pre-required handler.
 */
const safeMount = (app, paths, modulePath) => {
  const pathLabel = Array.isArray(paths) ? paths[0] : paths;
  try {
    // If modulePath is already a Router/function (not a string), use it directly
    const handler = typeof modulePath === 'string' ? require(modulePath) : modulePath;
    const label = typeof modulePath === 'string' ? modulePath : '(pre-required)';
    if (Array.isArray(paths)) {
      paths.forEach(p => app.use(p, handler));
    } else {
      app.use(paths, handler);
    }
    routeHealth.mounted.push({ path: pathLabel, module: label });
    return true;
  } catch (err) {
    // safeError is the (res, err, context) HTTP-response helper — calling
    // it here as `safeError(err)` was reading `.stack` off the second arg
    // which was undefined, throwing inside the catch and bubbling all the
    // way up to mountAllRoutes. That's why ~hundreds of downstream routes
    // were silently aborted on every boot.
    const isMissingThisModule =
      err.code === 'MODULE_NOT_FOUND' &&
      typeof modulePath === 'string' &&
      typeof err.message === 'string' &&
      err.message.includes(`'${modulePath}'`);
    routeHealth.failed.push({
      path: pathLabel,
      module: String(modulePath),
      error: err.message,
      missing: isMissingThisModule,
    });
    // Same split as safeRequire: archived stub paths drop to debug,
    // real load errors stay at error. The route-mount summary at the
    // tail of mountAllRoutes still surfaces both counts.
    const level = isMissingThisModule ? 'debug' : 'error';
    logger[level](`[ROUTE FAIL] ${pathLabel} (${modulePath}): ${err.message}`);
    return false;
  }
};

// ─── Mount All Routes ────────────────────────────────────────────────────────

/**
 * Register every application route on the Express app instance.
 *
 * @param {import('express').Express} app
 * @param {Object} opts
 * @param {Function} opts.authRateLimiter - Rate limiter for auth endpoints
 */
const mountAllRoutes = (app, { authRateLimiter } = {}) => {
  // ── Auth rate limiting ──────────────────────────────────────────────────
  if (authRateLimiter) {
    app.use('/api/auth', authRateLimiter);
    app.use('/api/v1/auth', authRateLimiter);
  }

  // ── Core dual-mounted routes (/api + /api/v1) ──────────────────────────
  dualMount(app, 'auth', authRoutes);
  dualMount(app, 'users', usersRoutes);
  dualMount(app, 'modules', modulesRoutes);
  dualMount(app, 'payroll', require('../routes/payroll.routes'));
  dualMount(app, 'notifications', notificationsRoutes);
  dualMount(app, 'messages', messagingRoutes);
  dualMount(app, 'threads', safeRequire('../routes/threads.routes'));
  // W778: conversations stub deleted in W775 — real surface is chat.routes at
  // /api/(v1/)?chat/conversations via phases.registry.js
  // ── Finance (delegated to registries/finance.registry.js) ─────────────
  registerFinanceRoutes(app, { safeRequire, dualMount, dualMountAuth, safeMount, logger, authenticate });
  dualMount(app, 'integrations', integrationRoutes);

  // ── CCTV Surveillance Platform — Phase 27 ─────────────────────────────
  try {
    registerCctvRoutes(app, { logger });
  } catch (err) {
    logger.warn(`[cctv] registry failed: ${err.message}`);
  }

  // ── Dashboard (multiple sub-routers merged) ─────────────────────────────
  dualMount(app, 'dashboard', require('../routes/dashboard.stats'));
  dualMount(app, 'dashboard', dashboardExtrasRouter);

  // Search adapter: frontend sends GET /api/search?q=X&type=Y
  app.get('/api/search', (req, res, next) => {
    const { q, type, collection = 'systems', limit = 20 } = req.query;
    if (!q || !type) return next();
    req.query.query = q;
    req.url = `/api/search/${type}?query=${encodeURIComponent(q)}&collection=${collection}&limit=${limit}`;
    req.originalUrl = req.url;
    next('route');
  });
  app.use(
    '/api/search',
    (req, res, next) => {
      if (req.query.q && !req.query.query) req.query.query = req.query.q;
      next();
    },
    searchRoutes
  );

  dualMount(app, 'validate', validateRoutes);
  dualMount(app, 'lms', elearningRoutes);
  dualMount(app, 'org-branding', orgBrandingRoutes);
  dualMount(app, 'analytics', analyticsExtraRouter);

  // ── Real Mongoose CRUD Routes (dual-mounted /api + /api/v1) ─────────────
  dualMount(app, 'admin', adminRouter);
  dualMount(app, 'user-management', userManagementRouter);
  logger.info(
    '✅ User Management System routes mounted (stats, CRUD, bulk-actions, permissions, import/export)'
  );
  dualMount(app, 'account', accountRouter);
  dualMount(app, 'monitoring', monitoringRouter);
  dualMount(app, 'ai-predictions', aiPredictionsRouter);
  dualMount(app, 'ai-analytics', aiAnalyticsRouter);
  logger.info(
    '✅ prompt_20 AI Analytics routes mounted (22+ endpoints: dashboard, alerts, predictions, suggestions, reports, behavioral-analysis, schedule-optimize, models)'
  );
  dualMount(app, 'integrated-care', integratedCareRouter);
  dualMount(app, 'security', securityRouter);
  dualMount(app, 'organization', organizationRouter);
  dualMount(app, 'export-import', exportImportRouter);
  dualMount(app, 'exports', exportsRouter);

  dualMount(app, 'pm', pmRouter);

  // ── Dual-mounted CRUD routes ────────────────────────────────────────────
  dualMount(app, 'qiwa', qiwaRoutes);
  dualMount(app, 'gosi', gosiRoutes);
  dualMount(app, 'government', govIntegrationRoutes);
  dualMount(app, 'ecommerce', ecommerceRoutes);

  // ── Fleet & Transport (delegated to registries/fleet.registry.js) ──────────
  registerFleetRoutes(app, { safeRequire, dualMount, dualMountAuth, logger, authenticate });

  dualMount(app, 'cms', cmsRoutes);
  dualMount(app, 'community', communityRoutes);
  dualMount(app, 'knowledge', knowledgeRoutes);
  dualMount(app, 'rbac-advanced', rbacAdvancedRoutes);
  dualMount(app, 'licenses', licensesRoutes);
  dualMount(app, 'cases', caseManagementRoutes);
  dualMount(app, 'internal-audit', internalAuditRoutes);
  dualMountAuth(app, 'quality', qualityRoutes);
  dualMount(app, 'management-review', managementReviewRoutes);
  dualMount(app, 'evidence', evidenceRoutes);
  dualMount(app, 'compliance-calendar', complianceCalendarRoutes);
  dualMount(app, 'quality-controls', qualityControlsRoutes);
  dualMount(app, 'quality/health-score', qualityHealthScoreRoutes);
  dualMount(app, 'quality/notifications', notificationLogRoutes);
  dualMount(app, 'fmea', fmeaRoutes); // Phase 29 — FMEA / HFMEA worksheets
  dualMount(app, 'rca', rcaRoutes); // Phase 29 — Structured RCA (Ishikawa + 5 Whys)
  dualMount(app, 'spc', spcRoutes); // Phase 29 — SPC charts (X-bar/R/S, I-MR, p/np/c/u)
  dualMount(app, 'pareto-a3', paretoA3Routes); // Phase 29 — Pareto + A3 problem-solving
  dualMount(app, 'standards', standardsRoutes); // Phase 29 — Standards traceability (ISO 9001, JCI, CBAHI)
  dualMount(app, 'controlled-documents', controlledDocumentRoutes); // Phase 29 — 21 CFR Part 11 docs
  dualMount(app, 'supplier-quality', supplierQualityRoutes); // Phase 29 — Supplier SCARs + scorecards
  dualMount(app, 'calibration', calibrationRoutes); // Phase 29 — Calibration management
  dualMount(app, 'change-control', changeControlRoutes); // Phase 29 — Change Control
  dualMount(app, 'audit-scheduler', auditSchedulerRoutes); // Phase 29 — Internal audit scheduler
  dualMount(app, 'coq', coqRoutes); // Phase 29 — Cost of Quality
  dualMount(app, 'predictive-risk', predictiveRiskRoutes); // Phase 29 — Predictive risk analytics
  dualMount(app, 'trend-forecast', trendForecastRoutes); // Phase 29 — Trend forecasting
  dualMount(app, 'quality-narrative', qualityNarrativeRoutes); // Phase 29 — LLM-generated narratives
  dualMount(app, 'inspection-submissions', inspectionSubmissionRoutes); // Phase 29 — Mobile inspector PWA ingestion
  dualMount(app, 'benchmarks', benchmarkRoutes); // Phase 29 — Industry benchmarks
  dualMount(app, 'quality/command-center', qualityCommandCenterRoutes); // Phase 29 — Executive aggregator
  // enterprise-risk is mounted in phases.registry.js
  dualMount(app, 'admin/capa', capaAdminRoutes);
  // complaints-enhanced, kpi-dashboard, kpi-reports are mounted in features.registry.js
  // BC-08: Policy library + acknowledgement workflow (ISO 10002 / CBAHI)
  dualMount(app, 'quality/policies', policyLibraryRoutes);
  // ── Phase 16 Commit 1 — Ops SLA engine ───────────────────────────────
  dualMount(app, 'ops/sla', slaEngineRoutes);
  // ── Phase 16 Commit 2 — Ops WO state machine ─────────────────────────
  dualMount(app, 'ops/work-orders', workOrderOpsRoutes);
  // ── Phase 16 Commit 3 — Facility CRUD + inspections ──────────────────
  dualMount(app, 'ops/facilities', facilityOpsRoutes);
  // ── Phase 16 Commit 4 — PR → PO workflow ─────────────────────────────
  dualMount(app, 'ops/purchase-requests', purchaseRequestOpsRoutes);
  // ── Phase 16 Commit 5 — Ops Control Tower dashboards ─────────────────
  dualMount(app, 'ops/dashboard', opsDashboardRoutes);
  // ── Phase 16 Commit 6 — Meeting governance + decisions + follow-up ───
  dualMount(app, 'ops/meeting-governance', meetingGovernanceRoutes);
  // ── Phase 16 Commit 7 — Route optimization (planning + reconciliation) ─
  dualMount(app, 'ops/route-optimization', routeOptimizationRoutes);
  // ── Phase 16 Commit 8 — Notification dispatch (priority/quiet/digest) ─
  dualMount(app, 'ops/notification-dispatch', notificationDispatchRoutes);
  // ── Phase 17 Commit 1 — Care Platform: CRM lead funnel + inquiries ────
  dualMount(app, 'care/crm', careCrmRoutes);
  // ── Phase 17 Commit 2 — Care Platform: Social Services + cases ───────
  dualMount(app, 'care/social', careSocialRoutes);
  // ── Phase 17 Commit 3 — Care Platform: Home visits + GPS + follow-up SLA
  dualMount(app, 'care/home-visits', careHomeVisitRoutes);
  // ── Phase 17 Commit 4 — Care Platform: Welfare applications + appeals ────
  dualMount(app, 'care/welfare', careWelfareRoutes);
  // ── Phase 17 Commit 4 — Care Platform: Community partners + linkages ────
  dualMount(app, 'care/community', careCommunityRoutes);
  // ── Phase 17 Commit 5 — Care Platform: Psych (flags + scales + MDT) ────
  dualMount(app, 'care/psych', carePsychRoutes);
  // ── Phase 17 Commit 6 — Care Platform: Life Independence (TRA + IADL + Participation) ──
  dualMount(app, 'care/independence', careIndependenceRoutes);
  // ── Phase 17 Commit 7 — Care Platform: Beneficiary-360 unified profile ⭐ ──
  dualMount(app, 'care/360', careBeneficiary360Routes);
  // ── Phase 17 Commit 8 — Care Platform: Retention / churn risk + interventions ──
  dualMount(app, 'care/retention', careRetentionRoutes);
  dualMount(app, 'equipment', equipmentRoutes);
  dualMount(app, 'predictions', predictionsRoutes);
  dualMount(app, 'branches', branchesRoutes);
  dualMount(app, 'beneficiary-portal', beneficiaryPortalRoutes);
  // Beneficiary admin CRUD is now served by DDD Core /api/v1/core/beneficiaries
  // (legacy /api/v1/beneficiaries base routes retired).
  logger.info('✅ Beneficiary admin routes retired from /api/v1/beneficiaries; now served by DDD Core /api/v1/core/beneficiaries');
  dualMount(app, 'community-integration', communityIntegrationRoutes);
  logger.info(
    'Community Integration module mounted (activities, partnerships, participation, assessments, awareness — 30+ endpoints)'
  );

  // ── Wave 2: Fixed CRUD Routes (16 additional) ──────────────────────────
  dualMount(app, 'civil-defense', civilDefenseRoutes);
  dualMount(app, 'inventory', inventoryUnifiedRoutes);
  dualMount(app, 'supply-chain', supplyChainRoutes);
  dualMount(app, 'traffic-accidents', trafficAccidentRoutes);
  dualMount(app, 'mfa', mfaRoutes);
  dualMount(app, 'sso', ssoRoutes);
  dualMount(app, 'rbac', rbacRoutes);
  dualMount(app, 'rbac-admin', rbacAdminRoutes);
  dualMount(app, 'montessori', montessoriRoutes);
  dualMount(app, 'montessori/auth', montessoriAuthRoutes);
  dualMount(app, 'measurements', measurementsRoutes);
  // W659 — was dualMount (NO auth); mobileApp exposes user-specific device +
  // sync ops (getUserDevices/syncOperations/trustDevice) with no in-file auth →
  // anonymous-reachable. Promoted to dualMountAuth (audit:unauthenticated-routes).
  dualMountAuth(app, 'mobile', mobileAppRoutes);

  // ── Education System Routes (نظام التعليم) — delegated to registries/education.registry.js
  registerEducationRoutes(app, { safeRequire, dualMount, dualMountAuth, logger, authenticate });

  // ── Insurance Management System (نظام إدارة التأمين) ──
  dualMount(app, 'insurance', insuranceRoutes);
  logger.info('Insurance management routes mounted');

  logger.info('All frontend API routes mounted (existing + stubs + 23 + 16 = 39 CRUD routes)');

  // ── Previously single-mount routes (now dual-mounted) ───────────────────
  dualMount(app, 'assets', assetRoutes);
  dualMount(app, 'maintenance', maintenanceRoutes);
  dualMount(app, 'schedules', scheduleRoutes);
  dualMount(app, 'medical-files', require('../routes/medicalFiles'));

  // ── New API routes for frontend services ────────────────────────────────
  // W775 — specialized-programs legacy alias → real programs domain (Mongo-backed)
  dualMountAuth(
    app,
    'specialized-programs',
    safeRequire('../domains/programs/routes/programs.routes')
  );
  dualMount(app, 'smart-scheduler', require('../routes/smartScheduler.routes'));
  dualMount(app, 'appointments', require('../routes/appointments.routes'));
  dualMount(app, 'bookings', require('../routes/public-booking.routes'));
  dualMount(app, 'newsletter', require('../routes/newsletter.routes'));
  dualMount(app, 'careers', require('../routes/careers.routes'));
  dualMount(app, 'admin/beneficiaries', require('../routes/beneficiaries-admin.routes'));
  // Admin Therapy Sessions now served by DDD Sessions /api/v1/sessions/admin/*
  // (compat layer in domains/sessions/routes/sessions-admin-compat.routes.js).
  // dualMount(app, 'admin/therapy-sessions', require('../routes/therapy-sessions-admin.routes'));
  dualMount(app, 'admin/assessments', require('../routes/assessments-admin.routes'));
  // ── Disability Assessment Tests (اختبارات تقييم الإعاقة) ─────────────────
  dualMount(app, 'disability', safeRequire('../routes/disability-assessment.routes'));
  // ── W206 Smart Rehab Engine — assessment→goals+programs+schedule ────────
  dualMountAuth(app, 'assessment-engine', require('../routes/assessmentRecommendation.routes'));
  dualMount(app, 'admin/care-plans', require('../routes/care-plans-admin.routes'));
  // Episodes of Care — now served by the DDD episodes domain secure router
  // (domains/episodes/routes/episodes.routes.js). Legacy /api/v1/episodes route
  // file retired to backend/_archived/routes.
  // rehabilitation-advanced is now registered via clinical-therapy.registry.js (via phases.registry.js)
  dualMount(app, 'parent-v2', require('../routes/parent-portal-v2.routes'));
  dualMount(app, 'parent-v2', require('../routes/parent-portal-v2-extras.routes'));
  dualMount(app, 'therapist-workbench', require('../routes/therapist-workbench.routes'));

  // ── v1 Portal skeletons (frontend contracts; implementations pending) ───
  // Mounted so that /api/v1/portal/*, /api/v1/student/* return documented 501 envelopes.
  // NOTE: /api/v1/therapist is now registered via clinical-therapy.registry.js (5-tier multi-mount)
  safeMount(app, ['/api/v1/portal'], '../routes/parent-portal-v1.routes');
  safeMount(app, ['/api/v1/student'], '../routes/student-portal.routes');
  safeMount(app, ['/api/v1/hq-reports'], '../routes/hq-reports.routes');
  dualMount(app, 'admin/bi', require('../routes/bi-analytics.routes'));
  dualMount(app, 'admin/invoices', require('../routes/invoices-admin.routes'));
  dualMount(app, 'chat-v2', require('../routes/chat-v2.routes'));
  dualMount(app, 'admin/clinical-docs', require('../routes/clinical-docs.routes'));
  dualMount(app, 'telehealth-v2', require('../routes/telehealth-v2.routes'));
  dualMount(app, 'auth/nafath', require('../routes/nafath.routes'));
  dualMount(app, 'admin/hr/compliance', require('../routes/hr-compliance.routes'));
  dualMount(app, 'admin/hr/cpe', require('../routes/cpe-admin.routes'));
  dualMount(app, 'admin/attendance', require('../routes/attendance-admin.routes'));
  dualMount(app, 'attendance-mgmt', require('../routes/attendance-management.routes'));
  dualMount(app, 'admin/outcomes', require('../routes/outcomes-admin.routes'));
  dualMount(app, 'admin/nps', require('../routes/nps-admin.routes'));
  app.use('/api/public/nps', require('../routes/public-nps.routes'));
  dualMount(app, 'admin/goal-progress', require('../routes/goal-progress-admin.routes'));
  dualMount(app, 'admin/utilization', require('../routes/utilization-admin.routes'));
  dualMount(app, 'admin/waitlist', require('../routes/waitlist-admin.routes'));
  dualMount(app, 'admin/referrals', require('../routes/referrals-admin.routes'));
  dualMount(app, 'admin/revenue', require('../routes/revenue-admin.routes'));
  dualMount(app, 'admin/claims-analytics', require('../routes/claims-analytics-admin.routes'));
  dualMount(app, 'admin/revenue-forecast', require('../routes/revenue-forecast-admin.routes'));
  dualMount(app, 'admin/retention', require('../routes/retention-admin.routes'));
  dualMount(
    app,
    'admin/complaints-analytics',
    require('../routes/complaints-analytics-admin.routes')
  );
  // W777: document-expiry mounted once via documents.registry.js (phases.registry)
  dualMount(
    app,
    'admin/incidents-analytics',
    require('../routes/incidents-analytics-admin.routes')
  );
  dualMount(app, 'admin/saudization', require('../routes/saudization-admin.routes'));
  dualMount(app, 'admin/onboarding', require('../routes/onboarding-admin.routes'));
  dualMount(app, 'admin/gov-integrations', require('../routes/gov-integrations.routes'));
  dualMount(app, 'admin/nphies-claims', require('../routes/nphies-claims.routes'));
  dualMount(app, 'admin/insurance-tariffs', require('../routes/insurance-tariffs-admin.routes'));
  dualMount(app, 'admin/zatca-credentials', require('../routes/zatca-credentials-admin.routes'));
  dualMount(app, 'admin/pii-access-audit', require('../routes/pii-access-audit-admin.routes'));
  // zatca-phase2 is now registered via government.registry.js (via phases.registry.js)
  dualMount(app, 'admin/branch-compliance', require('../routes/branch-compliance.routes'));
  dualMount(app, 'admin/adapter-audit', require('../routes/adapter-audit.routes'));
  dualMount(app, 'notify', require('../routes/notify.routes'));
  // ADR-029 Option A (2026-05-25): the approvalRequests stub at /api/approval-requests was
  // deleted because it returned hardcoded fake data including silent-no-op POST handlers.
  // The canonical implementation at authorization/approvals/approvals.routes.js mounted at
  // /api/v1/approvals is the real surface; SystemAdmin's lone caller was migrated to use it.
  dualMount(app, 'groups', require('../routes/groups.routes'));

  // ── Reports & Analytics Module (وحدة التقارير والتحليلات) ─────────────────
  dualMount(app, 'reports', safeRequire('../routes/reports-analytics-module.routes'));

  // ── DDD Domain Routes (مسارات نطاقات DDD) ──────────────────────────────────
  // Core: Beneficiary CRUD (/core/beneficiaries) + 360° dashboard
  dualMountAuth(app, 'core', safeRequire('../domains/core/routes/core.routes'));
  // Workflow & Journey Engine
  dualMountAuth(app, 'workflow', safeRequire('../domains/workflow/routes/workflow.routes'));
  // Rehabilitation Programs Library — auth required
  dualMountAuth(app, 'programs', safeRequire('../domains/programs/routes/programs.routes'));
  // AI Recommendations & Risk Scoring
  dualMount(
    app,
    'ai-recommendations',
    safeRequire('../domains/ai-recommendations/routes/recommendations.routes')
  );
  // Family Engagement Portal
  dualMountAuth(app, 'family', safeRequire('../domains/family/routes/family.routes'));
  // W777: WhatsApp mounted once via communication.registry.js (phases.registry)
  // Group Therapy
  dualMount(
    app,
    'group-therapy',
    safeRequire('../domains/group-therapy/routes/group-therapy.routes')
  );
  // Tele-Rehabilitation — auth required
  dualMountAuth(app, 'tele-rehab', safeRequire('../domains/tele-rehab/routes/tele-rehab.routes'));
  // AR/VR Rehabilitation — auth required
  dualMountAuth(app, 'ar-vr', safeRequire('../domains/ar-vr/routes/ar-vr.routes'));
  // Behavior Management
  dualMountAuth(app, 'behavior', safeRequire('../domains/behavior/routes/behavior.routes'));
  // Goals & Measures Library (/goals/goals CRUD + /goals/measures/*)
  dualMountAuth(app, 'goals', safeRequire('../domains/goals/routes/index.routes'));
  // Dashboards & Decision Support — auth required (domain router has no internal authenticate)
  dualMountAuth(app, 'dashboards', safeRequire('../domains/dashboards/routes/dashboards.routes'));
  // Field Training
  dualMount(
    app,
    'field-training',
    safeRequire('../domains/field-training/routes/field-training.routes')
  );
  // Clinical Research — auth required
  dualMountAuth(app, 'research', safeRequire('../domains/research/routes/research.routes'));
  // Episodes of Care — محور المنصة (الحلقة العلاجية الموحدة)
  // Mounted by domains/episodes/index.js so the branch-isolated secure router
  // owns /api/(v1/v2/)episodes without being shadowed by legacy routes.
  logger.info(
    '✅ Episodes of Care routes mounted via DDD domain: CRUD, beneficiary episodes, active episode, statistics, phase/therapist lists, workflow transitions (advance/suspend/resume/discharge), care team, clinical summary — الحلقة العلاجية (16+ endpoints)'
  );
  // HR — الموارد البشرية الموحدة — auth required (employee PII)
  // OWNER MAP for /api/(v1/)?hr (ADR-043): this domain router owns the CORE
  // personnel subpaths (/employees, /leaves, /attendance); the Round-10 module
  // subpaths (/loans, /travel, /visas, …) are served by routes/hr/hr-modules.routes.js
  // mounted at app.js (/api/v1/hr). Mounted FIRST here, so it wins on overlap —
  // a new subpath must not collide with hr-modules. Branch-isolated in W1141.
  dualMountAuth(app, 'hr', safeRequire('../domains/hr/routes/hr.routes'));
  // Security/RBAC — الأمان وإدارة الصلاحيات الموحدة
  dualMountAuth(app, 'security/domain', safeRequire('../domains/security/routes/security-rbac.routes'));
  // Notifications (الإشعارات الموحدة)
  dualMount(
    app,
    'notifications',
    safeRequire('../domains/notifications/routes/notifications.routes')
  );
  // Quality & Compliance (الجودة والامتثال)
  dualMountAuth(app, 'quality', safeRequire('../domains/quality/routes/quality.routes'));
  // Reports Engine (محرك التقارير) — auth required
  dualMountAuth(app, 'reports', safeRequire('../domains/reports/routes/reports.routes'));
  // Rehab Measures Library & Smart Assessment Engine (مكتبة المقاييس التأهيلية والتقييم الذكي)
  dualMountAuth(app, 'rehab-measures', safeRequire('../routes/rehab-measures.routes'));
  // Rehab Program Templates Engine (محرك قوالب برامج التأهيل) — auth required
  dualMountAuth(app, 'rehab-templates', safeRequire('../routes/rehab-templates.routes'));
  // Activity Library — Phase 27 (مكتبة الأنشطة التأهيلية)
  dualMount(
    app,
    'activity-library',
    safeRequire('../rehabilitation-services/activity-library-routes')
  );
  // Clinical Assessments (تقييمات سريرية) — auth required (PII)
  dualMountAuth(app, 'assessments', safeRequire('../domains/assessments/routes/assessments.routes'));
  // Clinical Sessions (جلسات علاجية) — auth required (PII)
  // Mounted by domains/sessions/index.js so the branch-isolated secure router
  // owns /api/(v1/v2/)sessions without being shadowed by legacy routes.
  logger.info(
    '✅ Clinical Sessions routes mounted via DDD domain: CRUD, schedule, status transitions, attendance, reschedule, SOAP/documentation, branch-scoped lists, Session-Center analytics — الجلسات العلاجية الموحدة (20+ endpoints)'
  );
  // Therapy Sessions — retired: /api/v1/therapy-sessions merged into DDD Sessions
  // (/api/v1/sessions). Frontend callers now use therapySessions.service.js which
  // delegates to sessionsAPI from services/ddd.
  logger.info(
    '✅ /api/v1/therapy-sessions routes retired; now served by DDD Sessions /api/v1/sessions — الجلسات العلاجية (توحيد الأسطح)'
  );
  // Therapy Sessions Analytics — retired: merged into DDD Sessions
  // (/api/v1/sessions/analytics/*). Frontend callers now use therapistService
  // which delegates to sessionsAPI.analytics from services/ddd.
  logger.info(
    '✅ /api/v1/therapy-sessions-analytics routes retired; now served by DDD Sessions /api/v1/sessions/analytics — تحليلات الجلسات (توحيد الأسطح)'
  );
  // Therapist Extended — treatment plans, assessments, prescriptions, professional-dev, analytics, consultations
  dualMountAuth(app, 'therapist-extended', safeRequire('../routes/therapist-extended.routes'));
  // ICF Assessments — التصنيف الدولي للأداء الوظيفي
  dualMountAuth(app, 'icf-assessments', safeRequire('../routes/icf-assessments.routes'));
  // Task Management — إدارة المهام — auth required
  dualMountAuth(app, 'tasks', safeRequire('../routes/tasks.routes'));
  // Referral Portal — بوابة التحويلات
  // W471: switched dualMount → dualMountAuth. Pre-W471 the entire
  // referrals surface (24 endpoints handling patient referrals
  // between facilities — PHI: patient demographics, medical history,
  // urgency, assessments, FHIR IDs, inter-facility comms) was
  // mounted WITHOUT auth middleware. The route file referrals.routes.js
  // itself never calls router.use(authenticate). Anonymous attacker
  // could hit /api/v1/referrals/<id> and read every referral in the
  // system (PHI exfiltration), DELETE referrals, POST fake referrals
  // to harm a competitor facility's reputation. Sibling routes
  // (icf-assessments, tasks) correctly use dualMountAuth — this was
  // a regression at mount-time, not a route-file bug.
  dualMountAuth(app, 'referrals', safeRequire('../routes/referrals.routes'));
  // Rehab Disciplines & Goal Suggestions — تخصصات التأهيل ومقترحات الأهداف
  dualMountAuth(app, 'rehab', safeRequire('../routes/rehab.routes'));

  // ── Phase-12 Gap-Fill Mounts ───────────────────────────────────────────
  // Incidents — الحوادث والبلاغات
  dualMount(app, 'incidents', safeRequire('../routes/incidentRoutes'));
  // CEO Dashboard — لوحة قيادة الرئيس التنفيذي
  dualMount(app, 'ceo-dashboard', safeRequire('../routes/ceoDashboard.routes'));
  // Compensation & Benefits — الرواتب والمزايا
  dualMount(app, 'compensation-benefits', safeRequire('../routes/compensationBenefits.routes'));
  // CRM — إدارة علاقات العملاء
  dualMount(app, 'crm', safeRequire('../routes/crm-enhanced.routes'));
  // Knowledge Center — مركز المعرفة
  dualMount(app, 'knowledge-center', safeRequire('../routes/knowledgeCenter.routes'));
  // Quality Management — إدارة الجودة
  dualMount(app, 'quality-management', safeRequire('../routes/qualityManagement.routes'));
  // Purchasing — المشتريات
  dualMountAuth(app, 'purchasing', safeRequire('../routes/purchasing.routes'));
  // Form Templates — real Mongo FormTemplate engine (W775; was hollow stub)
  dualMountAuth(app, 'form-templates', safeRequire('../routes/formTemplate.routes'));
  // Report Builder — mounted in phases.registry.js via reportBuilder.routes (W771
  // removed the hollow report-builder.routes.js stub that shadowed the real surface)
  // System Settings — live router mounted in phases.registry.js (systemSettings.routes.js)

  // Unified Care Plans (خطط الرعاية الموحدة) — auth required (PII)
  dualMountAuth(app, 'care-plans', safeRequire('../domains/care-plans/routes/care-plans.routes'));
  // Care Timeline (الخط الزمني الطولي)
  dualMountAuth(app, 'timeline', safeRequire('../domains/timeline/routes/timeline.routes'));

  // ── Platform Extension Modules — 32 generic CRUD domains ─────────────────
  const makeGenericCrudRouter = require('../domains/extensions/routes/generic-crud.factory');
  [
    // HRD & Training
    'workforce-analytics',
    'credential-manager',
    'mentorship-program',
    'career-pathway',
    // Quality & Compliance
    'accreditation-manager',
    'inspection-tracker',
    'standards-compliance',
    'licensure-manager',
    // Patient Engagement
    'patient-portal',
    'health-education',
    'remote-monitoring',
    'patient-community',
    // Interoperability
    'fhir-integration',
    'hl7-messaging',
    'data-exchange',
    'interoperability-hub',
    // Infrastructure & Resilience
    'backup-manager',
    'business-continuity',
    'system-failover',
    'incident-response',
    // Facilities & Assets
    'equipment-lifecycle',
    'environmental-monitoring',
    'space-management',
    'asset-tracking',
    // Research
    'clinical-research',
    'clinical-trials',
    'outcome-research',
    'publication-manager',
    // Community & Outreach
    'volunteer-management',
    'community-outreach',
    'donor-relations',
    'advocacy-program',
  ].forEach(slug => dualMount(app, slug, makeGenericCrudRouter(slug)));

  // ── Phase-13 Gap-Fill Mounts ───────────────────────────────────────────
  // Routes that existed as camelCase files but were missing kebab-case mounts
  // that the frontend services expect at /api/v1/<kebab-path>.

  // AI & Diagnostics
  dualMount(app, 'ai-diagnostic', safeRequire('../routes/aiDiagnostic.routes'));
  // Bus / Transport Tracking
  dualMount(app, 'bus-tracking', safeRequire('../routes/busTracking.routes'));
  dualMount(app, 'transport-routes', safeRequire('../routes/transportRoutes'));
  dualMount(app, 'traffic-accidents', safeRequire('../routes/trafficAccidents'));
  // Therapist Tier Plans
  dualMount(app, 'therapist-pro', safeRequire('../routes/therapistPro.routes'));
  dualMount(app, 'therapist-ultra', safeRequire('../routes/therapistUltra.routes'));
  dualMount(app, 'therapist-elite', safeRequire('../routes/therapistElite.routes'));
  // Strategic & Succession Planning
  dualMount(app, 'strategic-planning', safeRequire('../routes/strategicPlanning.routes'));
  dualMountAuth(app, 'succession-planning', safeRequire('../routes/successionPlanning.routes'));
  // Finance Operations
  dualMount(app, 'finance-operations', safeRequire('../routes/financeOperations.routes'));
  // OCR / Document Intelligence
  dualMount(app, 'ocr-documents', safeRequire('../routes/ocrDocument.routes'));
  // Employee Self-Service Portal
  dualMount(app, 'employee-portal', safeRequire('../routes/employeePortal.routes'));
  // WAF / Rate-Limit management UI
  dualMount(app, 'waf-ratelimit', safeRequire('../routes/rate-limit-waf.routes'));
  // Saudi Tax (ZATCA integration)
  dualMount(app, 'saudi-tax', safeRequire('../routes/saudiTax.routes'));
  // Smart Scheduler
  dualMount(app, 'smart-scheduler', safeRequire('../routes/smartScheduler.routes'));
  // Smart Documents
  dualMount(app, 'documents-smart', safeRequire('../routes/documents.smart.routes'));
  // Advanced/Pro Documents — main + versioned phases + extended
  dualMount(app, 'documents-pro', safeRequire('../routes/documentAdvanced.routes'));
  dualMount(app, 'documents-pro-ext', safeRequire('../routes/documentAdvanced.routes'));
  ['v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'].forEach(v =>
    dualMount(app, `documents-pro-${v}`, safeRequire('../routes/documentAdvanced.routes'))
  );
  // Internal Audit — التدقيق الداخلي
  dualMount(app, 'internal-audit', safeRequire('../routes/internalAudit'));
  // Disability Rehabilitation (maps to specialized rehab domain)
  dualMountAuth(app, 'disability-rehab', safeRequire('../routes/rehabilitation-specialized.routes'));
  // Rehabilitation Equipment
  dualMount(app, 'rehab-equipment', safeRequire('../routes/medicalEquipment.routes'));
  // Break-glass — wired in features.registry.js (real authorization engine, W770)

  logger.info(
    'New frontend-backend integration routes mounted (8 new + 4 dual-mounted + 17 DDD + 32 extension modules)'
  );

  // ── Phases & Systems (~100 modules) — delegated to registries/phases.registry.js ──
  // Guarded: a throw inside one registry must NOT abort the registries that
  // follow it (root cause of unmounted features/government routes — 2026-06-29).
  try {
    registerPhaseRoutes(app, { safeRequire, dualMount, dualMountAuth, safeMount, logger, authenticate });
  } catch (e) {
    console.error('[BOOT-DIAG] registerPhaseRoutes THREW:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
  }

  // ── Phase-16 Ops Control Tower (W801) — was built but unmounted until W801 ──
  try {
    registerOpsRoutes(app, { safeMount, logger });
  } catch (e) {
    console.error('[BOOT-DIAG] registerOpsRoutes THREW:', e && e.message);
  }

  // ── Features / Prompt Modules (~25 modules) — delegated to registries/features.registry.js ──
  try {
    registerFeatureRoutes(app, { safeRequire, dualMount, dualMountAuth, safeMount, logger, authenticate });
  } catch (e) {
    console.error('[BOOT-DIAG] registerFeatureRoutes THREW:', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
  }

  // ── Route Mount Summary ─────────────────────────────────────────────────
  const summary = routeHealth.summary;
  // Split into "missing module file" (expected, archived stubs) vs "real
  // load error" (downstream require / syntax). The former is captured in
  // route-health and exposed at /api/health/routes — no need to spam logs
  // with one warn per missing stub.
  const missingStubs = routeHealth.failed.filter(f => f.missing);
  const realFailures = routeHealth.failed.filter(f => !f.missing);

  if (summary.failed === 0) {
    logger.info(`✅ All ${summary.total} route modules loaded successfully`);
  } else {
    logger.info(
      `Route loading: ${summary.ok}/${summary.total} OK` +
        (missingStubs.length ? `, ${missingStubs.length} archived stubs` : '') +
        (realFailures.length ? `, ${realFailures.length} FAILED` : '')
    );
    if (missingStubs.length) {
      logger.debug(
        `[Routes] Archived stubs (mounted as empty routers): ${missingStubs
          .map(f => f.path)
          .join(', ')}`
      );
    }
    if (realFailures.length) {
      logger.warn(`⚠️  ${realFailures.length} route module(s) failed to load:`);
      realFailures.forEach(f => {
        logger.warn(`   ✗ ${f.path} → ${f.error}`);
      });
      // Emit structured event for monitoring/alerting systems (Sentry, Prometheus, etc.)
      process.emit('route:load:failures', {
        count: realFailures.length,
        routes: realFailures,
        timestamp: new Date().toISOString(),
      });
    }
  }
};

module.exports = { mountAllRoutes, dualMount, safeMount, routeHealth };
