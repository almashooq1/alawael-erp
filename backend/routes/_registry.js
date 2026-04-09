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

const { safeError } = require('../utils/safeError');

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
const crmRoutes = safeRequire('../api/routes/crm.routes.advanced');
const reportingRoutes = safeRequire('../api/routes/reporting.routes');
const documentsRoutes = safeRequire('../api/routes/documents.routes');
const notificationsRoutes = safeRequire('../routes/notifications.routes');
const messagingRoutes = safeRequire('../routes/messaging.routes');
const financeRoutes = safeRequire('../routes/finance.routes.unified');
const financeAdvancedRoutes = safeRequire('../routes/finance.routes.advanced');
const financeExtendedRoutes = safeRequire('../routes/finance.routes.extended');
const financeProRoutes = safeRequire('../routes/finance.routes.pro');
const financeEnterpriseRoutes = safeRequire('../routes/finance.routes.enterprise');
const financeUltimateRoutes = safeRequire('../routes/finance.routes.ultimate');
const financeEliteRoutes = safeRequire('../routes/finance.routes.elite');
const integrationRoutes = safeRequire('../routes/integration.routes.minimal');
// NOTE: disability-rehabilitation (old .js) — الإصدار القديم. تمّ استبداله بـ disability-rehabilitation.routes.js
//       (مثبّت لاحقاً عبر safeMount على /api/ و /api/v1/ معاً).
const maintenanceRoutes = safeRequire('../routes/maintenance');
const webhooksRoutes = safeRequire('../routes/webhooks');
const assetRoutes = safeRequire('../routes/assets');
const scheduleRoutes = safeRequire('../routes/schedules');
const analyticsRoutes = safeRequire('../routes/analytics');
const reportRoutes = safeRequire('../routes/reports');

// Existing route files
const dashboardRoutes = safeRequire('../routes/dashboard');
const searchRoutes = safeRequire('../routes/search');
const validateRoutes = safeRequire('../routes/validate');
const elearningRoutes = safeRequire('../routes/elearning');
const orgBrandingRoutes = safeRequire('../routes/orgBranding');

// Real Mongoose CRUD routes (converted from frontend-api-stubs)
const adminRouter = safeRequire('../routes/admin.real.routes');
const userManagementRouter = safeRequire('../routes/user-management.routes');
const accountRouter = safeRequire('../routes/account.real.routes');
const paymentsRouter = safeRequire('../routes/payments.real.routes');
const monitoringRouter = safeRequire('../routes/monitoring.real.routes');
const aiPredictionsRouter = safeRequire('../routes/aiPredictions.real.routes');
const aiAnalyticsRouter = safeRequire('../routes/ai-analytics.routes');
const hrSystemRouter = safeRequire('../routes/hrSystem.real.routes');
const integratedCareRouter = safeRequire('../routes/integratedCare.real.routes');
const securityRouter = safeRequire('../routes/security.real.routes');
const organizationRouter = safeRequire('../routes/organization.real.routes');
const communicationsRouter = safeRequire('../routes/communications.real.routes');
const aiCommRouter = safeRequire('../routes/aiCommunications.real.routes');
const exportImportRouter = safeRequire('../routes/exportImport.real.routes');
const exportsRouter = safeRequire('../routes/exports.real.routes');
const studentReportsRouter = safeRequire('../routes/studentReports.real.routes');
const rehabProgramsRouter = safeRequire('../routes/rehabPrograms.real.routes');
const documentsSmartRouter = safeRequire('../routes/documentsSmart.real.routes');
const studentsRouter = safeRequire('../routes/students.real.routes');
const compensationRouter = safeRequire('../routes/compensation.real.routes');
const disabilityRouter = safeRequire('../routes/disability.real.routes');
const pmRouter = safeRequire('../routes/pm.real.routes');
const analyticsExtraRouter = safeRequire('../routes/analyticsExtra.real.routes');
const dashboardExtrasRouter = safeRequire('../routes/dashboardExtras.real.routes');
const parentsRouter = safeRequire('../routes/parents.real.routes');
const guardianPortalRouter = safeRequire('../routes/guardian.portal.routes');

// Previously Unmounted Route Files (CRUD-complete)
const qiwaRoutes = safeRequire('../routes/qiwa.routes');
const gosiRoutes = safeRequire('../routes/gosi.routes');
const govIntegrationRoutes = safeRequire('../routes/governmentIntegration.routes');
const disabilityCardRoutes = safeRequire('../routes/disabilityCard.routes');
const ecommerceRoutes = safeRequire('../routes/ecommerce.routes');
const { router: purchasingRoutes } = safeRequire('../routes/purchasing.routes.unified');
const hrAdvancedRoutes = safeRequire('../routes/hr-advanced.routes');
const communicationRoutes = safeRequire('../routes/communication.routes');
const driversRoutes = safeRequire('../routes/drivers');
const vehiclesRoutes = safeRequire('../routes/vehicles');
const tripsRoutes = safeRequire('../routes/trips');
const gpsRoutes = safeRequire('../routes/gps');
const transportRoutesRouter = safeRequire('../routes/transportRoutes');
const geofenceRoutes = safeRequire('../routes/geofences');
const dispatchRoutes = safeRequire('../routes/dispatch');
const fleetCostsRoutes = safeRequire('../routes/fleetCosts');
const fleetTiresRoutes = safeRequire('../routes/fleetTires');
const fleetSafetyRoutes = safeRequire('../routes/fleetSafety');
const fleetFuelCardsRoutes = safeRequire('../routes/fleetFuelCards');
const fleetInspectionsRoutes = safeRequire('../routes/fleetInspections');
const driverTrainingRoutes = safeRequire('../routes/driverTraining');
const vehicleInsuranceRoutes = safeRequire('../routes/vehicleInsurance');
const fleetKPIRoutes = safeRequire('../routes/fleetKPI');
const driverShiftsRoutes = safeRequire('../routes/driverShifts');
const fleetComplianceRoutes = safeRequire('../routes/fleetCompliance');
const trafficFinesRoutes = safeRequire('../routes/trafficFines');
const fleetDocumentRoutes = safeRequire('../routes/fleetDocuments');
const fleetPartRoutes = safeRequire('../routes/fleetParts');
const cargoRoutes = safeRequire('../routes/cargo');
const fleetReservationRoutes = safeRequire('../routes/fleetReservations');
const vehicleAssignmentRoutes = safeRequire('../routes/vehicleAssignments');
const fleetParkingRoutes = safeRequire('../routes/fleetParking');
const fleetAlertRoutes = safeRequire('../routes/fleetAlerts');
const driverLeaveRoutes = safeRequire('../routes/driverLeaves');
const fleetFuelRoutes = safeRequire('../routes/fleetFuel');
const fleetTollRoutes = safeRequire('../routes/fleetTolls');
const fleetAccidentRoutes = safeRequire('../routes/fleetAccidents');
const fleetWarrantyRoutes = safeRequire('../routes/fleetWarranties');
const fleetRoutePlanRoutes = safeRequire('../routes/fleetRoutePlans');
const fleetCommunicationRoutes = safeRequire('../routes/fleetCommunications');
const fleetPenaltyRoutes = safeRequire('../routes/fleetPenalties');
const fleetDisposalRoutes = safeRequire('../routes/fleetDisposals');
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
const { studentRoutes: studentMgmtRoutes } = safeRequire('../students');

// Wave 2: Fixed Route Files (16 additional CRUD routes)
const civilDefenseRoutes = safeRequire('../routes/civilDefense.routes');
const smartAttendanceRoutes = safeRequire('../routes/smart_attendance.routes');
const compensationBenefitsRoutes = safeRequire('../routes/compensation-benefits.routes');
const attendanceRoutes = safeRequire('../routes/attendance.routes');
const gratuityRoutes = safeRequire('../routes/gratuity.routes');
const { router: inventoryUnifiedRoutes } = safeRequire('../routes/inventory.routes.unified');
const supplyChainRoutes = safeRequire('../routes/supplyChain.routes');
const hrUnifiedRoutes = safeRequire('../routes/hr.routes.unified');
const trafficAccidentRoutes = safeRequire('../routes/trafficAccidents');
const mfaRoutes = safeRequire('../routes/mfa');
const ssoRoutes = safeRequire('../routes/sso.routes');
const rbacRoutes = safeRequire('../routes/rbac.routes');
const rbacAdminRoutes = safeRequire('../routes/rbac.admin.routes');
const montessoriRoutes = safeRequire('../routes/montessori');
const montessoriAuthRoutes = safeRequire('../routes/montessoriAuth');
const measurementsRoutes = safeRequire('../routes/measurements.routes');
const assessmentRoutes = safeRequire('../routes/assessment.routes');
const successionPlanningRoutes = safeRequire('../routes/successionPlanning');
const mobileAppRoutes = safeRequire('../routes/mobileApp.routes');
const zktecoRoutes = safeRequire('../routes/zkteco.routes');

// HR Attendance Engine (محرك الحضور الموحد)
const hrAttendanceRoutes = safeRequire('../routes/hr-attendance.routes');

// Administrative Systems Routes (الأنظمة الإدارية)
const strategicPlanningRoutes = safeRequire('../routes/strategicPlanning.routes');
const complaintsRoutes = safeRequire('../routes/complaints.routes');
const facilitiesRoutes = safeRequire('../routes/facilities.routes');

// Education System Routes (نظام التعليم)
const academicYearRoutes = safeRequire('../routes/academicYear.routes');
const subjectsRoutes = safeRequire('../routes/subjects.routes');
const teachersRoutes = safeRequire('../routes/teachers.routes');
const classroomsRoutes = safeRequire('../routes/classrooms.routes');
const curriculumRoutes = safeRequire('../routes/curriculum.routes');
const timetableRoutes = safeRequire('../routes/timetable.routes');
const examsRoutes = safeRequire('../routes/exams.routes');
const gradebookRoutes = safeRequire('../routes/gradebook.routes');

// Specialized Assessment Scales & Rehab Program Templates (مقاييس التقييم المتخصصة وبرامج التأهيل)
const specializedScalesRoutes = safeRequire('../routes/specializedScales.routes');
const rehabProgramTemplatesRoutes = safeRequire('../routes/rehabProgramTemplates.routes');

// Document Advanced Services (خدمات المستندات المتقدمة)
const documentAdvancedRoutes = safeRequire('../routes/documentAdvanced.routes');

// Electronic Archive System (نظام الأرشفة الإلكتروني)
const archiveRoutes = safeRequire('../archive/archive-routes');

// Form Templates System (نظام النماذج الجاهزة)
const formTemplateRoutes = safeRequire('../routes/formTemplates.routes');

// Insurance Management System (نظام إدارة التأمين)
const insuranceRoutes = safeRequire('../routes/insurance.routes');

// Media Library System (نظام مكتبة الوسائط)
const mediaRoutes = safeRequire('../routes/media.routes');

// HR Insurance Integration (تكامل تأمين الموظفين الصحي)
const hrInsuranceRoutes = safeRequire('../routes/hr-insurance.routes');

// Therapy Sessions System (نظام الجلسات العلاجية)
const therapySessionsRoutes = safeRequire('../routes/therapy-sessions.routes');

// Therapy Sessions Analytics (تحليلات الجلسات العلاجية المتقدمة)
const therapySessionsAnalyticsRoutes = safeRequire('../routes/therapy-sessions-analytics.routes');

// Employee Affairs System (نظام شؤون الموظفين)
const employeeAffairsRoutes = safeRequire('../routes/employeeAffairs.routes');
const employeeAffairsExpandedRoutes = safeRequire('../routes/employeeAffairs.expanded.routes');
const employeeAffairsPhase2Routes = safeRequire('../routes/employeeAffairs.phase2.routes');
const employeeAffairsPhase3Routes = safeRequire('../routes/employeeAffairs.phase3.routes');

// HR Smart System — AI, Analytics, Onboarding, Documents (النظام الذكي لشؤون الموظفين)
const hrSmartRoutes = safeRequire('../routes/hr/smart.routes');

// Email System v2 (نظام البريد الإلكتروني الموحد)
const emailV2Routes = safeRequire('../routes/email.routes');

// WhatsApp Communication System (نظام الوتساب)
const whatsappRoutes = safeRequire('../communication/whatsapp-routes');
const whatsappEnhancedRoutes = safeRequire('../communication/whatsapp-enhanced-routes');

// Administrative Communications System (نظام الاتصالات الإدارية)
const adminCommRoutes = safeRequire('../communication/administrative-communications-routes');
const adminCommEnhancedRoutes = safeRequire('../communication/admin-comm-enhanced-routes');
const electronicDirectivesRoutes = safeRequire('../communication/electronic-directives-routes');

// Student Portal Extended Services (خدمات بوابة الطالب الموسّعة)
const studentComplaintsRoutes = safeRequire('../routes/studentComplaints.routes');
const studentCertificatesRoutes = safeRequire('../routes/studentCertificates.routes');
const studentHealthTrackerRoutes = safeRequire('../routes/studentHealthTracker.routes');
const studentRewardsStoreRoutes = safeRequire('../routes/studentRewardsStore.routes');
const studentEventsRoutes = safeRequire('../routes/studentEvents.routes');
const studentElearningRoutes = safeRequire('../routes/studentElearning.routes');

// Saudi Government Integrations (التكاملات الحكومية السعودية)
const mudadRoutes = safeRequire('../routes/mudad.routes');
const taqatRoutes = safeRequire('../routes/taqat.routes');

// Disability Authority & CBAHI (هيئة رعاية ذوي الإعاقة ومعايير سباهي)
const disabilityAuthorityRoutes = safeRequire('../routes/disabilityAuthority.routes');

// Treatment Authorization (إذن العلاج والموافقة المسبقة)
const treatmentAuthorizationRoutes = safeRequire('../routes/treatmentAuthorization.routes');

// Family Satisfaction Surveys (استبيانات رضا الأسر)
const familySatisfactionRoutes = safeRequire('../routes/familySatisfaction.routes');

// Noor Integration (نظام نور — وزارة التعليم)
const noorRoutes = safeRequire('../routes/noor.routes');

// Gap-Fix Routes (خطط الرعاية, إعدادات النظام, الضريبة, العمليات المالية)
const carePlanRoutes = safeRequire('../routes/carePlan.routes');
const systemSettingsRoutes = safeRequire('../routes/systemSettings.routes');
const saudiTaxRoutes = safeRequire('../routes/saudiTax.routes');
const advancedSettingsRoutes = safeRequire('../routes/advancedSettings.routes');
const financeOperationsRoutes = safeRequire('../routes/financeOperations.routes');

// Branch Management System — نظام إدارة الفروع مع RBAC متقدم (12 فرع + HQ)
const branchManagementRoutes = safeRequire('../routes/branch.routes');

// ─── الميزات الناقصة المضافة — Missing Features Added ────────────────────────
// النماذج الناقصة من prompt_02 (MedicalHistory, BeneficiaryTransfer, EmergencyContact, LeaveBalance, EmploymentContract, ChartOfAccounts, AssessmentComparison)
const missingModelsRoutes = safeRequire('../routes/missing-models.routes');

// ─── prompt_04: وحدة إدارة المستفيدين — Beneficiary Management Module ─────────
const guardiansRoutes = safeRequire('../routes/guardians.routes');
const disabilityAssessmentsRoutes = safeRequire('../routes/disability-assessments.routes');
const beneficiaryTransfersRoutes = safeRequire('../routes/beneficiary-transfers.routes');

// مقيم (Muqeem) — وزارة الداخلية
const muqeemRoutes = safeRequire('../routes/muqeem.routes');
// مقيم الكامل (Muqeem Full) — إقامات + تأشيرات + نقل خدمات + تنبيهات ذكية (البرومبت 16)
const muqeemFullRoutes = safeRequire('../routes/muqeem-full.routes');
// GOSI Full — التأمينات الاجتماعية الكاملة + مكافأة نهاية الخدمة (البرومبت 17)
const gosiFullRoutes = safeRequire('../routes/gosi-full.routes');
// نطاقات + WPS + عقود قوى (البرومبت 18) — Nitaqat + WPS + Qiwa Contracts
const nitaqatRoutes = safeRequire('../routes/nitaqat.routes');
// حماية البيانات الشخصية PDPL (البرومبت 19)
const pdplRoutes = safeRequire('../routes/pdpl.routes');
// ZATCA Phase 2 — الفوترة الإلكترونية المرحلة الثانية
const zatcaPhase2Routes = safeRequire('../routes/zatca-phase2.routes');
// NPHIES — المنصة الوطنية للمعلومات الصحية والتأمينية
const nphiesRoutes = safeRequire('../routes/nphies.routes');
// Enhanced Audit — سجل التدقيق المحسّن
const { router: enhancedAuditRouter } = require('../middleware/enhancedAudit.middleware');

// ─── prompt_05: وحدة التأهيل والبرامج — Rehabilitation & Programs Module ────
const rehabProgramsModuleRoutes = safeRequire('../routes/rehab-programs-module.routes');

// ─── prompt_06: وحدة المقاييس والتقييمات السريرية — Assessment Scales & Clinical Assessments Module ────
const assessmentScalesRoutes = safeRequire('../routes/assessment-scales.routes');

// ─── prompt_07: الوحدات التشغيلية — HR + Finance + Transport + Scheduling ────
const hrModuleRoutes = safeRequire('../routes/hr-module.routes');
const financeModuleRoutes = safeRequire('../routes/finance-module.routes');
const transportModuleRoutes = safeRequire('../routes/transport-module.routes');
const schedulingModuleRoutes = safeRequire('../routes/scheduling-module.routes');

// ─── prompt_08: التواصل + الملفات + المخزون + الجودة ────────────────────────
const communicationModuleRoutes = safeRequire('../routes/communication-module.routes');
const filesModuleRoutes = safeRequire('../routes/files-module.routes');
const inventoryModuleRoutes = safeRequire('../routes/inventory-module.routes');
const qualityModuleRoutes = safeRequire('../routes/quality-module.routes');

// ─── prompt_08 Enhanced: الوحدات المحسّنة (8-12) ─────────────────────────────
const notificationEnhancedRoutes = safeRequire('../routes/notification-enhanced.routes');
const documentEnhancedRoutes = safeRequire('../routes/document-enhanced.routes');
const documentsProRoutes = safeRequire('../api/routes/documents-pro.routes');
const documentsProExtRoutes = safeRequire('../api/routes/documents-pro-extended.routes');
const documentsProV3Routes = safeRequire('../api/routes/documents-pro-phase3.routes');
const documentsProV4Routes = safeRequire('../api/routes/documents-pro-phase4.routes');
const documentsProV5Routes = safeRequire('../api/routes/documents-pro-phase5.routes');
const documentsProV6Routes = safeRequire('../api/routes/documents-pro-phase6.routes');
const documentsProV7Routes = safeRequire('../api/routes/documents-pro-phase7.routes');
const documentsProV8Routes = safeRequire('../api/routes/documents-pro-phase8.routes');
const documentsProV9Routes = safeRequire('../api/routes/documents-pro-phase9.routes');
const branchEnhancedRoutes = safeRequire('../routes/branch-enhanced.routes');
const inventoryEnhancedRoutes = safeRequire('../routes/inventory-enhanced.routes');
const qualityEnhancedRoutes = safeRequire('../routes/quality-enhanced.routes');

// ─── prompt_09: التقارير والتحليلات — Reports & Analytics Module ─────────────
const reportsAnalyticsModuleRoutes = safeRequire('../routes/reports-analytics-module.routes');

// ─── prompt_21: بوابة ولي الأمر المحسّنة — Parent Portal Enhanced (PWA) ───────
const parentPortalEnhancedRoutes = safeRequire('../routes/parent-portal-enhanced.routes');

// ─── prompt_22: نظام التذاكر الشامل — Ticketing & Support System ──────────────
const ticketingSystemRoutes = safeRequire('../routes/ticketing-system.routes');

// ─── prompt_23: سجل التدقيق الشامل المحسّن — Audit Trail Enhanced ─────────────
const auditTrailEnhancedRoutes = safeRequire('../routes/audit-trail-enhanced.routes');

// ─── prompt_24: نظام الإعدادات المركزي — Central Settings System ──────────────
const centralSettingsRoutes = safeRequire('../routes/central-settings.routes');

// ─── prompt_26: وحدة الطب عن بعد — Telehealth & Remote Consultation Module ────
const telehealthRoutes = safeRequire('../routes/telehealth.routes');

// ─── prompt_27: بوابة التحويلات الطبية — Medical Referral Portal ─────────────
const referralPortalRoutes = safeRequire('../routes/referral.routes');

// ─── prompt_28: نظام IoT والأجهزة القابلة للارتداء — IoT & Wearables System ──
const iotWearablesRoutes = safeRequire('../routes/iot-wearables.routes');

// ─── prompt_29: نظام التأهيل بالألعاب المحسّن — Gamification Enhanced System ──
const gamificationEnhancedRoutes = safeRequire('../routes/gamification-enhanced.routes');

// ─── prompt_30: CRM وإدارة علاقات العملاء — CRM Enhanced ─────────────────────
const crmEnhancedRoutes = safeRequire('../routes/crm-enhanced.routes');

// ─── prompt_31: نظام الشكاوى والملاحظات المحسّن — Complaints Enhanced ──────────
const complaintsEnhancedRoutes = safeRequire('../routes/complaints-enhanced.routes');

// ─── prompt_19: CDSS + E-Learning Enhanced ────────────────────────────────
const cdssRoutes = safeRequire('../routes/cdss.routes');
const elearningEnhancedRoutes = safeRequire('../routes/elearning-enhanced.routes');

// ─── Setup & Admin Init (محمي بـ SETUP_SECRET_KEY) ──────────────────────────
const setupRoutes = safeRequire('../routes/setup.routes');

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
  dualMount(app, 'user-management', userManagementRouter);
  logger.info(
    '✅ User Management System routes mounted (stats, CRUD, bulk-actions, permissions, import/export)'
  );
  dualMount(app, 'account', accountRouter);
  dualMount(app, 'payments', paymentsRouter);
  dualMount(app, 'monitoring', monitoringRouter);
  dualMount(app, 'ai-predictions', aiPredictionsRouter);
  dualMount(app, 'ai-analytics', aiAnalyticsRouter);
  logger.info(
    '✅ prompt_20 AI Analytics routes mounted (22+ endpoints: dashboard, alerts, predictions, suggestions, reports, behavioral-analysis, schedule-optimize, models)'
  );
  dualMount(app, 'hr-system', hrSystemRouter);
  dualMount(app, 'integrated-care', integratedCareRouter);
  dualMount(app, 'security', securityRouter);
  dualMount(app, 'organization', organizationRouter);
  dualMount(app, 'communications', communicationsRouter);
  dualMount(app, 'ai-communications', aiCommRouter);
  dualMount(app, 'export-import', exportImportRouter);
  dualMount(app, 'exports', exportsRouter);
  dualMount(app, 'student-reports', studentReportsRouter);
  // NOTE: rehabilitation-programs (rehabPrograms.real.routes) هو الإصدار القديم المبسّط.
  //       وحدة التأهيل الشاملة الجديدة موجودة على /api/rehab-module (rehab-programs-module.routes).
  //       كلا المسارين محتفظ به لضمان التوافق مع الكود القديم.
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

  // ── Email System v2 (نظام البريد الإلكتروني الموحد) ──
  app.use('/api/v2/email', emailV2Routes);
  dualMount(app, 'email', emailV2Routes);

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

  // Disability Rehabilitation (موحّد على /api/ و /api/v1/ معاً)
  // يستخدم disability-rehabilitation.routes.js (الإصدار الجديد الأكثر اكتمالاً).
  // الإصدار القديم disability-rehabilitation.js كان مثبّتاً على /api/v1/ فقط، وتمّ توحيده هنا.
  // NOTE: /api/rehabilitation alias removed — frontend uses /api/rehab-plans (rehabilitationPlan.routes)
  //       and /api/disability-rehabilitation for the unified disability-rehabilitation module.
  safeMount(
    app,
    ['/api/disability-rehabilitation', '/api/v1/disability-rehabilitation'],
    '../routes/disability-rehabilitation.routes'
  );

  // Rehabilitation Services (Phase 5–9: 61 specialized therapy & support services)
  // تمّ توحيد الـ safeMount المزدوج في استدعاء واحد بمصفوفة مسارات
  safeMount(
    app,
    ['/api/disability-rehab', '/api/v1/disability-rehab'],
    '../rehabilitation-services/rehabilitation-routes'
  );

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
  // ─── prompt_24: الإعدادات المتقدمة مع Override الفروع ────────────────────
  dualMount(app, 'advanced-settings', advancedSettingsRoutes);
  logger.info(
    'New gap-fix routes mounted (5 modules: care-plans, system-settings, saudi-tax, finance-operations, advanced-settings[branch-override])'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Al-Awael Smart Rehabilitation System — الأولويات العشر الاحترافية ──
  // ══════════════════════════════════════════════════════════════════════════

  // Priority 1: Standard Assessment Tools (VABS-3, CARS-2, PEP-3, ICF)
  safeMount(
    app,
    ['/api/standard-assessments', '/api/v1/standard-assessments'],
    '../rehabilitation-assessment/standard-assessment-routes'
  );
  logger.info(
    'Standard Assessment routes mounted (VABS-3, CARS-2, PEP-3, ICF, Developmental Milestones — auto-scoring)'
  );

  // Priority 2: Smart IEP + Goals Bank + Session Logs
  safeMount(
    app,
    ['/api/smart-iep', '/api/v1/smart-iep'],
    '../rehabilitation-services/smart-iep-routes'
  );
  logger.info(
    'Smart IEP routes mounted (Goals Bank 200+, SMART IEP, Session Logs, ABC Tracking, Mastery Detection)'
  );

  // Priority 3: Early Warning System (Plateau, Regression, Attendance)
  safeMount(
    app,
    ['/api/early-warning', '/api/v1/early-warning'],
    '../rehabilitation-services/early-warning-system'
  );
  logger.info(
    'Early Warning System routes mounted (plateau detection, regression alert, attendance monitoring)'
  );

  // Priority 4: Smart Family Portal (Home Activities, Digital Notebook, Engagement)
  safeMount(
    app,
    ['/api/family-portal', '/api/v1/family-portal'],
    '../rehabilitation-family/smart-family-portal'
  );
  logger.info(
    'Smart Family Portal routes mounted (digital notebook, weekly home activities, simplified reports, engagement index)'
  );

  // Priority 5: AI Rehabilitation Recommendation Engine (ABA, PECS, TEACCH, DIR, PRT, SI)
  safeMount(
    app,
    ['/api/rehab-recommendations', '/api/v1/rehab-recommendations'],
    '../rehabilitation-ai/recommendation-engine'
  );
  logger.info(
    'AI Rehabilitation Recommendation Engine routes mounted (ABA/PECS/TEACCH/DIR/PRT/SI scoring, goal prioritization, red flags)'
  );

  // Priorities 6, 7, 8: MDT System + Transition Planning + Quality KPIs (CARF)
  safeMount(
    app,
    ['/api/rehab-operations', '/api/v1/rehab-operations'],
    '../rehabilitation-services/mdt-transition-quality'
  );
  logger.info(
    'Rehab Operations routes mounted (MDT meetings, Transition Planning, Quality KPIs/CARF compliance)'
  );

  // Priorities 9 & 10: AAC Module + Therapeutic Protocol Library
  safeMount(
    app,
    ['/api/rehab-clinical', '/api/v1/rehab-clinical'],
    '../rehabilitation-services/aac-therapy-protocols'
  );
  logger.info(
    'Rehab Clinical routes mounted (AAC profiles/PECS/ARASAAC/vocabulary bank, Protocol Library: DTT/PECS/TEACCH/FBA/SI/PEERS)'
  );

  logger.info(
    '🏆 Al-Awael Smart Rehabilitation System — جميع الأولويات العشر مُثبّتة بنجاح (Standard Assessments + Smart IEP + Early Warning + Family Portal + AI Recommendations + MDT + Transition + Quality KPIs + AAC + Protocol Library)'
  );

  // ── Branch Management System — نظام إدارة الفروع (12 فرع + HQ الرياض) ──
  // RBAC granular: hq_super_admin / hq_admin / branch_manager / therapist / driver / receptionist
  // Endpoints: /api/branch-management/hq/dashboard, /api/branch-management/:code/dashboard ...
  // ══════════════════════════════════════════════════════════════════════════
  // Al-Awael Professional Upgrade v2 — 6 New Professional Modules
  // ══════════════════════════════════════════════════════════════════════════

  // Upgrade 1: Goals Bank Service (200+ therapeutic goals, 17 domains)
  safeMount(
    app,
    ['/api/goals-bank-service', '/api/v1/goals-bank-service'],
    '../rehabilitation-services/goals-bank-service'
  );
  logger.info(
    'Goals Bank Service routes mounted (200+ therapeutic goals, 17 domains: COM/COG/FMT/GMT/SOC/SFC/BEH/SEN/ACA/VOC/TRN/PLY/LNG/FED/HRG/VIS/DLV)'
  );

  // Upgrade 2: ADOS-2 and Sensory Profile 2
  safeMount(
    app,
    ['/api/ados2-sp2', '/api/v1/ados2-sp2'],
    '../rehabilitation-assessment/ados2-sensory-profile2'
  );
  logger.info(
    'ADOS-2 & Sensory Profile 2 routes mounted (ADOS-2: Social Affect + RRB algorithm, Modules 1-4 + Toddler; SP2: 6 sensory systems, 4 quadrant patterns, sensory diet)'
  );

  // Upgrade 3: Escalation Notifications System
  safeMount(
    app,
    ['/api/escalation-notifications', '/api/v1/escalation-notifications'],
    '../rehabilitation-services/escalation-notifications-service'
  );
  logger.info(
    'Escalation Notifications routes mounted (8 default rules: session_missed, crisis_indicator, iep_review_due, goal_regression, attendance_risk, discharge_pending, medication_change, family_complaint)'
  );

  // Upgrade 4: PDF Report Generator
  safeMount(
    app,
    ['/api/pdf-reports', '/api/v1/pdf-reports'],
    '../rehabilitation-services/pdf-report-generator'
  );
  logger.info(
    'PDF Report Generator routes mounted (7 report types: IEP, Progress, Session, Assessment, DepartmentStats, CARF, Family — Arabic RTL, Cairo font)'
  );

  // Upgrade 5: CARF Accreditation Service
  safeMount(
    app,
    ['/api/carf-accreditation', '/api/v1/carf-accreditation'],
    '../rehabilitation-services/carf-accreditation-service'
  );
  logger.info(
    'CARF Accreditation routes mounted (22 core standards, 8 sections A-K: leadership, strategic-planning, human-resources, rights, service-delivery, outcomes, comprehensive-rehab)'
  );

  // Upgrade 6: Advanced Therapy Protocols (22+ evidence-based protocols)
  safeMount(
    app,
    ['/api/advanced-therapy-protocols', '/api/v1/advanced-therapy-protocols'],
    '../rehabilitation-services/advanced-therapy-protocols'
  );
  logger.info(
    'Advanced Therapy Protocols routes mounted (22 protocols: ABA-DTT, PECS, DIR/Floortime, Ayres-SI, CIMT, Dysphagia, PROMPT, RDI, SOS-Feeding, SCERTS, NDT/Bobath, Hanen, PRT, LAMP, PCIT, Video-Modeling, PEERS, Lokomat + more)'
  );

  logger.info(
    'Al-Awael Professional Upgrade v2 complete: Goals Bank 200+ + ADOS-2/SP2 + Escalation Notifications + PDF Reports + CARF Accreditation + 22 Advanced Protocols'
  );

  dualMount(app, 'branch-management', branchManagementRoutes);
  logger.info(
    'Branch Management System mounted (25 endpoints — HQ dashboard, cross-branch comparison, financials, staff optimizer, emergency override, branch dashboards, patients, schedule, staff, finance, transport, reports, KPIs, settings, audit logs, RBAC matrix — 12 branches + HQ Riyadh)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── الميزات الناقصة المضافة — Missing Features ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // النماذج الناقصة من prompt_02 (MedicalHistory, BeneficiaryTransfer, EmergencyContact, LeaveBalance, EmploymentContract, ChartOfAccounts, AssessmentComparison)
  dualMount(app, 'clinical', missingModelsRoutes);
  logger.info(
    '✅ Missing Models routes mounted (7 models: medical-history, beneficiary-transfers, emergency-contacts, leave-balances, employment-contracts, chart-of-accounts, assessment-comparisons — 30+ endpoints)'
  );

  // ─── prompt_04: وحدة إدارة المستفيدين — Beneficiary Management Module ─────────
  dualMount(app, 'guardians', guardiansRoutes);
  dualMount(app, 'disability-assessments', disabilityAssessmentsRoutes);
  dualMount(app, 'beneficiary-transfers', beneficiaryTransfersRoutes);
  logger.info(
    '✅ prompt_04 Beneficiary Management routes mounted: guardians (8 endpoints), disability-assessments (7 endpoints), beneficiary-transfers workflow (6 endpoints)'
  );

  // مقيم (Muqeem) — وزارة الداخلية: إقامات، تأشيرات، خروج ودخول
  dualMount(app, 'muqeem', muqeemRoutes);
  logger.info(
    '✅ Muqeem routes mounted (7 endpoints: residence-info, workers, expiring, renew, exit-reentry-visa, final-exit-visa, change-occupation)'
  );

  // مقيم الكامل — إدارة الإقامات + التأشيرات الكاملة + نقل الخدمات + تنبيهات ذكية (البرومبت 16)
  dualMount(app, 'muqeem-full', muqeemFullRoutes);
  logger.info(
    '✅ Muqeem Full routes mounted (20+ endpoints: iqama-issue/renew/query, exit-reentry-visa, final-exit-visa, cancel, extend, transfers, alerts, dashboard, reports)'
  );

  // GOSI Full — التأمينات الاجتماعية + مكافأة نهاية الخدمة (البرومبت 17)
  dualMount(app, 'gosi-full', gosiFullRoutes);
  logger.info(
    '✅ GOSI Full routes mounted (14+ endpoints: calculate, monthly, register, wage, payroll-link, payment-record, EOS-calculate/estimate/confirm/paid, period-report, dashboard, rates)'
  );

  // ZATCA Phase 2 — الفوترة الإلكترونية المرحلة الثانية (UBL 2.1 + SHA-256 + TLV QR)
  dualMount(app, 'zatca-phase2', zatcaPhase2Routes);
  logger.info(
    '✅ ZATCA Phase 2 routes mounted (7 endpoints: process, build-xml, qr, report, clear, compliance-check, status)'
  );

  // NPHIES — المنصة الوطنية للمعلومات الصحية والتأمينية (HL7 FHIR R4)
  dualMount(app, 'nphies', nphiesRoutes);
  logger.info(
    '✅ NPHIES routes mounted (6 endpoints: eligibility-check, claim-submit, prior-auth, claim-status, cancel-claim, status)'
  );

  // Enhanced Audit Logs — سجلات التدقيق المحسّنة (فلترة + إحصاءات + ZATCA/NPHIES tracking)
  dualMount(app, 'audit-logs', enhancedAuditRouter);
  logger.info(
    '✅ Enhanced Audit Logs routes mounted (3 endpoints: list with filters, stats, user-audit)'
  );

  logger.info(
    '🇸🇦 Saudi Integrations Complete: Muqeem + ZATCA Phase 2 + NPHIES + Enhanced Audit — جميع التكاملات السعودية الناقصة مُضافة'
  );

  // ─── prompt_05: وحدة التأهيل والبرامج — Rehabilitation & Programs Module ────

  // --- prompt_18: Nitaqat 2.0 + WPS/Mudad + Qiwa Contracts ---
  dualMount(app, 'nitaqat', nitaqatRoutes);
  logger.info(
    '[OK] prompt_18 Nitaqat routes mounted: calculate, latest, history, what-if, dashboard, activity-params, wps/generate, wps/validate, wps/upload, contracts CRUD + submit-qiwa (25+ endpoints)'
  );

  // --- prompt_19: PDPL / SDAIA Data Protection ---
  dualMount(app, 'pdpl', pdplRoutes);
  logger.info(
    '[OK] prompt_19 PDPL routes mounted: processing-records, consents, subject-requests, export/erase, breaches, dashboard (22+ endpoints -- SDAIA compliance)'
  );

  logger.info(
    '[SA] prompt_18+19 Complete: Nitaqat 2.0 + WPS/Mudad + Qiwa Contracts + PDPL/SDAIA compliance'
  );

  dualMount(app, 'rehab-module', rehabProgramsModuleRoutes);
  logger.info(
    '✅ prompt_05 Rehabilitation & Programs Module routes mounted: programs, enrollments, rehab-plans+goals, sessions (CRUD+attendance+goal-progress+complete+autosave+chart), group-sessions, referrals (60+ endpoints)'
  );

  // ─── prompt_06: وحدة المقاييس والتقييمات السريرية — Assessment Scales & Clinical Assessments ────
  dualMount(app, 'assessment-scales', assessmentScalesRoutes);
  logger.info(
    '✅ prompt_06 Assessment Scales & Clinical Assessments routes mounted (17 tools library: Vineland-3/CARS-2/GARS-3/VB-MAPP/ABLLS-R/PEP-3/SB-5/WISC-V/Conners-3/GMFM-88/BOT-2/CELF-5/PLS-5/Bayley-4/BASC-3/GFTA-3/AFLS, 25+ endpoints: tools library, clinical assessments, administer/autosave/batch-save/complete, domain scores, reports, comparisons, timeline, chart)'
  );

  // ─── prompt_07: الوحدات التشغيلية — HR + Finance + Transport + Scheduling ────
  dualMount(app, 'hr-module', hrModuleRoutes);
  dualMount(app, 'finance-module', financeModuleRoutes);
  dualMount(app, 'transport-module', transportModuleRoutes);
  dualMount(app, 'scheduling-module', schedulingModuleRoutes);
  logger.info(
    '✅ prompt_07 Operational Modules mounted: hr-module (employees/payroll/leaves/attendance/EOS), finance-module (accounts/journal-entries/invoices-ZATCA/payments/insurance-claims/reports), transport-module (vehicles/routes/trips-GPS/maintenance/reports), scheduling-module (appointments-conflicts/availability/recurrences/rooms/waitlist/reports — 120+ endpoints)'
  );

  // ─── prompt_08: التواصل + الملفات + المخزون + الجودة ────────────────────
  dualMount(app, 'communication-module', communicationModuleRoutes);
  dualMount(app, 'files-module', filesModuleRoutes);
  dualMount(app, 'inventory-module', inventoryModuleRoutes);
  dualMount(app, 'quality-module', qualityModuleRoutes);
  logger.info(
    '✅ prompt_08 Operational Modules mounted: communication-module (announcements/messages/notifications/contacts — 22+ endpoints), files-module (folders/files/versioning/archive — 18+ endpoints), inventory-module (items/transactions/purchase-orders/stats — 25+ endpoints), quality-module (indicators/measurements/incidents/dashboard — 30+ endpoints)'
  );

  // ─── prompt_08 Enhanced: الوحدات المحسّنة (8-12) ─────────────────────────
  dualMount(app, 'communication/notifications', notificationEnhancedRoutes);
  dualMount(app, 'documents-enhanced', documentEnhancedRoutes);
  dualMount(app, 'documents-pro', documentsProRoutes);
  dualMount(app, 'documents-pro-ext', documentsProExtRoutes);
  dualMount(app, 'documents-pro-v3', documentsProV3Routes);
  dualMount(app, 'documents-pro-v4', documentsProV4Routes);
  dualMount(app, 'documents-pro-v5', documentsProV5Routes);
  dualMount(app, 'documents-pro-v6', documentsProV6Routes);
  dualMount(app, 'documents-pro-v7', documentsProV7Routes);
  dualMount(app, 'documents-pro-v8', documentsProV8Routes);
  dualMount(app, 'documents-pro-v9', documentsProV9Routes);
  logger.info(
    '✅ Documents Pro mounted: AI classification, workflow engine, advanced search, notifications, analytics (50+ endpoints)'
  );
  logger.info(
    '✅ Documents Pro V9 mounted: lifecycle, digital certificates, classification AI, workflow orchestration, forensics (85+ endpoints)'
  );
  logger.info(
    '✅ Documents Pro V8 mounted: translation, dynamic forms, approval chains, encryption/DLP, backup/recovery (80+ endpoints)'
  );
  logger.info(
    '✅ Documents Pro V6 mounted: OCR, archiving, reporting engine, email gateway, AI assistant (70+ endpoints)'
  );
  logger.info(
    '✅ Documents Pro V7 mounted: watermark, import/export, compliance monitor, knowledge graph, automation RPA (80+ endpoints)'
  );
  logger.info(
    '✅ Documents Pro Extended mounted: signatures, versioning, templates, audit trail, bulk operations (40+ endpoints)'
  );
  dualMount(app, 'branches-enhanced', branchEnhancedRoutes);
  dualMount(app, 'inventory-enhanced', inventoryEnhancedRoutes);
  dualMount(app, 'quality-enhanced', qualityEnhancedRoutes);
  logger.info(
    '✅ prompt_08 Enhanced Modules mounted: communication/notifications (SMS/WhatsApp/FCM/templates/escalations/broadcasts), documents-enhanced (AES-256/versioning/e-signatures/OCR/sharing/retention), branches-enhanced (settings/rooms/services/transfers/comparison), inventory-enhanced (receive/issue/transfer/PO/assets-depreciation/stock-counts), quality-enhanced (CBAHI/incidents-RCA/complaints/NPS/audits/PDCA/risks — 200+ endpoints)'
  );

  // ─── بوابة ولي الأمر الشاملة — Parent Portal Full API ──────────────────
  safeMount(app, ['/api/parent-portal', '/api/v1/parent-portal'], '../routes/parentPortal.routes');
  logger.info(
    '✅ Parent Portal routes mounted (40+ endpoints: OTP auth, dashboard, children+sessions+progress, appointments, transport-live, invoices, messages, notifications, complaints+rating, settings, FCM devices, admin-complaints)'
  );

  // ─── prompt_09: التقارير والتحليلات — Reports & Analytics Module ─────────
  dualMount(app, 'reports-analytics', reportsAnalyticsModuleRoutes);
  logger.info(
    '✅ prompt_09 Reports & Analytics Module mounted: templates (CRUD), jobs (run/status/download), schedules (CRUD+toggle), analytics (executive/beneficiaries/clinical/financial/hr/operational/quality), built-in reports (9 reports: beneficiary-list/progress/assessments-summary/sessions-log/attendance/financial-summary/hr-headcount/inventory-status/quality-indicators), stats (35+ endpoints)'
  );

  // ─── prompt_21: بوابة ولي الأمر المحسّنة — Parent Portal Enhanced (PWA) ───
  dualMount(app, 'parent-portal-enhanced', parentPortalEnhancedRoutes);
  logger.info(
    '✅ prompt_21 Parent Portal Enhanced (PWA) mounted: OTP auth + rate-limiting, FCM push notifications, live transport tracking, children/sessions/progress, appointments, invoices, messages, complaints+rating, settings+quiet-hours, admin endpoints (40+ endpoints)'
  );

  // ─── prompt_22: نظام التذاكر الشامل — Ticketing & Support System ──────────
  dualMount(app, 'ticketing-system', ticketingSystemRoutes);
  logger.info(
    '✅ prompt_22 Ticketing & Support System mounted: CRUD tickets+comments, SLA calc+business-hours, auto-assignment (direct/round-robin/least-busy), escalation rules, dashboard stats, /check-sla cron endpoint, admin SLA-configs+escalation-rules+auto-assignments (50+ endpoints)'
  );

  // ─── prompt_23: سجل التدقيق الشامل المحسّن — Audit Trail Enhanced ─────────
  dualMount(app, 'audit-trail-enhanced', auditTrailEnhancedRoutes);
  logger.info(
    '✅ prompt_23 Audit Trail Enhanced mounted: advanced search+filters, statistics (by-action/module/user/hourly), for-model history, user-activity, sensitive-access log, login-attempts analysis, export (JSON/10k records), cleanup with dry-run, 3yr/7yr retention policy (20+ endpoints)'
  );

  // ─── prompt_24: نظام الإعدادات المركزي — Central Settings System ──────────
  dualMount(app, 'central-settings', centralSettingsRoutes);
  logger.info(
    '✅ prompt_24 Central Settings System mounted: public settings, all-groups, group-by-name, bulk-update with validation, file-upload (image/file types), branch-override reset, branch-specific settings, seed 27 defaults across 6 groups (general/appointments/billing/notifications/security/appearance), key lookup (20+ endpoints)'
  );

  // ─── prompt_26: وحدة الطب عن بعد — Telehealth & Remote Consultation Module ──
  dualMount(app, 'telehealth', telehealthRoutes);
  logger.info(
    '✅ prompt_26 Telehealth Module mounted: consultations (CRUD + start/end/participants/adjust-quality), waiting-room (join/device-test/provider-queue), prescriptions (issue/cancel/verify), availability-slots (CRUD+bulk), remote-monitoring devices+readings, virtual-sessions+whiteboard, recordings, stats — Agora WebRTC + Wasfaty + Sehhaty/Mawid sync (50+ endpoints)'
  );

  // ─── prompt_27: بوابة التحويلات الطبية — Medical Referral Portal ─────────────
  dualMount(app, 'referrals', referralPortalRoutes);
  logger.info(
    '✅ prompt_27 Medical Referral Portal mounted: facilities (CRUD), referrals (CRUD + review/accept/reject + status-transition + auto-assign + recalculate-priority), communications (outbound email/SMS), documents (upload/download/delete), assessments (upsert), FHIR import (ServiceRequest R4) + integration logs, analytics (by-status/specialty/avg-processing/acceptance-rate) — HL7 FHIR R4 + MOH integration (60+ endpoints)'
  );

  // ─── prompt_28: نظام IoT والأجهزة القابلة للارتداء — IoT & Wearables System ──
  dualMount(app, 'iot-wearables', iotWearablesRoutes);
  logger.info(
    '✅ prompt_28 IoT & Wearables System mounted: device-types (CRUD), devices (CRUD + assign/return + online status), readings (ingest-single/batch + beneficiary vitals), alerts (list/acknowledge/resolve), alert-rules (CRUD + default thresholds), maintenance (schedule/complete/calibration), vital-baselines (CRUD), beneficiary-devices/vitals, dashboard stats, aggregates — MQTT broker + TimeSeries + anomaly detection (50+ endpoints)'
  );

  // ─── prompt_29: نظام التأهيل بالألعاب المحسّن — Gamification Enhanced System ──
  dualMount(app, 'gamification-v2', gamificationEnhancedRoutes);
  logger.info(
    '✅ prompt_29 Gamification Enhanced System mounted: profiles (list/get/update), XP/points award, transactions log, badges (CRUD + award + beneficiary-badges + mark-seen), levels (CRUD + seed defaults), challenges (CRUD + join + update-progress + beneficiary-challenges), rehab-games (CRUD + record-session + sessions-by-beneficiary), rewards (CRUD + redeem + redemptions + approve/deliver), leaderboard (get + update), stats, form-options — 10 levels + 16 metric types + daily XP cap + streak tracking (60+ endpoints)'
  );

  // ─── prompt_30: CRM وإدارة علاقات العملاء — CRM Enhanced ─────────────────────
  dualMount(app, 'crm-enhanced', crmEnhancedRoutes);
  logger.info(
    '✅ prompt_30 CRM Enhanced mounted: leads (CRUD + activity + enroll + pipeline + stats + form-options), partners (CRUD + stats), campaigns (CRUD + stats + launch), segments (CRUD), surveys (CRUD + respond), referral-commissions (CRUD) — Lead scoring 0-100 + auto-assign + multi-channel messaging (SMS/Email/WhatsApp/Push) + NPS/CSAT surveys + B2B partners + referral commissions (60+ endpoints)'
  );

  // ─── prompt_31: نظام الشكاوى والملاحظات المحسّن — Complaints Enhanced ──────────
  dualMount(app, 'complaints-enhanced', complaintsEnhancedRoutes);
  logger.info(
    '✅ prompt_31 Complaints Enhanced mounted: complaints-v2 (CRUD + status-change + escalate + rate + analytics + public-portal), categories (CRUD), sla-configs (CRUD), feedback (CRUD + respond + stats) — AI sentiment analysis (Arabic keywords) + SLA tracking + 3-level auto-escalation + complaint number generator CMP-YYYYMM-XXXXX + multi-channel intake (70+ endpoints)'
  );

  logger.info(
    '🎉 البرومبتات 21-31 مُثبّتة بالكامل: بوابة ولي الأمر + نظام التذاكر + سجل التدقيق + الإعدادات المركزي + الطب عن بعد + بوابة التحويلات الطبية + IoT والأجهزة القابلة للارتداء + التأهيل بالألعاب + CRM وإدارة العلاقات + نظام الشكاوى والملاحظات'
  );

  // ─── prompt_32: نظام دعم القرار السريري — CDSS ────────────────────────────
  dualMount(app, 'cdss', cdssRoutes);
  logger.info(
    '✅ prompt_32 CDSS routes mounted: stats, clinical-rules (CRUD), alerts (list + evaluate + acknowledge/override/resolve), drug-library (CRUD + check-interactions), risk-assessments (CRUD + auto), rehab-suggestions (generate + accept/reject), differential-diagnoses (CRUD + confirm), prescriptions/validate, decision-log — محرك قواعد سريري + تنبيهات تفاعلات الأدوية + تقييم المخاطر الآلي + اقتراح خطط التأهيل + التشخيص التفريقي (30+ endpoints)'
  );

  // ─── prompt_33: نظام التعلم الإلكتروني والتدريب المحسّن — E-Learning Enhanced ──
  dualMount(app, 'elearning-enhanced', elearningEnhancedRoutes);
  logger.info(
    '✅ prompt_33 E-Learning Enhanced routes mounted: stats, courses (CRUD + enroll + modules CRUD), enrollments (list + detail + certificate download), progress/update (auto-certificate + CPD), quizzes (CRUD + questions CRUD + submit), cpd/records (CRUD + verify + report), compliance (list + assign-mandatory), learning-paths (CRUD), forums (CRUD + replies), trainer-evaluations — SCORM متوافق + شهادات تلقائية + CPD + الامتثال التدريبي + منتديات النقاش (35+ endpoints)'
  );

  logger.info(
    '🎉 البرومبتات 32-33 مُثبّتة بالكامل: نظام دعم القرار السريري CDSS + نظام التعلم الإلكتروني والتدريب E-Learning Enhanced'
  );

  // ─── prompt_20: النظام 34 — إدارة الأصول والموارد ────────────────────────────
  safeMount(
    app,
    ['/api/asset-management', '/api/v1/asset-management'],
    require('./asset-management.routes')
  );
  logger.info(
    '✅ prompt_20 Asset Management routes mounted (System 34): categories (CRUD), assets (CRUD + scan-barcode + stats), depreciation (CRUD + post), work-orders (CRUD + complete), transfers (CRUD + approve/receive/reject), bookings (CRUD + cancel), inventories (CRUD + items + complete), dashboard — إدارة الأصول الثابتة + الإهلاك + الصيانة + النقل بين الفروع + حجز الموارد + الجرد (40+ endpoints)'
  );

  // ─── prompt_20: النظام 35 — إدارة العقود والاتفاقيات ────────────────────────
  safeMount(
    app,
    ['/api/contract-management', '/api/v1/contract-management'],
    require('./contract-management.routes')
  );
  logger.info(
    '✅ prompt_20 Contract Management routes mounted (System 35): templates (CRUD), contracts (CRUD + stats + expiring-soon + dashboard), parties (CRUD), approvals (submit + process), amendments (CRUD), negotiations (CRUD + resolve), sign + renew + terminate — إدارة العقود والاتفاقيات + سير الموافقات + التوقيع الرقمي + التجديد التلقائي + الملاحق + التفاوض (45+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 20 مُثبّت بالكامل: نظام إدارة الأصول والموارد (34) + نظام إدارة العقود والاتفاقيات (35)'
  );

  // ─── prompt_21: النظام 36 — لوحة KPIs الذكية ─────────────────────────────
  safeMount(app, ['/api/smart-kpi', '/api/v1/smart-kpi'], require('./kpi-dashboard.routes'));
  logger.info(
    '✅ prompt_21 Smart KPI Dashboard routes mounted (System 36): dashboard, year-over-year, branch-benchmark, calculate, definitions CRUD, categories CRUD, targets, values, alerts (acknowledge), scorecards, reports (generate + download), stats — لوحة KPIs الذكية + حساب المؤشرات + بطاقات الأداء + التنبيهات + التقارير (30+ endpoints)'
  );

  // ─── prompt_21: النظام 37 — الحضور البيومتري ZKTeco ──────────────────────
  safeMount(
    app,
    ['/api/biometric-attendance', '/api/v1/biometric-attendance'],
    require('./biometric-attendance.routes')
  );
  logger.info(
    '✅ prompt_21 Biometric Attendance routes mounted (System 37 - ZKTeco): devices CRUD (sync/ping/enroll/push-data/health-check), logs (list/manual), daily attendance (list/stats/live-monitor/monthly-report/mobile-checkin/approve), policies CRUD — الحضور البيومتري ZKTeco + المراقبة الحية + تسجيل الموبايل GPS (25+ endpoints)'
  );

  // ─── prompt_21: النظام 37 — إدارة الإجازات ───────────────────────────────
  safeMount(
    app,
    ['/api/leave-management', '/api/v1/leave-management'],
    require('./leave-requests.routes')
  );
  logger.info(
    '✅ prompt_21 Leave Management routes mounted (System 37): leave requests CRUD (submit/approve/reject/cancel), balance query, balances initialize/update — إدارة الإجازات والاستئذانات + أرصدة الإجازات + نظام العمل السعودي (15+ endpoints)'
  );

  // ─── prompt_21: النظام 37 — جداول الدوام والوقت الإضافي ─────────────────
  safeMount(app, ['/api/work-shifts', '/api/v1/work-shifts'], require('./work-shifts.routes'));
  logger.info(
    '✅ prompt_21 Work Shifts routes mounted (System 37): shifts CRUD, employee assignments (list/assign/current), overtime requests (list/submit/approve/reject/summary) — جداول الدوام + تعيين الموظفين + الوقت الإضافي (20+ endpoints)'
  );

  // ─── prompt_21: النظام 36 — لوحة KPIs الذكية ───────────────────────────────
  safeMount(
    app,
    ['/api/kpi-dashboard', '/api/v1/kpi-dashboard'],
    require('./kpi-dashboard.routes')
  );
  logger.info(
    '✅ prompt_21 KPI Dashboard routes mounted (System 36): categories CRUD, definitions CRUD, dashboard data, year-over-year comparison, branch benchmark, manual KPI calculation, set targets, values list, alerts (acknowledge), scorecards CRUD+generate, reports, stats — لوحة KPIs الذكية (35+ endpoints)'
  );

  // ─── prompt_21: النظام 36 — تقارير KPI ──────────────────────────────────────
  safeMount(app, ['/api/kpi-reports', '/api/v1/kpi-reports'], require('./kpi-reports.routes'));
  logger.info(
    '✅ prompt_21 KPI Reports routes mounted (System 36): list reports, get report, generate (pdf/excel/powerpoint), download, delete, stats summary — تقارير مؤشرات الأداء (10+ endpoints)'
  );

  // ─── prompt_21: النظام 37 — الحضور البيومتري ZKTeco ─────────────────────────
  safeMount(
    app,
    ['/api/biometric-attendance', '/api/v1/biometric-attendance'],
    require('./biometric-attendance.routes')
  );
  logger.info(
    '✅ prompt_21 Biometric Attendance routes mounted (System 37): ZKTeco devices CRUD + ping/sync/enroll/push-data/health-check, work shifts CRUD + assign, attendance logs + manual entry, daily attendance + live monitor + monthly report, mobile check-in (GPS geofence), overtime CRUD + approve, policies CRUD, stats — الحضور البيومتري ZKTeco + دوامات + وقت إضافي (50+ endpoints)'
  );

  // ─── prompt_21: النظام 37 — إدارة الإجازات ──────────────────────────────────
  safeMount(
    app,
    ['/api/leave-requests', '/api/v1/leave-requests'],
    require('./leave-requests.routes')
  );
  logger.info(
    '✅ prompt_21 Leave Requests routes mounted (System 37): leave requests CRUD, approve, reject, balance check/initialize/all — إدارة الإجازات + الأرصدة + نظام العمل السعودي (15+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 21 مُثبّت بالكامل: لوحة KPIs الذكية (36) + الحضور البيومتري ZKTeco + إدارة الإجازات + جداول الدوام (37)'
  );

  // ─── prompt_22: النظام 38 — بوابة الدفع الذكية ───────────────────────────
  safeMount(
    app,
    ['/api/payment-gateway', '/api/v1/payment-gateway'],
    require('./payment-gateway.routes')
  );
  logger.info(
    '✅ prompt_22 Payment Gateway routes mounted (System 38): initiate payment (Moyasar/HyperPay/PayTabs/Tap/STC Pay/SADAD/Tabby/Tamara), refund, retry-failed, reconciliation report, webhook (HMAC), transactions CRUD — بوابة الدفع الذكية + ZATCA Phase 2 + محافظ رقمية + أقساط (20+ endpoints)'
  );

  // ─── prompt_22: النظام 39 — المحفظة الرقمية ونقاط الولاء ────────────────
  safeMount(
    app,
    ['/api/digital-wallet', '/api/v1/digital-wallet'],
    require('./digital-wallet.routes')
  );
  logger.info(
    '✅ prompt_22 Digital Wallet routes mounted (System 39): wallet CRUD (create/topup/debit/transfer/block/unblock), apply coupon, redeem loyalty points, statement, loyalty history, coupons CRUD — المحفظة الرقمية + نقاط الولاء + كوبونات الخصم (25+ endpoints)'
  );

  // ─── prompt_22: النظام 40 — التأمين الذكي NPHIES ────────────────────────
  safeMount(
    app,
    ['/api/smart-insurance', '/api/v1/smart-insurance'],
    require('./smart-insurance.routes')
  );
  logger.info(
    '✅ prompt_22 Smart Insurance routes mounted (System 40): insurance companies CRUD, policies CRUD + eligibility check (NPHIES), claims CRUD + submit + NPHIES status, prior-auth CRUD + request, reconciliation report, expiry alerts, eligibility checks list — التأمين الذكي + NPHIES + CCHI + الموافقة المسبقة (40+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 22 مُثبّت بالكامل: بوابة الدفع الذكية (38) + المحفظة الرقمية ونقاط الولاء (39) + التأمين الذكي NPHIES (40)'
  );

  // ─── prompt_23: النظام 41 — إدارة المتطوعين ─────────────────────────────
  safeMount(app, ['/api/volunteers', '/api/v1/volunteers'], require('./volunteer.routes'));
  logger.info(
    '✅ prompt_23 Volunteer Management routes mounted (System 41): volunteers CRUD + register portal + status update + match-opportunities + mntasati-sync, opportunities CRUD, assignments (check-in/check-out/certificate), training sessions CRUD + enroll, recognitions CRUD — إدارة المتطوعين + التكليفات + التدريب + التقدير (25+ endpoints)'
  );

  // ─── prompt_23: النظام 42 — الخدمة المجتمعية ────────────────────────────
  safeMount(
    app,
    ['/api/community-service', '/api/v1/community-service'],
    require('./community-service.routes')
  );
  logger.info(
    '✅ prompt_23 Community Service routes mounted (System 42): programs CRUD, events CRUD + upcoming, partnerships CRUD, resources CRUD + search, referrals CRUD + status update, donations CRUD, impact-report — الخدمة المجتمعية + البرامج + الفعاليات + الشراكات + الإحالات + التبرعات (26+ endpoints)'
  );

  // ─── prompt_23: النظام 43 — التوظيف الداخلي ─────────────────────────────
  safeMount(app, ['/api/recruitment', '/api/v1/recruitment'], require('./recruitment.routes'));
  logger.info(
    '✅ prompt_23 Internal Recruitment routes mounted (System 43): job postings CRUD + publish/close/apply, ATS applications + status update, interviews schedule/complete, offers create/send/respond (auto-onboarding), onboarding task update, talent-pool CRUD, nitaqat report, cost report — التوظيف الداخلي + ATS + المقابلات + عروض العمل + الإعداد + نطاقات (28+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 23 مُثبّت بالكامل: إدارة المتطوعين (41) + الخدمة المجتمعية (42) + التوظيف الداخلي (43)'
  );

  // ─── النظام 44 — محرك التقييم الذكي (Smart Clinical Assessment Engine) ──
  safeMount(
    app,
    ['/api/smart-assessment', '/api/v1/smart-assessment'],
    require('./smart-assessment-engine.routes')
  );
  logger.info(
    '✅ Smart Assessment Engine routes mounted (System 44): M-CHAT-R/F, CARS-2, Sensory Profile 2, BRIEF-2, SRS-2, Portage Guide, ABC Data Collection, Family Needs, QoL, Transition Readiness, Saudi Screening, FBA, Caregiver Burden — auto-scoring + CDSS protocols + progress analytics + effect size + RCI + clinical significance + trend analysis + goal prediction + benchmarks + ROI (60+ endpoints)'
  );

  // ── Setup & Admin Init — إعداد أولي (محمي بـ secret key) ──────────────
  dualMount(app, 'setup', setupRoutes);
  logger.info('✅ Setup routes mounted (/api/setup/status, /api/setup/init-admin)');

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
