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
  // All 5 tiers have non-overlapping route paths, so they are co-mounted at
  // the primary /api/therapist prefix. Clients can use a single base URL.
  // Legacy tier-specific paths kept as deprecated aliases for compatibility.
  // ══════════════════════════════════════════════════════════════════════════
  const therapistBase = safeRequire('../routes/therapist');
  const therapistExtended = safeRequire('../routes/therapistExtended.routes');
  const therapistPro = safeRequire('../routes/therapistPro.routes');
  const therapistUltra = safeRequire('../routes/therapistUltra.routes');
  const therapistElite = safeRequire('../routes/therapistElite.routes');

  // Primary — all 5 feature sets reachable under /api/therapist
  dualMount(app, 'therapist', therapistBase);
  dualMount(app, 'therapist', therapistExtended);
  dualMount(app, 'therapist', therapistPro);
  dualMount(app, 'therapist', therapistUltra);
  dualMount(app, 'therapist', therapistElite);

  // @deprecated backward-compat aliases (retain until callers migrate)
  dualMount(app, 'therapist-extended', therapistExtended);
  dualMount(app, 'therapist-pro', therapistPro);
  dualMount(app, 'therapist-ultra', therapistUltra);
  dualMount(app, 'therapist-elite', therapistElite);

  logger.info(
    'Therapist Portal routes co-mounted at /api/therapist (5 tiers: base → extended → pro → ultra → elite, 148 endpoints)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Disability Rehabilitation — التأهيل الموحد لذوي الإعاقة ─────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/disability-rehab', '/api/v1/disability-rehab'],
    '../rehabilitation-services/rehabilitation-routes'
  );
  logger.info('Disability Rehabilitation routes mounted (Phase 5-9 services)');

  // NOTE: disability-rehabilitation.routes, rehab-expansion.routes, rehab-pro.routes,
  // and rehabCenterLicenses.routes were archived (broken controller/service/model
  // chains after earlier cleanups). See _archived/dead-broken-chains/.

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
