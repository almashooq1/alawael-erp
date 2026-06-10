/**
 * Programs Routes — مسارات API لمكتبة البرامج التأهيلية
 *
 * @module domains/programs/routes/programs.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1157 — close the program/enrollment-keyed :id gap + list scoping:
//   - /:id → /:programId, /enrollments/:id → /enrollments/:enrollmentId so
//     ownership hooks fire before any handler runs
//   - list/statistics/overdue use effectiveBranchScope (no ?branchId= spoofing)
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'programId',
  branchScopedResourceParam({
    modelName: 'Program',
    label: 'program',
    loadModel: () => require('../models/Program').Program,
  })
);
router.param(
  'enrollmentId',
  branchScopedResourceParam({
    modelName: 'ProgramEnrollment',
    label: 'program enrollment',
    loadModel: () => require('../models/ProgramEnrollment').ProgramEnrollment,
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { programsService } = require('../services/ProgramsService');
const {
  validateCreateProgram,
  validateUpdateProgram,
  validateEnrollBeneficiary,
  validate,
} = require('../validators/programs.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Program CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/** POST / — إنشاء برنامج */
router.post(
  '/',
  validate(validateCreateProgram),
  asyncHandler(async (req, res) => {
    const program = await programsService.createProgram({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });
    res.status(201).json({ success: true, data: program });
  })
);

/** GET / — قائمة البرامج */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await programsService.listPrograms({
      status: req.query.status,
      type: req.query.type,
      category: req.query.category,
      search: req.query.search,
      // W1157 — restricted callers are pinned to their own branch
      branchId: effectiveBranchScope(req) || req.user?.branchId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  })
);

/** GET /statistics — إحصائيات البرامج */
router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const data = await programsService.getProgramStatistics(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

/** GET /overdue — التسجيلات المتأخرة */
router.get(
  '/overdue',
  asyncHandler(async (req, res) => {
    const data = await programsService.getOverdueEnrollments(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /:programId — تفاصيل برنامج */
router.get(
  '/:programId',
  asyncHandler(async (req, res) => {
    const program = await programsService.getProgram(req.params.programId);
    res.json({ success: true, data: program });
  })
);

/** PUT /:programId — تحديث برنامج */
router.put(
  '/:programId',
  validate(validateUpdateProgram),
  asyncHandler(async (req, res) => {
    const program = await programsService.updateProgram(req.params.programId, req.body);
    res.json({ success: true, data: program });
  })
);

/** POST /:programId/publish — نشر برنامج */
router.post(
  '/:programId/publish',
  asyncHandler(async (req, res) => {
    const program = await programsService.publishProgram(req.params.programId, getUserId(req));
    res.json({ success: true, data: program });
  })
);

/** GET /:programId/dashboard — لوحة تحكم البرنامج */
router.get(
  '/:programId/dashboard',
  asyncHandler(async (req, res) => {
    const data = await programsService.getProgramDashboard(req.params.programId);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Enrollment
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /enroll — تسجيل مستفيد في برنامج */
router.post(
  '/enroll',
  validate(validateEnrollBeneficiary),
  asyncHandler(async (req, res) => {
    const enrollment = await programsService.enrollBeneficiary({
      ...req.body,
      userId: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });
    res.status(201).json({ success: true, data: enrollment });
  })
);

/** GET /enrollments/beneficiary/:beneficiaryId — تسجيلات مستفيد */
router.get(
  '/enrollments/beneficiary/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await programsService.getBeneficiaryEnrollments(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /enrollments/therapist/:therapistId — تسجيلات معالج */
router.get(
  '/enrollments/therapist/:therapistId',
  asyncHandler(async (req, res) => {
    const data = await programsService.getTherapistProgramDashboard(req.params.therapistId);
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /enrollments/:enrollmentId — تفاصيل تسجيل */
router.get(
  '/enrollments/:enrollmentId',
  asyncHandler(async (req, res) => {
    const data = await programsService.getEnrollmentDetails(req.params.enrollmentId);
    if (!data) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:enrollmentId/approve — موافقة */
router.post(
  '/enrollments/:enrollmentId/approve',
  asyncHandler(async (req, res) => {
    const data = await programsService.approveEnrollment(req.params.enrollmentId, getUserId(req));
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:enrollmentId/activate — تفعيل */
router.post(
  '/enrollments/:enrollmentId/activate',
  asyncHandler(async (req, res) => {
    const data = await programsService.activateEnrollment(req.params.enrollmentId, getUserId(req));
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:enrollmentId/withdraw — انسحاب */
router.post(
  '/enrollments/:enrollmentId/withdraw',
  asyncHandler(async (req, res) => {
    const data = await programsService.withdrawEnrollment(
      req.params.enrollmentId,
      getUserId(req),
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:enrollmentId/complete — إتمام */
router.post(
  '/enrollments/:enrollmentId/complete',
  asyncHandler(async (req, res) => {
    const data = await programsService.completeEnrollment(
      req.params.enrollmentId,
      getUserId(req),
      req.body
    );
    res.json({ success: true, data });
  })
);

/** POST /enrollments/:enrollmentId/log-session — تسجيل جلسة */
router.post(
  '/enrollments/:enrollmentId/log-session',
  asyncHandler(async (req, res) => {
    const data = await programsService.logSession(req.params.enrollmentId, req.body);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Recommendations
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /recommendations/:beneficiaryId — توصيات البرامج لمستفيد */
router.get(
  '/recommendations/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await programsService.recommendPrograms(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

module.exports = router;
