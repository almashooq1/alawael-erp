/**
 * Clinical Therapy & Rehabilitation Sub-Registry
 * سجل مسارات العلاج والتأهيل
 * ══════════════════════════════════════════════════════════════════════════
 * ~22 modules: Therapist Portal (5 tiers), Disability Rehabilitation (2),
 * Rehab Systems (licenses/expansion/pro), Phase 26 Therapy (7),
 * Phases 30–33 Advanced Rehabilitation (4 + plans)
 *
 * Split from clinical.registry.js (Priority #17) for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register therapy & rehabilitation routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerClinicalTherapyRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Therapist Portal (5 Tiers) ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'therapist', safeRequire('../routes/therapist'));
  dualMount(app, 'therapist-extended', safeRequire('../routes/therapistExtended.routes'));
  dualMount(app, 'therapist-pro', safeRequire('../routes/therapistPro.routes'));
  dualMount(app, 'therapist-ultra', safeRequire('../routes/therapistUltra.routes'));
  dualMount(app, 'therapist-elite', safeRequire('../routes/therapistElite.routes'));
  logger.info('Therapist Portal routes mounted (5 tiers: base → extended → pro → ultra → elite)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Disability Rehabilitation — التأهيل الموحد لذوي الإعاقة ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/disability-rehabilitation', '/api/v1/disability-rehabilitation'],
    '../routes/disability-rehabilitation.routes'
  );
  safeMount(
    app,
    ['/api/disability-rehab', '/api/v1/disability-rehab'],
    '../rehabilitation-services/rehabilitation-routes'
  );
  logger.info('Disability Rehabilitation routes mounted (unified + Phase 5-9 services)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Rehab Systems — التراخيص والتوسعة والأنظمة الاحترافية ──────────────
  // ══════════════════════════════════════════════════════════════════════════

  // Rehab Center Licenses (نظام تراخيص مراكز ذوي الإعاقة)
  const rehabCenterLicensesRoutes = safeRequire('../routes/rehabCenterLicenses.routes');
  dualMount(app, 'rehab-licenses', rehabCenterLicensesRoutes);
  logger.info('Rehab Center Licenses routes mounted (60+ endpoints)');

  // Rehabilitation Expansion (توسعة خدمات تأهيل ذوي الإعاقة — 10 أنظمة جديدة)
  const rehabExpansionRoutes = safeRequire('../routes/rehab-expansion.routes');
  dualMount(app, 'rehab-expansion', rehabExpansionRoutes);
  logger.info(
    'Rehab Expansion routes mounted (120+ endpoints — 10 new systems: assistive devices, vocational rehab, disability rights, integrative healthcare, community integration, caregiver support, accessibility audit, early detection, outcome measurement, adaptive housing)'
  );

  // Rehabilitation Professional Systems (الأنظمة الاحترافية لتأهيل ذوي الإعاقة — 12 نظام جديد)
  const rehabProRoutes = safeRequire('../routes/rehab-pro.routes');
  dualMount(app, 'rehab-pro', rehabProRoutes);
  logger.info(
    'Rehab Pro routes mounted (150+ endpoints — 12 new systems: cardiac-pulmonary rehab, stroke rehab, spinal cord rehab, post-surgical rehab, geriatric rehab, advanced mental health, genetic counseling, therapy gamification, medical device IoT, inter-center collaboration, post-discharge tracking, AR therapy)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phase 26: Therapy & Rehabilitation Additions — إضافات العلاج والتأهيل
  // ══════════════════════════════════════════════════════════════════════════
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
    'Phase 26 therapy additions mounted (7 modules: goal-bank, goal-progress, group-programs, feedback, therapy-rooms, therapy-programs, standardized-assessments)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Phases 30–33: Advanced Rehabilitation — التأهيل المتقدم ─────────────
  // ══════════════════════════════════════════════════════════════════════════

  // Phase 30: Rehabilitation Advanced — التأهيل المتقدم
  safeMount(
    app,
    ['/api/rehabilitation-advanced', '/api/v1/rehabilitation-advanced'],
    '../routes/rehabilitation-advanced.routes'
  );
  logger.info(
    'Phase 30 mounted (12 sub-modules: behavior-incidents, behavior-plans, vocational-profiles, job-coach-logs, home-programs, medication-records, autism-profiles, therapy-sessions, nutrition-plans, resource-rooms, staff-certifications, discharge-plans)'
  );

  // Phase 31: Rehabilitation Center — مركز التأهيل
  safeMount(
    app,
    ['/api/rehabilitation-center', '/api/v1/rehabilitation-center'],
    '../routes/rehabilitation-center.routes'
  );
  logger.info(
    'Phase 31 mounted (13 sub-modules: assessment-tools, beneficiary-assessments, individualized-plans, group-sessions, satisfaction-surveys, survey-responses, referrals, schedules, assistive-equipment, family-communications, waitlist, report-templates, generated-reports)'
  );

  // Phase 32: Rehabilitation Intelligent — التأهيل الذكي
  safeMount(
    app,
    ['/api/rehabilitation-intelligent', '/api/v1/rehabilitation-intelligent'],
    '../routes/rehabilitation-intelligent.routes'
  );
  logger.info(
    'Phase 32 mounted (12 sub-modules: ai-recommendations, predictive-models, prediction-results, risk-assessments, quality-indicators, accreditation-standards, research-projects, training-programs, competency-assessments, emergency-protocols, emergency-incidents, government-integrations)'
  );

  // Phase 33: Rehabilitation Specialized — التأهيل التخصصي
  safeMount(
    app,
    ['/api/rehabilitation-specialized', '/api/v1/rehabilitation-specialized'],
    '../routes/rehabilitation-specialized.routes'
  );
  logger.info(
    'Phase 33 mounted (10 sub-modules: transportation, insurance-claims, billing-records, volunteers, donations, residential-units, activities, documents, events, clinical-notes)'
  );

  // Rehabilitation Plans — خطط التأهيل الفردية (12 أسبوع + AI + Tele-Rehab)
  safeMount(
    app,
    ['/api/rehab-plans', '/api/v1/rehab-plans'],
    '../routes/rehabilitationPlan.routes'
  );
  logger.info(
    'Rehab Plans routes mounted (16 endpoints: CRUD plans, SMART goals, AI assessment, outcome prediction, tele-sessions, progress reports, quality metrics, goal bank, templates)'
  );

  logger.info('[Clinical-Therapy] All ~22 therapy/rehabilitation modules mounted successfully');
};
