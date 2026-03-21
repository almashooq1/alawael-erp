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
const successionPlanningRoutes = require('../routes/successionPlanning');
const mobileAppRoutes = require('../routes/mobileApp.routes');
const zktecoRoutes = require('../routes/zkteco.routes');

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
  try {
    const handler = require(modulePath);
    if (Array.isArray(paths)) {
      paths.forEach(p => app.use(p, handler));
    } else {
      app.use(paths, handler);
    }
    return true;
  } catch (err) {
    logger.error(`Failed to mount route ${modulePath}: ${err.message}`);
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
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/dashboard', require('../routes/dashboard.stats'));
  app.use('/api/dashboard', dashboardExtrasRouter);

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

  app.use('/api/validate', validateRoutes);
  app.use('/api/lms', elearningRoutes);
  app.use('/api/org-branding', orgBrandingRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/analytics', analyticsExtraRouter);

  // ── Real Mongoose CRUD Routes (single-prefix /api/) ─────────────────────
  app.use('/api/admin', adminRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/monitoring', monitoringRouter);
  app.use('/api/ai-predictions', aiPredictionsRouter);
  app.use('/api/hr-system', hrSystemRouter);
  app.use('/api/integrated-care', integratedCareRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/organization', organizationRouter);
  app.use('/api/communications', communicationsRouter);
  app.use('/api/ai-communications', aiCommRouter);
  app.use('/api/export-import', exportImportRouter);
  app.use('/api/exports', exportsRouter);
  app.use('/api/student-reports', studentReportsRouter);
  app.use('/api/rehabilitation-programs', rehabProgramsRouter);
  app.use('/api/documents-smart', documentsSmartRouter);

  // ── Document Advanced Services (خدمات المستندات المتقدمة) ───────────────
  dualMount(app, 'documents-advanced', documentAdvancedRoutes);
  logger.info('Document Advanced routes mounted (10 services, 60+ endpoints)');

  app.use('/api/students', studentsRouter);
  app.use('/api/compensation', compensationRouter);
  app.use('/api/disability', disabilityRouter);
  app.use('/api/pm', pmRouter);
  app.use('/api/parents', parentsRouter);
  app.use('/api/guardian', guardianPortalRouter);

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
  dualMount(app, 'succession-planning', successionPlanningRoutes);
  dualMount(app, 'mobile', mobileAppRoutes);
  dualMount(app, 'zkteco', zktecoRoutes);

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

  // ── Legacy single-mount routes ──────────────────────────────────────────
  app.use('/api/assets', assetRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/medical-files', require('../routes/medicalFiles'));

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
  app.use('/api/v1/disability-rehabilitation', disabilityRehabilitationRoutes);
  app.use('/api/v1/maintenance', maintenanceRoutes);
  dualMount(app, 'webhooks', webhooksRoutes);
  app.use('/api/v1/assets', assetRoutes);
  app.use('/api/v1/schedules', scheduleRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/basic-reports', reportRoutes);
  dualMount(app, 'therapist', require('../routes/therapist'));
  dualMount(app, 'therapist-extended', require('../routes/therapistExtended.routes'));
  dualMount(app, 'therapist-pro', require('../routes/therapistPro.routes'));
  dualMount(app, 'therapist-ultra', require('../routes/therapistUltra.routes'));
  dualMount(app, 'therapist-elite', require('../routes/therapistElite.routes'));

  // Phase 4: Health Monitoring
  safeMount(app, '/api/v1/health', '../routes/health.routes');

  // Phase 21-28
  safeMount(app, '/api/phases-21-28', '../routes/phases-21-28.routes');

  // Disability Rehabilitation (/api/ only; /api/v1/ already mounted above)
  safeMount(app, '/api/disability-rehabilitation', '../routes/disability-rehabilitation.routes');

  // Frontend alias: /api/rehabilitation → same routes (frontend uses this shorter path)
  safeMount(app, '/api/rehabilitation', '../routes/disability-rehabilitation.routes');

  // Rehabilitation Services (Phase 5–9: 61 specialized therapy & support services)
  safeMount(app, '/api/disability-rehab', '../rehabilitation-services/rehabilitation-routes');
  safeMount(app, '/api/v1/disability-rehab', '../rehabilitation-services/rehabilitation-routes');

  // Phase 17
  if (process.env.SKIP_PHASE17 === 'true') {
    logger.warn('Phase 17 routes skipped (SKIP_PHASE17=true)');
  } else {
    safeMount(app, '/api', '../routes/phase17-advanced.routes');
  }

  // Phases 18-20
  safeMount(app, '/api', '../routes/phases-18-20.routes');

  // ── Phase 21: New Feature Services ──────────────────────────────────────
  try {
    const contractsRoutes = require('../routes/contracts.routes');
    dualMount(app, 'contracts', contractsRoutes);

    const smartNotificationRoutes = require('../routes/smartNotificationCenter.routes');
    dualMount(app, 'smart-notifications', smartNotificationRoutes);

    const advancedTicketsRoutes = require('../routes/advancedTickets.routes');
    dualMount(app, 'advanced-tickets', advancedTicketsRoutes);

    const eInvoicingRoutes = require('../routes/eInvoicing.routes');
    dualMount(app, 'e-invoicing', eInvoicingRoutes);

    const eSignatureRoutes = require('../routes/eSignature.routes');
    dualMount(app, 'e-signature', eSignatureRoutes);

    const eStampRoutes = require('../routes/eStamp.routes');
    dualMount(app, 'e-stamp', eStampRoutes);

    const riskAssessmentRoutes = require('../routes/riskAssessment.routes');
    dualMount(app, 'risk-assessment', riskAssessmentRoutes);

    const budgetManagementRoutes = require('../routes/budgetManagement.routes');
    dualMount(app, 'budget-management', budgetManagementRoutes);

    const employeePortalRoutes = require('../routes/employeePortal.routes');
    dualMount(app, 'employee-portal', employeePortalRoutes);

    const kpiDashboardRoutes = require('../routes/kpiDashboard.routes');
    dualMount(app, 'kpi-dashboard', kpiDashboardRoutes);

    // Administration Management System
    const administrationRoutes = require('../routes/administration.routes');
    dualMount(app, 'administration', administrationRoutes);

    // Workflow System (Intelligent Workflow Engine)
    const workflowRoutes = require('../routes/workflow.routes');
    dualMount(app, 'workflow', workflowRoutes);

    // Workflow Enhanced Features (التعليقات، المفضلة، التفويض، التقويم، القوالب الإضافية)
    const workflowEnhancedRoutes = require('../routes/workflowEnhanced.routes');
    dualMount(app, 'workflow-enhanced', workflowEnhancedRoutes);

    // Workflow Pro Features (النماذج، التصعيد، SLA، مؤشرات الأداء، الموافقات، الأتمتة)
    const workflowProRoutes = require('../routes/workflowPro.routes');
    dualMount(app, 'workflow-pro', workflowProRoutes);

    // Enterprise Pro Features (التدقيق، التقارير، التقويم، CRM، المستودعات، المشاريع)
    const enterpriseProRoutes = require('../routes/enterprisePro.routes');
    dualMount(app, 'enterprise-pro', enterpriseProRoutes);

    // Enterprise Pro Plus Features (التوظيف، المرافق، الموردين، ITSM، السلامة، التخطيط الاستراتيجي)
    const enterpriseProPlusRoutes = require('../routes/enterpriseProPlus.routes');
    dualMount(app, 'enterprise-pro-plus', enterpriseProPlusRoutes);

    // Enterprise Ultra Features (القانونية، الحوكمة، استمرارية الأعمال، تجربة العملاء، الاستدامة، التحول الرقمي)
    const enterpriseUltraRoutes = require('../routes/enterpriseUltra.routes');
    dualMount(app, 'enterprise-ultra', enterpriseUltraRoutes);

    logger.info(
      'Phase 21 new feature routes mounted (14 services + workflow enhanced + workflow pro + enterprise pro + enterprise pro plus + enterprise ultra)'
    );
  } catch (error) {
    logger.error('Phase 21 routes error: %s', error.message);
  }

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
  safeMount(app, ['/phases-29-33', '/api/phases-29-33'], '../routes/phases-29-33.routes');

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
  safeMount(
    app,
    ['/api/helpdesk', '/api/v1/helpdesk'],
    '../routes/helpdesk.routes'
  );
  safeMount(
    app,
    ['/api/hse', '/api/v1/hse'],
    '../routes/hse.routes'
  );
  logger.info(
    'New systems mounted (2 modules: helpdesk, hse)'
  );
};

module.exports = { mountAllRoutes, dualMount, safeMount };
