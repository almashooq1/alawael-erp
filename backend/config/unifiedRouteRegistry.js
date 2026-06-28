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
