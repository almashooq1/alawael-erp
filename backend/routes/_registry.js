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


// ─── Safe Require — returns empty router on failure ───────────────────────────
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    logger.warn(`[safeRequire] Failed to load: ${modulePath} — ${err.message}`);
    routeHealth.failed.push({ path: modulePath, module: modulePath, error: err.message });
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
const adminRouter = safeRequire('../routes/admin.real.routes');
const userManagementRouter = safeRequire('../routes/user-management.routes');
const accountRouter = safeRequire('../routes/account.real.routes');
const monitoringRouter = safeRequire('../routes/monitoring.real.routes');
const aiPredictionsRouter = safeRequire('../routes/aiPredictions.real.routes');
const aiAnalyticsRouter = safeRequire('../routes/ai-analytics.routes');
const integratedCareRouter = safeRequire('../routes/integratedCare.real.routes');
const securityRouter = safeRequire('../routes/security.real.routes');
const organizationRouter = safeRequire('../routes/organization.real.routes');
const exportImportRouter = safeRequire('../routes/exportImport.real.routes');
const exportsRouter = safeRequire('../routes/exports.real.routes');
const pmRouter = safeRequire('../routes/pm.real.routes');
const analyticsExtraRouter = safeRequire('../routes/analyticsExtra.real.routes');
const dashboardExtrasRouter = safeRequire('../routes/dashboardExtras.real.routes');

// Previously Unmounted Route Files (CRUD-complete)
const qiwaRoutes = safeRequire('../routes/qiwa.routes');
const gosiRoutes = safeRequire('../routes/gosi.routes');
const govIntegrationRoutes = safeRequire('../routes/governmentIntegration.routes');
const ecommerceRoutes = safeRequire('../routes/ecommerce.routes');
// Guard against module missing — safeRequire returns an empty Router (no .router)
// so destructure defensively to avoid a silent undefined downstream.
const purchasingRoutes =
  (safeRequire('../routes/purchasing.routes.unified') || {}).router ||
  require('express').Router();
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
const equipmentRoutes = safeRequire('../routes/equipment');
const predictionsRoutes = safeRequire('../routes/predictions.routes');
const projectsRoutes = safeRequire('../routes/projects.routes');
const branchesRoutes = safeRequire('../routes/branches.routes');
const beneficiaryPortalRoutes = safeRequire('../routes/beneficiaryPortal');
const beneficiariesAdminRoutes = safeRequire('../routes/beneficiaries');
const communityIntegrationRoutes = safeRequire('../routes/communityIntegration.routes');

// Wave 2: Fixed Route Files (16 additional CRUD routes)
const civilDefenseRoutes = safeRequire('../routes/civilDefense.routes');
// Guard against missing module (same defensive pattern as purchasingRoutes)
const inventoryUnifiedRoutes =
  (safeRequire('../routes/inventory.routes.unified') || {}).router ||
  require('express').Router();
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
const safeError = require('../utils/safeError');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mount a route handler on both /api/<path> and /api/v1/<path>.
 */
const dualMount = (app, path, handler) => {
  app.use(`/api/${path}`, handler);
  app.use(`/api/v1/${path}`, handler);
};

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
    routeHealth.failed.push({ path: pathLabel, module: String(modulePath), error: safeError(err) });
    logger.error(`[ROUTE FAIL] ${pathLabel} (${modulePath}): ${err.message}`);
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
  dualMount(app, 'threads', require('../routes/threads.routes'));
  dualMount(app, 'conversations', require('../routes/conversations.routes'));
  // ── Finance (delegated to registries/finance.registry.js) ─────────────
  registerFinanceRoutes(app, { safeRequire, dualMount, safeMount, logger });
  dualMount(app, 'integrations', integrationRoutes);

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
  dualMount(app, 'purchasing', purchasingRoutes);

  // ── Fleet & Transport (delegated to registries/fleet.registry.js) ──────────
  registerFleetRoutes(app, { safeRequire, dualMount, logger });

  dualMount(app, 'cms', cmsRoutes);
  dualMount(app, 'community', communityRoutes);
  dualMount(app, 'knowledge', knowledgeRoutes);
  dualMount(app, 'rbac-advanced', rbacAdvancedRoutes);
  dualMount(app, 'licenses', licensesRoutes);
  dualMount(app, 'cases', caseManagementRoutes);
  dualMount(app, 'internal-audit', internalAuditRoutes);
  dualMount(app, 'quality', qualityRoutes);
  dualMount(app, 'equipment', equipmentRoutes);
  dualMount(app, 'predictions', predictionsRoutes);
  dualMount(app, 'projects', projectsRoutes);
  dualMount(app, 'branches', branchesRoutes);
  dualMount(app, 'beneficiary-portal', beneficiaryPortalRoutes);
  dualMount(app, 'beneficiaries', beneficiariesAdminRoutes);
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
  dualMount(app, 'mobile', mobileAppRoutes);

  // ── Education System Routes (نظام التعليم) — delegated to registries/education.registry.js
  registerEducationRoutes(app, { safeRequire, dualMount, logger });

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
  dualMount(app, 'support', require('../routes/supportTickets.routes'));
  dualMount(app, 'specialized-programs', require('../routes/specializedPrograms.routes'));
  dualMount(app, 'performance-evaluations', require('../routes/performanceEvaluations.routes'));
  dualMount(app, 'smart-scheduler', require('../routes/smartScheduler.routes'));
  dualMount(app, 'appointments', require('../routes/appointments.routes'));
  dualMount(app, 'bookings', require('../routes/public-booking.routes'));
  dualMount(app, 'newsletter', require('../routes/newsletter.routes'));
  dualMount(app, 'careers', require('../routes/careers.routes'));
  dualMount(app, 'admin/beneficiaries', require('../routes/beneficiaries-admin.routes'));
  dualMount(app, 'admin/therapy-sessions', require('../routes/therapy-sessions-admin.routes'));
  dualMount(app, 'admin/assessments', require('../routes/assessments-admin.routes'));
  dualMount(app, 'admin/care-plans', require('../routes/care-plans-admin.routes'));
  dualMount(app, 'parent-v2', require('../routes/parent-portal-v2.routes'));
  dualMount(app, 'therapist-workbench', require('../routes/therapist-workbench.routes'));
  dualMount(app, 'admin/bi', require('../routes/bi-analytics.routes'));
  dualMount(app, 'admin/invoices', require('../routes/invoices-admin.routes'));
  dualMount(app, 'chat-v2', require('../routes/chat-v2.routes'));
  dualMount(app, 'admin/clinical-docs', require('../routes/clinical-docs.routes'));
  dualMount(app, 'telehealth-v2', require('../routes/telehealth-v2.routes'));
  dualMount(app, 'auth/nafath', require('../routes/nafath.routes'));
  dualMount(app, 'admin/hr/compliance', require('../routes/hr-compliance.routes'));
  dualMount(app, 'admin/hr/cpe', require('../routes/cpe-admin.routes'));
  dualMount(app, 'admin/attendance', require('../routes/attendance-admin.routes'));
  dualMount(app, 'admin/gov-integrations', require('../routes/gov-integrations.routes'));
  dualMount(app, 'admin/nphies-claims', require('../routes/nphies-claims.routes'));
  dualMount(app, 'admin/branch-compliance', require('../routes/branch-compliance.routes'));
  dualMount(app, 'admin/adapter-audit', require('../routes/adapter-audit.routes'));
  dualMount(app, 'notify', require('../routes/notify.routes'));
  dualMount(app, 'notification-templates', require('../routes/notificationTemplates.routes'));
  dualMount(app, 'approval-requests', require('../routes/approvalRequests.routes'));
  dualMount(app, 'templates', require('../routes/templates.routes'));
  dualMount(app, 'groups', require('../routes/groups.routes'));
  logger.info('New frontend-backend integration routes mounted (8 new + 4 dual-mounted)');

  // ── Phases & Systems (~100 modules) — delegated to registries/phases.registry.js ──
  registerPhaseRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── Features / Prompt Modules (~25 modules) — delegated to registries/features.registry.js ──
  registerFeatureRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── Route Mount Summary ─────────────────────────────────────────────────
  const summary = routeHealth.summary;
  if (summary.failed === 0) {
    logger.info(`✅ All ${summary.total} route modules loaded successfully`);
  } else {
    logger.warn(`⚠️  Route loading: ${summary.ok}/${summary.total} OK, ${summary.failed} FAILED`);
    summary.failedRoutes.forEach(f => {
      logger.warn(`   ✗ ${f.path} → ${f.error}`);
    });
    // Emit structured event for monitoring/alerting systems (Sentry, Prometheus, etc.)
    process.emit('route:load:failures', {
      count: summary.failed,
      routes: summary.failedRoutes,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = { mountAllRoutes, dualMount, safeMount, routeHealth };
