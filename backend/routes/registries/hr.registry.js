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
  const hrSystemRouter = safeRequire('../routes/hrSystem.routes');
  const hrAdvancedRoutes = safeRequire('../routes/hrAdvanced.routes');
  const hrUnifiedRoutes = safeRequire('../routes/hrUnified.routes');
  const hrAttendanceRoutes = safeRequire('../routes/hr-attendance.routes');
  const hrInsuranceRoutes = safeRequire('../routes/hr-insurance.routes');
  const hrSmartRoutes = safeRequire('../routes/hr-smart.routes');
  const hrModuleRoutes = safeRequire('../routes/hr-module.routes');
  const employeeAffairsRoutes = safeRequire('../routes/employeeAffairs.routes');
  const employeeAffairsExpandedRoutes = safeRequire('../routes/employee-affairs-expanded.routes');
  const employeeAffairsPhase2Routes = safeRequire('../routes/employee-affairs-phase2.routes');
  const employeeAffairsPhase3Routes = safeRequire('../routes/employee-affairs-phase3.routes');
  const compensationRouter = safeRequire('../routes/compensation.routes');
  const compensationBenefitsRoutes = safeRequire('../routes/compensationBenefits.routes');
  const gratuityRoutes = safeRequire('../routes/gratuity.routes');
  const successionPlanningRoutes = safeRequire('../routes/successionPlanning.routes');
  const attendanceRoutes = safeRequire('../routes/attendance.routes');
  const smartAttendanceRoutes = safeRequire('../routes/smart_attendance.routes');
  const zktecoRoutes = safeRequire('../routes/zkteco.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Core HR System ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-system', hrSystemRouter);
  dualMount(app, 'hr-advanced', hrAdvancedRoutes);
  dualMount(app, 'hr-unified', hrUnifiedRoutes);
  dualMount(app, 'compensation', compensationRouter);
  dualMount(app, 'compensation-benefits', compensationBenefitsRoutes);
  dualMount(app, 'gratuity', gratuityRoutes);
  dualMount(app, 'succession-planning', successionPlanningRoutes);
  logger.info(
    '[HR] Core HR mounted (hr-system, hr-advanced, hr-unified, compensation, compensation-benefits, gratuity, succession-planning)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Attendance Engine (محرك الحضور والورديات الموحد) ─────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-attendance', hrAttendanceRoutes);
  dualMount(app, 'attendance', attendanceRoutes);
  dualMount(app, 'smart-attendance', smartAttendanceRoutes);
  dualMount(app, 'zkteco', zktecoRoutes);
  // Note: biometric-attendance is already mounted via safeMount lower in
  // this file (see ~line 140). The W217 add here was a duplicate caused
  // by a flawed dead-route audit; reverted 2026-05-21.
  logger.info(
    '[HR] Attendance Engine mounted (hr-attendance, attendance, smart-attendance, zkteco)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Insurance Integration (تكامل تأمين الموظفين الصحي) ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-insurance', hrInsuranceRoutes);
  logger.info('[HR] HR Insurance integration routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Smart System — AI, Analytics, Onboarding, Documents ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'hr-smart', hrSmartRoutes);
  logger.info('[HR] HR Smart routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Employee Affairs (4 phases — شؤون الموظفين) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'employee-affairs', employeeAffairsRoutes);
  dualMount(app, 'employee-affairs-expanded', employeeAffairsExpandedRoutes);
  dualMount(app, 'employee-affairs-phase2', employeeAffairsPhase2Routes);
  dualMount(app, 'employee-affairs-phase3', employeeAffairsPhase3Routes);
  logger.info(
    '[HR] Employee Affairs mounted (base, expanded, phase2, phase3 — all 4 phases active)'
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
  logger.info('[HR] Employee Portal mounted');

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

  // ══════════════════════════════════════════════════════════════════════════
  // ── HR Webhook subscriptions (W825 — admin CRUD, manager tier) ───────────
  // ══════════════════════════════════════════════════════════════════════════
  const hrWebhooksMod = safeRequire('../routes/hr/hr-webhooks.routes');
  const HrWebhookSubscription = safeRequire('../models/HR/HrWebhookSubscription');
  if (hrWebhooksMod?.createHrWebhooksRouter && HrWebhookSubscription) {
    const hrWebhooksRouter = hrWebhooksMod.createHrWebhooksRouter({
      subscriptionModel: HrWebhookSubscription,
      logger,
    });
    app.use('/api/hr', hrWebhooksRouter);
    app.use('/api/v1/hr', hrWebhooksRouter);
    logger.info('[HR] HR webhooks admin mounted (/api/hr/webhooks/*, manager tier)');
  } else {
    logger.warn('[HR] HR webhooks not mounted (factory or HrWebhookSubscription missing)');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Pay-equity analysis (W1193 — demographic pay-gap + cohort outliers) ───
  // Self-authenticating (router.use(authenticateToken)+requireBranchAccess) so a
  // plain app.use mount is safe; salary reads are role-gated + branch-isolated.
  // ══════════════════════════════════════════════════════════════════════════
  const payEquityRouter = safeRequire('../routes/hr/pay-equity.routes');
  if (payEquityRouter) {
    app.use('/api/hr/pay-equity', payEquityRouter);
    app.use('/api/v1/hr/pay-equity', payEquityRouter);
    logger.info('[HR] Pay-equity analysis mounted (/api/(v1/)?hr/pay-equity)');
  } else {
    logger.warn('[HR] Pay-equity routes not mounted (module missing)');
  }

  // ── 9-box talent matrix (W1198 — performance × potential placement) ───────
  // Self-authenticating; salary-free but identity-bearing reads are role-gated.
  const talentGridRouter = safeRequire('../routes/hr/talent-grid.routes');
  if (talentGridRouter) {
    app.use('/api/hr/talent-grid', talentGridRouter);
    app.use('/api/v1/hr/talent-grid', talentGridRouter);
    logger.info('[HR] Talent grid (9-box) mounted (/api/(v1/)?hr/talent-grid)');
  } else {
    logger.warn('[HR] Talent grid routes not mounted (module missing)');
  }

  // ── Diversity & Inclusion analytics (W1199 — composition + indices + Saudization) ─
  // Self-authenticating; aggregate-only (no salaries/identities), role-gated reads.
  const diversityRouter = safeRequire('../routes/hr/diversity.routes');
  if (diversityRouter) {
    app.use('/api/hr/diversity', diversityRouter);
    app.use('/api/v1/hr/diversity', diversityRouter);
    logger.info('[HR] Diversity & Inclusion analytics mounted (/api/(v1/)?hr/diversity)');
  } else {
    logger.warn('[HR] Diversity routes not mounted (module missing)');
  }

  logger.info('[HR] All ~25 HR/Employee/Workforce modules mounted successfully');
};
