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

const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
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
const authRoutes = require('../api/routes/auth.routes');
const usersRoutes = require('../api/routes/users.routes');
const modulesRoutes = require('../api/routes/modules.routes');
const crmRoutes = require('../api/routes/crm.routes.advanced');
const reportingRoutes = require('../api/routes/reporting.routes');
const documentsRoutes = require('../api/routes/documents.routes');
const notificationsRoutes = require('../routes/notifications.routes');
const messagingRoutes = require('../routes/messaging.routes');
const financeRoutes = require('../routes/finance.routes.unified');
const financeAdvancedRoutes = require('../routes/finance.routes.advanced');
const financeExtendedRoutes = require('../routes/finance.routes.extended');
const financeProRoutes = require('../routes/finance.routes.pro');
const financeEnterpriseRoutes = require('../routes/finance.routes.enterprise');
const financeUltimateRoutes = require('../routes/finance.routes.ultimate');
const financeEliteRoutes = require('../routes/finance.routes.elite');
const integrationRoutes = require('../routes/integration.routes.minimal');
const disabilityRehabilitationRoutes = require('../routes/disability-rehabilitation');
const maintenanceRoutes = require('../routes/maintenance');
const webhooksRoutes = require('../routes/webhooks');
const assetRoutes = require('../routes/assets');
const scheduleRoutes = require('../routes/schedules');
const analyticsRoutes = require('../routes/analytics');
const reportRoutes = require('../routes/reports');

// Existing route files
const dashboardRoutes = require('../routes/dashboard');
const searchRoutes = require('../routes/search');
const validateRoutes = require('../routes/validate');
const elearningRoutes = require('../routes/elearning');
const orgBrandingRoutes = require('../routes/orgBranding');

// Real Mongoose CRUD routes (converted from frontend-api-stubs)
const adminRouter = require('../routes/admin.real.routes');
const accountRouter = require('../routes/account.real.routes');
const paymentsRouter = require('../routes/payments.real.routes');
const monitoringRouter = require('../routes/monitoring.real.routes');
const aiPredictionsRouter = require('../routes/aiPredictions.real.routes');
const hrSystemRouter = require('../routes/hrSystem.real.routes');
const integratedCareRouter = require('../routes/integratedCare.real.routes');
const securityRouter = require('../routes/security.real.routes');
const organizationRouter = require('../routes/organization.real.routes');
const communicationsRouter = require('../routes/communications.real.routes');
const aiCommRouter = require('../routes/aiCommunications.real.routes');
const exportImportRouter = require('../routes/exportImport.real.routes');
const exportsRouter = require('../routes/exports.real.routes');
const studentReportsRouter = require('../routes/studentReports.real.routes');
const rehabProgramsRouter = require('../routes/rehabPrograms.real.routes');
const documentsSmartRouter = require('../routes/documentsSmart.real.routes');
const studentsRouter = require('../routes/students.real.routes');
const compensationRouter = require('../routes/compensation.real.routes');
const disabilityRouter = require('../routes/disability.real.routes');
const pmRouter = require('../routes/pm.real.routes');
const analyticsExtraRouter = require('../routes/analyticsExtra.real.routes');
const dashboardExtrasRouter = require('../routes/dashboardExtras.real.routes');
const parentsRouter = require('../routes/parents.real.routes');
const guardianPortalRouter = require('../routes/guardian.portal.routes');

// Previously Unmounted Route Files (CRUD-complete)
const qiwaRoutes = require('../routes/qiwa.routes');
const gosiRoutes = require('../routes/gosi.routes');
const govIntegrationRoutes = require('../routes/governmentIntegration.routes');
const disabilityCardRoutes = require('../routes/disabilityCard.routes');
const ecommerceRoutes = require('../routes/ecommerce.routes');
const { router: purchasingRoutes } = require('../routes/purchasing.routes.unified');
const hrAdvancedRoutes = require('../routes/hr-advanced.routes');
const communicationRoutes = require('../routes/communication.routes');
const driversRoutes = require('../routes/drivers');
const vehiclesRoutes = require('../routes/vehicles');
const tripsRoutes = require('../routes/trips');
const gpsRoutes = require('../routes/gps');
const transportRoutesRouter = require('../routes/transportRoutes');
const geofenceRoutes = require('../routes/geofences');
const dispatchRoutes = require('../routes/dispatch');
const fleetCostsRoutes = require('../routes/fleetCosts');
const fleetTiresRoutes = require('../routes/fleetTires');
const fleetSafetyRoutes = require('../routes/fleetSafety');
const fleetFuelCardsRoutes = require('../routes/fleetFuelCards');
const fleetInspectionsRoutes = require('../routes/fleetInspections');
const driverTrainingRoutes = require('../routes/driverTraining');
const vehicleInsuranceRoutes = require('../routes/vehicleInsurance');
const fleetKPIRoutes = require('../routes/fleetKPI');
const driverShiftsRoutes = require('../routes/driverShifts');
const fleetComplianceRoutes = require('../routes/fleetCompliance');
const trafficFinesRoutes = require('../routes/trafficFines');
const fleetDocumentRoutes = require('../routes/fleetDocuments');
const fleetPartRoutes = require('../routes/fleetParts');
const cargoRoutes = require('../routes/cargo');
const fleetReservationRoutes = require('../routes/fleetReservations');
const vehicleAssignmentRoutes = require('../routes/vehicleAssignments');
const fleetParkingRoutes = require('../routes/fleetParking');
const fleetAlertRoutes = require('../routes/fleetAlerts');
const driverLeaveRoutes = require('../routes/driverLeaves');
const fleetFuelRoutes = require('../routes/fleetFuel');
const fleetTollRoutes = require('../routes/fleetTolls');
const fleetAccidentRoutes = require('../routes/fleetAccidents');
const fleetWarrantyRoutes = require('../routes/fleetWarranties');
const fleetRoutePlanRoutes = require('../routes/fleetRoutePlans');
const fleetCommunicationRoutes = require('../routes/fleetCommunications');
const fleetPenaltyRoutes = require('../routes/fleetPenalties');
const fleetDisposalRoutes = require('../routes/fleetDisposals');
const cmsRoutes = require('../routes/cms');
const communityRoutes = require('../routes/community');
const knowledgeRoutes = require('../routes/knowledge');
const rbacAdvancedRoutes = require('../routes/rbac-advanced.routes');
const licensesRoutes = require('../routes/licenses');
const caseManagementRoutes = require('../routes/caseManagement');
const internalAuditRoutes = require('../routes/internalAudit');
const qualityRoutes = require('../routes/quality');
const equipmentRoutes = require('../routes/equipment');
const predictionsRoutes = require('../routes/predictions.routes');
const projectsRoutes = require('../routes/projects.routes');
const branchesRoutes = require('../routes/branches.routes');
const beneficiaryPortalRoutes = require('../routes/beneficiaryPortal');
const beneficiariesAdminRoutes = require('../routes/beneficiaries');
const communityIntegrationRoutes = require('../routes/communityIntegration.routes');
const { studentRoutes: studentMgmtRoutes } = require('../students');

// Wave 2: Fixed Route Files (16 additional CRUD routes)
const civilDefenseRoutes = require('../routes/civilDefense.routes');
const smartAttendanceRoutes = require('../routes/smart_attendance.routes');
const compensationBenefitsRoutes = require('../routes/compensation-benefits.routes');
const attendanceRoutes = require('../routes/attendance.routes');
const gratuityRoutes = require('../routes/gratuity.routes');
const { router: inventoryUnifiedRoutes } = require('../routes/inventory.routes.unified');
const supplyChainRoutes = require('../routes/supplyChain.routes');
const hrUnifiedRoutes = require('../routes/hr.routes.unified');
const trafficAccidentRoutes = require('../routes/trafficAccidents');
const mfaRoutes = require('../routes/mfa');
const ssoRoutes = require('../routes/sso.routes');
const rbacRoutes = require('../routes/rbac.routes');
const rbacAdminRoutes = require('../routes/rbac.admin.routes');
const montessoriRoutes = require('../routes/montessori');
const montessoriAuthRoutes = require('../routes/montessoriAuth');
const measurementsRoutes = require('../routes/measurements.routes');
const assessmentRoutes = require('../routes/assessment.routes');
const successionPlanningRoutes = require('../routes/successionPlanning');
const mobileAppRoutes = require('../routes/mobileApp.routes');
const zktecoRoutes = require('../routes/zkteco.routes');

// HR Attendance Engine (محرك الحضور الموحد)
const hrAttendanceRoutes = require('../routes/hr-attendance.routes');

// Administrative Systems Routes (الأنظمة الإدارية)
const strategicPlanningRoutes = require('../routes/strategicPlanning.routes');
const complaintsRoutes = require('../routes/complaints.routes');
const facilitiesRoutes = require('../routes/facilities.routes');

// Education System Routes (نظام التعليم)
const academicYearRoutes = require('../routes/academicYear.routes');
const subjectsRoutes = require('../routes/subjects.routes');
const teachersRoutes = require('../routes/teachers.routes');
const classroomsRoutes = require('../routes/classrooms.routes');
const curriculumRoutes = require('../routes/curriculum.routes');
const timetableRoutes = require('../routes/timetable.routes');
const examsRoutes = require('../routes/exams.routes');
const gradebookRoutes = require('../routes/gradebook.routes');

// Specialized Assessment Scales & Rehab Program Templates (مقاييس التقييم المتخصصة وبرامج التأهيل)
const specializedScalesRoutes = require('../routes/specializedScales.routes');
const rehabProgramTemplatesRoutes = require('../routes/rehabProgramTemplates.routes');

// Document Advanced Services (خدمات المستندات المتقدمة)
const documentAdvancedRoutes = require('../routes/documentAdvanced.routes');

// Electronic Archive System (نظام الأرشفة الإلكتروني)
const archiveRoutes = require('../archive/archive-routes');

// Form Templates System (نظام النماذج الجاهزة)
const formTemplateRoutes = require('../routes/formTemplates.routes');

// Insurance Management System (نظام إدارة التأمين)
const insuranceRoutes = require('../routes/insurance.routes');

// Media Library System (نظام مكتبة الوسائط)
const mediaRoutes = require('../routes/media.routes');

// HR Insurance Integration (تكامل تأمين الموظفين الصحي)
const hrInsuranceRoutes = require('../routes/hr-insurance.routes');

// Therapy Sessions System (نظام الجلسات العلاجية)
const therapySessionsRoutes = require('../routes/therapy-sessions.routes');

// Therapy Sessions Analytics (تحليلات الجلسات العلاجية المتقدمة)
const therapySessionsAnalyticsRoutes = require('../routes/therapy-sessions-analytics.routes');

// Employee Affairs System (نظام شؤون الموظفين)
const employeeAffairsRoutes = require('../routes/employeeAffairs.routes');
const employeeAffairsExpandedRoutes = require('../routes/employeeAffairs.expanded.routes');
const employeeAffairsPhase2Routes = require('../routes/employeeAffairs.phase2.routes');
const employeeAffairsPhase3Routes = require('../routes/employeeAffairs.phase3.routes');

// HR Smart System — AI, Analytics, Onboarding, Documents (النظام الذكي لشؤون الموظفين)
const hrSmartRoutes = require('../routes/hr/smart.routes');

// WhatsApp Communication System (نظام الوتساب)
const whatsappRoutes = require('../communication/whatsapp-routes');
const whatsappEnhancedRoutes = require('../communication/whatsapp-enhanced-routes');

// Administrative Communications System (نظام الاتصالات الإدارية)
const adminCommRoutes = require('../communication/administrative-communications-routes');
const adminCommEnhancedRoutes = require('../communication/admin-comm-enhanced-routes');
const electronicDirectivesRoutes = require('../communication/electronic-directives-routes');

// Student Portal Extended Services (خدمات بوابة الطالب الموسّعة)
const studentComplaintsRoutes = require('../routes/studentComplaints.routes');
const studentCertificatesRoutes = require('../routes/studentCertificates.routes');
const studentHealthTrackerRoutes = require('../routes/studentHealthTracker.routes');
const studentRewardsStoreRoutes = require('../routes/studentRewardsStore.routes');
const studentEventsRoutes = require('../routes/studentEvents.routes');
const studentElearningRoutes = require('../routes/studentElearning.routes');

// Saudi Government Integrations (التكاملات الحكومية السعودية)
const mudadRoutes = require('../routes/mudad.routes');
const taqatRoutes = require('../routes/taqat.routes');

// Disability Authority & CBAHI (هيئة رعاية ذوي الإعاقة ومعايير سباهي)
const disabilityAuthorityRoutes = require('../routes/disabilityAuthority.routes');

// Treatment Authorization (إذن العلاج والموافقة المسبقة)
const treatmentAuthorizationRoutes = require('../routes/treatmentAuthorization.routes');

// Family Satisfaction Surveys (استبيانات رضا الأسر)
const familySatisfactionRoutes = require('../routes/familySatisfaction.routes');

// Noor Integration (نظام نور — وزارة التعليم)
const noorRoutes = require('../routes/noor.routes');

// Gap-Fix Routes (خطط الرعاية, إعدادات النظام, الضريبة, العمليات المالية)
const carePlanRoutes = require('../routes/carePlan.routes');
const systemSettingsRoutes = require('../routes/systemSettings.routes');
const saudiTaxRoutes = require('../routes/saudiTax.routes');
const financeOperationsRoutes = require('../routes/financeOperations.routes');

// Branch Management System — نظام إدارة الفروع مع RBAC متقدم (12 فرع + HQ)
const branchManagementRoutes = require('../routes/branch.routes');

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
 */
const safeMount = (app, paths, modulePath) => {
  const pathLabel = Array.isArray(paths) ? paths[0] : paths;
  try {
    const handler = require(modulePath);
    if (Array.isArray(paths)) {
      paths.forEach(p => app.use(p, handler));
    } else {
      app.use(paths, handler);
    }
    routeHealth.mounted.push({ path: pathLabel, module: modulePath });
    return true;
  } catch (err) {
    routeHealth.failed.push({ path: pathLabel, module: modulePath, error: safeError(err) });
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
  dualMount(app, 'crm', crmRoutes);
  dualMount(app, 'payroll', require('../routes/payroll.routes'));
  dualMount(app, 'notifications', notificationsRoutes);
  dualMount(app, 'messages', messagingRoutes);
  dualMount(app, 'threads', require('../routes/threads.routes'));
  dualMount(app, 'conversations', require('../routes/conversations.routes'));
  dualMount(app, 'finance', financeRoutes);
  dualMount(app, 'finance/advanced', financeAdvancedRoutes);
  dualMount(app, 'finance/extended', financeExtendedRoutes);
  dualMount(app, 'finance/pro', financeProRoutes);
  dualMount(app, 'finance/enterprise', financeEnterpriseRoutes);
  dualMount(app, 'finance/ultimate', financeUltimateRoutes);
  dualMount(app, 'finance/elite', financeEliteRoutes);
  dualMount(app, 'reports', reportingRoutes);
  dualMount(app, 'integrations', integrationRoutes);

  // ── Dashboard (multiple sub-routers merged) ─────────────────────────────
  dualMount(app, 'dashboard', dashboardRoutes);
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
  dualMount(app, 'documents', documentsRoutes);
  dualMount(app, 'analytics', analyticsExtraRouter);

  // ── Real Mongoose CRUD Routes (dual-mounted /api + /api/v1) ─────────────
  dualMount(app, 'admin', adminRouter);
  dualMount(app, 'account', accountRouter);
  dualMount(app, 'payments', paymentsRouter);
  dualMount(app, 'monitoring', monitoringRouter);
  dualMount(app, 'ai-predictions', aiPredictionsRouter);
  dualMount(app, 'hr-system', hrSystemRouter);
  dualMount(app, 'integrated-care', integratedCareRouter);
  dualMount(app, 'security', securityRouter);
  dualMount(app, 'organization', organizationRouter);
  dualMount(app, 'communications', communicationsRouter);
  dualMount(app, 'ai-communications', aiCommRouter);
  dualMount(app, 'export-import', exportImportRouter);
  dualMount(app, 'exports', exportsRouter);
  dualMount(app, 'student-reports', studentReportsRouter);
  dualMount(app, 'rehabilitation-programs', rehabProgramsRouter);
  dualMount(app, 'documents-smart', documentsSmartRouter);

  // ── Document Advanced Services (خدمات المستندات المتقدمة) ───────────────
  dualMount(app, 'documents-advanced', documentAdvancedRoutes);
  logger.info('Document Advanced routes mounted (10 services, 60+ endpoints)');

  dualMount(app, 'students', studentsRouter);
  dualMount(app, 'compensation', compensationRouter);
  dualMount(app, 'disability', disabilityRouter);
  dualMount(app, 'pm', pmRouter);
  dualMount(app, 'parents', parentsRouter);
  dualMount(app, 'guardian', guardianPortalRouter);

  // ── Disability Card & Classification (بطاقة ذوي الإعاقة والتصنيف) ───────
  dualMount(app, 'disability-cards', disabilityCardRoutes);
  logger.info(
    'Disability Card & Classification routes mounted (35+ endpoints — MOHR, Absher, Social Security, exemptions, auto-renewal)'
  );

  // ── Dual-mounted CRUD routes ────────────────────────────────────────────
  dualMount(app, 'qiwa', qiwaRoutes);
  dualMount(app, 'gosi', gosiRoutes);
  dualMount(app, 'government', govIntegrationRoutes);
  dualMount(app, 'ecommerce', ecommerceRoutes);
  dualMount(app, 'purchasing', purchasingRoutes);
  dualMount(app, 'hr-advanced', hrAdvancedRoutes);
  dualMount(app, 'communication', communicationRoutes);
  dualMount(app, 'drivers', driversRoutes);
  dualMount(app, 'vehicles', vehiclesRoutes);
  dualMount(app, 'trips', tripsRoutes);
  dualMount(app, 'gps', gpsRoutes);
  dualMount(app, 'transport-routes', transportRoutesRouter);

  // ── Fleet & Transport Extended Modules (وحدات الأسطول والنقل الموسّعة) ──
  dualMount(app, 'geofences', geofenceRoutes);
  dualMount(app, 'dispatch', dispatchRoutes);
  dualMount(app, 'fleet-costs', fleetCostsRoutes);
  dualMount(app, 'fleet-tires', fleetTiresRoutes);
  dualMount(app, 'fleet-safety', fleetSafetyRoutes);
  dualMount(app, 'fleet-fuel-cards', fleetFuelCardsRoutes);
  dualMount(app, 'fleet-inspections', fleetInspectionsRoutes);
  dualMount(app, 'driver-training', driverTrainingRoutes);
  dualMount(app, 'vehicle-insurance', vehicleInsuranceRoutes);
  dualMount(app, 'fleet-kpi', fleetKPIRoutes);
  dualMount(app, 'driver-shifts', driverShiftsRoutes);
  dualMount(app, 'fleet-compliance', fleetComplianceRoutes);
  dualMount(app, 'traffic-fines', trafficFinesRoutes);
  dualMount(app, 'fleet-documents', fleetDocumentRoutes);
  dualMount(app, 'fleet-parts', fleetPartRoutes);
  dualMount(app, 'cargo', cargoRoutes);
  dualMount(app, 'fleet-reservations', fleetReservationRoutes);
  dualMount(app, 'vehicle-assignments', vehicleAssignmentRoutes);
  dualMount(app, 'fleet-parking', fleetParkingRoutes);
  dualMount(app, 'fleet-alerts', fleetAlertRoutes);
  dualMount(app, 'driver-leaves', driverLeaveRoutes);
  dualMount(app, 'fleet-fuel', fleetFuelRoutes);
  dualMount(app, 'fleet-tolls', fleetTollRoutes);
  dualMount(app, 'fleet-accidents', fleetAccidentRoutes);
  dualMount(app, 'fleet-warranties', fleetWarrantyRoutes);
  dualMount(app, 'fleet-route-plans', fleetRoutePlanRoutes);
  dualMount(app, 'fleet-communications', fleetCommunicationRoutes);
  dualMount(app, 'fleet-penalties', fleetPenaltyRoutes);
  dualMount(app, 'fleet-disposals', fleetDisposalRoutes);
  logger.info('Fleet & Transport extended modules mounted (29 modules, 400+ endpoints)');

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
  dualMount(app, 'student-management', studentMgmtRoutes);
  logger.info(
    'Community Integration module mounted (activities, partnerships, participation, assessments, awareness — 30+ endpoints)'
  );

  // ── Wave 2: Fixed CRUD Routes (16 additional) ──────────────────────────
  dualMount(app, 'civil-defense', civilDefenseRoutes);
  dualMount(app, 'smart-attendance', smartAttendanceRoutes);
  dualMount(app, 'compensation-benefits', compensationBenefitsRoutes);
  dualMount(app, 'attendance', attendanceRoutes);
  dualMount(app, 'gratuity', gratuityRoutes);
  dualMount(app, 'inventory', inventoryUnifiedRoutes);
  dualMount(app, 'supply-chain', supplyChainRoutes);
  dualMount(app, 'hr-unified', hrUnifiedRoutes);
  dualMount(app, 'traffic-accidents', trafficAccidentRoutes);
  dualMount(app, 'mfa', mfaRoutes);
  dualMount(app, 'sso', ssoRoutes);
  dualMount(app, 'rbac', rbacRoutes);
  dualMount(app, 'rbac-admin', rbacAdminRoutes);
  dualMount(app, 'montessori', montessoriRoutes);
  dualMount(app, 'montessori/auth', montessoriAuthRoutes);
  dualMount(app, 'measurements', measurementsRoutes);
  dualMount(app, 'assessments', assessmentRoutes);
  logger.info(
    'Assessment CRUD+Workflow routes mounted (10 endpoints — create/read/update/delete, approve/reject/archive, statistics, search, pending)'
  );
  dualMount(app, 'succession-planning', successionPlanningRoutes);
  dualMount(app, 'mobile', mobileAppRoutes);
  dualMount(app, 'zkteco', zktecoRoutes);

  // ── HR Attendance Engine (محرك الحضور والورديات الموحد) ──────────────────
  dualMount(app, 'hr-attendance', hrAttendanceRoutes);
  logger.info(
    'HR Attendance Engine routes mounted (shifts, check-in/out, dashboard, reports — 20+ endpoints)'
  );

  // ── Education System Routes (نظام التعليم) ─────────────────────────────
  dualMount(app, 'academic-years', academicYearRoutes);
  dualMount(app, 'subjects', subjectsRoutes);
  dualMount(app, 'teachers', teachersRoutes);
  dualMount(app, 'classrooms', classroomsRoutes);
  dualMount(app, 'curriculum', curriculumRoutes);
  dualMount(app, 'timetable', timetableRoutes);
  dualMount(app, 'exams', examsRoutes);
  dualMount(app, 'gradebook', gradebookRoutes);
  logger.info('Education system routes mounted (8 modules)');

  // ── Specialized Assessment Scales & Rehab Programs (مقاييس التقييم وبرامج التأهيل) ──
  dualMount(app, 'specialized-scales', specializedScalesRoutes);
  dualMount(app, 'rehab-program-templates', rehabProgramTemplatesRoutes);
  logger.info('Specialized scales & rehab program template routes mounted (2 modules)');

  // ── Electronic Archive System (نظام الأرشفة الإلكتروني) ──
  dualMount(app, 'archive', archiveRoutes);
  logger.info('Archive routes mounted');

  // ── Form Templates System (نظام النماذج الجاهزة) ──
  dualMount(app, 'form-templates', formTemplateRoutes);
  logger.info('Form template routes mounted');

  // ── Insurance Management System (نظام إدارة التأمين) ──
  dualMount(app, 'insurance', insuranceRoutes);
  logger.info('Insurance management routes mounted');

  // ── Media Library System (نظام مكتبة الوسائط) ──
  dualMount(app, 'media', mediaRoutes);
  logger.info('Media library routes mounted');

  // ── HR Insurance Integration (تكامل تأمين الموظفين الصحي) ──
  dualMount(app, 'hr-insurance', hrInsuranceRoutes);
  logger.info('HR Insurance integration routes mounted');

  // ── Therapy Sessions System (نظام الجلسات العلاجية) ──
  dualMount(app, 'therapy-sessions', therapySessionsRoutes);
  logger.info('Therapy sessions routes mounted');

  // ── Therapy Sessions Analytics (تحليلات الجلسات العلاجية المتقدمة) ──
  dualMount(app, 'therapy-sessions-analytics', therapySessionsAnalyticsRoutes);
  logger.info('Therapy sessions analytics routes mounted (13+ endpoints)');

  // ── Employee Affairs System (نظام شؤون الموظفين) ──
  dualMount(app, 'employee-affairs', employeeAffairsRoutes);
  logger.info('Employee Affairs routes mounted (30+ endpoints)');

  // ── Employee Affairs Expanded (شؤون الموظفين — موسّع) ──
  dualMount(app, 'employee-affairs-expanded', employeeAffairsExpandedRoutes);
  logger.info('Employee Affairs Expanded routes mounted (60+ endpoints)');

  // ── Employee Affairs Phase 2 (شؤون الموظفين — المرحلة الثانية) ──
  dualMount(app, 'employee-affairs-phase2', employeeAffairsPhase2Routes);
  logger.info('Employee Affairs Phase 2 routes mounted (80+ endpoints)');

  // ── Employee Affairs Phase 3 (شؤون الموظفين — المرحلة الثالثة) ──
  dualMount(app, 'employee-affairs-phase3', employeeAffairsPhase3Routes);
  logger.info('Employee Affairs Phase 3 routes mounted (50+ endpoints)');

  // ── HR Smart System — AI, Analytics, Onboarding, Documents ──
  dualMount(app, 'hr-smart', hrSmartRoutes);
  logger.info(
    'HR Smart routes mounted: AI predictions, analytics, onboarding, documents (35+ endpoints)'
  );

  // ── WhatsApp Communication System (نظام الوتساب) ──
  dualMount(app, 'whatsapp', whatsappRoutes);
  logger.info('WhatsApp routes mounted (24+ endpoints)');

  // ── WhatsApp Enhanced Features (ميزات الوتساب المتقدمة) ──
  dualMount(app, 'whatsapp-enhanced', whatsappEnhancedRoutes);
  logger.info('WhatsApp Enhanced routes mounted (87+ endpoints)');

  // ── Administrative Communications System (نظام الاتصالات الإدارية) ──
  dualMount(app, 'admin-communications', adminCommRoutes);
  dualMount(app, 'admin-comm-enhanced', adminCommEnhancedRoutes);
  dualMount(app, 'electronic-directives', electronicDirectivesRoutes);
  logger.info(
    'Administrative Communications & Electronic Directives routes mounted (42+ enhanced endpoints)'
  );
  logger.info(
    'Admin Comm Enhanced routes: signatures, notes, reminders, tasks, delivery, referrals, comments, stamps, favorites, QR, labels, forward/reply, dashboard'
  );

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
  dualMount(app, 'notification-templates', require('../routes/notificationTemplates.routes'));
  dualMount(app, 'approval-requests', require('../routes/approvalRequests.routes'));
  dualMount(app, 'templates', require('../routes/templates.routes'));
  dualMount(app, 'groups', require('../routes/groups.routes'));
  logger.info('New frontend-backend integration routes mounted (8 new + 4 dual-mounted)');

  // ── Phase 2 Routes ──────────────────────────────────────────────────────
  // disability-rehabilitation.js → /api/v1 only (different module from .routes.js)
  app.use('/api/v1/disability-rehabilitation', disabilityRehabilitationRoutes);
  // maintenance, assets, schedules — already dual-mounted above
  dualMount(app, 'webhooks', webhooksRoutes);
  dualMount(app, 'basic-analytics', analyticsRoutes);
  dualMount(app, 'basic-reports', reportRoutes);
  dualMount(app, 'therapist', require('../routes/therapist'));
  dualMount(app, 'therapist-extended', require('../routes/therapistExtended.routes'));
  dualMount(app, 'therapist-pro', require('../routes/therapistPro.routes'));
  dualMount(app, 'therapist-ultra', require('../routes/therapistUltra.routes'));
  dualMount(app, 'therapist-elite', require('../routes/therapistElite.routes'));

  // Phase 4: Health Monitoring
  safeMount(app, ['/api/health', '/api/v1/health'], '../routes/health.routes');

  // Phase 21-28
  safeMount(app, ['/api/phases-21-28', '/api/v1/phases-21-28'], '../routes/phases-21-28.routes');

  // Disability Rehabilitation (/api/ only; /api/v1/ already mounted above via disabilityRehabilitationRoutes)
  // NOTE: /api/rehabilitation alias removed — frontend uses /api/rehab-plans (rehabilitationPlan.routes)
  //       and /api/disability-rehabilitation for the older disability-rehabilitation module.
  safeMount(app, '/api/disability-rehabilitation', '../routes/disability-rehabilitation.routes');

  // Rehabilitation Services (Phase 5–9: 61 specialized therapy & support services)
  safeMount(app, '/api/disability-rehab', '../rehabilitation-services/rehabilitation-routes');
  safeMount(app, '/api/v1/disability-rehab', '../rehabilitation-services/rehabilitation-routes');

  // Phase 17 (namespaced to avoid collisions with analytics/integrations)
  if (process.env.SKIP_PHASE17 === 'true') {
    logger.warn('Phase 17 routes skipped (SKIP_PHASE17=true)');
  } else {
    safeMount(app, ['/api/phase17', '/api/v1/phase17'], '../routes/phase17-advanced.routes');
  }

  // Phases 18-20 (namespaced to avoid collisions with tenants/compliance)
  safeMount(app, ['/api/phases-18-20', '/api/v1/phases-18-20'], '../routes/phases-18-20.routes');

  // ── Phase 21: New Feature Services (individual safeMount for resilience) ──
  safeMount(app, ['/api/contracts', '/api/v1/contracts'], '../routes/contracts.routes');
  safeMount(
    app,
    ['/api/smart-notifications', '/api/v1/smart-notifications'],
    '../routes/smartNotificationCenter.routes'
  );
  safeMount(
    app,
    ['/api/advanced-tickets', '/api/v1/advanced-tickets'],
    '../routes/advancedTickets.routes'
  );
  safeMount(app, ['/api/e-invoicing', '/api/v1/e-invoicing'], '../routes/eInvoicing.routes');
  safeMount(app, ['/api/e-signature', '/api/v1/e-signature'], '../routes/eSignature.routes');
  safeMount(
    app,
    ['/api/e-signature-pdf', '/api/v1/e-signature-pdf'],
    '../routes/eSignaturePdf.routes'
  );
  safeMount(app, ['/api/e-stamp', '/api/v1/e-stamp'], '../routes/eStamp.routes');
  safeMount(
    app,
    ['/api/risk-assessment', '/api/v1/risk-assessment'],
    '../routes/riskAssessment.routes'
  );
  safeMount(
    app,
    ['/api/budget-management', '/api/v1/budget-management'],
    '../routes/budgetManagement.routes'
  );
  safeMount(
    app,
    ['/api/employee-portal', '/api/v1/employee-portal'],
    '../routes/employeePortal.routes'
  );
  safeMount(app, ['/api/kpi-dashboard', '/api/v1/kpi-dashboard'], '../routes/kpiDashboard.routes');
  safeMount(
    app,
    ['/api/administration', '/api/v1/administration'],
    '../routes/administration.routes'
  );
  safeMount(app, ['/api/workflow', '/api/v1/workflow'], '../routes/workflow.routes');
  safeMount(
    app,
    ['/api/workflow-enhanced', '/api/v1/workflow-enhanced'],
    '../routes/workflowEnhanced.routes'
  );
  safeMount(app, ['/api/workflow-pro', '/api/v1/workflow-pro'], '../routes/workflowPro.routes');
  safeMount(
    app,
    ['/api/enterprise-pro', '/api/v1/enterprise-pro'],
    '../routes/enterprisePro.routes'
  );
  safeMount(
    app,
    ['/api/enterprise-pro-plus', '/api/v1/enterprise-pro-plus'],
    '../routes/enterpriseProPlus.routes'
  );
  safeMount(
    app,
    ['/api/enterprise-ultra', '/api/v1/enterprise-ultra'],
    '../routes/enterpriseUltra.routes'
  );
  logger.info('Phase 21 new feature routes mounted (18 services via individual safeMount)');

  // ── Student Portal Extended Services (خدمات بوابة الطالب الموسّعة) ──────
  dualMount(app, 'student-complaints', studentComplaintsRoutes);
  dualMount(app, 'student-certificates', studentCertificatesRoutes);
  dualMount(app, 'student-health', studentHealthTrackerRoutes);
  dualMount(app, 'student-rewards', studentRewardsStoreRoutes);
  dualMount(app, 'student-events', studentEventsRoutes);
  dualMount(app, 'student-elearning', studentElearningRoutes);
  logger.info('Student portal extended services mounted (6 modules)');

  // ── Rehab Center Licenses System (نظام تراخيص مراكز ذوي الإعاقة) ──
  const rehabCenterLicensesRoutes = require('../routes/rehabCenterLicenses.routes');
  dualMount(app, 'rehab-licenses', rehabCenterLicensesRoutes);
  logger.info('Rehab Center Licenses routes mounted (60+ endpoints)');

  // ── Rehabilitation Expansion (توسعة خدمات تأهيل ذوي الإعاقة — 10 أنظمة جديدة) ──
  const rehabExpansionRoutes = require('../routes/rehab-expansion.routes');
  dualMount(app, 'rehab-expansion', rehabExpansionRoutes);
  logger.info(
    'Rehab Expansion routes mounted (120+ endpoints — 10 new systems: assistive devices, vocational rehab, disability rights, integrative healthcare, community integration, caregiver support, accessibility audit, early detection, outcome measurement, adaptive housing)'
  );

  // ── Rehabilitation Professional Systems (الأنظمة الاحترافية لتأهيل ذوي الإعاقة — 12 نظام جديد) ──
  const rehabProRoutes = require('../routes/rehab-pro.routes');
  dualMount(app, 'rehab-pro', rehabProRoutes);
  logger.info(
    'Rehab Pro routes mounted (150+ endpoints — 12 new systems: cardiac-pulmonary rehab, stroke rehab, spinal cord rehab, post-surgical rehab, geriatric rehab, advanced mental health, genetic counseling, therapy gamification, medical device IoT, inter-center collaboration, post-discharge tracking, AR therapy)'
  );

  // ── Import/Export Professional System (نظام الاستيراد والتصدير الاحترافي) ──
  const importExportProRoutes = require('../routes/importExportPro.routes');
  dualMount(app, 'import-export-pro', importExportProRoutes);
  logger.info(
    'Import/Export Pro routes mounted (25+ endpoints — Export: xlsx/csv/json/pdf/xml/zip, Import: parse/validate/execute, Templates, Jobs, Statistics, Modules)'
  );

  // ── Early Intervention System (نظام التدخل المبكر — أطفال 0–3 سنوات) ──
  const earlyInterventionRoutes = require('../routes/early-intervention.routes');
  dualMount(app, 'early-intervention', earlyInterventionRoutes);
  logger.info(
    'Early Intervention routes mounted (30+ endpoints — 5 modules: children 0-3, developmental screenings, milestones, IFSP plans, hospital referrals & national screening integration)'
  );

  // ── ICF Functional Assessment System (نظام التقييم الوظيفي وفق ICF) ──
  const icfAssessmentRoutes = require('../routes/icfAssessment.routes');
  dualMount(app, 'icf-assessments', icfAssessmentRoutes);
  logger.info(
    'ICF Assessment routes mounted (20+ endpoints — WHO ICF-based functional assessment: body functions, body structures, activities & participation, environmental factors, benchmarking, comparative reports, gap analysis)'
  );

  // ── Post-Rehabilitation Follow-Up System (نظام المتابعة ما بعد التأهيل) ──
  const postRehabFollowUpRoutes = require('../routes/post-rehab-followup.routes');
  dualMount(app, 'post-rehab-followup', postRehabFollowUpRoutes);
  logger.info(
    'Post-Rehab Follow-Up routes mounted (25+ endpoints — 5 modules: cases management, periodic follow-up visits home/remote, long-term impact measurement 6mo/1yr/2yr, satisfaction & outcome surveys, automatic re-enrollment)'
  );

  // ── Independent Living Transition System (نظام الانتقال للحياة المستقلة) ──
  const independentLivingRoutes = require('../routes/independentLiving.routes');
  dualMount(app, 'independent-living', independentLivingRoutes);
  logger.info(
    'Independent Living Transition routes mounted (30+ endpoints — 4 modules: ADL assessments, individual training plans (cooking/cleaning/shopping/transportation), independence progress tracking, supported/rehabilitative housing programs)'
  );

  // ── Mental Health & Psychosocial Support System (نظام الدعم النفسي والصحة النفسية) ──
  const mhpssRoutes = require('../routes/mhpss.routes');
  dualMount(app, 'mhpss', mhpssRoutes);
  logger.info(
    'MHPSS routes mounted (35+ endpoints — 5 modules: counseling sessions, mental health programs, psychological assessments, crisis interventions, psychosocial support groups)'
  );

  // ── Research & Evidence-Based Practice (نظام البحث العلمي وقياس الأثر) ──
  const researchRoutes = require('../routes/research.routes');
  dualMount(app, 'research', researchRoutes);
  logger.info(
    'Research & Evidence-Based Practice routes mounted (35+ endpoints — 7 modules: research studies, internationally-recognized outcome measures FIM/WHODAS/Barthel/COPM/GAS/PHQ-9/EQ-5D, anonymized datasets with k-anonymity/differential-privacy, evidence-based program effectiveness reports, benchmarking with other centers, data export to REDCap/SPSS/Stata/R/FHIR, dashboard & statistics)'
  );

  // ── Multidisciplinary Team Coordination System (نظام التنسيق متعدد التخصصات) ──
  const mdtCoordinationRoutes = require('../routes/mdt-coordination.routes');
  dualMount(app, 'mdt-coordination', mdtCoordinationRoutes);
  logger.info(
    'MDT Coordination routes mounted (65+ endpoints — 5 modules: MDT meetings with agenda/cases/attendance, unified rehabilitation plans with multi-therapist goals & reviews, internal referral tickets between departments, shared beneficiary/team/department dashboards, meeting minutes & decisions tracker with action items)'
  );

  // ── Saudi Government Integrations (التكاملات الحكومية السعودية) ──
  dualMount(app, 'mudad', mudadRoutes);
  dualMount(app, 'taqat', taqatRoutes);
  logger.info('Saudi government integrations mounted (Mudad wage protection + Taqat employment)');

  // ── Disability Authority & CBAHI (هيئة رعاية ذوي الإعاقة ومعايير سباهي) ──
  dualMount(app, 'disability-authority', disabilityAuthorityRoutes);
  logger.info(
    'Disability Authority & CBAHI routes mounted (reports, standards, compliance assessments)'
  );

  // ── Treatment Authorization (إذن العلاج والموافقة المسبقة) ──
  dualMount(app, 'treatment-authorization', treatmentAuthorizationRoutes);
  logger.info(
    'Treatment Authorization routes mounted (insurance pre-auth, appeals, session tracking)'
  );

  // ── Family Satisfaction Surveys (استبيانات رضا الأسر) ──
  dualMount(app, 'family-satisfaction', familySatisfactionRoutes);
  logger.info('Family Satisfaction Survey routes mounted (templates, responses, NPS, analytics)');

  // ── Noor Integration (نظام نور — وزارة التعليم) ──
  dualMount(app, 'noor', noorRoutes);
  logger.info('Noor routes mounted (students, IEPs, progress-reports, sync, dashboard)');

  // ── Administrative Systems (الأنظمة الإدارية) ─────────────────────────
  dualMount(app, 'strategic-planning', strategicPlanningRoutes);
  dualMount(app, 'complaints', complaintsRoutes);
  dualMount(app, 'facilities', facilitiesRoutes);
  safeMount(app, ['/api/meetings', '/api/v1/meetings'], '../routes/meetings.routes');
  safeMount(app, ['/api/visitors', '/api/v1/visitors'], '../routes/visitors.routes');
  safeMount(
    app,
    ['/api/knowledge-center', '/api/v1/knowledge-center'],
    '../routes/knowledgeCenter.routes'
  );
  logger.info(
    'Administrative systems routes mounted (strategic planning, complaints, facilities, meetings, visitors, knowledge center)'
  );

  // Phase 29-33
  safeMount(app, ['/api/phases-29-33', '/api/v1/phases-29-33'], '../routes/phases-29-33.routes');

  // ── New Systems — Phase 4 (الأنظمة المضافة — المرحلة الرابعة) ─────────
  safeMount(app, ['/api/kitchen', '/api/v1/kitchen'], '../routes/kitchen.routes');
  safeMount(app, ['/api/laundry', '/api/v1/laundry'], '../routes/laundry.routes');
  safeMount(app, ['/api/volunteers', '/api/v1/volunteers'], '../routes/volunteer.routes');
  safeMount(app, ['/api/waitlist', '/api/v1/waitlist'], '../routes/waitlist.routes');
  safeMount(app, ['/api/compliance', '/api/v1/compliance'], '../routes/compliance.routes');
  safeMount(app, ['/api/bi', '/api/v1/bi'], '../routes/bi.routes');
  logger.info(
    'Phase 4 new systems mounted (6 modules: kitchen/meals, laundry, volunteers, waitlist, compliance, business intelligence)'
  );

  // ── New Systems — Phase 6 (الأنظمة المضافة — المرحلة السادسة) ─────────
  safeMount(app, ['/api/crisis', '/api/v1/crisis'], '../routes/crisis.routes');
  safeMount(app, ['/api/recruitment', '/api/v1/recruitment'], '../routes/recruitment.routes');
  safeMount(app, ['/api/iot', '/api/v1/iot'], '../routes/iot.routes');
  safeMount(app, ['/api/blockchain', '/api/v1/blockchain'], '../routes/blockchain.routes');
  safeMount(app, ['/api/ar-rehab', '/api/v1/ar-rehab'], '../routes/ar-rehab.routes');
  logger.info(
    'Phase 6 new systems mounted (5 modules: crisis/emergency, recruitment, IoT, blockchain certificates, AR/XR rehabilitation)'
  );

  // ── BI Dashboard — نظام التقارير والتحليلات ──────────────────────────────
  safeMount(app, ['/api/bi-dashboard', '/api/v1/bi-dashboard'], '../routes/bi-dashboard.routes');
  logger.info('BI Dashboard system mounted (analytics, KPIs, trend explorer, report builder)');

  // ── New Systems — الأنظمة الجديدة ──────────────────────────────────────
  safeMount(app, ['/api/warehouse', '/api/v1/warehouse'], '../routes/warehouse.routes');
  safeMount(app, ['/api/legal-affairs', '/api/v1/legal-affairs'], '../routes/legal-affairs.routes');
  safeMount(app, ['/api/training', '/api/v1/training'], '../routes/training.routes');
  safeMount(
    app,
    ['/api/events-management', '/api/v1/events-management'],
    '../routes/events-management.routes'
  );
  safeMount(
    app,
    ['/api/public-relations', '/api/v1/public-relations'],
    '../routes/public-relations.routes'
  );
  safeMount(
    app,
    ['/api/enterprise-risk', '/api/v1/enterprise-risk'],
    '../routes/enterprise-risk.routes'
  );
  logger.info(
    'New systems mounted (6 modules: warehouse, legal-affairs, training, events, public-relations, enterprise-risk)'
  );

  // ── Phase 9: Help Desk + HSE ─────────────────────────────────────────
  safeMount(app, ['/api/helpdesk', '/api/v1/helpdesk'], '../routes/helpdesk.routes');
  safeMount(app, ['/api/hse', '/api/v1/hse'], '../routes/hse.routes');
  logger.info('New systems mounted (2 modules: helpdesk, hse)');

  // ── Donations & Sponsors — التبرعات والرعاية ────────────────────────
  safeMount(app, ['/api/campaigns', '/api/v1/campaigns'], '../routes/campaigns.real.routes');
  safeMount(app, ['/api/donors', '/api/v1/donors'], '../routes/donors.real.routes');
  safeMount(app, ['/api/donations', '/api/v1/donations'], '../routes/donations.real.routes');
  logger.info('Donations system mounted (3 modules: campaigns, donors, donations)');

  // ── Vendor Management — إدارة الموردين ──────────────────────────────
  safeMount(app, ['/api/vendors', '/api/v1/vendors'], '../routes/vendors.real.routes');
  safeMount(
    app,
    ['/api/vendor-evaluations', '/api/v1/vendor-evaluations'],
    '../routes/vendor-evaluations.real.routes'
  );
  logger.info('Vendor management mounted (2 modules: vendors, vendor-evaluations)');

  // ── Phase 10: Unmounted Route Files — ملفات مسارات غير مُثبّتة ─────
  // High priority — auth & executive
  safeMount(app, ['/api/otp-auth', '/api/v1/otp-auth'], '../routes/otp-auth.routes');
  safeMount(
    app,
    ['/api/executive-dashboard', '/api/v1/executive-dashboard'],
    '../routes/executive-dashboard'
  );
  safeMount(
    app,
    ['/api/executive-dashboard-enhanced', '/api/v1/executive-dashboard-enhanced'],
    '../routes/executive-dashboard-enhanced'
  );
  safeMount(app, ['/api/incidents', '/api/v1/incidents'], '../routes/incidentRoutes');
  safeMount(app, ['/api/policies', '/api/v1/policies'], '../routes/policyRoutes');
  safeMount(app, ['/api/fcm', '/api/v1/fcm'], '../routes/fcm');
  safeMount(
    app,
    ['/api/cache-management', '/api/v1/cache-management'],
    '../routes/cache-management.routes'
  );
  safeMount(app, ['/api/tenants', '/api/v1/tenants'], '../routes/tenant.routes');
  logger.info(
    'Phase 10-A mounted (8 modules: otp-auth, executive-dashboard ×2, incidents, policies, fcm, cache-management, tenants)'
  );

  // Medium priority — analytics & AI
  safeMount(
    app,
    ['/api/advanced-analytics', '/api/v1/advanced-analytics'],
    '../routes/advancedAnalytics.routes'
  );
  safeMount(
    app,
    ['/api/ai-recommendations', '/api/v1/ai-recommendations'],
    '../routes/ai.recommendations.routes'
  );
  safeMount(
    app,
    ['/api/ai-notifications', '/api/v1/ai-notifications'],
    '../routes/aiNotifications'
  );
  // safeMount(app, ['/api/ml', '/api/v1/ml'], '../routes/ml.routes'); // Skipped: requires @tensorflow/tfjs (~400MB)
  safeMount(app, ['/api/smart-gps', '/api/v1/smart-gps'], '../routes/smartGpsTracking.routes');
  safeMount(
    app,
    ['/api/smart-notifications-engine', '/api/v1/smart-notifications-engine'],
    '../routes/smartNotifications.routes'
  );
  logger.info(
    'Phase 10-B mounted (6 modules: advanced-analytics, ai-recommendations, ai-notifications, ml, smart-gps, smart-notifications-engine)'
  );

  // Sessions, profiles, collaboration
  safeMount(
    app,
    ['/api/advanced-sessions', '/api/v1/advanced-sessions'],
    '../routes/advancedSessions'
  );
  safeMount(
    app,
    ['/api/employee-profiles', '/api/v1/employee-profiles'],
    '../routes/employeeProfile'
  );
  safeMount(
    app,
    ['/api/collaboration', '/api/v1/collaboration'],
    '../routes/realtimeCollaboration.routes'
  );
  safeMount(
    app,
    ['/api/community-awareness', '/api/v1/community-awareness'],
    '../routes/communityAwarenessRoutes'
  );
  logger.info(
    'Phase 10-C mounted (4 modules: advanced-sessions, employee-profiles, collaboration, community-awareness)'
  );

  // Dashboard, integrations, utilities
  safeMount(
    app,
    ['/api/dashboard-unified', '/api/v1/dashboard-unified'],
    '../routes/dashboard.routes.unified'
  );
  safeMount(
    app,
    ['/api/dashboard/widgets', '/api/v1/dashboard/widgets'],
    '../routes/dashboardWidget.routes'
  );
  safeMount(
    app,
    ['/api/integrations-hub', '/api/v1/integrations-hub'],
    '../routes/integrations.routes'
  );
  safeMount(
    app,
    ['/api/branch-integration', '/api/v1/branch-integration'],
    '../routes/branch-integration.routes'
  );
  logger.info(
    'Phase 10-D mounted (4 modules: dashboard-unified, dashboard-widgets, integrations-hub, branch-integration)'
  );

  // Admin utilities & government
  safeMount(app, ['/api/database', '/api/v1/database'], '../routes/database.routes');
  safeMount(
    app,
    ['/api/date-converter', '/api/v1/date-converter'],
    '../routes/dateConverterRoutes'
  );
  safeMount(app, ['/api/moi-passport', '/api/v1/moi-passport'], '../routes/moi-passport.routes');
  safeMount(app, ['/api/performance', '/api/v1/performance'], '../routes/performance');
  safeMount(
    app,
    ['/api/system-optimization', '/api/v1/system-optimization'],
    '../routes/system-optimization.routes'
  );
  safeMount(
    app,
    ['/api/traffic-accidents/analytics', '/api/v1/traffic-accidents/analytics'],
    '../routes/trafficAccidentAnalytics'
  );
  logger.info(
    'Phase 10-E mounted (6 modules: database, date-converter, moi-passport, performance, system-optimization, traffic-accident-analytics)'
  );

  logger.info('✅ Phase 10 complete — 28 previously unmounted route files now active');

  // ── Phase 11: Orphan Model Routes — مسارات CRUD للنماذج اليتيمة ───
  safeMount(app, ['/api/gamification', '/api/v1/gamification'], '../routes/gamification.routes');
  safeMount(app, ['/api/subscriptions', '/api/v1/subscriptions'], '../routes/subscription.routes');
  safeMount(app, ['/api/api-keys', '/api/v1/api-keys'], '../routes/apiKey.routes');
  safeMount(app, ['/api/smart-irp', '/api/v1/smart-irp'], '../routes/smartIRP.routes');
  logger.info('Phase 11 mounted (4 modules: gamification, subscriptions, api-keys, smart-irp)');

  // ── Phase 12: Telehealth — الطب عن بُعد ───
  safeMount(app, ['/api/telehealth', '/api/v1/telehealth'], '../routes/telehealth.routes');
  logger.info('Phase 12 mounted (1 module: telehealth)');

  // ── Phase 13: Bus Tracking — تتبع الحافلات بالوقت الفعلي ───
  safeMount(app, ['/api/bus-tracking', '/api/v1/bus-tracking'], '../routes/busTracking.routes');
  logger.info('Phase 13 mounted (1 module: bus-tracking)');

  // ── Phase 14: Report Builder — باني التقارير المخصصة ───
  safeMount(
    app,
    ['/api/report-builder', '/api/v1/report-builder'],
    '../routes/reportBuilder.routes'
  );
  logger.info('Phase 14 mounted (1 module: report-builder)');

  // ── Phase 15: Library & Resources — المكتبة والموارد ───
  safeMount(app, ['/api/library', '/api/v1/library'], '../routes/library.routes');
  logger.info('Phase 15 mounted (1 module: library)');

  // ── Phase 16: Real-time Chat — الدردشة الفورية ───
  safeMount(app, ['/api/chat', '/api/v1/chat'], '../routes/chat.routes');
  logger.info('Phase 16 mounted (1 module: chat)');

  // ── Phase 17: AI Diagnostic Intelligence — ذكاء اصطناعي للتشخيص ───
  safeMount(app, ['/api/ai-diagnostic', '/api/v1/ai-diagnostic'], '../routes/aiDiagnostic.routes');
  logger.info('Phase 17 mounted (1 module: aiDiagnostic)');

  // ── Phase 18: OCR Document Processing — معالجة مستندات بالتعرف الضوئي ───
  safeMount(app, ['/api/ocr-documents', '/api/v1/ocr-documents'], '../routes/ocrDocument.routes');
  logger.info('Phase 18 mounted (1 module: ocrDocument)');

  // ── Phase 19: CEO Executive Dashboard — لوحة تحكم الإدارة التنفيذية ───
  safeMount(app, ['/api/ceo-dashboard', '/api/v1/ceo-dashboard'], '../routes/ceoDashboard.routes');
  logger.info('Phase 19 mounted (1 module: ceoDashboard)');

  // ── Phase 20: Quality Management (ISO/CBAHI) — إدارة الجودة ───
  safeMount(
    app,
    ['/api/quality-management', '/api/v1/quality-management'],
    '../routes/qualityManagement.routes'
  );
  logger.info('Phase 20 mounted (1 module: qualityManagement)');

  // ── Phase 21: Workforce Analytics & Planning — تحليلات القوى العاملة ───
  safeMount(
    app,
    ['/api/workforce-analytics', '/api/v1/workforce-analytics'],
    '../routes/workforce-analytics.routes'
  );
  logger.info('Phase 21 mounted (1 module: workforce-analytics)');

  // ── Phase 22: Learning & Development (LMS) — التدريب الإلكتروني للموظفين ───
  safeMount(
    app,
    ['/api/learning-development', '/api/v1/learning-development'],
    '../routes/learning-development.routes'
  );
  logger.info('Phase 22 mounted (1 module: learning-development)');

  // ── Phase 23: Automated Backup System — نظام النسخ الاحتياطي التلقائي ──────
  safeMount(
    app,
    ['/api/automated-backup', '/api/v1/automated-backup'],
    '../routes/automated-backup.routes'
  );
  logger.info('Phase 23 mounted (1 module: automated-backup)');

  // ── Phase 24: Rate Limiting + WAF — حماية متقدمة ضد هجمات DDoS ──────
  safeMount(
    app,
    ['/api/waf-ratelimit', '/api/v1/waf-ratelimit'],
    '../routes/rate-limit-waf.routes'
  );
  logger.info('Phase 24 mounted (1 module: rate-limit-waf)');

  // ── Phase 25: Medical & Clinical Systems — الأنظمة الطبية والسريرية ──────
  safeMount(app, ['/api/pharmacy', '/api/v1/pharmacy'], '../routes/pharmacy.routes');
  safeMount(
    app,
    ['/api/appointment-scheduling', '/api/v1/appointment-scheduling'],
    '../routes/appointmentScheduling.routes'
  );
  safeMount(
    app,
    ['/api/insurance-claims', '/api/v1/insurance-claims'],
    '../routes/insuranceClaims.routes'
  );
  safeMount(
    app,
    ['/api/medical-equipment', '/api/v1/medical-equipment'],
    '../routes/medicalEquipment.routes'
  );
  safeMount(
    app,
    ['/api/medical-referrals', '/api/v1/medical-referrals'],
    '../routes/medicalReferrals.routes'
  );
  safeMount(app, ['/api/emr', '/api/v1/emr'], '../routes/emr.routes');
  logger.info(
    'Phase 25 mounted (6 modules: pharmacy, appointment-scheduling, insurance-claims, medical-equipment, medical-referrals, emr)'
  );

  // ── Phase 26: Therapy & Rehabilitation Additions — إضافات العلاج والتأهيل ──
  safeMount(app, ['/api/goal-bank', '/api/v1/goal-bank'], '../routes/goalBank.routes');
  safeMount(app, ['/api/goal-progress', '/api/v1/goal-progress'], '../routes/goalProgress.routes');
  safeMount(
    app,
    ['/api/group-programs', '/api/v1/group-programs'],
    '../routes/groupPrograms.routes'
  );
  safeMount(app, ['/api/feedback', '/api/v1/feedback'], '../routes/feedback.routes');
  safeMount(app, ['/api/therapy-rooms', '/api/v1/therapy-rooms'], '../routes/therapyRooms.routes');
  safeMount(
    app,
    ['/api/therapy-programs', '/api/v1/therapy-programs'],
    '../routes/therapyPrograms.routes'
  );
  safeMount(
    app,
    ['/api/standardized-assessments', '/api/v1/standardized-assessments'],
    '../routes/standardizedAssessments.routes'
  );
  logger.info(
    'Phase 26 mounted (7 modules: goal-bank, goal-progress, group-programs, feedback, therapy-rooms, therapy-programs, standardized-assessments)'
  );

  // ── Phase 27: Maintenance Domain — إدارة الصيانة ─────────────────────────
  safeMount(
    app,
    ['/api/maintenance-inventory', '/api/v1/maintenance-inventory'],
    '../routes/maintenanceInventory.routes'
  );
  safeMount(
    app,
    ['/api/maintenance-issues', '/api/v1/maintenance-issues'],
    '../routes/maintenanceIssues.routes'
  );
  safeMount(
    app,
    ['/api/maintenance-predictions', '/api/v1/maintenance-predictions'],
    '../routes/maintenancePredictions.routes'
  );
  safeMount(
    app,
    ['/api/maintenance-providers', '/api/v1/maintenance-providers'],
    '../routes/maintenanceProviders.routes'
  );
  safeMount(
    app,
    ['/api/maintenance-tasks', '/api/v1/maintenance-tasks'],
    '../routes/maintenanceTasks.routes'
  );
  logger.info(
    'Phase 27 mounted (5 modules: maintenance-inventory, maintenance-issues, maintenance-predictions, maintenance-providers, maintenance-tasks)'
  );

  // ── Phase 28: Portal & Activities — البوابة والأنشطة ─────────────────────
  safeMount(
    app,
    ['/api/portal-notifications', '/api/v1/portal-notifications'],
    '../routes/portalNotifications.routes'
  );
  safeMount(app, ['/api/activities', '/api/v1/activities'], '../routes/activities.routes');
  logger.info('Phase 28 mounted (2 modules: portal-notifications, activities)');

  // ── Phase 29: Generic Programs — البرامج العامة ──────────────────────────
  safeMount(app, ['/api/programs', '/api/v1/programs'], '../routes/programs.routes');
  logger.info('Phase 29 mounted (1 module: programs)');

  // ── Phase 30: Rehabilitation Advanced — التأهيل المتقدم ──────────────────
  safeMount(
    app,
    ['/api/rehabilitation-advanced', '/api/v1/rehabilitation-advanced'],
    '../routes/rehabilitation-advanced.routes'
  );
  logger.info(
    'Phase 30 mounted (12 sub-modules: behavior-incidents, behavior-plans, vocational-profiles, job-coach-logs, home-programs, medication-records, autism-profiles, therapy-sessions, nutrition-plans, resource-rooms, staff-certifications, discharge-plans)'
  );

  // ── Phase 31: Rehabilitation Center — مركز التأهيل ───────────────────────
  safeMount(
    app,
    ['/api/rehabilitation-center', '/api/v1/rehabilitation-center'],
    '../routes/rehabilitation-center.routes'
  );
  logger.info(
    'Phase 31 mounted (13 sub-modules: assessment-tools, beneficiary-assessments, individualized-plans, group-sessions, satisfaction-surveys, survey-responses, referrals, schedules, assistive-equipment, family-communications, waitlist, report-templates, generated-reports)'
  );

  // ── Phase 32: Rehabilitation Intelligent — التأهيل الذكي ─────────────────
  safeMount(
    app,
    ['/api/rehabilitation-intelligent', '/api/v1/rehabilitation-intelligent'],
    '../routes/rehabilitation-intelligent.routes'
  );
  logger.info(
    'Phase 32 mounted (12 sub-modules: ai-recommendations, predictive-models, prediction-results, risk-assessments, quality-indicators, accreditation-standards, research-projects, training-programs, competency-assessments, emergency-protocols, emergency-incidents, government-integrations)'
  );

  // ── Phase 33: Rehabilitation Specialized — التأهيل التخصصي ───────────────
  safeMount(
    app,
    ['/api/rehabilitation-specialized', '/api/v1/rehabilitation-specialized'],
    '../routes/rehabilitation-specialized.routes'
  );
  logger.info(
    'Phase 33 mounted (10 sub-modules: transportation, insurance-claims, billing-records, volunteers, donations, residential-units, activities, documents, events, clinical-notes)'
  );

  // ── Rehabilitation Plans — خطط التأهيل الفردية (12 أسبوع + AI + Tele-Rehab) ──
  safeMount(
    app,
    ['/api/rehab-plans', '/api/v1/rehab-plans'],
    '../routes/rehabilitationPlan.routes'
  );
  logger.info(
    'Rehab Plans routes mounted (16 endpoints: CRUD plans, SMART goals, AI assessment, outcome prediction, tele-sessions, progress reports, quality metrics, goal bank, templates)'
  );

  // ── Phase 34: Smart Attendance — الحضور الذكي ────────────────────────────
  // NOTE: smart-attendance is already mounted via dualMount (Wave 2) using smart_attendance.routes.js
  // The smart-attendance.routes.js (hyphen) provides additional CRUD sub-modules
  safeMount(
    app,
    ['/api/smart-attendance-crud', '/api/v1/smart-attendance-crud'],
    '../routes/smart-attendance.routes'
  );
  logger.info(
    'Phase 34 mounted (12 sub-modules: records, behavior-patterns, appeals, parent-notification-preferences, biometric-enrollments, anomaly-alerts, summary-reports, camera-devices, biometric-devices, face-recognition, fingerprint-data, camera-attendance)'
  );

  // ── Phase 35: Beneficiary Management — إدارة المستفيدين ──────────────────
  safeMount(
    app,
    ['/api/beneficiary-management', '/api/v1/beneficiary-management'],
    '../routes/beneficiary-management.routes'
  );
  logger.info(
    'Phase 35 mounted (8 sub-modules: academic-records, achievements, attendance-records, counseling-sessions, financial-support, scholarships, skills-development, support-plans)'
  );

  // ── Phase 36: Accounting Operations — العمليات المحاسبية ──────────────────
  safeMount(
    app,
    ['/api/accounting-operations', '/api/v1/accounting-operations'],
    '../routes/accounting-operations.routes'
  );
  logger.info('Phase 36 mounted (2 sub-modules: expenses, payments)');

  // ── Care Plans, System Settings, Saudi Tax, Finance Operations ─────────
  dualMount(app, 'care-plans', carePlanRoutes);
  dualMount(app, 'system-settings', systemSettingsRoutes);
  dualMount(app, 'saudi-tax', saudiTaxRoutes);
  dualMount(app, 'finance-operations', financeOperationsRoutes);
  logger.info(
    'New gap-fix routes mounted (4 modules: care-plans, system-settings, saudi-tax, finance-operations)'
  );

  // ── Branch Management System — نظام إدارة الفروع (12 فرع + HQ الرياض) ──
  // RBAC granular: hq_super_admin / hq_admin / branch_manager / therapist / driver / receptionist
  // Endpoints: /api/branch-management/hq/dashboard, /api/branch-management/:code/dashboard ...
  dualMount(app, 'branch-management', branchManagementRoutes);
  logger.info(
    'Branch Management System mounted (25 endpoints — HQ dashboard, cross-branch comparison, financials, staff optimizer, emergency override, branch dashboards, patients, schedule, staff, finance, transport, reports, KPIs, settings, audit logs, RBAC matrix — 12 branches + HQ Riyadh)'
  );

  // ── Route Mount Summary ─────────────────────────────────────────────────
  const summary = routeHealth.summary;
  if (summary.failed === 0) {
    logger.info(`✅ All ${summary.total} route modules loaded successfully`);
  } else {
    logger.warn(`⚠️  Route loading: ${summary.ok}/${summary.total} OK, ${summary.failed} FAILED`);
    summary.failedRoutes.forEach(f => {
      logger.warn(`   ✗ ${f.path} → ${f.error}`);
    });
  }
};

module.exports = { mountAllRoutes, dualMount, safeMount, routeHealth };
