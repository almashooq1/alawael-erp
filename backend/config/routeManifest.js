/**
 * routeManifest.js — Unified Route Manifest
 * ═══════════════════════════════════════════════════════
 * Single source of truth documenting ALL application routes.
 * Generated from the audit performed in Phase 38 Repair.
 *
 * This manifest serves as:
 *   • API documentation
 *   • Smoke test configuration
 *   • Health check reference
 *   • Route registry migration target
 *
 * Structure:
 *   Each entry = { path, method, auth, controller, description, phase }
 */

'use strict';

const ROUTE_MANIFEST = {
  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEALTH & PUBLIC (no auth required)
  // ══════════════════════════════════════════════════════════════════════════
  public: [
    { path: '/health', method: 'GET', auth: false, controller: 'healthProbes', description: 'Server health check' },
    { path: '/health/live', method: 'GET', auth: false, controller: 'healthProbes', description: 'Liveness probe' },
    { path: '/health/ready', method: 'GET', auth: false, controller: 'healthProbes', description: 'Readiness probe' },
    { path: '/api/health/routes', method: 'GET', auth: false, controller: 'routeHealth', description: 'Route health status' },
    { path: '/api/build-info', method: 'GET', auth: false, controller: 'buildInfo', description: 'Build information' },
    { path: '/api/landing-config', method: 'GET', auth: false, controller: 'landingConfig', description: 'Landing page config' },
    { path: '/api/docs', method: 'GET', auth: false, controller: 'swagger', description: 'Swagger/OpenAPI docs' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 2. AUTHENTICATION (public endpoints)
  // ══════════════════════════════════════════════════════════════════════════
  auth: [
    { path: '/api/auth/login', method: 'POST', auth: false, controller: 'auth', description: 'User login' },
    { path: '/api/auth/register', method: 'POST', auth: false, controller: 'auth', description: 'User registration' },
    { path: '/api/auth/refresh', method: 'POST', auth: false, controller: 'auth', description: 'Refresh token' },
    { path: '/api/auth/logout', method: 'POST', auth: false, controller: 'auth', description: 'Logout' },
    { path: '/api/auth/2fa', method: 'POST', auth: false, controller: 'auth', description: '2FA verification' },
    { path: '/api/auth/nafath', method: 'POST', auth: false, controller: 'nafath', description: 'Nafath SSO' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 3. CORE ADMIN (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  admin: [
    { path: '/api/v1/users', method: 'GET', auth: true, roles: ['admin'], controller: 'users', description: 'List users' },
    { path: '/api/v1/users/:id', method: 'GET', auth: true, roles: ['admin'], controller: 'users', description: 'Get user' },
    { path: '/api/v1/admin/beneficiaries', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'beneficiary', description: 'Beneficiary CRUD' },
    { path: '/api/v1/admin/beneficiaries', method: 'POST', auth: true, roles: ['admin', 'manager'], controller: 'beneficiary', description: 'Create beneficiary' },
    { path: '/api/v1/admin/beneficiaries/:id', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'beneficiary', description: 'Get beneficiary' },
    { path: '/api/v1/admin/beneficiaries/:id', method: 'PATCH', auth: true, roles: ['admin', 'manager'], controller: 'beneficiary', description: 'Update beneficiary' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 4. HR SYSTEM (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  hr: [
    { path: '/api/v1/hr-system', method: 'GET', auth: true, roles: ['admin', 'hr'], controller: 'hrSystem', description: 'HR dashboard' },
    { path: '/api/v1/hr/employees', method: 'GET', auth: true, roles: ['admin', 'hr'], controller: 'hr', description: 'Employee list' },
    { path: '/api/v1/hr/employees', method: 'POST', auth: true, roles: ['admin'], controller: 'hr', description: 'Add employee' },
    { path: '/api/v1/hr/attendance', method: 'GET', auth: true, roles: ['admin', 'hr'], controller: 'hr', description: 'Attendance records' },
    { path: '/api/v1/hr/leaves', method: 'GET', auth: true, roles: ['admin', 'hr'], controller: 'hr', description: 'Leave requests' },
    { path: '/api/v1/payroll', method: 'GET', auth: true, roles: ['admin', 'finance'], controller: 'payroll', description: 'Payroll list' },
    { path: '/api/v1/payroll', method: 'POST', auth: true, roles: ['admin', 'finance'], controller: 'payroll', description: 'Create payroll' },
    { path: '/api/v1/compensation-benefits', method: 'GET', auth: true, roles: ['admin', 'finance'], controller: 'compensation', description: 'Compensation' },
    { path: '/api/v1/leave-requests', method: 'GET', auth: true, controller: 'leaveRequests', description: 'Leave requests' },
    { path: '/api/v1/work-shifts', method: 'GET', auth: true, controller: 'workShifts', description: 'Work shifts' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 5. DASHBOARDS & REPORTS (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  dashboards: [
    { path: '/api/v1/dashboard-v2', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'dashboard', description: 'Dashboard V2' },
    { path: '/api/v1/dashboard-v2/widgets', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'dashboard', description: 'Dashboard widgets' },
    { path: '/api/v1/visualization', method: 'POST', auth: true, roles: ['admin', 'manager'], controller: 'visualization', description: 'Chart data' },
    { path: '/api/v1/report-templates', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'reportTemplate', description: 'Report templates' },
    { path: '/api/v1/scheduled-reports', method: 'GET', auth: true, roles: ['admin', 'manager'], controller: 'scheduledReport', description: 'Scheduled reports' },
    { path: '/api/v1/scheduled-reports', method: 'POST', auth: true, roles: ['admin', 'manager'], controller: 'scheduledReport', description: 'Create scheduled report' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 6. ZATCA & FINANCE (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  zatca: [
    { path: '/api/v1/zatca', method: 'GET', auth: true, roles: ['admin', 'finance'], controller: 'zatca', description: 'ZATCA invoices' },
    { path: '/api/v1/zatca/generate', method: 'POST', auth: true, roles: ['admin', 'finance'], controller: 'zatca', description: 'Generate ZATCA invoice' },
    { path: '/api/v1/admin/zatca-credentials', method: 'GET', auth: true, roles: ['admin'], controller: 'zatcaCredentials', description: 'ZATCA credentials' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 7. CLINICAL / THERAPY (auth required, PII)
  // ══════════════════════════════════════════════════════════════════════════
  clinical: [
    { path: '/api/v1/sessions', method: 'GET', auth: true, controller: 'sessions', description: 'Therapy sessions' },
    { path: '/api/v1/sessions', method: 'POST', auth: true, controller: 'sessions', description: 'Create session' },
    { path: '/api/v1/assessments', method: 'GET', auth: true, controller: 'assessments', description: 'Assessments' },
    { path: '/api/v1/care-plans', method: 'GET', auth: true, controller: 'carePlans', description: 'Care plans' },
    { path: '/api/v1/goals', method: 'GET', auth: true, controller: 'goals', description: 'Goals' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 8. PHASE 29 — Quality Management (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  quality: [
    { path: '/api/v1/fmea', method: 'GET', auth: true, roles: ['admin', 'quality'], controller: 'fmea', description: 'FMEA worksheets' },
    { path: '/api/v1/rca', method: 'GET', auth: true, roles: ['admin', 'quality'], controller: 'rca', description: 'RCA analysis' },
    { path: '/api/v1/spc', method: 'GET', auth: true, roles: ['admin', 'quality'], controller: 'spc', description: 'SPC charts' },
    { path: '/api/v1/standards', method: 'GET', auth: true, roles: ['admin', 'quality'], controller: 'standards', description: 'Standards' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 9. DDD DOMAINS (auth required)
  // ══════════════════════════════════════════════════════════════════════════
  ddd: [
    { path: '/api/v1/core', method: 'GET', auth: true, controller: 'core', description: 'DDD Core' },
    { path: '/api/v1/core/beneficiaries', method: 'GET', auth: true, controller: 'core', description: 'Core beneficiaries' },
    { path: '/api/v1/hr', method: 'GET', auth: true, controller: 'hrDomain', description: 'DDD HR' },
    { path: '/api/v1/quality', method: 'GET', auth: true, controller: 'qualityDomain', description: 'DDD Quality' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // 10. WHATSAPP / NOTIFICATIONS (auth required, some public webhooks)
  // ══════════════════════════════════════════════════════════════════════════
  communication: [
    { path: '/api/v1/whatsapp', method: 'GET', auth: true, controller: 'whatsapp', description: 'WhatsApp' },
    { path: '/api/v1/whatsapp', method: 'POST', auth: true, controller: 'whatsapp', description: 'Send WhatsApp' },
    { path: '/api/v1/notifications', method: 'GET', auth: true, controller: 'notifications', description: 'Notifications' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════

function getAllRoutes() {
  const all = [];
  for (const category of Object.values(ROUTE_MANIFEST)) {
    for (const route of category) {
      all.push({ ...route, category: Object.keys(ROUTE_MANIFEST).find(k => ROUTE_MANIFEST[k] === category) });
    }
  }
  return all;
}

function getRoutesByAuth(requireAuth) {
  return getAllRoutes().filter(r => r.auth === requireAuth);
}

function getRoutesByRole(role) {
  return getAllRoutes().filter(r => r.roles && r.roles.includes(role));
}

function getRoutesByPhase(phase) {
  return getAllRoutes().filter(r => r.phase === phase);
}

function getRouteCount() {
  return getAllRoutes().length;
}

module.exports = {
  ROUTE_MANIFEST,
  getAllRoutes,
  getRoutesByAuth,
  getRoutesByRole,
  getRoutesByPhase,
  getRouteCount,
};
