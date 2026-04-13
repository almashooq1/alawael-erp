/**
 * HR, Employee & Workforce Sub-Registry
 * سجل مسارات الموارد البشرية وشؤون الموظفين
 * ══════════════════════════════════════════════════════════════════════════
 * ~25 modules: HR System, HR Advanced, HR Unified, HR Attendance Engine,
 * HR Insurance, HR Smart, HR Module, Employee Affairs (4 phases),
 * Compensation, Benefits, Gratuity, Succession Planning,
 * Attendance, Smart Attendance, ZKTeco Biometric,
 * Employee Portal, Employee Profiles, Workforce Analytics,
 * Biometric Attendance, Leave Management, Leave Requests, Work Shifts
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all HR, employee & workforce routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerHrRoutes(app, { safeRequire, dualMount, safeMount, logger }) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Imports (all via safeRequire) ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const hrSystemRouter = safeRequire('../routes/hrSystem.real.routes');
  // PHANTOM: const hrAdvancedRoutes = safeRequire('../routes/hrAdvanced.routes');
  // PHANTOM: const hrUnifiedRoutes = safeRequire('../routes/hrUnified.routes');
  const hrAttendanceRoutes = safeRequire('../routes/hr-attendance.routes');
  const hrInsuranceRoutes = safeRequire('../routes/hr-insurance.routes');
  // PHANTOM: const hrSmartRoutes = safeRequire('../routes/hr-smart.routes');
  const hrModuleRoutes = safeRequire('../routes/hr-module.routes');
  const employeeAffairsRoutes = safeRequire('../routes/employeeAffairs.routes');
  // PHANTOM: const employeeAffairsExpandedRoutes = safeRequire('../routes/employee-affairs-expanded.routes');
  // PHANTOM: const employeeAffairsPhase2Routes = safeRequire('../routes/employee-affairs-phase2.routes');
  // PHANTOM: const employeeAffairsPhase3Routes = safeRequire('../routes/employee-affairs-phase3.routes');
  const compensationRouter = safeRequire('../routes/compensation.real.routes');
  // PHANTOM: const compensationBenefitsRoutes = safeRequire('../routes/compensationBenefits.routes');
  const gratuityRoutes = safeRequire('../routes/gratuity.routes');
  const successionPlanningRoutes = safeRequire('../routes/successionPlanning.routes');
  const attendanceRoutes = safeRequire('../routes/attendance.routes');
  const smartAttendanceRoutes = safeRequire('../routes/smart_attendance.routes');
  const zktecoRoutes = safeRequire('../routes/zkteco.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Core HR System ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-system', hrSystemRouter);
  // PHANTOM-FIX: dualMount(app, 'hr-advanced', hrAdvancedRoutes);
  // PHANTOM-FIX: dualMount(app, 'hr-unified', hrUnifiedRoutes);
  dualMount(app, 'compensation', compensationRouter);
  // PHANTOM-FIX: dualMount(app, 'compensation-benefits', compensationBenefitsRoutes);
  dualMount(app, 'gratuity', gratuityRoutes);
  dualMount(app, 'succession-planning', successionPlanningRoutes);
  logger.info(
    '[HR] Core HR mounted (hr-system, compensation, gratuity, succession-planning — hr-advanced, hr-unified, compensation-benefits skipped: phantom)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Attendance Engine (محرك الحضور والورديات الموحد) ─────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-attendance', hrAttendanceRoutes);
  dualMount(app, 'attendance', attendanceRoutes);
  dualMount(app, 'smart-attendance', smartAttendanceRoutes);
  dualMount(app, 'zkteco', zktecoRoutes);
  logger.info(
    '[HR] Attendance Engine mounted (hr-attendance, attendance, smart-attendance, zkteco — 20+ endpoints)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Insurance Integration (تكامل تأمين الموظفين الصحي) ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-insurance', hrInsuranceRoutes);
  logger.info('[HR] HR Insurance integration routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Smart System — AI, Analytics, Onboarding, Documents ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: dualMount(app, 'hr-smart', hrSmartRoutes);
  logger.info(
    '[HR] HR Smart routes SKIPPED (phantom import)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Employee Affairs (4 phases — شؤون الموظفين) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'employee-affairs', employeeAffairsRoutes);
  // PHANTOM-FIX: dualMount(app, 'employee-affairs-expanded', employeeAffairsExpandedRoutes);
  // PHANTOM-FIX: dualMount(app, 'employee-affairs-phase2', employeeAffairsPhase2Routes);
  // PHANTOM-FIX: dualMount(app, 'employee-affairs-phase3', employeeAffairsPhase3Routes);
  logger.info(
    '[HR] Employee Affairs mounted (base only — expanded, phase2, phase3 skipped: phantom)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Module (prompt_07) ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-module', hrModuleRoutes);
  logger.info('[HR] HR Module (prompt_07) mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Employee Portal & Profiles ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/employee-portal', '/api/v1/employee-portal'],
    '../routes/employeePortal.routes'
  );
  safeMount(
    app,
    ['/api/employee-profiles', '/api/v1/employee-profiles'],
    '../routes/employeeProfile'
  );
  logger.info('[HR] Employee Portal + Profiles mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Workforce Analytics & Planning ─────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/workforce-analytics', '/api/v1/workforce-analytics'],
    '../routes/workforce-analytics.routes'
  );
  logger.info('[HR] Workforce Analytics mounted (Phase 21)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Biometric Attendance ZKTeco (System 37) ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/biometric-attendance', '/api/v1/biometric-attendance'],
    './biometric-attendance.routes'
  );
  logger.info(
    '[HR] Biometric Attendance mounted (System 37 - ZKTeco: devices, logs, daily-attendance, policies — 25+ endpoints)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Leave Management (System 37) ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(app, ['/api/leave-management', '/api/v1/leave-management'], './leave-requests.routes');
  safeMount(app, ['/api/leave-requests', '/api/v1/leave-requests'], './leave-requests.routes');
  logger.info('[HR] Leave Management + Leave Requests mounted (System 37 — 15+ endpoints)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Work Shifts & Overtime (System 37) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(app, ['/api/work-shifts', '/api/v1/work-shifts'], './work-shifts.routes');
  logger.info(
    '[HR] Work Shifts mounted (System 37 — shifts, assignments, overtime — 20+ endpoints)'
  );

  logger.info('[HR] All ~25 HR/Employee/Workforce modules mounted successfully');
};
