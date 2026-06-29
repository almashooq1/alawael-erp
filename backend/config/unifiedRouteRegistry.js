/**
 * unifiedRouteRegistry.js — Unified Route Registry (Declarative)
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for ALL route mounts.
 * Replaces: app.js direct mounts, _registry.js sub-registries,
 *           phases.registry.js, features.registry.js, and autoMountRoutes.
 *
 * Every route is explicitly declared with:
 *   • path: mount path (e.g., '/api/v1/users')
 *   • file: relative path from backend/ (e.g., 'routes/users.routes')
 *   • auth: boolean — requires authentication?
 *   • roles: string[] — required roles (optional)
 *   • phase: string — phase/wave identifier (e.g., 'core', 'phase29')
 *   • description: string — human-readable description
 *
 * Usage (in app.js, replacing all existing mount logic):
 *   const { mountRegistry } = require('./config/unifiedRouteRegistry');
 *   mountRegistry(app, { logger, routeHealthMonitor });
 */

'use strict';

const path = require('path');

// ─── Route Definition Helpers ────────────────────────────────────────────────

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authGate } = require('../middleware/authUnified');

/**
 * Safely require a module, returning empty router on failure.
 */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    const _isMissing = err.code === 'MODULE_NOT_FOUND' && err.message.includes(modulePath);
    return express.Router(); // empty router
  }
}

// ─── Route Registry ──────────────────────────────────────────────────────────
// Every route in the system is declared here. No route is mounted elsewhere.

const ROUTES = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. HEALTH & PUBLIC (no auth)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/health', file: 'routes/health.routes', auth: false, phase: 'core', description: 'Health probe' },
  { path: '/api/health/live', file: 'routes/health.routes', auth: false, phase: 'core', description: 'Liveness' },
  { path: '/api/health/ready', file: 'routes/health.routes', auth: false, phase: 'core', description: 'Readiness' },
  { path: '/api/build-info', file: 'routes/build-info.routes', auth: false, phase: 'core', description: 'Build info' },
  { path: '/api/landing-config', file: 'routes/landing-config.routes', auth: false, phase: 'core', description: 'Landing config' },
  { path: '/api/docs', file: 'routes/swagger', auth: false, phase: 'core', description: 'Swagger docs' },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. AUTHENTICATION (public)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/auth', file: 'routes/auth.routes', auth: false, phase: 'core', description: 'Auth endpoints' },
  { path: '/api/v1/auth', file: 'routes/auth.routes', auth: false, phase: 'core', description: 'Auth v1' },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. CORE ADMIN (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/users', file: 'api/routes/users.routes', auth: true, roles: ['admin'], phase: 'core', description: 'User management' },
  { path: '/api/v1/modules', file: 'api/routes/modules.routes', auth: true, roles: ['admin'], phase: 'core', description: 'Modules' },
  { path: '/api/v1/admin/beneficiaries', file: 'routes/beneficiary.routes', auth: true, roles: ['admin', 'manager'], phase: 'core', description: 'Beneficiary CRUD' },
  { path: '/api/v1/admin', file: 'routes/admin.routes', auth: true, roles: ['admin'], phase: 'core', description: 'Admin' },
  { path: '/api/v1/user-management', file: 'routes/user-management.routes', auth: true, roles: ['admin'], phase: 'core', description: 'User management' },
  { path: '/api/v1/account', file: 'routes/account.routes', auth: true, phase: 'core', description: 'Account' },
  { path: '/api/v1/monitoring', file: 'routes/monitoring.routes', auth: true, roles: ['admin'], phase: 'core', description: 'Monitoring' },
  { path: '/api/v1/organization', file: 'routes/organization.routes', auth: true, roles: ['admin'], phase: 'core', description: 'Organization' },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. HR SYSTEM (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/hr-system', file: 'routes/hrSystem.routes', auth: true, roles: ['admin', 'hr'], phase: 'hr', description: 'HR system' },
  { path: '/api/v1/hr', file: 'domains/hr/routes/hr.routes', auth: true, roles: ['admin', 'hr'], phase: 'hr', description: 'DDD HR' },
  { path: '/api/v1/payroll', file: 'routes/payroll.routes', auth: true, roles: ['admin', 'finance'], phase: 'hr', description: 'Payroll' },
  { path: '/api/v1/compensation-benefits', file: 'routes/compensationBenefits.routes', auth: true, roles: ['admin', 'finance'], phase: 'hr', description: 'Compensation' },
  { path: '/api/v1/leave-requests', file: 'routes/leave-requests.routes', auth: true, phase: 'hr', description: 'Leave requests' },
  { path: '/api/v1/work-shifts', file: 'routes/work-shifts.routes', auth: true, phase: 'hr', description: 'Work shifts' },
  { path: '/api/v1/contract-management', file: 'routes/contract-management.routes', auth: true, phase: 'hr', description: 'Contracts' },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. DASHBOARDS & REPORTS & VIZ (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/dashboard-v2', file: 'routes/dashboard.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Dashboard V2' },
  { path: '/api/v1/dashboard', file: 'routes/dashboard.stats', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Dashboard stats' },
  { path: '/api/v1/executive', file: 'routes/executive.routes', auth: true, roles: ['admin', 'super_admin', 'manager', 'executive'], phase: 'reports', description: 'Executive Dashboard' },
  { path: '/api/v1/visualization', file: 'routes/visualization.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Visualization' },
  { path: '/api/v1/report-templates', file: 'routes/report-template.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Report templates' },
  { path: '/api/v1/scheduled-reports', file: 'routes/scheduled-report.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Scheduled reports' },
  { path: '/api/v1/reports', file: 'routes/reports-analytics-module.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'Reports module' },
  { path: '/api/v1/bi-dashboard', file: 'routes/bi-dashboard.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'BI Dashboard' },
  { path: '/api/v1/kpi-dashboard', file: 'routes/kpi-dashboard.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'KPI Dashboard' },
  { path: '/api/v1/bi', file: 'routes/bi-analytics.routes', auth: true, roles: ['admin', 'manager', 'analyst', 'finance_manager', 'hr_manager'], phase: 'reports', description: 'BI Analytics Advanced' },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. ZATCA & FINANCE (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/zatca', file: 'routes/zatca.routes', auth: true, roles: ['admin', 'finance'], phase: 'finance', description: 'ZATCA invoices' },
  { path: '/api/v1/admin/zatca-credentials', file: 'routes/zatca-credentials-admin.routes', auth: true, roles: ['admin'], phase: 'finance', description: 'ZATCA credentials' },
  { path: '/api/v1/insurance', file: 'routes/insurance.routes', auth: true, roles: ['admin', 'finance'], phase: 'finance', description: 'Insurance' },
  { path: '/api/v1/saudi-tax', file: 'routes/saudiTax.routes', auth: true, roles: ['admin', 'finance'], phase: 'finance', description: 'Saudi Tax' },

  { path: '/api/v1/gamification', file: 'routes/gamification.routes', auth: true, roles: ['admin', 'therapist', 'doctor', 'manager'], phase: 'clinical', description: 'Gamification system' },
  { path: '/api/v1/sessions', file: 'domains/sessions/routes/sessions.routes', auth: true, phase: 'clinical', description: 'Therapy sessions' },
  { path: '/api/v1/assessments', file: 'domains/assessments/routes/assessments.routes', auth: true, phase: 'clinical', description: 'Assessments' },
  { path: '/api/v1/care-plans', file: 'domains/care-plans/routes/care-plans.routes', auth: true, phase: 'clinical', description: 'Care plans' },
  { path: '/api/v1/goals', file: 'domains/goals/routes/index.routes', auth: true, phase: 'clinical', description: 'Goals' },
  { path: '/api/v1/timeline', file: 'domains/timeline/routes/timeline.routes', auth: true, phase: 'clinical', description: 'Timeline' },
  { path: '/api/v1/referrals', file: 'routes/referrals.routes', auth: true, phase: 'clinical', description: 'Referrals' },
  { path: '/api/v1/emr', file: 'routes/emr.routes', auth: true, roles: ['admin', 'super_admin', 'doctor', 'therapist', 'nurse'], phase: 'clinical', description: 'Electronic Medical Records' },
  { path: '/api/v1/behavior', file: 'domains/behavior/routes/behavior.routes', auth: true, phase: 'clinical', description: 'Behavior' },
  { path: '/api/v1/icf-assessments', file: 'routes/assessment/icfRoutes', auth: true, roles: ['therapist', 'doctor', 'admin'], phase: 'clinical', description: 'ICF Assessments' },
  { path: '/api/v1/rehab', file: 'routes/rehab.routes', auth: true, phase: 'clinical', description: 'Rehab' },
  { path: '/api/v1/rehab-measures', file: 'routes/rehab-measures.routes', auth: true, phase: 'clinical', description: 'Rehab measures' },
  { path: '/api/v1/rehab-templates', file: 'routes/rehab-templates.routes', auth: true, phase: 'clinical', description: 'Rehab templates' },
  { path: '/api/v1/clinical', file: 'routes/clinical.routes', auth: true, roles: ['therapist', 'doctor', 'admin', 'clinical_director'], phase: 'clinical', description: 'Clinical Integration Dashboard' },
  { path: '/api/v1/ai-predictive', file: 'routes/ai-predictive.routes', auth: true, roles: ['therapist', 'doctor', 'admin', 'clinical_director'], phase: 'clinical', description: 'AI Predictive Analytics' },
  { path: '/api/v1/telehealth', file: 'routes/telehealth.routes', auth: true, roles: ['therapist', 'doctor', 'admin'], phase: 'clinical', description: 'Telehealth sessions' },
  { path: '/api/v1/telehealth-v2', file: 'routes/telehealth-v2.routes', auth: true, roles: ['therapist', 'doctor', 'admin'], phase: 'clinical', description: 'Telehealth v2' },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. PHASE 29 — Quality Management (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/fmea', file: 'routes/fmea.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'FMEA' },
  { path: '/api/v1/rca', file: 'routes/rca.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'RCA' },
  { path: '/api/v1/spc', file: 'routes/spc.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'SPC' },
  { path: '/api/v1/pareto-a3', file: 'routes/paretoA3.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Pareto A3' },
  { path: '/api/v1/standards', file: 'routes/standardsTraceability.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Standards' },
  { path: '/api/v1/controlled-documents', file: 'routes/controlledDocument.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Controlled docs' },
  { path: '/api/v1/supplier-quality', file: 'routes/supplierQuality.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Supplier quality' },
  { path: '/api/v1/calibration', file: 'routes/calibration.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Calibration' },
  { path: '/api/v1/change-control', file: 'routes/changeControl.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Change control' },
  { path: '/api/v1/audit-scheduler', file: 'routes/auditScheduler.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Audit scheduler' },
  { path: '/api/v1/coq', file: 'routes/coq.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Cost of quality' },
  { path: '/api/v1/predictive-risk', file: 'routes/predictiveRisk.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Predictive risk' },
  { path: '/api/v1/trend-forecast', file: 'routes/trendForecast.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Trend forecast' },
  { path: '/api/v1/quality-narrative', file: 'routes/qualityNarrative.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Quality narrative' },
  { path: '/api/v1/benchmarks', file: 'routes/benchmark.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Benchmarks' },
  { path: '/api/v1/quality/command-center', file: 'routes/qualityCommandCenter.routes', auth: true, roles: ['admin', 'quality'], phase: 'phase29', description: 'Quality command center' },

  { path: '/api/v1/compliance', file: 'routes/compliance.routes', auth: true, roles: ['admin', 'quality_manager', 'compliance_officer', 'manager'], phase: 'phase29', description: 'Compliance & accreditation' },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. DDD DOMAINS (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/core', file: 'domains/core/routes/core.routes', auth: true, phase: 'ddd', description: 'DDD Core' },
  { path: '/api/v1/workflow', file: 'domains/workflow/routes/workflow.routes', auth: true, phase: 'ddd', description: 'Workflow' },
  { path: '/api/v1/programs', file: 'domains/programs/routes/programs.routes', auth: true, phase: 'ddd', description: 'Programs' },
  { path: '/api/v1/ai-recommendations', file: 'domains/ai-recommendations/routes/recommendations.routes', auth: true, phase: 'ddd', description: 'AI recommendations' },
  { path: '/api/v1/family', file: 'domains/family/routes/family.routes', auth: true, phase: 'ddd', description: 'Family' },
  { path: '/api/v1/group-therapy', file: 'domains/group-therapy/routes/group-therapy.routes', auth: true, phase: 'ddd', description: 'Group therapy' },
  { path: '/api/v1/tele-rehab', file: 'domains/tele-rehab/routes/tele-rehab.routes', auth: true, phase: 'ddd', description: 'Tele-rehab' },
  { path: '/api/v1/ar-vr', file: 'domains/ar-vr/routes/ar-vr.routes', auth: true, phase: 'ddd', description: 'AR/VR' },
  { path: '/api/v1/field-training', file: 'domains/field-training/routes/field-training.routes', auth: true, phase: 'ddd', description: 'Field training' },
  { path: '/api/v1/research', file: 'domains/research/routes/research.routes', auth: true, phase: 'ddd', description: 'Research' },
  { path: '/api/v1/dashboards', file: 'domains/dashboards/routes/dashboards.routes', auth: true, phase: 'ddd', description: 'DDD Dashboards' },
  { path: '/api/v1/quality', file: 'domains/quality/routes/quality.routes', auth: true, phase: 'ddd', description: 'DDD Quality' },
  { path: '/api/v1/reports', file: 'domains/reports/routes/reports.routes', auth: true, phase: 'ddd', description: 'DDD Reports' },
  { path: '/api/v1/security/domain', file: 'domains/security/routes/security-rbac.routes', auth: true, roles: ['admin'], phase: 'ddd', description: 'Security RBAC' },
  { path: '/api/v1/notifications', file: 'domains/notifications/routes/notifications.routes', auth: true, phase: 'ddd', description: 'DDD Notifications' },
  { path: '/api/v1/tasks', file: 'routes/tasks.routes', auth: true, phase: 'ddd', description: 'Tasks' },
  { path: '/api/v1/therapist-extended', file: 'routes/therapist-extended.routes', auth: true, phase: 'ddd', description: 'Therapist extended' },

  // ═══════════════════════════════════════════════════════════════════════
  // 10. WHATSAPP / COMMUNICATIONS (auth required, some public webhooks)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/whatsapp', file: 'routes/whatsapp.routes', auth: true, phase: 'communication', description: 'WhatsApp' },
  { path: '/api/v1/whatsapp-enhanced', file: 'routes/whatsapp-enhanced.routes', auth: true, phase: 'communication', description: 'WhatsApp enhanced' },
  { path: '/api/v1/whatsapp-automation', file: 'routes/whatsapp-automation.routes', auth: true, phase: 'communication', description: 'WhatsApp automation' },
  { path: '/api/v1/whatsapp-insights', file: 'routes/whatsapp-insights.routes', auth: true, phase: 'communication', description: 'WhatsApp insights' },
  { path: '/api/v1/whatsapp-reminders', file: 'routes/whatsapp-reminders.routes', auth: true, phase: 'communication', description: 'WhatsApp reminders' },
  { path: '/api/v1/whatsapp-chatbot', file: 'routes/whatsapp-chatbot.routes', auth: true, roles: ['admin', 'super_admin', 'manager'], phase: 'communication', description: 'WhatsApp chatbot' },
  { path: '/api/v1/communications', file: 'routes/communications.routes', auth: true, phase: 'communication', description: 'Communications' },
  { path: '/api/v1/notifications-log', file: 'routes/notifications-log.routes', auth: true, phase: 'communication', description: 'Notification logs' },
  { path: '/api/v1/email-templates', file: 'routes/email-templates.routes', auth: true, roles: ['admin', 'manager'], phase: 'communication', description: 'Email templates' },
  { path: '/api/v1/push', file: 'routes/push.routes', auth: true, phase: 'communication', description: 'Push notifications' },

  // ═══════════════════════════════════════════════════════════════════════
  // 11. OPERATIONS / PHASE 16 (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/ops/sla', file: 'routes/operations/slaEngine.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'SLA Engine' },
  { path: '/api/v1/ops/work-orders', file: 'routes/operations/workOrder.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Work orders' },
  { path: '/api/v1/ops/facilities', file: 'routes/operations/facility.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Facilities' },
  { path: '/api/v1/ops/purchase-requests', file: 'routes/operations/purchaseRequest.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Purchase requests' },
  { path: '/api/v1/ops/dashboard', file: 'routes/operations/opsDashboard.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Ops dashboard' },
  { path: '/api/v1/ops/meeting-governance', file: 'routes/operations/meetingGovernance.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Meeting governance' },
  { path: '/api/v1/ops/route-optimization', file: 'routes/operations/routeOptimization.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Route optimization' },
  { path: '/api/v1/ops/notification-dispatch', file: 'routes/operations/notificationDispatch.routes', auth: true, roles: ['admin', 'manager'], phase: 'ops', description: 'Notification dispatch' },

  // ═══════════════════════════════════════════════════════════════════════
  // 12. CARE PLATFORM / PHASE 17 (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/care/crm', file: 'routes/care/crm.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Care CRM' },
  { path: '/api/v1/care/social', file: 'routes/care/social.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Care social' },
  { path: '/api/v1/care/home-visits', file: 'routes/care/homeVisit.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Home visits' },
  { path: '/api/v1/care/welfare', file: 'routes/care/welfare.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Welfare' },
  { path: '/api/v1/care/community', file: 'routes/care/community.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Community' },
  { path: '/api/v1/care/psych', file: 'routes/care/psych.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Psych' },
  { path: '/api/v1/care/independence', file: 'routes/care/independence.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Independence' },
  { path: '/api/v1/care/360', file: 'routes/care/beneficiary360.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Beneficiary 360' },
  { path: '/api/v1/care/retention', file: 'routes/care/retention.routes', auth: true, roles: ['admin', 'manager'], phase: 'care', description: 'Retention' },

  // ═══════════════════════════════════════════════════════════════════════
  // 13. SYSTEM SETTINGS & ADMIN (auth required)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/system-settings', file: 'routes/systemSettings.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'System settings' },
  { path: '/api/v1/advanced-settings', file: 'routes/advancedSettings.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'Advanced settings' },
  { path: '/api/v1/branch-management', file: 'routes/branch.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'Branch management' },
  { path: '/api/v1/visitor-auth', file: 'routes/visitor-auth.routes', auth: true, phase: 'admin', description: 'Visitor auth' },

  // ═══════════════════════════════════════════════════════════════════════
  // 14. OTHER SYSTEMS (auth varies)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1/inventory', file: 'routes/inventory-enhanced.routes', auth: true, roles: ['admin', 'manager'], phase: 'inventory', description: 'Inventory' },
  { path: '/api/v1/supply-chain', file: 'routes/supplyChain.routes', auth: true, roles: ['admin', 'manager'], phase: 'inventory', description: 'Supply chain' },
  { path: '/api/v1/ecommerce', file: 'routes/ecommerce.routes', auth: true, phase: 'ecommerce', description: 'E-commerce' },
  { path: '/api/v1/fleet', file: 'routes/registries/fleet.registry', auth: true, phase: 'fleet', description: 'Fleet (registry)' },
  { path: '/api/v1/education', file: 'routes/registries/education.registry', auth: true, phase: 'education', description: 'Education (registry)' },
  { path: '/api/v1/finance', file: 'routes/registries/finance.registry', auth: true, phase: 'finance', description: 'Finance (registry)' },
  { path: '/api/v1/government', file: 'routes/registries/government.registry', auth: true, phase: 'government', description: 'Government (registry)' },
  { path: '/api/v1/cctv', file: 'routes/registries/cctv.registry', auth: true, phase: 'cctv', description: 'CCTV (registry + integration)' },
  { path: '/api/v1/student-parent', file: 'routes/registries/student-parent.registry', auth: true, phase: 'student', description: 'Student/Parent (registry)' },
  { path: '/api/v1/documents', file: 'routes/registries/documents.registry', auth: true, phase: 'documents', description: 'Documents (registry)' },
  { path: '/api/v1/integrations', file: 'routes/integration.routes.minimal', auth: true, phase: 'integration', description: 'Integrations' },
  { path: '/api/v1/webhooks', file: 'routes/webhooks', auth: false, phase: 'integration', description: 'Webhooks' },

  // ═══════════════════════════════════════════════════════════════════════
  // 15. MISC ROUTES (migrated from app.js direct mounts)
  // ═══════════════════════════════════════════════════════════════════════
  { path: '/api/v1', file: 'routes/clinical-legacy-adapter.routes', auth: false, phase: 'legacy', description: 'Clinical legacy adapter' },
  { path: '/api/v1', file: 'routes/stub-missing.routes', auth: false, phase: 'legacy', description: 'Stub missing routes' },
  { path: '/api/v1/landing', file: 'routes/landing-config.routes', auth: false, phase: 'public', description: 'Landing config' },
  { path: '/api/documents-pro/forms', file: 'routes/forms-submission.routes', auth: true, phase: 'forms', description: 'Forms submission' },
  { path: '/api/v1/uploads', file: 'routes/uploads.routes', auth: true, phase: 'files', description: 'Uploads' },
  { path: '/api/v1/public/forms', file: 'routes/public-forms.routes', auth: false, phase: 'public', description: 'Public forms' },
  { path: '/api/v1/public/uploads', file: 'routes/public-uploads.routes', auth: false, phase: 'public', description: 'Public uploads' },
  { path: '/api/v1/admin/notifications-log', file: 'routes/notifications-log.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'Notifications log' },
  { path: '/api/v1/admin/audit', file: 'routes/audit-reviews.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'Audit reviews' },
  { path: '/api/v1/public/visitor', file: 'routes/visitor-auth.routes', auth: false, phase: 'public', description: 'Visitor auth' },
  { path: '/api/v1/student', file: 'routes/student-portal.routes', auth: true, phase: 'student', description: 'Student portal' },
  { path: '/api/v1/yakeen/verify', file: 'routes/yakeen-verification.routes', auth: true, phase: 'government', description: 'Yakeen verification' },
  { path: '/api/v1/wasel/address', file: 'routes/wasel-address.routes', auth: true, phase: 'government', description: 'Wasel address' },
  { path: '/api/v1/webhooks/nphies', file: 'routes/nphies-webhook.routes', auth: false, phase: 'government', description: 'NPHIES webhook' },
  { path: '/api/docs', file: 'routes/openapi-integration.routes', auth: false, phase: 'docs', description: 'OpenAPI docs' },
  { path: '/api/v1/bi', file: 'routes/bi-dashboard.routes', auth: true, roles: ['admin', 'manager'], phase: 'reports', description: 'BI Dashboard' },
  { path: '/api/v1/ai/recommendations', file: 'routes/ai.recommendations.routes', auth: true, phase: 'ai', description: 'AI recommendations' },
  { path: '/api/v1/admin/ops', file: 'routes/admin-ops-dlq.routes', auth: true, roles: ['admin'], phase: 'admin', description: 'Admin ops DLQ' },
  { path: '/api/v1/admin/zatca-credentials', file: 'routes/zatca-credentials-admin.routes', auth: true, roles: ['admin'], phase: 'finance', description: 'ZATCA credentials admin' },
  { path: '/api/v1/recruitment', file: 'routes/recruitment.routes', auth: true, phase: 'hr', description: 'Recruitment' },
  { path: '/api/v1/employee-portal', file: 'routes/employeePortal.routes', auth: true, phase: 'hr', description: 'Employee portal' },
  { path: '/api/v1/employee-affairs', file: 'routes/employeeAffairs.routes', auth: true, phase: 'hr', description: 'Employee affairs' },
  { path: '/api/v1/employee-affairs-expanded', file: 'routes/employee-affairs-expanded.routes', auth: true, phase: 'hr', description: 'Employee affairs expanded' },
  { path: '/api/v1/training', file: 'routes/training.routes', auth: true, phase: 'hr', description: 'Training' },
  { path: '/api/v1/hr/insurance', file: 'routes/hr-insurance.routes', auth: true, phase: 'hr', description: 'HR insurance' },
  { path: '/api/v1/hr-attendance', file: 'routes/hr-attendance.routes', auth: true, phase: 'hr', description: 'HR attendance' },
  { path: '/api/v1/zkteco', file: 'routes/zkteco.routes', auth: true, phase: 'hr', description: 'ZKTeco' },
  { path: '/api/v1/complaints', file: 'routes/complaints.routes', auth: true, phase: 'ops', description: 'Complaints' },
  { path: '/api/v1/iq-assessments', file: 'routes/iq-assessments.routes', auth: true, phase: 'clinical', description: 'IQ assessments', dualMount: true },
  { path: '/api/v1/therapist', file: 'routes/therapist-portal.routes', auth: true, phase: 'clinical', description: 'Therapist portal' },
  { path: '/api/v1/portal', file: 'routes/parent-portal-v1.routes', auth: true, phase: 'student', description: 'Parent portal v1' },
  { path: '/api/v1/parent-portal', file: 'routes/parent-portal.routes', auth: true, roles: ['parent', 'guardian', 'admin', 'super_admin'], phase: 'student', description: 'Parent portal v2' },
  { path: '/api/chat-v2', file: 'routes/chat-v2.routes', auth: true, phase: 'messaging', description: 'Chat v2' },
  // ── 2026-06-29: complete _registry.js -> unified migration (were in dead legacy registries only) ──
  { path: "/api/v1/beneficiary-transfers", file: "routes/beneficiary-transfers.routes", auth: false, phase: "migrated", description: "beneficiary-transfers (legacy migration)", dualMount: true },
  { path: "/api/v1/beneficiary-day-attendance", file: "routes/beneficiary-day-attendance.routes", auth: true, phase: "migrated", description: "beneficiary-day-attendance (legacy migration)", dualMount: true },
  { path: "/api/v1/beneficiary-sections", file: "routes/beneficiary-sections.routes", auth: true, phase: "migrated", description: "beneficiary-sections (legacy migration)", dualMount: true },
  { path: "/api/v1/daily-communication", file: "routes/daily-communication.routes", auth: true, phase: "migrated", description: "daily-communication (legacy migration)", dualMount: true },
  { path: "/api/v1/morning-health-check", file: "routes/morning-health-check.routes", auth: true, phase: "migrated", description: "morning-health-check (legacy migration)", dualMount: true },
  { path: "/api/v1/toileting", file: "routes/toileting.routes", auth: true, phase: "migrated", description: "toileting (legacy migration)", dualMount: true },
  { path: "/api/v1/beneficiary-meals", file: "routes/beneficiary-meals.routes", auth: true, phase: "migrated", description: "beneficiary-meals (legacy migration)", dualMount: true },
  { path: "/api/v1/day-rehab-bus-routes", file: "routes/day-rehab-bus-routes.routes", auth: true, phase: "migrated", description: "day-rehab-bus-routes (legacy migration)", dualMount: true },
  { path: "/api/v1/ministry-report", file: "routes/ministry-report.routes", auth: true, phase: "migrated", description: "ministry-report (legacy migration)", dualMount: true },
  { path: "/api/v1/restraint-seclusion", file: "routes/restraint-seclusion.routes", auth: true, phase: "migrated", description: "restraint-seclusion (legacy migration)", dualMount: true },
  { path: "/api/v1/clinical-crisis", file: "routes/clinical-crisis.routes", auth: true, phase: "migrated", description: "clinical-crisis (legacy migration)", dualMount: true },
  { path: "/api/v1/communication-aid", file: "routes/communication-aid.routes", auth: true, phase: "migrated", description: "communication-aid (legacy migration)", dualMount: true },
  { path: "/api/v1/assistive-device", file: "routes/assistive-device.routes", auth: true, phase: "migrated", description: "assistive-device (legacy migration)", dualMount: true },
  { path: "/api/v1/cbahi", file: "routes/cbahi.routes", auth: true, phase: "migrated", description: "cbahi (legacy migration)", dualMount: true },
  { path: "/api/v1/transition-plan", file: "routes/transition-plan.routes", auth: true, phase: "migrated", description: "transition-plan (legacy migration)", dualMount: true },
  { path: "/api/v1/beneficiary-journey", file: "routes/beneficiary-journey.routes", auth: true, phase: "migrated", description: "beneficiary-journey (legacy migration)", dualMount: true },
  { path: "/api/v1/review-cadence", file: "routes/review-cadence.routes", auth: true, phase: "migrated", description: "review-cadence (legacy migration)", dualMount: true },
  { path: "/api/v1/center-ops", file: "routes/center-ops.routes", auth: true, phase: "migrated", description: "center-ops (legacy migration)", dualMount: true },
  { path: "/api/v1/adaptive-sports", file: "routes/adaptive-sports.routes", auth: true, phase: "migrated", description: "adaptive-sports (legacy migration)", dualMount: true },
  { path: "/api/v1/respite", file: "routes/respite.routes", auth: true, phase: "migrated", description: "respite (legacy migration)", dualMount: true },
  { path: "/api/v1/diet-prescription", file: "routes/diet-prescription.routes", auth: true, phase: "migrated", description: "diet-prescription (legacy migration)", dualMount: true },
  { path: "/api/v1/dysphagia-assessment", file: "routes/dysphagia-assessment.routes", auth: true, phase: "migrated", description: "dysphagia-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/pain-assessment", file: "routes/pain-assessment.routes", auth: true, phase: "migrated", description: "pain-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/physiotherapy-assessment", file: "routes/physiotherapy-assessment.routes", auth: true, phase: "migrated", description: "physiotherapy-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/seating-postural-assessment", file: "routes/seating-postural-assessment.routes", auth: true, phase: "migrated", description: "seating-postural-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/vision-screening", file: "routes/vision-screening.routes", auth: true, phase: "migrated", description: "vision-screening (legacy migration)", dualMount: true },
  { path: "/api/v1/hearing-screening", file: "routes/hearing-screening.routes", auth: true, phase: "migrated", description: "hearing-screening (legacy migration)", dualMount: true },
  { path: "/api/v1/falls-risk-assessment", file: "routes/falls-risk-assessment.routes", auth: true, phase: "migrated", description: "falls-risk-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/pressure-injury", file: "routes/pressure-injury.routes", auth: true, phase: "migrated", description: "pressure-injury (legacy migration)", dualMount: true },
  { path: "/api/v1/sleep-assessment", file: "routes/sleep-assessment.routes", auth: true, phase: "migrated", description: "sleep-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/orientation-mobility", file: "routes/orientation-mobility.routes", auth: true, phase: "migrated", description: "orientation-mobility (legacy migration)", dualMount: true },
  { path: "/api/v1/driving-rehab", file: "routes/driving-rehab.routes", auth: true, phase: "migrated", description: "driving-rehab (legacy migration)", dualMount: true },
  { path: "/api/v1/clinical-safety-summary", file: "routes/clinical-safety-summary.routes", auth: true, phase: "migrated", description: "clinical-safety-summary (legacy migration)", dualMount: true },
  { path: "/api/v1/medication-reconciliation", file: "routes/medication-reconciliation.routes", auth: true, phase: "migrated", description: "medication-reconciliation (legacy migration)", dualMount: true },
  { path: "/api/v1/infection-surveillance", file: "routes/infection-surveillance.routes", auth: true, phase: "migrated", description: "infection-surveillance (legacy migration)", dualMount: true },
  { path: "/api/v1/biomedical-waste", file: "routes/biomedical-waste.routes", auth: true, phase: "migrated", description: "biomedical-waste (legacy migration)", dualMount: true },
  { path: "/api/v1/staff-health", file: "routes/staff-health.routes", auth: true, phase: "migrated", description: "staff-health (legacy migration)", dualMount: true },
  { path: "/api/v1/facility-asset", file: "routes/facility-asset.routes", auth: true, phase: "migrated", description: "facility-asset (legacy migration)", dualMount: true },
  { path: "/api/v1/caregiver-support", file: "routes/caregiver-support-program.routes", auth: true, phase: "migrated", description: "caregiver-support (legacy migration)", dualMount: true },
  { path: "/api/v1/prosthetic-orthotic", file: "routes/prosthetic-orthotic.routes", auth: true, phase: "migrated", description: "prosthetic-orthotic (legacy migration)", dualMount: true },
  { path: "/api/v1/seat-allocation", file: "routes/seat-allocation.routes", auth: true, phase: "migrated", description: "seat-allocation (legacy migration)", dualMount: true },
  { path: "/api/v1/sponsorship", file: "routes/sponsorship.routes", auth: true, phase: "migrated", description: "sponsorship (legacy migration)", dualMount: true },
  { path: "/api/v1/instrumental-swallow", file: "routes/instrumental-swallow.routes", auth: true, phase: "migrated", description: "instrumental-swallow (legacy migration)", dualMount: true },
  { path: "/api/v1/arts-therapy", file: "routes/arts-therapy.routes", auth: true, phase: "migrated", description: "arts-therapy (legacy migration)", dualMount: true },
  { path: "/api/v1/dtt-session", file: "routes/dtt-session.routes", auth: true, phase: "migrated", description: "dtt-session (legacy migration)", dualMount: true },
  { path: "/api/v1/sensory-diet", file: "routes/sensory-diet.routes", auth: true, phase: "migrated", description: "sensory-diet (legacy migration)", dualMount: true },
  { path: "/api/v1/adjunct-therapy", file: "routes/adjunct-therapy.routes", auth: true, phase: "migrated", description: "adjunct-therapy (legacy migration)", dualMount: true },
  { path: "/api/v1/therapy-activity", file: "routes/therapy-activity.routes", auth: true, phase: "migrated", description: "therapy-activity (legacy migration)", dualMount: true },
  { path: "/api/v1/spasticity-injection", file: "routes/spasticity-injection.routes", auth: true, phase: "migrated", description: "spasticity-injection (legacy migration)", dualMount: true },
  { path: "/api/v1/digital-assessment", file: "routes/digital-assessment.routes", auth: true, phase: "migrated", description: "digital-assessment (legacy migration)", dualMount: true },
  { path: "/api/v1/measure-recommendations", file: "routes/measure-recommendations.routes", auth: true, phase: "migrated", description: "measure-recommendations (legacy migration)", dualMount: true },
  { path: "/api/v1/measures", file: "routes/measures-analyze.routes", auth: true, phase: "migrated", description: "measures (legacy migration)", dualMount: true },
  { path: "/api/v1/pickup-authorization", file: "routes/pickup-authorization.routes", auth: true, phase: "migrated", description: "pickup-authorization (legacy migration)", dualMount: true },
  { path: "/api/v1/portfolio", file: "routes/portfolio.routes", auth: true, phase: "migrated", description: "portfolio (legacy migration)", dualMount: true },
  { path: "/api/v1/iep-plan", file: "routes/iep.routes", auth: true, phase: "migrated", description: "iep-plan (legacy migration)", dualMount: true },
  { path: "/api/v1/family-visits", file: "routes/family-visits.routes", auth: true, phase: "migrated", description: "family-visits (legacy migration)", dualMount: true },
  { path: "/api/v1/field-trips", file: "routes/field-trips.routes", auth: true, phase: "migrated", description: "field-trips (legacy migration)", dualMount: true },
  { path: "/api/v1/disability-cards", file: "routes/disability-cards.routes", auth: true, phase: "migrated", description: "disability-cards (legacy migration)", dualMount: true },
  { path: "/api/v1/subsidies", file: "routes/subsidies.routes", auth: true, phase: "migrated", description: "subsidies (legacy migration)", dualMount: true },
  { path: "/api/v1/files", file: "routes/files.routes", auth: true, phase: "migrated", description: "files (legacy migration)", dualMount: true },
  { path: "/api/v1/transport-module", file: "routes/transport-module.routes", auth: false, phase: "migrated", description: "transport-module (legacy migration)", dualMount: true },
  { path: "/api/v1/scheduling-module", file: "routes/scheduling-module.routes", auth: false, phase: "migrated", description: "scheduling-module (legacy migration)", dualMount: true },
  { path: "/api/v1/inventory-module", file: "routes/inventory-module.routes", auth: false, phase: "migrated", description: "inventory-module (legacy migration)", dualMount: true },
  { path: "/api/v1/quality-module", file: "routes/quality-module.routes", auth: false, phase: "migrated", description: "quality-module (legacy migration)", dualMount: true },
  { path: "/api/v1/equity", file: "routes/equity.routes", auth: false, phase: "migrated", description: "equity (legacy migration)", dualMount: true },
  { path: "/api/v1/stories", file: "routes/stories.routes", auth: false, phase: "migrated", description: "stories (legacy migration)", dualMount: true },
  { path: "/api/v1/communication/notifications", file: "routes/notification-enhanced.routes", auth: false, phase: "migrated", description: "communication/notifications (legacy migration)", dualMount: true },
  { path: "/api/v1/branches-enhanced", file: "routes/branch-enhanced.routes", auth: false, phase: "migrated", description: "branches-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/inventory-enhanced", file: "routes/inventory-enhanced.routes", auth: false, phase: "migrated", description: "inventory-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/quality-enhanced", file: "routes/quality-enhanced.routes", auth: false, phase: "migrated", description: "quality-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/reports-analytics", file: "routes/reports-analytics-module.routes", auth: false, phase: "migrated", description: "reports-analytics (legacy migration)", dualMount: true },
  { path: "/api/v1/ticketing-system", file: "routes/ticketing-system.routes", auth: false, phase: "migrated", description: "ticketing-system (legacy migration)", dualMount: true },
  { path: "/api/v1/audit-trail-enhanced", file: "routes/audit-trail-enhanced.routes", auth: false, phase: "migrated", description: "audit-trail-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/audit-trail", file: "routes/audit-trail-enhanced.routes", auth: false, phase: "migrated", description: "audit-trail (legacy migration)", dualMount: true },
  { path: "/api/v1/central-settings", file: "routes/central-settings.routes", auth: false, phase: "migrated", description: "central-settings (legacy migration)", dualMount: true },
  { path: "/api/v1/crm-enhanced", file: "routes/crm-enhanced.routes", auth: false, phase: "migrated", description: "crm-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/complaints-enhanced", file: "routes/complaints-enhanced.routes", auth: false, phase: "migrated", description: "complaints-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/cdss", file: "routes/cdss.routes", auth: false, phase: "migrated", description: "cdss (legacy migration)", dualMount: true },
  { path: "/api/v1/elearning-enhanced", file: "routes/elearning-enhanced.routes", auth: false, phase: "migrated", description: "elearning-enhanced (legacy migration)", dualMount: true },
  { path: "/api/v1/measures-library", file: "routes/measures-library.routes", auth: false, phase: "migrated", description: "measures-library (legacy migration)", dualMount: true },
  { path: "/api/v1/report-center", file: "routes/report-center.routes", auth: false, phase: "migrated", description: "report-center (legacy migration)", dualMount: true },
  { path: "/api/v1/setup", file: "routes/setup.routes", auth: false, phase: "migrated", description: "setup (legacy migration)", dualMount: true },
  { path: "/api/v1/mudad", file: "routes/mudad.routes", auth: false, phase: "migrated", description: "mudad (legacy migration)", dualMount: true },
  { path: "/api/v1/taqat", file: "routes/taqat.routes", auth: false, phase: "migrated", description: "taqat (legacy migration)", dualMount: true },
  { path: "/api/v1/disability-authority", file: "routes/disabilityAuthority.routes", auth: false, phase: "migrated", description: "disability-authority (legacy migration)", dualMount: true },
  { path: "/api/v1/treatment-authorization", file: "routes/treatmentAuthorization.routes", auth: false, phase: "migrated", description: "treatment-authorization (legacy migration)", dualMount: true },
  { path: "/api/v1/family-satisfaction", file: "routes/familySatisfaction.routes", auth: false, phase: "migrated", description: "family-satisfaction (legacy migration)", dualMount: true },
  { path: "/api/v1/noor", file: "routes/noor.routes", auth: false, phase: "migrated", description: "noor (legacy migration)", dualMount: true },
  { path: "/api/v1/muqeem", file: "routes/muqeem.routes", auth: false, phase: "migrated", description: "muqeem (legacy migration)", dualMount: true },
  { path: "/api/v1/muqeem-full", file: "routes/muqeem-full.routes", auth: false, phase: "migrated", description: "muqeem-full (legacy migration)", dualMount: true },
  { path: "/api/v1/gosi-full", file: "routes/gosi-full.routes", auth: false, phase: "migrated", description: "gosi-full (legacy migration)", dualMount: true },
  { path: "/api/v1/nphies", file: "routes/nphies.routes", auth: false, phase: "migrated", description: "nphies (legacy migration)", dualMount: true },
  { path: "/api/v1/nitaqat", file: "routes/nitaqat.routes", auth: false, phase: "migrated", description: "nitaqat (legacy migration)", dualMount: true },
  { path: "/api/v1/admin/capa", file: "routes/capa-admin.routes", auth: true, phase: "quality", description: "CAPA admin", dualMount: true },
  { path: "/api/v1/admin/nphies-claims", file: "routes/nphies-claims.routes", auth: true, phase: "finance", description: "NPHIES claims admin", dualMount: true },
  { path: "/api/v1/admin/insurance-tariffs", file: "routes/insurance-tariffs-admin.routes", auth: true, phase: "finance", description: "Insurance tariffs admin", dualMount: true },
  { path: "/api/v1/admin/pii-access-audit", file: "routes/pii-access-audit-admin.routes", auth: true, phase: "security", description: "PII access audit", dualMount: true },
  { path: "/api/v1/admin/zatca-credentials", file: "routes/zatca-credentials-admin.routes", auth: true, phase: "government", description: "ZATCA credentials admin", dualMount: true },
  { path: "/api/v1/zatca-phase2", file: "routes/zatca-phase2.routes", auth: false, phase: "government", description: "ZATCA Phase 2 e-invoicing", dualMount: true },
  { path: "/api/v1/pdpl", file: "routes/pdpl.routes", auth: false, phase: "government", description: "PDPL retention/compliance", dualMount: true },
  { path: "/api/v1/management-review", file: "routes/managementReview.routes", auth: false, phase: "quality", description: "Management review (CBAHI)", dualMount: true },
  { path: "/api/v1/compliance-calendar", file: "routes/complianceCalendar.routes", auth: false, phase: "quality", description: "Compliance calendar (CBAHI)", dualMount: true },
  { path: "/api/v1/evidence", file: "routes/evidence.routes", auth: false, phase: "quality", description: "Evidence vault (CBAHI)", dualMount: true },
  { path: "/api/v1/voice-log", file: "routes/voice-log.routes", auth: true, phase: "clinical", description: "Beneficiary voice log (CRPD Art 7/12/21)", dualMount: true },
  { path: "/api/v1/decision-rights", file: "routes/decision-rights.routes", auth: true, phase: "clinical", description: "Decision rights assessment (CRPD)", dualMount: true },
  { path: "/api/v1/self-advocacy", file: "routes/self-advocacy.routes", auth: true, phase: "clinical", description: "Self-advocacy plan (CRPD)", dualMount: true },
  { path: "/api/v1/pathway-bundles", file: "routes/pathway-bundles.routes", auth: true, phase: "clinical", description: "Disability pathway bundles (Blueprint 43 R4)", dualMount: true },
  { path: "/api/v1/next-best-action", file: "routes/next-best-action.routes", auth: true, phase: "clinical", description: "Next-best-action CDSS (Blueprint 43 R6)", dualMount: true },
  { path: "/api/v1/outcomes-rollup", file: "routes/outcomes-rollup.routes", auth: true, phase: "clinical", description: "Outcomes roll-up ladder (Blueprint 43)", dualMount: true },
  { path: "/api/v1/launch-readiness", file: "routes/launch-readiness.routes", auth: true, phase: "clinical", description: "Launch-readiness verdict (W1375)", dualMount: true },
  { path: "/api/v1/clinical-pathway", file: "routes/clinical-pathway.routes", auth: true, phase: "clinical", description: "Clinical pathway engine", dualMount: true },
  { path: "/api/v1/guardians", file: "routes/guardians.routes", auth: true, phase: "student", description: "Guardians", dualMount: true },
  { path: "/api/v1/family-home-program", file: "routes/family-home-program.routes", auth: true, phase: "clinical", description: "Family home program", dualMount: true },
  { path: "/api/v1/seizure-log", file: "routes/seizure-log.routes", auth: true, phase: "clinical", description: "Seizure event log (ILAE 2017)", dualMount: true },
  { path: "/api/v1/safeguarding", file: "routes/safeguarding.routes", auth: true, phase: "clinical", description: "Safeguarding concerns (CBAHI)", dualMount: true },
];

// ══════════════════════════════════════════════════════════════════════════
// Mount Function
// ══════════════════════════════════════════════════════════════════════════

/**
 * Mount all routes from the unified registry onto the Express app.
 * @param {Express.Application} app
 * @param {Object} opts
 * @param {Object} opts.logger — Winston logger
 * @param {Object} opts.routeHealthMonitor — RouteHealthMonitor instance
 */
function mountRegistry(app, { logger, routeHealthMonitor }) {
  let mounted = 0;
  let failed = 0;
  let skipped = 0;

  for (const route of ROUTES) {
    const { path: mountPath, file, auth, roles, phase, description, dualMount, factory } = route;

    try {
      let router;

      if (factory) {
        // Factory function: require the module, then call the factory to get router
        const modulePath = path.resolve(__dirname, '..', file);
        const factoryFn = safeRequire(modulePath);
        if (typeof factoryFn === 'function') {
          router = factoryFn();
        } else {
          skipped++;
          logger.debug(`[Registry] SKIPPED (factory not fn): ${mountPath} ← ${file}`);
          continue;
        }
      } else {
        // Standard require
        const fullPath = path.resolve(__dirname, '..', file);
        router = safeRequire(fullPath);
      }

      // Check if router is empty (missing module)
      const isEmpty = router && Array.isArray(router.stack) && router.stack.length === 0;
      if (isEmpty) {
        skipped++;
        logger.debug(`[Registry] SKIPPED (empty): ${mountPath} ← ${file}`);
        continue;
      }

      // Build middleware chain
      const middlewares = [];
      if (auth) {
        if (roles && roles.length > 0) {
          middlewares.push(authGate({ roles }));
        } else {
          middlewares.push(authenticate);
        }
      }

      // Mount: support dualMount (both /api and /api/v1)
      const paths = dualMount
        ? [mountPath.replace('/api/v1/', '/api/'), mountPath]
        : [mountPath];

      for (const p of paths) {
        app.use(p, ...middlewares, router);
      }
      mounted++;

      // Track health
      if (routeHealthMonitor) {
        for (const p of paths) {
          routeHealthMonitor.register({
            path: p,
            router,
            source: `unifiedRouteRegistry (${file})`,
            auth: !!auth,
            phase: phase || 'unknown',
          });
        }
      }

      const pathsLabel = paths.join(' + ');
      logger.debug(`[Registry] MOUNTED: ${pathsLabel} ← ${file} (${description})`);
    } catch (err) {
      failed++;
      logger.warn(`[Registry] FAILED: ${mountPath} ← ${file}: ${err.message}`);
      if (routeHealthMonitor) {
        routeHealthMonitor.warn(`[Registry] Failed: ${mountPath} ← ${file}`);
      }
    }
  }

  logger.info(
    `[UnifiedRegistry] ✓ Mounted ${mounted} routes (${failed} failed, ${skipped} skipped)`
  );

  return { mounted, failed, skipped, total: ROUTES.length };
}

// ══════════════════════════════════════════════════════════════════════════
// Exports
// ══════════════════════════════════════════════════════════════════════════

module.exports = {
  ROUTES,
  mountRegistry,
  getRouteCount: () => ROUTES.length,
  getRoutesByPhase: (phase) => ROUTES.filter(r => r.phase === phase),
  getRoutesByAuth: (auth) => ROUTES.filter(r => r.auth === auth),
  getRoutesByRole: (role) => ROUTES.filter(r => r.roles && r.roles.includes(role)),
};
