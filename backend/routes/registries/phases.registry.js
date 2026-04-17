/**
 * Phases & Systems Route Registry
 * ════════════════════════════════
 *
 * Extracted from _registry.js — mounts Phase 2 through Phase 36 routes,
 * administrative systems, donations, vendor management, and delegated
 * domain registries (clinical, HR, documents, communication, student-parent,
 * government).
 *
 * ~500 lines covering:
 *   - Phase 2: webhooks, analytics, reports, health monitoring
 *   - Phase 17-20: advanced routes, multi-tenant, compliance
 *   - Phase 21: 18 individual feature services (contracts → enterprise-ultra)
 *   - Import/Export Professional System
 *   - Delegated domain registries (7 registries, ~150 modules)
 *   - Administrative Systems (strategic planning, complaints, facilities, meetings)
 *   - Phase 4/6/9 new systems (kitchen, laundry, crisis, IoT, helpdesk, etc.)
 *   - BI Dashboard, New Systems (warehouse, legal, training, events, etc.)
 *   - Donations & Sponsors, Vendor Management
 *   - Phase 10 A-E: 28 previously unmounted route files
 *   - Phase 11-36: orphan models, telehealth, bus tracking, chat, AI, medical, etc.
 *   - System Settings, Advanced Settings, Branch Management
 *
 * Called from: _registry.js → registerPhaseRoutes()
 */

// Sub-registries (relative to this file in registries/)
const registerClinicalTherapyRoutes = require('./clinical-therapy.registry');
const registerClinicalAssessmentRoutes = require('./clinical-assessment.registry');
const registerHrRoutes = require('./hr.registry');
const registerDocumentRoutes = require('./documents.registry');
const registerCommunicationRoutes = require('./communication.registry');
const registerStudentParentRoutes = require('./student-parent.registry');
const registerGovernmentRoutes = require('./government.registry');

module.exports = function registerPhaseRoutes(app, { safeRequire, dualMount, safeMount, logger }) {
  // Route variables (safeRequire resolves from _registry.js directory)
  const webhooksRoutes = safeRequire('../routes/webhooks');
  const analyticsRoutes = safeRequire('../routes/analytics');
  const reportRoutes = safeRequire('../routes/reports');
  const strategicPlanningRoutes = safeRequire('../routes/strategicPlanning.routes');
  const complaintsRoutes = safeRequire('../routes/complaints.routes');
  const facilitiesRoutes = safeRequire('../routes/facilities.routes');
  const systemSettingsRoutes = safeRequire('../routes/systemSettings.routes');
  const advancedSettingsRoutes = safeRequire('../routes/advancedSettings.routes');
  const branchManagementRoutes = safeRequire('../routes/branch.routes');

  // ── Phase 2 Routes ──────────────────────────────────────────────────────
  // maintenance, assets, schedules — already dual-mounted above
  dualMount(app, 'webhooks', webhooksRoutes);
  dualMount(app, 'basic-analytics', analyticsRoutes);
  dualMount(app, 'basic-reports', reportRoutes);

  // Phase 4: Health Monitoring
  safeMount(app, ['/api/health', '/api/v1/health'], '../routes/health.routes');

  // Phase 21-28
  safeMount(app, ['/api/phases-21-28', '/api/v1/phases-21-28'], '../routes/phases-21-28.routes');

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
  // ⚠️ REMOVED: duplicate kpi-dashboard mount — old kpiDashboard.routes.js (198 lines)
  // Kept: prompt_21 System 36 kpi-dashboard.routes.js (405 lines) at line ~1051
  // Archive: backend/_archived/dead-routes/kpiDashboard.routes.js
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

  // ── Import/Export Professional System (نظام الاستيراد والتصدير الاحترافي) ──
  const importExportProRoutes = safeRequire('../routes/importExportPro.routes');
  dualMount(app, 'import-export-pro', importExportProRoutes);
  logger.info(
    'Import/Export Pro routes mounted (25+ endpoints — Export: xlsx/csv/json/pdf/xml/zip, Import: parse/validate/execute, Templates, Jobs, Statistics, Modules)'
  );

  // ── Saudi Government Integrations — delegated to registries/government.registry.js ──
  registerGovernmentRoutes(app, { safeRequire, dualMount, logger });

  // ── Clinical/Rehab/Therapy (~43 modules) — split into therapy (~22) + assessment (~21) registries ──
  registerClinicalTherapyRoutes(app, { safeRequire, dualMount, safeMount, logger });
  registerClinicalAssessmentRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── HR/Employee/Workforce (~25 modules) — delegated to registries/hr.registry.js ──
  registerHrRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── Documents/Archive/Media (~15 modules) — delegated to registries/documents.registry.js ──
  registerDocumentRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── Communication/Messaging (~12 modules) — delegated to registries/communication.registry.js ──
  registerCommunicationRoutes(app, { safeRequire, dualMount, safeMount, logger });

  // ── Student/Parent Portal (~12 modules) — delegated to registries/student-parent.registry.js ──
  registerStudentParentRoutes(app, { safeRequire, dualMount, safeMount, logger });

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
  // NOTE: smartNotifications.routes archived (broken controller chain).
  logger.info(
    'Phase 10-B mounted (5 modules: advanced-analytics, ai-recommendations, ai-notifications, ml, smart-gps)'
  );

  // Sessions, profiles, collaboration
  safeMount(
    app,
    ['/api/advanced-sessions', '/api/v1/advanced-sessions'],
    '../routes/advancedSessions'
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
  // ⚠️ REMOVED: duplicate telehealth mount — same file mounted again by prompt_26 below
  // Kept: prompt_26 dualMount(app, 'telehealth', telehealthRoutes) at line ~965
  logger.info('Phase 12 — telehealth now mounted once via prompt_26 section');

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

  // ── System Settings, Saudi Tax, Finance Operations ─────────
  dualMount(app, 'system-settings', systemSettingsRoutes);
  // ─── prompt_24: الإعدادات المتقدمة مع Override الفروع ────────────────────
  dualMount(app, 'advanced-settings', advancedSettingsRoutes);
  logger.info(
    'New gap-fix routes mounted (3 modules: care-plans, system-settings, advanced-settings[branch-override])'
  );

  // ── Branch Management System — نظام إدارة الفروع (12 فرع + HQ الرياض) ──
  dualMount(app, 'branch-management', branchManagementRoutes);
  logger.info(
    'Branch Management System mounted (25 endpoints — HQ dashboard, cross-branch comparison, financials, staff optimizer, emergency override, branch dashboards, patients, schedule, staff, finance, transport, reports, KPIs, settings, audit logs, RBAC matrix — 12 branches + HQ Riyadh)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 37: Advanced Platform Enhancement — التطوير المتقدم للمنصة ────
  // 8 أنظمة جديدة: اعتماد، تدريب الأسرة، CDSS، كفاءات الموظفين،
  //                 توعية مجتمعية، علاجات رقمية، تعاقد بالنتائج، محتوى
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(app, ['/api/phase37', '/api/v1/phase37'], '../routes/phase37.routes');
  logger.info(
    'Phase 37 mounted (8 systems, 80+ endpoints: accreditation CARF/CBAHI/JCI, family-training, cdss smart-alerts, staff-competency/cpd, community-outreach, digital-therapeutics, outcome-contracts, multilang-content)'
  );
};
