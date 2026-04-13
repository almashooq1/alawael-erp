/**
 * Student & Parent Portal Sub-Registry
 * سجل مسارات بوابة الطالب وولي الأمر
 * ══════════════════════════════════════════════════════════════════════════
 * ~12 modules: Students, Student Reports, Student Management,
 * Student Complaints, Student Certificates, Student Health Tracker,
 * Student Rewards Store, Student Events, Student E-Learning,
 * Parents, Guardian Portal, Parent Portal, Parent Portal Enhanced
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all student & parent portal routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerStudentParentRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Imports ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const studentsRouter = safeRequire('../routes/students.real.routes');
  const studentReportsRouter = safeRequire('../routes/studentReports.real.routes');
  // PHANTOM: const studentMgmtRoutes = safeRequire('../routes/student-management.routes');
  // PHANTOM: const studentComplaintsRoutes = safeRequire('../routes/student-complaints.routes');
  // PHANTOM: const studentCertificatesRoutes = safeRequire('../routes/student-certificates.routes');
  // PHANTOM: const studentHealthTrackerRoutes = safeRequire('../routes/student-health-tracker.routes');
  // PHANTOM: const studentRewardsStoreRoutes = safeRequire('../routes/student-rewards-store.routes');
  // PHANTOM: const studentEventsRoutes = safeRequire('../routes/student-events.routes');
  // PHANTOM: const studentElearningRoutes = safeRequire('../routes/student-elearning.routes');
  const parentsRouter = safeRequire('../routes/parents.real.routes');
  // PHANTOM: const guardianPortalRouter = safeRequire('../routes/guardianPortal.real.routes');
  const parentPortalEnhancedRoutes = safeRequire('../routes/parent-portal-enhanced.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Core Student Routes ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'students', studentsRouter);
  dualMount(app, 'student-reports', studentReportsRouter);
  dualMount(app, 'student-management', studentMgmtRoutes);
  logger.info('[Student] Core student routes mounted (students, reports, management)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Student Portal Extended Services (خدمات بوابة الطالب الموسّعة) ────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'student-complaints', studentComplaintsRoutes);
  dualMount(app, 'student-certificates', studentCertificatesRoutes);
  dualMount(app, 'student-health', studentHealthTrackerRoutes);
  dualMount(app, 'student-rewards', studentRewardsStoreRoutes);
  dualMount(app, 'student-events', studentEventsRoutes);
  dualMount(app, 'student-elearning', studentElearningRoutes);
  logger.info(
    '[Student] Student portal extended services mounted (6 modules: complaints, certificates, health, rewards, events, elearning)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parents & Guardian ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'parents', parentsRouter);
  dualMount(app, 'guardian', guardianPortalRouter);
  logger.info('[Student] Parent & Guardian portal routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parent Portal Full API (بوابة ولي الأمر الشاملة) ──────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(app, ['/api/parent-portal', '/api/v1/parent-portal'], '../routes/parentPortal.routes');
  logger.info(
    '[Student] Parent Portal routes mounted (40+ endpoints: OTP auth, dashboard, children, appointments, transport, invoices, messages, notifications, complaints, settings)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parent Portal Enhanced (PWA — prompt_21) ──────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'parent-portal-enhanced', parentPortalEnhancedRoutes);
  logger.info(
    '[Student] Parent Portal Enhanced (PWA) mounted: OTP auth + rate-limiting, FCM push, live transport tracking (40+ endpoints)'
  );

  logger.info('[Student] All ~12 student/parent portal modules mounted successfully');
};
