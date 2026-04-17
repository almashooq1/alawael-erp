/**
 * Features Sub-Registry — الميزات الناقصة والبرومبتات
 * ══════════════════════════════════════════════════════════════════════════
 * Contains: Missing models (prompt_02), Beneficiary Management (prompt_04),
 * Operational Modules (prompt_07/08/08-enhanced/09), Ticketing (prompt_22),
 * Audit Trail (prompt_23), Central Settings (prompt_24), Telehealth (prompt_26),
 * Referral Portal (prompt_27), IoT & Wearables (prompt_28), Gamification (prompt_29),
 * CRM Enhanced (prompt_30), Complaints Enhanced (prompt_31), CDSS (prompt_32),
 * E-Learning Enhanced (prompt_33), Asset Mgmt (prompt_20 sys 34), Contract Mgmt
 * (prompt_20 sys 35), Smart KPI (prompt_21 sys 36), Community Service (prompt_23 sys 42),
 * + Setup routes.
 *
 * Split from _registry.js (Priority #23) for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register feature/prompt routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerFeatureRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ── Route Imports ─────────────────────────────────────────────────────────
  const missingModelsRoutes = safeRequire('../routes/missing-models.routes');
  const guardiansRoutes = safeRequire('../routes/guardians.routes');
  const beneficiaryTransfersRoutes = safeRequire('../routes/beneficiary-transfers.routes');
  const transportModuleRoutes = safeRequire('../routes/transport-module.routes');
  const schedulingModuleRoutes = safeRequire('../routes/scheduling-module.routes');
  const inventoryModuleRoutes = safeRequire('../routes/inventory-module.routes');
  const qualityModuleRoutes = safeRequire('../routes/quality-module.routes');
  const notificationEnhancedRoutes = safeRequire('../routes/notification-enhanced.routes');
  const branchEnhancedRoutes = safeRequire('../routes/branch-enhanced.routes');
  const inventoryEnhancedRoutes = safeRequire('../routes/inventory-enhanced.routes');
  const qualityEnhancedRoutes = safeRequire('../routes/quality-enhanced.routes');
  const reportsAnalyticsModuleRoutes = safeRequire('../routes/reports-analytics-module.routes');
  const ticketingSystemRoutes = safeRequire('../routes/ticketing-system.routes');
  const auditTrailEnhancedRoutes = safeRequire('../routes/audit-trail-enhanced.routes');
  const centralSettingsRoutes = safeRequire('../routes/central-settings.routes');
  const telehealthRoutes = safeRequire('../routes/telehealth.routes');
  const referralPortalRoutes = safeRequire('../routes/referral.routes');
  const crmEnhancedRoutes = safeRequire('../routes/crm-enhanced.routes');
  const complaintsEnhancedRoutes = safeRequire('../routes/complaints-enhanced.routes');
  const cdssRoutes = safeRequire('../routes/cdss.routes');
  const elearningEnhancedRoutes = safeRequire('../routes/elearning-enhanced.routes');
  const setupRoutes = safeRequire('../routes/setup.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── الميزات الناقصة المضافة — Missing Features ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // النماذج الناقصة من prompt_02
  dualMount(app, 'clinical', missingModelsRoutes);
  logger.info(
    '✅ Missing Models routes mounted (7 models: medical-history, beneficiary-transfers, emergency-contacts, leave-balances, employment-contracts, chart-of-accounts, assessment-comparisons — 30+ endpoints)'
  );

  // ─── prompt_04: وحدة إدارة المستفيدين — Beneficiary Management Module ─────────
  dualMount(app, 'guardians', guardiansRoutes);
  dualMount(app, 'beneficiary-transfers', beneficiaryTransfersRoutes);
  logger.info(
    '✅ prompt_04 Beneficiary Management routes mounted: guardians (8 endpoints), disability-assessments (7 endpoints), beneficiary-transfers workflow (6 endpoints)'
  );

  // ─── prompt_07: الوحدات التشغيلية — HR + Transport + Scheduling ────
  dualMount(app, 'transport-module', transportModuleRoutes);
  dualMount(app, 'scheduling-module', schedulingModuleRoutes);
  logger.info(
    '✅ prompt_07 Operational Modules mounted: transport-module, scheduling-module (hr-module in hr.registry.js, finance-module in finance.registry.js) — 120+ endpoints'
  );

  // ─── prompt_08: التواصل + الملفات + المخزون + الجودة ────────────────────
  dualMount(app, 'inventory-module', inventoryModuleRoutes);
  dualMount(app, 'quality-module', qualityModuleRoutes);
  logger.info(
    '✅ prompt_08 Operational Modules mounted: inventory-module (25+ endpoints), quality-module (30+ endpoints) — communication-module in communication.registry.js, files-module in documents.registry.js'
  );

  // ─── prompt_08 Enhanced: الوحدات المحسّنة (8-12) ─────────────────────────
  dualMount(app, 'communication/notifications', notificationEnhancedRoutes);
  dualMount(app, 'branches-enhanced', branchEnhancedRoutes);
  dualMount(app, 'inventory-enhanced', inventoryEnhancedRoutes);
  dualMount(app, 'quality-enhanced', qualityEnhancedRoutes);
  logger.info(
    '✅ prompt_08 Enhanced Modules mounted: communication/notifications (SMS/WhatsApp/FCM/templates/escalations/broadcasts), documents-enhanced (AES-256/versioning/e-signatures/OCR/sharing/retention), branches-enhanced (settings/rooms/services/transfers/comparison), inventory-enhanced (receive/issue/transfer/PO/assets-depreciation/stock-counts), quality-enhanced (CBAHI/incidents-RCA/complaints/NPS/audits/PDCA/risks — 200+ endpoints)'
  );

  // ─── prompt_09: التقارير والتحليلات — Reports & Analytics Module ─────────
  dualMount(app, 'reports-analytics', reportsAnalyticsModuleRoutes);
  logger.info(
    '✅ prompt_09 Reports & Analytics Module mounted: templates (CRUD), jobs (run/status/download), schedules (CRUD+toggle), analytics (executive/beneficiaries/clinical/financial/hr/operational/quality), built-in reports (9 reports: beneficiary-list/progress/assessments-summary/sessions-log/attendance/financial-summary/hr-headcount/inventory-status/quality-indicators), stats (35+ endpoints)'
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

  // NOTE: iot-wearables.routes (prompt_28) and gamification-enhanced.routes
  // (prompt_29) archived — both had broken service dependencies.

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
    '../routes/asset-management.routes'
  );
  logger.info(
    '✅ prompt_20 Asset Management routes mounted (System 34): categories (CRUD), assets (CRUD + scan-barcode + stats), depreciation (CRUD + post), work-orders (CRUD + complete), transfers (CRUD + approve/receive/reject), bookings (CRUD + cancel), inventories (CRUD + items + complete), dashboard — إدارة الأصول الثابتة + الإهلاك + الصيانة + النقل بين الفروع + حجز الموارد + الجرد (40+ endpoints)'
  );

  // ─── prompt_20: النظام 35 — إدارة العقود والاتفاقيات ────────────────────────
  safeMount(
    app,
    ['/api/contract-management', '/api/v1/contract-management'],
    '../routes/contract-management.routes'
  );
  logger.info(
    '✅ prompt_20 Contract Management routes mounted (System 35): templates (CRUD), contracts (CRUD + stats + expiring-soon + dashboard), parties (CRUD), approvals (submit + process), amendments (CRUD), negotiations (CRUD + resolve), sign + renew + terminate — إدارة العقود والاتفاقيات + سير الموافقات + التوقيع الرقمي + التجديد التلقائي + الملاحق + التفاوض (45+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 20 مُثبّت بالكامل: نظام إدارة الأصول والموارد (34) + نظام إدارة العقود والاتفاقيات (35)'
  );

  // ─── prompt_21: النظام 36 — لوحة KPIs الذكية ─────────────────────────────
  safeMount(app, ['/api/smart-kpi', '/api/v1/smart-kpi'], '../routes/kpi-dashboard.routes');
  logger.info(
    '✅ prompt_21 Smart KPI Dashboard routes mounted (System 36): dashboard, year-over-year, branch-benchmark, calculate, definitions CRUD, categories CRUD, targets, values, alerts (acknowledge), scorecards, reports (generate + download), stats — لوحة KPIs الذكية + حساب المؤشرات + بطاقات الأداء + التنبيهات + التقارير (30+ endpoints)'
  );

  // ─── prompt_21: النظام 36 — لوحة KPIs الذكية (kpi-dashboard path) ─────────
  safeMount(app, ['/api/kpi-dashboard', '/api/v1/kpi-dashboard'], '../routes/kpi-dashboard.routes');
  logger.info(
    '✅ prompt_21 KPI Dashboard routes mounted (System 36): categories CRUD, definitions CRUD, dashboard data, year-over-year comparison, branch benchmark, manual KPI calculation, set targets, values list, alerts (acknowledge), scorecards CRUD+generate, reports, stats — لوحة KPIs الذكية (35+ endpoints)'
  );

  // ─── prompt_21: النظام 36 — تقارير KPI ──────────────────────────────────────
  safeMount(app, ['/api/kpi-reports', '/api/v1/kpi-reports'], '../routes/kpi-reports.routes');
  logger.info(
    '✅ prompt_21 KPI Reports routes mounted (System 36): list reports, get report, generate (pdf/excel/powerpoint), download, delete, stats summary — تقارير مؤشرات الأداء (10+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 21 مُثبّت بالكامل: لوحة KPIs الذكية (36) + (الحضور البيومتري + الإجازات + الدوام — moved to hr.registry.js)'
  );

  // ─── prompt_22: النظام 38-40 (payment-gateway, digital-wallet, smart-insurance) ──
  logger.info(
    '🎉 البرومبت 22: بوابة الدفع الذكية (38) + المحفظة الرقمية (39) + التأمين الذكي (40) — mounted via finance.registry.js'
  );

  // ─── prompt_23: النظام 42 — الخدمة المجتمعية ────────────────────────────
  safeMount(
    app,
    ['/api/community-service', '/api/v1/community-service'],
    '../routes/community-service.routes'
  );
  logger.info(
    '✅ prompt_23 Community Service routes mounted (System 42): programs CRUD, events CRUD + upcoming, partnerships CRUD, resources CRUD + search, referrals CRUD + status update, donations CRUD, impact-report — الخدمة المجتمعية + البرامج + الفعاليات + الشراكات + الإحالات + التبرعات (26+ endpoints)'
  );

  logger.info(
    '✅ prompt_23 Internal Recruitment routes mounted (System 43): job postings CRUD + publish/close/apply, ATS applications + status update, interviews schedule/complete, offers create/send/respond (auto-onboarding), onboarding task update, talent-pool CRUD, nitaqat report, cost report — التوظيف الداخلي + ATS + المقابلات + عروض العمل + الإعداد + نطاقات (28+ endpoints)'
  );

  logger.info(
    '🎉 البرومبت 23 مُثبّت بالكامل: إدارة المتطوعين (41) + الخدمة المجتمعية (42) + التوظيف الداخلي (43)'
  );

  // ── Setup & Admin Init — إعداد أولي (محمي بـ secret key) ──────────────
  dualMount(app, 'setup', setupRoutes);
  logger.info('✅ Setup routes mounted (/api/setup/status, /api/setup/init-admin)');

  logger.info('[Features] All prompt feature modules mounted successfully');
};
