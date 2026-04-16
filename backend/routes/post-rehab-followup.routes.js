/**
 * Post-Rehabilitation Follow-Up Routes
 * مسارات نظام المتابعة ما بعد التأهيل
 *
 * Endpoints:
 *  - /cases              — حالات ما بعد التأهيل
 *  - /visits             — زيارات المتابعة الدورية
 *  - /impact             — قياس الأثر طويل المدى
 *  - /surveys            — الاستبيانات
 *  - /re-enrollment      — إعادة التسجيل التلقائي
 *  - /dashboard          — لوحة المعلومات
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const postRehabService = require('../services/postRehabFollowUp.service');

// ── Role Groups ──
const POST_REHAB_ROLES = [
  'admin',
  'super_admin',
  'specialist',
  'therapist',
  'doctor',
  'social_worker',
  'case_manager',
  'coordinator',
  'supervisor',
  'rehabilitation_specialist',
];
const POST_REHAB_ADMIN_ROLES = ['admin', 'super_admin', 'supervisor', 'coordinator'];
const POST_REHAB_VIEW_ROLES = [...POST_REHAB_ROLES, 'viewer', 'parent', 'guardian'];

/** Async wrapper */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════════
// CASES — حالات ما بعد التأهيل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /cases — Create a new post-rehab follow-up case
 * إنشاء حالة متابعة جديدة
 */
router.post(
  '/cases',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.user._id || req.user.id };
    const result = await postRehabService.createCase(data);
    res.status(201).json(result);
  })
);

/**
 * GET /cases — List cases with filters
 * قائمة حالات المتابعة
 */
router.get(
  '/cases',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.listCases(req.query);
    res.json(result);
  })
);

/**
 * GET /cases/overdue — Get overdue cases
 * الحالات المتأخرة
 */
router.get(
  '/cases/overdue',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getOverdueCases();
    res.json(result);
  })
);

/**
 * GET /cases/:id — Get case by ID
 */
router.get(
  '/cases/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getCaseById(req.params.id);
    res.json(result);
  })
);

/**
 * PUT /cases/:id — Update case
 */
router.put(
  '/cases/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.updateCase(req.params.id, req.body);
    res.json(result);
  })
);

/**
 * POST /cases/:id/alerts — Add alert to case
 */
router.post(
  '/cases/:id/alerts',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.addAlert(req.params.id, req.body);
    res.status(201).json(result);
  })
);

/**
 * PUT /cases/:caseId/alerts/:alertId/resolve — Resolve alert
 */
router.put(
  '/cases/:caseId/alerts/:alertId/resolve',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.resolveAlert(
      req.params.caseId,
      req.params.alertId,
      req.user._id || req.user.id
    );
    res.json(result);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP VISITS — زيارات المتابعة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /visits — Schedule a follow-up visit
 * جدولة زيارة متابعة
 */
router.post(
  '/visits',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.user._id || req.user.id };
    const result = await postRehabService.scheduleVisit(data);
    res.status(201).json(result);
  })
);

/**
 * GET /visits — List visits with filters
 */
router.get(
  '/visits',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.listVisits(req.query);
    res.json(result);
  })
);

/**
 * GET /visits/upcoming — Get upcoming visits
 * الزيارات القادمة
 */
router.get(
  '/visits/upcoming',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const days = req.query.days || 7;
    const specialistId = req.query.specialistId || null;
    const result = await postRehabService.getUpcomingVisits(days, specialistId);
    res.json(result);
  })
);

/**
 * GET /visits/:id — Get visit by ID
 */
router.get(
  '/visits/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getVisitById(req.params.id);
    res.json(result);
  })
);

/**
 * PUT /visits/:id/complete — Complete a visit with assessment
 * إكمال زيارة مع التقييم
 */
router.put(
  '/visits/:id/complete',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.completeVisit(req.params.id, req.body);
    res.json(result);
  })
);

/**
 * PUT /visits/:id/missed — Mark visit as missed
 */
router.put(
  '/visits/:id/missed',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.markVisitMissed(req.params.id, req.body.reason);
    res.json(result);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT MEASUREMENT — قياس الأثر
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /impact — Create impact measurement
 * إنشاء قياس أثر (6 أشهر / سنة / سنتين)
 */
router.post(
  '/impact',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      assessedBy: req.body.assessedBy || req.user._id || req.user.id,
      createdBy: req.user._id || req.user.id,
    };
    const result = await postRehabService.createImpactMeasurement(data);
    res.status(201).json(result);
  })
);

/**
 * GET /impact — List impact measurements
 */
router.get(
  '/impact',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.listImpactMeasurements(req.query);
    res.json(result);
  })
);

/**
 * GET /impact/:id — Get impact measurement by ID
 */
router.get(
  '/impact/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getImpactMeasurementById(req.params.id);
    res.json(result);
  })
);

/**
 * GET /impact/comparison/:caseId — Get impact comparison report
 * تقرير مقارنة الأثر
 */
router.get(
  '/impact/comparison/:caseId',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getImpactComparisonReport(req.params.caseId);
    res.json(result);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SURVEYS — الاستبيانات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /surveys/templates — Get default survey templates
 * قوالب الاستبيانات
 */
router.get(
  '/surveys/templates',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = postRehabService.getSurveyTemplates();
    res.json(result);
  })
);

/**
 * POST /surveys — Create a survey
 * إنشاء استبيان
 */
router.post(
  '/surveys',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.user._id || req.user.id };
    const result = await postRehabService.createSurvey(data);
    res.status(201).json(result);
  })
);

/**
 * GET /surveys — List surveys
 */
router.get(
  '/surveys',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.listSurveys(req.query);
    res.json(result);
  })
);

/**
 * GET /surveys/:id — Get survey by ID
 */
router.get(
  '/surveys/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getSurveyById(req.params.id);
    res.json(result);
  })
);

/**
 * POST /surveys/:id/submit — Submit survey responses
 * تسليم إجابات الاستبيان
 */
router.post(
  '/surveys/:id/submit',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize([...POST_REHAB_VIEW_ROLES]),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.submitSurveyResponses(req.params.id, req.body);
    res.json(result);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// RE-ENROLLMENT — إعادة التسجيل
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /re-enrollment — Create re-enrollment request
 * إنشاء طلب إعادة تسجيل
 */
router.post(
  '/re-enrollment',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      requestedBy: req.user._id || req.user.id,
      createdBy: req.user._id || req.user.id,
    };
    const result = await postRehabService.createReEnrollmentRequest(data);
    res.status(201).json(result);
  })
);

/**
 * GET /re-enrollment — List re-enrollment requests
 */
router.get(
  '/re-enrollment',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.listReEnrollmentRequests(req.query);
    res.json(result);
  })
);

/**
 * GET /re-enrollment/:id — Get re-enrollment request by ID
 */
router.get(
  '/re-enrollment/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getReEnrollmentRequestById(req.params.id);
    res.json(result);
  })
);

/**
 * PUT /re-enrollment/:id/review — Review (approve/reject) request
 * مراجعة طلب إعادة التسجيل
 */
router.put(
  '/re-enrollment/:id/review',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const reviewData = {
      ...req.body,
      reviewedBy: req.user._id || req.user.id,
    };
    const result = await postRehabService.reviewReEnrollmentRequest(req.params.id, reviewData);
    res.json(result);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المعلومات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /dashboard — Get dashboard statistics
 * إحصائيات لوحة المعلومات
 */
router.get(
  '/dashboard',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(POST_REHAB_ROLES),
  asyncHandler(async (req, res) => {
    const result = await postRehabService.getDashboardStats(req.query.branch);
    res.json(result);
  })
);

module.exports = router;
